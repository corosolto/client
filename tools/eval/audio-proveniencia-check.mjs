/* ============================================================================
   audio-proveniencia-check.mjs — ASSET SEM ORIGEM NÃO ENTRA NUMA BUILD. (PRV)
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA

   `public/audio/` é ignorado (`.gitignore`, seção Áudio) e o pacote é montado à
   parte e servido em produção. O `.gitignore` protege o GIT, e só ele: um arquivo
   de procedência desconhecida chega ao jogador sem nunca ter passado por commit
   nenhum. Era o caminho que o BUG-23 já tinha aberto nos decalques, e o áudio do
   piloto Fab passa por ele inteiro — com uma agravante escrita na própria
   listagem do pacote: `Allows usage with AI: No`.

   O ledger `docs/audio/proveniencia.json` é METADADO — nenhum byte de som mora
   nele. Esta régua cobra a forma dele; a irmã de produção é a cláusula PRV5 do
   `assets-check.mjs`, que confere hash contra o pacote instalado.

   ── AS CLÁUSULAS ───────────────────────────────────────────────────────────
     PRV1  toda fonte e todo derivado têm os campos obrigatórios, preenchidos.
     PRV2  `aprovacao: "aprovado"` exige `escutaAB` com quem ouviu e quando.
           Régua verde não aprova som: nenhuma delas ouve nada. A aprovação é
           do dono, no jogo real, comparando A/B contra o synth.
     PRV3  todo evento do piloto tem decisão declarada — `synth` (fallback) ou
           `derivado` com um derivado aprovado apontando para ele. Evento sem
           decisão é o fallback morrendo calado.
     PRV4  todo derivado cita uma fonte que existe, e nenhum áudio derivado está
           rastreado pelo git.

   ── O QUE UM LEDGER VAZIO SIGNIFICA ────────────────────────────────────────
   `derivados: []` com os 8 eventos do piloto em `synth` é o estado CORRETO
   enquanto o pacote não foi baixado. Preencher hash e origem de arquivo que
   ninguém viu seria inventar procedência — exatamente o que o contrato existe
   para impedir. A régua fica verde nesse estado e vermelha no instante em que
   alguém escrever um derivado incompleto.

   ── AS MUTAÇÕES QUE PROVAM ─────────────────────────────────────────────────
     --mutante=aprovado-sem-escuta  derivado sintético `aprovado` com escutaAB
                                    null                        -> PRV2 vermelha
     --mutante=derivado-sem-fonte   derivado sintético citando fonte inexistente
                                                                 -> PRV4 vermelha
     --mutante=evento-sem-decisao   apaga a decisão de um evento -> PRV3 vermelha

   As três mutam o ledger EM MEMÓRIA, nunca o arquivo, e conferem que mudaram
   alguma coisa antes de medir (lição 8).

   Uso: node tools/eval/audio-proveniencia-check.mjs [--mutante=…]
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LEDGER = 'docs/audio/proveniencia.json';
const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
const MUTANTES = ['aprovado-sem-escuta', 'derivado-sem-fonte', 'evento-sem-decisao'];
if (mutante && !MUTANTES.includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const CAMPOS_FONTE = ['titulo', 'autor', 'url', 'licenca', 'redistribuicao', 'usoComIA', 'notas'];
const CAMPOS_DERIVADO = ['arquivo', 'evento', 'fonte', 'origemNoPack', 'sha256', 'sha256Fonte',
  'transformacao', 'aprovacao', 'escutaAB'];
const REDISTRIBUICAO = ['livre', 'proibida-standalone', 'proibida'];
const APROVACAO = ['pendente', 'aprovado', 'rejeitado'];
const DECISAO = ['synth', 'derivado'];
/* Extensões de áudio que não podem estar rastreadas pelo git — a lista é a mesma
   do `AUDIO_EXT` de tools/gen-audio-manifest.mjs. */
const EXT_AUDIO = /\.(mp3|wav|ogg|m4a|webm|flac|aiff?)$/i;

let L;
try { L = JSON.parse(readFileSync(LEDGER, 'utf8')); } catch (e) {
  console.error(`PROVENIENCIA: ${LEDGER} não é JSON válido (${e.message}).`);
  process.exit(1);
}

