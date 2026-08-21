// Compressão meshopt dos clipes de animação (models/anims) — 570 arquivos, 35,6 MB, a maior
// pasta de modelo do jogo e a única sem otimizador nenhum (characters tem optimize-tribos,
// props o optimize-props, fpvm o g2r14c-compress, weapons agora tem optimize-armas).
// Aqui NÃO há malha skinned: os arquivos carregam só amostrador de animação (medido: 27,5 MB
// de 35,6 são keyframe, 0 de geometria). O veto do optimize-tribos a quantizar malha skinned
// não se aplica — mas o desvio dos keyframes é medido em tools/eval/anims-desvio.mjs.
// EXIGE o decodificador vendorizado (public/vendor/addons/libs/meshopt_decoder.module.js):
// sem ele o GLB comprimido NÃO abre no jogo.
// Uso: node tools/optimize-anims.mjs [--seco]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const SECO = process.argv.includes('--seco');
const NIVEL = (process.argv.find((a) => a.startsWith('--nivel=')) || '=medium').split('=')[1];
const RAIZ = 'public/models/anims';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const arquivos = [];
(function varre(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) varre(p); else if (e.name.endsWith('.glb')) arquivos.push(p);
  }
})(RAIZ);

let antes = 0, depois = 0, jaFeitos = 0, falhos = 0;
for (const f of arquivos) {
  const a = statSync(f).size; antes += a;
  try {
    const doc = await io.read(f);
    if (doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === 'EXT_meshopt_compression')) {
      jaFeitos++; depois += a; continue;
    }
    /* A função `meshopt()` faz quantização + compressão (é o que o CLI roda); só criar a
       extensão comprime sem quantizar e rende metade. */
    await doc.transform(meshopt({ encoder: MeshoptEncoder, level: NIVEL }));
    if (!SECO) await io.write(f, doc);
    depois += SECO ? a : statSync(f).size;
  } catch (e) { falhos++; depois += a; console.warn(`  ! ${f}: ${String(e).split('\n')[0]}`); }
}
const mb = (b) => (b / 1048576).toFixed(1);
console.log(`${arquivos.length} arquivos · ${mb(antes)} -> ${mb(depois)} MB (${(100 - 100 * depois / antes).toFixed(1)}% menor)` +
  `${jaFeitos ? ` · ${jaFeitos} já comprimidos` : ''}${falhos ? ` · ${falhos} FALHARAM` : ''}`);
if (SECO) console.log('(--seco: nada foi escrito)');
