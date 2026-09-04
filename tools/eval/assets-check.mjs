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

   PROCEDÊNCIA (PRV5). Casa cada folha do manifest instalado com o ledger POR
   SHA-256 e reprova quando o arquivo é derivado de fonte que não permite
   redistribuição standalone, ou quando ainda não foi aprovado por escuta.

   Por que por hash e não por caminho: a versão anterior filtrava pelo prefixo
   `audio/piloto/` e o empacotador reescreve TODO caminho para `audio/a/<sha1>`.
   Medido no manifest que o jogador recebe, o filtro casava ZERO — cláusula
   estruturalmente incapaz de disparar. O que sobrevive ao rename é o conteúdo.
   A trava forte fica no próprio empacotador (PRV6); esta é a segunda camada.

   AMBIENTE. O piso não pega pacote que chegou inteiro MENOS uma família: 17 arquivos
   de ambiente faltando num manifest de 308 deixam 291, acima do piso, verde. Por isso
   a cláusula do ambiente é NOMINAL e a lista vem de `soundscape.js` — a mesma fonte
   que a `eval:audioalcance` usa na fixture (lição 2: mesmo conceito, mesma fonte).

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
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { initTextures } from './harness.mjs';
import { GRAFITE } from '../../public/js/graffiti_layout.js';
import { AMB_LOOPS, BIOME_SHOTS } from '../../public/js/soundscape.js';

const PISO_AUDIO = 250;          // real 308 · exemplo 62 — ver o bloco de medição acima
const MANIFEST = 'public/audio/manifest.json';
const DIR_DECALS = 'public/img/decals';
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
    /* AMBIENTE — a irmã de produção da `eval:audioalcance`. A régua de alcance mede
       a PIPELINE numa fixture; esta mede o PACOTE QUE CHEGOU. Duas coisas medem o
       mesmo conceito, então compartilham a fonte da lista (`soundscape.js`) em vez
       de cada uma manter a sua — lição 2 do `docs/LICOES.md`. Sem esta cláusula,
       um pacote velho (sem `ambiente/`) passaria verde e o mapa subiria mudo, com
       o warn de `soundscape.js:59` como único sinal. */
    const doCodigo = new Set(Object.values(AMB_LOOPS));
    for (const pools of Object.values(BIOME_SHOTS)) for (const p of pools) for (const src of p.srcs) doCodigo.add(src);
    const semAmbiente = [...doCodigo].filter((f) => !folhas.includes(f) || !existsSync(path.join('public', f)));
    if (semAmbiente.length) {
      erros.push(`áudio ambiente: ${semAmbiente.length} de ${doCodigo.size} caminhos que \`soundscape.js\` nomeia`
        + ` não estão no manifest OU não estão no disco (ex.: ${semAmbiente.slice(0, 3).join(', ')}).`
        + ' O pacote instalado é anterior à regra `ambiente` do gerador — regere o pack'
        + ' (`node scripts/build-audio-pack.mjs <out>`) e publique a release nova.');
    }
    /* PRV5 — a cláusula de BUILD do contrato de procedência (docs/audio/PROVENIENCIA.md).
       `.gitignore` protege o git e só ele: o pacote é montado à parte e servido em
       produção, então asset sem origem declarada chega ao jogador sem passar por commit
       nenhum. Aqui ele para. As PRV1-PRV4 (forma do ledger) rodam no `eval:audioproc`. */
    let ledger = null;
    try { ledger = JSON.parse(readFileSync('docs/audio/proveniencia.json', 'utf8')); } catch (e) {
      erros.push(`procedência: docs/audio/proveniencia.json ilegível (${e.message}) —`
        + ' sem o ledger não dá para saber a origem de nada que a build serve.');
    }
    if (ledger) {
      /* A CHAVE É O SHA-256, NÃO O CAMINHO. A versão anterior filtrava por prefixo
         (`audio/piloto/`) e o empacotador reescreve todo caminho para
         `audio/a/<sha1>` — medido: no manifest que o jogador recebe, o filtro por
         prefixo casava ZERO. Cláusula estruturalmente incapaz de disparar, que é a
         régua cega da lição 1. O que sobrevive ao rename é o conteúdo. */
      const porHash = new Map((ledger.derivados || []).map((d) => [d.sha256, d]));
      const proibidos = [], naoAprovados = [];
      for (const f of folhas) {
        const abs = path.join('public', f);
        if (!existsSync(abs)) continue;                 // já reportado pela cláusula acima
        const d = porHash.get(createHash('sha256').update(readFileSync(abs)).digest('hex'));
        if (!d) continue;
        const fonte = ledger.fontes?.[d.fonte];
        if (!fonte || fonte.redistribuicao !== 'livre') {
          proibidos.push(`${f} = ${d.arquivo} (fonte \`${d.fonte}\`: ${fonte?.redistribuicao || 'sem fonte no ledger'})`);
        } else if (d.aprovacao !== 'aprovado') {
          naoAprovados.push(`${f} = ${d.arquivo} (aprovação \`${d.aprovacao}\`)`);
        }
      }
      if (proibidos.length) {
        erros.push(`procedência: ${proibidos.length} arquivo(s) do pacote instalado são derivados de fonte`
          + ` que NÃO permite redistribuição standalone (ex.: ${proibidos.slice(0, 3).join('; ')}).`
          + ' O `audio-pack.zip` é publicado como asset de release e é um pacote só de áudio.'
          + ' Ver docs/audio/PROVENIENCIA.md.');
      }
      if (naoAprovados.length) {
        erros.push(`procedência: ${naoAprovados.length} arquivo(s) do pacote instalado ainda não foram`
          + ` aprovados por escuta (ex.: ${naoAprovados.slice(0, 3).join('; ')}).`);
      }
      const declaradosPresentes = [...porHash.values()].length;
      if (!proibidos.length && !naoAprovados.length) {
        avisos.push(`procedência ok: nenhum dos ${folhas.length} caminhos casa derivado proibido ou não aprovado`
          + ` (${declaradosPresentes} derivado(s) no ledger).`);
      }
    }
    if (!erros.length) {
      avisos.push(`áudio ok: ${folhas.length} caminhos, todos no disco (${doCodigo.size} de ambiente).`);
    }
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
