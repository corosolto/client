#!/usr/bin/env node
/* ============================================================================
   emotes-check.mjs — A DANÇA EXISTE NO CORPO, EM QUALQUER CORPO, DE GRAÇA?
   ----------------------------------------------------------------------------
   Levantamento de 22/10: o rig é o mesmo nos 63 personagens do disco (18 ossos,
   mesmos nomes), MAS a pose de descanso diverge até 80° entre eles. Isso derruba
   a solução óbvia — um clipe de dança assado — porque clipe guarda rotação LOCAL
   e o mesmo clipe entorta braços para lados diferentes em corpos diferentes.

   A solução entregue é overlay em ESPAÇO DE MUNDO (public/js/emotes.js), o mesmo
   mecanismo das camadas de recarga/inclinação. Esta régua existe para que ninguém
   "simplifique" isso de volta para rotação local, nem transforme o catálogo de
   danças em custo de boot.

   O QUE ESTA RÉGUA COBRA:
     EM1  catálogo honesto: todo emote declarado tem coreografia, nome e ORIGEM;
     EM2  cada emote move o corpo de verdade e com a assinatura que promete
          (passinho é de PÉ; o gesto é de BRAÇO; o frevo AGACHA);
     EM3  independência de corpo: a mesma coreografia, normalizada pela altura,
          sai na mesma faixa em corpos diferentes — inclusive nos que dependem do
          pack de animação compartilhado;
     EM4  sai limpo: ao parar, as juntas e a ALTURA voltam ao lugar;
     EM5  custo zero de boot: emotes.js não entra no grafo estático do jogo —
          chega por import() dinâmico quando o jogador pede;
     EM6  dano e morte cancelam a dança (ninguém dança levando tiro).

   MUTANTES (reescrevem o arquivo servido; o disco não é tocado):
     --mutante=emote-mudo     zera a amplitude da coreografia     -> EM2+EM3
     --mutante=eixo-local     ignora o quadro do pai (volta ao
                              espaço local, o erro que a régua existe
                              para impedir)                        -> EM3
     --mutante=emote-grudento parar a dança não para nada          -> EM4
     --mutante=boot-ansioso   importa emotes.js estaticamente      -> EM5
     --mutante=dança-blindada dano não cancela a dança             -> EM6

   Uso: BASE=http://127.0.0.1:9321 node tools/eval/emotes-check.mjs
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE_EXTERNA = process.env.BASE;
const PORTA = process.env.PORTA || '9342';
const BASE = BASE_EXTERNA || `http://127.0.0.1:${PORTA}`;
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ESPERADO = {
  'emote-mudo': ['EM2', 'EM3'], 'eixo-local': ['EM3'], 'emote-grudento': ['EM4'],
  'boot-ansioso': ['EM5'], 'dança-blindada': ['EM6'],
};
if (MUT && !ESPERADO[MUT]) throw new Error(`mutante desconhecido: ${MUT}`);

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

const servidor = BASE_EXTERNA ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 60 && !pronto; i++) {
    try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((r) => setTimeout(r, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);
}

const STUB = 'export default {};export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},off(){},send(){},invalidate(){},data:{}});'
  + 'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }),
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function abrir() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.route(/\.astro\/eval-vite|dev-toolbar|@vite\/client/, (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  const reescreve = (teste, troca) => page.route(teste, async (r) => {
    const res = await r.fetch();
    const antes = await res.text();
    const depois = troca(antes);
    if (depois === antes) throw new Error(`mutante ${MUT} não aplicou em ${r.request().url()}`);
    await r.fulfill({ response: res, body: depois });
  });
  if (MUT === 'emote-mudo') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace('const ang = passo[2] * this._emoteK;', 'const ang = 0 * passo[2] * this._emoteK;'));
  if (MUT === 'eixo-local') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace(
    '        bone.parent.getWorldQuaternion(_pq).invert();\n        _axisF.set(ax, ay, az).applyQuaternion(_pq).normalize();',
    '        _axisF.set(ax, ay, az).normalize();'));
  if (MUT === 'emote-grudento') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace('pararEmote() { this._emoteId = null; }', 'pararEmote() { /* grudou */ }'));
  if (MUT === 'boot-ansioso') await reescreve(/\/js\/main\.js/, (t) => `import * as _emotesAnsioso from './emotes.js';\nwindow.__emotesAnsioso = _emotesAnsioso;\n${t}`);
  if (MUT === 'dança-blindada') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace("    this._emoteId = null;   // levar tiro derruba o emote na hora", '    void 0;'));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);
  return { page, fechar: () => ctx.close() };
}

const { page, fechar } = await abrir();

