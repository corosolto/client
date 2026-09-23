#!/usr/bin/env node
/* ============================================================================
   authored-ads-check.mjs — BOTÃO DIREITO DÁ SIGHT PICTURE, EM 16:9 E EM 3:2
   ----------------------------------------------------------------------------
   POR QUE EXISTE (BUG-75): o setAim() do pack era no-op — botão direito dava
   zoom de FOV e a arma nem se mexia. O ADS novo leva a ALÇA MEDIDA da arma
   Mint ao eixo da câmera; esta régua projeta a alça pela vmCamera no jogo real
   (?vmads=1 força o scoped do jogador) e cobra:
   AD1 alça a ≤3,5% do centro da tela (NDC), assentado o blend;
   AD2 a arma continua na tela (bbox ≥ 2% do quadro) — alinhar sem sumir.
   Roda nos DOIS aspectos que já morderam este repo: 16:9 e 3:2.
   Mutante: --mutante=sem-ads (remove ?vmads=1) tem que REPROVAR AD1 — prova
   que a medida discrimina quadril de mira. Arma com `ads.linhaDeMira` (vmconfig)
   mede alça e massa em vez dos sockets; --mutante=socket volta aos sockets e
   tem de reprovar AD1 ou AD3 nelas (o socket `sight` não está na linha).
   Entradas SEM pontos de mira (golden AK e pistola assada: nem wrap Mint
   nem SOCKET_MINT_*; a2396697 congelou a golden sem eles) só medem AD2 e
   imprimem NOTA explícita em AD1/AD3 — o ADS delas é o pull residual do
   vmconfig. Sob mutante, entrada não mensurável reprova (a régua nunca
   passa em silêncio).
   CEGUEIRA CONHECIDA (revisão L1, 23/09): com `ads.auto` o runtime leva ao
   centro EXATAMENTE o socket `sight` que o AD1 projeta, e alinha o eixo
   sight→muzzle que o AD3 mede. Os dois são verdadeiros por construção: md97,
   m92, mp5 e akm davam AD1 0,000 / AD3 0° com a mira 40–90 px fora da cruz, e o
   ADS automático do shotgun (sockets invertidos) também ficava verde. AD1/AD3
   provam que o PIPELINE do ADS rodou; a imagem de mira é o `eval:vm-mira`
   (tools/eval/vm-reguas-check.mjs --regua=mira), medida no quadro desenhado.
   Uso: node tools/eval/authored-ads-check.mjs [--armas=ak] [--porta=8156]
   Requer private-assets — régua LOCAL (check:vm), fora do check:fast.
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
if (MUT && !['sem-ads', 'socket'].includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);
const PORTA = arg('porta') || '8156';
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMAS = (arg('armas') || 'ak').split(',').filter(Boolean);
const VIEWPORTS = [
  { name: '16:9', width: 1280, height: 720 },
  { name: '3:2', width: 1290, height: 860 },
];

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const falhas = [];
const resultados = [];
let medidasNaLinha = 0;
function check(ok, label, evidence = '') {
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${label}${evidence ? ` — ${evidence}` : ''}`);
  if (!ok) falhas.push(label);
}

try {
  for (const id of ARMAS) {
    const familia = VM_WEAPON[id]?.family;
    if (!familia) throw new Error(`arma sem família paga: ${id}`);
    if (MUT === 'socket' && !VM_WEAPON[id]?.ads?.linhaDeMira) { console.info(`NOTA ${id}: sem linhaDeMira, mutante socket não se aplica`); continue; }
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const ads = MUT === 'sem-ads' ? '' : '&vmads=1';
      await page.goto(
        `${BASE}/?debug=1&auto=E&vmauthored=1&vmweapon=${id}&map=brasilia&armaslazy=0&vmready=${familia}${ads}`,
        { waitUntil: 'load', timeout: 180000 },
      );
      await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
      // A espera era por mint.active e a golden (a2396697) trouxe o assado SEM
      // wrap Mint nem sockets: a régua travava 120 s e check:vm morria. Espera
      // a ENTRY; pontos de mira ausentes viram nota explícita, não timeout.
      await page.waitForFunction(
        (weapon) => window.__authoredVm?.entry?.(weapon),
        id, { timeout: 120000 },
      );
      await page.waitForTimeout(1200);   // blend do ADS + draw assentados

      // Arma que declara a linha de mira (alça + massa) é medida nela, não no socket:
      // na md97/shotgun o socket `sight` fica abaixo da alça (fila L1). Mutante `socket` volta ao socket.
      const linha = MUT === 'socket' ? null : VM_WEAPON[id]?.ads?.linhaDeMira || null;
      const medida = await page.evaluate(({ weapon, linha }) => {
        const g = window.__game;
        const vm = window.__authoredVm;
        const entry = vm.entry(weapon);
        const wrap = entry.mint?.active || null;
        const metrics = wrap?.userData?.metrics || null;
        if (wrap) wrap.updateWorldMatrix(true, false);
        // GLB assado traz sockets nomeados; wrap ao vivo traz metrics medidas.
        const ponto = (kind) => {
          const socket = entry.sockets?.[kind];
          if (socket) {
            socket.updateWorldMatrix(true, false);
            return socket.getWorldPosition(entry.scene.position.clone());
          }
          if (!wrap || !metrics) return null;
          const p = (kind === 'sight' ? metrics.sight : metrics.muzzle).clone()
            .divideScalar(metrics.norm || 1);
          return wrap.localToWorld(p);
        };
        const naLinha = (local) => {
          const ref = entry.scene.getObjectByName(linha.ref);
          if (!ref) return null;
          ref.updateWorldMatrix(true, false);
          return ref.localToWorld(entry.scene.position.clone().set(...local));
        };
        const sight = linha ? naLinha(linha.alca) : ponto('sight');
        const muzzle = linha ? naLinha(linha.massa) : ponto('muzzle');
        // AD3: colinearidade REAL — ângulo entre (boca−alça), ou (massa−alça), e o eixo óptico.
        const medivel = Boolean(sight && muzzle);
        let ndcX = null;
        let ndcY = null;
        let barrelAngleDeg = null;
        if (medivel) {
          const axis = muzzle.clone().sub(sight).normalize();
          barrelAngleDeg = Math.acos(Math.min(1, Math.max(-1, -axis.z))) * 180 / Math.PI;
          const ndc = sight.clone().project(g.vmCamera);
          ndcX = ndc.x;
          ndcY = ndc.y;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        const v = entry.scene.position.clone();
        const canto = (x, y, z) => {
          v.set(x, y, z).project(g.vmCamera);
          minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
          minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        };
        if (wrap) {
          // wrap Mint é malha rígida: bbox por matrixWorld vale.
          wrap.traverse((o) => {
            if (!o.isMesh || !o.geometry || o.visible === false) return;
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
            const bb = o.geometry.boundingBox;
            for (const cx of [bb.min.x, bb.max.x]) {
              for (const cy of [bb.min.y, bb.max.y]) {
                for (const cz of [bb.min.z, bb.max.z]) {
                  v.set(cx, cy, cz).applyMatrix4(o.matrixWorld);
                  canto(v.x, v.y, v.z);
                }
              }
            }
          });
        } else {
          // Sem wrap (golden/pistola assada) a arma é SKINNED: bbox de malha
          // ficaria na bind pose. Os OSSOS é que estão na pose animada — a
          // caixa do esqueleto é a proxy honesta do que está na tela.
          entry.scene.updateWorldMatrix(true, true);
          entry.scene.traverse((o) => {
            if (!o.isSkinnedMesh || !o.skeleton) return;
            for (const bone of o.skeleton.bones) {
              bone.updateWorldMatrix(true, false);
              const p = bone.getWorldPosition(entry.scene.position.clone());
              canto(p.x, p.y, p.z);
            }
          });
        }
        const clip = (value) => Math.min(1, Math.max(-1, value));
        const areaFrac = ((clip(maxX) - clip(minX)) / 2) * ((clip(maxY) - clip(minY)) / 2);
        return { medivel, ndcX, ndcY, areaFrac, adsF: g.vm.adsF ?? 0, barrelAngleDeg, linhaDeMira: Boolean(linha) };
      }, { weapon: id, linha });

      const label = `${id}@${viewport.name}`;
      if (VM_WEAPON[id]?.ads?.linhaDeMira) medidasNaLinha += 1;
      if (linha && !medida.medivel) {
        check(false, `AD1 ${label}: linhaDeMira declarada e nó ${linha.ref} ausente na cena`);
      } else if (!medida.medivel) {
        // Golden AK e pistola assada não têm wrap Mint nem sockets de mira:
        // o ADS delas é o pull residual do vmconfig, sem alinhamento de alça.
        // Nota explícita — sob mutante isso vira falha para a régua nunca
        // passar em silêncio sem discriminar quadril de mira.
        const motivo = 'entrada sem wrap Mint nem sockets de mira (ADS = pull residual)';
        if (MUT === 'sem-ads') {
          check(false, `AD1 ${label}: mutante não discrimina`, motivo);
        } else {
          console.info(`NOTA AD1/AD3 ${label}: não mensurável — ${motivo}`);
        }
      } else {
        const offCenter = Math.hypot(medida.ndcX, medida.ndcY);
        if (MUT === 'socket') {
          check(offCenter > 0.035 || medida.barrelAngleDeg > 2, `AD1/AD3 ${label}: pelo socket a mira sai da linha (mutante)`,
            `desvio ${offCenter.toFixed(3)} · ${medida.barrelAngleDeg.toFixed(2)}°`);
        } else if (MUT === 'sem-ads') {
          check(offCenter > 0.035, `AD1 ${label}: SEM ads a alça fica fora do centro (mutante)`,
            `desvio ${offCenter.toFixed(3)}`);
        } else {
          check(offCenter <= 0.035, `AD1 ${label}: socket sight no eixo da câmera (pipeline; a imagem de mira é o eval:vm-mira)`,
            `desvio ${offCenter.toFixed(3)} (adsF ${medida.adsF.toFixed(2)})${VM_WEAPON[id]?.ads?.auto ? ' — ads.auto: verdadeiro por construção' : ''}`);
        }
      }
      check(medida.areaFrac >= 0.02, `AD2 ${label}: arma na tela`, `área ${(medida.areaFrac * 100).toFixed(1)}%`);
      if (medida.medivel && MUT !== 'socket') {
        if (MUT === 'sem-ads') {
          check(medida.barrelAngleDeg > 2, `AD3 ${label}: SEM ads o cano fica fora do eixo (mutante)`,
            `${medida.barrelAngleDeg.toFixed(1)}°`);
        } else {
          check(medida.barrelAngleDeg <= 2, `AD3 ${label}: cano COLINEAR com o eixo óptico`,
            `${medida.barrelAngleDeg.toFixed(2)}°`);
        }
      }
      const offCenterGravado = medida.medivel && Number.isFinite(medida.ndcX)
        ? Number(Math.hypot(medida.ndcX, medida.ndcY).toFixed(4)) : null;
      resultados.push({ id, viewport: viewport.name, ...medida, offCenter: offCenterGravado });
      await page.close();
    }
  }
} finally {
  await browser.close();
  srv.kill();
}
if (MUT === 'socket' && medidasNaLinha === 0) check(false, 'mutante socket não mediu nenhuma arma com linhaDeMira (use --armas=md97,shotgun)');

console.log(JSON.stringify({ mutante: MUT || null, resultados, falhas }, null, 2));
process.exit(falhas.length ? 1 : 0);
