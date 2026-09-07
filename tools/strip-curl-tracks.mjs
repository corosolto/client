/* REMOVE as tracks de `Curl_*` dos GLB de clipe.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTE ARQUIVO EXISTE (o defeito que ele conserta, medido)

   Os ossos `Curl_L`/`Curl_R` NÃO são ossos de animação: eles são o ATUADOR de runtime
   do fechamento da mão. Quem escreve neles é o `buildCharacterModel` (glbchars.js, bloco
   "Grip curl"), UMA vez, com o ângulo calculado da espessura medida da arma:

       for (const b of curlRs) b.rotation.x += curl;

   Isso acontece na construção. Se o CLIPE também tiver canal para esses ossos, o
   `mixer.update()` sobrescreve o valor a cada quadro e o fechamento da mão morre —
   a arma fica na pata aberta.

   MEDIDO NO ELENCO (tools/eval, 06/09): 14 dos 45 personagens têm rig com `Curl_*` e
   todos os 14 têm canal de `Curl_*` nos clipes retargetados. Em 13 deles o canal é
   IDENTIDADE (|delta| máximo = 0.0000 rad): inerte, escreve o próprio rest, não faz mal
   além de matar o grip curl. O Lobisomem é o ÚNICO com canal de verdade:

       lobisomem  Curl_R  |delta|max = 0.8763 rad   x=0.293  y=-0.544  z=-0.621
       (os outros 13)     |delta|max = 0.0000 rad

   E o que ele escreve não é fechamento de dedo: o eixo dominante é TORÇÃO (y/z), não o
   x do curl. É artefato do `retarget-glb.mjs`, que monta o delta de rotação de mundo
   (`srcW ⊗ srcRestW⁻¹ ⊗ tgtRestW`) para todo osso de nome igual — nos rigs humanos o
   rest do `Curl_*` da fonte e do alvo coincidem e o delta sai identidade; na pata do
   lobo eles divergem e o delta vira torção espúria numa folha que carrega 12,55% do
   peso de skin do modelo (a maior região de curl do elenco: P95 a 22,6 cm do osso,
   contra 15,0-20,5 cm dos outros 13).

   O ESTRAGO, na régua do portão (`npm run eval:select`, mesmo caminho da tela de seleção):
       com a torção do clipe   p99 0,694   ruins/1e4 36,2   REPROVA (teto 0,675 / 23,6)
       sem as tracks de Curl   p99 0,554   ruins/1e4 16,9   PASSA
   Era o 13º reprovado num portão que declara no máximo 12.

   POR QUE REMOVER E NÃO REGERAR
   Regerar o retarget refaria TAMBÉM o contato de pata assado pelo
   `ground-lobisomem-anims.mjs` (Y da raiz, quadro a quadro) e a invariante CHR3 junto.
   Remover o canal é cirúrgico: preserva quadro a quadro tudo que o retarget acertou e
   tira só o que o runtime tem que mandar. A recorrência fica barrada na origem —
   `retarget-glb.mjs` passou a nunca emitir `Curl_*`.

   USO
     node tools/strip-curl-tracks.mjs public/models/anims/lobisomem/*.glb
     node tools/strip-curl-tracks.mjs --check public/models/anims/lobisomem.glb
       --check  não escreve; sai 1 se sobrou canal de `Curl_*` em algum clipe
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import * as THREE from '../public/vendor/three.module.js';

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const arquivos = args.filter((a) => !a.startsWith('-'));
if (!arquivos.length) {
  console.error('uso: node tools/strip-curl-tracks.mjs [--check] <clipe.glb...>');
  process.exit(1);
}

const io = new NodeIO();
const ALVO = /^Curl_/;
let totalRemovidos = 0;
const sobraram = [];

for (const arq of arquivos) {
  const doc = await io.read(arq);
  let removidos = 0;
  let piorDelta = 0;

  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const no = ch.getTargetNode();
      if (!no || !ALVO.test(no.getName())) continue;

      /* MEDE ANTES DE TIRAR: o relatório tem que dizer o que estava lá, senão a remoção
         vira fé. `delta` é a rotação do canal contra o rest do próprio nó — é ela que
         deforma a malha, não o quaternion absoluto. */
      const samp = ch.getSampler();
      if (ch.getTargetPath() === 'rotation' && samp) {
        const out = samp.getOutput().getArray();
        const rest = new THREE.Quaternion().fromArray(no.getRotation());
        const inv = rest.clone().invert();
        const q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i + 3 < out.length; i += 4) {
          q.set(out[i], out[i + 1], out[i + 2], out[i + 3]);
          e.setFromQuaternion(inv.clone().multiply(q), 'XYZ');
          piorDelta = Math.max(piorDelta, Math.hypot(e.x, e.y, e.z));
        }
      }

      if (CHECK) { sobraram.push(`${arq} · ${anim.getName()} · ${no.getName()} (|delta|max ${piorDelta.toFixed(4)})`); continue; }
      /* O sampler morre junto com o canal; o accessor de tempo é COMPARTILHADO entre as
         tracks do mesmo clipe, então quem limpa órfão é o prune — restrito a ACCESSOR
         de propósito: o prune completo varre nó-folha vazio, e as folhas deste rig
         (`head_end`, `headfront`, `Curl_*`) precisam continuar existindo como OSSO,
         que é onde o grip curl do runtime escreve. */
      ch.dispose();
      if (samp) samp.dispose();
      removidos++;
    }
  }

  if (CHECK) continue;
  if (removidos) {
    await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR] }));
    await io.write(arq, doc);
    totalRemovidos += removidos;
  }
  console.log(`${arq.split('/').slice(-2).join('/').padEnd(34)} ${String(removidos).padStart(3)} canais Curl removidos` +
    (piorDelta > 0 ? `  (|delta|max era ${piorDelta.toFixed(4)} rad)` : '  (eram identidade)'));
}

if (CHECK) {
  if (sobraram.length) {
    console.error(`✗ ${sobraram.length} canal(is) de Curl_* ainda no disco — o clipe sobrescreve o grip curl do runtime:`);
    for (const s of sobraram) console.error('   ' + s);
    process.exit(1);
  }
  console.log(`✓ ${arquivos.length} arquivo(s) sem canal de Curl_*`);
} else {
  console.log(`\n${totalRemovidos} canais removidos em ${arquivos.length} arquivo(s).`);
}
