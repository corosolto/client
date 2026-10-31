#!/usr/bin/env node
/* ============================================================================
   vm-consistencia-check.mjs — A ARMA SEGUE A ANIMAÇÃO, OU A MÃO PUXA O NADA?
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   O dono jogou as 26 armas autoradas e descreveu o defeito com precisão que
   nenhuma régua desta casa cobrava: *"vários rifles puxam o carregador mas ele
   não sai, então fica só a mão puxando o nada"*.

   A causa não é a animação. Medido nos GLBs de família: TODAS as 15 famílias
   animam a peça na recarga — `ak` move Charge e Mag, `ar` move Bolt,
   BoltRelease e ChargingHandle, `bolt` move oito cartuchos. A animação está
   certa e sempre esteve.

   O que falta é o VÍNCULO. A arma do pack é substituída pela nossa Mint, e a
   Mint é uma malha MONOLÍTICA: um nó só, sem pente, sem ferrolho, sem nada
   nomeado (medido: 1 nó em ak, m4, m92, uzi, lmg, scar, revolver38, p90, svd).
   Para o pente sair da arma, alguém precisa recortá-lo por CAIXA no espaço da
   arma e prendê-lo ao osso que a animação move:

       parts: { mag: { box: { min: [...], max: [...] }, bone: 'Mag' } }

   Duas armas declaram isso — `ak` e `akm`.

   REVISADA EM 11/09, E A REVISÃO É A LIÇÃO
   O texto acima estava certo sobre o defeito e errado sobre o alcance. Ela cobrava
   a caixa de TODAS as 24, e 14 delas migraram para o caminho **golden** em 11/09
   01:43: ali a arma vem assada dentro do GLB e o pente é geometria SKINNADA no
   osso, sem `splitParts` nenhum. Cobrar `parts` de arma golden é vermelho falso —
   e 14 falsos em 22 reprovas é como se ensina alguém a ignorar vermelho.

   Ela também cobrava de `akm`, `g3`, `g3sg1`, `m400` e `tavor`, que estão no
   `vmconfig` mas **não** em `WEAPON_IDS` (`public/js/weapons.js`) desde o
   enxugamento 26 → 20 de 31/08. Produzir caixa para arma que ninguém empunha é
   trabalho que não chega ao jogador.

   Agora ela cobra de quem realmente passa por `attachMintWeapon` — arma jogável,
   sem `golden`, sem `baked` — que são as únicas em que `hidePackGun` apaga o pente
   skinnado e põe no lugar a Mint com o carregador soldado. Ver BUG-90 e BUG-91.

   REVISADA EM 28/10, E A REVISÃO É MAIOR QUE A DE 11/09
   Esta régua imprimia **25/25 armas com o vínculo íntegro** e saía 0 — sem ter
   medido 24 delas. `avaliar` tinha cláusula para `golden` (VM-C4) e para
   `encaixado` (VM-C1/2/3), e o caminho `assado` caía num `continue` mudo. Como
   HOJE toda arma de `VM_WEAPON` tem `baked: true`, o `continue` mudo era a
   regra e não a exceção: a régua inteira passou a ser decorativa, e foi por
   essa porta que a `awp` perdeu o `parts` sem ninguém notar.

   Placar verde por cima de medição que não aconteceu é a forma mais cara de
   vermelho falso — é a mesma armadilha que a sonda do `vm-pente-carga` teve em
   11/09, agora na régua que deveria tê-la pego.

   No produto assado o pente não é recortado em runtime: já vem no GLB, como nó
   pendurado no osso (`MINT_WEAPON_MAG_AK`, `MINT_WEAPON_M4_MAG`) ou skinnado
   nele. VM-C5/C6/C7 medem isso NO ARQUIVO QUE O JOGO SERVE.

   O QUE ELA NÃO FAZ, DE PROPÓSITO
   Não julga se a caixa está no lugar certo — isso é pixel, é
   `vm-arsenal-frames.mjs` + revisão humana. Ela cobra a existência do vínculo e
   a sanidade dele: caixa que não pega vértice nenhum é decorativa, e caixa que
   pega a arma inteira arranca o corpo junto com o pente. Régua que passa por
   vacuidade não mede nada — é a armadilha nº 1 desta casa.

   E ela não julga POSE. Clipe-pente (`CLIPE_PENTE` em vm-pente-pecas.mjs) tem as
   balas estacionadas separadas em repouso; quem julga isso é o
   `vm-reguas --regua=carregador`, no quadro desenhado.

   AS CLÁUSULAS
     VM-C1/C2/C3  caminho ENCAIXADO: declara `parts`, e a caixa não é vazia nem
                  engole o corpo.
     VM-C4        caminho GOLDEN: isenção MEDIDA — o GLB servido tem ≥50
                  vértices presos ao osso do pente por skinning.
     VM-C5        caminho ASSADO: o osso do pente carrega geometria de verdade
                  no produto servido. É "a mão puxa o nada" virando número.
     VM-C6        caminho ASSADO: a peça não COINCIDE com o corpo nos três
                  eixos. A `svd` serve 6.444 vértices no osso `Mag` com a caixa
                  idêntica à do rifle — é a arma inteira pendurada no
                  carregador, e nenhuma contagem de vértices sabe disso.
     VM-C7        a isenção de `CARREGADOR_NA_BASE` é conferida contra o
                  produto: arma declarada "sem carregador" que TEM pente de
                  verdade reprova, porque a entrada envelheceu.

   USO
     node tools/eval/vm-consistencia-check.mjs
     node tools/eval/vm-consistencia-check.mjs --json
     node tools/eval/vm-consistencia-check.mjs --mutante=<nome>

   MUTANTES (a régua denuncia a si mesma: sai 1 se o mutante PASSAR)
     semparts      apaga o `parts` da ak — VM-C1 tem de reprovar
     caixavazia    encolhe a caixa da ak a zero — VM-C2 tem de reprovar
     caixatudo     infla a caixa da ak para o mundo — VM-C3 tem de reprovar

   Os três põem a ak no caminho ENCAIXADO de propósito. Sem isso eles deixaram de
   morder no momento em que ela virou golden, em 11/09: as cláusulas de caixa não
   se aplicam a arma assada, e os três mutantes passaram calados na primeira
   execução depois da mudança. Mutante que só morde na configuração de ontem é
   mutante que não guarda nada.
     goldenvazio   zera o pente skinnado da ak golden — VM-C4 tem de reprovar. É o
                   mutante que faz a ISENÇÃO do caminho golden ser medida em vez de
                   assumida: sem ele, marcar `golden: true` calaria a régua.
     semdeclaracao zera a geometria no osso do pente da m4 assada — VM-C5 tem de
                   reprovar. É o equivalente, no caminho de hoje, a apagar o
                   `parts` de uma arma: a peça some e a mão fica puxando o nada.
     pecaenorme    infla a peça da m4 até coincidir com o corpo — VM-C6 tem de
                   reprovar. Reproduz o defeito REAL e medido da `svd`.
     listadivergente  tira a `carbine` da lista de isenção desta régua — VM-C10
                   tem de acusar que ela e o `vm-reguas.mjs` divergiram.

   `semdeclaracao` e `pecaenorme` mordem na `m4`, a arma assada com pente real
   medível nesta máquina; `listadivergente` morde na `carbine`. Se o alvo não
   existir, o mutante ERRA EM VOZ ALTA em vez de
   passar calado — mutante sem alvo é mutante que não guarda nada, e foi assim
   que os três de caixa adormeceram em 11/09.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { CARREGADOR_NA_BASE, CLIPE_PENTE } from './lib/vm-pente-pecas.mjs';

const RAIZ = process.cwd();

/* Só as armas que o jogador empunha. `vmconfig` tem entradas que sobraram do
   enxugamento 26 → 20 de 31/08 e não estão em `WEAPON_IDS`. Lido do texto para
   não importar `weapons.js`, que puxa o Three. */
