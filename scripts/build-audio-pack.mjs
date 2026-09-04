// Monta o PACOTE DE ÁUDIO de produção (audio-pack-vN.zip) a partir de public/audio/.
//
// POR QUE EXISTE (05-06/08, pré-repo-público): o pack v1 era de julho (4,3 MB) — todo som
// novo dava 404 em produção (BUG-19) — e os arquivos no disco carregam NOME de faixa/meme.
// Decisão do dono: o bundle leva TODOS os áudios que o jogo usa (vozes, rounds, SFX, menu
// e ingame), mas com **nomes binários** — nenhum título legível em URL, zip ou repo.
//
// O que entra:
//   · todo arquivo referenciado pelo public/audio/manifest.json, copiado para
//     audio/a/<sha1-16>.<ext>, com o manifesto REESCRITO para os nomes novos;
//   · menu-music/m01..mNN.mp3 como estão (o main.js referencia m01..m26 por padrão fixo
//     e os nomes já são opacos). TRACKS.txt (o mapa nome-real -> mNN) NÃO entra.
// O que NÃO entra: soundtrack/ (fontes com nome comercial), TRACKS.txt, qualquer arquivo
// não referenciado.
//
// Uso: node scripts/build-audio-pack.mjs <outDir>
//   -> <outDir>/pack/  (conteúdo) e <outDir>/audio-pack.zip
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const OUT = process.argv.filter((a) => !a.startsWith('--'))[2];
if (!OUT) { console.error('uso: node scripts/build-audio-pack.mjs <outDir> [--raiz=<dir de audio>]'); process.exit(1); }
const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
/* `--raiz=<dir>` troca a pasta de áudio de entrada. Mesma razão do flag homônimo em
   tools/gen-audio-manifest.mjs: a régua de alcance mede este empacotador numa fixture
   sintética. Sem o flag, nada muda. */
const RAIZ_AUDIO = (process.argv.find((a) => a.startsWith('--raiz=')) || '').slice(7);
const AUDIO = RAIZ_AUDIO ? path.resolve(RAIZ_AUDIO) : path.join(RAIZ, 'public', 'audio');
const PUBLICO = RAIZ_AUDIO ? path.dirname(AUDIO) : path.join(RAIZ, 'public');
const PACK = path.join(OUT, 'pack');
// LAYOUT DO ZIP: entradas SEM o prefixo audio/ — o fetch-audio.sh descompacta
// DENTRO de public/audio/, então 'a/x.mp3' vira public/audio/a/x.mp3, que é o que a
// string 'audio/a/x.mp3' do manifesto resolve no site. Com o prefixo dobraria o caminho.
mkdirSync(path.join(PACK, 'a'), { recursive: true });

const manifesto = JSON.parse(readFileSync(path.join(AUDIO, 'manifest.json'), 'utf8'));
let copiados = 0, faltando = [];
const hashNome = (rel) => {
  const src = path.join(PUBLICO, rel);
  if (!existsSync(src)) { faltando.push(rel); return rel; }
  const h = createHash('sha1').update(readFileSync(src)).digest('hex').slice(0, 16);
  const novo = `audio/a/${h}${path.extname(rel).toLowerCase()}`;
  cpSync(src, path.join(PACK, novo.replace(/^audio\//, '')));
  copiados++;
  return novo;
};
const reescreve = (o) => {
  // String em QUALQUER posição (array OU valor de objeto). Antes só o caso de array
  // era coberto: `characterVoice.<id>` é string solta e passava reto sem hashear nem
  // copiar — o manifest do zip apontava pra um caminho que não estava no zip. Foi a
  // classe do arquivo faltando do v7; o probe refs×zip do v8 pegou de novo (30/08).
  if (typeof o === 'string') return o.startsWith('audio/') ? hashNome(o) : o;
  if (Array.isArray(o)) return o.map(reescreve);
  if (o && typeof o === 'object') { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = reescreve(v); return r; }
  return o;
};
const novoManifesto = reescreve(manifesto);
writeFileSync(path.join(PACK, 'manifest.json'), JSON.stringify(novoManifesto, null, 1));

// menu-music: nomes já opacos (m01..mNN); o mapa de nomes reais fica de fora.
const MM = path.join(AUDIO, 'menu-music');
mkdirSync(path.join(PACK, 'menu-music'), { recursive: true });
let menu = 0;
for (const f of readdirSync(MM)) {
  if (!/^m\d+\.mp3$/.test(f)) continue;   // exclui TRACKS.txt e qualquer nome legível
  cpSync(path.join(MM, f), path.join(PACK, 'menu-music', f));
  menu++;
}

execSync(`cd "${PACK}" && zip -q -r ../audio-pack.zip .`, { stdio: 'inherit' });
const mb = (execSync(`du -m "${path.join(OUT, 'audio-pack.zip')}" | cut -f1`).toString().trim());
console.log(`PACK: ${copiados} arquivos hasheados + ${menu} de menu | faltando: ${faltando.length} | zip: ${mb} MB`);
if (faltando.length) { console.log('FALTANDO (manifesto aponta e o disco não tem):'); for (const f of faltando) console.log('  ' + f); process.exitCode = 1; }
