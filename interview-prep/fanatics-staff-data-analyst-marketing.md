# Interview Prep — Fanatics Betting & Gaming
## Staff Data Analyst, Marketing

**Role:** Staff Data Analyst, Marketing | Score: 3.0/5
**Date prepared:** 2026-04-15
**Tracker:** #47 | Applied 2026-04-13 | First interview scheduled

---

## Company Intel

### What Fanatics Betting & Gaming actually is

Fanatics is not just a sportsbook. It is a vertically integrated sports commerce company converting its 100M+ fan database (built through merchandise and collectibles) into a betting customer base. The betting arm launched in 2023, acquired PointsBet US operations in 2024, and hit $850M in betting revenue in 2025. Sports betting is projected to be 40% of total company profit by 2027.

Key differentiator vs FanDuel/DraftKings: **lower customer acquisition cost** because cross-selling to existing merchandise customers is cheaper than cold acquisition. The data team's core job is measuring and optimizing that funnel.

### Competitive position (2026)
- FanDuel: 44% market share
- DraftKings: 34%
- BetMGM: 14%
- **Fanatics: ~7.7%** — growing fast, ranked best Tier-2 book by EKG

### Recent moves to know
- **Fanatics Markets** (Dec 2025): launched prediction market product via Paragon Global Markets acquisition; available in 24 states — first sportsbook operator in this segment
- **Complex Bets** (Apr 2026): content deal with Complex to build sports betting content platform
- **Boyd Gaming partnership**: entered Missouri for Dec 2025 launch
- **Canada expansion**: identified as key 2025 target market
- **FanCash loyalty**: 10% back on wagers — core retention metric

### Data stack (confirmed)
- **Snowflake**: primary data warehouse + AI integration announced at Snowflake Summit 2025
- **dbt**: confirmed in job postings — builds staging, intermediate, and mart layers
- **Alation**: data catalog (VP of Data Maddy Want is quoted in their case study)
- **FanGraph**: proprietary knowledge layer that compiles 360 fan view and feeds predictive models
- **Amelco**: betting engine (real-time odds, risk management)
- **Tableau**: used in analyst roles per JD
- **OpenBet**: compliance and RG tooling (announced Dec 2025)

### Data leadership
- **Maddy Want** — VP of Data. Built the data org from scratch, governance-first from day one. Quote: "The first people I hired were engineers and data governance analysts." Philosophy: precision lens, translate technology to business value for non-technical stakeholders.
- **Ian Botts** — CTO. Oversees software delivery, IT, data engineering and analytics.

### Why governance-first matters here
Betting is one of the most regulated industries in the US. Every state has different reporting requirements. Financial auditability is non-negotiable. This shapes the data culture — clean definitions, documented metrics, and trustworthy numbers are not optional. This is **directly your lane** at Peloton (Quality data dictionary, metric standards, validated pipelines).

---

## Role Reality Check

This role is marketing acquisition analytics — not data infrastructure. The core deliverables are:
1. Understanding which marketing channels convert fans to bettors (and at what cost)
2. Segmenting the 100M fan base to find the highest-propensity bettors
3. Reporting acquisition performance to marketing stakeholders
4. Supporting promo/bonus effectiveness analysis

**Your strengths here:** SQL, Tableau, stakeholder trust, documentation discipline, exec reporting
**Your gaps:** No marketing domain, no sports betting context, no A/B testing at scale

**The honest frame going in:** You are a data infrastructure expert who builds the metric layer marketing analysts depend on. Frame your story as "I build the floor others stand on" — and apply that to their problem. Their FanGraph knowledge layer and Snowflake stack need someone who can translate governance rigor into marketing-ready reporting. That is a credible pitch.

---

## Likely Interview Questions + Prepared Answers

### "Tell me about yourself / walk me through your background"

