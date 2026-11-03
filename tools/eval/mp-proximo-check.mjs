/* MP-PROXIMO-CHECK — próximo mapa no placar (backend `proximo`/`pronto`).

   O nó novo anuncia o próximo mapa no início do placar e segura o round 1 até o cliente
   avisar que montou o mapa (teto de 10 s lá). Esta régua cobra o lado do cliente:
     · o NetClient se declara capaz (`pronto=1`), entrega o `proximo` sem mexer na meta da
       partida corrente, descarta anúncio malformado e esquece o anúncio no `partida`;
     · `avisarPronto` manda a partida da meta e não manda nada para nó antigo (sem número);
     · o plano de preload sai dos ids anunciados, filtrado pelo que este cliente conhece;
     · a contagem do placar vem do prazo anunciado;
     · o main.js liga `onProximo` ao preload e avisa `pronto` DEPOIS de montar, mesmo se a
       montagem falhar (senão o nó espera o teto inteiro).
   Uso: node tools/eval/mp-proximo-check.mjs [--mutante=sem-capacidade|proximo-vira-meta|sem-finally|meta-fora-do-try|onproximo-sem-catch|rotulo-velho] */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAPS } from './harness.mjs';
import { planoPreload, segundosAteVirada, textoProximo } from '../../public/js/mp-proximo.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
/* Mutantes de PRODUTO no net.js rodam numa cópia ao lado do original. */
const MUTANTES_NET = {
  'sem-capacidade': [", pronto: '1' });", ' });'],
  'proximo-vira-meta': ['this.proximo = { ...m, recebidoEm: Date.now() };', 'this.meta = m; this.proximo = { ...m, recebidoEm: Date.now() };'],
};
const netReal = new URL('../../public/js/net.js', import.meta.url);
let netUrl = netReal, netMutado = null;
if (MUTANTES_NET[MUT]) {
  const fonte = readFileSync(netReal, 'utf8');
  const mutado = fonte.replace(...MUTANTES_NET[MUT]);
  if (mutado === fonte) { console.error('mutante: trecho não encontrado'); process.exit(2); }
  netMutado = new URL(`../../public/js/.net-mutante-${process.pid}.js`, import.meta.url);
  writeFileSync(netMutado, mutado);
  netUrl = netMutado;
}
const { NetClient } = await import(netUrl.href).finally(() => { if (netMutado) rmSync(fileURLToPath(netMutado), { force: true }); });
const falhas = [];
const cobra = (ok, msg) => { console.log(`${ok ? '  ok  ' : '  FALHA'} ${msg}`); if (!ok) falhas.push(msg); };

// Transporte de mentira: o NetClient fala com ele, e a régua injeta as mensagens do nó.
function conectar(net) {
  const enviados = [];
  let entrega = null;
  const tp = {
    pronto: true,
    abrir(cb) { entrega = cb; cb.aberto(); },
    enviar: (p) => { enviados.push(JSON.parse(p)); return true; },
    enviarInseguro(p) { return this.enviar(p); },
    fechar() {},
  };
  const conexao = net._conectar(1000, () => tp);
  const recebe = (m) => { const s = JSON.stringify(m); entrega.mensagem(s, false, s.length); };
  return { enviados, recebe, conexao };
}

console.log('· NetClient');
{
  const net = new NetClient('wss://xx.example/ws', { room: 'funk-x-palhaco' });
  cobra(new URL(net.url).searchParams.get('pronto') === '1', 'o cliente se declara capaz de avisar `pronto` (query pronto=1)');

  const { enviados, recebe, conexao } = conectar(net);
  recebe({ type: 'welcome', protocolVersion: 8, map: 'lajes', partida: 4, roster: [], yourEnt: 7, yourTeam: 'E', espectador: false });
  await conexao;
  const anuncios = [];
  net.onProximo = (m) => anuncios.push(m);
  recebe({ type: 'proximo', map: 'velho_oeste', mapNome: 'Velho Oeste', mapSeed: 9, chars: ['a'], weapons: ['ak'], trocaEmMs: 8000, partida: 5 });
  cobra(anuncios.length === 1 && net.proximo?.map === 'velho_oeste' && Number.isFinite(net.proximo.recebidoEm),
    'o `proximo` chega ao onProximo com a hora de chegada');
  cobra(net.meta.map === 'lajes' && net.meta.partida === 4 && net.yourEnt === 7, 'o anúncio não mexe na meta nem no slot da partida que está no placar');
  recebe({ type: 'proximo', map: 42 });
  cobra(anuncios.length === 1, 'anúncio sem mapa válido é descartado');
  recebe({ type: 'partida', protocolVersion: 8, map: 'velho_oeste', partida: 5, roster: [], yourEnt: 11, yourTeam: 'E', espectador: false });
  cobra(net.proximo === null && net.meta.partida === 5, 'o `partida` esquece o anúncio e traz a meta nova');
  enviados.length = 0;
  cobra(net.avisarPronto(5) === true && enviados.length === 1 && enviados[0].type === 'pronto' && enviados[0].partida === 5,
    `avisarPronto manda a partida da meta (${JSON.stringify(enviados[0])})`);
  enviados.length = 0;
  cobra(net.avisarPronto(undefined) === false && enviados.length === 0, 'nó antigo (sem `partida` na meta): nada a avisar');
}