// ── mutações: em memória, e cada uma confere que aplicou ───────────────────
if (mutante === 'aprovado-sem-escuta') {
  L.derivados.push({
    arquivo: 'audio/piloto/mutante.wav', evento: L.piloto[0].evento, fonte: Object.keys(L.fontes)[0],
    origemNoPack: 'mutante/x.wav', sha256: 'f'.repeat(64), sha256Fonte: 'e'.repeat(64),
    transformacao: 'nenhuma', aprovacao: 'aprovado', escutaAB: null,
  });
}
if (mutante === 'derivado-sem-fonte') {
  L.derivados.push({
    arquivo: 'audio/piloto/mutante.wav', evento: L.piloto[0].evento, fonte: 'fonte-que-nao-existe',
    origemNoPack: 'mutante/x.wav', sha256: 'f'.repeat(64), sha256Fonte: 'e'.repeat(64),
    transformacao: 'nenhuma', aprovacao: 'pendente', escutaAB: null,
  });
}
if (mutante === 'evento-sem-decisao') {
  if (!L.piloto?.length) { console.error('mutante evento-sem-decisao: `piloto` vazio, não aplicou.'); process.exit(2); }
  delete L.piloto[0].decisao;
}
if (mutante && mutante !== 'evento-sem-decisao'
  && !L.derivados.some((d) => d.arquivo === 'audio/piloto/mutante.wav')) {
  console.error(`mutante ${mutante} não inseriu o derivado sintético — não aplicou.`);
  process.exit(2);
}

const erros = [], notas = [];
const vazio = (v) => v === undefined || v === null || v === '';

// ── PRV1: forma ───────────────────────────────────────────────────────────
if (vazio(L.prefixoDerivado) || !String(L.prefixoDerivado).startsWith('audio/')) {
  erros.push(`PRV1 \`prefixoDerivado\` ausente ou fora de \`audio/\` (${L.prefixoDerivado}).`
    + ' É por ele que o `assets-check` sabe qual caminho do manifest exige procedência.');
}
for (const [id, f] of Object.entries(L.fontes || {})) {
  const faltando = CAMPOS_FONTE.filter((c) => vazio(f[c]));
  if (faltando.length) erros.push(`PRV1 fonte \`${id}\` sem ${faltando.join(', ')}.`);
  if (f.redistribuicao && !REDISTRIBUICAO.includes(f.redistribuicao)) {
    erros.push(`PRV1 fonte \`${id}\`: redistribuicao "${f.redistribuicao}" fora de ${REDISTRIBUICAO.join('|')}.`);
  }
  if (f.usoComIA && !['sim', 'nao'].includes(f.usoComIA)) {
    erros.push(`PRV1 fonte \`${id}\`: usoComIA "${f.usoComIA}" tem que ser sim|nao — é o que a listagem declara.`);
  }
}
for (const d of L.derivados || []) {
  /* `escutaAB` pode ser null legitimamente (ninguém ouviu ainda), então ele é
     cobrado como CHAVE presente, não como valor preenchido. */
  const faltando = CAMPOS_DERIVADO.filter((c) => (c === 'escutaAB' ? !(c in d) : vazio(d[c])));
  if (faltando.length) erros.push(`PRV1 derivado \`${d.arquivo || '(sem arquivo)'}\` sem ${faltando.join(', ')}.`);
  if (d.aprovacao && !APROVACAO.includes(d.aprovacao)) {
    erros.push(`PRV1 derivado \`${d.arquivo}\`: aprovacao "${d.aprovacao}" fora de ${APROVACAO.join('|')}.`);
  }
  if (d.sha256 && !/^[0-9a-f]{64}$/.test(d.sha256)) {
    erros.push(`PRV1 derivado \`${d.arquivo}\`: sha256 não é hash sha-256 hexadecimal.`);
  }
}
if (!erros.length) notas.push(`PRV1 ok: ${Object.keys(L.fontes || {}).length} fonte(s) e ${(L.derivados || []).length} derivado(s) com a forma completa.`);

// ── PRV2: aprovado exige escuta humana ────────────────────────────────────
{
  const semEscuta = (L.derivados || []).filter((d) => d.aprovacao === 'aprovado'
    && (!d.escutaAB || vazio(d.escutaAB.por) || vazio(d.escutaAB.data)));
  if (semEscuta.length) {
    erros.push(`PRV2 ${semEscuta.length} derivado(s) marcados \`aprovado\` sem \`escutaAB.por\` e \`escutaAB.data\``
      + ` (ex.: ${semEscuta.slice(0, 3).map((d) => d.arquivo).join(', ')}).`
      + ' Nenhuma régua desta base ouve som: elas provam que o arquivo chegou inteiro e veio de onde diz'
      + ' que veio. Quem aprova é o dono, no jogo real, comparando A/B contra o synth.');
  } else {
    notas.push('PRV2 ok: nenhum `aprovado` sem escuta A/B registrada.');
  }
}