Keep to 90 seconds. Hit these beats:
1. Built foundational data infrastructure at Peloton (dbt layers, metric standards, data dictionary) — the thing the org runs on
2. At Lockheed, took a 1,000+ person org from ad hoc to evidence-based — same pattern, different domain
3. Now looking for a data-mature company where the infrastructure work genuinely matters at scale
4. Fanatics fits: governance-first culture, modern stack (Snowflake/dbt), and a real business problem you want to learn (sports betting marketing)

### "Why Fanatics / Why sports betting?"

Do not fake fan passion you don't have. Instead:
> "Fanatics is doing something analytically interesting: converting an existing 100M-person fan database into betting customers at lower CAC than competitors. That is a data problem — segmentation, attribution, funnel optimization — and it requires trustworthy infrastructure to do it right. The governance-first approach Maddy Want described building from day one is exactly how I think about data work. That alignment is what drew me here."

### "Tell me about a time you built something that improved reporting accuracy or stakeholder trust"

**STAR — Quality Data Dictionary:**
- Situation: Peloton had no standard metric definitions across Quality, Warranty, and Refurbishment. Each team calculated the same KPIs differently. Exec dashboards showed conflicting numbers.
- Task: Establish a single source of truth for quality metrics company-wide.
- Action: Authored Peloton's first enterprise Quality data dictionary. Defined every metric, documented the business logic, mapped to dbt models, drove adoption across three business units.
- Result: Company-wide adoption as measured by exec dashboard migration. Metric disputes dropped to near-zero. Engineers now point to the dictionary before building anything.

**Why it works here:** Fanatics has FanGraph as their fan intelligence layer. They need the same rigor applied to marketing definitions (what counts as an acquired customer, how bonuses affect retention metrics, how to attribute cross-channel conversions).

### "Tell me about a time you influenced a business decision with data"

**STAR — $10M spend monitoring:**
- Situation: Peloton's hardware quality spend ($10M+) had no real-time visibility. Finance was running month-old reports. Leadership could not react to emerging cost issues.
- Task: Build monitoring infrastructure that surfaces cost signals in near real-time.
- Action: Designed dbt transformation layers pulling warranty claims, service costs, and refurbishment data into a unified model. Built executive dashboards on top of it.
- Result: Leadership shifted from reactive to proactive management of quality spend. Finance started using the dashboard as their primary source.

**Why it works here:** Adapt for marketing context — swap quality spend for acquisition spend, and the story is the same: you built the infrastructure that made the number trustworthy.

### "How do you handle stakeholders who don't trust the data?"

This is implicit in the JD ("trusted source of intelligence"). Use the data dictionary story — the root cause of distrust is usually definition disagreement, not technical error. Your answer: fix it at the source with agreed definitions, then build it into the model.

### "Tell me about a time you worked in a domain you didn't know well"

**STAR — Lockheed aviation safety:**
- Situation: Joined Lockheed's RMS Quality team with a manufacturing engineering background, no aviation safety domain expertise.
- Task: Build predictive models for early-stage manufacturing defect detection.
- Action: Spent first 4 weeks interviewing engineers and quality managers to understand the domain vocabulary, failure modes, and what a "useful" signal looked like in practice. Then built the Python models on top of that domain understanding.
- Result: Failure pattern detection rates improved; models adopted by the quality org.

**Why it works here:** You will need to learn sports betting attribution, promo modeling, and acquisition funnels. Show you have a method for ramping quickly.

### "What's your experience with A/B testing or experimentation?"

Be honest — this is a gap. Do not overclaim. A good answer:
> "My experimentation background is more on the observational side — building models that track outcomes, not running controlled tests. At Peloton I supported analysis of product changes through before/after comparisons and segmented cohort work. Designed experiments are a skill I'd build into — I'm comfortable with the statistical concepts and would want to understand how you approach test design here before overstating where I am."

### "Where do you want to be in 3 years?"

IC trajectory — Staff to Senior Staff. Building the data foundation that the whole org runs on. Not moving into management. Fanatics' growth trajectory (betting becoming 40% of profits) means the data infrastructure challenge grows with the business. That is the kind of problem you want to grow into.

