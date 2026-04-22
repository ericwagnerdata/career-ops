#!/usr/bin/env node

/**
 * scan.mjs — Zero-token portal scanner
 *
 * Fetches Greenhouse, Ashby, and Lever APIs directly, applies title
 * filters from portals.yml, deduplicates against existing history,
 * and appends new offers to pipeline.md + scan-history.tsv.
 *
 * Zero Claude API tokens — pure HTTP + JSON.
 *
 * Usage:
 *   node scan.mjs                  # scan all enabled companies
 *   node scan.mjs --dry-run        # preview without writing files
 *   node scan.mjs --company Cohere # scan a single company
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
const parseYaml = yaml.load;

// ── Config ──────────────────────────────────────────────────────────

const PORTALS_PATH = 'portals.yml';
const SCAN_HISTORY_PATH = 'data/scan-history.tsv';
const PIPELINE_PATH = 'data/pipeline.md';
const APPLICATIONS_PATH = 'data/applications.md';

// Ensure required directories exist (fresh setup)
mkdirSync('data', { recursive: true });

const CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 10_000;

// ── API detection ───────────────────────────────────────────────────

function detectApi(company) {
  // Greenhouse: explicit api field
  if (company.api && company.api.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }

  const url = company.careers_url || '';

  // Ashby
  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  // Lever
  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: 'lever',
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  // Greenhouse (job-boards, boards, EU)
  const ghMatch = url.match(/(?:job-boards(?:\.eu)?|boards)\.greenhouse\.io\/([^/?#]+)/);
  if (ghMatch && !company.api) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${ghMatch[1]}/jobs`,
    };
  }

  // Explicit greenhouse_slug fallback for companies with custom career URLs
  if (company.greenhouse_slug) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_slug}/jobs`,
    };
  }

  // Explicit ashby_slug fallback
  if (company.ashby_slug) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${company.ashby_slug}?includeCompensation=true`,
    };
  }

  // Workday
  const wdMatch = url.match(/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/([^/?#]+)/);
  if (wdMatch) {
    return {
      type: 'workday',
      url: `https://${wdMatch[1]}.${wdMatch[2]}.myworkdayjobs.com/wday/cxs/${wdMatch[1]}/${wdMatch[3]}/jobs`,
    };
  }

  return null;
}

// ── API parsers ─────────────────────────────────────────────────────

function parseGreenhouse(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.absolute_url || '',
    company: companyName,
    location: j.location?.name || '',
  }));
}

function parseAshby(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.jobUrl || '',
    company: companyName,
    location: j.location || '',
  }));
}

function parseLever(json, companyName) {
  if (!Array.isArray(json)) return [];
  return json.map(j => ({
    title: j.text || '',
    url: j.hostedUrl || '',
    company: companyName,
    location: j.categories?.location || '',
  }));
}

function parseWorkday(json, companyName) {
  const jobs = json.jobPostings || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.externalPath ? `https://workday.com${j.externalPath}` : '',
    company: companyName,
    location: j.locationsText || j.bulletFields?.[0] || '',
  }));
}

const PARSERS = { greenhouse: parseGreenhouse, ashby: parseAshby, lever: parseLever, workday: parseWorkday };

// ── Fetch with timeout ──────────────────────────────────────────────

async function fetchJson(url, type) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const opts = { signal: controller.signal };
    if (type === 'workday') {
      opts.method = 'POST';
      opts.headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
      opts.body = JSON.stringify({ appliedFacets: {}, limit: 50, offset: 0, searchText: '' });
    }
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Title filter ────────────────────────────────────────────────────

function buildTitleFilter(titleFilter) {
  const positive = (titleFilter?.positive || []).map(k => k.toLowerCase());
  const negative = (titleFilter?.negative || []).map(k => k.toLowerCase());

  return (title) => {
    const lower = title.toLowerCase();
    const hasPositive = positive.length === 0 || positive.some(k => lower.includes(k));
    const hasNegative = negative.some(k => lower.includes(k));
    return hasPositive && !hasNegative;
  };
}

// ── Location filter (US remote only) ────────────────────────────────

const NON_US_KEYWORDS = [
  'india','bangalore','bengaluru','hyderabad','mumbai','chennai','pune','delhi','noida','gurgaon',
  'romania','bucharest',
  'united kingdom','uk','england','london','manchester','edinburgh','dublin','ireland','scotland',
  'germany','berlin','munich','hamburg','frankfurt',
  'france','paris','lyon',
  'spain','madrid','barcelona',
  'netherlands','amsterdam','rotterdam',
  'poland','warsaw','krakow',
  'portugal','lisbon','porto',
  'italy','rome','milan',
  'sweden','stockholm','norway','oslo','denmark','copenhagen','finland','helsinki',
  'switzerland','zurich','geneva',
  'czech','prague','hungary','budapest','austria','vienna','belgium','brussels',
  'israel','tel aviv','jerusalem',
  'australia','sydney','melbourne','brisbane','new zealand','auckland',
  'japan','tokyo','osaka','korea','seoul','china','beijing','shanghai','shenzhen',
  'singapore','hong kong','taiwan','taipei','thailand','bangkok','vietnam','ho chi minh','philippines','manila','indonesia','jakarta','malaysia','kuala lumpur',
  'canada','toronto','vancouver','montreal','ottawa','calgary',
  'mexico','mexico city','guadalajara','monterrey',
  'brazil','sao paulo','rio de janeiro','argentina','buenos aires','chile','santiago','colombia','bogota','peru','lima','costa rica','san jose cr',
  'south africa','johannesburg','cape town','nigeria','lagos','kenya','nairobi','egypt','cairo',
  'uae','dubai','abu dhabi','saudi arabia','riyadh','turkey','istanbul',
  'emea','apac','latam','emea-remote','apac-remote',
];

const HYBRID_ONSITE_KEYWORDS = ['hybrid','on-site','onsite','in-office','in office'];

function buildLocationFilter() {
  return (location) => {
    if (!location) return true;
    const lower = location.toLowerCase();
    if (HYBRID_ONSITE_KEYWORDS.some(k => lower.includes(k))) return false;
    if (NON_US_KEYWORDS.some(k => lower.includes(k))) {
      const hasUsSignal = /\b(united states|usa|u\.s\.|u\.s\.a\.|remote[- ](us|usa|united states|north america|na))\b/i.test(location);
      if (!hasUsSignal) return false;
    }
    return true;
  };
}

// ── Dedup ───────────────────────────────────────────────────────────

function loadSeenUrls() {
  const seen = new Set();

  // scan-history.tsv
  if (existsSync(SCAN_HISTORY_PATH)) {
    const lines = readFileSync(SCAN_HISTORY_PATH, 'utf-8').split('\n');
    for (const line of lines.slice(1)) { // skip header
      const url = line.split('\t')[0];
      if (url) seen.add(url);
    }
  }

  // pipeline.md — extract URLs from checkbox lines
  if (existsSync(PIPELINE_PATH)) {
    const text = readFileSync(PIPELINE_PATH, 'utf-8');
    for (const match of text.matchAll(/- \[[ x]\] (https?:\/\/\S+)/g)) {
      seen.add(match[1]);
    }
  }

  // applications.md — extract URLs from report links and any inline URLs
  if (existsSync(APPLICATIONS_PATH)) {
    const text = readFileSync(APPLICATIONS_PATH, 'utf-8');
    for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
      seen.add(match[0]);
    }
  }

  return seen;
}

const ROLE_STOPWORDS = new Set(['senior','sr','staff','lead','principal','i','ii','iii','iv','the','a','of','and','to','remote','us','team','hybrid']);

function normalizeCompany(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g,'');
}

function roleTokens(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w => w.length > 3 && !ROLE_STOPWORDS.has(w));
}

function loadSeenCompanyRoles() {
  // Returns array of {company, role, tokens} for fuzzy matching.
  const seen = [];
  const sources = [APPLICATIONS_PATH, PIPELINE_PATH];
  for (const path of sources) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf-8');
    // applications.md: table rows with company in col 4, role in col 5 (after # | Status | Date)
    for (const match of text.matchAll(/^\|\s*\d+\s*\|[^|]+\|[^|]+\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm)) {
      const company = match[1].trim();
      const role = match[2].trim();
      if (company && role && !/^-+$/.test(company)) {
        seen.push({ company: normalizeCompany(company), role: role.toLowerCase(), tokens: roleTokens(role) });
      }
    }
    // pipeline.md: lines like `- [ ] URL | Company | Role`
    for (const match of text.matchAll(/^- \[[ x!]\][^|]+\|\s*([^|]+?)\s*\|\s*([^|\n]+)/gm)) {
      const company = match[1].trim();
      const role = match[2].trim();
      if (company && role) {
        seen.push({ company: normalizeCompany(company), role: role.toLowerCase(), tokens: roleTokens(role) });
      }
    }
  }
  return seen;
}

function hasPriorCompanyRole(seen, company, role) {
  const nc = normalizeCompany(company);
  const nr = role.toLowerCase();
  const tokens = roleTokens(role);
  for (const s of seen) {
    if (s.company !== nc && !s.company.includes(nc) && !nc.includes(s.company)) continue;
    if (s.role === nr || s.role.includes(nr) || nr.includes(s.role)) return true;
    if (tokens.length === 0) continue;
    const overlap = tokens.filter(t => s.tokens.includes(t)).length;
    if (overlap >= 2) return true;
    if (tokens.length === 1 && s.tokens.length >= 1 && s.tokens.includes(tokens[0])) return true;
  }
  return false;
}

// ── Pipeline writer ─────────────────────────────────────────────────

function appendToPipeline(offers) {
  if (offers.length === 0) return;

  let text = readFileSync(PIPELINE_PATH, 'utf-8');

  // Find "## Not Yet Evaluated" section and append after it
  const marker = '## Not Yet Evaluated';
  const idx = text.indexOf(marker);
  if (idx === -1) {
    // No Not Yet Evaluated section — append at end before Processed
    const procIdx = text.indexOf('## Processed');
    const insertAt = procIdx === -1 ? text.length : procIdx;
    const block = `\n${marker}\n\n` + offers.map(o =>
      `- [ ] ${o.url} | ${o.company} | ${o.title}`
    ).join('\n') + '\n\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  } else {
    // Find the end of existing section content (next ## or end)
    const afterMarker = idx + marker.length;
    const nextSection = text.indexOf('\n## ', afterMarker);
    const insertAt = nextSection === -1 ? text.length : nextSection;

    const block = '\n' + offers.map(o =>
      `- [ ] ${o.url} | ${o.company} | ${o.title}`
    ).join('\n') + '\n';
    text = text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  writeFileSync(PIPELINE_PATH, text, 'utf-8');
}

function appendToScanHistory(offers, date) {
  // Ensure file + header exist
  if (!existsSync(SCAN_HISTORY_PATH)) {
    writeFileSync(SCAN_HISTORY_PATH, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\n', 'utf-8');
  }

  const lines = offers.map(o =>
    `${o.url}\t${date}\t${o.source}\t${o.title}\t${o.company}\tadded`
  ).join('\n') + '\n';

  appendFileSync(SCAN_HISTORY_PATH, lines, 'utf-8');
}

// ── Parallel fetch with concurrency limit ───────────────────────────

async function parallelFetch(tasks, limit) {
  const results = [];
  let i = 0;

  async function next() {
    while (i < tasks.length) {
      const task = tasks[i++];
      results.push(await task());
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => next());
  await Promise.all(workers);
  return results;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlag = args.indexOf('--company');
  const filterCompany = companyFlag !== -1 ? args[companyFlag + 1]?.toLowerCase() : null;

  // 1. Read portals.yml
  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const companies = config.tracked_companies || [];
  const titleFilter = buildTitleFilter(config.title_filter);
  const locationFilter = buildLocationFilter();

  // 2. Filter to enabled companies with detectable APIs
  const targets = companies
    .filter(c => c.enabled !== false)
    .filter(c => !filterCompany || c.name.toLowerCase().includes(filterCompany))
    .map(c => ({ ...c, _api: detectApi(c) }))
    .filter(c => c._api !== null);

  const skippedCount = companies.filter(c => c.enabled !== false).length - targets.length;

  console.log(`Scanning ${targets.length} companies via API (${skippedCount} skipped — no API detected)`);
  if (dryRun) console.log('(dry run — no files will be written)\n');

  // 3. Load dedup sets
  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();

  // 4. Fetch all APIs
  const date = new Date().toISOString().slice(0, 10);
  let totalFound = 0;
  let totalFiltered = 0;
  let totalDupes = 0;
  const newOffers = [];
  const errors = [];

  const tasks = targets.map(company => async () => {
    const { type, url } = company._api;
    try {
      const json = await fetchJson(url, type);
      const jobs = PARSERS[type](json, company.name);
      totalFound += jobs.length;

      for (const job of jobs) {
        if (!titleFilter(job.title)) {
          totalFiltered++;
          continue;
        }
        if (!locationFilter(job.location)) {
          totalFiltered++;
          continue;
        }
        if (seenUrls.has(job.url)) {
          totalDupes++;
          continue;
        }
        if (hasPriorCompanyRole(seenCompanyRoles, job.company, job.title)) {
          totalDupes++;
          continue;
        }
        // Mark as seen to avoid intra-scan dupes
        seenUrls.add(job.url);
        seenCompanyRoles.push({ company: normalizeCompany(job.company), role: job.title.toLowerCase(), tokens: roleTokens(job.title) });
        newOffers.push({ ...job, source: `${type}-api` });
      }
    } catch (err) {
      errors.push({ company: company.name, error: err.message });
    }
  });

  await parallelFetch(tasks, CONCURRENCY);

  // 5. Write results
  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  // 6. Print summary
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Portal Scan — ${date}`);
  console.log(`${'━'.repeat(45)}`);
  console.log(`Companies scanned:     ${targets.length}`);
  console.log(`Total jobs found:      ${totalFound}`);
  console.log(`Filtered by title:     ${totalFiltered} removed`);
  console.log(`Duplicates:            ${totalDupes} skipped`);
  console.log(`New offers added:      ${newOffers.length}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ✗ ${e.company}: ${e.error}`);
    }
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const o of newOffers) {
      console.log(`  + ${o.company} | ${o.title} | ${o.location || 'N/A'}`);
    }
    if (dryRun) {
      console.log('\n(dry run — run without --dry-run to save results)');
    } else {
      console.log(`\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`);
    }
  }

  console.log(`\n→ Run /career-ops pipeline to evaluate new offers.`);
  console.log('→ Share results and get help: https://discord.gg/8pRpHETxa4');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
