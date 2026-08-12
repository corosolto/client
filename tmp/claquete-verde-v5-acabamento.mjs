/* claquete-verde-v5-acabamento.mjs — régua geométrica da máscara de materiais.
   Reprova a máscara da v4 (gola larga salmão, triângulos salmão nos ombros,
   antebraço esquerdo pelado e direito vestido) medindo TRIÂNGULOS de pele fora
   das zonas legítimas, no GLB servido (posições cruas = metros, Y-up).

   Zonas medidas no mesh cru (meshy-a-native-rig.glb):
     gola:      |x|<0.16 e 1.26<y<1.44  → v4 tinha 157 tris de pele aqui
     ombros:    0.16≤|x|<0.50 e 1.37<y<1.44 → v4 tinha 21
     antebraço: 0.30<|x|≤0.52 e 1.05<y<1.40 → v4 tinha ~283 só no esquerdo
   Mãos (|x|>0.52) são pele legítima — mas têm que ser SIMÉTRICAS.

   uso: node tmp/claquete-verde-v5-acabamento.mjs <modelo.glb>  (exit 1 se reprova) */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const file = process.argv[2];
if (!file) throw new Error('uso: node tmp/claquete-verde-v5-acabamento.mjs <modelo.glb>');
const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file);

const tris = { SKIN: [], HAIR: [] };
for (const n of doc.getRoot().listNodes()) {
  const mesh = n.getMesh();
  if (!mesh) continue;
  for (const prim of mesh.listPrimitives()) {
    const mat = (prim.getMaterial()?.getName() || '').replace(/^CV[23]_/, '');
    if (!(mat in tris)) continue;
    const P = prim.getAttribute('POSITION');
    const idx = prim.getIndices();
    const N = idx ? idx.getCount() : P.getCount();
    const at = (k) => (idx ? idx.getScalar(k) : k);
    const e1 = [], e2 = [], e3 = [];
    for (let k = 0; k + 2 < N; k += 3) {
      P.getElement(at(k), e1); P.getElement(at(k + 1), e2); P.getElement(at(k + 2), e3);
      tris[mat].push([(e1[0] + e2[0] + e3[0]) / 3, (e1[1] + e2[1] + e3[1]) / 3, (e1[2] + e2[2] + e3[2]) / 3]);
    }
  }
}
const skin = tris.SKIN;
/* Falha silenciosa é a classe de defeito mais cara desta base (lição 5): modelo
   sem material de pele reconhecível NÃO passa por vacuidade — a régua declara
   que não mediu. */
if (!skin.length) {
  console.log(JSON.stringify({ file, erro: 'nenhum triângulo CV3_/CV2_SKIN encontrado — régua cega para este modelo', checks: { peleMedida: false } }, null, 1));
  process.exit(1);
}
const naGola = skin.filter(p => Math.abs(p[0]) < 0.16 && p[1] > 1.26 && p[1] < 1.44).length;
const nosOmbros = skin.filter(p => Math.abs(p[0]) >= 0.16 && Math.abs(p[0]) < 0.50 && p[1] > 1.37 && p[1] < 1.44).length;
const nosAntebracos = skin.filter(p => Math.abs(p[0]) > 0.30 && Math.abs(p[0]) <= 0.52 && p[1] > 1.05 && p[1] < 1.40).length;
const maoE = skin.filter(p => p[0] > 0.52).length;
const maoD = skin.filter(p => p[0] < -0.52).length;
const assimetria = Math.abs(maoE - maoD) / Math.max(1, Math.max(maoE, maoD));

const metrics = { peleNaGola: naGola, peleNosOmbros: nosOmbros, peleNosAntebracos: nosAntebracos, peleMaoEsq: maoE, peleMaoDir: maoD, assimetriaMaos: +assimetria.toFixed(3) };
const checks = {
  golaCoberta: naGola === 0,
  ombrosCobertos: nosOmbros === 0,
  antebracosVestidos: nosAntebracos === 0,
  maosSimetricas: maoE > 0 && maoD > 0 && assimetria <= 0.15,
};
console.log(JSON.stringify({ file, metrics, checks }, null, 1));
if (!Object.values(checks).every(Boolean)) process.exit(1);