console.log('· preload e contagem');
{
  const glb = new Set(['mandrake', 'palhaco-mau']);
  const plano = planoPreload({ map: 'velho_oeste', mapSeed: 77, chars: ['mandrake', 'inventado', 'mandrake'], weapons: ['ak', 'canhao'] },
    { maps: MAPS, glbChars: glb, weaponIds: ['ak', 'awp'] });
  cobra(plano?.mapId === 'velho_oeste' && plano.seed === 77, 'o plano usa o mapa e a seed anunciados');
  cobra(JSON.stringify(plano?.chars) === '["mandrake"]' && JSON.stringify(plano?.weapons) === '["ak"]',
    `elenco e armas filtrados pelo que o cliente conhece (${JSON.stringify(plano?.chars)} ${JSON.stringify(plano?.weapons)})`);
  cobra(plano?.props === (MAPS.velho_oeste.props || []) || JSON.stringify(plano?.props) === JSON.stringify(MAPS.velho_oeste.props || []),
    'os props do mapa entram no plano');
  cobra(planoPreload({ map: 'mapa_do_futuro' }, { maps: MAPS, glbChars: glb, weaponIds: [] }) === null, 'mapa que o cliente não conhece: sem preload');
  const anuncio = { trocaEmMs: 8000, recebidoEm: 1_000 };
  cobra(segundosAteVirada(anuncio, 1_000) === 8 && segundosAteVirada(anuncio, 8_200) === 1 && segundosAteVirada(anuncio, 20_000) === 0,
    'a contagem do placar sai do prazo anunciado e para no zero');
  cobra(textoProximo('Lajes', 7) === 'PRÓXIMO MAPA: Lajes · 7s' && textoProximo('Lajes', 0) === 'PRÓXIMO MAPA: Lajes · CARREGANDO…'
      && textoProximo('Lajes', 3, 'en') === 'NEXT MAP: Lajes · 3s', 'o aviso diz o mapa e a contagem, e vira CARREGANDO no zero');
}

console.log('· main.js');
{
  let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
  const MUT_MAIN = {
    'sem-finally': [/    \} finally \{ if \(mpSessao\?\.net === net\) net\.avisarPronto\(m\.partida\); \}\n/, '      net.avisarPronto(m.partida);\n    } finally {}\n'],
    'meta-fora-do-try': [/    try \{\n      mpPararContagemProximo\(\);\n      mpSessao\.chat\?\.aoMudarMeta\(net\.meta\);\n/, '    mpPararContagemProximo();\n    mpSessao.chat?.aoMudarMeta(net.meta);\n    try {\n'],
    'onproximo-sem-catch': [/try \{ mpPreCarregarProximo\(m\); \} catch \(e\) \{[^\n]*\}/, 'mpPreCarregarProximo(m);'],
    'rotulo-velho': ["  if (rotulo) rotulo.textContent = tr('PRÓXIMO MAPA CARREGANDO…');\n", ''],
  };
  if (MUT_MAIN[MUT]) {
    const antes = main;
    main = main.replace(...MUT_MAIN[MUT]);
    if (main === antes) { console.error('mutante: trecho não encontrado'); process.exit(2); }
  }
  const corpo = (main.match(/net\.onPartida = async \(m\) => \{([\s\S]*?)\n  \};/) || [])[1] || '';
  const dentroDoTry = (corpo.match(/try \{([\s\S]*?)\} finally \{/) || [])[1] || '';
  cobra(/\} finally \{ if \(mpSessao\?\.net === net\) net\.avisarPronto\(m\.partida\); \}\s*$/.test(corpo)
      && /await mpMontarPartida\(net, m\);/.test(dentroDoTry)
      && /aoMudarMeta\(net\.meta\)/.test(dentroDoTry) && /noServeMapaParado\(/.test(dentroDoTry),
    'onPartida avisa `pronto` num finally que cobre o corpo inteiro (meta, mapa parado e montagem)');
  const onProx = (main.match(/net\.onProximo = \(m\) => \{([\s\S]*?)\n  \};/) || [])[1] || '';
  cobra(/try \{ mpPreCarregarProximo\(m\); \} catch \(e\) \{/.test(onProx),
    'onProximo engole o próprio erro (no WebTransport ele derrubaria o laço de leitura)');
  const parar = (main.match(/function mpPararContagemProximo\(\) \{([\s\S]*?)\n\}/) || [])[1] || '';
  cobra(/rotulo\.textContent = tr\('PRÓXIMO MAPA CARREGANDO…'\)/.test(parar),
    'o aviso volta ao texto padrão na virada: partida sem `proximo` não herda o mapa anterior');
  cobra(/if \(mpSessao\?\.net !== net\) return;/.test(onProx) && /mpPreCarregarProximo\(m\)/.test(onProx),
    'onProximo dispara o preload da sessão corrente');
  const pre = (main.match(/function mpPreCarregarProximo\(m\) \{([\s\S]*?)\n\}/) || [])[1] || '';
  cobra(/planoPreload\(m,/.test(pre) && /preloadCharacterAssets\(/.test(pre) && /preloadMapProps\(/.test(pre) && /\$\('match-next'\)/.test(pre),
    'o preload do placar usa o plano, os carregadores da partida e escreve no aviso da tela de fim');
}

if (MUT) {
  if (falhas.length) { console.log(`\n✓ mutante ${MUT}: ${falhas.length} cláusula(s) vermelha(s); a régua morde`); process.exit(0); }
  console.error(`\n✗ mutante ${MUT} passou; a régua não morde`); process.exit(1);
}
console.log(falhas.length ? `\nVERMELHA (${falhas.length})` : '\nVERDE — próximo mapa no placar: anúncio, pronto e preload');
process.exit(falhas.length ? 1 : 0);
