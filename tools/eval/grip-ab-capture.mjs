/* A/B causal da pegada: mesmo GLB final, arma, pose, frame e câmera.

   A esquerda é o asset servido. À direita, a única mudança é a inversa exata da
   compactação distal (fator 0,45) + Curl_L/R zerados, igual ao mutante vermelho de
   select-mount.mjs. Uso:
     node tools/eval/grip-ab-capture.mjs <id> <arma> <saida.png>
*/
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [id, weapon, output] = process.argv.slice(2);
if (!id || !weapon || !output) throw new Error('uso: grip-ab-capture <id> <arma> <saida.png>');
const base = process.env.BASE || 'http://localhost:8123';
const glbPath = `public/models/characters/${id}.glb`;
const sha256 = createHash('sha256').update(readFileSync(glbPath)).digest('hex');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 720, height: 926 } });
await page.goto(`${base}/mounttest.html?char=${encodeURIComponent(id)}&w=${encodeURIComponent(weapon)}&play=walk&manual=1&view=tq&clean=1`, {
  waitUntil: 'domcontentloaded', timeout: 60000,
});
await page.waitForFunction(() => window.MOUNT_READY, null, { timeout:60000 });
for (let i=0;i<15;i++) await page.evaluate(() => window.STEP?.(1/30));
await page.evaluate(() => window.RENDER?.());
const clean = await page.screenshot();

const changed = await page.evaluate(async () => {
  const THREE = await import('three');
  const root = window.MOUNT_CTRL.model;
  let vertices = 0;
  root.traverse((object) => {
    if (object.isBone && /^Curl_[LR]/.test(object.name)) object.rotation.set(0, 0, 0);
    if (!object.isSkinnedMesh) return;
    const position = object.geometry.attributes.position;
    const joints = object.geometry.attributes.skinIndex;
    const weights = object.geometry.attributes.skinWeight;
    if (!position || !joints || !weights) return;
    const tips = new Map();
    object.skeleton.bones.forEach((bone, index) => {
      if (/^Curl_[LR]_Tip$/.test(bone.name)) {
        tips.set(index, new THREE.Vector3().setFromMatrixPosition(object.skeleton.boneInverses[index].clone().invert()));
      }
    });
    const point = new THREE.Vector3();
    const get = ['getX','getY','getZ','getW'];
    for (let vertex=0;vertex<position.count;vertex++) {
      let pivot=null, influence=0;
      for (let slot=0;slot<4;slot++) {
        const candidate=tips.get(joints[get[slot]](vertex));
        const weight=weights[get[slot]](vertex);
        if (candidate && weight>influence) { pivot=candidate; influence=weight; }
      }
      if (!pivot || influence<=1e-6) continue;
      point.fromBufferAttribute(position, vertex);
      const scale=1-influence*(1-0.45);
      point.sub(pivot).divideScalar(scale).add(pivot);
      position.setXYZ(vertex, point.x, point.y, point.z);
      vertices++;
    }
    position.needsUpdate=true;
    object.geometry.computeBoundingBox();
    object.geometry.computeBoundingSphere();
    object.skeleton.update();
  });
  root.updateMatrixWorld(true);
  window.RENDER?.();
  return vertices;
});
if (!changed) throw new Error('mutante não alterou nenhum vértice Curl_*_Tip');
const mutant = await page.screenshot();
await browser.close();

const label = (text, x) => ({
  input: Buffer.from(`<svg width="720" height="44"><rect width="720" height="44" fill="#111820"/><text x="20" y="30" fill="#e8f2f5" font-size="24" font-family="sans-serif">${text}</text></svg>`),
  left:x, top:0,
});
await sharp({ create:{ width:1440, height:970, channels:3, background:'#111820' } })
  .composite([
    { input:clean, left:0, top:44 }, { input:mutant, left:720, top:44 },
    label('SERVIDO — dedos compactados', 0), label('MUTANTE — mão reaberta', 720),
  ]).png().toFile(output);
writeFileSync(`${output}.json`, JSON.stringify({ id, weapon, pose:'walk frame 15', camera:'tq', glb:glbPath, sha256, mutation:'inverse compact factor 0.45 + Curl_L/R zero', changedVertices:changed }, null, 2));
console.log(`grip A/B -> ${output} (${changed} vértices; sha256 ${sha256.slice(0,12)}…)`);
