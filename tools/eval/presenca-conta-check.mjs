#!/usr/bin/env node
/* Presença da CONTA ao jogar + modo de arma na partida (dono, 11/11/2026: amigo logado joga
   VS BOTS o dia inteiro e o perfil diz "jogou há 3 dias").

   A posse navegador→conta (migration 081) e o `last_active_at` só nasciam na chamada
   `presence` do painel de comunidade (community.js). Quem loga e vai direto jogar nunca
   abria o painel: zero elo, zero atividade. Agora o jogo pulsa `/api/social {action:'presence',
   uid: cs_anon}` no login, no início da partida e a cada 30 s em jogo — exatamente o payload
   que posse-solo-check (backend, PS1–PS6) já governa.

   PC1 pingPresencaConta manda action 'presence' + uid = getAnonId() (e só isso)
   PC2 sem conta logada (contaNick vazio) ou em testMode: NÃO manda nada
   PC3 _startGame dispara a presença (início da partida)
   PC4 sessão (onSession com profile) e cs-account-change disparam a presença
   PC5 intervalo de 30 s em jogo
   PC6 sendMatchEvent leva weaponMode = settings.wpnMode (perfil separa só-pistolas/AWP/facas)

   Mutantes: --mutante=sem-ping-partida | --mutante=ping-sem-conta | --mutante=sem-modo-arma */
import { readFileSync } from 'node:fs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
if (mutante && !['sem-ping-partida', 'ping-sem-conta', 'sem-modo-arma'].includes(mutante)) { console.error(`mutante desconhecido: ${mutante}`); process.exit(2); }
const muta = (src, ancora, troca) => {
  if (src.split(ancora).length !== 2) { console.error(`mutante ${mutante} NÃO APLICOU: âncora ${ancora}`); process.exit(2); }
  return src.replace(ancora, troca);
};
let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
if (mutante === 'sem-ping-partida') main = muta(main, "  pingPresencaConta();   // posse navegador→conta + last_active desde o 1º segundo de jogo\n", '');
if (mutante === 'ping-sem-conta') main = muta(main, '  if (!contaNick || testMode) return;\n  void api(', '  if (testMode) return;\n  void api(');
if (mutante === 'sem-modo-arma') main = muta(main, "weaponMode: settings.wpnMode || 'all',", '');

const falhas = [];
const cobra = (id, ok, msg) => { if (!ok) falhas.push(`${id} ${msg}`); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };

const fn = main.match(/function pingPresencaConta\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
cobra('PC1', /api\('\/api\/social', \{ action: 'presence', uid: getAnonId\(\) \}\)/.test(fn), "pingPresencaConta manda {action:'presence', uid:getAnonId()} e só isso");
cobra('PC2', /if \(!contaNick \|\| testMode\) return;/.test(fn), 'sem conta logada ou em testMode não manda');
const startGame = main.match(/async function _startGame\([^)]*\) \{([\s\S]{0,600})/)?.[1] || '';
cobra('PC3', /pingPresencaConta\(\);/.test(startGame), '_startGame dispara a presença da conta');
const onSession = main.match(/onSession:auth=>(\{[\s\S]*?\}),onReady:/)?.[1] || '';
cobra('PC4', /if\(auth\?\.profile\)\{[^}]*pingPresencaConta\(\);/.test(onSession) && /cs-account-change[^\n]*pingPresencaConta\(\);/.test(main), 'sessão pronta e troca de conta disparam a presença');
cobra('PC5', /setInterval\(\(\) => \{ if \(game\) pingPresencaConta\(\); \}, 30_000\);/.test(main), 'pulso de 30 s em jogo');
cobra('PC6', /sendMatchEvent[\s\S]{0,900}weaponMode: settings\.wpnMode \|\| 'all'/.test(main), 'sendMatchEvent leva weaponMode');

if (falhas.length) { console.error(`PRESENCA-CONTA VERMELHA (${falhas.length})`); process.exit(1); }
console.log('PRESENCA-CONTA verde — jogar com conta logada alimenta posse solo e last_active; modo de arma viaja.');