const JOGAVEIS = new Set(
  (/WEAPON_IDS\s*=\s*\[([\s\S]*?)\]/.exec(
    fs.readFileSync(path.join(process.cwd(), 'public/js/weapons.js'), 'utf8'),
  )?.[1] || '').match(/'([a-z0-9_]+)'/g)?.map((t) => t.slice(1, -1)) || [],
);

/* A tabela IRMÃ, lida como TEXTO pelo mesmo motivo que `WEAPON_IDS` acima:
   `vm-reguas.mjs` importa o palco (Playwright) e o Three, e os BYTES dele entram
   no hash do `eval:vm-placar`. Ler em vez de importar mantém esta régua em 0,2 s
   e o placar de imagem intacto — e VM-C10 cobra que as duas listas concordem,
   que é o que falta quando uma cópia envelhece sozinha. */
function isencoesDoVmReguas() {
  const txt = fs.readFileSync(path.join(RAIZ, 'tools/eval/lib/vm-reguas.mjs'), 'utf8');
  const bloco = /const CARREGADOR_NA = \{([\s\S]*?)\n\};/.exec(txt)?.[1];
  if (bloco == null) return null;   // forma mudou: VM-C10 reprova em voz alta
  return new Set([...bloco.matchAll(/^\s{2}([a-z0-9_]+):/gm)].map((m) => m[1]));
}
function clipesDoVmReguas() {
  const txt = fs.readFileSync(path.join(RAIZ, 'tools/eval/lib/vm-reguas.mjs'), 'utf8');
  const bloco = /export const CARREGADOR_PECA = \{([\s\S]*?)\n\};/.exec(txt)?.[1];
  if (bloco == null) return null;
  return new Set([...bloco.matchAll(/([a-z0-9_]+):\s*\{[^}]*clipe:\s*true/g)].map((m) => m[1]));
}

/* Qual caminho de viewmodel a arma toma — é o que decide se ela DEVE uma caixa:
   só o encaixado passa por `attachMintWeapon`/`hidePackGun`. Espelha
   `entryKeyFor` (`public/js/authoredvm.js:240-246`). */
const MUT_CAIXA = new Set(['semparts', 'caixavazia', 'caixatudo']);
// Mutantes do caminho ASSADO: mordem na m4, que é a arma assada com pente real
// medível nesta máquina (MINT_WEAPON_M4_MAG, 313 vértices, 11% do corpo).
const MUT_ASSADO = new Set(['semdeclaracao', 'pecaenorme']);
function caminhoDe(arma, cfg) {
  if (MUT_CAIXA.has(MUT) && arma === 'ak') return 'encaixado';
  if (cfg.golden === true) return 'golden';
  if (cfg.baked === true) return 'assado';
  return 'encaixado';
}
const PRIV = '/Users/ruben/csbrasil-private-assets/generated/viewmodels';
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';

/* Nós de peça móvel que a animação de recarga costuma mexer. Lista aberta: o
   pack nomeia em inglês e varia (Mag, Magazine, Charger, Charge, Bolt…). */
const RE_PECA = /mag|magazine|clip|charger?|bolt|slide|slider|pump|cylind|lever|cartridge/i;

