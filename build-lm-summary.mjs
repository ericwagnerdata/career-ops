#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'fs';

// ── Keyword config (mirrors triage-lm.mjs) ──────────────────────────

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
  { kw: 'software engineer',    score: -2 },
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
  { kw: 'full stack',           score: -3 },
  { kw: 'software architect',   score: -3 },
  { kw: 'venture capital',      score: -6 },
  { kw: 'requirements analyst', score: -4 },
  { kw: 'sales engineer',       score: -3 },
  { kw: 'software engineer',    score: -2 },
  { kw: 'auditor',              score: -7 },
  { kw: 'reliability engineer', score: -4 },
  { kw: 'loads and dynamics',   score: -8 },
  { kw: 'estimating',           score: -6 },
  { kw: 'project engineer',     score: -3 },
];

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

const SALARY_FLOOR  = 170_000;
const SALARY_TARGET = 185_000;

// ── Helpers ──────────────────────────────────────────────────────────

function parseSalary(text) {
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

function salaryLabel(range) {
  if (!range) return 'N/A';
  if (range.max < SALARY_FLOOR)  return `$${(range.min/1000).toFixed(0)}K - $${(range.max/1000).toFixed(0)}K ⚠️`;
  if (range.max < SALARY_TARGET) return `$${(range.min/1000).toFixed(0)}K - $${(range.max/1000).toFixed(0)}K ~`;
  return `$${(range.min/1000).toFixed(0)}K - $${(range.max/1000).toFixed(0)}K`;
}

function scoreRole(id, text) {
  const lines = text.split('\n');

  let title = id;
  const tm = text.match(/"title":"([^"]+)"/);
  if (tm) title = tm[1];
  else {
    const h1 = lines.find(l => l.startsWith('# '));
    if (h1) title = h1.replace('# ', '').trim();
  }

  const titleLower = title.toLowerCase();
  const jdIdx = text.indexOf('## Job Description');
  const jdBody = jdIdx !== -1 ? text.slice(jdIdx).toLowerCase() : text.toLowerCase();

  let score = 0;

  for (const { kw, score: s } of TITLE_POSITIVE) {
    if (s > 0 && titleLower.includes(kw)) score += s;
  }
  for (const { kw, score: s } of TITLE_NEGATIVE) {
    if (titleLower.includes(kw)) score += s;
  }

  let jdBoost = 0;
  for (const kw of JD_POSITIVE) {
    if (jdBoost >= 3) break;
    if (jdBody.includes(kw)) jdBoost++;
  }
  score += jdBoost;

  for (const kw of JD_NEGATIVE) {
    if (jdBody.includes(kw)) score -= 2;
  }

  const range = parseSalary(text);
  if (range) {
    if (range.max < SALARY_FLOOR)  score -= 5;
    else if (range.max < SALARY_TARGET) score -= 2;
  }

  const tag = score >= 5 ? '✅' : score >= 3 ? '🟡' : score >= 0 ? '⬜' : '❌';

  return { id, title, score, tag, salary: salaryLabel(range) };
}

// ── Build summary ────────────────────────────────────────────────────

const files = readdirSync('jds')
  .filter(f => f.startsWith('lm-') && f.endsWith('.md'))
  .sort();

const rows = files.map(f => {
  const id = f.replace('lm-', '').replace('.md', '');
  return scoreRole(id, readFileSync('jds/' + f, 'utf-8'));
});

rows.sort((a, b) => b.score - a.score);

const above = rows.filter(r => !r.salary.includes('⚠️'));
const below = rows.filter(r => r.salary.includes('⚠️'));

const tableRows = (list, offset = 0) => list.map((r, i) =>
  `| ${offset + i + 1} | ${r.tag} ${r.score} | ${r.id} | ${r.title} | ${r.salary} |\n`
).join('');

const tableHeader = '| # | Score | Job ID | Role | Salary Range |\n|---|-------|--------|------|--------------|\n';

let md = '# Lockheed Martin — Remote Roles Summary\n\n';
md += `_${above.length} roles meet the $170K floor · ${below.length} below floor_\n\n`;
md += tableHeader;
md += tableRows(above);
md += `\n---\n\n## Below $170K Floor\n\n`;
md += tableHeader;
md += tableRows(below, above.length);

writeFileSync('data/lm-roles-summary.md', md, 'utf-8');
console.log(`Written ${rows.length} rows to data/lm-roles-summary.md`);
