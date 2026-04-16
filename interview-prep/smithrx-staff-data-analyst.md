# Interview Prep — SmithRx
## Staff Data Analyst

**Role:** Staff Data Analyst | Score: 3.6/5
**Date prepared:** 2026-04-16
**Tracker:** #44 | Applied 2026-04-13 | Initial interview scheduled
**Report:** [044](../reports/044-smithrx-staff-data-analyst-2026-04-13.md)

---

## Company Intel

### What SmithRx actually is

SmithRx is a modern pharmacy benefit manager (PBM). PBMs sit between insurers, employers, and pharmacies — they manage prescription drug benefits on behalf of self-insured employers and health plans.

Traditional PBMs (CVS Caremark, Express Scripts/Cigna, OptumRx/UnitedHealth) make money on hidden spread pricing and by retaining drug manufacturer rebates. SmithRx disrupts this with a **pass-through, transparent model**: they charge flat admin fees and pass all rebates directly back to clients. The pitch to employers is simple: lower drug spend, no hidden markups.

### Why this is a data company

SmithRx's entire value proposition is provable only through data. Every contract they sign with an employer requires them to demonstrate:
- Actual drug spend vs benchmark
- Rebate dollars passed through (not retained)
- Generic dispensing rates and formulary compliance
- Member adherence and outcomes

Without clean, trustworthy data, they cannot prove their model works. This is why the data governance and metrics infrastructure role exists — it is foundational to the business, not a support function.

### Competitive landscape

| PBM | Model | Market position |
|-----|-------|-----------------|
| Express Scripts (Cigna) | Traditional — spread pricing, rebate retention | #1 by volume |
| CVS Caremark | Traditional — integrated with CVS retail | #2 |
| OptumRx (UnitedHealth) | Traditional — vertically integrated insurer | #3 |
| **SmithRx** | Pass-through transparent | Growing challenger, Series C |
| Rightway, Capital Rx | Similar modern PBM model | Direct competitors |

### Key PBM vocabulary to know before the call

| Term | Definition |
|------|------------|
| PMPM | Per Member Per Month — the primary drug spend metric |
| GDR | Generic Dispensing Rate — share of prescriptions filled as generics (higher = lower cost) |
| Formulary | The list of covered drugs and their tier (cost share level) |
| Rebate pass-through | Manufacturer rebates returned to the employer vs retained by the PBM |
| Spread pricing | Traditional PBM model: charge employer more than they pay the pharmacy, keep the difference |
| Prior authorization (PA) | Approval requirement before covering certain high-cost drugs |
| Adherence | Whether members actually take their medications as prescribed |
| Claims data | The transaction record of every prescription filled — the core data asset |

### What the data challenge looks like

SmithRx ingests claims from pharmacies, formulary data from manufacturers, eligibility data from employer HR systems, and rebate data from drug manufacturers. Every one of these sources has different schemas, update frequencies, and quality issues. The job of the data team is to unify these into a single trusted analytics layer that:

1. Proves to employers that SmithRx's model is delivering savings
2. Surfaces opportunities to improve formulary design
3. Powers internal operational reporting (member support, clinical teams)

This is structurally identical to Eric's work at Peloton: multi-source claims/warranty data, financial accountability, and exec-level reporting that has to be right.

---

## Role Reality Check

This is a **Staff Data Analyst** role — not an AE title, but the scope is AE-level. Key signals from the JD:

- "Partner with data engineers on dimensional models" — you are shaping the data layer, not just querying it
- "Data governance and quality standards" — you own the metric definitions, not just the dashboards
- "AI-enabled reporting systems" — they want someone actively integrating LLMs into the workflow
- "Force multiplier through technical mentorship" — Staff IC coaching juniors, not a manager

**Your strengths here:**
- dbt transformation layers: directly applicable
- Data dictionary and metric governance: exact match
- Executive dashboards from complex multi-source data: proven at Peloton
- Mentorship and CoP: Lockheed story
- LLM integration: daily practice

**Your gaps:**
- Healthcare/pharmacy claims domain: no direct experience
- PBM-specific metrics (PMPM, GDR, rebate accounting): learnable, not technical

**The honest frame going in:** "I build the data layer that the business runs on — the metric standards, the governance frameworks, the pipelines that power exec reporting. The domain is new to me, but the challenge — making complex multi-source claims data trustworthy and actionable — is exactly what I've done with quality and warranty claims at Peloton."

---

## Likely Interview Questions + Prepared Answers

### "Tell me about yourself / walk me through your background"

Keep to 90 seconds. Hit these four beats:

