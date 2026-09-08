set -e
for id in mariabonita saci lampiao bandeirante boto cuca curupira; do
  echo "=== $id ==="
  node tools/retarget-glb.mjs public/models/anims/mixamo public/models/characters/$id.glb public/models/anims/$id 2>&1 | tail -1
  node tools/ground-anims.mjs $id 2>&1 | tail -1
  node tools/strip-curl-tracks.mjs public/models/anims/$id/*.glb 2>&1 | tail -1
done
echo "PIPELINE COMPLETO"
