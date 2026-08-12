// Read-only, sanitized receipt query for one already-created Meshy rig task.
import { readFileSync } from 'node:fs';

const id = process.argv[2];
if (!/^[-a-f0-9]{36}$/i.test(id || '')) throw new Error('invalid task id');
const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (!m) continue;
  let value = m[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  env[m[1]] = value;
}
const response = await fetch(`https://api.meshy.ai/openapi/v1/rigging/${id}`, {
  headers: { Authorization: `Bearer ${env.MESHY_API_KEY}` },
  redirect: 'error',
});
const body = await response.json();
if (!response.ok) throw new Error(`Meshy HTTP ${response.status}: ${body?.message || 'unknown'}`);
console.log(JSON.stringify({
  id,
  status: body.status,
  progress: body.progress,
  consumed_credits: body.consumed_credits,
  created_at: body.created_at,
  started_at: body.started_at,
  finished_at: body.finished_at,
}, null, 2));
