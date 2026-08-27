/* escala-favela-check.mjs — ESCALA HUMANA DOS BARRACOS DO FY_CORREGO (BUG-55).
   ═══════════════════════════════════════════════════════════════════════════════════
   DEFEITO DE ORIGEM (dono, 17/08): córrego — "melhor em questao de mapa, mas mesmo erro
   de escala, e sem muito detalhes". O portão estava verde porque nenhuma régua media a
   razão entre a abertura da casa e o corpo humano: os vãos nasciam todos com 1,0 m de
   altura a 1,15 m do chão (nenhuma porta tocava o piso — fachada lê como casa de boneca),
   e barracos de 1 pavimento chegavam a 3,75 m de pé-direito.

   REFERÊNCIA (números da frente BUG-55, registrados no KNOWN-BUGS):
     · porta de casa: 2,00–2,20 m de altura, base no piso. Porta residencial BR = 2,10 m
       (prática corrente; janela alta demais não dá leitura de porta).
     · pé-direito de barraco de 1 pavimento: 2,4–2,8 m (faixa declarada na frente; o PISO
       de 2,8 m laje-a-laje das casas de 2-4 lajes é o teto dessa faixa e fica VERDE).
     · olho do jogador: 1,62 m em pé (game.js `eye = 1.62 - 0.52*crouchF`, conferido no
       harness — o brief da frente dizia "1,70 m de olho"; o número do MOTOR é 1,62).
   `references/favela/lajes-rio/FONTE.md` cobre LARGURA de beco (0,8–1,5 m) e é a régua
   da outra frente; a referência de ALTURA mora aqui e no KNOWN-BUGS (BUG-55).

   ONDE MEDE: no mundo construído (`bootGame`), não na declaração —
     ESC1 PORTA: a malha mesclada do material de vão (cor 2b2a27, lote 'favela') é
        decomposta em aberturas por cluster de triângulos; porta do térreo = base ≤ 0,15 m.
     ESC2 PASSO DE ANDAR: as bases das aberturas acima do térreo formam a escada de
        pavimentos; o passo mediano tem que caber em 2,4–2,8 m.
     ESC3 BARRACO DE FRENTE DE MURO (fileira C): altura dos colliders reais em |x|≈23.
     ESC4 PALAFITA: corpo acima dos pilotis (collider com base ≈ 2,2 m), 2,4–2,8 m.
     ESC5 PROPS GLB: altura-alvo efetiva de cada prop colocado (registro `propEscala`
        do próprio mapa — valores de USO, não cópia) contra a faixa real da classe.
   Sem alvo mensurável (mesh de vão ausente, registro ausente) a régua fica VERMELHA —
   "não sei medir" custa o mesmo que estar errado.

   REPRODUZ:  node tools/eval/escala-favela-check.mjs
   MUTAÇÕES (cada cláusula morde a sua):
     --mutante=porta-ana      (malha de vão com altura ×0,5)      → ESC1
     --mutante=piso-gigante   (malha de vão com altura ×1,2)      → ESC2
     --mutante=puxadinho-alto (colliders da fileira C +1,2 m)     → ESC3
     --mutante=palafita-alta  (colliders de palafita +0,8 m)      → ESC4
     --mutante=escala2x       (altura-alvo de todo prop ×2)       → ESC5 */
import { THREE, initTextures, bootGame } from './harness.mjs';

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;

const PORTA_MIN = 2.00, PORTA_MAX = 2.20;      // altura de porta de casa (BUG-55)
const PE_MIN = 2.40, PE_MAX = 2.80;            // pé-direito de barraco 1 pavimento (BUG-55)
const COR_VAO = 0x2b2a27;                      // matVao — único material de vão do mapa

/* Faixa de altura real por classe de prop (ficha/fabricante, valor de porta de loja):
   botijão GLP P13 0,72 m · caixa d'água PE 1000-2500 L 1,20-1,55 m · container 1,35 m ·
   CG160 1,05 m · Uno 1,43 m · Fusca 1,42 m · Kombi 1,94-2,05 m · barraca de feira 2,2-2,4 m ·
   pneu de carro Ø0,65 m (pilha de 1-2). Faixas generosas de propósito: a cláusula caça
   deriva de escala de mapa inteiro (mutante escala2x), não decimal de catálogo. */
const FAIXA_PROP = {
  botijao_gas: [0.70, 0.80], caixa_dagua: [1.10, 1.60], dumpster: [1.20, 1.50],
  moto_cg: [0.95, 1.15], stall: [2.10, 2.50], pilha_pneus: [0.55, 1.25], tires: [0.55, 1.25],
  uno_mille: [1.35, 1.50], fiat_uno: [1.35, 1.50], fusca: [1.35, 1.50], kombi: [1.85, 2.10],
};

const game = bootGame('corrego', { textures: initTextures(), ctf: true, seed: 13007 });
const world = game.world;

/* ---- malha mesclada dos vãos ---- */
const malhasVao = [];
world.root.traverse((o) => {
  if (o.isMesh && o.name === 'favela' && o.material && !Array.isArray(o.material)
    && o.material.color && o.material.color.getHex() === COR_VAO) malhasVao.push(o);
});