/* ---- EM1/EM2/EM4/EM6: catálogo e corpo, num personagem real ---- */
const corpo = await page.evaluate(async () => {
  const T = await import('/vendor/three.module.js');
  const gc = await import('/js/glbchars.js');
  const ch = await import('/js/characters.js');
  const em = await import('/js/emotes.js');
  gc.setEmoteDriver({ pose: em.poseEmote, duracao: em.emoteDuracao, laco: em.emoteLaco });
  const def = ch.CHARACTERS.find((c) => gc.GLB_CHARS.has(c.id));
  await gc.preloadCharacterAssets([def.id]);
  const m = gc.buildCharacterModel(def, { weapon: false });
  const ctrl = m.ctrl;
  const osso = (n) => { let b = null; m.group.traverse((o) => { if (!b && o.isBone && o.name === n) b = o; }); return b; };
  const alvos = { maoD: osso('RightHand'), maoE: osso('LeftHand'), peD: osso('RightFoot'), peE: osso('LeftFoot'), cabeca: osso('Head') };
  const pos = (b) => { m.group.updateMatrixWorld(true); return b.getWorldPosition(new T.Vector3()); };
  const roda = (n) => { for (let i = 0; i < n; i++) ctrl.update(1 / 60, 0, false, 0); };
  roda(50);
  const alturaBase = ctrl.model.position.y;
  const base = {}; for (const k in alvos) base[k] = pos(alvos[k]);

  const medidas = {};
  let voltaPior = 0, alturaPior = 0;
  for (const e of em.EMOTES) {
    ctrl.emote(e.id);
    const pico = { maoD: 0, maoE: 0, peD: 0, peE: 0, cabeca: 0 };
    let agachou = 0;
    for (let i = 0; i < Math.ceil(e.dur * 60) + 24; i++) {
      ctrl.update(1 / 60, 0, false, 0);
      for (const k in alvos) pico[k] = Math.max(pico[k], base[k].distanceTo(pos(alvos[k])) * 100);
      agachou = Math.max(agachou, (alturaBase - ctrl.model.position.y) * 100);
    }
    ctrl.pararEmote();
    roda(50);
    for (const k in alvos) voltaPior = Math.max(voltaPior, base[k].distanceTo(pos(alvos[k])) * 100);
    alturaPior = Math.max(alturaPior, Math.abs(alturaBase - ctrl.model.position.y) * 100);
    medidas[e.id] = {
      mao: Math.max(pico.maoD, pico.maoE), pe: Math.max(pico.peD, pico.peE),
      cabeca: pico.cabeca, agachou,
    };
  }

  // EM6: dano e morte derrubam a dança
  ctrl.emote('passinho'); roda(10);
  const dancava = ctrl.emoteAtual() === 'passinho';
  ctrl.flinch({ x: 1, z: 0 }, 1); roda(4);
  const aposDano = ctrl.emoteAtual();
  ctrl.emote('passinho'); roda(10);
  ctrl.die({ x: 1, z: 0 }); roda(4);
  const aposMorte = ctrl.emoteAtual();

  const catalogo = em.EMOTES.map((e) => ({
    id: e.id, nome: e.nome, origem: e.origem, dur: e.dur,
    temPasso: (() => { const l = []; em.poseEmote(e.id, e.dur * 0.3, l); return l.length; })(),
  }));
  return { catalogo, medidas, voltaPior, alturaPior, dancava, aposDano, aposMorte };
});

