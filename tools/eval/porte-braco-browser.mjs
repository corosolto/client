/* porte-braco-browser.mjs — PORTE DE 1 MÃO NO CORPO MONTADO PELO JOGO (Chrome).
   ----------------------------------------------------------------------------
   POR QUE EXISTE (10/11, PR #1302): com pistola, Clóvis, Bebezão, Coronel e Boneca da
   Cristaleira abriam os braços em T, e a pistola do Bebê Reborn ficava 15 cm fora da palma.
   Nenhuma régua via isso. select-mount mede a palma e a arma, não o braço; os tetos dela
   vêm de corpos humanos.

   Causa, medida nos nós do GLB (bind) dos packs Studio 0.2.0/0.2.1: o joint *Arm desses rigs
   nasceu quase no punho (clavícula 0,28–0,45 m, braço 0,06–0,09 m; razão 3,9–7,5) e a malha do
   braço pesa no *Shoulder. Todo clipe gira um toco de 6 cm e o braço visível fica em T. Os packs
   0.2.2 reposicionaram os joints (razão 0,7–2,1) e o paliativo do client saiu.
   No Bebê Reborn a palma do idle1h nasce na altura do pescoço; a faixa vizinha do perfil do
   tronco pegava a cabeça de boneca (raio 0,37 m) e o empurrão TP_CLEAR tirava a pistola da mão.
   Correção em glbchars.js: TORSO_SEM_CABECA.

   Mede TODO id com GLB (legado + releases Studio), no caminho de jogo (preview:false) e no de
   vitrine (preview:true), 60 updates de 1/60 s, mesmo buildCharacterModel do pvSetChar:

     PB1  BRAÇO-T  arma de 1 mão (pistola): a mão da arma tem que SAIR do ombro, para baixo
          ou para a frente. porte = max(queda, frente) da mão em relação à origem do
          *Shoulder, em frações do comprimento da cadeia ombro→mão. Os 4 rigs em T mediam
          −0,02…0,05; o pior corpo são (esbirro, legado) mede 0,10. Piso 0,075 = meio do vão.
     PB2  FOLGA    arma própria do personagem (CHAR_WEAPON): empurrão da arma para fora do
          corpo ≤ 0,12. Antes: Bebê Reborn 0,152; o maior legítimo é o Saci com mp5, 0,094.
     PB3  JUNTA    clavícula/braço (distância *Shoulder→*Arm sobre *Arm→*ForeArm) ≤ 3 nos dois
          lados. Legado mede no máximo 0,87 e os Studio sãos no máximo 2,16; os rigs com o
          joint no punho mediam 3,9–7,5.

   MUTANTES (o vermelho tem que aparecer):
     --mutante=junta-no-punho  encurta o *Arm→*ForeArm direito do Clóvis para 15% → PB3 reprova.
     --mutante=torsocabeca     ?torsocabeca=1 volta a cabeça ao perfil → PB2 reprova o Bebê Reborn.

   Sem STUDIO_PACK_ROOT (ou sem algum pacote fixado instalado) sai 78 = NÃO MEDIDO, nunca verde.
   Porta: PORTA ou a 1ª livre a partir de 9481. Rode sob with-browser-lock.sh.
   uso: node tools/eval/porte-braco-browser.mjs [--mutante=junta-no-punho|torsocabeca] [--ids=a,b] [--out=arquivo.json] */
import { execSync, spawn } from 'node:child_process';
import net from 'node:net';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CHARACTER_RELEASES } from '../../public/js/data/content-releases.js';

const NAO_MEDIDO = 78;
const ROOT = join(import.meta.dirname, '../..');
const RAIZ = process.env.STUDIO_PACK_ROOT;
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const MUT = arg('mutante') || null;
const QUERY = { 'junta-no-punho': '', torsocabeca: 'torsocabeca=1' };
if (MUT && !(MUT in QUERY)) throw new Error(`mutante desconhecido: ${MUT}`);
const IDS = (arg('ids') || '').split(',').filter(Boolean);
const OUT = arg('out');

const PISO_PORTE = 0.075;
const TETO_EMPURRAO = 0.12;
const TETO_RAZAO_JUNTA = 3;