/* ---- mutações pós-boot (mordem o mundo medido, não o fonte) ---- */
if (mutante === 'porta-ana') for (const m of malhasVao) m.scale.y = 0.5;
if (mutante === 'piso-gigante') for (const m of malhasVao) m.scale.y = 1.2;
const ehPuxadinho = (c) => Math.abs((c.minX + c.maxX) / 2) >= 22.2 && Math.abs((c.minX + c.maxX) / 2) <= 23.9
  && c.minY < 0.1 && c.maxY >= 1.8 && c.maxY <= 5.0 && (c.maxZ - c.minZ) >= 2.0 && (c.maxX - c.minX) <= 1.7;
const ehPalafita = (c) => c.minY >= 2.0 && c.minY <= 2.45
  && (c.maxX - c.minX) >= 3.5 && (c.maxX - c.minX) <= 6.0 && (c.maxZ - c.minZ) >= 3.5 && (c.maxZ - c.minZ) <= 6.0;
if (mutante === 'puxadinho-alto') for (const c of world.colliders) if (ehPuxadinho(c)) c.maxY += 1.2;
if (mutante === 'palafita-alta') for (const c of world.colliders) if (ehPalafita(c)) c.maxY += 0.8;
const propEscala = world.propEscala || [];
if (mutante === 'escala2x') {
  if (propEscala.length < 8) { console.error('MUTANTE escala2x NÃO APLICOU: registro propEscala ausente/curto.'); process.exit(1); }
  for (const p of propEscala) p.h *= 2;
}
world.root.updateMatrixWorld(true);

/* ---- aberturas: componentes por ARESTA COMPARTILHADA da malha de vão ----
   Cluster por distância de centroide parte uma porta de 2,10 m (medido: 0,55 m) porque
   a face é um quad de 2 triângulos sem triângulos intermediários para fazer ponte.
   Adjacência por aresta é exata: caixa = 1 componente; caixas distintas nunca
   compartilham aresta, mesmo mescladas no StaticBatch. */
function aberturas(mesh) {
  const geo = mesh.geometry, pos = geo.attributes.position, idx = geo.index;
  const n = idx ? idx.count : pos.count;
  const keyOf = new Array(pos.count);
  const map = new Map();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = `${Math.round(v.x * 1000)}_${Math.round(v.y * 1000)}_${Math.round(v.z * 1000)}`;
    keyOf[i] = k;
  }
  const edgeTri = new Map();   // chave de aresta -> [tri]
  const triVerts = [];
  for (let t = 0; t < n; t += 3) {
    const ids = [0, 1, 2].map((k) => idx ? idx.getX(t + k) : t + k);
    triVerts.push(ids);
    for (let a = 0; a < 3; a++) {
      const ek = [keyOf[ids[a]], keyOf[ids[(a + 1) % 3]]].sort().join('|');
      (edgeTri.get(ek) || edgeTri.set(ek, []).get(ek)).push(triVerts.length - 1);
    }
  }
  // união-busca sobre triângulos que compartilham aresta
  const pai = triVerts.map((_, i) => i);
  const find = (x) => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  for (const tris of edgeTri.values()) for (let i = 1; i < tris.length; i++) { const a = find(tris[0]), b = find(tris[i]); if (a !== b) pai[a] = b; }
  const grupos = new Map();
  for (let t = 0; t < triVerts.length; t++) {
    const r = find(t);
    (grupos.get(r) || grupos.set(r, []).get(r)).push(t);
  }
  const out = [];
  for (const tris of grupos.values()) {
    if (tris.length < 4) continue;   // caixa fechada tem 12 tris; menos que 4 é ruído
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const t of tris) for (const id of triVerts[t]) {
      v.fromBufferAttribute(pos, id);
      for (let k = 0; k < 3; k++) { if (v.getComponent(k) < lo[k]) lo[k] = v.getComponent(k); if (v.getComponent(k) > hi[k]) hi[k] = v.getComponent(k); }
    }
    // bbox no MUNDO (a malha mesclada já está em espaço de mundo; escala de mutante aplicada no y)
    const wlo = [lo[0], lo[1] * mesh.scale.y, lo[2]], whi = [hi[0], hi[1] * mesh.scale.y, hi[2]];
    out.push({ base: wlo[1], topo: whi[1], larg: Math.max(whi[0] - wlo[0], whi[2] - wlo[2]) });
  }
  return out;
}

const abs = malhasVao.flatMap(aberturas);
const cm = (x) => Math.round(x * 100) / 100;

/* ---- ESC1 · porta de altura humana no térreo ---- */
const portas = abs.filter((a) => a.base <= 0.15);
const portasOk = portas.filter((a) => cm(a.topo - a.base) >= PORTA_MIN && cm(a.topo - a.base) <= PORTA_MAX && a.larg <= 1.4);
const menorBaseSemPorta = abs.length ? Math.min(...abs.map((a) => a.base)) : Infinity;