/* ---- EM3: a mesma coreografia em corpos diferentes ---- */
const corpos = await page.evaluate(async () => {
  const T = await import('/vendor/three.module.js');
  const gc = await import('/js/glbchars.js');
  const ch = await import('/js/characters.js');
  const em = await import('/js/emotes.js');
  gc.setEmoteDriver({ pose: em.poseEmote, duracao: em.emoteDuracao, laco: em.emoteLaco });
  // de propósito: saci e lobisomem NÃO têm clipes próprios (usam o pack compartilhado)
  const ids = ['saci', 'lobisomem', 'adjim', 'mistico'].filter((id) => gc.GLB_CHARS.has(id));
  await gc.preloadCharacterAssets(ids);
  const linhas = [];
  for (const id of ids) {
    const def = ch.CHARACTERS.find((c) => c.id === id);
    const m = gc.buildCharacterModel(def, { weapon: false });
    const ctrl = m.ctrl;
    const osso = (n) => { let b = null; m.group.traverse((o) => { if (!b && o.isBone && o.name === n) b = o; }); return b; };
    const maoD = osso('RightHand'), peD = osso('RightFoot'), cab = osso('Head');
    const pos = (b) => { m.group.updateMatrixWorld(true); return b.getWorldPosition(new T.Vector3()); };
    for (let i = 0; i < 50; i++) ctrl.update(1 / 60, 0, false, 0);
    const b0 = { mao: pos(maoD), pe: pos(peD) };
    const altura = pos(cab).y || 1;
    const linha = { id };
    for (const e of ['passinho', 'frevo']) {
      ctrl.emote(e);
      let mao = 0, pe = 0, dirPico = [0, 0, 0];
      for (let i = 0; i < Math.ceil(em.emoteDuracao(e) * 60) + 24; i++) {
        ctrl.update(1 / 60, 0, false, 0);
        const d = pos(maoD).sub(b0.mao);
        if (d.length() > mao) {
          mao = d.length();
          // direção no quadro do CORPO: é isto que um eixo errado estraga, mesmo
          // mantendo a amplitude parecida
          const q = m.group.getWorldQuaternion(new T.Quaternion()).invert();
          const dl = d.clone().applyQuaternion(q).normalize();
          dirPico = [dl.x, dl.y, dl.z];
        }
        pe = Math.max(pe, b0.pe.distanceTo(pos(peD)));
      }
      ctrl.pararEmote();
      for (let i = 0; i < 50; i++) ctrl.update(1 / 60, 0, false, 0);
      linha[e] = { mao: (mao / altura) * 100, pe: (pe / altura) * 100, dir: dirPico };
    }
    linhas.push(linha);
  }
  return linhas;
});

