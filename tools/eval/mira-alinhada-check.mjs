#!/usr/bin/env node
/* ============================================================================
   mira-alinhada-check.mjs — A ARMA APONTA PARA ONDE A MIRA APONTA?

   POR QUÊ (28/10): jogador antigo (Gustavo): "a arma aponta pra um lado e a mira
   pro outro". Mede, no jogo de verdade, o eixo do cano da arma VISÍVEL contra o
   raio do tiro, em 1ª e 3ª pessoa, quadril e ADS, 16:9 e 3:2.

   O QUE MEDE, por arma × câmera × ADS × aspecto:
     ang  ângulo (°) entre o eixo do cano e o raio do tiro.
          1P: eixo = alça→boca (sockets da fábrica ou pontos da golden) no espaço da
              vmCamera; raio = −Z da câmera.
          3P: eixo = +Z da arma na mão do corpo; raio = yaw/pitch do tiro.
     px   distância (px, escala do aspecto nominal 1920×1080 / 1800×1200) entre o
          ponto para onde o cano aponta e a cruz. 1P: ponto de fuga do cano na
          vmCamera × centro. 3P: ponto do cano à distância do alvo (20 m) × cruz do DOM.

   EXIGE (MA1): 1P no ADS, cano a ≤ 1° do raio e ponto de fuga a ≤ 4 px da cruz;
   nas armas em linha de mira (adsEfetivo), também a boca a ≤ 4 px da cruz.
   Lê os sockets alça/boca, não a malha (a malha é o ads1p-linha-check).
   3P e quadril só são medidos: a 3P não tem pose de mira e o quadril tem toe-in aprovado.
   Mutante: --mutante=foco roda com ?ads1pfix=0 e TEM que reprovar MA1.

   Uso:
     node tools/eval/mira-alinhada-check.mjs [--armas=ak,m4] [--cams=first,third]
       [--qs=a=1&b=2] [--json=arq] [--fotos=dir] [--mutante=foco]
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { miraVeredito } from './gate-accept.mjs';
import { chromium } from 'playwright';
import { adsEfetivo, VM_FABRICA, VM_WEAPON } from '../../public/js/data/vmconfig.js';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const argvMira = process.argv.slice(2);
const USO_MIRA = '[--armas=ak,m4] [--cams=first,third] [--mutante=foco] [--qs=a=1] [--json=arq] [--fotos=dir] [--porta=N]';
const uso = (msg) => { console.error(`uso: ${USO_MIRA} — ${msg}`); process.exit(2); };
const CHAVES_ARG = ['armas', 'cams', 'mutante', 'qs', 'json', 'fotos', 'porta'];
if (argvMira.some((a) => !CHAVES_ARG.some((c) => a.startsWith(`--${c}=`)))) uso('opção desconhecida ou sem =valor');
const arg = (n, d = '') => {
  const v = argvMira.filter((a) => a.startsWith(`--${n}=`)).map((a) => a.slice(n.length + 3));
  if (v.length > 1) uso(`--${n}= duplicado`);
  if (v.length === 1 && !v[0]) uso(`--${n}= vazio`);
  return v[0] ?? d;
};
const ARMAS = arg('armas', 'ak,m4,mp5,p90,shotgun,pistol,deagle').split(',');
const CAMS = arg('cams', 'first,third').split(',');
if (!ARMAS.length || !CAMS.length) uso('armas/cams vazio não mede nada');
if (new Set(ARMAS).size !== ARMAS.length || new Set(CAMS).size !== CAMS.length) uso('armas/cams duplicados');
if (!CAMS.every((c) => ['first', 'third'].includes(c))) uso('cams desconhecidos (first,third)');
if (!ARMAS.every((a) => Object.hasOwn(VM_WEAPON, a))) uso('arma desconhecida');
const MUT = arg('mutante', '');
if (MUT && MUT !== 'foco') uso('mutante desconhecido (foco)');
const QS = [arg('qs'), MUT === 'foco' ? 'ads1pfix=0' : ''].filter(Boolean).join('&');
const FOTOS = arg('fotos');
const JSON_OUT = arg('json');
const portaArg = arg('porta', process.env.PORTA || '8515');
const PORTA = Number(portaArg);
if (!/^\d+$/.test(portaArg) || !Number.isSafeInteger(PORTA) || PORTA < 1 || PORTA > 65535) uso('porta inválida (1–65535)');
const BASE = process.env.BASE || `http://127.0.0.1:${PORTA}`;
// Viewport à metade do nominal (SwiftShader); px reportados na escala nominal.
const ASPECTOS = { '16x9': { w: 960, h: 540, k: 2 }, '3x2': { w: 900, h: 600, k: 2 } };

// Porta ocupada mediria a árvore de outra sessão (armadilha da 8123).
if (!process.env.BASE) await new Promise((ok, falha) => { const s = net.createServer().once('error', () => falha(new Error(`porta ${PORTA} ocupada`))).listen(PORTA, '127.0.0.1', () => s.close(ok)); });
const servidor = process.env.BASE ? null : spawn(process.execPath, ['tools/eval/serve.mjs', String(PORTA)], { cwd: root, stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
let pronto = false;
servidor?.once('exit', (c) => { if (!pronto) { console.error(`serve.mjs saiu (${c}) antes de responder`); process.exit(3); } });
for (let i = 0; i < 120 && !pronto; i++) {
  try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
  if (!pronto) await new Promise((r) => setTimeout(r, 500));
}
if (!pronto) { console.error(`infra: servidor não respondeu em ${BASE}`); process.exit(3); }
let browser;
try {
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
} catch (e) {
  console.error(`infra: browser não subiu (${e.message})`);
  process.exit(3);
}

const linhas = [];
try {
  for (const [nomeAsp, asp] of Object.entries(ASPECTOS)) {
    const page = await browser.newPage({ viewport: { width: asp.w, height: asp.h } });
    page.on('pageerror', (e) => console.log(`pageerror: ${e.message.slice(0, 160)}`));
    await page.goto(`${BASE}/?debug=1&auto=E,esquerdomacho&map=piscina_treta&vmqa=precision&bloom=0${QS ? `&${QS}` : ''}`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 120000 });
    await page.evaluate(() => { const g = window.__game; g.settings.quality = 'low'; g._applyQuality(); g._ensureVmPrecisionQa(); });
    for (const cam of CAMS) for (const arma of ARMAS) for (const ads of [false, true]) {
      await page.evaluate(({ arma, cam, ads }) => {
        const g = window.__game;
        window.__vmPrecisionQa.equip(arma);
        g.setCamView(cam);
        g.player.pitch = 0;
        g._scope(ads, true);
      }, { arma, cam, ads });
      try {
        await page.waitForFunction(({ arma, cam, ads }) => {
          const g = window.__game;
          if (g.player.weapon !== arma) return false;
          if (cam === 'first') { if (!g.vm.authored?.active(arma)) return false; if (ads && g.vm.adsF < 0.98) return false; if (!ads && g.vm.adsF > 0.02) return false; }
          else { const t = g.playerTP?.ctrl?.tpMount; if (!t?.mount?.children?.[0]) return false; if (g.playerTP.isGLB === false) return false; }
          return true;
        }, { arma, cam, ads }, { timeout: 30000 });
      } catch { linhas.push({ asp: nomeAsp, cam, arma, ads, erro: 'não ficou pronto' }); console.log(`${nomeAsp} ${cam} ${arma} ads=${ads}: não ficou pronto`); continue; }
      await page.waitForTimeout(700);
      const r = await page.evaluate(async ({ cam, k }) => {
        const THREE = await import('/vendor/three.module.js');
        const g = window.__game, W = innerWidth, H = innerHeight;
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const px = (ndc) => [(ndc.x + 1) / 2 * W, (1 - ndc.y) / 2 * H];
        if (cam === 'first') {
          const a = g.vm.authored, e = a.entry(g.player.weapon);
          const s = e?.adsSockets || e?.sockets;
          if (!s?.muzzle || !s?.sight) return { erro: 'sem sockets alça/boca' };
          e.scene.updateWorldMatrix(true, true);
          const vc = g.vmCamera; vc.updateMatrixWorld(true);
          const inv = vc.matrixWorldInverse;
          const boca = s.muzzle.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
          const alca = s.sight.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
          const dir = boca.clone().sub(alca).normalize();
          const ang = Math.acos(Math.max(-1, Math.min(1, -dir.z))) * 180 / Math.PI;
          // ponto de fuga do cano (dir no infinito) projetado pela vmCamera
          const fuga = dir.clone().multiplyScalar(1e4).applyMatrix4(vc.matrixWorld).project(vc);
          const [fx, fy] = px(fuga);
          const [mx, my] = px(boca.clone().applyMatrix4(vc.matrixWorld).project(vc));
          return { ang, px: Math.hypot(fx - W / 2, fy - H / 2) * k, dx: (fx - W / 2) * k, dy: (fy - H / 2) * k,
            massa: Math.hypot(mx - W / 2, my - H / 2) * k, fonte: e.adsSockets ? 'golden' : 'fab' };
        }
        const t = g.playerTP.ctrl.tpMount, gun = t.mount.children[0];
        g.playerTP.group.updateMatrixWorld(true);
        const dir = new THREE.Vector3(0, 0, 1).transformDirection(gun.matrixWorld);
        const eul = new THREE.Euler(g.player.pitch, g.player.yaw, 0, 'YXZ');
        const tiro = new THREE.Vector3(0, 0, -1).applyEuler(eul);
        const ang = Math.acos(Math.max(-1, Math.min(1, dir.dot(tiro)))) * 180 / Math.PI;
        const alvo = g._eyeWorld.clone().addScaledVector(tiro, 20);
        const pg = gun.getWorldPosition(new THREE.Vector3());
        const pc = pg.clone().addScaledVector(dir, pg.distanceTo(alvo));
        g.camera.updateMatrixWorld(true);
        const [cx, cy] = px(pc.clone().project(g.camera));
        const el = g.el.crosshair, r = el.getBoundingClientRect();
        const xx = r.left + r.width / 2, xy = r.top + r.height / 2;
        return { ang, px: Math.hypot(cx - xx, cy - xy) * k, dx: (cx - xx) * k, dy: (cy - xy) * k, cruz: [xx * k, xy * k] };
      }, { cam, k: asp.k });
      const linha = { asp: nomeAsp, cam, arma, ads, ...r };
      linhas.push(linha);
      console.log(`${nomeAsp} ${cam.padEnd(5)} ${arma.padEnd(8)} ${ads ? 'ADS ' : 'quad'}  ${r.erro || `cano ${r.ang.toFixed(1)}°  ${r.px.toFixed(0)} px (dx ${r.dx.toFixed(0)}, dy ${r.dy.toFixed(0)})${r.massa !== undefined ? `  massa ${r.massa.toFixed(0)} px` : ''}`}`);
      if (FOTOS) {
        fs.mkdirSync(FOTOS, { recursive: true });
        await page.addStyleTag({ content: '#crash-overlay,#aviso-software{display:none!important}' }).catch(() => {});
        await page.screenshot({ path: path.join(FOTOS, `${nomeAsp}-${cam}-${arma}-${ads ? 'ads' : 'quad'}.png`), timeout: 180000 });
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  servidor?.kill();
}
const emLinha = (arma) => adsEfetivo((VM_WEAPON[arma]?.golden ? VM_WEAPON : VM_FABRICA)[arma]?.ads, !QS.includes('ads1pfix=0'))?.estilo === 'linha';
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(linhas, null, 1));
const v = miraVeredito(linhas, { aspectos: Object.keys(ASPECTOS), cams: CAMS, armas: ARMAS, emLinha });
for (const l of v.ma1) console.log(`✗ MA1 ${l.asp} ${l.arma}: cano ${l.ang.toFixed(1)}° ${l.px.toFixed(0)} px, boca ${l.massa.toFixed(0)} px`);
for (const l of v.faltou) console.log(`✗ ${l.asp} ${l.arma}: ${l.erro}`);
for (const l of v.invalidas) console.log(`✗ ${l.asp} ${l.arma}: medida não finita (ang=${l.ang} px=${l.px} massa=${l.massa})`);
if (v.cob.dup.length || v.cob.missing.length || v.cob.extra.length)
  console.log(`✗ cobertura: dup=${v.cob.dup.length} faltando=${v.cob.missing.length} extra=${v.cob.extra.length}`);
if (MUT) {
  if (!v.prontas) {
    console.log(`mutante ${MUT}: matriz incompleta/inválida (faltou=${v.faltou.length} inválidas=${v.invalidas.length} cobertura=${JSON.stringify(v.cob.missing.length + v.cob.dup.length + v.cob.extra.length)}) — MA1 não resgata cenário faltante`);
    process.exit(1);
  }
  console.log(v.ma1.length ? `mutante ${MUT}: reprovou MA1 — a régua morde` : `mutante ${MUT}: NÃO reprovou — régua cega`);
  process.exit(v.ma1.length ? 0 : 1);
}
console.log(v.aprovado ? 'APROVA: no ADS 1P o cano aponta para a cruz' : `REPROVA: ${v.ma1.length + v.faltou.length + v.invalidas.length}`);
process.exit(v.aprovado ? 0 : 1);