1. Started as an engineer at Lockheed — built the data infrastructure for a 1,000+ person Quality org from nothing
2. At Peloton, built the dbt transformation layer, metric standards, and data dictionary that the entire Quality org runs on today — not dashboards, the floor under the dashboards
3. Now looking for a company where foundational data work genuinely matters — a place building from scratch, not maintaining legacy
4. SmithRx fits: transparent PBM model that lives or dies on data credibility, building the analytics infrastructure that proves their model works

---

### "Why SmithRx / Why PBM?"

> "The traditional PBM model is opaque by design — the money is in the hidden spread. SmithRx wins by being provably better, and that proof is entirely data. If your metrics aren't trustworthy, your value proposition collapses. I've spent years in environments where data credibility was non-negotiable — quality data at Peloton had real financial and safety consequences if it was wrong. That rigor maps directly to what you're building here."

Do not fake healthcare passion. The honest version — data credibility as a business-critical function — is more compelling than domain enthusiasm you don't have.

---

### "Tell me about a time you built something that improved data trust across an organization"

**STAR — Peloton Data Dictionary:**
- **S:** Metric inconsistency across Quality, Warranty, and Compliance at Peloton. Each team calculated the same KPIs differently. Exec dashboards showed conflicting numbers and leadership didn't know which source to trust.
- **T:** Establish a single source of truth for quality metrics company-wide — Peloton's first enterprise data dictionary.
- **A:** Interviewed stakeholders across three business units to understand their definitions and use cases. Drafted canonical definitions, ran alignment sessions, embedded everything into dbt models and internal documentation. Drove adoption through working sessions, not mandates.
- **R:** Company-wide adoption. Exec dashboard conflicts dropped to near-zero. Engineers and analysts now reference the dictionary before building anything new.
- **Reflection:** Adoption required social infrastructure, not just the document. The working sessions mattered as much as the content.

**Why it lands here:** SmithRx's entire employer reporting depends on every stakeholder agreeing on what PMPM and GDR mean. That is the exact problem.

---

### "Tell me about a time you turned complex, multi-source data into a reliable business metric"

**STAR — $10M Quality Spend Pipeline:**
- **S:** Peloton's hardware quality spend ($10M+) had no real-time visibility. Finance was running month-old batch reports. Leadership couldn't react to emerging cost signals in Extended Warranty, Product Safety, and Compliance.
- **T:** Design a production pipeline and reporting layer that surfaces cost signals in near real-time.
- **A:** Designed the ETL architecture — multi-source integration from warranty claims, service costs, and refurbishment data. Built upstream validation to catch issues before they reached dashboards. Architected dbt transformation layers; delivered exec dashboards with daily refresh.
- **R:** Leadership shifted from reactive to proactive. Finance made it their primary reporting source for quality cost management.
- **Reflection:** Would have built schema contracts with upstream owners earlier — two major rework cycles came from undocumented upstream changes. Formal contracts prevent that.

**Why it lands here:** Swap quality spend for drug spend PMPM, warranty claims for pharmacy claims. Same architecture, same challenge, same consequences if it's wrong.

---

### "Tell me about your approach to technical mentorship and building data culture"

**STAR — Lockheed Data Community of Practice:**
- **S:** 1,000+ person Quality org at Lockheed with no shared data skills or standards. Engineers ran Excel analyses that contradicted each other. Analysts had no peer learning path.
- **T:** Build a sustainable data community without a formal L&D budget or headcount.
- **A:** Founded bi-weekly Data Office Hours and a Community of Practice. Created curriculum, facilitated sessions, onboarded practitioners across 12+ teams. Made it optional and genuinely useful — not mandatory training.
- **R:** Analytics adoption spread beyond the immediate team. Engineers shifted from ad-hoc Excel to evidence-based pipeline decisions. The CoP ran after I left.
- **Reflection:** Peer communities work better than top-down mandates. Organic spread beats formal rollout every time.

**Why it lands here:** "Force multiplier through technical mentorship" is verbatim JD language. This story is a direct answer.

---

### "How are you integrating AI into your analytics workflow today?"

This is a concrete question — give a concrete answer, not a philosophical one:

> "Day to day I use LLMs as a thought partner for SQL debugging, dbt model design, and documentation drafts. I've built internal prompt templates for recurring analysis tasks — the kind of thing that used to take 2 hours of copy-paste work now takes 20 minutes of iteration. The bigger shift for me has been using AI for first-draft data documentation — I can generate a first pass of a dbt model's description and column-level docs, then edit for accuracy, instead of writing from scratch. The output is better and faster. I'm genuinely excited about AI-enabled reporting — the question I'm asking in this search is where AI augments the analyst workflow versus where it just adds noise."

---

### "Tell me about a time you worked in a domain you didn't know"

