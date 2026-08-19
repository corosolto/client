/* ============================================================================
   assets-check.mjs — O BUILD REPROVA SE O PACOTE NÃO CHEGOU INTEIRO. (T1)
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA (BUG-19)

   `scripts/fetch-audio.sh` termina assim:

       [ -f "$DEST/manifest.json" ] || cp "$DEST/manifest.example.json" "$DEST/manifest.json"

   Se o zip baixar e não trouxer o manifest — pacote parcial, release trocada, zip
   corrompido —, essa linha copia o EXEMPLO por cima e o build **passa**. O jogo sobe
   sem tiro real e sem voz, caindo no sintetizado, sem um erro sequer. Medido: o
   manifest de verdade tem 308 caminhos; o de exemplo tem 62. É a mesma estrutura no
   `fetch-decals.sh`, onde a falha vira 196 decalques em 404 — o "os mapas perderam
   toda textura de graffitis" de 06/08.

   E na máquina de quem desenvolve nada disso aparece: os dois scripts começam com um
   early-exit ("já configurado"), então o caminho de download **nunca roda aqui**. Só
   roda na Vercel, que é checkout limpo toda vez. Bug invisível por construção.

   ── COMO ELA MEDE ──────────────────────────────────────────────────────────
   ÁUDIO. Conta FOLHA DE STRING na árvore do manifest — não chave de topo, não
   entrada de lista. A forma da contagem importa mais que o número: contando "itens
   de lista" o mesmo arquivo dá 309, contando chave de topo dá 9. Com folha de string:
     · manifest.json (real) ......... 308
     · manifest.example.json ........  62   ← o fallback silencioso
     · manifest.default.json ........  24
   O piso é 250: 19% de folga abaixo do real e 4× acima do exemplo. Além do piso, ela
   confere que **todo caminho citado existe no disco** — manifest cheio apontando pra
   arquivo que não veio é a mesma falha com outra cara.

   DECALQUES. A lista NÃO é lida do texto do textures.js: ela vem do módulo importado
   em node (`initTextures().decalFiles`), porque `DECAL_FILES` são 196 entradas
   estáticas + os `or-*` empurrados em runtime, e vai crescer. Parse de linha ficaria
   velho na próxima leva. As duas classes têm diagnóstico diferente e é isso que a
   mensagem diz:
     · `or-*` faltando  -> obra própria, VERSIONADA: clone/checkout quebrado;
     · resto faltando   -> acervo do pack: `fetch-decals.sh` falhou ou não rodou.

   ── ONDE ELA RODA ──────────────────────────────────────────────────────────
   No `buildCommand` da Vercel, ENTRE os fetches e o `npm run build` — antes de gastar
   o build, e depois de tudo que ela cobra existir. Localmente: `npm run assert:assets`.

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
       AUDIO_PACK_URL=https://example.invalid/nada.zip bash scripts/fetch-audio.sh
   com `public/audio` vazio: o curl falha, o fallback copia o exemplo, e ESTA régua
   reprova com "62 caminhos, piso 250". Sem ela, o build passava verde.

   Issue #77: `node tools/eval/assets-check.mjs --mutante=grafite-orfa` tira em
   memória um nome usado pelo layout e exige que a contagem de peças fique vermelha.
   ============================================================================ */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { initTextures } from './harness.mjs';
import { GRAFITE } from '../../public/js/graffiti_layout.js';

const PISO_AUDIO = 250;          // real 308 · exemplo 62 — ver o bloco de medição acima
const MANIFEST = 'public/audio/manifest.json';
const DIR_DECALS = 'public/img/decals';
const DIR_POSTERS = 'public/posters';
const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice(10);

if (mutante && mutante !== 'grafite-orfa') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const erros = [], avisos = [];

