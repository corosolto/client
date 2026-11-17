/* ============================================================================
   vercel-ignore-check.mjs — NENHUM COMMIT BUILDA NA VERCEL, NUNCA
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Fase 6 da migração Vercel → Cloudflare (docs/runbooks/MIGRACAO-CLOUDFLARE.md):
   produção é o Worker `csb-prod` (`cf-prod-deploy.yml`) e preview de PR é
   `cf-preview.yml`. O `scripts/ci/vercel-ignore.sh` é o `ignoreCommand` da
   integração Git da Vercel (ainda conectada para o rollback de 30 dias) e tem
   que sair 0 em QUALQUER evento — nenhum commit vira build lá.

   CLÁUSULAS (código de saída que a Vercel vê: 0 = pula, 1 = builda)
     VI1  preview de PR                     -> 0 (pula)
     VI2  staging/main/lote-*               -> 0 (pula; era `exit 1` até a fase 6)
     VI3  produção `chore(release):`        -> 0 (pula; deploy é o cf-prod-deploy)
     VI4  o fonte não contém caminho de build (`exit 1`)

   MUTANTE (`--mutate`):
     builda-de-novo   injeta `exit 1` de produção no script -> VI1..VI3 reprovariam
                      o skip; aqui a régua reprova o mutante porque o script mutado
                      devolve 1 nos três cenários.

   Uso: node tools/eval/vercel-ignore-check.mjs [--mutate | --mutante=<nome>]
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'ci', 'vercel-ignore.sh');
const MUTANTES = ['builda-de-novo'];
const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !MUTANTES.includes(mutante)) { console.error(`mutante desconhecido: ${mutante}`); process.exit(2); }

if (process.argv.includes('--mutate')) {
  const mordidos = [];
  for (const m of MUTANTES) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${m}`], { encoding: 'utf8' });
    if (r.status === 1 && /REPROVADO/.test(r.stderr)) mordidos.push(m);
    else console.error(`MUTANTE SOBREVIVEU: ${m} (exit ${r.status})\n${r.stderr.slice(-400)}`);
  }
  if (mordidos.length !== MUTANTES.length) process.exit(1);
  console.log(`MUTANTES MORDIDOS: ${mordidos.join(', ')}`);
  process.exit(0);
}

// VI4: nada no fonte pode ligar um build na Vercel.
let fonte = readFileSync(SCRIPT, 'utf8');
const muta = (de, para) => {
  if (!fonte.includes(de)) { console.error(`MUTANTE NÃO APLICOU: ${mutante} (âncora ausente)`); process.exit(2); }
  fonte = fonte.replace(de, para);
};

const CENARIOS = [
  { nome: 'VI1 preview de PR', env: { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'fix/minha-treta', VERCEL_GIT_COMMIT_MESSAGE: 'fix: treta' } },
  { nome: 'VI2 staging', env: { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'staging', VERCEL_GIT_COMMIT_MESSAGE: 'merge staging' } },
  { nome: 'VI3 produção release', env: { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_COMMIT_MESSAGE: 'chore(release):' } },
];

const roda = (script, env) => {
  const tmp = mkdtempSync(join(tmpdir(), 'vercel-ignore-'));
  mkdirSync(tmp, { recursive: true });
  const alvo = join(tmp, 'vercel-ignore.sh');
  writeFileSync(alvo, script, { mode: 0o755 });
  try {
    const r = spawnSync('bash', [alvo], { encoding: 'utf8', env: { ...process.env, ...env } });
    return r.status;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

let falhas = 0;
for (const c of CENARIOS) {
  const status = roda(fonte, c.env);
  if (status !== 0) { console.error(`${c.nome}: REPROVADO — script saiu ${status} (deveria pular, 0)`); falhas++; }
  else console.log(`  ${c.nome}: pula ✓`);
}

if (mutante === 'builda-de-novo') {
  // O mutante religa só a produção (`exit 1` em VERCEL_ENV=production), como o script
  // fazia até a fase 5. É mordido quando o cenário de produção DEIXA de pular; preview
  // e staging continuam 0 até ali, e isso é esperado do próprio mutante.
  const mutado = fonte.replace('exit 0', 'if [ "${VERCEL_ENV:-}" = "production" ]; then echo builda; exit 1; fi\nexit 0');
  const prod = CENARIOS.find((c) => c.env.VERCEL_ENV === 'production');
  const status = roda(mutado, prod.env);
  if (status === 0) { console.error('builda-de-novo SOBREVIVEU: produção continuou pulando'); process.exit(0); }
  console.error('REPROVADO: o script mutado religou o build de produção (mutante mordido)');
  process.exit(1);
}

if (falhas) { console.error('REPROVADO'); process.exit(1); }
console.log('vercel-ignore: nenhum commit builda na Vercel ✓');
