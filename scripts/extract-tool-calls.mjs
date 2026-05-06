import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const dirs = readdirSync(PROJECTS_DIR);
const files = [];
for (const d of dirs) {
  const p = join(PROJECTS_DIR, d);
  let entries;
  try { entries = readdirSync(p); } catch { continue; }
  for (const e of entries) {
    if (!e.endsWith('.jsonl')) continue;
    const fp = join(p, e);
    try { files.push({ fp, mtime: statSync(fp).mtimeMs }); } catch {}
  }
}
files.sort((a, b) => b.mtime - a.mtime);
const top = files.slice(0, 50);

const counts = new Map();
for (const { fp } of top) {
  let raw;
  try { raw = readFileSync(fp, 'utf8'); } catch { continue; }
  for (const line of raw.split('\n')) {
    if (!line) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.type !== 'assistant') continue;
    const content = obj.message?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c.type !== 'tool_use') continue;
      const name = c.name;
      let key;
      if (name === 'Bash') {
        const cmd = (c.input?.command || '').trim();
        // Strip leading env vars, sudo, timeout
        const tokens = cmd.split(/\s+/);
        let i = 0;
        while (i < tokens.length && (/^[A-Z_]+=.+/.test(tokens[i]) || tokens[i] === 'sudo' || tokens[i] === 'timeout')) i++;
        const head = tokens[i] || '';
        const sub = tokens[i + 1] || '';
        key = `Bash:${head} ${sub}`.trim();
      } else if (name?.startsWith('mcp__')) {
        key = `MCP:${name}`;
      } else {
        continue;
      }
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
}
const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, v] of sorted) console.log(`${v}\t${k}`);
console.error(`Files scanned: ${top.length}`);
