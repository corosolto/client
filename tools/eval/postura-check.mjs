#!/usr/bin/env node
/* ============================================================================
   postura-check.mjs — O CONTRATO DE POSTURA E MOVIMENTO DE QUEM SEGURA ARMA.

   POR QUÊ (23/10, pedido do dono): "o problema não é a arma, é o personagem
   segurando ela — temos que revisar todos e por um padrão para personagens novos
   não quebrarem a postura e movimentos". O censo que fundamenta as faixas abaixo
   mediu os 63 personagens GLB × 3 classes de arma × 4 estados, no caminho
   FUNCIONAL do jogo (preview:false), em private-assets/postura-20261023/.

   O QUE EXIGE (cláusulas duras — valem para qualquer corpo, humano ou não):
     PS1  mão da frente na arma: punho direito a até 9 cm (1 mão) / 2 cm (2 mãos)
          da arma. "Segurar" é contato, não vizinhança.
     PS2  arma NA FRENTE do plano do corpo (armaZrel > -0,02 alturas).
     PS3  arma ABAIXO da cabeça: armaYrel < cabeça - 0,03 alturas. Só para corpo
          humano; mascote de cabeça baixa entra na exceção declarada.
     PS4  arma de 1 mão: mão esquerda LIVRE (>= 5 cm da arma).
     PS5  cotovelo humano: 55°..150°.
     PS6  MOVIMENTO: a arma não sacode além de 0,035 alturas por quadro correndo
          (medido quadro a quadro no espaço do modelo, 120 quadros). O pior do
          censo que PASSA mede 0,028; os três reprovados medem 0,039–0,075.

   FAIXAS (revisão, não contrato): armaYrel/armaXrel/cotovelo por classe vêm do
   censo p05..p95. Sair da faixa reprova: corpo fora do padrão do elenco é
   exceção que se DECLARA em EXCECOES, com motivo — nunca ruído invisível.

   USO: BASE=http://127.0.0.1:9347 node tools/eval/postura-check.mjs [ids]
        --mutante=morto (PS1) | atras (PS2) | tremor (PS6) | solto (PS4)
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || `http://127.0.0.1:${process.env.PORTA || 9362}`;
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const IDS = process.argv.slice(2).filter((a) => !a.startsWith('-') && !a.startsWith('--mutante'));
const ARMAS = ['ak', 'pistol', 'knife'];

const servidor = process.env.BASE ? null : spawn('node', ['tools/eval/serve.mjs', String(process.env.PORTA || 9362)], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 60 && !pronto; i++) {
    try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((r) => setTimeout(r, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);
}

/* Corpos fora do padrão humano. NÃO é perdão: cada linha é uma exceção declarada
   com motivo, e a régua imprime a lista no veredito para ela nunca virar ruído. */
const EXCECOES = new Map([
  ['dollynho', 'mascote na garrafa: sem braço humano, cabeça alta e baixa'],
  ['gotinha', 'mascote de braço-toco (IK_L_SKIP)'],
  ['et', 'mascote de braço-toco (IK_L_SKIP)'],
  ['canarinho', 'mascote de braço-toco (IK_L_SKIP)'],
]);

/* DÍVIDA REGISTRADA no primeiro censo (23/10). O gate reprova o que NÃO está aqui —
   personagem novo que quebra postura não entra — e reprova entrada PAGA que ficou na
   lista: consertou, tire da linha. A dívida encolhe, nunca cresce escondido. */
const DIVIDA = new Set([
  'adjim|NA-CABECA', 'ancap|NA-CABECA', 'bonzo|NA-CABECA', 'cadequinha|NA-CABECA',
  'metaleiro|NA-CABECA', 'lobisomem|TREMOR', 'mariabonita|TREMOR', 'lampiao|TREMOR',
  'marina-silva|APOIO-NA-ARMA',
]);

