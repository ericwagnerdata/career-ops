#!/usr/bin/env node

/**
 * fetch-lm-jds.mjs — Zero-token Lockheed Martin JD fetcher
 *
 * Uses Playwright (Chromium) to fully render each job page and extract
 * the job description, salary, requirements, and metadata.
 * Saves each to jds/lm-{BR_ID}.md. Zero Claude API tokens used.
 *
 * Usage:
 *   node fetch-lm-jds.mjs                    # fetch all jobs in JOBS list
 *   node fetch-lm-jds.mjs --dry-run          # print URLs without fetching
 *   node fetch-lm-jds.mjs --id 722007BR      # fetch a single job by BR ID
 *   node fetch-lm-jds.mjs --force            # re-fetch already saved files
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { chromium } from 'playwright';

const BASE = 'https://www.lockheedmartinjobs.com';
const OUT_DIR = 'jds';
const CONCURRENCY = 2;
const DELAY_MS = 1200;

const JOBS = [
  { id: '716691BR', path: '/job/fort-worth/it-product-owner-lead-business-analyst-staff-incurred-cost-claim/694/94003240736' },
  { id: '715234BR', path: '/job/bethesda/1lmx-ppm-ude-starburst-data-engineer-software-engineer-sr/694/94003240544' },
  { id: '711343BR', path: '/job/puerto-rico/erp-business-analyst-sr-1lmx-sap-labor-and-cost-accounting/694/94003239520' },
  { id: '710390BR', path: '/job/grand-prairie/sap-developer-senior-1lmx/694/94003239456' },
  { id: '711337BR', path: '/job/puerto-rico/product-owner-stf-1lmx-sap-controlling-cost-accounting/694/94003239344' },
  { id: '712353BR', path: '/job/puerto-rico/software-architect-staff-finance-analytics-data-architect/694/94003239136' },
  { id: '702900BR', path: '/job/puerto-rico/software-engineer-sr-staff-sap-financial-applications-o-and-m-lead/694/85490620224' },
  { id: '715052BR', path: '/job/arlington/head-of-strategic-growth-rapid-action-team-commercial-tech/694/91667752000' },
  { id: '720025BR', path: '/job/puerto-rico/1lmx-capital-test-implement-functional-lead/694/93509719184' },
  { id: '724447BR', path: '/job/grand-prairie/electrical-commodities-buyer/694/93992841536' },
  { id: '724529BR', path: '/job/bethesda/a-ai-machine-learning-engineer-early-career/694/93990656432' },
  { id: '708772BR', path: '/job/orlando/sr-ai-ml-full-stack-engineer/694/90917417920' },
  { id: '716842BR', path: '/job/fort-worth/software-engineer-staff-oracle-epm-fcc-trcs-it-product-owner/694/91884227344' },
  { id: '716707BR', path: '/job/puerto-rico/solution-architect-stf-opentext-xecm-sap-s-4hana/694/91870133632' },
  { id: '711339BR', path: '/job/bethesda/erp-business-analyst-staff-oracle-epm-fcc-trc/694/91884226224' },
  { id: '718535BR', path: '/job/fort-worth/software-engineer-staff-oracle-epm-fprp-ib-it-product-owner-build/694/91911573008' },
  { id: '719842BR', path: '/job/bethesda/site-reliability-engineer-sre/694/92623044144' },
  { id: '721130BR', path: '/job/orlando/business-process-analyst-eshs-gms-env-safety-health/694/93233140192' },
  { id: '722681BR', path: '/job/bethesda/senior-program-manager-1lmx-transformation/694/93461463584' },
  { id: '718538BR', path: '/job/fort-worth/erp-business-analyst-staff-1lmx-oracle-epm/694/91911573232' },
  { id: '723027BR', path: '/job/bethesda/ux-designer-sr/694/93686306656' },
  { id: '723776BR', path: '/job/bethesda/1lmx-program-performance-director/694/93725585104' },
  { id: '722353BR', path: '/job/puerto-rico/software-engineer-sr-stf-oracle-epm-csr-it-product-owner/694/93678067696' },
  { id: '722352BR', path: '/job/puerto-rico/software-engineer-sr-stf-oracle-epm-lrp-csr-it-product-owner-build/694/93678067680' },
  { id: '722268BR', path: '/job/bethesda/sap-business-analyst-staff-ecp-employee-central-payroll/694/93767486736' },
  { id: '712831BR', path: '/job/bethesda/sap-business-analyst-staff-1lmx-pcm-esh/694/93763797104' },
  { id: '710403BR', path: '/job/grand-prairie/solution-architect-staff-sap-wm-tm-pccm-and-hazardous-goods/694/93780936784' },
  { id: '710402BR', path: '/job/grand-prairie/sap-product-owner-staff-pccm-dangerous-and-hazardous-materials/694/93780936768' },
  { id: '710176BR', path: '/job/grand-prairie/sap-business-analyst-staff-1lmx-tm-le/694/93763796640' },
  { id: '710174BR', path: '/job/grand-prairie/sap-business-analyst-staff-1lmx-cso/694/93776446416' },
  { id: '710177BR', path: '/job/grand-prairie/sap-business-analyst-senior-staff-1lmx-immd/694/93776446400' },
  { id: '710182BR', path: '/job/grand-prairie/sap-business-analyst-senior-1lmx-ewm/694/93776446368' },
  { id: '710181BR', path: '/job/grand-prairie/sap-business-analyst-staff-1lmx-ewm/694/93776446336' },
  { id: '722088BR', path: '/job/fort-worth/integrated-program-planner-senior-f-35-proposal-scheduling-level-3/694/93225004128' },
  { id: '722085BR', path: '/job/fort-worth/integrated-program-planner-senior-f-35-strategic-scheduling-level-3/694/93225004096' },
  { id: '723797BR', path: '/job/puerto-rico/full-stack-engineer-sr-devops-ci-cd-pipelines-remote/694/93917659040' },
  { id: '724091BR', path: '/job/bethesda/it-program-manager/694/93917659264' },
  { id: '724085BR', path: '/job/bethesda/it-program-asc-manager/694/93917659232' },
  { id: '724081BR', path: '/job/bethesda/asc-manager-it-program/694/93917659200' },
  { id: '724438BR', path: '/job/moorestown/subcontract-administrator-sr/694/93958645424' },
  { id: '721805BR', path: '/job/fort-worth/int-program-planner-senior-f-35-program-level-3/694/93514417456' },
  { id: '724035BR', path: '/job/fort-worth/ai-project-manager-it-deployment/694/93767488608' },
  { id: '724188BR', path: '/job/bethesda/ai-full-stack-engineer-info-retrieval/694/93932385440' },
  { id: '723866BR', path: '/job/bethesda/senior-compensation-analyst/694/93932383856' },
  { id: '724173BR', path: '/job/fort-worth/ai-hardware-engineer-and-full-stack-engineer-staff/694/93932383664' },
  { id: '724278BR', path: '/job/lakeland/erp-business-analyst-staff/694/93927647488' },
  { id: '721549BR', path: '/job/colorado-springs/emc2-system-integration-and-test-lead-full-time-remote/694/93927636704' },
  { id: '724087BR', path: '/job/grand-prairie/reliability-engineer-sr/694/93917659248' },
  { id: '723738BR', path: '/job/fort-worth/category-intelligence-lead/694/93917659024' },
  { id: '724321BR', path: '/job/sunnyvale/senior-staff-loads-and-dynamics-engineer-part-time/694/93909775088' },
  { id: '724129BR', path: '/job/santa-rosa/technical-sales-engineer/694/93767489904' },
  { id: '722370BR', path: '/job/puerto-rico/ai-infrastructure-and-platform-ops-engineer-junior-career/694/93388080592' },
  { id: '722132BR', path: '/job/puerto-rico/ai-infraops-associate-manager/694/93388080496' },
  { id: '721807BR', path: '/job/bethesda/administrative-assistant-sr-sp/694/93159986272' },
  { id: '723564BR', path: '/job/puerto-rico/business-analyst-sr-1lmx-erp-functional-analyst/694/93729272352' },
  { id: '723221BR', path: '/job/sunnyvale/subcontract-program-management-sr-staff/694/93725582128' },
  { id: '722623BR', path: '/job/bethesda/1lmx-capability-development-program-director/694/93422269712' },
  { id: '721766BR', path: '/job/cherry-hill/supply-chain-ai-developer/694/93725581232' },
  { id: '710121BR', path: '/job/bethesda/software-developer-sr-staff-sap-mdg/694/90519161120' },
  { id: '720100BR', path: '/job/bethesda/erp-business-analyst-staff-1lmx-accounts-payable-functional-analyst/694/93717589184' },
  { id: '719987BR', path: '/job/puerto-rico/erp-business-analyst-staff-overhead-design-build-functional-lead/694/93717589120' },
  { id: '723784BR', path: '/job/grand-prairie/manufacturing-planner/694/93697030288' },
  { id: '722795BR', path: '/job/puerto-rico/erp-business-analyst-staff-o-and-m-lead/694/93648526240' },
  { id: '722411BR', path: '/job/bethesda/information-technology-auditor-mid-level/694/93648526016' },
  { id: '721546BR', path: '/job/puerto-rico/1lmx-orders-to-cash-f-and-bo-manager/694/93648525760' },
  { id: '721548BR', path: '/job/bethesda/business-analyst-sr-1lmx-erp-functional-analyst/694/93648525744' },
  { id: '721496BR', path: '/job/bethesda/business-analyst-sr-1lmx-erp-functional-analyst/694/93648525728' },
  { id: '720577BR', path: '/job/fort-worth/electrical-capability-project-engineer-sme/694/93648525632' },
  { id: '720573BR', path: '/job/fort-worth/cnc-machining-capability-project-engineer-sme/694/93648525616' },
  { id: '720308BR', path: '/job/bethesda/erp-business-analyst-sr-1lmx-accounting-functional-analyst/694/93509719568' },
  { id: '720309BR', path: '/job/bethesda/erp-business-analyst-senior-1lmx-cost-accounting-functional-analyst/694/93509719536' },
  { id: '719739BR', path: '/job/arlington/prsm-australia-program-export-coordinator-pec-full-time-remote/694/92393399888' },
  { id: '721515BR', path: '/job/colorado-springs/oracle-cloud-architect-developer-full-time-remote/694/92971542176' },
  { id: '720460BR', path: '/job/bethesda/erp-business-analyst-sr-1lmx-accounting-functional-analyst/694/93461462960' },
  { id: '718773BR', path: '/job/puerto-rico/erp-business-analyst-staff-1lmx-financial-accounting-analyst/694/93461462864' },
  { id: '722187BR', path: '/job/lakeland/accountant/694/93434559600' },
  { id: '721520BR', path: '/job/colorado-springs/oracle-database-engineer-staff-full-time-remote/694/93116613360' },
  { id: '722006BR', path: '/job/colorado-springs/senior-integration-and-test-engineer-full-time-remote/694/93209913328' },
  { id: '722007BR', path: '/job/colorado-springs/sr-data-engineer-full-time-remote/694/93209913216' },
  { id: '720010BR', path: '/job/fort-worth/ai-sw-and-sys-architect-sr-staff/694/92651260016' },
  { id: '716950BR', path: '/job/fort-worth/financial-planning-and-analysis-lead-staff/694/93384345408' },
  { id: '722001BR', path: '/job/fort-worth/sr-financial-mgmt/694/93198453584' },
  { id: '722052BR', path: '/job/grand-prairie/procurement-and-subcontract-buyer/694/93198452032' },
  { id: '721376BR', path: '/job/arlington/venture-capital-senior-associate-lm-venture-capital/694/93186417072' },
  { id: '721904BR', path: '/job/fort-worth/material-estimating-sr-manager-production-programs/694/93166680256' },
  { id: '720712BR', path: '/job/fort-worth/aero-digital-transformation-system-architect-level-4/694/93120774496' },
  { id: '720606BR', path: '/job/arlington/manufacturing-execution-system-mes-project-engineer/694/93116612576' },
  { id: '721067BR', path: '/job/puerto-rico/business-solutions-architect-cost-accounting-and-integration/694/93116612272' },
  { id: '720576BR', path: '/job/fort-worth/cost-account-manager-aeronautics-field-sustainment/694/92923449568' },
  { id: '721030BR', path: '/job/moorestown/subcontract-administrator-sr/694/92895730800' },
  { id: '720407BR', path: '/job/arlington/prod-ops-erp-architect/694/92856457968' },
  { id: '713608BR', path: '/job/arlington/strategic-requirements-analyst-sr-staff-surface-naval-weapons-systems/694/92397606752' },
  { id: '720766BR', path: '/job/herndon/software-engineer-integration-and-test/694/92818294464' },
  { id: '720012BR', path: '/job/bethesda/business-solutions-architect-overhead-labor-accounting/694/92584080224' },
  { id: '719502BR', path: '/job/bethesda/integrated-program-planner-1lmx-planning-operations/694/92584077648' },
  { id: '695119BR', path: '/job/huntsville/software-engineer/694/82146566400' },
  { id: '719523BR', path: '/job/bethesda/business-solutions-architect-financial-accounting/694/92382953888' },
  { id: '717541BR', path: '/job/bethesda/ai-sales-engineer-public-sector/694/91586582352' },
  { id: '717536BR', path: '/job/bethesda/ai-sales-engineer-commercial-sector/694/91657962112' },
  { id: '716921BR', path: '/job/arlington/venture-capital-investment-senior-manager/694/91437851264' },
  { id: '686992BR', path: '/job/englewood/project-engineer/694/77374771984' },
];

// ── Args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const singleId = args.find(a => a.startsWith('--id='))?.split('=')[1]
  ?? (args.includes('--id') ? args[args.indexOf('--id') + 1] : null);

const targets = singleId
  ? JOBS.filter(j => j.id === singleId)
  : JOBS;

if (!targets.length) {
  console.error(`No job found with id: ${singleId}`);
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJob(page, job) {
  const url = `${BASE}${job.path}`;
  const outFile = `${OUT_DIR}/lm-${job.id}.md`;

  if (!force && existsSync(outFile)) {
    console.log(`  skip  ${job.id} (already fetched)`);
    return { id: job.id, status: 'skipped' };
  }

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    // Wait for the JD content to appear
    await page.waitForSelector('.jd-description, .job-description, [class*="description"], h1', {
      timeout: 8_000,
    }).catch(() => {});

    const title = await page.title();

    if (!title || title.toLowerCase().includes('page not found') || title.toLowerCase().includes('404')) {
      console.log(`  closed ${job.id}`);
      writeFileSync(outFile, `# ${job.id}\n\n**Status:** CLOSED\n\n**URL:** ${url}\n`);
      return { id: job.id, status: 'closed' };
    }

    // Extract structured fields from the rendered DOM
    const data = await page.evaluate(() => {
      const getText = sel => document.querySelector(sel)?.innerText?.trim() ?? '';
      const getAllText = sel => [...document.querySelectorAll(sel)].map(el => el.innerText.trim()).filter(Boolean);

      // Job title
      const jobTitle = getText('h1') || getText('.job-title') || getText('[class*="job-title"]');

      // Location
      const location = getText('.job-location') || getText('[class*="location"]') || getText('.location');

      // Salary -- TalentBrew puts it in a span or div with "salary" in class/text
      const salaryEl = [...document.querySelectorAll('*')].find(el =>
        el.children.length === 0 &&
        (el.className?.toLowerCase?.().includes('salary') ||
         el.innerText?.match(/\$[\d,]+/))
      );
      const salary = salaryEl?.innerText?.trim() ?? '';

      // Job description -- try known selectors then fall back to largest text block
      const jdSelectors = [
        '.jd-description',
        '#job-description',
        '[class*="job-description"]',
        '[class*="jd-content"]',
        '.job-details',
        '[class*="job-details"]',
        'article',
      ];
      let description = '';
      for (const sel of jdSelectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.length > 200) {
          description = el.innerText.trim();
          break;
        }
      }

      // Metadata fields (job ID, date, clearance, etc.)
      const metaItems = getAllText('.job-info li, .job-meta li, [class*="job-info"] li, [class*="criteria"] li, dl dt, dl dd');

      return { jobTitle, location, salary, description, metaItems };
    });

    const lines = [
      `# ${data.jobTitle || title}`,
      ``,
      `**Job ID:** ${job.id}`,
      `**URL:** ${url}`,
      data.location ? `**Location:** ${data.location}` : '',
      data.salary ? `**Salary:** ${data.salary}` : '',
      ``,
      `---`,
      ``,
    ];

    if (data.metaItems.length) {
      lines.push(`## Details\n`);
      data.metaItems.forEach(item => lines.push(`- ${item}`));
      lines.push('');
    }

    if (data.description) {
      lines.push(`## Job Description\n`);
      lines.push(data.description);
    } else {
      // Last resort: grab all visible body text
      const bodyText = await page.evaluate(() => document.body.innerText);
      lines.push(`## Job Description\n`);
      lines.push(bodyText.slice(0, 8000));
    }

    const content = lines.filter(l => l !== null).join('\n') + '\n';
    writeFileSync(outFile, content);
    console.log(`  ok    ${job.id} — ${(data.jobTitle || title).slice(0, 60)}`);
    return { id: job.id, status: 'ok' };

  } catch (err) {
    console.log(`  fail  ${job.id} — ${err.message}`);
    return { id: job.id, status: 'fail', error: err.message };
  }
}

// ── Concurrency pool ──────────────────────────────────────────────────

async function runPool(browser, jobs, concurrency) {
  const results = [];
  let i = 0;

  async function worker() {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    while (i < jobs.length) {
      const job = jobs[i++];
      const result = await fetchJob(page, job);
      results.push(result);
      if (result.status === 'ok') await sleep(DELAY_MS);
    }

    await page.close();
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────

if (dryRun) {
  console.log(`Dry run — ${targets.length} jobs:`);
  targets.forEach(j => console.log(`  ${j.id}  ${BASE}${j.path}`));
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`Fetching ${targets.length} job(s) → ${OUT_DIR}/\n`);

const browser = await chromium.launch({ headless: true });

try {
  const results = await runPool(browser, targets, CONCURRENCY);
  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nDone. ${JSON.stringify(counts)}`);
  console.log(`Files saved to ${OUT_DIR}/lm-*.md`);
} finally {
  await browser.close();
}
