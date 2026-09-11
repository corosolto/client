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

   O QUE ELA NÃO FAZ, DE PROPÓSITO
   Não julga se a caixa está no lugar certo — isso é pixel, é
   `vm-arsenal-frames.mjs` + revisão humana. Ela cobra a existência do vínculo e
   a sanidade dele: caixa que não pega vértice nenhum é decorativa, e caixa que
   pega a arma inteira arranca o corpo junto com o pente. Régua que passa por
   vacuidade não mede nada — é a armadilha nº 1 desta casa.

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
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const RAIZ = process.cwd();

/* Só as armas que o jogador empunha. `vmconfig` tem entradas que sobraram do
   enxugamento 26 → 20 de 31/08 e não estão em `WEAPON_IDS`. Lido do texto para
   não importar `weapons.js`, que puxa o Three. */
const JOGAVEIS = new Set(
  (/WEAPON_IDS\s*=\s*\[([\s\S]*?)\]/.exec(
    fs.readFileSync(path.join(process.cwd(), 'public/js/weapons.js'), 'utf8'),
  )?.[1] || '').match(/'([a-z0-9_]+)'/g)?.map((t) => t.slice(1, -1)) || [],
);

/* Qual caminho de viewmodel a arma toma — é o que decide se ela DEVE uma caixa:
   só o encaixado passa por `attachMintWeapon`/`hidePackGun`. Espelha
   `entryKeyFor` (`public/js/authoredvm.js:240-246`). */
const MUT_CAIXA = new Set(['semparts', 'caixavazia', 'caixatudo']);
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

    linhas.push({ arma, familia, caminho, movidas, skin, temParts: Boolean(parts?.mag?.box), fracao: frac?.fracao ?? null });
  }
  return linhas;
}

function avaliar(linhas) {
  const falhas = [];
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
    if (l.caminho !== 'encaixado') continue;
    if (!l.temParts) {
      falhas.push({ regra: 'VM-C1', arma: l.arma, msg: `família ${l.familia} move ${l.movidas.join('/')} na recarga, mas a arma não declara parts.mag — a mão puxa o nada` });
      continue;
    }
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
  return falhas;
}

const linhas = await medir();
const falhas = avaliar(linhas);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ mutante: MUT || null, armas: linhas.length, falhas }, null, 2));
} else {
  console.log('\n  arma         família    caminho     peças movidas na recarga   parts  caixa    skin no pente');
  console.log('  ' + '-'.repeat(98));
  for (const l of linhas) {
    const f = l.fracao === null ? '—' : `${(l.fracao * 100).toFixed(2)}%`;
    const deve = l.caminho === 'encaixado' && l.movidas.length > 0;
    console.log(`  ${l.arma.padEnd(12)} ${l.familia.padEnd(10)} ${l.caminho.padEnd(11)} ${(l.movidas.join(',') || '—').slice(0, 25).padEnd(26)} ${(deve ? (l.temParts ? 'sim' : 'NÃO') : '—').padEnd(6)} ${f.padEnd(8)} ${l.skin === null ? '—' : l.skin}`);
  }
  console.log('');
  for (const f of falhas) console.log(`  ✗ ${f.regra} ${f.arma}: ${f.msg}`);
  console.log(`\n  ${linhas.length - new Set(falhas.map((f) => f.arma)).size}/${linhas.length} armas com o vínculo de peça móvel íntegro\n`);
}

if (MUT) {
  // A régua denuncia a si mesma: o mutante TEM de reprovar.
  if (!falhas.some((f) => f.arma === 'ak')) {
    console.error(`MUTANTE ${MUT} PASSOU — a régua não morde`);
    process.exit(1);
  }
  console.log(`mutante ${MUT}: reprovou como devia`);
  process.exit(0);
}

process.exit(falhas.length ? 1 : 0);