**STAR — Lockheed Aviation Safety:**
- **S:** Joined Lockheed's RMS Quality team with a manufacturing engineering background and no aviation safety domain expertise.
- **T:** Build predictive models for early-stage manufacturing defect detection on F-35 and C-130 programs.
- **A:** Spent the first month doing structured domain intake — interviewed quality engineers and safety managers to understand failure modes, the vocabulary of defect classification, and what "useful early signal" meant in practice. Only then built the Python models.
- **R:** Defect detection models adopted by the quality org. Failure pattern detection rates improved.
- **Reflection:** Domain understanding before tooling is always faster. Rushing to build before understanding the domain produces models that are technically correct and operationally useless.

---

### "What's your experience with dimensional modeling?"

Be specific, not generic:

> "At Peloton I worked closely with data engineers to design the fact and dimension tables underlying our quality reporting. The core pattern was a warranty claims fact table with dimensions for product, time, geography, and failure mode — star schema. We made deliberate choices about grain (one row per claim event vs one row per unit) based on what the reporting layer needed downstream. I can write the SQL and dbt models, and I know when to push back on a model design that will cause reporting problems six months later."

---

### "Why are you leaving Peloton?"

Keep it positive and future-focused:

> "Peloton is a great environment — I've built things there I'm genuinely proud of. I'm looking for a company where foundational data work is the mission, not a support function. At a startup like SmithRx, the analytics infrastructure I'd build has a direct line to whether the business can prove its value to clients. That kind of consequence makes the work more interesting."

---

## Questions to Ask Them

**About the data work:**
1. "What does the analytics data layer look like today — how mature are the dbt models, and where are the biggest trust or consistency gaps?"
2. "When an employer asks you to prove your model delivered savings against their previous PBM, what data does that analysis run on, and who owns it?"
3. "Where do pharmacy claims data and rebate data live today — warehouse, and what's the freshness of that data?"

**About the team:**
4. "What's the composition of the data team — engineers, analysts, scientists — and who does this role work most closely with day to day?"
5. "You mentioned a force multiplier through mentorship — are there junior analysts this person would be coaching directly, or is it more about setting technical standards?"

**About the role:**
6. "What does success look like at 90 days and 6 months for this hire?"
7. "The JD mentions AI-enabled reporting systems — what does that mean in practice on your team today?"

**Compensation — ask early in the call:**
> "Before we go deeper, I want to make sure we're aligned on comp range so neither of us wastes time. I'm targeting $185K+ base at Staff level — can you share what the band looks like for this role?"

If they push back or say "we'll discuss that later":
> "Totally fair — I just want to flag my range upfront so we can focus the conversation. Happy to keep going and circle back."

---

## Comp Strategy

**Risk level: HIGH.** SmithRx has no posted range. Market data for analyst roles at SmithRx runs $80K–$152K. Staff-level is higher, but at a Series C startup this is uncertain.

**Your floor:** $170K base. Do not move below this.

**Ask in the first 10 minutes of the recruiter call.** Do not wait until an offer stage. If the band is $140-160K, exit gracefully and don't invest more time.

**If they're at $160-170K:**
> "I appreciate the transparency. My target is $170K+ — is there flexibility to get there? I'm also interested in the full package, so equity and bonus structure would help me evaluate."

**If they say the band tops out at $155K:**
> "I appreciate you sharing that. The role is genuinely interesting, but at $155K I'd be stepping down from my current comp, and I don't think I can make that work right now. Happy to stay in touch if comp structure changes."

---

## Key Numbers to Have Ready

| Proof point | Number |
|-------------|--------|
| Quality data dictionary | Company-wide adoption — first enterprise data dictionary at Peloton |
| Engineering hours saved | 35+ hrs/month from Tableau migration |
| Spend monitored | $10M+ hardware quality spend |
| Org enabled at Lockheed | 1,000+ person Quality org |
| RPA hours eliminated | 3,500+ annually |
| Per-defect time saved | 100+ hrs/defect investigation |

---

## Red Flags to Watch For

- Comp band tops out below $170K — exit early, do not invest more time
- "Staff" title but the work is individual analyst, no data layer influence — misalignment with your strengths
- If they need pharmacy/PBM domain expertise as a hard requirement (JD says preferred — should be flexible)
- If "technical mentorship" means people management — confirm IC
- If data infrastructure is already mature and this is purely a reporting role — less aligned with the greenfield build narrative

---

## Sources

- SmithRx website and Series C announcements
- PBM industry overview — PCMA, Commonwealth Fund
- Evaluation report [044](../reports/044-smithrx-staff-data-analyst-2026-04-13.md)
