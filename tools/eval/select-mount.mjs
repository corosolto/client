/* select-mount.mjs — A ARMA NO CORPO, MEDIDA NO CAMINHO DA TELA DE SELEÇÃO.

   POR QUE EXISTE (04-05/08): o dono reportou "arma por trás do corpo" (jozo, trapfunk,
   coach), "pistola segurada esquisita" (cadequinha, palhacomal, bonzo com a mão de apoio
   no ar, pagodeiro) e "dollynho torto SÓ na seleção". A régua que existia para isso —
   tp-mount-probe.mjs §5 (TP-FRENTE) — deu "ok" nos 44 com o defeito NA TELA, porque mede
   a pose de clipe cru, não a pose ASSENTADA da seleção (ctrl.update 60 frames + mount
   live + IK). Régua cega não conta: esta mede no mesmo caminho do select-inflate.mjs,
   que é o mesmo do pvSetChar (main.js).

   MÉTRICAS, todas em ESPAÇO DO MODELO (frente = +Z, direita = +X — a MESMA convenção do
   empurrão do mount em glbchars.js ~l.505), personagem normalizado a ~1,72 m:
     frenteZ   z do centro da arma. Negativo = arma ATRÁS do plano do corpo.
     canoZ     componente Z (frente) do cano no espaço do modelo (cano autorado em +Z
               da weaponModel). Perto de -1 = apontando pra trás.
     dMaoR     distância mão direita -> bbox da arma (m). Mão que "segura" encosta.
     dMaoL     idem mão esquerda, SÓ para arma de 2 mãos (oneHanded=false).
     apoioY    SÓ para 1 mão: altura da mão esquerda ACIMA do quadril (m). "Mão no ar"
               do bonzo = apoio levantado sem função.
     dedoP90   extensão P90 dos vértices distais a partir do pivô Curl_*_Tip, no bind.
               Para os três rigs Meshy que nasceram com mãos planas, a compactação
               distal reduz ~0,19 m para 0,08–0,10 m e fecha a pegada servida.
               Referência visual versionada:
               tools/eval/char_grip_curl_ab.png; reprodução:
               node tools/finger-curl-sweep.mjs <id> shotgun /tmp/curl front.

   TETO COM PROCEDÊNCIA (mesma regra do select-inflate): o pior dos personagens que o
   dono NÃO flagrou e usa como bons — mandrake (2 mãos), padati e raul (1 mão) — com 25%
   de folga. Rode com --ref para imprimir a procedência.

   TESTE DE MUTAÇÃO (régua que não morde não existe):
     --mutate=flip   readiciona o flip de 180° da p90 (o defeito real que o TP_FLIP_Y
                     vazio consertou) -> canoZ inverte nos portadores de p90, VERMELHO.
     --mutate=tras   desloca o mount 0,35 m para -Z (arma atrás, o defeito do coach
                     pré-re-rig) -> frenteZ despenca, VERMELHO em todos.
     --mutate=dedos  desfaz matematicamente a compactação distal e zera Curl_L/R ->
                     reabre as mãos dos rigs Meshy e reprova GRIP-FINGER.
     --mutate=sem-preview mede o porte funcional no lugar do porte de exibição e prova
                     que a régua acompanha o mesmo `preview:true` usado por pvSetChar.

   uso: node tools/eval/select-mount.mjs [ids] [--ref] [--mutate=flip|tras|dedos|sem-preview] [--out=arquivo.json]
   --out persiste tanto o verde quanto o mutante vermelho na pasta de evidência do asset.
*/
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const MUT = (args.find((a) => a.startsWith('--mutate')) || '').split('=')[1] || null;
const EVIDENCE_OUT = (args.find((a) => a.startsWith('--out=')) || '').slice('--out='.length) || null;
const SO_REF = args.includes('--ref');
const IDS = (args.find((a) => !a.startsWith('-')) || '').split(',').filter(Boolean);
const BASE = process.env.BASE || 'http://localhost:8123';
const EXTRA = process.env.EXTRA ? `&${process.env.EXTRA.replace(/^&/, '')}` : '';

