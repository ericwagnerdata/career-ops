# Mode: scan — Portal Scanner (Offer Discovery)

Scans configured job portals, filters by title relevance, and adds new offers to the pipeline for later evaluation.

## Recommended execution

Run as a subagent to avoid consuming main context:

```
Agent(
    subagent_type="general-purpose",
    prompt="[contents of this file + specific data]",
    run_in_background=True
)
```

## Configuration

Read `portals.yml` which contains:
- `search_queries`: List of WebSearch queries with `site:` filters per portal (broad discovery)
- `tracked_companies`: Specific companies with `careers_url` for direct navigation
- `title_filter`: Positive/negative/seniority_boost keywords for title filtering

## Discovery strategy (3 levels)

### Level 1 — Direct Playwright (PRIMARY)

**For each company in `tracked_companies`:** Navigate to its `careers_url` with Playwright (`browser_navigate` + `browser_snapshot`), read ALL visible job listings, and extract title + URL for each one. This is the most reliable method because:
- Sees the page in real time (not cached Google results)
- Works with SPAs (Ashby, Lever, Workday)
- Detects new offers instantly
- Does not depend on Google indexing

**Every company MUST have `careers_url` in portals.yml.** If it doesn't, find it once, save it, and use it in future scans.

### Level 2 — Greenhouse API (SUPPLEMENTARY)

For companies on Greenhouse, the JSON API (`boards-api.greenhouse.io/v1/boards/{slug}/jobs`) returns clean structured data. Use as a quick complement to Level 1 — faster than Playwright but only works with Greenhouse.

### Level 3 — WebSearch queries (BROAD DISCOVERY)

The `search_queries` with `site:` filters cover portals broadly (all Ashby, all Greenhouse, etc.). Useful for discovering NEW companies not yet in `tracked_companies`, but results may be stale.

**Execution priority (token-optimized):**
1. Level 2: API → all `tracked_companies` with `api:` defined (fast, cheap JSON)
2. Level 1: Playwright → only companies WITHOUT `api:` (custom ATS, Ashby, Lever, etc.)
3. Level 3: WebSearch → all `search_queries` with `enabled: true`

**Key rule:** If a company has `api:` defined, skip Playwright for it entirely — the API is faster, cheaper, and equally reliable.

Levels are additive — all run, results are merged and deduplicated.

## Workflow

1. **Read configuration**: `portals.yml`
2. **Read history**: `data/scan-history.tsv` → already-seen URLs
3. **Read dedup sources**: `data/applications.md` + `data/pipeline.md`

4. **Level 2 — Greenhouse APIs** (run FIRST, parallel):
   For each company in `tracked_companies` with `api:` defined and `enabled: true`:
   a. WebFetch the API URL → JSON with job list
   b. For each job extract: `{title, url, company}`, mark source as `api`
   c. Accumulate in candidate list

5. **Level 1 — Playwright scan** (only for companies WITHOUT `api:`, parallel in batches of 3-5):
   For each company in `tracked_companies` with `enabled: true`, NO `api:` defined, and a `careers_url`:
   a. `browser_navigate` to the `careers_url`
   b. `browser_snapshot` to read all job listings
   c. If the page has filters/departments, navigate relevant sections
   d. For each job listing extract: `{title, url, company}`, mark source as `playwright`
   e. If the page paginates results, navigate additional pages
   f. Accumulate in candidate list
   g. If `careers_url` fails (404, redirect), try `scan_query` as fallback and note the URL needs updating

6. **Level 3 — WebSearch queries** (parallel if possible):
   For each query in `search_queries` with `enabled: true`:
   a. Run WebSearch with the defined `query`
   b. From each result extract: `{title, url, company}`
      - **title**: from the result title (before " @ " or " | ")
      - **url**: result URL
      - **company**: after " @ " in the title, or extract from domain/path
   c. Accumulate in candidate list (dedup with Level 1+2)

6. **Filter by title** using `title_filter` from `portals.yml`:
   - At least 1 keyword from `positive` must appear in the title (case-insensitive)
   - 0 keywords from `negative` may appear
   - `seniority_boost` keywords add priority but are not required

7. **Deduplicate** against 3 sources:
   - `scan-history.tsv` → exact URL already seen
   - `applications.md` → normalized company + role already evaluated
   - `pipeline.md` → exact URL already in pending or processed

