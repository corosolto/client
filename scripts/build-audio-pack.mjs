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
//   · somente os menu-music/mNN.mp3 ainda referenciados pelo manifest; os nomes já são
//     opacos. TRACKS.txt (o mapa nome-real -> mNN) NÃO entra.
// O que NÃO entra: soundtrack/ (fontes com nome comercial), TRACKS.txt, qualquer arquivo
// não referenciado.
//
// Uso: node scripts/build-audio-pack.mjs <outDir> [--raiz=<dir>] [--ledger=<json>]
//   -> <outDir>/pack/  (conteúdo) e <outDir>/audio-pack.zip
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { carregarPolitica, motivoDeRecusa } from '../tools/audio/politica.mjs';

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

/* ── TRAVA DE PROCEDÊNCIA: ALLOWLIST, NÃO DENYLIST ─────────────────────────
   Este zip é publicado como asset de release: um pacote SÓ DE ÁUDIO, que é a
   forma que a Fab Standard License proíbe. A versão anterior montava uma
   DENYLIST a partir de `ledger.derivados` e deixava passar tudo que não estava
   catalogado — a auditoria da 4ª rodada provou o escape com `derivados: []`.
   A regra agora mora em `tools/audio/politica.mjs`, uma vez só para as três
   camadas. Régua: `npm run eval:audioproc`, cláusula PRV10. */
const LEDGER = (process.argv.find((a) => a.startsWith('--ledger=')) || '').slice(9)
  || path.join(RAIZ, 'docs', 'audio', 'proveniencia.json');
const politica = carregarPolitica(LEDGER);
if (politica.erro) {
  console.error(`FALTA o ledger de procedência (${politica.erro}).`
    + ' Sem ele não dá para saber o que pode ser redistribuído, e não saber custa o mesmo'
    + ' que estar errado. O pacote NÃO é montado.');
  process.exit(1);
}

let copiados = 0, faltando = [], recusados = [];
const hashNome = (rel) => {
  const src = path.join(PUBLICO, rel);
  if (!existsSync(src)) { faltando.push(rel); return rel; }
  const bytes = readFileSync(src);
  const motivo = motivoDeRecusa(rel, bytes, politica, 'pack');
  if (motivo) { recusados.push(`${rel} — ${motivo}`); return rel; }
  const h = createHash('sha1').update(bytes).digest('hex').slice(0, 16);
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

// menu-music: nomes já opacos; só a curadoria nominal do manifest entra no fallback.
const MM = path.join(AUDIO, 'menu-music');
/* Ausente, isto morria com um ENOENT cru DEPOIS de escrever o pack/manifest.json —
   deixando rastro de sucesso e código de saída 1. Régua: eval:audioalcance, ALC3. */
if (!existsSync(MM)) {
  console.error(`FALTA ${path.relative(RAIZ, MM)}: o pacote não sai sem a música de menu.`);
  process.exit(1);
}
mkdirSync(path.join(PACK, 'menu-music'), { recursive: true });
let menu = 0;
const menuFiles = new Set((manifesto.menuMusic || []).map((url) => path.basename(url)));
for (const f of readdirSync(MM)) {
  if (!menuFiles.has(f) || !/^m\d+\.mp3$/.test(f)) continue;
  cpSync(path.join(MM, f), path.join(PACK, 'menu-music', f));
  menu++;
}

/* A recusa vem ANTES do zip: pacote proibido não pode chegar a existir em disco. */
if (recusados.length) {
  console.error(`RECUSADO: ${recusados.length} arquivo(s) não podem entrar num pacote só de áudio.`);
  for (const r of recusados.slice(0, 12)) console.error('  ' + r);
  if (recusados.length > 12) console.error(`  … e mais ${recusados.length - 12} arquivo(s).`);
  console.error('\nSob o prefixo derivado a regra é ALLOWLIST: o que não está catalogado no ledger'
    + '\nnão passa. Este zip vira asset de release, e release de pacote de áudio é'
    + '\nredistribuição standalone. Ver docs/audio/PROVENIENCIA.md — a forma de incorporação'
    + '\nque NÃO redistribui está BLOQUEADA aguardando decisão do dono.');
  process.exit(1);
}

execSync(`cd "${PACK}" && zip -q -r ../audio-pack.zip .`, { stdio: 'inherit' });
const mb = (execSync(`du -m "${path.join(OUT, 'audio-pack.zip')}" | cut -f1`).toString().trim());
console.log(`PACK: ${copiados} arquivos hasheados + ${menu} de menu | faltando: ${faltando.length} | zip: ${mb} MB`);
if (faltando.length) { console.log('FALTANDO (manifesto aponta e o disco não tem):'); for (const f of faltando) console.log('  ' + f); process.exitCode = 1; }