/* Elogiados/não-flagrados que ancoram o teto. O dono flagrou explicitamente:
   jozo, trapfunk, coach (atrás); cadequinha, palhacomal, bonzo, pagodeiro (grip);
   dollynho (torto na seleção). mandrake ele elogia desde sempre; padati e raul
   passaram no crivo dele em 04/08 depois do re-rig. */
const REFS_2H = ['mandrake'];
const REFS_1H = ['padati', 'raul'];
const FOLGA = 1.25;
// Teto com procedência visual: A/B 360×463 do Programador sem compactação dá mão
// completamente espalmada e dedoP90=0,189 m; compactado dá punho fechado e 0,081 m.
// Motoca/Doidinho aprovados medem 0,087/0,103 m. Os tetos 0,105/0,12 preservam 21%/16%
// de folga e ainda separam os mutantes abertos em 0,111/0,132 m. Figuras:
// programador_grip_curl_ab.png e
// char_grip_curl_ab.png. A mutação abaixo volta à geometria aberta, não apenas à constante.
const FINGER_EXTENT_MAX = new Map([
  ['programador-virado', 0.12],
  ['motoca-cachorro-loko', 0.105],
  ['doidinho-bairro', 0.12],
]);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
// Esta sonda nao mede menu. O shell virtual do serve.mjs contem apenas o import map;
// depender de `index.astro` fazia a playlist do menu (BUG-19) bloquear a medicao por
// 120 s antes de qualquer personagem. Cada GLB segue aguardado no preload abaixo.
await page.goto(`${BASE}/eval-character.html?debug=1${EXTRA}`, { waitUntil: 'domcontentloaded', timeout: 120000 });

const alvos = IDS.length ? IDS : await page.evaluate(async () => {
  const C = await import('./js/characters.js');
  const G = await import('./js/glbchars.js');
  return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
});

