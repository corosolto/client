#!/usr/bin/env node
/* Régua do card da Operação Flávio no lobby (dono, 07/11: "tirar o card resenha, colocar o card do
   Flávio e um modal com a história e uma imagem"). Node puro, roda no check:fast e no ci.yml; a
   geometria real no Chrome é tools/eval/lobby-flavio-browser.mjs.
   O módulo do card (tp/flavio.js) e o diálogo (mode-announcements.js) rodam DE VERDADE num DOM
   linkedom; os mutantes trocam o fonte servido ao import, nunca o arquivo em disco.
     LF1 o canto do lobby é o card da Operação Flávio, não mais o botão Resenha
     LF2 o card abre a história: título, texto, fatos do modo e a arte real (webp revisado)
     LF3 FECHAR/Escape fecham o diálogo e devolvem o foco ao card
     LF4 JOGAR leva ao VS BOTS no mapa operacao_flavio e só então aperta o JOGAR do lobby
     LF5 a história existe em EN (nenhuma frase PT vaza com ?lang=en)
   Mutantes (operacao-flavio-proof-check.mjs lobby): card-resenha, modal-sem-imagem,
   esc-sem-foco, jogar-mapa-errado, en-faltando. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import sharp from 'sharp';

const RAIZ = join(import.meta.dirname, '../..');
const JS = join(RAIZ, 'public/js');
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
const MUTANTES = {
  'card-resenha': ['tp/flavio.js', "titulo.append(no('span', 'tp-ital', tr('OPERAÇÃO FLÁVIO')));", "titulo.append(no('span', 'tp-ital', tr('Resenha')));"],
  'modal-sem-imagem': ['mode-announcements.js', "bg.src = imagem;", "bg.src = '';"],
  'esc-sem-foco': ['mode-announcements.js', 'else if (c.foco?.isConnected) c.foco.focus({ preventScroll: true });', ''],
  'jogar-mapa-errado': ['tp/flavio.js', 'modos.irMapa(MAPA_FLAVIO);', "modos.irMapa('piscina_treta');"],
  'en-faltando': ['i18n.js', "'Escolha o Zero Um e seja você o VIP': 'Pick Zero Um and be the VIP yourself',", ''],
};
if (mutante && !MUTANTES[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);

/* Fonte do módulo com o mutante aplicado e imports relativos apontando para outros fontes servidos aqui. */
const fonte = (rel) => {
  let src = readFileSync(join(JS, rel), 'utf8');
  const m = MUTANTES[mutante];
  if (m && m[0] === rel) {
    assert.equal(src.split(m[1]).length - 1, 1, `alvo único do mutante ${mutante}`);
    src = src.replace(m[1], m[2]);
    console.log(`Mutação aplicada: ${mutante}`);
  }
  return src;
};
let selo = 0;
async function importa(rel, trocas = {}) {
  let src = fonte(rel);
  const base = pathToFileURL(join(JS, rel)).href;
  src = src.replace(/(from\s+|import\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_, pre, q, esp) => {
    const alvo = new URL(esp, base).href;
    return `${pre}${q}${trocas[alvo] || alvo}${q}`;
  });
  return import(`data:text/javascript;base64,${Buffer.from(`${src}\n//${selo++}`).toString('base64')}`);
}
const urlDe = (rel) => pathToFileURL(join(JS, rel)).href;

/* DOM do lobby: só o que o card e o JOGAR tocam (#main-menu, #hub-sp, #btn-jogar). */
function dom(lang) {
  const { window, document } = parseHTML('<!doctype html><html data-ui="v3"><head></head><body><div id="main-menu"><button id="hub-sp"></button><button id="btn-jogar"></button></div></body></html>');
  const proto = window.HTMLElement.prototype;
  /* linkedom não implementa <dialog>: o modal nativo vira atributo open + evento close */
  proto.showModal ??= function () { this.setAttribute('open', ''); };
  proto.close ??= function () { if (!this.hasAttribute('open')) return; this.removeAttribute('open'); this.dispatchEvent(new window.Event('close')); };
  Object.assign(globalThis, { window, document, location: new URL(`https://corosolto.com.br/?lang=${lang}`), localStorage: { getItem: () => null, setItem() {} } });
  return { window, document };
}
async function carregar(lang) {
  const { window, document } = dom(lang);
  /* i18n servido do fonte (com o mutante en-faltando, se for o caso) e lido com o idioma da URL */
  const i18n = `data:text/javascript;base64,${Buffer.from(`${fonte('i18n.js')}\n//${selo++}`).toString('base64')}`;
  const flavio = await importa('tp/flavio.js', { [urlDe('i18n.js')]: i18n });
  const anuncio = await importa('mode-announcements.js');
  return { window, document, flavio, anuncio };
}

const falhas = [];
const clausula = (id, fn) => { try { fn(); console.log(`✓ ${id}`); } catch (e) { falhas.push(`${id}: ${e.message.split('\n')[0]}`); } };

const pt = await carregar('pt');
const { document } = pt;
const menu = document.getElementById('main-menu');
let pedidos = 0;
const card = pt.flavio.montarCardFlavio(menu, (origem) => { pedidos++; assert.equal(origem, card); });
const social = readFileSync(join(JS, 'tp/social.js'), 'utf8') + readFileSync(join(RAIZ, 'public/css/tp/social.css'), 'utf8');
const lobbyCss = readFileSync(join(RAIZ, 'public/css/tp/lobby.css'), 'utf8');

clausula('LF1 o canto do lobby é o card da Operação Flávio, não o botão Resenha', () => {
  assert.ok(!/tp-resenha-botao/.test(social), 'LF1: o botão Resenha voltou ao lobby (tp/social.js ou social.css)');
  assert.equal(card.id, 'tp-lobby-flavio', 'LF1: card sem o id do canto');
  assert.equal(card.parentNode, menu, 'LF1: card fora do #main-menu');
  const rotulo = card.textContent.replace(/\s+/g, ' ');
  assert.ok(/OPERAÇÃO FLÁVIO/.test(rotulo) && !/resenha/i.test(rotulo), `LF1: o card diz "${rotulo}"`);
  /* mesmo canto e altura do botão Resenha: 32/16 px e 60 px; deitado 16 px, 12+154 px e 44 px */
  assert.ok(/\.tp-lobby-flavio\{--tp-flavio-chao:16px;position:fixed;left:32px;bottom:var\(--tp-flavio-chao\)/.test(lobbyCss) && /\n  height:60px;/.test(lobbyCss.split('.tp-lobby-flavio{')[1] || ''), 'LF1: card fora do canto do antigo botão Resenha');
  assert.ok(/\.tp-lobby-flavio\{--tp-flavio-chao:12px;left:16px;bottom:calc\(var\(--tp-flavio-chao\) \+ 154px\);height:44px;/.test(lobbyCss), 'LF1: card deitado fora do canto do antigo botão Resenha');
  card.click();
  assert.equal(pedidos, 1, 'LF1: clique no card não pede a história');
});

/* Arte: arquivo real em public/, URL com o hash de conteúdo do assetver.js. */
const arte = async (url, w, h) => {
  const [caminho, q] = url.split('?v=');
  const disco = join(RAIZ, 'public', caminho);
  if (!existsSync(disco)) return `arquivo ausente: ${caminho}`;
  const m = await sharp(disco).metadata();
  if (m.format !== 'webp' || m.width !== w || m.height !== h) return `${caminho} é ${m.format} ${m.width}×${m.height} (quer webp ${w}×${h})`;
  const { revDeBytes } = await import(pathToFileURL(join(RAIZ, 'tools/gen-asset-rev.mjs')).href);
  if (q !== revDeBytes(readFileSync(disco))) return `${url} sem o hash do conteúdo`;
  return '';
};
const h = pt.flavio.historiaFlavio();
const problemaArte = await arte(h.imagem, 1920, 1080), problemaMini = await arte(card.querySelector('img').getAttribute('src'), 192, 168);
let foco = 0, jogou = [];
document.getElementById('hub-sp').addEventListener('click', () => jogou.push('hub-sp'));
document.getElementById('btn-jogar').addEventListener('click', () => jogou.push('btn-jogar'));
pt.window.__tpModos = { irMapa: (id) => jogou.push(`irMapa:${id}`) };
const origem = { isConnected: true, focus: () => { foco++; } };
const abriu = pt.anuncio.abrirHistoria({ ...h, aoJogar: pt.flavio.jogarOperacaoFlavio, foco: origem });
const dlg = document.querySelector('dialog.cs-modes-dialog');

clausula('LF2 o card abre a história com texto e a arte real do embarque', () => {
  assert.ok(abriu && dlg?.hasAttribute('open'), 'LF2: diálogo da história não abriu');
  assert.equal(dlg.dataset.historia, 'operacao_flavio', 'LF2: diálogo sem data-historia do modo');
  assert.equal(dlg.querySelector('#cs-modes-titulo')?.textContent, 'OPERAÇÃO FLÁVIO', 'LF2: título');
  const texto = [...dlg.querySelectorAll('.cs-modes-texto')].map((p) => p.textContent).join(' ');
  assert.ok(dlg.querySelectorAll('.cs-modes-texto').length >= 2 && texto.length >= 250, `LF2: história curta (${texto.length} caracteres)`);
  const tudo = dlg.textContent;
  for (const fato of ['Zero Um', '6×6', 'Três rotas', 'FLÁVIO FUGIU PROS EUA', 'ficção']) assert.ok(tudo.includes(fato), `LF2: história sem "${fato}"`);
  const bg = dlg.querySelector('img.cs-modes-bg');
  assert.ok(bg?.getAttribute('src') && bg.getAttribute('src') === h.imagem, `LF2: diálogo sem a imagem da história (src "${bg?.getAttribute('src') || ''}")`);
  assert.ok(bg.getAttribute('alt'), 'LF2: imagem da história sem texto alternativo');
  assert.equal(problemaArte, '', `LF2: arte da história: ${problemaArte}`);
  assert.equal(problemaMini, '', `LF2: miniatura do card: ${problemaMini}`);
});

clausula('LF3 FECHAR e Escape fecham e devolvem o foco ao card', () => {
  const fechar = [...dlg.querySelectorAll('button')].find((b) => b.textContent === 'FECHAR');
  assert.equal(fechar?.getAttribute('aria-keyshortcuts'), 'Escape', 'LF3: FECHAR sem atalho Escape');
  fechar.click();
  assert.ok(!dlg.isConnected && foco === 1 && !jogou.length, `LF3: depois de FECHAR: no DOM ${dlg.isConnected}, foco devolvido ${foco}, jogou ${jogou.join()}`);
  /* Escape no <dialog> nativo vira close; o mesmo caminho tem que devolver o foco */
  pt.anuncio.abrirHistoria({ ...h, foco: origem });
  document.querySelector('dialog.cs-modes-dialog').close();
  assert.ok(!document.querySelector('dialog.cs-modes-dialog') && foco === 2, `LF3: Escape não devolveu o foco ao card (${foco})`);
});

clausula('LF4 JOGAR leva ao VS BOTS no operacao_flavio e começa a partida', () => {
  pt.anuncio.abrirHistoria({ ...h, aoJogar: pt.flavio.jogarOperacaoFlavio, foco: origem });
  const d = document.querySelector('dialog.cs-modes-dialog');
  d.querySelector('[data-jogar]').click();
  assert.equal(jogou.join(' > '), 'hub-sp > irMapa:operacao_flavio > btn-jogar', `LF4: JOGAR fez ${jogou.join(' > ') || 'nada'}`);
  assert.ok(!d.isConnected && foco === 2, 'LF4: JOGAR não fechou o diálogo ou devolveu foco por cima da partida');
});

const en = await carregar('en');
clausula('LF5 a história existe em EN', () => {
  const he = en.flavio.historiaFlavio(), hp = pt.flavio.historiaFlavio();
  const vaza = [];
  for (const k of ['kicker', 'titulo', 'fecho', 'nota', 'alt']) if (he[k] === hp[k]) vaza.push(he[k]);
  for (const k of ['paragrafos', 'fatos']) he[k].forEach((s, i) => { if (s === hp[k][i]) vaza.push(s); });
  assert.deepEqual(vaza, [], `LF5: frase PT em EN: ${vaza.join(' | ')}`);
});

if (falhas.length) { for (const f of falhas) console.error(`FALHA ${f}`); process.exit(1); }
console.log('lobby-flavio: 5/5');
