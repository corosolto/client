import { readFileSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).flatMap((line) => {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (!match) return [];
  let value = match[2];
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [[match[1], value]];
}));

const [meshyId, tripoId, output] = process.argv.slice(2);
if (!meshyId || !tripoId || !output) throw new Error('uso: node script <meshy> <tripo> <out.json>');
async function get(url, key) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`${new URL(url).host} HTTP ${response.status}`);
  return response.json();
}
const [meshy, tripo] = await Promise.all([
  get(`https://api.meshy.ai/openapi/v2/text-to-3d/${encodeURIComponent(meshyId)}`, env.MESHY_API_KEY),
  get(`https://api.tripo3d.ai/v2/openapi/task/${encodeURIComponent(tripoId)}`, env.TRIPO_API_KEY),
]);
const receipt = {
  generatedAt: new Date().toISOString(),
  meshy: { taskId: meshyId, status: meshy.status, consumedCredits: meshy.consumed_credits ?? null, mode: meshy.mode, targetPolycount: meshy.target_polycount },
  tripo: { taskId: tripoId, status: tripo.data?.status, consumedCredits: tripo.data?.consumed_credit ?? null, modelVersion: tripo.data?.model_version ?? null },
};
writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt));
