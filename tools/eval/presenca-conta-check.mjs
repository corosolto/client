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

   Mutantes: --mutante=sem-ping-partida | ping-sem-conta | sem-modo-arma | ping-duplicado | ping-antes-guarda */
import { readFileSync } from 'node:fs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
if (mutante && !['sem-ping-partida', 'ping-sem-conta', 'sem-modo-arma', 'ping-duplicado', 'ping-antes-guarda'].includes(mutante)) { console.error(`mutante desconhecido: ${mutante}`); process.exit(2); }
const muta = (src, ancora, troca) => {
  if (src.split(ancora).length !== 2) { console.error(`mutante ${mutante} NÃO APLICOU: âncora ${ancora}`); process.exit(2); }
  return src.replace(ancora, troca);
};
const extraiBloco = (src, ancora) => {
  const inicio = src.indexOf(ancora);
  const abre = inicio < 0 ? -1 : src.indexOf('{', inicio + ancora.length);
  if (abre < 0) return '';
  let profundidade = 0;
  let aspas = '';
  let escape = false;
  for (let i = abre; i < src.length; i++) {
    const c = src[i];
    if (aspas) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === aspas) aspas = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { aspas = c; continue; }
    if (c === '{') profundidade++;
    else if (c === '}' && --profundidade === 0) return src.slice(abre + 1, i);
  }
  return '';
};
const chamadaPresenca = "  void api('/api/social', { action: 'presence', uid: getAnonId() });";
let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
if (mutante === 'sem-ping-partida') main = muta(main, "  pingPresencaConta();   // posse navegador→conta + last_active desde o 1º segundo de jogo\n", '');
if (mutante === 'ping-sem-conta') main = muta(main, '  if (!contaNick || testMode) return;\n  void api(', '  if (testMode) return;\n  void api(');
if (mutante === 'sem-modo-arma') main = muta(main, "weaponMode: settings.wpnMode || 'all',", '');
if (mutante === 'ping-duplicado') main = muta(main, chamadaPresenca, `${chamadaPresenca}\n${chamadaPresenca}`);
if (mutante === 'ping-antes-guarda') main = muta(main, `  if (!contaNick || testMode) return;\n${chamadaPresenca}`, `${chamadaPresenca}\n  if (!contaNick || testMode) return;`);

const falhas = [];
const cobra = (id, ok, msg) => { if (!ok) falhas.push(`${id} ${msg}`); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };

const fn = extraiBloco(main, 'function pingPresencaConta()');
const pingPresencaConta = new Function('api', 'contaNick', 'testMode', 'getAnonId', fn);
const executaPing = (contaNick = 'conta-logada', testMode = false) => {
  const chamadas = [];
  pingPresencaConta((...args) => chamadas.push(args), contaNick, testMode, () => 'anon-teste');
  return chamadas;
};
const chamadasLogin = executaPing();
cobra('PC1', chamadasLogin.length === 1 && JSON.stringify(chamadasLogin[0]) === JSON.stringify(['/api/social', { action: 'presence', uid: 'anon-teste' }]), "pingPresencaConta manda {action:'presence', uid:getAnonId()} e só isso");
cobra('PC2', executaPing('').length === 0 && executaPing('conta-logada', true).length === 0, 'sem conta logada ou em testMode não manda');
const startGame = main.match(/async function _startGame\([^)]*\) \{([\s\S]{0,600})/)?.[1] || '';
cobra('PC3', /pingPresencaConta\(\);/.test(startGame), '_startGame dispara a presença da conta');
const onSession = main.match(/onSession:auth=>\{([\s\S]*?)\},onReady:/)?.[1] || '';
const perfilLogado = extraiBloco(onSession, 'if(auth?.profile)');
cobra('PC4', perfilLogado.includes('pingPresencaConta();') && /cs-account-change[^\n]*pingPresencaConta\(\);/.test(main), 'sessão pronta e troca de conta disparam a presença');
cobra('PC5', /setInterval\(\(\) => \{ if \(game\) pingPresencaConta\(\); \}, 30_000\);/.test(main), 'pulso de 30 s em jogo');
cobra('PC6', /sendMatchEvent[\s\S]{0,900}weaponMode: settings\.wpnMode \|\| 'all'/.test(main), 'sendMatchEvent leva weaponMode');

if (falhas.length) { console.error(`PRESENCA-CONTA VERMELHA (${falhas.length})`); process.exit(1); }
console.log('PRESENCA-CONTA verde — jogar com conta logada alimenta posse solo e last_active; modo de arma viaja.');