const out = [];
for (const id of alvos) {
  const r = await page.evaluate(async ([cid, mut]) => {
    const THREE = await import('three');
    const G = await import('./js/glbchars.js');
    const C = await import('./js/characters.js');
    const def = C.CHARACTERS.find((c) => c.id === cid);
    if (!def) return { id: cid, erro: 'sem definição de personagem' };
    await G.preloadCharacterAssets([cid]);
    if (!G.hasModel(cid)) return { id: cid, erro: 'sem GLB carregado' };
    const wid = C.charWeapon(cid);
    const m = G.buildCharacterModel(def, { weaponId: wid, preview: mut !== 'sem-preview' });
    if (!m) return { id: cid, erro: 'buildCharacterModel retornou null' };
    const scene = new THREE.Scene(); scene.add(m.group);
    for (let i = 0; i < 60; i++) m.ctrl.update(1 / 60, 0, false, 0);
    scene.updateMatrixWorld(true);
    const tp = m.ctrl.tpMount;
    if (!tp || !tp.mount || !tp.mount.children.length) return { id: cid, erro: 'sem mount/arma' };
    const gun = tp.mount.children[0];
    if (mut === 'flip') { gun.rotateY(Math.PI); scene.updateMatrixWorld(true); }
    if (mut === 'tras') {
      const off = new THREE.Vector3(0, 0, -0.35).applyQuaternion(tp.model.getWorldQuaternion(new THREE.Quaternion()));
      gun.position.add(gun.parent.worldToLocal(gun.getWorldPosition(new THREE.Vector3()).add(off)).sub(gun.position));
      scene.updateMatrixWorld(true);
    }
    if (mut === 'dedos') {
      tp.model.traverse((o) => {
        if (o.isBone && /^Curl_[LR]/.test(o.name)) o.rotation.set(0, 0, 0);
        if (!o.isSkinnedMesh) return;
        const pos = o.geometry.attributes.position;
        const joints = o.geometry.attributes.skinIndex;
        const weights = o.geometry.attributes.skinWeight;
        if (!pos || !joints || !weights) return;
        const tips = new Map();
        o.skeleton.bones.forEach((bone, index) => {
          if (/^Curl_[LR]_Tip$/.test(bone.name)) {
            const bind = o.skeleton.boneInverses[index].clone().invert();
            tips.set(index, new THREE.Vector3().setFromMatrixPosition(bind));
          }
        });
        const p = new THREE.Vector3();
        const get = ['getX', 'getY', 'getZ', 'getW'];
        for (let i = 0; i < pos.count; i++) {
          let pivot = null, influence = 0;
          for (let k = 0; k < 4; k++) {
            const candidate = tips.get(joints[get[k]](i));
            const weight = weights[get[k]](i);
            if (candidate && weight > influence) { pivot = candidate; influence = weight; }
          }
          if (!pivot || influence <= 1e-6) continue;
          p.fromBufferAttribute(pos, i);
          // Inversa exata de compact-curl-tips fator 0,45:
          // p' = pivot + (1 - w*(1-fator)) * (p-pivot).
          const scale = 1 - influence * (1 - 0.45);
          p.sub(pivot).divideScalar(scale).add(pivot);
          pos.setXYZ(i, p.x, p.y, p.z);
        }
        pos.needsUpdate = true;
        o.geometry.computeBoundingBox();
        o.geometry.computeBoundingSphere();
      });
      scene.updateMatrixWorld(true);
    }
    const model = tp.model;
    const toM = (v) => model.worldToLocal(v.clone());
    const bb = new THREE.Box3().setFromObject(gun);
    /* frenteZ mede a ÂNCORA DA PALMA (origem do mount em mundo), não o centro da arma:
       o centro carrega o offset do MODELO da arma (ak +0,10, mp5 +0,05…) e a régua
       reprovava por geometria de arma, não por defeito de pose. A palma é comparável
       entre todos. */
    const centro = toM(tp.mount.getWorldPosition(new THREE.Vector3()));
    // cano: +Z autorado da weaponModel, levado a mundo e expresso no espaço do modelo
    const qG = gun.getWorldQuaternion(new THREE.Quaternion());
    const qM = model.getWorldQuaternion(new THREE.Quaternion());
    const cano = new THREE.Vector3(0, 0, 1).applyQuaternion(qG).applyQuaternion(qM.invert()).normalize();
    let maoR = null, maoL = null, hips = null;
    model.traverse((o) => {
      if (!o.isBone) return;
      if (!maoR && o.name === 'RightHand') maoR = o;
      if (!maoL && o.name === 'LeftHand') maoL = o;
      if (!hips && o.name === 'Hips') hips = o;
    });
    const dist = (bone) => {
      const p = bone.getWorldPosition(new THREE.Vector3());
      return bb.distanceToPoint(p);
    };
    /* dMaoL v2 (05/08): a v1 media do PUNHO (origem do osso) até a bbox da arma — e
       reprovava mão GRANDE com o grip perfeito: blackmetal dava punho a 0,086 m da bbox
       com a PALMA a 0,001 m do alvo do guarda-mão (probe-ikl). O contato que o código
       garante (solveCCDIK leva a palma ao gp.fore) é o que a régua tem que medir: quando
       ctrl.ikL existe, dMaoL = palma medida -> alvo no guarda-mão. Sem ikL de propósito
       (IK_L_SKIP: mascote de braço-toco, dollynho/gotinha/et/canarinho — IK neles vira mão
       gigante flutuando), a mão de apoio segue o clipe e MÃO-L não se aplica: null. */
    const mascote = G.IK_L_SKIP.has(cid);
    let dL = null;
    if (m.ctrl.ikL) {
      const alvo = new THREE.Vector3().copy(m.ctrl.ikL.fore);
      m.ctrl.ikL.gun.localToWorld(alvo);
      const palma = new THREE.Vector3().copy(m.ctrl.ikL.endOffset);
      m.ctrl.ikL.end.localToWorld(palma);
      dL = +palma.distanceTo(alvo).toFixed(3);
    } else if (!m.ctrl.oneHanded && !mascote) {
      dL = +dist(maoL).toFixed(3);   // 2 mãos SEM ikL (osso não achado): mede como antes
    }
    const mL = toM(maoL.getWorldPosition(new THREE.Vector3()));
    const mH = toM(hips.getWorldPosition(new THREE.Vector3()));
    const curls = [];
    const fingerExtents = [];
    model.traverse((o) => {
      if (o.isBone && /^Curl_[LR]/.test(o.name)) curls.push(Math.hypot(o.rotation.x, o.rotation.y, o.rotation.z));
      if (!o.isSkinnedMesh) return;
      const pos = o.geometry.attributes.position;
      const joints = o.geometry.attributes.skinIndex;
      const weights = o.geometry.attributes.skinWeight;
      if (!pos || !joints || !weights) return;
      const tips = new Map();
      o.skeleton.bones.forEach((bone, index) => {
        if (/^Curl_[LR]_Tip$/.test(bone.name)) {
          tips.set(index, new THREE.Vector3().setFromMatrixPosition(o.skeleton.boneInverses[index].clone().invert()));
        }
      });
      const p = new THREE.Vector3();
      const get = ['getX', 'getY', 'getZ', 'getW'];
      for (let i = 0; i < pos.count; i++) {
        let pivot = null, influence = 0;
        for (let k = 0; k < 4; k++) {
          const candidate = tips.get(joints[get[k]](i));
          const weight = weights[get[k]](i);
          if (candidate && weight > influence) { pivot = candidate; influence = weight; }
        }
        if (!pivot || influence <= 1e-6) continue;
        p.fromBufferAttribute(pos, i);
        fingerExtents.push(p.distanceTo(pivot));
      }
    });
    fingerExtents.sort((a, b) => a - b);
    const fingerP90 = fingerExtents.length
      ? fingerExtents[Math.floor((fingerExtents.length - 1) * 0.90)]
      : null;
    return {
      id: cid, arma: wid, oneHanded: !!m.ctrl.oneHanded,
      mascote,
      palmaY: +centro.y.toFixed(3),
      frenteZ: +centro.z.toFixed(3),
      canoZ: +cano.z.toFixed(3),
      dMaoR: +dist(maoR).toFixed(3),
      dMaoL: dL,
      apoioY: +(mL.y - mH.y).toFixed(3),
      gripCurl: curls.length ? +Math.min(...curls).toFixed(3) : null,
      fingerP90: fingerP90 == null ? null : +fingerP90.toFixed(3),
    };
  }, [id, MUT]);
  if (r) out.push(r);
}
await browser.close();