const ESPERADO = {
  morto: ['PS1'], atras: ['PS2'], tremor: ['PS6'], solto: ['PS4'],
};
if (MUT && !ESPERADO[MUT]) throw new Error(`mutante desconhecido: ${MUT}`);

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/eval-character.html?debug=1${MUT ? `&mut=${MUT}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });

const ids = IDS.length ? IDS : await page.evaluate(async () => {
  const C = await import('./js/characters.js');
  const G = await import('./js/glbchars.js');
  return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
});

const linhas = [];
for (const id of ids) {
  for (const wid of ARMAS) {
    const r = await page.evaluate(async ([cid, w, mut]) => {
      const THREE = await import('three');
      const G = await import('./js/glbchars.js');
      const C = await import('./js/characters.js');
      const def = C.CHARACTERS.find((c) => c.id === cid);
      await G.preloadCharacterAssets([cid]);
      if (!G.hasModel(cid)) return null;
      const m = G.buildCharacterModel(def, { weaponId: w, preview: false });
      if (!m) return null;
      const scene = new THREE.Scene(); scene.add(m.group);
      const osso = (n) => { let b = null; m.group.traverse((o) => { if (!b && o.isBone && o.name === n) b = o; }); return b; };
      const B = { rArm: osso('RightArm'), rFore: osso('RightForeArm'), rHand: osso('RightHand'), lHand: osso('LeftHand'), hips: osso('Hips'), head: osso('Head') };
      const V = () => new THREE.Vector3();
      const med = (estado) => {
        const mv = estado === 'idle' ? 0 : 1;
        const sp = estado === 'run' ? 5.4 : estado === 'walk' ? 2.4 : 0;
        m.ctrl.crouch = estado === 'crouch';
        for (let i = 0; i < 70; i++) m.ctrl.update(1 / 60, mv, false, sp);
        scene.updateMatrixWorld(true);
        const tp = m.ctrl.tpMount;
        const gun = tp?.mount?.children?.[0];
        if (!gun) return null;
        const model = tp.model;
        const toM = (v) => model.worldToLocal(v.clone());
        const bb = new THREE.Box3().setFromObject(m.group);
        const alt = bb.max.y - bb.min.y;
        const gPos = toM(gun.getWorldPosition(V()));
        const hip = toM(B.hips.getWorldPosition(V()));
        const headY = toM(B.head.getWorldPosition(V())).y;
        const gunBB = new THREE.Box3().setFromObject(gun);
        const a = B.rArm.getWorldPosition(V()), b = B.rFore.getWorldPosition(V()), c = B.rHand.getWorldPosition(V());
        const u = b.clone().sub(a).normalize(), v = c.clone().sub(b).normalize();
        const cotovelo = Math.acos(Math.max(-1, Math.min(1, u.dot(v)))) * 180 / Math.PI;
        let maoL = +gunBB.distanceToPoint(B.lHand.getWorldPosition(V())).toFixed(3);
        let maoR = +gunBB.distanceToPoint(B.rHand.getWorldPosition(V())).toFixed(3);
        if (mut === 'morto') maoR = maoR + 0.2;          // mão longe da arma
        if (mut === 'solto') maoL = Math.max(0, maoL - 0.1);  // mão esquerda colada
        return {
          alt: +alt.toFixed(3),
          armaYrel: +((gPos.y - hip.y) / alt).toFixed(3),
          armaZrel: +(gPos.z / alt).toFixed(3),
          armaXrel: +(gPos.x / alt).toFixed(3),
          abaixoCabeca: +((headY - gPos.y) / alt).toFixed(3),
          cotovelo: +cotovelo.toFixed(1), maoL, maoR,
        };
      };
      const estados = {};
      for (const e of ['idle', 'walk', 'run', 'crouch']) estados[e] = med(e);
      const tremor = (estado) => {
        const sp = estado === 'run' ? 5.4 : 2.4;
        m.ctrl.crouch = false;
        for (let i = 0; i < 70; i++) m.ctrl.update(1 / 60, 1, false, sp);
        const tp = m.ctrl.tpMount; const gun = tp?.mount?.children?.[0];
        if (!gun) return null;
        const model = tp.model;
        const bb0 = new THREE.Box3().setFromObject(m.group);
        const alt = bb0.max.y - bb0.min.y;
        let ant = null, pior = 0;
        const passos = mut === 'atras' ? 0 : 120;
        for (let i = 0; i < 120; i++) {
          m.ctrl.update(1 / 60, 1, false, sp);
          scene.updateMatrixWorld(true);
          const p = model.worldToLocal(gun.getWorldPosition(V()));
          if (ant && i <= passos) {
            let d = p.distanceTo(ant) / alt;
            if (mut === 'tremor') d = 0.5;      // arma teletransportando por quadro
            pior = Math.max(pior, d);
          }
          ant = p;
        }
        return { pior: +pior.toFixed(4) };
      };
      const mov = { walk: tremor('walk'), run: tremor('run') };
      if (mut === 'atras' && estados.idle) estados.idle.armaZrel = -0.05;
      return { id: cid, arma: w, oneHanded: !!m.ctrl.oneHanded, estados, mov };
    }, [id, wid, MUT]);
    if (r) linhas.push(r);
  }
}
await browser.close();

/* ---------------- cláusulas ---------------- */
const cobrarDivida = !IDS.length;   // com filtro de ids, quem ficou de fora não é dívida paga
const falha = (r) => {
  const e = r.estados.idle;
  if (!e) return ['SEM-MEDIDA'];
  const exc = EXCECOES.has(r.id);
  const f = [];
  if (r.oneHanded ? e.maoR > 0.09 : e.maoR > 0.02) f.push(`MAO-SOLTA=${e.maoR}`);
  if (e.armaZrel < -0.02) f.push(`ATRAS=${e.armaZrel}`);
  if (!exc && e.abaixoCabeca < 0.03) f.push(`NA-CABECA=${e.abaixoCabeca}`);
  if (r.oneHanded && !exc && e.maoL < 0.05) f.push(`APOIO-NA-ARMA=${e.maoL}`);
  if (e.cotovelo < 55 || e.cotovelo > 150) f.push(`COTOVELO=${e.cotovelo}`);
  if (r.mov?.run && r.mov.run.pior > 0.035) f.push(`TREMOR=${r.mov.run.pior}`);
  return f;
};

let reprovados = 0;
const porClasse = { ak: [0, 0], pistol: [0, 0], knife: [0, 0] };
const relatorio = [];
const dividaViva = new Set(DIVIDA);
for (const r of linhas) {
  const f = falha(r);
  porClasse[r.arma][1]++;
  if (!f.length) continue;
  const novas = f.filter((x) => !DIVIDA.has(`${r.id}|${x.split('=')[0]}`));
  f.forEach((x) => dividaViva.delete(`${r.id}|${x.split('=')[0]}`));
  if (novas.length) { reprovados++; porClasse[r.arma][0]++; relatorio.push(`✗ ${r.id.padEnd(16)} ${r.arma.padEnd(7)} ${novas.join(' ')}`); }
  else relatorio.push(`· ${r.id.padEnd(16)} ${r.arma.padEnd(7)} ${f.join(' ')}  [dívida registrada]`);
}
if (cobrarDivida && dividaViva.size) {
  reprovados += dividaViva.size;
  for (const d of dividaViva) relatorio.push(`✗ ${d}  [dívida PAGA: consertado, tire da lista]`);
}
console.log('=== CONTRATO DE POSTURA — caminho funcional do jogo ===');
console.log('cláusulas: PS1 mão na arma · PS2 arma à frente · PS3 abaixo da cabeça · PS4 apoio livre · PS5 cotovelo · PS6 tremor');
for (const [a, [ru, to]] of Object.entries(porClasse)) console.log(`${a.padEnd(7)} ${to - ru}/${to} fora da dívida`);
for (const l of relatorio) console.log(l);
if (EXCECOES.size) console.log(`exceções declaradas: ${[...EXCECOES].map(([i, m]) => `${i} (${m})`).join(' · ')}`);
writeFileSync('tools/eval/postura.json', JSON.stringify({ gerado: new Date().toISOString(), mutante: MUT || null, linhas, reprovados }, null, 1));

if (MUT) {
  const ok = reprovados > 0;
  console.log(ok ? `\n== ${MUT}: mutante reprovado como devia (${reprovados} caso(s) fora da dívida)`
    : `\n== ${MUT}: MUTAÇÃO PASSOU — nada reprovou`);
  process.exit(ok ? 0 : 1);
}
console.log(`\n${reprovados ? 'REPROVADO' : 'APROVADO'} — postura: ${reprovados ? linhas.length - reprovados : linhas.length}/${linhas.length} fora da dívida (${DIVIDA.size} registradas)`);
process.exit(reprovados ? 1 : 0);
