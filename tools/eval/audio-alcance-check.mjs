/* ============================================================================
   audio-alcance-check.mjs — O SOM QUE O CÓDIGO NOMEIA CHEGA NA BUILD? (ALC)
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   `public/js/soundscape.js` nomeia os arquivos de ambiente do jogo (`AMB_LOOPS` +
   `BIOME_SHOTS`). Nenhum deles era alcançado pela pipeline de empacotamento:

     · `tools/gen-audio-manifest.mjs` não tem regra para `ambiente/` — arquivo
       posto lá aparece no relatório como ÓRFÃO e não entra no manifest;
     · `scripts/build-audio-pack.mjs` copia **só** o que o manifest nomeia (mais
       `menu-music/`), então o que não está no manifest não entra no zip;
     · `scripts/fetch-audio.sh` instala o zip. O que não está no zip dá 404.

   E o 404 não aparece: `soundscape.js:59` faz `console.warn` uma vez por arquivo
   e segue com silêncio. É a lição 5 (`docs/LICOES.md`) inteira — falha silenciosa
   com o portão verde — e a lição 12 — o caminho que só produção percorre.

   ── COMO ELA MEDE: FIXTURE SINTÉTICA, NÃO O PACOTE PRIVADO ─────────────────
   O pacote de áudio é gitignored (`.gitignore` §Áudio) e não existe em clone
   limpo. Medir contra ele daria régua que só roda na máquina de quem já tem tudo
   — exatamente o furo da lição 12.

   Então a régua ARMA a fixture: uma pasta temporária com um arquivo de 44 bytes
   para cada caminho que o código nomeia, e roda o gerador e o empacotador REAIS
   contra ela (`--raiz=`). O que se mede é a pipeline, não uma imitação dela.

     ALC1  gerador: todo caminho nomeado pelo código vira folha do manifest.
     ALC2  empacotador: todo caminho nomeado pelo código chega ao `pack/`.
     ALC3  a leitura é por NOME, não por índice (lição 14): o caminho que o
           código nomeia é comparado string a string com o que a pipeline emite.

   ALC2 depende de `zip`. Sem `zip` no PATH a cláusula se declara NÃO MEDIDA e a
   régua sai 1 assim mesmo — não saber custa o mesmo que estar errado (lição 5).

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
     --mutante=nome-trocado    a fixture grava `galo2.mp3` no lugar de `galo.mp3`.
                               A pipeline continua íntegra; o que quebra é o NOME.
                               ALC1/ALC2 têm que ficar vermelhas.
     --mutante=sem-copia       o empacotador roda com a fixture sem um arquivo.
                               Só ALC2 fica vermelha — separa gerador de pack.

   Uso: node tools/eval/audio-alcance-check.mjs [--mutante=…] [--verboso]
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AMB_LOOPS, BIOME_SHOTS } from '../../public/js/soundscape.js';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
const VERBOSO = process.argv.includes('--verboso');
if (mutante && !['nome-trocado', 'sem-copia'].includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

/* A LISTA VEM DO MÓDULO, NÃO DE UM PARSE DO TEXTO (lição 14 + lição 3): quem
   acrescentar um bioma ou um loop em soundscape.js é cobrado aqui no mesmo dia,
   sem ninguém lembrar de editar uma segunda lista. */
const nomeadosPeloCodigo = (() => {
  const s = new Set(Object.values(AMB_LOOPS));
  for (const pools of Object.values(BIOME_SHOTS)) for (const p of pools) for (const src of p.srcs) s.add(src);
  return [...s].sort();
})();

const erros = [], notas = [];
if (!nomeadosPeloCodigo.length) {
  erros.push('ALC0 `soundscape.js` não nomeou nenhum caminho de áudio — a régua ficaria verde por vazio.');
}

/* ── fixture: um arquivo por caminho nomeado, dentro de <tmp>/public/audio ──
   O layout precisa ser esse porque o caminho do manifest é relativo a `public/`
   (`toUrl` do gerador) e o empacotador resolve a partir do mesmo lugar. */
