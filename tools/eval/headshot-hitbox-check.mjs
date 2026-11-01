/* headshot-hitbox-check.mjs — A HITBOX DE CABEÇA É DO TAMANHO DA CABEÇA?
═══════════════════════════════════════════════════════════════════════════════════
Origem: feedback do Gustavo (28/10): "o jogo tá muito fácil. Eu dou headshot o tempo
inteiro sem estar com a mira refinada". Causa medida: a cabeça do tiro em
public/js/hitboxes.js era uma esfera de raio 0,25 m a 1,60 m para todo mundo — de 1,35
a 1,85 m de altura e 0,50 m de largura, contra uma cabeça de ~0,2 × 0,25 m na malha.

O que esta régua faz, toda em node, com o CÓDIGO REAL do tiro:
  • lê as silhuetas de cabeça (sem chapéu) assadas no navegador por
    cabeca-malha-medir.mjs → tools/eval/cabecas-malha.json;
  • pergunta ao jogo qual é a cabeça (`Game.prototype._perfilCabeca`) e ao
    `entradaCombatente` (hitboxes.js) se cada raio é cabeça — nada de fórmula recopiada;
  • J1 FRESCOR: todo personagem com GLB tem medida, a medida é do GLB que está no
    disco (SHA) e a tabela public/js/data/cabecas-hitbox.js é a que sai do JSON;
  • J2 JUSTEZA: por personagem, de frente e de perfil, cada pixel de 1 cm vira um raio
    paralelo ao olhar. cob = fração da cabeça da malha que dá headshot (≥ 0,80);
    vaz = fração do que dá headshot que NÃO é cabeça na malha (≤ 0,25 de frente, por
    personagem, 0,55 para dívida declarada; de perfil ≤ 0,15 na média e ≤ 0,40 no pior,
    capuz e gorro colados no crânio saem da silhueta mas não cabem fora de um elipsoide);
  • J3 SIMULAÇÃO: atirador com erro de mira gaussiano (σ em graus) mirando no centro da
    cabeça e no pescoço de bots parados (de frente) e andando (de perfil, com erro de
    acompanhamento) a 10/20/40 m. Compara a taxa de headshot da hitbox com a taxa de
    raios que de fato cruzam a cabeça da malha. Cláusula: |hitbox − malha| ≤
    max(4 pp, 20% da taxa da malha), na média do elenco.

  • J4 HUMANO: jogador, humano remoto e humano em slot do nó giram a cabeça pelo corpo;
  • J5 PESCOÇO: o torso vai até a base da cabeça (mirar no pescoço acerta ≥ 85% a 10 m);
  • J6 BOT: o bot mira pelo _miraTiroBot real; acerto total médio em 10/20/30 m a ±10 pp
    da esfera antiga com mira no olho, e nenhum personagem abaixo de 50% a 10 m.
  A "malha real" de J2/J3 é a silhueta da pose de idle com a cabeça nivelada, não o
  rifle-hold em movimento.

MUTANTES (cada um tem que ficar VERMELHO):
  --mutante=esfera       `_perfilCabeca` devolve null = exatamente o ?hscaixa=0 (esfera velha).
  --mutante=teto-antigo  torso volta a parar em 1,35 m (pescoço vira buraco)          → J5.
  --mutante=mira-olho    bot volta a mirar no olho a 1,62 m                            → J6.
  --mutante=yaw-humano   humano perde o +180° do corpo                                 → J4.

USO
  node tools/eval/headshot-hitbox-check.mjs               # régua
  node tools/eval/headshot-hitbox-check.mjs --escrever    # regrava data/cabecas-hitbox.js do JSON
  node tools/eval/headshot-hitbox-check.mjs --mutante=esfera   (teto-antigo, mira-olho, yaw-humano)
  node tools/eval/headshot-hitbox-check.mjs --json=saida.json   # números da simulação
═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const MUT = (args.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const ESCREVER = args.includes('--escrever');
const JSON_OUT = (args.find((a) => a.startsWith('--json=')) || '').split('=')[1] || null;
const JSON_PATH = path.join(ROOT, 'tools/eval/cabecas-malha.json');
const DATA_PATH = path.join(ROOT, 'public/js/data/cabecas-hitbox.js');
const MUTANTES = ['esfera', 'teto-antigo', 'mira-olho', 'yaw-humano'];
if (MUT && !MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

/* vazMax vale para CADA personagem de frente (o duelo de CS é de frente). De perfil o
   capuz/gorro colado no crânio (ancap, reggae, blackmetal, et) é cortado da silhueta mas
   não do elipsoide — sobra o vazamento médio do elenco e um teto por personagem. */