function glbJson(p) {
  const b = fs.readFileSync(p);
  const len = b.readUInt32LE(12);
  return JSON.parse(b.slice(20, 20 + len).toString('utf8'));
}

/** Ossos de peça que a recarga da família realmente move. */
export function pecasMovidas(familia) {
  const p = path.join(PRIV, familia, `${familia}-runtime.glb`);
  if (!fs.existsSync(p)) return null;
  const j = glbJson(p);
  const nomes = new Map((j.nodes || []).map((n, i) => [i, n.name || '']));
  const recarga = (j.animations || []).filter((a) => /reload|pump|cylind/i.test(a.name || ''));
  const movidos = new Set();
  for (const a of recarga) {
    for (const c of a.channels || []) {
      const nome = nomes.get(c.target?.node);
      if (nome && RE_PECA.test(nome)) movidos.add(nome);
    }
  }
  return [...movidos];
}

/** Fração dos vértices da arma que caem dentro da caixa declarada. */
export function fracaoNaCaixa(armaGlb, box) {
  if (!fs.existsSync(armaGlb)) return null;
  const b = fs.readFileSync(armaGlb);
  const len = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + len).toString('utf8'));
  const binOff = 20 + len + 8;
  let dentro = 0;
  let total = 0;
  for (const m of j.meshes || []) {
    for (const pr of m.primitives || []) {
      const acc = j.accessors[pr.attributes.POSITION];
      if (!acc || acc.componentType !== 5126 || acc.type !== 'VEC3') continue;
      const bv = j.bufferViews[acc.bufferView];
      const passo = bv.byteStride || 12;
      const base = binOff + (bv.byteOffset || 0) + (acc.byteOffset || 0);
      for (let i = 0; i < acc.count; i += 1) {
        const o = base + i * passo;
        const x = b.readFloatLE(o);
        const y = b.readFloatLE(o + 4);
        const z = b.readFloatLE(o + 8);
        total += 1;
        if (x >= box.min[0] && x <= box.max[0] && y >= box.min[1] && y <= box.max[1]
          && z >= box.min[2] && z <= box.max[2]) dentro += 1;
      }
    }
  }
  return total ? { dentro, total, fracao: dentro / total } : null;
}

/* Quantos vértices estão presos ao osso do pente por SKINNING no GLB golden — é
   como a arma assada segura o carregador, sem `splitParts`. Abaixo de 50 não há
   caixa de carregador, e a isenção do caminho golden não se sustenta. */
function skinNoPente(glb) {
  if (!fs.existsSync(glb)) return null;
  const j = glbJson(glb);
  const nos = j.nodes || [];
  const alvos = nos.map((n, i) => [n, i]).filter(([n]) => /^mag/i.test(n.name || '')).map(([, i]) => i);
  if (!alvos.length) return 0;
  const b = fs.readFileSync(glb);
  const jl = b.readUInt32LE(12);
  const bin = b.slice(20 + jl + 8);
  const TAM = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
  let total = 0;
  for (const alvo of alvos) {
    for (let si = 0; si < (j.skins || []).length; si += 1) {
      const jt = (j.skins[si].joints || []).indexOf(alvo);
      if (jt < 0) continue;
      for (const n of nos) {
        if (n.skin !== si || n.mesh == null) continue;
        for (const prim of (j.meshes[n.mesh].primitives || [])) {
          const ai = prim.attributes.JOINTS_0; const aw = prim.attributes.WEIGHTS_0;
          if (ai == null || aw == null) continue;
          const accI = j.accessors[ai]; const accW = j.accessors[aw];
          const bvI = j.bufferViews[accI.bufferView]; const bvW = j.bufferViews[accW.bufferView];
          const szI = TAM[accI.componentType]; const szW = TAM[accW.componentType];
          const oI = (bvI.byteOffset || 0) + (accI.byteOffset || 0);
          const oW = (bvW.byteOffset || 0) + (accW.byteOffset || 0);
          const strI = bvI.byteStride || szI * 4; const strW = bvW.byteStride || szW * 4;
          for (let v = 0; v < accI.count; v += 1) {
            for (let c = 0; c < 4; c += 1) {
              const o = oI + v * strI + c * szI;
              const idx = szI === 1 ? bin.readUInt8(o) : szI === 2 ? bin.readUInt16LE(o) : bin.readUInt32LE(o);
              if (idx !== jt) continue;
              const q = oW + v * strW + c * szW;
              const w = accW.componentType === 5126 ? bin.readFloatLE(q)
                : accW.componentType === 5123 ? bin.readUInt16LE(q) / 65535 : bin.readUInt8(q) / 255;
              if (w > 0.01) { total += 1; break; }
            }
          }
        }
      }
    }
  }
  return total;
}
const PISO_SKIN = 50;

/* Pisos e tetos: um pente é uma minoria clara da arma. A ak aprovada mede a
   referência; abaixo de VAZIA a caixa é decorativa, acima de TUDO ela arranca o
   corpo junto. Números conferidos contra a ak em 11/09/2026. */
const VAZIA = 0.005;
const TUDO = 0.60;