if (!RAIZ) {
  console.log('UNRUN: STUDIO_PACK_ROOT ausente — os corpos Studio não foram medidos (não é verde).');
  process.exit(NAO_MEDIDO);
}
const faltando = Object.values(CHARACTER_RELEASES).filter((p) => !existsSync(join(RAIZ, p.manifestUrl.replace(/^\/packs\//, ''))));
if (faltando.length) {
  console.log(`UNRUN: pacotes fixados ausentes em ${RAIZ}: ${faltando.map((p) => `${p.id}@${p.version}`).join(', ')} (não é verde).`);
  process.exit(NAO_MEDIDO);
}

const livre = (p) => new Promise((ok) => {
  const s = net.createServer().once('error', () => ok(false)).listen(p, '127.0.0.1', () => s.close(() => ok(true)));
});
let PORTA = process.env.PORTA;
for (let p = 9481; !PORTA && p < 9900; p++) if (await livre(p)) PORTA = String(p);
const BASE = `http://127.0.0.1:${PORTA}`;

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

const servidor = spawn(process.execPath, ['tools/eval/serve.mjs', PORTA], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, STUDIO_PACK_ROOT: RAIZ } });
process.on('exit', () => { try { servidor.kill(); } catch { /* já saiu */ } });
let pronto = false;
for (let i = 0; i < 240 && !pronto; i++) {
  try { pronto = (await fetch(`${BASE}/eval-character.html`)).ok; } catch { /* subindo */ }
  if (!pronto) await new Promise((r) => setTimeout(r, 500));
}
if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}),   // padrão: Chromium do Playwright
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.goto(`${BASE}/eval-character.html?debug=1${MUT && QUERY[MUT] ? `&${QUERY[MUT]}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
const alvos = IDS.length ? IDS : await page.evaluate(async () => {
  const C = await import('./js/characters.js'); const G = await import('./js/glbchars.js');
  return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
});

const medidas = [];
for (const id of alvos) {
  medidas.push(await page.evaluate(async ([cid, mut]) => {
    const THREE = await import('three');
    const G = await import('./js/glbchars.js'); const C = await import('./js/characters.js');
    const def = C.CHARACTERS.find((c) => c.id === cid);
    try { await G.preloadCharacterAssets([cid]); } catch (e) { return { id: cid, erro: `preload: ${e?.code || e?.message || e}` }; }
    if (!G.hasModel(cid)) return { id: cid, erro: 'sem GLB carregado' };
    const monta = (weaponId, preview) => {
      const m = G.buildCharacterModel(def, { weaponId, preview });
      const cena = new THREE.Scene(); cena.add(m.group);
      for (let i = 0; i < 60; i++) m.ctrl.update(1 / 60, 0, false, 0);
      cena.updateMatrixWorld(true);
      return m;
    };
    const r = { id: cid, arma: C.charWeapon(cid) };
    for (const preview of [false, true]) {
      const m = monta('pistol', preview);
      const model = m.ctrl.tpMount?.model;
      if (!model) return { id: cid, erro: 'sem mount' };
      const ossos = {};
      model.traverse((o) => { if (o.isBone && !ossos[o.name]) ossos[o.name] = o; });
      const W = (n) => ossos[n].getWorldPosition(new THREE.Vector3());
      const cadeia = W('RightShoulder').distanceTo(W('RightArm')) + W('RightArm').distanceTo(W('RightForeArm'))
        + W('RightForeArm').distanceTo(W('RightHand'));
      // espaço do modelo: +Z frente, +Y cima (mesma convenção de select-mount)
      const sh = model.worldToLocal(W('RightShoulder')), mao = model.worldToLocal(W('RightHand'));
      const c = cadeia / model.getWorldScale(new THREE.Vector3()).x;
      const queda = (sh.y - mao.y) / c, frente = (mao.z - sh.z) / c;
      r[preview ? 'vitrine' : 'jogo'] = { clipe: m.ctrl.curName, queda: +queda.toFixed(3), frente: +frente.toFixed(3), porte: +Math.max(queda, frente).toFixed(3) };
      if (!preview) {
        // PB3: razão no corpo montado (distâncias de mundo não dependem da pose)
        if (mut === 'junta-no-punho' && cid === 'clovis-fora-do-ar') { ossos.RightForeArm.position.multiplyScalar(0.15); model.updateMatrixWorld(true); }
        r.razaoJunta = Math.max(...['Right', 'Left'].map((l) => W(`${l}Shoulder`).distanceTo(W(`${l}Arm`)) / W(`${l}Arm`).distanceTo(W(`${l}ForeArm`))));
        r.razaoJunta = +r.razaoJunta.toFixed(2);
      }
      m.group.removeFromParent();
    }
    const propria = monta(C.charWeapon(cid), false);
    r.empurrao = +(propria.ctrl.tpMount?.empurrao || 0).toFixed(3);
    propria.group.removeFromParent();
    return r;
  }, [id, MUT]));
}
await browser.close();

const falhas = [];
for (const r of medidas) {
  if (r.erro) { falhas.push(`${r.id}: ERRO ${r.erro}`); continue; }
  for (const modo of ['jogo', 'vitrine']) {
    if (!(r[modo].porte >= PISO_PORTE)) falhas.push(`PB1 BRAÇO-T ${r.id} (${modo}, ${r[modo].clipe}): porte ${r[modo].porte} < ${PISO_PORTE} (queda ${r[modo].queda}, frente ${r[modo].frente})`);
  }
  if (!(r.empurrao <= TETO_EMPURRAO)) falhas.push(`PB2 FOLGA ${r.id} (${r.arma}): empurrão ${r.empurrao} > ${TETO_EMPURRAO}`);
  if (!(r.razaoJunta <= TETO_RAZAO_JUNTA)) falhas.push(`PB3 JUNTA ${r.id}: clavícula/braço ${r.razaoJunta} > ${TETO_RAZAO_JUNTA} (joint *Arm no punho)`);
}
if (erros.length) falhas.push(`erros de página: ${[...new Set(erros)].join(' | ')}`);

console.log(`\n=== PORTE DE 1 MÃO — ${medidas.length} corpos${MUT ? ` (mutante=${MUT})` : ''} ===`);
console.log('id                        porte jogo  porte vitrine  empurrão  clav/braço');
for (const r of [...medidas].sort((a, b) => (a.jogo?.porte ?? -9) - (b.jogo?.porte ?? -9)).slice(0, 12)) {
  if (r.erro) { console.log(`${r.id.padEnd(26)}ERRO ${r.erro}`); continue; }
  console.log(`${r.id.padEnd(26)}${String(r.jogo.porte).padStart(10)}${String(r.vitrine.porte).padStart(15)}${String(r.empurrao).padStart(10)}  ${r.razaoJunta}`);
}
console.log(`maior clavícula/braço: ${Math.max(...medidas.filter((r) => !r.erro).map((r) => r.razaoJunta))}`);
console.log('(12 menores portes; --out grava todos)');
if (OUT) writeFileSync(OUT, `${JSON.stringify({ gerado: new Date().toISOString(), mutante: MUT, piso: PISO_PORTE, teto: TETO_EMPURRAO, medidas }, null, 1)}\n`);
if (falhas.length) console.log(`\nVERMELHO (${falhas.length}):\n  ${falhas.join('\n  ')}`);
/* Com mutante, sair 0 só quando a régua MORDEU nos corpos que o mutante quebra. */
if (MUT) {
  const alvo = MUT === 'junta-no-punho' ? ['PB3 JUNTA clovis-fora-do-ar:'] : ['PB2 FOLGA bebe-reborn '];
  const mordeu = alvo.every((p) => falhas.some((f) => f.startsWith(p)));
  console.log(mordeu ? `\nMUTANTE ${MUT} REPROVADO, como esperado.` : `\nMUTANTE ${MUT} PASSOU: a régua não morde.`);
  process.exit(mordeu ? 0 : 1);
}
if (falhas.length) process.exit(1);
console.log('\nVERDE: PB1 BRAÇO-T, PB2 FOLGA e PB3 JUNTA.');
process.exit(0);