---

## Questions to Ask Them

**About the data work:**
1. "FanGraph is the fan intelligence layer — how does the marketing analytics team use it day to day? Is it a source of truth or more of an experimental platform?"
2. "You have Snowflake and dbt confirmed in the stack — how mature are the mart-layer models for marketing metrics today, and where are the pain points?"
3. "How do you currently measure attribution across channels for fan-to-bettor conversion? Is there a multi-touch model in place or is that still being built?"

**About the team:**
4. "Maddy Want built the data org governance-first from day one. How has that shaped the working relationship between the data team and marketing stakeholders?"
5. "This is a Staff-level IC role with technical team lead responsibilities — what does that look like in practice? Is there a team this person leads informally, or is it more about setting technical direction?"

**About the role:**
6. "What does success look like in the first 90 days for this role?"
7. "Where does this role sit in the marketing analytics org — embedded with marketing stakeholders, or centralized data team?"

**Compensation (if not raised yet):**
> "Happy to discuss comp — I'm targeting $185K+ base based on Staff-level market rates. Is there flexibility to the top of the range or above it?"

---

## Key Numbers to Have Ready

| Proof point | Number |
|---|---|
| Quality data dictionary | Company-wide adoption |
| Engineering hours saved | 35+ hrs/month |
| Spend monitored | $10M+ hardware quality spend |
| Org enabled at Lockheed | 1,000+ person Quality org |
| RPA hours eliminated | 3,500+ annually |
| Supplier contracts managed | $30M across 5 programs |

---

## Domain Vocabulary to Learn Before the Interview

Spend 30 minutes before the call getting comfortable with these terms:
- **Handle**: total amount wagered (vs revenue, which is net of payouts)
- **Hold**: percentage of handle the house keeps
- **GGR** (Gross Gaming Revenue): handle minus winnings paid out
- **NGR** (Net Gaming Revenue): GGR minus bonuses/promotions
- **CAC** (Customer Acquisition Cost): what Fanatics obsesses over because their database gives them an edge
- **LTV/CLV**: lifetime value of a bettor — cross-sell from merch to betting to casino to collectibles
- **Promo/Bonus burn rate**: cost of deposit matches and free bets
- **FTD** (First Time Depositor): the key acquisition conversion metric
- **RG** (Responsible Gambling): regulatory compliance metric — how much of their product has to account for this

---

## Red Flags to Watch For

- If they ask for gambling domain experience as hard requirement (JD says "significant plus" — should be flexible)
- If comp conversation reveals the role is budgeted at $160–$165K with no flex (below your floor)
- If "technical team lead" means people management — confirm it is IC
- If the role is fully reporting/ad hoc with no infrastructure component — less aligned with your strengths

---

Sources used:
- [Fanatics 2026 strategy — Yogonet](https://www.yogonet.com/international/news/2025/09/26/115547-fanatics-2026-strategy-sportsbook-expansion-stadium-retail-and-digital-innovation)
- [Fanatics builds data culture — Alation](https://www.alation.com/blog/fanatics-betting-and-gaming-precision-data-culture/)
- [Fanatics implements AI with Snowflake — SiliconANGLE](https://siliconangle.com/2025/07/01/fanatics-sports-betting-ai-snowflakesummit/)
- [Fanatics markets prediction platform — iGaming Business](https://igamingbusiness.com/innovation/prediction-fanatics-markets-state-launch/)
- [Fanatics COO on market share — SBC Americas](https://sbcamericas.com/2025/01/08/fanatics-mclintic-interview/)
- [US sportsbook market share 2026 — SportBot AI](https://www.sportbotai.com/stats/sportsbook-market-share)
- [Fanatics Complex content deal — Yogonet](https://www.yogonet.com/international/news/2026/04/07/118435-fanatics-expands-betting-ecosystem-with-complex-content-deal-and-prediction-market-push)