// ── PRV3: todo evento do piloto tem decisão ───────────────────────────────
{
  const semDecisao = (L.piloto || []).filter((p) => !DECISAO.includes(p.decisao));
  if (!L.piloto?.length) {
    erros.push('PRV3 `piloto` vazio — sem a lista de eventos a régua ficaria verde por ausência de dado.');
  } else if (semDecisao.length) {
    erros.push(`PRV3 ${semDecisao.length} evento(s) do piloto sem \`decisao\` em ${DECISAO.join('|')}`
      + ` (ex.: ${semDecisao.slice(0, 3).map((p) => p.evento).join(', ')}).`
      + ' Evento sem decisão declarada é o fallback synth morrendo sem ninguém escolher.');
  }
  const semDerivado = (L.piloto || []).filter((p) => p.decisao === 'derivado'
    && !(L.derivados || []).some((d) => d.evento === p.evento && d.aprovacao === 'aprovado'));
  if (semDerivado.length) {
    erros.push(`PRV3 ${semDerivado.length} evento(s) marcados \`derivado\` sem derivado APROVADO apontando para eles`
      + ` (ex.: ${semDerivado.slice(0, 3).map((p) => p.evento).join(', ')}). O jogo cairia no synth de qualquer`
      + ' jeito, e o ledger estaria mentindo sobre o que toca.');
  }
  if (!semDecisao.length && !semDerivado.length && L.piloto?.length) {
    const porDecisao = (L.piloto || []).reduce((m, p) => (m[p.decisao] = (m[p.decisao] || 0) + 1, m), {});
    notas.push(`PRV3 ok: ${L.piloto.length} evento(s) do piloto com decisão — `
      + Object.entries(porDecisao).map(([k, v]) => `${v} em ${k}`).join(', ') + '.');
  }
}

// ── PRV4: fonte existe, e áudio derivado não está no git ──────────────────
{
  const orfaos = (L.derivados || []).filter((d) => !L.fontes?.[d.fonte]);
  if (orfaos.length) {
    erros.push(`PRV4 ${orfaos.length} derivado(s) citam fonte inexistente`
      + ` (ex.: ${orfaos.slice(0, 3).map((d) => `${d.arquivo} -> ${d.fonte}`).join(', ')}).`);
  }
  let rastreados = [];
  try {
    rastreados = execFileSync('git', ['-C', RAIZ, 'ls-files', '--', 'public/audio', 'docs/audio', 'private-assets'],
      { encoding: 'utf8' }).split('\n').filter((f) => EXT_AUDIO.test(f));
  } catch { rastreados = null; }
  if (rastreados === null) {
    erros.push('PRV4 NÃO MEDIDA: `git ls-files` não rodou, e sem ele não dá para saber se algum áudio'
      + ' entrou no repositório público. Não saber custa o mesmo que estar errado (lição 5).');
  } else if (rastreados.length) {
    erros.push(`PRV4 ${rastreados.length} arquivo(s) de áudio RASTREADOS pelo git`
      + ` (ex.: ${rastreados.slice(0, 3).join(', ')}). O repositório é público e a Fab Standard License`
      + ' proíbe redistribuição standalone — som versionado é publicação.');
  } else if (!orfaos.length) {
    notas.push('PRV4 ok: toda fonte citada existe e nenhum áudio está rastreado pelo git.');
  }
}

const rotulo = mutante ? `PROVENIENCIA [mutante=${mutante}]` : 'PROVENIENCIA';
for (const n of notas) console.log(`  ✓ ${n}`);
if (erros.length) {
  console.error(`\n${rotulo}: ${erros.length} cláusula(s) vermelha(s)\n`);
  for (const e of erros) console.error(`  ✗ ${e}\n`);
  process.exit(1);
}
console.log(`\n${rotulo}: verde — ${LEDGER} declara origem, licença e aprovação de tudo que pode entrar numa build.\n`);
