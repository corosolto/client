/* MAPTEX: toda textura externa declarada pelos mapas precisa existir no caminho servido.
   Caso real: a captura de 09/08 mostrou caixas cinzas no Escadão. O browser registrava
   `Texture marked for update but no image data found` porque dois mapas pediam
   `/img/textures/zinco.webp`, enquanto o arquivo versionado é `tex_zinco.webp`.
   O TextureLoader conserva a textura vazia nesse erro, portanto o fallback procedural
   não salva o material. `--mutante=ausente` injeta o caminho antigo e prova o vermelho. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const dir = path.join(ROOT, 'public/js');
const mutant = process.argv.includes('--mutante=ausente');
const refs = [];

for (const name of fs.readdirSync(dir).filter((n) => /^map_.*\.js$/.test(n))) {
  let src = fs.readFileSync(path.join(dir, name), 'utf8');
  if (mutant && name === 'map_escadao.js') src += "\n'/img/textures/zinco.webp'\n";
  for (const m of src.matchAll(/["']\/img\/textures\/([^"']+)["']/g)) {
    refs.push({ file: name, asset: m[1] });
  }
}

const missing = refs.filter(({ asset }) => !fs.existsSync(path.join(ROOT, 'public/img/textures', asset)));
for (const x of missing) console.error(`✗ MAPTEX ${x.file}: /img/textures/${x.asset} não existe`);
if (missing.length) process.exit(1);
console.log(`✓ MAPTEX ${refs.length} referências externas existem no disco`);