/* ---- EM5: emotes.js fora do grafo estático do boot ---- */
const boot = await page.evaluate(async () => {
  const visto = new Set();
  const fila = ['/js/main.js'];
  let achou = null;
  while (fila.length && visto.size < 80) {
    const url = fila.shift();
    if (visto.has(url)) continue;
    visto.add(url);
    let txt = '';
    try { txt = await (await fetch(url)).text(); } catch { continue; }
    // apenas imports ESTÁTICOS: import() dinâmico é justamente o caminho aprovado
    const re = /^\s*import\s[^;]*?from\s*['"]([^'"]+)['"]/gm;
    let mm;
    while ((mm = re.exec(txt))) {
      const alvo = mm[1];
      if (/emotes\.js/.test(alvo)) achou = url;
      if (alvo.startsWith('./') || alvo.startsWith('../')) {
        const resolvido = new URL(alvo, new URL(url, location.href)).pathname;
        if (/\/js\//.test(resolvido)) fila.push(resolvido);
      }
    }
  }
  return { modulosVarridos: visto.size, importadorEstatico: achou, janelaAnsiosa: !!window.__emotesAnsioso };
});

/* ---- EM6 (parte 2): o lobby liga a dança de verdade ---- */
const lobby = await page.evaluate(async () => {
  const botao = document.getElementById('pv-emote-abrir');
  if (!botao) return { botao: false };
  botao.click();
  await new Promise((r) => setTimeout(r, 1200));
  const itens = [...document.querySelectorAll('.pv-emote-btn[data-emote]')].map((b) => b.dataset.emote);
  return { botao: true, itens };
});

await fechar();
await browser.close();

/* ---------------------------- VEREDITO ---------------------------- */
const r = [];
const cobra = (id, ok, texto) => r.push({ id, ok, texto });

const semPasso = corpo.catalogo.filter((c) => !c.temPasso);
const semOrigem = corpo.catalogo.filter((c) => !c.origem || c.origem.length < 12);
cobra('EM1', corpo.catalogo.length >= 8 && !semPasso.length && !semOrigem.length,
  `EM1 · ${corpo.catalogo.length} emotes declarados, todos com coreografia e origem citada`
  + (semPasso.length ? ` — SEM PASSO: ${semPasso.map((c) => c.id).join(',')}` : '')
  + (semOrigem.length ? ` — SEM ORIGEM: ${semOrigem.map((c) => c.id).join(',')}` : ''));

// assinatura por emote: o que cada dança promete ao olho
const M = corpo.medidas;
const falhas2 = [];
const exige = (id, cond, texto) => { if (!cond) falhas2.push(`${id}: ${texto}`); };
for (const [id, m] of Object.entries(M)) exige(id, Math.max(m.mao, m.pe, m.cabeca) >= 10, `mexeu só ${Math.max(m.mao, m.pe, m.cabeca).toFixed(1)} cm`);
exige('passinho', M.passinho && M.passinho.pe >= 25 && M.passinho.pe > M.passinho.mao, 'passinho tem que ser de PÉ (pé > mão, ≥25 cm)');
exige('frevo', M.frevo && M.frevo.agachou >= 6 && M.frevo.mao >= 30, 'frevo tem que AGACHAR (≥6 cm) e levantar o braço (≥30 cm)');
exige('salve', M.salve && M.salve.mao >= 25 && M.salve.pe <= 4, 'gesto é de BRAÇO: mão ≥25 cm e pés parados (≤4 cm)');
exige('ginga', M.ginga && M.ginga.pe >= 25, 'ginga troca a base (pé ≥25 cm)');
cobra('EM2', !falhas2.length,
  `EM2 · as 8 danças movem o corpo com a assinatura que prometem `
  + `(passinho pé ${M.passinho?.pe.toFixed(0)} cm · frevo agacha ${M.frevo?.agachou.toFixed(0)} cm · salve mão ${M.salve?.mao.toFixed(0)} cm com pé ${M.salve?.pe.toFixed(1)} cm)`
  + (falhas2.length ? ` — ${falhas2.join(' | ')}` : ''));

const faixa = (chave, junta) => {
  const vs = corpos.map((l) => l[chave][junta]).filter((v) => v > 0);
  const med = vs.slice().sort((a, b) => a - b)[Math.floor(vs.length / 2)];
  const pior = Math.max(...vs.map((v) => Math.abs(v - med) / med));
  return { med, pior, vs };
};
const fp = faixa('passinho', 'pe'), ff = faixa('frevo', 'mao');
// direção da mão no pico do frevo: tem que apontar PRA CIMA em todo corpo, e os corpos
// têm que concordar entre si (cosseno). Eixo em espaço local faz cada rig ir pra um lado.
const dirs = corpos.map((l) => l.frevo.dir);
const cos = (a2, b2) => a2[0] * b2[0] + a2[1] * b2[1] + a2[2] * b2[2];
const piorCos = Math.min(...dirs.map((d) => Math.min(...dirs.map((e2) => cos(d, e2)))));
const todosPraCima = dirs.every((d) => d[1] > 0.5);
cobra('EM3', corpos.length >= 3 && fp.pior <= 0.45 && ff.pior <= 0.55 && todosPraCima && piorCos >= 0.8,
  `EM3 · mesma coreografia em ${corpos.length} corpos (2 deles sem clipes próprios): passinho pé `
  + `${fp.vs.map((v) => v.toFixed(0)).join('/')}% da altura (desvio ${(fp.pior * 100).toFixed(0)}%), `
  + `frevo mão ${ff.vs.map((v) => v.toFixed(0)).join('/')}% (desvio ${(ff.pior * 100).toFixed(0)}%) `
  + `e subindo em todos (cos mínimo ${piorCos.toFixed(2)}, componente vertical ${dirs.map((d) => d[1].toFixed(2)).join('/')})`);

cobra('EM4', corpo.voltaPior <= 2 && corpo.alturaPior <= 1,
  `EM4 · parou a dança e o corpo voltou: junta mais fora ${corpo.voltaPior.toFixed(2)} cm, altura ${corpo.alturaPior.toFixed(2)} cm`);

cobra('EM5', !boot.importadorEstatico && !boot.janelaAnsiosa,
  `EM5 · emotes.js fora do grafo estático do boot (${boot.modulosVarridos} módulos varridos; chega por import dinâmico)`
  + (boot.importadorEstatico ? ` — IMPORTADO ESTATICAMENTE por ${boot.importadorEstatico}` : ''));

cobra('EM6', corpo.dancava && corpo.aposDano === null && corpo.aposMorte === null && lobby.botao && (lobby.itens || []).length >= 8,
  `EM6 · o lobby liga a dança (${(lobby.itens || []).length} passos no botão DANÇAR) e levar tiro/morrer derruba na hora`
  + (corpo.aposDano !== null ? ` — DANO NÃO CANCELOU (${corpo.aposDano})` : '')
  + (corpo.aposMorte !== null ? ` — MORTE NÃO CANCELOU (${corpo.aposMorte})` : ''));

const falhou = r.filter((x) => !x.ok);
for (const x of r) console.log(`  ${x.ok ? 'ok  ' : 'FALHA'} ${x.texto}`);

if (MUT) {
  const esperado = ESPERADO[MUT];
  const acendeu = falhou.map((x) => x.id);
  const certo = esperado.every((e) => acendeu.includes(e)) && acendeu.every((a) => esperado.includes(a));
  console.log(certo
    ? `\n== ${MUT}: mutante reprovado como devia (${acendeu.join('+')})`
    : `\n== ${MUT}: MUTAÇÃO PASSOU — esperado ${esperado.join('+')}, acendeu ${acendeu.join('+') || 'nada'}`);
  process.exit(certo ? 0 : 1);
}

console.log(`\n${falhou.length ? 'REPROVADO' : 'APROVADO'} — emotes: ${r.length - falhou.length}/${r.length}`);
process.exit(falhou.length ? 1 : 0);