/* ---------------------------------------------------------------------------
   O CAMINHO ASSADO, QUE A RÉGUA NÃO OLHAVA (BUG-90 / #1116)

   Até aqui `avaliar` tinha cláusula para `golden` (VM-C4, medida) e para
   `encaixado` (VM-C1/2/3). O caminho `assado` caía num `continue` mudo. Como
   HOJE toda arma de `VM_WEAPON` tem `baked: true`, isso significava 24 das 25
   armas jogáveis saindo pela porta dos fundos — e a régua imprimindo
   "25/25 armas com o vínculo íntegro" sem ter medido nenhuma delas.

   No produto assado o pente não é recortado em runtime: ele já vem no GLB, como
   nó próprio pendurado no osso (`MINT_WEAPON_MAG_AK`, `MINT_WEAPON_M4_MAG`) ou
   como geometria skinnada no osso. Então a pergunta do dono — *"a mão puxa o
   nada?"* — vira uma medida offline: QUANTA geometria o osso do pente carrega
   no arquivo que o jogo serve, e QUE TAMANHO ela tem.

   O tamanho importa tanto quanto a existência. O `svd` tem peça no osso `Mag` e
   ela mede 0,998 m — a mesma caixa do corpo da arma. Não é um pente: é a SVD
   inteira duplicada e pendurada no carregador. Contagem de vértices daria verde
   (6.444!); é o mesmo verde falso que a `carbine` deu com a alavanca. --------- */

function glbComBin(p) {
  const b = fs.readFileSync(p);
  const len = b.readUInt32LE(12);
  return { j: JSON.parse(b.slice(20, 20 + len).toString('utf8')), bin: b.slice(20 + len + 8) };
}

// Nó de PENTE propriamente dito. `RE_PECA` é larga de propósito (pega Bolt,
// Slider, Pump…); aqui a pergunta é só sobre o carregador.
const RE_MAG = /^(mag|magazine|charger|clip|gauge)|_mag$|_mag_|mag$/i;
const TAM_ACC = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };

/* Matriz de mundo de um nó: o GLB traz `matrix` OU `translation`/`rotation`/
   `scale`. Sem isso, somar acessores de nós irmãos em espaços diferentes vira
   ficção — a primeira versão desta sonda deu 63,779 m de "pente" na mosin
   juntando `GEO_PROC_*` crus. Medida nova é tão suspeita quanto o código que
   ela julga: esta errou na estreia e foi pega pelo absurdo do número. */
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale || [1, 1, 1];
  const [tx, ty, tz] = n.translation || [0, 0, 0];
  const x2 = x + x; const y2 = y + y; const z2 = z + z;
  const xx = x * x2; const xy = x * y2; const xz = x * z2;
  const yy = y * y2; const yz = y * z2; const zz = z * z2;
  const wx = w * x2; const wy = w * y2; const wz = w * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