const tmp = mkdtempSync(join(tmpdir(), 'csbr-audio-alcance-'));
const AUDIO = join(tmp, 'public', 'audio');
const gravados = new Map();   // caminho de manifest -> caminho em disco
try {
  for (const rel of nomeadosPeloCodigo) {
    const alvo = mutante === 'nome-trocado' && rel.endsWith('/galo.mp3')
      ? rel.replace(/galo\.mp3$/, 'galo2.mp3')
      : rel;
    const abs = join(tmp, 'public', alvo);
    mkdirSync(dirname(abs), { recursive: true });
    /* Conteúdo distinto por arquivo: o empacotador renomeia por sha1 do conteúdo,
       e arquivos idênticos colapsariam num nome só — o que faria ALC2 passar
       contando um arquivo por vários. */
    writeFileSync(abs, `fixture ${alvo}\n`);
    gravados.set(rel, abs);
  }
  /* A mutação `nome-trocado` só faz sentido se ALGUMA coisa mudou de fato
     (lição 8: mutação que não aplica parece mutação que passou). */
  if (mutante === 'nome-trocado' && ![...gravados.keys()].some((r) => r.endsWith('/galo.mp3'))) {
    console.error('mutante nome-trocado não encontrou `galo.mp3` para trocar — a mutação não aplicou.');
    process.exit(2);
  }

  // ── ALC1: o gerador alcança o que o código nomeia ────────────────────────
  let manifest = null;
  try {
    execFileSync('node', [join(RAIZ, 'tools', 'gen-audio-manifest.mjs'), `--raiz=${AUDIO}`],
      { encoding: 'utf8', stdio: VERBOSO ? 'inherit' : 'ignore' });
    manifest = JSON.parse(readFileSync(join(AUDIO, 'manifest.json'), 'utf8'));
  } catch (e) {
    erros.push(`ALC1 o gerador não rodou na fixture (${e.message}) — sem manifest não há o que medir.`);
  }

  const folhas = new Set();
  (function rec(o) {
    if (Array.isArray(o)) o.forEach(rec);
    else if (o && typeof o === 'object') Object.values(o).forEach(rec);
    else if (typeof o === 'string') folhas.add(o);
  })(manifest || {});

  const foraDoManifest = nomeadosPeloCodigo.filter((rel) => !folhas.has(rel));
  if (manifest && foraDoManifest.length) {
    erros.push(`ALC1 ${foraDoManifest.length} de ${nomeadosPeloCodigo.length} caminhos que o código nomeia`
      + ` NÃO viram folha do manifest (ex.: ${foraDoManifest.slice(0, 3).join(', ')}).`
      + ' `scripts/build-audio-pack.mjs` copia só o que o manifest nomeia — o que falta aqui'
      + ' não entra no zip, dá 404 em produção e `soundscape.js:59` engole com um warn.');
  } else if (manifest) {
    notas.push(`ALC1 ok: ${nomeadosPeloCodigo.length} caminhos do código são folha do manifest.`);
  }

  // ── ALC2: o empacotador copia o que o manifest nomeia ────────────────────
  let temZip = true;
  try { execFileSync('zip', ['-v'], { stdio: 'ignore' }); } catch { temZip = false; }
  if (!temZip) {
    erros.push('ALC2 NÃO MEDIDA: `zip` ausente no PATH e o empacotador termina nele.'
      + ' A régua reprova em vez de passar calada — não saber custa o mesmo que estar errado (lição 5).');
  } else if (!manifest) {
    erros.push('ALC2 NÃO MEDIDA: sem manifest da ALC1 não há entrada para o empacotador.');
  } else {
    if (mutante === 'sem-copia') {
      const vitima = gravados.get(nomeadosPeloCodigo.find((r) => gravados.has(r)));
      rmSync(vitima);
    }
    const out = join(tmp, 'out');
    let pack = null;
    try {
      execFileSync('node', [join(RAIZ, 'scripts', 'build-audio-pack.mjs'), out, `--raiz=${AUDIO}`],
        { encoding: 'utf8', stdio: VERBOSO ? 'inherit' : 'ignore' });
    } catch { /* o empacotador sai 1 quando falta arquivo; o veredito é o pack, não o código de saída */ }
    try { pack = JSON.parse(readFileSync(join(out, 'pack', 'manifest.json'), 'utf8')); } catch { pack = null; }

    if (!pack) {
      erros.push('ALC2 o empacotador não produziu `pack/manifest.json` na fixture.');
    } else {
      const foraDoPack = nomeadosPeloCodigo.filter((rel) => !folhaChegou(rel, out, pack));
      if (foraDoPack.length) {
        erros.push(`ALC2 ${foraDoPack.length} de ${nomeadosPeloCodigo.length} caminhos do código não chegaram ao`
          + ` \`pack/\` (ex.: ${foraDoPack.slice(0, 3).join(', ')}). É o que o jogador baixa: o que falta aqui é 404.`);
      } else {
        notas.push(`ALC2 ok: os ${nomeadosPeloCodigo.length} caminhos do código chegaram ao pack.`);
      }
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

/* Um caminho "chegou ao pack" quando o arquivo que a fixture gravou para ele
   existe no pack sob ALGUM nome — o empacotador renomeia por sha1 do conteúdo,
   então a identidade que sobrevive é o CONTEÚDO, não o caminho. */
function folhaChegou(rel, out, pack) {
  const alvo = `fixture ${rel}\n`;
  const vistos = [];
  (function rec(o) {
    if (Array.isArray(o)) o.forEach(rec);
    else if (o && typeof o === 'object') Object.values(o).forEach(rec);
    else if (typeof o === 'string' && o.startsWith('audio/')) vistos.push(o);
  })(pack);
  for (const p of vistos) {
    const abs = join(out, 'pack', p.replace(/^audio\//, ''));
    if (!existsSync(abs)) continue;
    try { if (readFileSync(abs, 'utf8') === alvo) return true; } catch { /* binário: não é a fixture */ }
  }
  return false;
}

const rotulo = mutante ? `ALCANCE-AUDIO [mutante=${mutante}]` : 'ALCANCE-AUDIO';
for (const n of notas) console.log(`  ✓ ${n}`);
if (erros.length) {
  console.error(`\n${rotulo}: ${erros.length} cláusula(s) vermelha(s)\n`);
  for (const e of erros) console.error(`  ✗ ${e}\n`);
  console.error(`  caminhos que o código nomeia (${nomeadosPeloCodigo.length}): ${nomeadosPeloCodigo.join(' ')}\n`);
  process.exit(1);
}
console.log(`\n${rotulo}: verde — a pipeline alcança os ${nomeadosPeloCodigo.length} caminhos que o código nomeia.\n`);