const byId = Object.fromEntries(out.map((r) => [r.id, r]));
const pior = (ids, campo, fn) => Math.max(...ids.filter((i) => byId[i] && !byId[i].erro).map((i) => fn(byId[i][campo])));
/* Teto por métrica = pior valor entre os elogiados × folga (ou ÷ folga quando a métrica
   é "quanto maior melhor"). frenteZ e canoZ: mínimo aceitável = pior elogiado ÷ folga.
   dMao*: máximo = pior elogiado × folga. apoioY: máximo = pior elogiado(1h) × folga. */
const refs = [...REFS_2H, ...REFS_1H].filter((i) => byId[i] && !byId[i].erro);
if (!MUT && refs.length !== REFS_2H.length + REFS_1H.length) {
  const ausentes = [...REFS_2H, ...REFS_1H].filter((i) => !byId[i] || byId[i].erro);
  console.error(`ERRO: referências ausentes (${ausentes.join(', ')}); sem elas os tetos viram null e a régua não mede.`);
  process.exit(2);
}
/* Com --mutate o teto vem CONGELADO da última execução limpa (mesma regra do
   select-inflate): o mutante desloca os refs junto e senão a barra desce com ele. */
const congelado = MUT ? JSON.parse((await import('node:fs')).readFileSync('tools/eval/select_mount.json', 'utf8')).teto : null;
const teto = congelado || {
  frenteZmin: +(Math.min(...refs.map((i) => byId[i].frenteZ)) / FOLGA).toFixed(3),
  canoZmin: +(Math.min(...refs.map((i) => byId[i].canoZ)) / FOLGA).toFixed(3),
  dMaoRmax: +(pior(refs, 'dMaoR', (v) => v) * FOLGA).toFixed(3),
  /* dMaoL agora é PALMA->alvo (v2): o mandrake mede 0,002 m e 0,002×1,25 viraria um teto
     de 2,5 mm — hair-trigger de solver, não critério de contato. Piso absoluto de 0,02 m:
     palma a menos de 2 cm do guarda-mão É contato visual em qualquer câmera do jogo. */
  dMaoLmax: +Math.max(pior(REFS_2H, 'dMaoL', (v) => v) * FOLGA, 0.02).toFixed(3),
  apoioYmax: +(pior(REFS_1H, 'apoioY', (v) => v) * FOLGA).toFixed(3),
};
if (SO_REF) {
  for (const i of refs) console.log('ref', i, JSON.stringify(byId[i]));
  console.log('teto:', JSON.stringify(teto));
}
const falha = (r) => {
  const f = [];
  if (r.frenteZ < teto.frenteZmin) f.push('ATRÁS');
  if (r.canoZ < teto.canoZmin) f.push('CANO');
  if (r.dMaoR > teto.dMaoRmax) f.push('MÃO-R');
  if (!r.oneHanded && r.dMaoL != null && r.dMaoL > teto.dMaoLmax) f.push('MÃO-L');
  if (r.oneHanded && r.apoioY > teto.apoioYmax) f.push('APOIO-NO-AR');
  const fingerMax = FINGER_EXTENT_MAX.get(r.id);
  if (fingerMax != null && !(r.fingerP90 <= fingerMax)) f.push('GRIP-FINGER');
  return f;
};
console.log('\n=== ARMA NO CORPO — CAMINHO DA TELA DE SELEÇÃO ===');
console.log('teto:', JSON.stringify(teto), MUT ? `(mutante=${MUT})` : '');
console.log('id              arma      1h   frenteZ  canoZ  dMaoR  dMaoL  apoioY  curl dedoP90 veredito');
let reprovados = 0;
const resultados = [];
for (const r of out.sort((a, b) => (falha(b).length - falha(a).length) || a.id.localeCompare(b.id))) {
  if (r.erro) { reprovados++; resultados.push({ ...r, falhas: ['ERRO'] }); console.log(`✗ ${r.id.padEnd(14)} ERRO: ${r.erro}`); continue; }
  const f = falha(r);
  resultados.push({ ...r, falhas: f });
  if (f.length) reprovados++;
  console.log(`${f.length ? '✗' : ' '} ${r.id.padEnd(14)}${r.arma.padEnd(10)}${r.oneHanded ? '1h' : '2h'}  ${String(r.frenteZ).padStart(7)} ${String(r.canoZ).padStart(6)} ${String(r.dMaoR).padStart(6)} ${String(r.dMaoL).padStart(6)} ${String(r.apoioY).padStart(7)} ${String(r.gripCurl).padStart(5)} ${String(r.fingerP90).padStart(7)}  ${f.join(',') || 'ok'}`);
}
const ausentes = alvos.filter((id) => !out.some((r) => r.id === id));
for (const id of ausentes) console.log(`✗ ${id.padEnd(14)} ERRO: sem medição`);
reprovados += ausentes.length;
console.log(`\nREPROVADOS: ${reprovados}/${alvos.length}`);
if (EVIDENCE_OUT) {
  writeFileSync(EVIDENCE_OUT, JSON.stringify({
    gerado: new Date().toISOString(), mutante: MUT, teto,
    personagens: resultados, reprovados,
  }, null, 2));
  console.log(`-> ${EVIDENCE_OUT}`);
}
if (!MUT) {
  writeFileSync('tools/eval/select_mount.json', JSON.stringify({ gerado: new Date().toISOString(), mutante: null, teto, personagens: out }, null, 1));
  console.log('-> tools/eval/select_mount.json');
} else {
  console.log('(mutante: JSON limpo preservado)');
}
process.exitCode = reprovados ? 1 : 0;