const aplica = (m, p) => [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
const novaCaixa = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
const comePonto = (c, p) => { for (let k = 0; k < 3; k += 1) { c.min[k] = Math.min(c.min[k], p[k]); c.max[k] = Math.max(c.max[k], p[k]); } };
const lado = (c) => (c.min[0] === Infinity ? 0 : Math.max(...[0, 1, 2].map((k) => c.max[k] - c.min[k])));

/* Geometria que o osso do pente carrega no GLB servido, com a CAIXA dela em
   espaço de MUNDO. Devolve `null` quando o arquivo não existe — isso é "sem
   medida", nunca verde. */
function pecaNoAssado(glb) {
  if (!fs.existsSync(glb)) return null;
  const { j, bin } = glbComBin(glb);
  const nos = j.nodes || [];
  const pai = new Map();
  nos.forEach((n, i) => { for (const c of n.children || []) pai.set(c, i); });
  const mundoCache = new Map();
  const mundo = (i) => {
    if (mundoCache.has(i)) return mundoCache.get(i);
    const p = pai.get(i);
    const m = p == null ? trs(nos[i]) : mul(mundo(p), trs(nos[i]));
    mundoCache.set(i, m);
    return m;
  };

  const recarga = new Set();
  for (const a of j.animations || []) {
    if (!/reload|pump|cylind/i.test(a.name || '')) continue;
    for (const c of a.channels || []) if (c.target?.node != null) recarga.add(c.target.node);
  }
  // O nó pode não ter canal próprio e ainda assim andar: basta descer de um que tem.
  const movidoPor = (i) => {
    let k = i; let guarda = 0;
    while (k != null && guarda++ < 64) { if (recarga.has(k)) return nos[k].name || `#${k}`; k = pai.get(k); }
    return null;
  };

  // Primitivas cuja peça indexa um acessor muito maior (recorte não compactado).
  const semCompactar = [];

  // Leitor de um acessor VEC3/escalar direto do bin, respeitando byteStride.
  const leitor = (ai) => {
    const acc = j.accessors[ai];
    const bv = j.bufferViews[acc.bufferView];
    const sz = TAM_ACC[acc.componentType];
    const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const comps = acc.type === 'VEC3' ? 3 : 1;
    const passo = bv.byteStride || sz * comps;
    return { count: acc.count, ler: (v, c = 0) => {
      const o = base + v * passo + c * sz;
      if (acc.componentType === 5126) return bin.readFloatLE(o);
      if (acc.componentType === 5125) return bin.readUInt32LE(o);
      if (acc.componentType === 5123) return bin.readUInt16LE(o);
      return bin.readUInt8(o);
    } };
  };

  /* Caixa da malha pelos vértices REALMENTE INDEXADOS, levados ao mundo.

     Ler `accessor.min/max` seria mais barato e estaria errado: o recorte do
     pente da `svd` criou uma primitiva que INDEXA ~110 vértices de um acessor
     POSITION de ~6,5 mil COMPARTILHADO com o corpo da arma (ver
     tools/viewmodels/prep/compacta-peca.mjs). Pelo min/max a peça "mede 100% da
     arma"; pelos índices ela mede o que o jogador vê. A primeira versão desta
     sonda caiu exatamente nessa e acusou a `svd` de pendurar o rifle inteiro no
     carregador. `semCompactar` guarda a diferença, que é um defeito de verdade
     — só que outro. */
  const comeMalha = (i, caixa) => {
    const m = mundo(i);
    let n = 0;
    for (const pr of j.meshes[nos[i].mesh].primitives || []) {
      if (pr.attributes.POSITION == null) continue;
      const pos = leitor(pr.attributes.POSITION);
      let usados;
      if (pr.indices != null) {
        const idx = leitor(pr.indices);
        usados = new Set();
        for (let k = 0; k < idx.count; k += 1) usados.add(idx.ler(k));
      } else {
        usados = null;
      }
      const total = usados ? usados.size : pos.count;
      n += total;
      if (usados && pos.count > total) semCompactar.push({ no: nos[i].name, usados: total, acessor: pos.count });
      const visita = (v) => comePonto(caixa, aplica(m, [pos.ler(v, 0), pos.ler(v, 1), pos.ler(v, 2)]));
      if (usados) for (const v of usados) visita(v);
      else for (let v = 0; v < pos.count; v += 1) visita(v);
    }
    return n;
  };

  // Referência de tamanho: a maior malha de ARMA do arquivo (não a mão/braço).
  const corpo = novaCaixa();
  for (let i = 0; i < nos.length; i += 1) {
    const n = nos[i];
    if (n.mesh == null || !/^(MINT_WEAPON_|GEO_MINT_|GEO_WEAPON_)/i.test(n.name || '')) continue;
    if (RE_MAG.test(n.name || '')) continue;
    const c = novaCaixa();
    comeMalha(i, c);
    if (lado(c) > lado(corpo)) { corpo.min = c.min; corpo.max = c.max; }
  }
  // A varredura do corpo também passou por `comeMalha`; só o recorte da PEÇA
  // interessa aqui (o corpo indexar menos que o acessor é normal).
  semCompactar.length = 0;

  // (a) peça como NÓ pendurado no osso: geometria da subárvore, em mundo.
  let verts = 0;
  const peca = novaCaixa();
  let via = null;
  const vistos = new Set();
  const subarvore = (i) => {
    if (vistos.has(i)) return;
    vistos.add(i);
    if (nos[i].mesh != null) verts += comeMalha(i, peca);
    for (const c of nos[i].children || []) subarvore(c);
  };
  for (let i = 0; i < nos.length; i += 1) {
    if (!RE_MAG.test(nos[i].name || '')) continue;
    const onde = movidoPor(i);
    if (!onde) continue;
    via = via || onde;
    subarvore(i);
  }

  /* (b) peça SKINNADA no osso. Aqui a comparação roda DENTRO da malha
     hospedeira: pente e corpo saem do mesmo buffer, no mesmo espaço, e
     transform nenhum entra na conta. */
  let corpoSkin = null;
  if (!verts) {
    const alvos = nos.map((n, i) => [n, i]).filter(([n, i]) => RE_MAG.test(n.name || '') && movidoPor(i)).map(([, i]) => i);
    const hospedeira = novaCaixa();
    for (const alvo of alvos) {
      for (let si = 0; si < (j.skins || []).length; si += 1) {
        const jt = (j.skins[si].joints || []).indexOf(alvo);
        if (jt < 0) continue;
        for (const n of nos) {
          if (n.skin !== si || n.mesh == null) continue;
          for (const prim of j.meshes[n.mesh].primitives || []) {
            const ai = prim.attributes.JOINTS_0; const aw = prim.attributes.WEIGHTS_0;
            const ap = prim.attributes.POSITION;
            if (ai == null || aw == null || ap == null) continue;
            const accI = j.accessors[ai]; const accW = j.accessors[aw]; const accP = j.accessors[ap];
            const bvI = j.bufferViews[accI.bufferView]; const bvW = j.bufferViews[accW.bufferView];
            const bvP = j.bufferViews[accP.bufferView];
            const szI = TAM_ACC[accI.componentType]; const szW = TAM_ACC[accW.componentType];
            const oI = (bvI.byteOffset || 0) + (accI.byteOffset || 0);
            const oW = (bvW.byteOffset || 0) + (accW.byteOffset || 0);
            const oP = (bvP.byteOffset || 0) + (accP.byteOffset || 0);
            const strI = bvI.byteStride || szI * 4; const strW = bvW.byteStride || szW * 4;
            const strP = bvP.byteStride || 12;
            for (let v = 0; v < accI.count; v += 1) {
              const ponto = [0, 1, 2].map((k) => bin.readFloatLE(oP + v * strP + k * 4));
              comePonto(hospedeira, ponto);
              let peso = 0;
              for (let c = 0; c < 4; c += 1) {
                const o = oI + v * strI + c * szI;
                const idx = szI === 1 ? bin.readUInt8(o) : szI === 2 ? bin.readUInt16LE(o) : bin.readUInt32LE(o);
                if (idx !== jt) continue;
                const q = oW + v * strW + c * szW;
                peso += accW.componentType === 5126 ? bin.readFloatLE(q)
                  : accW.componentType === 5123 ? bin.readUInt16LE(q) / 65535 : bin.readUInt8(q) / 255;
              }
              if (peso <= 0.5) continue;
              verts += 1;
              comePonto(peca, ponto);
            }
          }
        }
      }
      if (verts) via = via || nos[alvo].name;
    }
    if (verts) corpoSkin = hospedeira;
  }

  const refCorpo = corpoSkin ?? corpo;
  const dims = (c) => (c.min[0] === Infinity ? [0, 0, 0] : [0, 1, 2].map((k) => c.max[k] - c.min[k]));
  const dPeca = dims(peca);
  const dCorpo = dims(refCorpo);
  /* `coincide` = o quanto a caixa da peça ocupa a do corpo NO EIXO MAIS
     APERTADO. É isso que separa um pente de uma cópia da arma: o pente é curto
     em pelo menos um eixo, a cópia não é curta em nenhum. */
  const coincide = dCorpo.every((v) => v > 0) ? Math.min(...[0, 1, 2].map((k) => dPeca[k] / dCorpo[k])) : null;
  return { verts, via, ladoPeca: lado(peca), ladoCorpo: lado(refCorpo), coincide, semCompactar,
    razao: lado(refCorpo) > 0 ? lado(peca) / lado(refCorpo) : null };
}

/* QUANDO A "PEÇA" É A ARMA INTEIRA.

   O primeiro teto que escrevi aqui foi linear — maior lado da peça contra maior
   lado do corpo, teto de 60%, emprestado do `TUDO` das caixas. Ele reprovava a
   `svd` (100%) e deixava a `pistol` em 59%: um ponto percentual de folga numa
   grandeza que eu tinha acabado de inventar. Teto assim não guarda nada — na
   próxima pistola reassada ele vira vermelho falso, e vermelho falso é como se
   ensina a ignorar vermelho.

   O que eu REALMENTE medi na `svd` não foi "grande": foi IDÊNTICA. A caixa de
   `GEO_MINT_SVD_PIECE` bate com a de `GEO_MINT_SVD` nos três eixos e no centro
   — são duas cópias do mesmo rifle, uma delas pendurada no osso do carregador.
   Um pente de verdade é curto em pelo menos um eixo: a ak assada ocupa 24% do
   maior lado, a m4 11%, e a `pistol`, que é a mais apertada das legítimas,
   ainda assim só alcança 59% no maior eixo porque é CURTA nos outros.

   Então a cláusula mede o eixo mais apertado. Acima de 90% em TODOS os três, a
   peça não é um carregador — é a arma. */
const PECA_COINCIDE_MAX = 0.90;
// Piso de geometria: abaixo disso o osso carrega poeira, não um carregador.
const PISO_PECA = 30;

export async function medir() {
  const modUrl = pathToFileURL(path.join(RAIZ, 'public/js/data/vmconfig.js')).href;
  const { VM_WEAPON, VM_FAMILY } = await import(modUrl);
  const linhas = [];

  for (const [arma, cfg] of Object.entries(VM_WEAPON)) {
    const familia = cfg.family;
    if (VM_FAMILY[familia]?.ready !== true) continue;
    if (!JOGAVEIS.has(arma)) continue;
    const caminho = caminhoDe(arma, cfg);
    const movidas = pecasMovidas(familia) ?? [];
    let parts = cfg.parts;
    if (MUT === 'semparts' && arma === 'ak') parts = null;
    if (MUT === 'caixavazia' && arma === 'ak') parts = { mag: { box: { min: [0, 0, 0], max: [0, 0, 0] }, bone: 'Mag' } };
    if (MUT === 'caixatudo' && arma === 'ak') parts = { mag: { box: { min: [-9, -9, -9], max: [9, 9, 9] }, bone: 'Mag' } };

    const glb = path.join(RAIZ, 'public/models/weapons', `${arma}.glb`);
    let frac = null;
    if (parts?.mag?.box) frac = fracaoNaCaixa(glb, parts.mag.box);

    let skin = null;
    if (caminho === 'golden') {
      skin = skinNoPente(path.join(RAIZ, 'public/models/viewmodels/coro', `${arma}-hires.glb`));
      if (MUT === 'goldenvazio' && arma === 'ak') skin = 0;
    }

    /* Caminho assado: o produto que o jogo REALMENTE serve, espelhando
       `urlForKey` (`public/js/authoredvm.js:326-333`). `runtime: 'family'` serve
       o GLB da família; o resto, o da arma. */
    let peca = null;
    if (caminho === 'assado') {
      const arq = cfg.runtime === 'family'
        ? path.join(PRIV, familia, `${familia}-runtime.glb`)
        : path.join(PRIV, familia, `${arma}-baked-runtime.glb`);
      peca = pecaNoAssado(arq);
      peca = peca && { ...peca, arq: path.relative(PRIV, arq) };
      if (peca && MUT === 'semdeclaracao' && arma === 'm4') peca = { ...peca, verts: 0, via: null };
      if (peca && MUT === 'pecaenorme' && arma === 'm4') peca = { ...peca, ladoPeca: peca.ladoCorpo, razao: 1, coincide: 1 };
      if (!peca && MUT === 'semdeclaracao' && arma === 'm4') throw new Error('MUTANTE semdeclaracao sem alvo: m4 não pôde ser medida');
    }

    // `peca: true` recorta por componente conexo e dispensa caixa — a caixa leva
    // geometria alheia junto (medido: 373 intrusos na ak). Ver BUG-90.
    linhas.push({ arma, familia, caminho, movidas, skin, peca, porPeca: Boolean(parts?.mag?.peca),
      temParts: Boolean(parts?.mag?.box || parts?.mag?.peca), fracao: frac?.fracao ?? null });
  }
  return linhas;
}

function avaliar(linhas) {
  const falhas = [];
  const semMedida = [];

  /* VM-C10 — as duas listas de isenção têm de concordar. Esta régua julga
     configuração; a `vm-reguas` julga imagem. Elas nomeiam as MESMAS armas sem
     pente, e por motivos iguais. Cópia que envelhece sozinha é exatamente como
     a `awp` perdeu a declaração sem ninguém notar (BUG-90). */
  const naImagem = isencoesDoVmReguas();
  const clipeImagem = clipesDoVmReguas();
  if (naImagem === null || clipeImagem === null) {
    falhas.push({ regra: 'VM-C10', arma: '—', msg: 'não consegui ler CARREGADOR_NA/CARREGADOR_PECA de tools/eval/lib/vm-reguas.mjs — a forma da tabela mudou e esta régua parou de conferir a concordância' });
  } else {
    const aqui = new Set(Object.keys(CARREGADOR_NA_BASE));
    // Mutante: tira a `carbine` desta lista e VM-C10 tem de acusar a divergência.
    if (MUT === 'listadivergente' && !aqui.delete('carbine')) {
      throw new Error('MUTANTE listadivergente sem alvo: carbine não está em CARREGADOR_NA_BASE');
    }
    for (const a of aqui) {
      if (!naImagem.has(a)) falhas.push({ regra: 'VM-C10', arma: a, msg: 'isenta de carregador aqui, mas ausente do CARREGADOR_NA de vm-reguas.mjs — as duas listas divergiram' });
    }
    for (const a of naImagem) {
      if (!aqui.has(a)) falhas.push({ regra: 'VM-C10', arma: a, msg: `isenta no CARREGADOR_NA de vm-reguas.mjs, mas ausente daqui — as duas listas divergiram` });
    }
    for (const a of CLIPE_PENTE) {
      if (!clipeImagem.has(a)) falhas.push({ regra: 'VM-C10', arma: a, msg: `marcada como clipe-pente aqui, mas sem \`clipe: true\` no CARREGADOR_PECA de vm-reguas.mjs` });
    }
    for (const a of clipeImagem) {
      if (!CLIPE_PENTE.has(a)) falhas.push({ regra: 'VM-C10', arma: a, msg: `tem \`clipe: true\` em vm-reguas.mjs, mas falta em CLIPE_PENTE — VM-C6 cobraria pose de repouso dela como se fosse tamanho de peça` });
    }
  }
  for (const l of linhas) {
    if (l.movidas.length === 0) continue; // família sem peça móvel não deve nada
    /* Golden traz o pente skinnado no próprio GLB — mas a isenção é MEDIDA, não
       assumida: sem VM-C4, marcar `golden: true` calaria a régua. */
    if (l.caminho === 'golden') {
      if (!/mag/i.test(l.movidas.join(','))) continue;
      if (l.skin === null) {
        falhas.push({ regra: 'VM-C4', arma: l.arma, msg: 'golden sem GLB em coro/ — não dá para conferir o pente skinnado' });
      } else if (l.skin < PISO_SKIN) {
        falhas.push({ regra: 'VM-C4', arma: l.arma, msg: `golden com ${l.skin} vértices presos ao osso do pente (< ${PISO_SKIN}) — a isenção não se sustenta` });
      }
      continue;
    }
    /* Caminho ASSADO: o pente já vem no produto, como nó pendurado no osso ou
       skinnado nele. A isenção é MEDIDA no arquivo servido — era aqui que a
       régua saía mudo por 24 das 25 armas e ainda imprimia 25/25. */
    if (l.caminho === 'assado') {
      if (!/mag|clip|gauge/i.test(l.movidas.join(','))) continue;
      const isento = CARREGADOR_NA_BASE[l.arma];
      if (l.peca === null) {
        // Produto não construído nesta máquina: SKIP explícito, nunca verde.
        semMedida.push({ arma: l.arma, msg: `produto assado ausente (${l.familia}/${l.arma}) — o vínculo do pente não foi conferido` });
        continue;
      }
      if (isento) {
        /* Isenção não é fé: se a arma isenta TEM pente de verdade no produto, a
           entrada envelheceu e esconde uma arma que já funciona. */
        if (l.peca.verts >= PISO_PECA && l.peca.coincide !== null && l.peca.coincide <= PECA_COINCIDE_MAX) {
          falhas.push({ regra: 'VM-C7', arma: l.arma, msg: `declarada SEM carregador ("${isento.slice(0, 60)}…"), mas o produto tem ${l.peca.verts} vértices de peça no osso ${l.peca.via} ocupando ${(l.peca.coincide * 100).toFixed(0)}% do corpo no eixo mais apertado — a isenção envelheceu` });
        }
        continue;
      }
      if (l.peca.verts < PISO_PECA) {
        falhas.push({ regra: 'VM-C5', arma: l.arma, msg: `família ${l.familia} move ${l.movidas.join('/')} na recarga, mas o produto assado não tem geometria no osso do pente (${l.peca.verts} vértices) — a mão puxa o nada` });
        continue;
      }
      /* Clipe-pente (stripper) não tem caixa comparável EM REPOUSO: as balas
         ficam estacionadas separadas e só se juntam na recarga. Medido na
         mosin: os cinco `GEO_PROC_CartridgeClip*` têm centro de -0,618 a
         -1,306 enquanto o corpo está em -0,528 — 0,826 m de espalhamento que
         não é tamanho de peça, é pose de repouso. Quem julga a pose deles é o
         `vm-reguas --regua=carregador`, no quadro desenhado. */
      if (l.peca.coincide !== null && l.peca.coincide > PECA_COINCIDE_MAX && !CLIPE_PENTE.has(l.arma)) {
        falhas.push({ regra: 'VM-C6', arma: l.arma, msg: `a peça no osso ${l.peca.via} preenche ${(l.peca.coincide * 100).toFixed(0)}% do corpo nos TRÊS eixos (teto ${PECA_COINCIDE_MAX * 100}%): ${l.peca.ladoPeca.toFixed(3)} m contra ${l.peca.ladoCorpo.toFixed(3)} m — isso não é um pente, é a arma inteira pendurada no carregador` });
      }
      /* VM-C8 — recorte NÃO COMPACTADO. A peça desenha certo (só os triângulos
         indexados aparecem), mas o acessor POSITION dela continua sendo o do
         corpo inteiro. Tudo que lê VÉRTICE e não triângulo — o skin do runtime,
         o `eval:vm-carregador` — enxerga a arma toda e mede "carregador
         fantasma: a peça mede 100% da arma". Conserto pronto e já escrito:
         `node tools/viewmodels/prep/compacta-peca.mjs --arma=<a> --in=<glb> --out=<glb>`. */
      for (const s of l.peca.semCompactar || []) {
        if (s.acessor < s.usados * 4) continue;   // folga normal de buffer compartilhado
        falhas.push({ regra: 'VM-C8', arma: l.arma, msg: `a peça ${s.no} indexa ${s.usados} vértices de um acessor POSITION de ${s.acessor} compartilhado com o corpo — recorte sem compactar; rode tools/viewmodels/prep/compacta-peca.mjs` });
      }
      continue;
    }
    if (l.caminho !== 'encaixado') continue;
    if (!l.temParts) {
      falhas.push({ regra: 'VM-C1', arma: l.arma, msg: `família ${l.familia} move ${l.movidas.join('/')} na recarga, mas a arma não declara parts.mag — a mão puxa o nada` });
      continue;
    }
    // Recorte por peça não tem caixa para medir: quem o julga é `vm-pente-carga`.
    if (l.porPeca) continue;
    if (l.fracao === null) {
      falhas.push({ regra: 'VM-C2', arma: l.arma, msg: 'caixa declarada mas o GLB da arma não pôde ser medido' });
      continue;
    }
    if (l.fracao < VAZIA) {
      falhas.push({ regra: 'VM-C2', arma: l.arma, msg: `caixa pega ${(l.fracao * 100).toFixed(2)}% dos vértices (< ${VAZIA * 100}%) — decorativa` });
    }
    if (l.fracao > TUDO) {
      falhas.push({ regra: 'VM-C3', arma: l.arma, msg: `caixa pega ${(l.fracao * 100).toFixed(1)}% dos vértices (> ${TUDO * 100}%) — arranca o corpo junto` });
    }
  }
  return { falhas, semMedida };
}

const linhas = await medir();
const { falhas, semMedida } = avaliar(linhas);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ mutante: MUT || null, armas: linhas.length, falhas, semMedida }, null, 2));
} else {
  console.log('\n  arma         família    caminho     peças movidas na recarga   parts  caixa    skin  peça no osso (assado)');
  console.log('  ' + '-'.repeat(116));
  for (const l of linhas) {
    const f = l.fracao === null ? (l.porPeca ? 'por peça' : '—') : `${(l.fracao * 100).toFixed(2)}%`;
    const deve = l.caminho === 'encaixado' && l.movidas.length > 0;
    let p = '—';
    if (l.caminho === 'assado') {
      if (l.peca === null) p = 'SEM MEDIDA';
      else if (CARREGADOR_NA_BASE[l.arma]) p = `isenta (${l.peca.verts}v)`;
      else if (l.peca.verts < PISO_PECA) p = `${l.peca.verts}v — NADA`;
      else p = `${l.peca.verts}v ${l.peca.coincide === null ? '' : `${(l.peca.coincide * 100).toFixed(0)}% do corpo`}`;
    }
    console.log(`  ${l.arma.padEnd(12)} ${l.familia.padEnd(10)} ${l.caminho.padEnd(11)} ${(l.movidas.join(',') || '—').slice(0, 25).padEnd(26)} ${(deve ? (l.temParts ? 'sim' : 'NÃO') : '—').padEnd(6)} ${f.padEnd(8)} ${(l.skin === null ? '—' : String(l.skin)).padEnd(5)} ${p}`);
  }
  console.log('');
  for (const f of falhas) console.log(`  ✗ ${f.regra} ${f.arma}: ${f.msg}`);
  for (const s of semMedida) console.log(`  ? SEM MEDIDA ${s.arma}: ${s.msg}`);
  const julgadas = linhas.length - semMedida.length;
  console.log(`\n  ${julgadas - new Set(falhas.map((f) => f.arma)).size}/${julgadas} armas MEDIDAS com o vínculo de peça móvel íntegro`
    + `${semMedida.length ? ` · ${semMedida.length} sem medida (produto não construído aqui)` : ''}\n`);
}

if (MUT) {
  /* A régua denuncia a si mesma: o mutante TEM de reprovar — e reprovar a arma
     que ele mutou. Mutante que morde no alvo errado não guarda nada (foi o que
     aconteceu com os três de caixa quando a ak virou golden em 11/09). */
  const alvo = MUT === 'listadivergente' ? 'carbine' : MUT_ASSADO.has(MUT) ? 'm4' : 'ak';
  if (!falhas.some((f) => f.arma === alvo)) {
    console.error(`MUTANTE ${MUT} PASSOU — a régua não morde em ${alvo}`);
    process.exit(1);
  }
  console.log(`mutante ${MUT}: reprovou ${alvo} como devia`);
  process.exit(0);
}

process.exit(falhas.length ? 1 : 0);
