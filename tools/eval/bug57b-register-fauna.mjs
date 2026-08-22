/* Registra fauna do córrego (BUG-57) no mint-assets.json — uso único, frente B.
   node tools/eval/bug57b-register-fauna.mjs */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const entries = {
  'jacare-corrego': {
    assetId: 'ks77b4qhsj4an75taq2612yxfx8cqcts',
    chatUrl: 'https://mint.gg/chat/ph71907xmzehws02vnam630e6n8cpypj',
    displayName: 'Blocky Belly Caiman (jacaré-do-córrego)',
    notes: 'BUG-57 fauna fy_corrego. Mint text-to-3D (projeto First Project, 18/08/2026); otimizado em tools/optimize-ambient-fauna.mjs (WebP 256², dedup/prune) a partir de references/glb/jacare_corrego_mint.glb. Estático: pipeline Mint de animação é humanoide e não aplicou em quadrúpede (tentativa 18/08 falhou limpo). Escala de mundo: 0,998 m comprimento no GLB; integrar com scale 1.8 => ~1,8 m (plans/21-FAUNA-CORREGO.md). Ficha: plans/21-FAUNA-CORREGO.md. Referências: references/fauna-corrego/.',
  },
  'capivara-corrego': {
    assetId: 'ks79v4k2gay9czmby61jjed1718cp93p',
    chatUrl: 'https://mint.gg/chat/ph74kf2engyr4skt5kxkwxxrgd8cqmqt',
    displayName: 'Sleepy Brown Rodent (capivara do córrego)',
    notes: 'BUG-57 fauna fy_corrego. Mint text-to-3D (projeto First Project, 18/08/2026); otimizado em tools/optimize-ambient-fauna.mjs (WebP 256², dedup/prune) a partir de references/glb/capivara_corrego_mint.glb. Estático (idem jacaré). Escala de mundo: 0,998 m comprimento no GLB; integrar com scale ~1.05 => ~1,05 m comp × 0,61 m altura de bbox (plans/21-FAUNA-CORREGO.md). Ficha e referências idem jacaré.',
  },
};

const registry = JSON.parse(readFileSync('mint-assets.json', 'utf8'));
for (const [id, meta] of Object.entries(entries)) {
  const file = `public/models/ambient/${id.replace('-corrego', '_corrego')}.glb`;
  const finalSha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  registry.assets[id] = {
    artifactType: 'model/gltf-binary',
    files: [file],
    source: { kind: 'mint-model', ...meta },
    processing: {
      provider: 'mint',
      model: 'mint text-to-3d (normalized original_glb)',
      tools: ['mint.gg', 'tools/optimize-ambient-fauna.mjs'],
      finalSha256,
    },
  };
  console.log(`${id}: ${file} sha256 ${finalSha256}`);
}
writeFileSync('mint-assets.json', JSON.stringify(registry, null, 2) + '\n');
console.log('mint-assets.json atualizado');