/* ---- ESC2 · passo de andar ---- */
const bases = [...new Set(abs.filter((a) => a.base > 0.3).map((a) => Math.round(a.base * 20) / 20))].sort((a, b) => a - b);
const passos = bases.slice(1).map((b, i) => Math.round((b - bases[i]) * 100) / 100);
const passoMediano = passos.length ? passos.sort((a, b) => a - b)[Math.floor(passos.length / 2)] : null;

/* ---- ESC3 · barracos de frente de muro ----
   Alturas arredondadas ao cm antes de comparar: `h - 0,4` com h=2,8 dá 2,3999999…
   e reprovava por 5×10⁻¹⁶ m (medido). Arredondar medição não é afrouxar teto. */
const puxadinhos = world.colliders.filter(ehPuxadinho);
const puxOk = puxadinhos.filter((c) => cm(c.maxY - c.minY) >= PE_MIN && cm(c.maxY - c.minY) <= PE_MAX);

/* ---- ESC4 · palafitas ---- */
const palafitas = world.colliders.filter(ehPalafita);
const palOk = palafitas.filter((c) => cm(c.maxY - c.minY) >= PE_MIN && cm(c.maxY - c.minY) <= PE_MAX);

/* ---- ESC5 · props ---- */
const propsOk = propEscala.filter((p) => FAIXA_PROP[p.id] && p.h >= FAIXA_PROP[p.id][0] && p.h <= FAIXA_PROP[p.id][1]);

const fmt = (x) => (x == null || !isFinite(x)) ? '—' : x.toFixed(2).replace('.', ',');
console.log(`vãos medidos: ${abs.length} · portas no térreo: ${portas.length} (ok ${portasOk.length}) · menor base de vão: ${fmt(menorBaseSemPorta)} m`);
if (portas.length) console.log(`  alturas de porta: ${[...new Set(portas.map((p) => Math.round((p.topo - p.base) * 100) / 100))].map(fmt).join(' · ')} m`);
console.log(`passo de andar (mediano): ${fmt(passoMediano)} m · níveis: ${bases.map(fmt).join(' · ')}`);
console.log(`barracos de muro: ${puxadinhos.length} (ok ${puxOk.length}) · alturas: ${[...new Set(puxadinhos.map((c) => Math.round((c.maxY - c.minY) * 100) / 100))].map(fmt).join(' · ')} m`);
console.log(`palafitas: ${palafitas.length} (ok ${palOk.length}) · corpos: ${[...new Set(palafitas.map((c) => Math.round((c.maxY - c.minY) * 100) / 100))].map(fmt).join(' · ')} m`);
console.log(`props: ${propEscala.length} colocados, ${propsOk.length} na faixa real${propEscala.length ? ' · ' + [...new Set(propEscala.map((p) => `${p.id}=${fmt(p.h)}m`))].join(' · ') : ''}`);

const checks = [
  ['ESC1 toda casa tem porta 2,00–2,20 m no térreo (base ≤ 0,15 m)',
    malhasVao.length > 0 && portas.length >= 15 && portasOk.length === portas.length,
    malhasVao.length === 0 ? 'malha de vão não encontrada — régua sem alvo' :
      portas.length === 0 ? `nenhum vão toca o piso; menor base ${fmt(menorBaseSemPorta)} m — fachada sem porta (BUG-55)` :
        `${portasOk.length}/${portas.length} portas na faixa`],
  ['ESC2 passo de andar 2,40–2,80 m',
    passoMediano != null && passoMediano >= PE_MIN && passoMediano <= PE_MAX,
    passoMediano == null ? 'menos de 2 níveis de vão — régua sem alvo' : `passo mediano ${fmt(passoMediano)} m`],
  ['ESC3 barraco de frente de muro com pé-direito 2,40–2,80 m',
    puxadinhos.length >= 8 && puxOk.length === puxadinhos.length,
    puxadinhos.length < 8 ? `${puxadinhos.length} barracos encontrados — filtro perdeu o alvo` :
      `${puxOk.length}/${puxadinhos.length} na faixa`],
  ['ESC4 palafita com corpo 2,40–2,80 m sobre os pilotis',
    palafitas.length >= 4 && palOk.length === palafitas.length,
    palafitas.length < 4 ? `${palafitas.length} palafitas encontradas — filtro perdeu o alvo` :
      `${palOk.length}/${palafitas.length} na faixa`],
  ['ESC5 todo prop GLB na faixa de altura real da classe',
    propEscala.length >= 15 && propsOk.length === propEscala.length,
    propEscala.length < 15 ? 'registro propEscala ausente/curto — régua sem alvo' :
      `${propsOk.length}/${propEscala.length} na faixa`],
];

let falhas = 0;
for (const [nome, ok, det] of checks) { if (!ok) falhas++; console.log(`${ok ? '✓' : '✗'} ${nome} — ${det}`); }
if (falhas) {
  console.error(`ESCALA-FAVELA FALHA: ${falhas}/${checks.length}${mutante ? ` (mutante ${mutante} mordido)` : ''}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu.`);
  process.exitCode = 1;
} else console.log('ESCALA-FAVELA OK');