export const TETO = { cobMin: 0.80, vazMax: 0.25, vazDeclaradoMax: 0.55, vazLadoMedio: 0.15, vazLadoMax: 0.40, simAbs: 0.04, simRel: 0.20,
  acertoPescocoMin: 0.85, botAcertoMin: 0.50, botAcertoDelta: 0.10 };

const medida = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
/* Silhueta = pele de cabeça rasterizada, PREENCHIDA linha a linha entre o primeiro e o
   último pixel. Malha aberta (capuz do ancap, nuca escondida no cabelo) deixa buraco por
   dentro do crânio; quem olha de fora vê o contorno, e o contorno é o alvo. */
const decod = (m) => {
  const pack = Buffer.from(m.bits, 'base64');
  const cru = (i, j) => ((pack[(j * m.w + i) >> 3] >> ((j * m.w + i) & 7)) & 1) === 1;
  const lin = [];
  for (let j = 0; j < m.h; j++) {
    let a = -1, b = -1;
    for (let i = 0; i < m.w; i++) if (cru(i, j)) { if (a < 0) a = i; b = i; }
    lin.push([a, b]);
  }
  const bit = (i, j) => i >= 0 && j >= 0 && i < m.w && j < m.h && lin[j][0] >= 0 && i >= lin[j][0] && i <= lin[j][1];
  return { ...m, bit, em: (u, y) => bit(Math.floor((u - m.u0) / m.res), Math.floor((y - m.y0) / m.res)) };
};