/* ---------------------------------- ÁUDIO ---------------------------------- */
if (!existsSync(MANIFEST)) {
  erros.push(`áudio: ${MANIFEST} não existe — \`bash scripts/fetch-audio.sh\` não rodou ou falhou.`);
} else {
  let m = null;
  try { m = JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch (e) {
    erros.push(`áudio: ${MANIFEST} não é JSON válido (${e.message}) — download truncado.`);
  }
  if (m) {
    const folhas = [];
    (function rec(o) {
      if (Array.isArray(o)) o.forEach(rec);
      else if (o && typeof o === 'object') Object.values(o).forEach(rec);
      else if (typeof o === 'string') folhas.push(o);
    })(m);

    if (folhas.length < PISO_AUDIO) {
      /* O caso mais provável tem nome: o fallback da linha 23 do fetch-audio.sh. Dizer
         isso na mensagem é a diferença entre "conserta em 1 min" e "investiga 1 h". */
      const exemplo = 'public/audio/manifest.example.json';
      const igual = existsSync(exemplo)
        && readFileSync(exemplo, 'utf8').trim() === readFileSync(MANIFEST, 'utf8').trim();
      erros.push(`áudio: manifest com ${folhas.length} caminhos, piso ${PISO_AUDIO}.`
        + (igual
          ? ' É BYTE A BYTE o manifest.example.json: o unzip não trouxe o manifest real e'
            + ' o fallback do fetch-audio.sh:23 copiou o exemplo. O jogo subiria sem voz e'
            + ' sem tiro real, no sintetizado.'
          : ' Pacote incompleto — confira AUDIO_PACK_URL e a release apontada.'));
    }

    const semArquivo = folhas.filter((f) => !existsSync(path.join('public', f)));
    if (semArquivo.length) {
      erros.push(`áudio: ${semArquivo.length} de ${folhas.length} caminhos do manifest não existem`
        + ` no disco (ex.: ${semArquivo.slice(0, 3).join(', ')}) — o zip veio parcial.`);
    }
    if (!erros.length) avisos.push(`áudio ok: ${folhas.length} caminhos, todos no disco.`);
  }
}

/* -------------------------------- DECALQUES -------------------------------- */
let T;
try { T = initTextures(); } catch (e) {
  erros.push(`decalques: não deu pra importar o textures.js em node (${e.message}).`);
}
if (T) try {
  const files = T.decalFiles || [];
  if (!files.length) {
    erros.push('decalques: `T.decalFiles` veio vazio — textures.js não expôs a lista.');
  } else {
    const falta = (f) => !existsSync(path.join(DIR_DECALS, f));
    /* Duas classes, dois diagnósticos. `or-*` é obra própria e está NO GIT; o resto é
       acervo e chega pelo pack (.gitignore:104). Misturar as duas dá a mensagem errada
       pro dobro dos casos. */
    const doGit = files.filter((f) => f.startsWith('or-'));
    const doPack = files.filter((f) => !f.startsWith('or-'));
    const semOr = doPack.filter(falta);
    const comOr = doGit.filter(falta);
    if (comOr.length) {
      erros.push(`decalques: ${comOr.length} peça(s) VERSIONADA(S) faltando`
        + ` (ex.: ${comOr.slice(0, 3).join(', ')}) — são obra própria e vêm no clone:`
        + ' checkout incompleto, não é o fetch.');
    }
    if (semOr.length) {
      erros.push(`decalques: ${semOr.length} de ${doPack.length} do acervo faltando`
        + ` (ex.: ${semOr.slice(0, 3).join(', ')}) — \`bash scripts/fetch-decals.sh\` falhou`
        + ' ou não rodou. Os mapas subiriam com a parede pelada.');
    }
    if (!comOr.length && !semOr.length) {
      avisos.push(`decalques ok: ${files.length} arquivos (${doGit.length} versionados + ${doPack.length} do acervo).`);
    }
  }
} catch (e) {
  erros.push(`decalques: não deu pra importar o textures.js em node (${e.message}).`);
}

if (T) {
  const posterFiles = T.posterFiles || [];
  if (posterFiles.length) {
    const faltaPoster = posterFiles.filter((f) => !existsSync(path.join(DIR_POSTERS, f)));
    if (faltaPoster.length) {
      erros.push(`posters: ${faltaPoster.length} de ${posterFiles.length} faltando no disco`
        + ` (ex.: ${faltaPoster.slice(0, 3).join(', ')}) — POSTER_FILES cita arquivo que não existe`
        + ' em public/posters/.');
    }
  }
}

/* Issue #77: todo nome do layout gerado precisa continuar no pacote do jogo.
   A resolução de `poster:` é a mesma de graffiti_pass.js. */
if (T) {
  const decal = new Set(T.decalFiles || []);
  const poster = new Set(T.posterFiles || []);
  if (mutante === 'grafite-orfa') {
    const nome = Object.values(GRAFITE)
      .flatMap((dados) => dados.arquivos || [])
      .find((arquivo) => !arquivo.startsWith('poster:') && decal.has(arquivo));
    if (!nome) {
      erros.push('MUTANTE NÃO APLICOU: nenhum decalque do layout existe no pacote.');
    } else {
      decal.delete(nome);
    }
  }

  const nomesOrfaos = new Set();
  const referenciasOrfas = new Map();
  let totalPecas = 0;
  for (const [mapa, dados] of Object.entries(GRAFITE)) {
    const arq = dados.arquivos || [];
    const sem = new Set();
    for (const f of arq) {
      const ok = f.startsWith('poster:') ? poster.has(f.slice(7)) : decal.has(f);
      if (!ok) sem.add(f);
    }
    if (!sem.size) continue;
    for (const nome of sem) {
      nomesOrfaos.add(nome);
      referenciasOrfas.set(`${mapa}\0${nome}`, { mapa, nome, pecas: 0 });
    }
    for (const [a] of (dados.pecas || [])) {
      const nome = arq[a];
      if (nome !== undefined && sem.has(nome)) {
        referenciasOrfas.get(`${mapa}\0${nome}`).pecas++;
        totalPecas++;
      }
    }
  }
  if (referenciasOrfas.size) {
    const ex = [...referenciasOrfas.values()].slice(0, 4)
      .map((o) => `${o.mapa}:${o.nome} (=${o.pecas} peças)`).join(', ');
    erros.push(`grafite layout: ${nomesOrfaos.size} nome(s) saíram do pacote em `
      + `${referenciasOrfas.size} referência(s) mapa:nome = ${totalPecas} peça(s) `
      + `que sumiriam da parede (ex.: ${ex}) — `
      + 'regenere com `npm run grafite`.');
  } else {
    avisos.push(`grafite layout ok: todos os nomes citados existem no pacote.`);
  }
}

/* --------------------------------- veredito -------------------------------- */
for (const a of avisos) console.log('  ' + a);
if (erros.length) {
  console.error('\nASSETS-CHECK REPROVOU:');
  for (const e of erros) console.error('  · ' + e);
  console.error('\nO build para aqui de propósito: subir sem estes arquivos é subir um jogo'
    + '\nmudo e com a parede pelada, e nada mais no portão enxerga isso.\n');
  process.exit(1);
}
console.log('ASSETS-CHECK ok');
