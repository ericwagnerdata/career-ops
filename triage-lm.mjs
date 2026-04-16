#!/usr/bin/env node
/**
 * triage-lm.mjs — Zero-token keyword scorer for Lockheed Martin remote roles
 *
 * Reads jds/lm-*.md, scores each role against Eric's profile keywords,
 * flags salary against $170K floor, and outputs a ranked triage table.
 *
 * Usage:
 *   node triage-lm.mjs               # ranked list, all roles
 *   node triage-lm.mjs --threshold 4 # only show score >= 4
 *   node triage-lm.mjs --eval-list   # print just the BR IDs to eval
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';

const args = process.argv.slice(2);
const threshold = (() => {
  const i = args.indexOf('--threshold');
  return i !== -1 ? Number(args[i + 1]) : 0;
})();
const evalListOnly = args.includes('--eval-list');

// ── Keyword config ───────────────────────────────────────────────────

// Title keywords — weighted higher (checked against title only)
const TITLE_POSITIVE = [
  { kw: 'data engineer',        score: 0 },
  { kw: 'analytics engineer',   score: 5 },
  { kw: 'data analyst',         score: 5 },
  { kw: 'data architect',       score: 4 },
  { kw: 'ai developer',         score: 4 },
  { kw: 'ml engineer',          score: 4 },
  { kw: 'machine learning',     score: 4 },
  { kw: 'starburst',            score: 4 },
  { kw: 'supply chain ai',      score: 3 },
  { kw: 'ai sw',                score: 3 },
];

const TITLE_NEGATIVE = [
  { kw: 'sap',                  score: -6 },
  { kw: 'erp',                  score: -6 },
  { kw: 'oracle epm',           score: -6 },
  { kw: 'accountant',           score: -8 },
  { kw: 'accounting',           score: -6 },
  { kw: 'financial',            score: -5 },
  { kw: 'procurement',          score: -7 },
  { kw: 'subcontract',          score: -8 },
  { kw: 'buyer',                score: -8 },
  { kw: 'commodities',          score: -8 },
  { kw: 'manufacturing',        score: -7 },
  { kw: 'planner',              score: -6 },
  { kw: 'cost account',         score: -7 },
  { kw: 'payroll',              score: -7 },
  { kw: 'compensation analyst', score: -7 },
  { kw: 'ux designer',          score: -6 },
  { kw: 'administrative',       score: -8 },
  { kw: 'export coordinator',   score: -8 },
  { kw: 'business analyst',     score: -4 },
  { kw: 'program planner',      score: -6 },
  { kw: 'program manager',      score: -7 },
  { kw: 'program director',     score: -7 },
  { kw: 'senior manager',       score: -7 },
  { kw: 'associate manager',    score: -7 },
  { kw: ' manager',             score: -6 },
  { kw: ' director',            score: -6 },
  { kw: 'venture capital',      score: -6 },
  { kw: 'requirements analyst', score: -4 },
  { kw: 'sales engineer',       score: -3 },
  { kw: 'software engineer',    score: -2 },
  { kw: 'full stack',           score: -3 },
  { kw: 'software architect',   score: -3 },
  { kw: 'auditor',              score: -7 },
  { kw: 'reliability engineer', score: -4 },
  { kw: 'loads and dynamics',   score: -8 },
  { kw: 'estimating',           score: -6 },
  { kw: 'project engineer',     score: -3 },
];

// JD body keywords — lighter boost (cap total boost at +3)
const JD_POSITIVE = [
  'dbt', 'data build tool',
  'python', 'pyspark',
  'sql', 'analytics',
  'data pipeline', 'data lake', 'data warehouse',
  'snowflake', 'redshift', 'bigquery', 'databricks', 'starburst', 'trino',
  'airflow', 'spark',
  'llm', 'large language model', 'generative ai', 'gen ai',
  'ai/ml', 'machine learning', 'artificial intelligence',
  'aws', 'gcp', 'azure',
  'metric', 'dashboard', 'self-service',
  'data modeling', 'data model',
];

const JD_NEGATIVE = [
  'sap s/4', 'sap hana', 'oracle epm', 'sap erp',
  'soldering', 'machining', 'cnc', 'fabrication',
  'fpga', 'radar', 'sonar', 'avionics',
  'travel up to', '25% travel', '50% travel', '75% travel',
];

// ── Salary config ────────────────────────────────────────────────────

const SALARY_FLOOR   = 170_000;  // hard minimum
const SALARY_TARGET  = 185_000;  // preferred minimum

// ── Helpers ──────────────────────────────────────────────────────────

function parseSalary(text) {
  // Prefer Colorado/general range line
  const lines = text.split('\n').filter(l => /^Pay Rate:/.test(l));
  const coLine = lines.find(l => l.includes('Colorado'));
  const line = coLine || lines[0];
  if (!line) return null;
  const m = line.match(/is \$([0-9,]+)\s*-\s*\$([0-9,]+)/);
  if (!m) return null;
  return {
    min: parseInt(m[1].replace(/,/g, ''), 10),
    max: parseInt(m[2].replace(/,/g, ''), 10),
  };
}

function salaryFlag(range) {
  if (!range) return { label: 'N/A', penalty: 0 };
  if (range.max < SALARY_FLOOR)    return { label: `LOW ($${(range.max/1000).toFixed(0)}K max)`, penalty: -5 };
  if (range.max < SALARY_TARGET)   return { label: `TIGHT ($${(range.max/1000).toFixed(0)}K max)`, penalty: -2 };
  return { label: `$${(range.min/1000).toFixed(0)}K-$${(range.max/1000).toFixed(0)}K`, penalty: 0 };
}

function scoreRole(id, text) {
  const lines = text.split('\n');

  // Title: prefer schema field
  let title = id;
  const tm = text.match(/"title":"([^"]+)"/);
  if (tm) title = tm[1];
  else {
    const h1 = lines.find(l => l.startsWith('# '));
    if (h1) title = h1.replace('# ', '').trim();
  }

  const titleLower = title.toLowerCase();

  // JD body: everything after "## Job Description"
  const jdIdx = text.indexOf('## Job Description');
  const jdBody = jdIdx !== -1 ? text.slice(jdIdx).toLowerCase() : text.toLowerCase();

  let score = 0;
  const reasons = [];

  // Title positive
  for (const { kw, score: s } of TITLE_POSITIVE) {
    if (titleLower.includes(kw)) {
      score += s;
      reasons.push(`+${s} "${kw}"`);
    }
  }

  // Title negative
  for (const { kw, score: s } of TITLE_NEGATIVE) {
    if (titleLower.includes(kw)) {
      score += s;
      reasons.push(`${s} "${kw}"`);
    }
  }

  // JD body positive (capped at +3 total)
  let jdBoost = 0;
  for (const kw of JD_POSITIVE) {
    if (jdBoost >= 3) break;
    if (jdBody.includes(kw)) {
      jdBoost++;
      reasons.push(`+1 jd:"${kw}"`);
    }
  }
  score += jdBoost;

  // JD body negative
  for (const kw of JD_NEGATIVE) {
    if (jdBody.includes(kw)) {
      score -= 2;
      reasons.push(`-2 jd:"${kw}"`);
    }
  }

  // Salary
  const range = parseSalary(text);
  const sal = salaryFlag(range);
  score += sal.penalty;
  if (sal.penalty < 0) reasons.push(`${sal.penalty} salary`);

  return { id, title, score, salary: sal.label, reasons };
}

// ── Main ─────────────────────────────────────────────────────────────

const files = readdirSync('jds')
  .filter(f => f.startsWith('lm-') && f.endsWith('.md'))
  .sort();

const results = files.map(f => {
  const id = f.replace('lm-', '').replace('.md', '');
  const text = readFileSync('jds/' + f, 'utf-8');
  return scoreRole(id, text);
});

// Sort descending by score
results.sort((a, b) => b.score - a.score);

const filtered = threshold > 0 ? results.filter(r => r.score >= threshold) : results;

if (evalListOnly) {
  const evalIds = results.filter(r => r.score >= 3).map(r => r.id);
  console.log(evalIds.join('\n'));
  process.exit(0);
}

// ── Print table ──────────────────────────────────────────────────────

const tag = r => {
  if (r.score >= 5) return '✅ EVAL';
  if (r.score >= 3) return '🟡 MAYBE';
  if (r.score >= 0) return '⬜ WEAK';
  return '❌ SKIP';
};

console.log('\nLockheed Martin — Triage Results');
console.log('='.repeat(90));
console.log(`${'Score'.padEnd(7)}${'Tag'.padEnd(10)}${'Job ID'.padEnd(13)}${'Salary'.padEnd(25)}Role`);
console.log('-'.repeat(90));

for (const r of filtered) {
  const sal = r.salary.padEnd(24);
  const scoreStr = String(r.score).padEnd(6);
  const tagStr = tag(r).padEnd(10);
  console.log(`${scoreStr} ${tagStr} ${r.id.padEnd(12)} ${sal} ${r.title}`);
}

console.log('='.repeat(90));

const evalCount  = results.filter(r => r.score >= 5).length;
const maybeCount = results.filter(r => r.score >= 3 && r.score < 5).length;
const skipCount  = results.filter(r => r.score < 0).length;

console.log(`\nSummary: ✅ ${evalCount} eval  🟡 ${maybeCount} maybe  ❌ ${skipCount} skip`);
console.log(`\nTo batch eval top candidates:`);
console.log(`  node triage-lm.mjs --eval-list | xargs -I{} node fetch-lm-jds.mjs --id {}`);

// Write eval list to file
const evalIds = results.filter(r => r.score >= 3).map(r => r.id);
writeFileSync('data/lm-eval-list.txt', evalIds.join('\n') + '\n', 'utf-8');
console.log(`\nEval list (score >= 3) saved to data/lm-eval-list.txt (${evalIds.length} roles)`);
