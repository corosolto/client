#!/usr/bin/env node
/* ============================================================================
   edge-cache-check.mjs — O EDGE NÃO PODE SEGURAR /js/ POR UM MÊS (BUG-39)
   ----------------------------------------------------------------------------
   MEDIDO EM 08/08 (incidente) e 25/08 (reincidência #443): a regra `assets_jogo`
   de scripts/cloudflare-setup.sh segurava /js/* no edge por 2.592.000 s com
   `override_origin`. O manifesto por conteúdo (BUG-48) protege quem chega com o
   HTML NOVO — mas o HTML velho em cache de navegador pede a URL `?v=` antiga, o
   edge reabastece essa URL com o conteúdo NOVO da origem e serve o mix por até
   um mês: `main.js` de um deploy com `fparms.js` de outro. Foi exatamente essa
   janela que derrubou o site (BUG-39) e reincidiu no Safari (#443, BUG-75).

   O QUE ESTA RÉGUA EXIGE:
   EC1 · toda cache rule que cobre /js/ tem edge_ttl ≤ ALVO_TTL_JS. Com o TTL
         curto o mix se autocura em minutos — mais rápido que o prod-watch
         (cron de 15 min) que hoje só REMEDEIA depois do jogador quebrar.
   EC2 · anti-vacuidade: /js/ continua declarado em alguma cache rule com
         `cache: true` — apagar a regra deixaria o TTL ao gosto do default da
         zona, que é justamente o estado sem dono que comprou o BUG-39.
   EC3 · o deploy manual (deploy-prod.yml) purga o prefixo /js/ do edge depois
         de publicar, pulando sem erro quando CF_API_TOKEN não existe — o mesmo
         contrato do purge do crash-fix.yml. (O deploy normal via integração Git
         da Vercel não tem hook de workflow; para ele o remédio é o EC1.)

   Uso: node tools/eval/edge-cache-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = {
  'ttl-mes': 'EC1',
  'js-na-midia': 'EC1',
  'sem-regra-js': 'EC2',
  'sem-purge-deploy': 'EC3',
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

/* 600 s: curto o bastante para o mix de deploys se autocurar antes da próxima
   volta do prod-watch (15 min), longo o bastante para o edge continuar absorvendo
   o pico de um lançamento — as URLs de /js/ são versionadas por conteúdo (BUG-48),
   então cada deploy novo já chega em URL nunca vista e não depende deste TTL. */
const ALVO_TTL_JS = 600;

let setup = readFileSync('scripts/cloudflare-setup.sh', 'utf8');
let deployProd = readFileSync('.github/workflows/deploy-prod.yml', 'utf8');

const mutate = (texto, antes, depois, nome) => {
  const mudado = texto.replace(antes, depois);
  if (mudado === texto) { console.error(`MUTANTE NAO APLICOU: ${nome}`); process.exit(2); }
  return mudado;
};
if (MUT === 'ttl-mes') setup = mutate(setup,
  /"edge_ttl": \{ "mode": "override_origin", "default": \d+ \},(\s*\n\s*"browser_ttl"[^\n]*\n\s*\}\s*\n\s*\}\s*\n\s*\]\s*\n\}\s*\nJSON)/,
  '"edge_ttl": { "mode": "override_origin", "default": 2592000 },$1', 'ttl-mes');
if (MUT === 'js-na-midia') setup = mutate(setup,
  'starts_with(http.request.uri.path, \\"/audio/\\")',
  'starts_with(http.request.uri.path, \\"/js/\\") or starts_with(http.request.uri.path, \\"/audio/\\")', 'js-na-midia');
if (MUT === 'sem-regra-js') setup = mutate(setup,
  /,?\s*\{\s*\n\s*"ref": "assets_js"[\s\S]*?\n    \}/,
  '', 'sem-regra-js');
if (MUT === 'sem-purge-deploy') deployProd = mutate(deployProd,
  /\n      - name: purge do edge[\s\S]*$/,
  '\n', 'sem-purge-deploy');

const falhas = [];

/* O JSON das cache rules mora num heredoc — é a fonte da configuração da zona. */
const heredoc = setup.match(/<<'JSON'(?: \|\| true)?\n([\s\S]*?)\nJSON\n/);
if (!heredoc) {
  falhas.push('EC0 heredoc JSON das cache rules não encontrado em scripts/cloudflare-setup.sh');
} else {
  let regras = [];
  try { regras = JSON.parse(heredoc[1]).rules || []; }
  catch (e) { falhas.push(`EC0 JSON das cache rules inválido: ${e.message}`); }

  const cobreJs = (r) => String(r.expression || '').includes('"/js/"');
  const regrasJs = regras.filter((r) => cobreJs(r) && r.action === 'set_cache_settings');

  for (const r of regrasJs) {
    const p = r.action_parameters || {};
    const ttl = p.edge_ttl?.default;
    if (p.cache && p.edge_ttl?.mode === 'override_origin' && !(ttl <= ALVO_TTL_JS)) {
      falhas.push(`EC1 regra "${r.ref}" cobre /js/ com edge_ttl=${ttl}s > ${ALVO_TTL_JS}s — a janela do BUG-39 de volta`);
    }
  }
  const comCache = regrasJs.filter((r) => r.action_parameters?.cache);
  if (!comCache.length) {
    falhas.push('EC2 nenhuma cache rule declara /js/ com cache:true — TTL de /js/ ficou sem dono (vacuidade)');
  }
}

/* EC3 · purge no deploy manual, com o guard de secret que o wfsecret exige. */
const temPurge = /purge_cache/.test(deployProd)
  && /www\.csbrasil\.online\/js\//.test(deployProd)
  && /CF_API_TOKEN/.test(deployProd);
if (!temPurge) {
  falhas.push('EC3 deploy-prod.yml publica produção sem purgar o prefixo /js/ do edge (guardado por CF_API_TOKEN)');
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) {
  console.log(`  \x1b[32m✓\x1b[0m EC1 nenhuma cache rule segura /js/ no edge acima de ${ALVO_TTL_JS}s`);
  console.log('  \x1b[32m✓\x1b[0m EC2 /js/ continua declarado numa cache rule com cache:true');
  console.log('  \x1b[32m✓\x1b[0m EC3 deploy manual purga /js/ do edge (pulado sem CF_API_TOKEN, nunca vermelho por secret)');
}
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');
}
if (MUT && falhas.length && !falhas.some((f) => f.startsWith(MUTANTES[MUT]))) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' acendeu cláusula errada (esperava ${MUTANTES[MUT]})`);
  falhas.push('mutacao-clausula-errada');
}
process.exit(falhas.length ? 1 : 0);
