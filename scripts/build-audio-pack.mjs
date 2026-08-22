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
// Uso: node scripts/build-audio-pack.mjs <outDir> [--profile steam|web-meme]
//      [--audio-root /pasta/preparada/public/audio] [--allow-web-meme]
//   -> <outDir>/pack/  (conteúdo) e <outDir>/audio-pack-<perfil>.zip
//
// PERFIS
//   steam    usa somente a base `release-safe` (CC0/original/licenciada).
//   web-meme é um pacote separado para a experiência meme; exige opt-in
//            explícito e NUNCA deve ser enviado como build Steam.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { rewriteAudioManifest } from './audio-pack-rewrite.mjs';

const argv = process.argv.slice(2);
const OUT = argv.find((entry) => !entry.startsWith('--'));
const option = (name) => {
  const index = argv.indexOf(name);
  return index < 0 ? null : argv[index + 1];
};
if (!OUT) { console.error('uso: node scripts/build-audio-pack.mjs <outDir> [--profile steam|web-meme]'); process.exit(1); }
const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const PROFILE = option('--profile') || 'steam';
if (!['steam', 'web-meme'].includes(PROFILE)) {
  throw new Error(`perfil desconhecido: ${PROFILE}. Use steam ou web-meme.`);
}
const AUDIO = option('--audio-root')
  ? path.resolve(process.cwd(), option('--audio-root'))
  : path.join(RAIZ, 'public', 'audio');
const PACK = path.join(OUT, 'pack');
// LAYOUT DO ZIP: entradas SEM o prefixo audio/ — o fetch-audio.sh descompacta
// DENTRO de public/audio/, então 'a/x.mp3' vira public/audio/a/x.mp3, que é o que a
// string 'audio/a/x.mp3' do manifesto resolve no site. Com o prefixo dobraria o caminho.
mkdirSync(path.join(PACK, 'a'), { recursive: true });

const manifesto = JSON.parse(readFileSync(path.join(AUDIO, 'manifest.json'), 'utf8'));
const manifestText = JSON.stringify(manifesto);
// Nenhum perfil novo carrega legado Valve/CS/UT. O perfil web só altera a
// camada de humor, nunca a origem de armas ou de trilha.
if (/counter[ -]?strike|half[ -]?life|\bvalve\b|\b(?:ut|unreal tournament)[-_ ]/i.test(manifestText)) {
  throw new Error('manifest.json contém referência Valve/CS/UT, proibida em todos os perfis');
}
if (PROFILE === 'steam') {
  // Este comando cria o artefato que vai para a loja. Não pode transformar um
  // manifest local antigo em publicação por acidente.
  if (manifesto.licenseProfile !== 'release-safe') {
    throw new Error('perfil steam exige licenseProfile: "release-safe"; pré-voo de procedência obrigatório');
  }
  if (/audio\/(?:capture|memes|third-party|terceiros)\//i.test(manifestText)) {
    throw new Error('perfil steam não pode referenciar capture/memes; monte a base segura antes de empacotar');
  }
} else {
  if (manifesto.licenseProfile !== 'web-meme') {
    throw new Error('perfil web-meme exige licenseProfile: "web-meme" no manifest preparado');
  }
  if (!argv.includes('--allow-web-meme')) {
    throw new Error('perfil web-meme exige --allow-web-meme; ele não é um pacote de loja');
  }
}
let copiados = 0, faltando = [];
const nomesOpacos = new Map();
const hashNome = (rel) => {
  if (nomesOpacos.has(rel)) return nomesOpacos.get(rel);
  const src = path.join(AUDIO, rel.replace(/^audio\//, ''));
  if (!existsSync(src)) { faltando.push(rel); return rel; }
  const h = createHash('sha1').update(readFileSync(src)).digest('hex').slice(0, 16);
  const novo = `audio/a/${h}${path.extname(rel).toLowerCase()}`;
  cpSync(src, path.join(PACK, novo.replace(/^audio\//, '')));
  nomesOpacos.set(rel, novo);
  copiados++;
  return novo;
};
const novoManifesto = rewriteAudioManifest(manifesto, hashNome);
writeFileSync(path.join(PACK, 'manifest.json'), JSON.stringify(novoManifesto, null, 1));
writeFileSync(path.join(PACK, 'audio-profile.json'), JSON.stringify({
  schema: 1,
  profile: PROFILE,
  storeEligible: PROFILE === 'steam',
  sourceLicenseProfile: manifesto.licenseProfile,
}, null, 1));

// menu-music: nomes já opacos (m01..mNN); o mapa de nomes reais fica de fora.
const MM = path.join(AUDIO, 'menu-music');
mkdirSync(path.join(PACK, 'menu-music'), { recursive: true });
let menu = 0;
for (const f of readdirSync(MM)) {
  if (!/^m\d+\.mp3$/.test(f)) continue;   // exclui TRACKS.txt e qualquer nome legível
  cpSync(path.join(MM, f), path.join(PACK, 'menu-music', f));
  menu++;
}

const zipName = `audio-pack-${PROFILE}.zip`;
execSync(`cd "${PACK}" && zip -q -r "../${zipName}" .`, { stdio: 'inherit' });
const mb = (execSync(`du -m "${path.join(OUT, zipName)}" | cut -f1`).toString().trim());
console.log(`PACK ${PROFILE}: ${copiados} arquivos hasheados + ${menu} de menu | faltando: ${faltando.length} | zip: ${mb} MB`);
if (faltando.length) { console.log('FALTANDO (manifesto aponta e o disco não tem):'); for (const f of faltando) console.log('  ' + f); process.exitCode = 1; }
