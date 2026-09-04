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
     PRV6  o EMPACOTADOR recusa derivado de fonte `proibida-standalone`, e aceita
           obra própria (cláusula irmã). Fixture end-to-end com o builder real.
     PRV7  a `decisao`/`aprovacao` do ledger CONTROLA o gerador: derivado pendente
           ou rejeitado não sai no manifest nem com `weaponSamples: true`, e o
           aprovado sobrevive (cláusula irmã).
     PRV8  `sha256Fonte` bate com o arquivo em `origemNoPack`, recalculado no
           staging privado. Sem staging, declara NÃO MEDIDA — nunca finge prova.
     PRV9  o legado nominal CS/Valve/UT do `manifest.example.json` está
           catalogado e bloqueado, e a régua não deixa declará-lo substituído.
     PRV10 FAIL-CLOSED: sob `prefixoDerivado`, arquivo NÃO catalogado reprova no
           empacotador; o legado reprova por NOME; e o derivado catalogado,
           aprovado e de fonte livre continua passando (cláusula irmã).
     PRV11 fail-closed também no GERADOR, com a mesma irmã.
     PRV12 ledger AUSENTE aborta o gerador — em modo normal e em `--check` —
           dizendo por quê; com ledger válido ele gera (cláusula irmã).
     PRV13 o `assets-check` REAL medido contra fixture: não catalogado e legado
           reprovam, catalogado/aprovado/livre passa (irmã). As três camadas
           passam a ter prova automatizada — antes esta era só manual.

   ── O QUE UM LEDGER VAZIO SIGNIFICA ────────────────────────────────────────
   `derivados: []` com os 8 eventos do piloto em `synth` é o estado CORRETO — e
   continua sendo DEPOIS do download (o pacote foi baixado, inventariado e
   catalogado em 04/09). O que falta não é o arquivo: é a ESCUTA. Derivado nasce
   de som ouvido e aprovado, e nada foi ouvido. Preencher hash e origem sem isso
   seria inventar procedência. A régua fica verde nesse estado e vermelha no
   instante em que alguém escrever um derivado incompleto.

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
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  /* Os DOIS hashes exigem formato. `sha256Fonte` só era cobrado como "texto não
     vazio", então "conferido" ou "TODO" passavam por procedência — campo com cara de
     prova e conteúdo de bilhete. */
  for (const campo of ['sha256', 'sha256Fonte']) {
    if (d[campo] && !/^[0-9a-f]{64}$/.test(d[campo])) {
      erros.push(`PRV1 derivado \`${d.arquivo}\`: \`${campo}\` não é hash sha-256 hexadecimal`
        + ` (veio "${String(d[campo]).slice(0, 24)}"). Campo de procedência que aceita texto livre`
        + ' não prova nada.');
    }
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

/* ── PRV6: o EMPACOTADOR recusa o que não pode ser redistribuído ───────────
   A cláusula PRV5 do `assets-check` filtrava por PREFIXO (`audio/piloto/`), e o
   empacotador reescreve todo caminho para `audio/a/<sha1>`. Medido: no manifest
   que o jogador recebe, `folhas.filter(f => f.startsWith('audio/piloto/'))` dá
   ZERO — a cláusula era estruturalmente incapaz de disparar em produção.

   O que sobrevive ao rename é o CONTEÚDO, então a chave passa a ser o sha-256. E
   a checagem forte não é no manifest instalado: é no próprio empacotador, que é
   quem monta o zip. `audio-pack.zip` é publicado como asset de release — um
   pacote SÓ DE ÁUDIO, que é exatamente a forma que a Fab Standard License proíbe
   (`redistribuicao: proibida-standalone`). Nome hasheado não muda isso.

   A fixture monta uma árvore com um derivado `livre` e um derivado Fab, roda o
   empacotador REAL contra ela e exige que ele RECUSE por causa do Fab. */
{
  const tmp = mkdtempSync(join(tmpdir(), 'csbr-prv6-'));
  try {
    const AUD = join(tmp, 'public', 'audio');
    mkdirSync(join(AUD, 'piloto'), { recursive: true });
    mkdirSync(join(AUD, 'menu-music'), { recursive: true });
    writeFileSync(join(AUD, 'menu-music', 'm01.mp3'), 'fixture menu\n');
    const grava = (nome, txt) => {
      writeFileSync(join(AUD, 'piloto', nome), txt);
      return createHash('sha256').update(txt).digest('hex');
    };
    const shaLivre = grava('proprio.wav', 'fixture obra propria\n');
    const shaFab = grava('fab.wav', 'fixture derivado fab\n');
    const ledger = {
      versao: 1, prefixoDerivado: 'audio/piloto/',
      /* O evento precisa estar em `derivado` com caminho `arma`: a política é
         allowlist e cobra o contrato inteiro, não só a licença da fonte. */
      piloto: [{ evento: 'ak.shot', descricao: 'fixture', decisao: 'derivado', caminhoRuntime: 'arma' }],
      fontes: {
        propria: { titulo: 'f', autor: 'f', url: 'f', licenca: 'AGPL', redistribuicao: 'livre', usoComIA: 'sim', notas: 'f' },
        fab: { titulo: 'f', autor: 'f', url: 'f', licenca: 'Fab Standard License', redistribuicao: 'proibida-standalone', usoComIA: 'nao', notas: 'f' },
      },
      derivados: [
        { arquivo: 'audio/piloto/proprio.wav', evento: 'ak.shot', fonte: 'propria', origemNoPack: 'x', sha256: shaLivre, sha256Fonte: 'e'.repeat(64), transformacao: 'x', aprovacao: 'aprovado', escutaAB: { por: 'fixture', data: '2026-09-04' } },
        { arquivo: 'audio/piloto/fab.wav', evento: 'ak.shot', fonte: 'fab', origemNoPack: 'x', sha256: shaFab, sha256Fonte: 'e'.repeat(64), transformacao: 'x', aprovacao: 'aprovado', escutaAB: { por: 'fixture', data: '2026-09-04' } },
      ],
    };
    const ledgerPath = join(tmp, 'ledger.json');
    writeFileSync(ledgerPath, JSON.stringify(ledger));
    writeFileSync(join(AUD, 'manifest.json'), JSON.stringify({
      weapons: { ak: ['audio/piloto/proprio.wav', 'audio/piloto/fab.wav'] },
    }));

    const rodar = () => {
      try {
        execFileSync('node', [join(RAIZ, 'scripts', 'build-audio-pack.mjs'), join(tmp, 'out'),
          `--raiz=${AUD}`, `--ledger=${ledgerPath}`], { encoding: 'utf8', stdio: 'pipe' });
        return { saida: 0, texto: '' };
      } catch (e) { return { saida: e.status ?? 1, texto: String(e.stdout || '') + String(e.stderr || '') }; }
    };
    const comFab = rodar();
    if (comFab.saida === 0) {
      erros.push('PRV6 o empacotador ACEITOU um derivado de fonte `proibida-standalone`.'
        + ' `audio-pack.zip` é publicado como asset de release e é um pacote só de áudio —'
        + ' a forma exata que a Fab Standard License proíbe. Nome hasheado não resolve:'
        + ' o que é redistribuído é o conteúdo, não o nome.');
    } else if (!/fab\.wav|proibida-standalone|redistribu/i.test(comFab.texto)) {
      erros.push(`PRV6 o empacotador saiu ${comFab.saida}, mas sem dizer que o motivo é redistribuição`
        + ` proibida (saída: ${comFab.texto.trim().split('\n')[0] || '(vazia)'}). Recusa sem diagnóstico`
        + ' manda quem builda procurar no lugar errado.');
    }

    /* IRMÃ: sem o derivado Fab, o mesmo empacotador tem que ACEITAR. Sem isto, um
       empacotador que recusasse tudo passaria na cláusula acima (lição 1). */
    ledger.derivados = ledger.derivados.filter((d) => d.fonte !== 'fab');
    writeFileSync(ledgerPath, JSON.stringify(ledger));
    writeFileSync(join(AUD, 'manifest.json'), JSON.stringify({ weapons: { ak: ['audio/piloto/proprio.wav'] } }));
    const semFab = rodar();
    if (semFab.saida !== 0) {
      erros.push(`PRV6 IRMÃ: sem nenhum derivado Fab o empacotador ainda saiu ${semFab.saida}`
        + ` (${semFab.texto.trim().split('\n')[0]}). Um empacotador que recusa tudo passaria na`
        + ' cláusula de cima sem proteger nada.');
    }
    if (comFab.saida !== 0 && semFab.saida === 0) {
      notas.push('PRV6 ok: o empacotador recusa derivado `proibida-standalone` e aceita obra própria.');
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/* ── PRV7: a DECISÃO do ledger controla o manifest ─────────────────────────
   O ledger dizia `decisao`/`aprovacao` e nada lia. `weaponSamples: true` no
   manifest ligava o caminho por sample para qualquer caminho que estivesse em
   `weapons`, aprovado ou não — o contrato existia no papel e o runtime não sabia
   dele. O gerador é o ponto de autoria: derivado pendente ou rejeitado não pode
   sair do outro lado, nem com `weaponSamples` ligado.

   A chave é o sha-256, igual à PRV5/PRV6 — caminho não sobrevive ao empacotador
   e nome de arquivo não é contrato (lição 14). */
{
  const tmp = mkdtempSync(join(tmpdir(), 'csbr-prv7-'));
  try {
    const AUD = join(tmp, 'public', 'audio');
    mkdirSync(join(AUD, 'piloto'), { recursive: true });
    const grava = (nome, txt) => {
      writeFileSync(join(AUD, 'piloto', nome), txt);
      return createHash('sha256').update(txt).digest('hex');
    };
    const shaOk = grava('aprovado.wav', 'fixture aprovado\n');
    const shaPendente = grava('pendente.wav', 'fixture pendente\n');
    const shaRejeitado = grava('rejeitado.wav', 'fixture rejeitado\n');
    const base = (sha, aprovacao) => ({
      arquivo: `audio/piloto/${aprovacao}.wav`, evento: 'ak.shot', fonte: 'propria',
      origemNoPack: 'x', sha256: sha, sha256Fonte: 'e'.repeat(64), transformacao: 'x',
      aprovacao, escutaAB: aprovacao === 'aprovado' ? { por: 'fixture', data: '2026-09-04' } : null,
    });
    const ledgerPath = join(tmp, 'ledger.json');
    writeFileSync(ledgerPath, JSON.stringify({
      versao: 1, prefixoDerivado: 'audio/piloto/',
      piloto: [{ evento: 'ak.shot', descricao: 'fixture', decisao: 'derivado', caminhoRuntime: 'arma' }],
      fontes: { propria: { titulo: 'f', autor: 'f', url: 'f', licenca: 'AGPL', redistribuicao: 'livre', usoComIA: 'sim', notas: 'f' } },
      derivados: [base(shaOk, 'aprovado'), base(shaPendente, 'pendente'), base(shaRejeitado, 'rejeitado')],
    }));
    /* `weaponSamples: true` de propósito: é o cenário do defeito. */
    writeFileSync(join(AUD, 'manifest.json'), JSON.stringify({
      weaponSamples: true,
      weapons: { ak: ['audio/piloto/aprovado.wav', 'audio/piloto/pendente.wav', 'audio/piloto/rejeitado.wav'] },
    }));

    let saiu = null;
    try {
      execFileSync('node', [join(RAIZ, 'tools', 'gen-audio-manifest.mjs'), `--raiz=${AUD}`, `--ledger=${ledgerPath}`],
        { encoding: 'utf8', stdio: 'pipe' });
      saiu = JSON.parse(readFileSync(join(AUD, 'manifest.json'), 'utf8'));
    } catch (e) {
      erros.push(`PRV7 o gerador não rodou na fixture (${String(e.stderr || e.message).split('\n')[0]}).`);
    }
    if (saiu) {
      const armas = saiu.weapons?.ak || [];
      const vazou = armas.filter((f) => /pendente|rejeitado/.test(f));
      if (vazou.length) {
        erros.push(`PRV7 o gerador deixou ${vazou.length} derivado(s) NÃO APROVADO(S) no manifest`
          + ` (${vazou.join(', ')}) com \`weaponSamples: true\`. A \`decisao\`/\`aprovacao\` do ledger`
          + ' não controla nada: o runtime sorteia por `_pick(pack.weapons[w])` e pode tocar um som'
          + ' que ninguém aprovou.');
      } else if (!armas.includes('audio/piloto/aprovado.wav')) {
        /* IRMÃ: um gerador que apagasse TUDO passaria na cláusula de cima sem
           entregar nada. O aprovado tem que sobreviver. */
        erros.push('PRV7 IRMÃ: o gerador tirou também o derivado APROVADO'
          + ` (sobrou ${JSON.stringify(armas)}). Apagar tudo não é filtrar.`);
      } else {
        notas.push(`PRV7 ok: o gerador manteve o aprovado e tirou pendente e rejeitado (${armas.length} de 3).`);
      }
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/* ── PRV8: `sha256Fonte` bate com `origemNoPack` no staging privado ────────
   Formato certo não é prova: um hash bem formado e inventado passa na PRV1. A
   prova é recalcular o hash do arquivo FONTE e comparar.

   Isto só é mensurável onde o staging privado existe. Em clone limpo — e é assim
   que a Vercel builda — a cláusula se declara **NÃO MEDIDA** e diz o que falta,
   em vez de passar calada fingindo prova (lição 5). Ela não reprova a régua nesse
   caso, porque a ausência do pacote privado é o estado normal de um clone: o que
   ela não pode fazer é dizer "conferido" sem ter conferido. */
{
  const stagingDe = (id) => L.fontes?.[id]?.stagingPrivado;
  const derivados = (L.derivados || []).filter((d) => stagingDe(d.fonte));
  if (!derivados.length) {
    notas.push('PRV8 nada a conferir: nenhum derivado aponta para fonte com staging privado.');
  } else {
    const semStaging = [], divergentes = [], conferidos = [];
    for (const d of derivados) {
      /* `stagingPrivado` é relativo ao HOME do dono, não ao repositório — o staging
         mora fora da árvore de propósito. */
      const base = join(process.env.HOME || '', 'csbrasil', stagingDe(d.fonte));
      const alvo = join(base, 'extracted-wav', d.origemNoPack);
      /* Duas ausências DIFERENTES. Staging inteiro ausente = clone limpo, não medido.
         Staging presente e o arquivo apontado ausente = `origemNoPack` errado, que é
         defeito e tem que reprovar. Misturar os dois deixaria um caminho inventado
         passar como "não medido" na máquina que TEM o pacote. */
      if (!existsSync(alvo)) {
        if (existsSync(base)) {
          erros.push(`PRV8 \`origemNoPack\` de ${d.arquivo} aponta para \`${d.origemNoPack}\`, que não`
            + ' existe no staging privado — e o staging ESTÁ nesta máquina. Caminho de origem errado.');
        } else semStaging.push(`${d.arquivo} -> ${d.origemNoPack}`);
        continue;
      }
      const real = createHash('sha256').update(readFileSync(alvo)).digest('hex');
      if (real !== d.sha256Fonte) {
        divergentes.push(`${d.arquivo}: origemNoPack tem ${real.slice(0, 12)}…, ledger diz ${String(d.sha256Fonte).slice(0, 12)}…`);
      } else conferidos.push(d.arquivo);
    }
    if (divergentes.length) {
      erros.push(`PRV8 ${divergentes.length} derivado(s) com \`sha256Fonte\` que NÃO bate com o arquivo`
        + ` apontado por \`origemNoPack\` (${divergentes.slice(0, 3).join('; ')}).`
        + ' O derivado não veio do arquivo que o ledger diz que ele veio.');
    }
    if (semStaging.length) {
      notas.push(`PRV8 NÃO MEDIDA para ${semStaging.length} derivado(s): o staging privado não existe`
        + ` nesta máquina (ex.: ${semStaging[0]}). Em clone limpo isso é o normal — a cláusula`
        + ' diz que não conferiu em vez de dizer que conferiu.');
    }
    if (conferidos.length) {
      notas.push(`PRV8 ok: ${conferidos.length} derivado(s) com sha256Fonte conferido contra o arquivo real.`);
    }
  }
}

/* ── PRV9: o LEGADO está catalogado, e ninguém diz que foi substituído ─────
   `public/audio/manifest.example.json` é VERSIONADO e é o que o `fetch-audio.sh`
   copia quando o zip não traz manifest. Ele nomeia arquivos que apontam para
   Valve (`awp-cs-1-6`, `usp_unsil`, `knife_slash`, `half-life`) e Epic
   (`ut-double-kill`) — e o próprio `public/js/audio.js:2` diz que sample real de
   CS não pode ser embutido. **Esta lane não substituiu nada disso.**

   PRV5 casa por sha-256 e estes arquivos não existem em clone limpo: sem hash não
   há o que casar, então eles estão FORA daquela cobertura. Esta cláusula cobra o
   que dá para cobrar sem os bytes — a catalogação por nome — e cobra nos dois
   sentidos, para a lista não envelhecer:

     · toda folha suspeita do manifest de exemplo casa um padrão declarado;
     · todo padrão declarado casa pelo menos uma folha (padrão morto vira falso
       conforto de "está catalogado").

   A lista de arquivos NÃO é escrita à mão: ela é recomputada do manifest a cada
   execução. Lista à mão de 45 caminhos envelhece no primeiro som novo. */
{
  const EXEMPLO = 'public/audio/manifest.example.json';
  const leg = L.legado;
  if (!leg) {
    erros.push('PRV9 o ledger não tem a seção `legado`. Os sons herdados de nome CS/Valve/UT'
      + ' precisam estar catalogados ou explicitamente bloqueados — não declarados resolvidos.');
  } else if (!existsSync(EXEMPLO)) {
    erros.push(`PRV9 NÃO MEDIDA: ${EXEMPLO} não existe, e é dele que a lista de legado é derivada.`);
  } else {
    const folhas = [];
    (function rec(o) {
      if (Array.isArray(o)) o.forEach(rec);
      else if (o && typeof o === 'object') Object.values(o).forEach(rec);
      else if (typeof o === 'string') folhas.push(o);
    })(JSON.parse(readFileSync(EXEMPLO, 'utf8')));

    if (!L.fontes?.[leg.fonte]) {
      erros.push(`PRV9 \`legado.fonte\` aponta para \`${leg.fonte}\`, que não existe em \`fontes\`.`);
    } else if (L.fontes[leg.fonte].redistribuicao !== 'proibida') {
      erros.push(`PRV9 a fonte do legado está como \`${L.fontes[leg.fonte].redistribuicao}\`;`
        + ' procedência desconhecida tem que ser `proibida` até alguém verificar.');
    }

    const padroes = (leg.padroes || []).map((p) => ({ ...p, re: new RegExp(p.padrao, 'i') }));
    /* O que "cheira" a legado, independente dos padrões declarados: é a rede que
       pega padrão que alguém esqueceu de declarar. */
    const SUSPEITO = /cs-1-6|cs-go|counter-strike|half-life|^audio\/game\/ut-|knife_|usp_|awp|glock18|deagle|m4a1|mp5-|p90-|galil|famas|aug-|sg55|xm1014|m249|scout_|m3-1|mac10|g3sg1|sg550|generic_reload/i;
    const suspeitas = folhas.filter((f) => SUSPEITO.test(f));
    const semPadrao = suspeitas.filter((f) => !padroes.some((p) => p.re.test(f)));
    if (semPadrao.length) {
      erros.push(`PRV9 ${semPadrao.length} caminho(s) de aparência legada no ${EXEMPLO} não casam`
        + ` nenhum padrão declarado em \`legado.padroes\` (ex.: ${semPadrao.slice(0, 3).join(', ')}).`
        + ' Som herdado novo entrando sem catalogação é o legado crescendo calado.');
    }
    const mortos = padroes.filter((p) => !folhas.some((f) => p.re.test(f)));
    if (mortos.length) {
      erros.push(`PRV9 ${mortos.length} padrão(ões) de legado não casam nada (ex.: ${mortos[0].padrao}).`
        + ' Padrão morto dá falso conforto de "está catalogado".');
    }
    if (leg.cobertoPorPRV5 !== false) {
      erros.push('PRV9 `legado.cobertoPorPRV5` tem que ser `false`: sem hash, a PRV5 não alcança estes'
        + ' arquivos, e dizer que alcança é a régua mentindo sobre a própria cobertura.');
    }
    if (!semPadrao.length && !mortos.length) {
      notas.push(`PRV9 ok: ${suspeitas.length} de ${folhas.length} caminhos do manifest de exemplo são`
        + ` legado nominal CS/Valve/UT, todos catalogados como \`${leg.decisao}\`.`
        + ' NÃO foram substituídos — e a régua não deixa dizer que foram.');
    }
  }
}

/* ── PRV10: FAIL-CLOSED no prefixo derivado ────────────────────────────────
   O ESCAPE P0 QUE ESTA CLÁUSULA FECHA (auditoria independente, 4ª rodada):

   A trava do empacotador montava uma DENYLIST a partir de `ledger.derivados`.
   Arquivo que não estava no ledger não casava hash nenhum, não era barrado, e era
   copiado. Reproduzido: fonte `proibida-standalone`, `derivados: []`, manifest
   apontando `audio/piloto/nao-catalogado.wav` — o builder saiu **0** e gerou o
   zip com o arquivo dentro.

   É a lição 1 na veia: a régua perguntava "este arquivo é um mau conhecido?" e era
   estruturalmente incapaz de ver o desconhecido. Denylist onde o contrato pedia
   ALLOWLIST — e o estado ruim (asset não catalogado) era justamente o que passava.

   A regra certa: sob `prefixoDerivado`, NADA atravessa sem estar no ledger com
   hash coerente, aprovação e fonte compatível. Desconhecido REPROVA.

   Três cenários no mesmo builder real:
     a) não catalogado sob o prefixo  -> tem que RECUSAR (era o escape)
     b) catalogado, aprovado, `livre` -> tem que ACEITAR (IRMÃ: builder que
        recusa tudo não protege nada, só quebra)
     c) caminho do legado por NOME    -> tem que RECUSAR sem depender de hash */
{
  const tmp = mkdtempSync(join(tmpdir(), 'csbr-prv10-'));
  try {
    const AUD = join(tmp, 'public', 'audio');
    mkdirSync(join(AUD, 'piloto'), { recursive: true });
    mkdirSync(join(AUD, 'game'), { recursive: true });
    mkdirSync(join(AUD, 'menu-music'), { recursive: true });
    writeFileSync(join(AUD, 'menu-music', 'm01.mp3'), 'fixture menu\n');
    const grava = (sub, nome, txt) => {
      writeFileSync(join(AUD, sub, nome), txt);
      return createHash('sha256').update(txt).digest('hex');
    };
    const shaOk = grava('piloto', 'aprovado.wav', 'fixture obra propria aprovada\n');
    grava('piloto', 'nao-catalogado.wav', 'fixture NAO catalogado\n');
    grava('game', 'awp-cs-1-6.mp3', 'fixture legado valve\n');

    const ledgerBase = {
      versao: 1, prefixoDerivado: 'audio/piloto/',
      piloto: [{ evento: 'ak.shot', descricao: 'f', decisao: 'derivado', caminhoRuntime: 'arma' }],
      fontes: {
        propria: { titulo: 'f', autor: 'f', url: 'f', licenca: 'AGPL', redistribuicao: 'livre', usoComIA: 'sim', notas: 'f' },
        legado: { titulo: 'f', autor: 'f', url: 'f', licenca: 'DESCONHECIDA', redistribuicao: 'proibida', usoComIA: 'nao', notas: 'f' },
      },
      derivados: [{
        arquivo: 'audio/piloto/aprovado.wav', evento: 'ak.shot', fonte: 'propria', origemNoPack: 'x',
        sha256: shaOk, sha256Fonte: 'e'.repeat(64), transformacao: 'x', aprovacao: 'aprovado',
        escutaAB: { por: 'fixture', data: '2026-09-04' },
      }],
      legado: {
        decisao: 'bloqueado-por-procedencia-desconhecida', fonte: 'legado',
        ondeEstao: 'x', cobertoPorPRV5: false, porqueNaoCoberto: 'x',
        padroes: [{ padrao: 'cs-1-6', porque: 'fixture' }],
      },
    };
    const ledgerPath = join(tmp, 'ledger.json');
    const rodar = (manifest, tag) => {
      writeFileSync(ledgerPath, JSON.stringify(ledgerBase));
      writeFileSync(join(AUD, 'manifest.json'), JSON.stringify(manifest));
      const out = join(tmp, 'out-' + tag);
      try {
        execFileSync('node', [join(RAIZ, 'scripts', 'build-audio-pack.mjs'), out,
          `--raiz=${AUD}`, `--ledger=${ledgerPath}`], { encoding: 'utf8', stdio: 'pipe' });
        return { saida: 0, texto: '', zip: existsSync(join(out, 'audio-pack.zip')) };
      } catch (e) {
        return { saida: e.status ?? 1, texto: String(e.stdout || '') + String(e.stderr || ''),
          zip: existsSync(join(out, 'audio-pack.zip')) };
      }
    };

    const a = rodar({ weapons: { ak: ['audio/piloto/nao-catalogado.wav'] } }, 'a');
    if (a.saida === 0 || a.zip) {
      erros.push('PRV10a ESCAPE: o empacotador ACEITOU `audio/piloto/nao-catalogado.wav`, que não existe'
        + ` no ledger (saiu ${a.saida}, zip ${a.zip ? 'gerado' : 'não gerado'}). A trava era DENYLIST:`
        + ' só barrava hash conhecido, e o desconhecido passava. Sob o prefixo derivado a regra tem'
        + ' que ser allowlist — desconhecido REPROVA.');
    }

    const b = rodar({ weapons: { ak: ['audio/piloto/aprovado.wav'] } }, 'b');
    if (b.saida !== 0 || !b.zip) {
      erros.push(`PRV10b IRMÃ: o empacotador RECUSOU o derivado catalogado, aprovado e de fonte \`livre\``
        + ` (saiu ${b.saida}: ${b.texto.trim().split('\n')[0]}). Builder que recusa tudo não protege`
        + ' nada — a cláusula (a) passaria por construção.');
    }

    const c = rodar({ cs: { awp: ['audio/game/awp-cs-1-6.mp3'] } }, 'c');
    if (c.saida === 0 || c.zip) {
      erros.push('PRV10c o empacotador aceitou um caminho do LEGADO catalogado como bloqueado'
        + ` (\`audio/game/awp-cs-1-6.mp3\`, saiu ${c.saida}). Sem hash não dá para barrar por conteúdo,`
        + ' mas dá para barrar por NOME — e é o que o catálogo do legado existe para permitir.');
    }

    if (a.saida !== 0 && !a.zip && b.saida === 0 && b.zip && c.saida !== 0 && !c.zip) {
      notas.push('PRV10 ok: sob o prefixo derivado o empacotador é fail-closed — recusa o não catalogado,'
        + ' recusa o legado por nome, e aceita o derivado catalogado e aprovado de fonte livre.');
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/* ── PRV11: fail-closed também no GERADOR ──────────────────────────────────
   O empacotador é a camada decisiva, mas não é a única: `npm run audio` escreve
   o manifest que o runtime lê em desenvolvimento, e ele também montava denylist.
   Um arquivo não catalogado sob o prefixo entrava no manifest e o jogo local
   tocava um som que ninguém catalogou. Mesma regra, mesmo módulo. */
{
  const tmp = mkdtempSync(join(tmpdir(), 'csbr-prv11-'));
  try {
    const AUD = join(tmp, 'public', 'audio');
    mkdirSync(join(AUD, 'piloto'), { recursive: true });
    const grava = (nome, txt) => {
      writeFileSync(join(AUD, 'piloto', nome), txt);
      return createHash('sha256').update(txt).digest('hex');
    };
    const shaOk = grava('aprovado.wav', 'fixture aprovado gerador\n');
    grava('nao-catalogado.wav', 'fixture nao catalogado gerador\n');
    const ledgerPath = join(tmp, 'ledger.json');
    writeFileSync(ledgerPath, JSON.stringify({
      versao: 1, prefixoDerivado: 'audio/piloto/',
      piloto: [{ evento: 'ak.shot', descricao: 'f', decisao: 'derivado', caminhoRuntime: 'arma' }],
      fontes: { propria: { titulo: 'f', autor: 'f', url: 'f', licenca: 'AGPL', redistribuicao: 'livre', usoComIA: 'sim', notas: 'f' } },
      derivados: [{ arquivo: 'audio/piloto/aprovado.wav', evento: 'ak.shot', fonte: 'propria',
        origemNoPack: 'x', sha256: shaOk, sha256Fonte: 'e'.repeat(64), transformacao: 'x',
        aprovacao: 'aprovado', escutaAB: { por: 'fixture', data: '2026-09-04' } }],
    }));
    writeFileSync(join(AUD, 'manifest.json'), JSON.stringify({
      weaponSamples: true,
      weapons: { ak: ['audio/piloto/aprovado.wav', 'audio/piloto/nao-catalogado.wav'] },
    }));
    let saiu = null;
    try {
      execFileSync('node', [join(RAIZ, 'tools', 'gen-audio-manifest.mjs'), `--raiz=${AUD}`, `--ledger=${ledgerPath}`],
        { encoding: 'utf8', stdio: 'pipe' });
      saiu = JSON.parse(readFileSync(join(AUD, 'manifest.json'), 'utf8'));
    } catch (e) { erros.push(`PRV11 o gerador não rodou (${String(e.stderr || e.message).split('\n')[0]}).`); }
    if (saiu) {
      const armas = saiu.weapons?.ak || [];
      if (armas.includes('audio/piloto/nao-catalogado.wav')) {
        erros.push('PRV11 o gerador deixou `audio/piloto/nao-catalogado.wav` no manifest.'
          + ' Sob o prefixo derivado a regra é allowlist: o que não está no ledger não entra,'
          + ' nem no manifest de desenvolvimento.');
      } else if (!armas.includes('audio/piloto/aprovado.wav')) {
        erros.push(`PRV11 IRMÃ: o gerador tirou também o derivado catalogado e aprovado`
          + ` (sobrou ${JSON.stringify(armas)}). Apagar tudo não é filtrar.`);
      } else {
        notas.push('PRV11 ok: o gerador manteve o catalogado e tirou o não catalogado.');
      }
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/* ── PRV12: ledger AUSENTE aborta o gerador ────────────────────────────────
   O empacotador e o `assets-check` já falhavam fechados sem ledger. O gerador
   não: `barrado()` fazia `if (politica.erro) return null`, então com o ledger
   inexistente ele saía **0**, sem diagnóstico, mantendo
   `audio/piloto/nao-catalogado.wav` no manifest de desenvolvimento.

   "Não consigo verificar" virava "pode passar" — que é o contrário do que a
   política diz e o oposto da lição 5: não saber tem que custar o mesmo que estar
   errado. E cobre os dois modos, porque `--check` é o que roda no portão. */
{
  const tmp = mkdtempSync(join(tmpdir(), 'csbr-prv12-'));
  try {
    const AUD = join(tmp, 'public', 'audio');
    mkdirSync(join(AUD, 'piloto'), { recursive: true });
    const conteudo = 'fixture nao catalogado\n';
    writeFileSync(join(AUD, 'piloto', 'nao-catalogado.wav'), conteudo);
    const manifestInicial = { weaponSamples: true, weapons: { ak: ['audio/piloto/nao-catalogado.wav'] } };

    const rodar = (ledger, extra = []) => {
      writeFileSync(join(AUD, 'manifest.json'), JSON.stringify(manifestInicial));
      try {
        execFileSync('node', [join(RAIZ, 'tools', 'gen-audio-manifest.mjs'), `--raiz=${AUD}`,
          `--ledger=${ledger}`, ...extra], { encoding: 'utf8', stdio: 'pipe' });
        return { saida: 0, texto: '' };
      } catch (e) { return { saida: e.status ?? 1, texto: String(e.stdout || '') + String(e.stderr || '') }; }
    };
    const manifestAgora = () => JSON.parse(readFileSync(join(AUD, 'manifest.json'), 'utf8'));

    const ausente = join(tmp, 'nao-existe.json');
    for (const [modo, extra] of [['normal', []], ['--check', ['--check']]]) {
      const r = rodar(ausente, extra);
      const ficou = (manifestAgora().weapons?.ak || []).includes('audio/piloto/nao-catalogado.wav');
      if (r.saida === 0) {
        erros.push(`PRV12 com o ledger AUSENTE o gerador (${modo}) saiu 0${ficou ? ' e manteve' : ' mas tirou'}`
          + ' `audio/piloto/nao-catalogado.wav` no manifest. "Não consigo verificar" virou "pode passar" —'
          + ' o gerador tem que abortar, como o empacotador e o `assets-check` já fazem.');
      } else if (!/ledger|procedência|procedencia/i.test(r.texto)) {
        erros.push(`PRV12 o gerador (${modo}) abortou sem dizer que o motivo é o ledger`
          + ` (saída: ${r.texto.trim().split('\n')[0] || '(vazia)'}).`);
      }
    }

    /* IRMÃ: com ledger VÁLIDO o gerador tem que rodar. Um gerador que abortasse
       sempre passaria na cláusula de cima sem gerar nada (lição 1). */
    const shaOk = createHash('sha256').update(conteudo).digest('hex');
    const bom = join(tmp, 'ledger.json');
    writeFileSync(bom, JSON.stringify({
      versao: 1, prefixoDerivado: 'audio/piloto/',
      piloto: [{ evento: 'ak.shot', descricao: 'f', decisao: 'derivado', caminhoRuntime: 'arma' }],
      fontes: { propria: { titulo: 'f', autor: 'f', url: 'f', licenca: 'AGPL', redistribuicao: 'livre', usoComIA: 'sim', notas: 'f' } },
      derivados: [{ arquivo: 'audio/piloto/nao-catalogado.wav', evento: 'ak.shot', fonte: 'propria',
        origemNoPack: 'x', sha256: shaOk, sha256Fonte: 'e'.repeat(64), transformacao: 'x',
        aprovacao: 'aprovado', escutaAB: { por: 'fixture', data: '2026-09-04' } }],
    }));
    const irma = rodar(bom);
    if (irma.saida !== 0) {
      erros.push(`PRV12 IRMÃ: com ledger VÁLIDO o gerador ainda saiu ${irma.saida}`
        + ` (${irma.texto.trim().split('\n')[0]}). Abortar sempre não é falhar fechado, é não funcionar.`);
    } else if (!(manifestAgora().weapons?.ak || []).includes('audio/piloto/nao-catalogado.wav')) {
      erros.push('PRV12 IRMÃ: com ledger válido e o arquivo catalogado/aprovado, o gerador tirou'
        + ' o caminho do manifest mesmo assim.');
    } else {
      notas.push('PRV12 ok: sem ledger o gerador aborta nos dois modos e diz por quê; com ledger válido gera.');
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/* ── PRV13: o ASSETS-CHECK medido pelo chamador real ───────────────────────
   PRV10 e PRV11 rodam o empacotador e o gerador de verdade. A terceira camada —
   `tools/eval/assets-check.mjs` — só tinha prova MANUAL, feita à mão numa rodada
   e não repetida em nenhuma outra. Prova manual não roda no portão: ela vale no
   dia em que alguém a digita e envelhece no dia seguinte.

   Aqui o script real roda contra fixture, com `--raiz`/`--ledger`/`--so=audio`.
   Três cenários e a irmã, iguais aos do empacotador — porque é a mesma política
   e a mesma pergunta, só que sobre o pacote instalado. */
{
  const tmp = mkdtempSync(join(tmpdir(), 'csbr-prv13-'));
  try {
    const PUB = join(tmp, 'public');
    mkdirSync(join(PUB, 'audio', 'piloto'), { recursive: true });
    mkdirSync(join(PUB, 'audio', 'game'), { recursive: true });
    const grava = (sub, nome, txt) => {
      writeFileSync(join(PUB, 'audio', sub, nome), txt);
      return createHash('sha256').update(txt).digest('hex');
    };
    const shaOk = grava('piloto', 'aprovado.wav', 'fixture aprovado assets\n');
    grava('piloto', 'nao-catalogado.wav', 'fixture nao catalogado assets\n');
    grava('game', 'awp-cs-1-6.mp3', 'fixture legado assets\n');

    const ledgerPath = join(tmp, 'ledger.json');
    writeFileSync(ledgerPath, JSON.stringify({
      versao: 1, prefixoDerivado: 'audio/piloto/',
      piloto: [{ evento: 'ak.shot', descricao: 'f', decisao: 'derivado', caminhoRuntime: 'arma' }],
      fontes: {
        propria: { titulo: 'f', autor: 'f', url: 'f', licenca: 'AGPL', redistribuicao: 'livre', usoComIA: 'sim', notas: 'f' },
        legado: { titulo: 'f', autor: 'f', url: 'f', licenca: 'DESCONHECIDA', redistribuicao: 'proibida', usoComIA: 'nao', notas: 'f' },
      },
      derivados: [{ arquivo: 'audio/piloto/aprovado.wav', evento: 'ak.shot', fonte: 'propria',
        origemNoPack: 'x', sha256: shaOk, sha256Fonte: 'e'.repeat(64), transformacao: 'x',
        aprovacao: 'aprovado', escutaAB: { por: 'fixture', data: '2026-09-04' } }],
      legado: { decisao: 'bloqueado-por-procedencia-desconhecida', fonte: 'legado', ondeEstao: 'x',
        cobertoPorPRV5: false, porqueNaoCoberto: 'x', padroes: [{ padrao: 'cs-1-6', porque: 'fixture' }] },
    }));

    const rodar = (caminho) => {
      writeFileSync(join(PUB, 'audio', 'manifest.json'), JSON.stringify({ weapons: { ak: [caminho] } }));
      try {
        const out = execFileSync('node', [join(RAIZ, 'tools', 'eval', 'assets-check.mjs'),
          `--raiz=${PUB}`, `--ledger=${ledgerPath}`, '--so=audio'], {
          cwd: tmp,
          encoding: 'utf8',
          stdio: 'pipe',
        });
        return { saida: 0, texto: out };
      } catch (e) { return { saida: e.status ?? 1, texto: String(e.stdout || '') + String(e.stderr || '') }; }
    };

    const a = rodar('audio/piloto/nao-catalogado.wav');
    if (a.saida === 0) {
      erros.push('PRV13a o `assets-check` ACEITOU `audio/piloto/nao-catalogado.wav` no pacote instalado.'
        + ' Sob o prefixo derivado o desconhecido tem que reprovar — é a mesma allowlist do empacotador.');
    }
    const c = rodar('audio/game/awp-cs-1-6.mp3');
    if (c.saida === 0) {
      erros.push('PRV13c o `assets-check` aceitou um caminho do LEGADO catalogado como bloqueado'
        + ' (`audio/game/awp-cs-1-6.mp3`). O bloqueio é por NOME — sem hash não há bloqueio por conteúdo.');
    }
    /* IRMÃ: o catalogado, aprovado e de fonte livre TEM que passar. Sem ela, um
       `assets-check` que recusasse tudo passaria em (a) e (c) sem proteger nada. */
    const b = rodar('audio/piloto/aprovado.wav');
    if (b.saida !== 0) {
      erros.push(`PRV13b IRMÃ: o \`assets-check\` REPROVOU o derivado catalogado, aprovado e de fonte`
        + ` \`livre\` (saiu ${b.saida}: ${b.texto.trim().split('\n').pop()}).`
        + ' Régua que recusa tudo não protege nada.');
    }
    if (a.saida !== 0 && c.saida !== 0 && b.saida === 0) {
      notas.push('PRV13 ok: o `assets-check` real reprova o não catalogado e o legado, e aceita o'
        + ' catalogado/aprovado/livre — prova automatizada, não mais manual.');
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

const rotulo = mutante ? `PROVENIENCIA [mutante=${mutante}]` : 'PROVENIENCIA';
for (const n of notas) console.log(`  ✓ ${n}`);
if (erros.length) {
  console.error(`\n${rotulo}: ${erros.length} cláusula(s) vermelha(s)\n`);
  for (const e of erros) console.error(`  ✗ ${e}\n`);
  process.exit(1);
}
console.log(`\n${rotulo}: verde — ${LEDGER} declara origem, licença e aprovação de tudo que pode entrar numa build.\n`);
