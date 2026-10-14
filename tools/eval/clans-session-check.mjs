/* ============================================================================
   clans-session-check.mjs — CLÃS USAM A MESMA SESSÃO DO SOCIAL
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O backend dos clãs (backend#72) passou a resolver a conta Auth pelo cookie
   cs_social e a exigir Origin do site no POST, como /api/social. Se /api/clans
   for direto ao run.app, o navegador não manda o cookie nem a origem certa e a
   conta Auth recebe 401/403. Se a página exigir uid+token locais, quem só tem
   conta nunca chega a pedir 'me'.

   O QUE COBRA
     CS1 em produção, apiUrl('/api/clans') fica same-origin (proxy do site)
     CS2 o proxy repassa cookie e origin para clans (session: true)
     CS3 404 do backend sem a rota vira 503 (rollout), como o social
     CS4 a página de clãs pede 'me' mesmo sem uid+token locais

   Mutantes: --mutante=clans-direto | proxy-sem-sessao | sem-rollout | exige-convidado
   Uso: node tools/eval/clans-session-check.mjs [--mutante=...]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['clans-direto', 'proxy-sem-sessao', 'sem-rollout', 'exige-convidado'];
if (mut && !MUTANTES.includes(mut)) throw new Error(`mutante desconhecido: ${mut}`);
const muta = (fonte, de, para) => {
  const novo = fonte.replace(de, para);
  if (novo === fonte) throw new Error(`MUTANTE NAO APLICOU: ${mut}`);
  return novo;
};

let jogo = readFileSync('public/js/apibase.js', 'utf8');
let rota = readFileSync('src/pages/api/[rota].ts', 'utf8');
let pagina = readFileSync('public/js/clans.js', 'utf8');
if (mut === 'clans-direto') jogo = muta(jogo, "'mp-ticket','clans'].includes(nome)", "'mp-ticket'].includes(nome)");
if (mut === 'proxy-sem-sessao') rota = muta(rota, "'mp-ticket','clans'].includes(rota)", "'mp-ticket'].includes(rota)");
if (mut === 'sem-rollout') rota = muta(rota, "const EM_ROLLOUT = ['social-auth','treta','clans'];", "const EM_ROLLOUT = ['social-auth','treta'];");
if (mut === 'exige-convidado') pagina = muta(pagina, "  try { mine = await api({ ...(guest || {}), action: 'me' }); }", "  if (guest) try { mine = await api({ ...guest, action: 'me' }); } catch {}\n  try {}");

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };

const antes = globalThis.location;
globalThis.location = { search: '', hostname: 'www.corosolto.com.br' };
try {
  const api = await import(`data:text/javascript;base64,${Buffer.from(jogo).toString('base64')}#${Date.now()}`);
  const url = api.apiUrl('/api/clans');
  cobra(url === '/api/clans', `CS1 /api/clans em produção vai para ${url}; sem o proxy same-origin o cookie cs_social não chega`);
  cobra(api.apiUrl('/api/clans?id=x') === '/api/clans?id=x', 'CS1 leitura com query também precisa ficar same-origin');
} finally {
  if (antes === undefined) delete globalThis.location; else globalThis.location = antes;
}

const sessao = /session: \[([^\]]+)\]\.includes\(rota\)/.exec(rota)?.[1] || '';
cobra(/'clans'/.test(sessao), 'CS2 o proxy não repassa cookie/origin para clans; conta Auth vira 401 e POST vira 403');
const rollout = /const EM_ROLLOUT = \[([^\]]+)\]/.exec(rota)?.[1] || '';
cobra(/'clans'/.test(rollout), 'CS3 backend sem /api/clans devolveria 404 cru durante o rollout pareado');

const refresh = pagina.slice(pagina.indexOf('async function refreshMine()'), pagina.indexOf('async function load()'));
cobra(/\n  try \{ mine = await api\(\{ \.\.\.\(guest \|\| \{\}\), action: 'me' \}\); \}/.test(refresh),
  "CS4 refreshMine precisa pedir 'me' mesmo sem uid+token locais (conta Auth só tem cookie)");

if (falhas.length) {
  console.log('✗ CS clãs fora da sessão do social:');
  for (const f of falhas) console.log('    ' + f);
  process.exit(1);
}
console.log(`✓ CS clãs same-origin, proxy com sessão, 503 no rollout e 'me' sem convidado${mut ? ` (mutante ${mut} NÃO detectado)` : ''}`);