/* ── AJUSTE: elipsoide que maximiza a IoU com as duas silhuetas ─────────────────────── */
function pixels(m) { const r = []; for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.bit(i, j)) r.push([m.u0 + (i + 0.5) * m.res, m.y0 + (j + 0.5) * m.res]); return r; }
function iou(m, cu, cy, ru, ry) {
  let inter = 0, uni = 0;
  const marg = 0.06;
  const i0 = Math.floor((cu - ru - marg - m.u0) / m.res), i1 = Math.ceil((cu + ru + marg - m.u0) / m.res);
  const j0 = Math.floor((cy - ry - marg - m.y0) / m.res), j1 = Math.ceil((cy + ry + marg - m.y0) / m.res);
  for (let j = Math.min(0, j0); j <= Math.max(m.h, j1); j++) for (let i = Math.min(0, i0); i <= Math.max(m.w, i1); i++) {
    const u = m.u0 + (i + 0.5) * m.res, y = m.y0 + (j + 0.5) * m.res;
    const e = ((u - cu) / ru) ** 2 + ((y - cy) / ry) ** 2 <= 1, k = m.bit(i, j);
    if (e && k) inter++; if (e || k) uni++;
  }
  return uni ? inter / uni : 0;
}
export function ajustar(r) {
  const F = decod(r.frente), S = decod(r.lado);
  const pf = pixels(F), pl = pixels(S);
  const ext = (ps, k) => [Math.min(...ps.map((p) => p[k])), Math.max(...ps.map((p) => p[k]))];
  const [x0, x1] = ext(pf, 0), [z0, z1] = ext(pl, 0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cy = (r.queixo + r.topo) / 2;
  const rx0 = (x1 - x0) / 2, rz0 = (z1 - z0) / 2, ry0 = (r.topo - r.queixo) / 2;
  /* Busca conjunta: altura e frente do centro (±3 cm) e os três semieixos (0,8–1,2× da
     caixa da silhueta). Lateral só entra na frente, profundidade só no perfil, então para
     cada (dy, ky) os dois se resolvem separados. Nota = IoU média das duas silhuetas. */
  const K = []; for (let k = 0.8; k <= 1.2001; k += 0.04) K.push(k);
  const D = [-0.03, -0.015, 0, 0.015, 0.03];
  let best = null;
  for (const dy of D) for (const ky of K) {
    let bx = null; for (const kx of K) { const v = iou(F, cx, cy + dy, rx0 * kx, ry0 * ky); if (!bx || v > bx.v) bx = { v, kx }; }
    let bz = null; for (const dz of D) for (const kz of K) { const v = iou(S, cz + dz, cy + dy, rz0 * kz, ry0 * ky); if (!bz || v > bz.v) bz = { v, kz, dz }; }
    const v = (bx.v + bz.v) / 2;
    if (!best || v > best.v) best = { v, dy, ky, kx: bx.kx, kz: bz.kz, dz: bz.dz, iouF: bx.v, iouS: bz.v };
  }
  const r3 = (x) => +x.toFixed(3);
  return { y: r3(cy + best.dy), f: r3(cz + best.dz), l: r3(cx), rx: r3(rx0 * best.kx), ry: r3(ry0 * best.ky), rz: r3(rz0 * best.kz), iouF: best.iouF, iouS: best.iouS };
}

if (ESCREVER) {
  const ids = Object.keys(medida.personagens).sort();
  const tab = {};
  for (const id of ids) { const a = ajustar(medida.personagens[id]); tab[id] = { y: a.y, f: a.f, l: a.l, rx: a.rx, ry: a.ry, rz: a.rz }; }
  const med = (k) => { const v = ids.map((id) => tab[id][k]).sort((a, b) => a - b); return +v[Math.floor(v.length / 2)].toFixed(3); };
  const padrao = { y: med('y'), f: med('f'), l: 0, rx: med('rx'), ry: med('ry'), rz: med('rz') };
  const linhas = ids.map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(tab[id]).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ')},`);
  const src = `/* GERADO por tools/eval/headshot-hitbox-check.mjs --escrever a partir de
   tools/eval/cabecas-malha.json (cabeca-malha-medir.mjs, malha real no navegador).
   NÃO edite à mão: GLB novo → remeça e regrave; a régua compara este arquivo com o JSON.
   Elipsoide da cabeça SEM chapéu, em metros, relativo aos pés e ao corpo (+Z = frente):
   y altura do centro em pé, f frente, l lado, rx/ry/rz semieixos lateral/vertical/frontal. */
// Mediana do elenco: vale para quem não tem medida (procedural, personagem novo).
export const CABECA_PADRAO = ${JSON.stringify(padrao).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ')};
export const CABECAS_HITBOX = {
${linhas.join('\n')}
};
`;
  fs.writeFileSync(DATA_PATH, src);
  console.log(`gravado ${path.relative(ROOT, DATA_PATH)} (${ids.length} personagens, padrão ${JSON.stringify(padrao)})`);
  process.exit(0);
}

/* ── O JOGO REAL ───────────────────────────────────────────────────────────────────── */
const { Game, THREE, CHARACTERS } = await import('./harness.mjs');
let { entradaCombatente } = await import('../../public/js/hitboxes.js');
const { direcaoDesviada } = await import('../../public/js/ballistics.js');
if (MUT === 'teto-antigo') {   // torso volta a terminar em 1,35 m mesmo com a cabeça justa
  const fonte = fs.readFileSync(path.join(ROOT, 'public/js/hitboxes.js'), 'utf8');
  const troca = ['(cabeca ? cabeca.y - cabeca.ry : ALTURA_CABECA - RAIO_CABECA)', '(ALTURA_CABECA - RAIO_CABECA)'];
  if (!fonte.includes(troca[0])) { console.error('MUTANTE teto-antigo NÃO APLICOU'); process.exit(2); }
  ({ entradaCombatente } = await import(`data:text/javascript;base64,${Buffer.from(fonte.replace(...troca)).toString('base64')}`));
}
const { GLB_CHARS } = await import('../../public/js/glbchars.js').catch(() => ({ GLB_CHARS: null }));
const { CABECAS_HITBOX } = await import(`../../public/js/data/cabecas-hitbox.js?t=${Date.now()}`);
const jogo = Object.create(Game.prototype);
if (MUT === 'esfera') {
  const antes = jogo._perfilCabeca({ def: { id: Object.keys(CABECAS_HITBOX)[0] }, yaw: 0 });
  jogo._perfilCabeca = () => null;
  if (!antes) { console.error('MUTANTE esfera NÃO APLICOU: o jogo já devolvia null'); process.exit(2); }
}
if (MUT === 'mira-olho') jogo._miraTiroBot = function (ent) {   // o bot volta a mirar no olho a 1,62 m
  return new THREE.Vector3(ent.pos.x, ent.pos.y + 1.62, ent.pos.z);
};
if (MUT === 'yaw-humano') jogo._perfilCabeca = function (ent) {   // humano sem o +180° do corpo
  const p = Game.prototype._perfilCabeca.call(this, ent);
  if (p && this._participanteHumano(ent)) p.yaw -= Math.PI;
  return p;
};

let reprovas = 0;
const clausula = (nome, ok, linha) => { if (!ok) reprovas++; console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome}  ${linha}`); };

// ── J1 frescor ──
{
  const comGlb = CHARACTERS.filter((c) => (GLB_CHARS ? GLB_CHARS.has(c.id) : true)
    && fs.existsSync(path.join(ROOT, 'public/models/characters', `${c.id}.glb`))).map((c) => c.id);
  const semMedida = comGlb.filter((id) => !medida.personagens[id]);
  const velhos = Object.entries(medida.personagens).filter(([id, r]) => {
    const f = path.join(ROOT, 'public/models/characters', `${id}.glb`);
    return !fs.existsSync(f) || crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16) !== r.glbSha;
  }).map(([id]) => id);
  const divergem = Object.keys(medida.personagens).filter((id) => {
    const a = ajustar(medida.personagens[id]), t = CABECAS_HITBOX[id];
    return !t || ['y', 'f', 'l', 'rx', 'ry', 'rz'].some((k) => Math.abs(a[k] - t[k]) > 1e-9);
  });
  clausula('J1 frescor', !semMedida.length && !velhos.length && !divergem.length,
    `${Object.keys(medida.personagens).length} medidos / ${comGlb.length} com GLB`
    + (semMedida.length ? `\n      sem medida: ${semMedida.join(', ')} → rode cabeca-malha-medir.mjs` : '')
    + (velhos.length ? `\n      GLB mudou desde a medida: ${velhos.join(', ')} → remeça` : '')
    + (divergem.length ? `\n      tabela ≠ JSON: ${divergem.slice(0, 8).join(', ')} → --escrever` : ''));
}

// ── utilidades de raio ──
const D = 30;                                   // distância do atirador nas varreduras de justeza
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const OLHO = 1.62;
// Combatente-alvo em `pos`, olhando para +Z (frente, yaw 0) ou +X (perfil, yaw 90°).
function alvoDe(id, yaw) { return { def: { id }, yaw, mesh: { group: { rotation: { y: yaw } } } }; }
function eCabeca(from, dir, pos, perfil) {
  const h = entradaCombatente(from, dir, pos, 0, perfil);
  return h ? (h.head ? 'cabeca' : 'corpo') : null;
}

// ── J2 justeza: um raio por pixel, paralelo ao olhar ──
const linhasJ2 = [];
const ids = Object.keys(medida.personagens).sort();
for (const id of ids) {
  const r = medida.personagens[id];
  const res = {};
  for (const [vista, yaw, mask] of [['frente', 0, decod(r.frente)], ['lado', Math.PI / 2, decod(r.lado)]]) {
    const perfil = jogo._perfilCabeca(alvoDe(id, yaw));
    const pos = v3(0, 0, -D);
    let cabMalha = 0, malha = 0, hb = 0;
    const marg = 0.3;
    for (let u = mask.u0 - marg; u < mask.u0 + mask.w * mask.res + marg; u += mask.res) {
      for (let y = mask.y0 - marg; y < mask.y0 + mask.h * mask.res + marg; y += mask.res) {
        const uc = u + mask.res / 2, yc = y + mask.res / 2;
        // vista de frente: u é x de mundo; de perfil (yaw 90°) o +Z local vira +X de mundo.
        const from = v3(uc, yc, 0), dir = v3(0, 0, -1);
        const k = mask.em(uc, yc), h = eCabeca(from, dir, pos, perfil) === 'cabeca';
        if (k) malha++; if (h) hb++; if (k && h) cabMalha++;
      }
    }
    res[vista] = { cob: malha ? cabMalha / malha : 0, vaz: hb ? 1 - cabMalha / hb : 1 };
  }
  linhasJ2.push({ id, ...res });
}
const pioresCob = linhasJ2.filter((l) => l.frente.cob < TETO.cobMin || l.lado.cob < TETO.cobMin);
/* Dívida DECLARADA (avisa, não reprova), com o motivo. Nome novo aqui só com prancha. */
const DECLARADOS = {
  dollynho: 'a cabeça do rig é a tampinha da garrafa: 8 cm, poucos polígonos, silhueta de 1 cm não fecha',
};
const pioresVaz = linhasJ2.filter((l) => l.frente.vaz > (DECLARADOS[l.id] ? TETO.vazDeclaradoMax : TETO.vazMax));
const declVaz = linhasJ2.filter((l) => l.frente.vaz > TETO.vazMax && l.frente.vaz <= TETO.vazDeclaradoMax && DECLARADOS[l.id]);
const ladoAlto = linhasJ2.filter((l) => l.lado.vaz > TETO.vazMax).sort((a, b) => b.lado.vaz - a.lado.vaz);
const media = (f) => linhasJ2.reduce((s, l) => s + f(l), 0) / linhasJ2.length;
clausula('J2a cobertura', !pioresCob.length,
  `cob média frente ${media((l) => l.frente.cob).toFixed(2)} lado ${media((l) => l.lado.cob).toFixed(2)} (piso ${TETO.cobMin})`
  + (pioresCob.length ? `\n      abaixo: ${pioresCob.slice(0, 10).map((l) => `${l.id}=${Math.min(l.frente.cob, l.lado.cob).toFixed(2)}`).join(', ')}` : ''));
clausula('J2b vazamento de frente', !pioresVaz.length,
  `vaz médio ${media((l) => l.frente.vaz).toFixed(2)} (teto por personagem ${TETO.vazMax})`
  + (pioresVaz.length ? `\n      acima (${pioresVaz.length}): ${pioresVaz.slice(0, 10).map((l) => `${l.id}=${l.frente.vaz.toFixed(2)}`).join(', ')}` : '')
  + declVaz.map((l) => `\n      ⚠ declarado ${l.id}=${l.frente.vaz.toFixed(2)} (teto próprio ${TETO.vazDeclaradoMax}): ${DECLARADOS[l.id]}`).join(''));
clausula('J2c vazamento de perfil', media((l) => l.lado.vaz) <= TETO.vazLadoMedio && (!ladoAlto.length || ladoAlto[0].lado.vaz <= TETO.vazLadoMax),
  `vaz médio ${media((l) => l.lado.vaz).toFixed(2)} (teto ${TETO.vazLadoMedio}; nenhum acima de ${TETO.vazLadoMax})`
  + (ladoAlto.length ? `\n      acima de ${TETO.vazMax} (capuz/gorro no crânio, ver prancha): ${ladoAlto.map((l) => `${l.id}=${l.lado.vaz.toFixed(2)}`).join(', ')}` : ''));

// ── J3 simulação ──
let semente = 1234567;
const rnd = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
const SIGMAS = [0.25, 0.5, 1.0, 2.0], DISTS = [10, 20, 40], N = 800, VEL_ANDANDO = 2.5, ATRASO_S = 0.06;
const cenarios = [];
for (const mov of ['parado', 'andando']) for (const mira of ['cabeca', 'pescoco']) for (const d of DISTS) for (const sg of SIGMAS) cenarios.push({ mov, mira, d, sg });
const tabela = [];
for (const c of cenarios) {
  let hbHead = 0, malhaHead = 0, hbAcerto = 0, n = 0;
  for (const id of ids) {
    const r = medida.personagens[id];
    const yaw = c.mov === 'parado' ? 0 : Math.PI / 2;
    const mask = decod(c.mov === 'parado' ? r.frente : r.lado);
    const perfil = jogo._perfilCabeca(alvoDe(id, yaw));
    const pos = v3(0, 0, -c.d);
    // centro da cabeça da malha (centroide da silhueta) e ponto do pescoço (4 cm abaixo do queixo)
    const px = pixels(mask); const cu = px.reduce((s, p) => s + p[0], 0) / px.length;
    const cyC = px.reduce((s, p) => s + p[1], 0) / px.length;
    const alvoY = c.mira === 'cabeca' ? cyC : r.queixo - 0.04;
    const from = v3(0, OLHO, 0);
    const base = v3(cu, alvoY, -c.d).sub(from).normalize();
    const yaw0 = Math.atan2(-base.x, -base.z), pitch0 = Math.asin(base.y);
    const sgR = c.sg * Math.PI / 180;
    const sgTrack = c.mov === 'andando' ? Math.atan(VEL_ANDANDO * ATRASO_S / c.d) : 0;
    for (let k = 0; k < N; k++) {
      const yw = yaw0 + gauss() * Math.hypot(sgR, sgTrack), pt = pitch0 + gauss() * sgR;
      const dir = v3(-Math.sin(yw) * Math.cos(pt), Math.sin(pt), -Math.cos(yw) * Math.cos(pt));
      const h = eCabeca(from, dir, pos, perfil);
      if (h) hbAcerto++; if (h === 'cabeca') hbHead++;
      // verdade: o raio cruza a silhueta da cabeça no plano do alvo?
      const t = (-c.d - from.z) / dir.z;
      if (mask.em(from.x + dir.x * t, from.y + dir.y * t)) malhaHead++;
      n++;
    }
  }
  tabela.push({ ...c, hitbox: hbHead / n, malha: malhaHead / n, acerto: hbAcerto / n });
}
console.log('\n  J3 taxa de headshot por tiro (média do elenco)   hitbox | malha real');
for (const t of tabela) console.log(`   ${t.mov.padEnd(8)} mira ${t.mira.padEnd(8)} ${String(t.d).padStart(2)} m σ ${t.sg.toFixed(2)}°   ${(t.hitbox * 100).toFixed(1).padStart(5)}% | ${(t.malha * 100).toFixed(1).padStart(5)}%`);
const fora = tabela.filter((t) => Math.abs(t.hitbox - t.malha) > Math.max(TETO.simAbs, TETO.simRel * t.malha));
clausula('J3 simulação', !fora.length, `${tabela.length - fora.length}/${tabela.length} cenários dentro de max(${TETO.simAbs * 100} pp, ${TETO.simRel * 100}%) da malha`
  + (fora.length ? `\n      piores: ${fora.sort((a, b) => Math.abs(b.hitbox - b.malha) - Math.abs(a.hitbox - a.malha)).slice(0, 4).map((t) => `${t.mov}/${t.mira}/${t.d}m/σ${t.sg}: ${(t.hitbox * 100).toFixed(0)}% vs ${(t.malha * 100).toFixed(0)}%`).join('; ')}` : ''));

// ── J4 humano: o elipsoide do jogador, do humano remoto e do humano em slot do nó (grupo
// parado no yaw do spawn) fica onde fica o de um bot com o mesmo corpo ──
{
  const centro = (p) => (p ? [Math.cos(p.yaw) * p.l + Math.sin(p.yaw) * p.f, -Math.sin(p.yaw) * p.l + Math.cos(p.yaw) * p.f] : [NaN, NaN]);
  const erros = [];
  for (const id of ids) for (const corpo of [0, Math.PI / 2, 2.2]) {
    const ref = centro(jogo._perfilCabeca(alvoDe(id, corpo)));
    const humanos = { jogador: { isPlayer: true, def: { id }, yaw: corpo - Math.PI },
      remoto: { _remote: 'humano', def: { id }, yaw: corpo - Math.PI },
      slotNo: { _remote: 'humano', def: { id }, yaw: corpo - Math.PI, mesh: { group: { rotation: { y: 0.7 } } } } };
    for (const [nome, ent] of Object.entries(humanos)) {
      const c = centro(jogo._perfilCabeca(ent));
      if (!(Math.hypot(c[0] - ref[0], c[1] - ref[1]) <= 1e-6)) erros.push(`${id}/${nome}`);
    }
  }
  clausula('J4 corpo do humano', !erros.length, `${ids.length * 9 - erros.length}/${ids.length * 9} casos com o centro da cabeça no corpo`
    + (erros.length ? `\n      fora: ${erros.slice(0, 6).join(', ')}` : ''));
}

// ── J5 torso até o queixo: mira no pescoço tem que acertar ALGUÉM (antes era buraco) ──
{
  const t = tabela.find((x) => x.mov === 'parado' && x.mira === 'pescoco' && x.d === 10 && x.sg === 0.5);
  clausula('J5 pescoço não é buraco', t.acerto >= TETO.acertoPescocoMin,
    `acerto total mirando no pescoço, parado, 10 m, σ 0,5°: ${(t.acerto * 100).toFixed(1)}% (piso ${TETO.acertoPescocoMin * 100}%)`);
}

// ── J6 letalidade do bot: o bot mira pelo _miraTiroBot real. A esfera antiga dava acerto de
// graça acima do ombro; o critério é a média em 10/20/30 m perto dela e nenhum personagem
// virando escudo (cabeça baixa com a mira no ar) ──
const botAcerto = [];
{
  const ERR = 0.038, NB = 400;   // piso de erro do bot skill 1 (game.js floorErr), parado
  const gs = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
  for (const dist of [10, 20, 30]) {
    const por = [];
    let base = 0, nb = 0;
    for (const id of ids) {
      const alvo = { isPlayer: true, def: { id }, yaw: -Math.PI, pos: v3(0, 0, -dist), crouchF: 0 };
      const from = v3(0, 1.5, 0), mira = jogo._miraTiroBot(alvo), perfil = jogo._perfilCabeca(alvo);
      const olho = v3(0, 1.62, -dist);
      let a = 0;
      for (let k = 0; k < NB; k++) {
        const ox = gs() * ERR, oy = gs() * ERR * 0.8;
        if (entradaCombatente(from, direcaoDesviada(from, mira, ox, oy), alvo.pos, 0, perfil)) a++;
        if (entradaCombatente(from, direcaoDesviada(from, olho, ox, oy), alvo.pos, 0, null)) base++;
        nb++;
      }
      por.push({ id, a: a / NB });
    }
    por.sort((x, y) => x.a - y.a);
    botAcerto.push({ dist, media: por.reduce((s, x) => s + x.a, 0) / por.length, esfera: base / nb, pior: por[0] });
  }
  const m = (k) => botAcerto.reduce((s, x) => s + x[k], 0) / botAcerto.length;
  const p10 = botAcerto[0].pior;
  clausula('J6 letalidade do bot', Math.abs(m('media') - m('esfera')) <= TETO.botAcertoDelta && p10.a >= TETO.botAcertoMin,
    botAcerto.map((x) => `${x.dist} m ${(x.esfera * 100).toFixed(0)}→${(x.media * 100).toFixed(0)}%`).join(', ')
    + ` (esfera+olho → cabeça justa; média ±${TETO.botAcertoDelta * 100} pp); pior a 10 m ${p10.id} ${(p10.a * 100).toFixed(0)}% (piso ${TETO.botAcertoMin * 100}%)`);
}

if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ mutante: MUT, teto: TETO, justeza: linhasJ2, simulacao: tabela, botAcerto }, null, 1));
if (MUT) {
  console.log(`\n[MUTANTE ${MUT}] ${reprovas ? `a régua MORDEU (${reprovas} cláusula(s) vermelha(s))` : 'a régua ficou VERDE com o defeito — ELA NÃO PRESTA'}`);
  process.exit(reprovas ? 0 : 1);
}
console.log(reprovas ? `\n✗ ${reprovas} cláusula(s) vermelha(s)` : '\n✓ hitbox de cabeça justa à malha');
process.exit(reprovas ? 1 : 0);