7.5. **Verify liveness — non-API results only** — BEFORE adding to pipeline:

   **Skip verification for `api` source results** — Greenhouse API only returns active roles. Verification is only needed for `playwright` and `websearch` source results, which can be stale.

   WebSearch results may be weeks old. Playwright results are real-time but the specific job URL may 404.

   **Primary method: WebFetch** (fast, no browser needed, works in all contexts):
   For each new URL (can run in parallel batches of 5-10):
   a. `WebFetch` the URL
   b. Classify as **Expired** if ANY of:
      - Final URL contains `?error=true` (Greenhouse closed-job redirect)
      - Response contains: "job no longer available" / "no longer open" / "position has been filled" / "this job has expired" / "page not found" / "this role is no longer accepting applications"
      - Response body is < 500 characters (navbar/footer only, no JD content)
      - HTTP 404 or redirect to a generic jobs listing page
   c. Classify as **Active** if:
      - Job title + role description visible in response
      - Apply/Submit button or application link present
   d. If expired: record `skipped_expired` in scan-history.tsv and discard
   e. If active: proceed to step 8

   **Fallback: Playwright** (if WebFetch is ambiguous or blocked):
   Use `browser_navigate` + `browser_snapshot` for any URL where WebFetch returned unclear results. Run sequentially — NEVER Playwright in parallel.

   **Do not abort the scan if one URL fails.** On timeout or error, mark `skipped_expired` and continue.

8. **For each verified new offer that passes filters**:
   a. Add to `pipeline.md` "Pending" section: `- [ ] {url} | {company} | {title}`
   b. Record in `scan-history.tsv`: `{url}\t{date}\t{query_name}\t{title}\t{company}\tadded`

9. **Title-filtered offers**: record in `scan-history.tsv` with status `skipped_title`
10. **Duplicate offers**: record with status `skipped_dup`
11. **Expired offers (Level 3)**: record with status `skipped_expired`

## Extracting title and company from WebSearch results

WebSearch results come in format: `"Job Title @ Company"` or `"Job Title | Company"` or `"Job Title — Company"`.

Extraction patterns by portal:
- **Ashby**: `"Senior AI PM (Remote) @ EverAI"` → title: `Senior AI PM`, company: `EverAI`
- **Greenhouse**: `"AI Engineer at Anthropic"` → title: `AI Engineer`, company: `Anthropic`
- **Lever**: `"Product Manager - AI @ Temporal"` → title: `Product Manager - AI`, company: `Temporal`

Generic regex: `(.+?)(?:\s*[@|—–-]\s*|\s+at\s+)(.+?)$`

## Private URLs

If a non-publicly-accessible URL is found:
1. Save the JD to `jds/{company}-{role-slug}.md`
2. Add to pipeline.md as: `- [ ] local:jds/{company}-{role-slug}.md | {company} | {title}`

## Scan History

`data/scan-history.tsv` tracks ALL seen URLs:

```
url	first_seen	portal	title	company	status
https://...	2026-02-10	Ashby — AI PM	PM AI	Acme	added
https://...	2026-02-10	Greenhouse — SA	Junior Dev	BigCo	skipped_title
https://...	2026-02-10	Ashby — AI PM	SA AI	OldCo	skipped_dup
https://...	2026-02-10	WebSearch — AI PM	PM AI	ClosedCo	skipped_expired
```

## Output summary

```
Portal Scan — {YYYY-MM-DD}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Queries run: N
Offers found: N total
Filtered by title: N relevant
Duplicates: N (already evaluated or in pipeline)
Expired discarded: N (dead links, Level 3)
New offers added to pipeline.md: N

  + {company} | {title} | {query_name}
  ...

→ Run /career-ops pipeline to evaluate the new offers.
```

## Managing careers_url

Every company in `tracked_companies` must have `careers_url` — the direct URL to their jobs page. This avoids looking it up on every scan.

**Known patterns by platform:**
- **Ashby:** `https://jobs.ashbyhq.com/{slug}`
- **Greenhouse:** `https://job-boards.greenhouse.io/{slug}` or `https://job-boards.eu.greenhouse.io/{slug}`
- **Lever:** `https://jobs.lever.co/{slug}`
- **Custom:** The company's own URL (e.g., `https://openai.com/careers`)

**If `careers_url` does not exist** for a company:
1. Try the pattern for its known platform
2. If that fails, do a quick WebSearch: `"{company}" careers jobs`
3. Navigate with Playwright to confirm it works
4. **Save the found URL in portals.yml** for future scans

**If `careers_url` returns 404 or a redirect:**
1. Note it in the output summary
2. Try scan_query as fallback
3. Flag for manual update

## portals.yml maintenance

- **ALWAYS save `careers_url`** when adding a new company
- Add new queries as new portals or interesting roles are discovered
- Disable noisy queries with `enabled: false`
- Adjust filter keywords as target roles evolve
- Add companies to `tracked_companies` when worth following closely
- Periodically verify `careers_url` — companies change ATS platforms
