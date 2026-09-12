#!/usr/bin/env node
/* ============================================================================
   inventariar.mjs — METADADO DO STAGING PRIVADO, E SÓ METADADO.
   ----------------------------------------------------------------------------
   PARA QUE SERVE
   O pacote fonte do piloto Fab mora FORA do git (`private-assets/`, ignorado) e a
   listagem dele diz `Allows usage with AI: No`. Sem uma ferramenta, a única forma
   de saber o que tem lá dentro é abrir os arquivos — e "abrir" com um agente no
   meio é justamente o que a licença proíbe.

   Esta ferramenta lê o áudio LOCALMENTE, com `ffprobe`, e emite um JSON com
   nome, hash, formato, duração, canais, taxa, pico e loudness. Nada de forma de
   onda, nada de transcrição, nada de amostra: **o que sai daqui é o que caberia
   numa etiqueta**, e é isso que pode virar entrada de decisão.

   O QUE ELA NUNCA FAZ, e é o ponto:
     · não copia, converte nem move um único WAV;
     · não escreve nada dentro de `public/` nem em caminho versionado;
     · não fala com a rede.

   ── DETERMINISMO ───────────────────────────────────────────────────────────
   Mesmo diretório, mesma saída, byte a byte: a lista é ordenada pelo caminho
   relativo, os números são arredondados em casas fixas e não há timestamp de
   execução no corpo. Rodar duas vezes e comparar com `diff` é a maneira de
   descobrir que o staging mudou — que é o uso real desta ferramenta.

   ── SAÍDA ──────────────────────────────────────────────────────────────────
   Por arquivo: `caminho` (relativo à raiz inventariada), `bytes`, `sha256`,
   `formato`, `codec`, `duracaoS`, `canais`, `taxaHz`, `bitsPorAmostra`,
   `picoDb`, `loudnessLufs` e `medicao`. Pico e loudness só aparecem quando o
   `ffmpeg` local os calcula; quando não, o campo vem `null` e o cabeçalho DIZ que
   não foram medidos — campo ausente disfarçado de zero é a lição 5.

   `medicao` é POR ARQUIVO (`ok` · `falhou` · `ausente` · `pulado`) porque a
   ferramenta pode existir e mesmo assim falhar num arquivo: um WAV truncado saía
   com tudo `null`, `ffprobe: true` e `naoMedido: []` — indistinguível de uma
   medição bem-sucedida que achou null. O topo traz `falhas` e
   `arquivosComFalha`, e o processo SAI 1 (salvo `--tolerante`).

   `sha256` é o que liga este inventário ao `sha256Fonte` do
   `docs/audio/proveniencia.json`: é ele que prova de qual arquivo do pacote
   comprado um derivado saiu.

   ── USO ────────────────────────────────────────────────────────────────────
     node tools/audio/inventariar.mjs <dir> [--saida=<arquivo.json>] [--rapido]
                                            [--tolerante]
     node tools/audio/inventariar.mjs --autoteste

   `--rapido` pula pico/loudness (uma passada de ffmpeg por arquivo). `--saida`
   sem caminho versionado: a ferramenta RECUSA escrever dentro do repositório.
   ============================================================================ */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const EXT_AUDIO = /\.(wav|mp3|ogg|m4a|aiff?|flac|webm)$/i;
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const RAPIDO = process.argv.includes('--rapido');

function temFerramenta(bin) {
  try { execFileSync(bin, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
}

function listar(dir) {
  const achados = [];
  (function anda(d) {
    for (const f of readdirSync(d).sort()) {
      if (f.startsWith('.')) continue;
      const p = join(d, f);
      if (statSync(p).isDirectory()) anda(p);
      else if (EXT_AUDIO.test(f)) achados.push(p);
    }
  })(dir);
  return achados.sort();
}

function sonda(abs) {
  const bruto = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=format_name,duration:stream=codec_name,channels,sample_rate,bits_per_sample,bits_per_raw_sample',
    '-of', 'json', abs], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const j = JSON.parse(bruto);
  const s = (j.streams || [])[0] || {};
  return {
    formato: j.format?.format_name ?? null,
    codec: s.codec_name ?? null,
    duracaoS: j.format?.duration != null ? +(+j.format.duration).toFixed(3) : null,
    canais: s.channels ?? null,
    taxaHz: s.sample_rate != null ? +s.sample_rate : null,
    bitsPorAmostra: +(s.bits_per_sample || s.bits_per_raw_sample) || null,
  };
}

/* Pico e loudness numa passada só de `ffmpeg -f null`. Os dois filtros escrevem no
   STDERR mesmo quando dão certo — por isso `spawnSync`, e não `execFileSync`, que
   só entrega o stderr no caminho de exceção e devolvia null com o ffmpeg presente. */
function nivel(abs) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', abs,
    '-af', 'astats=measure_perchannel=none:measure_overall=Peak_level,ebur128=framelog=quiet',
    '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const texto = (r.stderr || '') + (r.stdout || '');
  const pico = texto.match(/Peak level dB:\s*(-?[\d.]+|-inf)/);
  /* O `I:` do ebur128 aparece várias vezes (por bloco); o último é o integrado. */
  const lufs = [...texto.matchAll(/I:\s*(-?[\d.]+)\s*LUFS/g)].pop();
  /* Código de saída != 0 OU nenhum dos dois números = falha, não "deu null". */
  if (r.status !== 0 || (!pico && !lufs)) {
    return { ok: false, erro: (texto.trim().split('\n').pop() || `ffmpeg saiu ${r.status}`).slice(0, 200) };
  }
  return {
    ok: true,
    picoDb: pico ? (pico[1] === '-inf' ? null : +(+pico[1]).toFixed(2)) : null,
    loudnessLufs: lufs ? +(+lufs[1]).toFixed(2) : null,
  };
}

function inventariar(dirAbs, { rapido = RAPIDO } = {}) {
  const temFfprobe = temFerramenta('ffprobe');
  const temFfmpeg = !rapido && temFerramenta('ffmpeg');
  const arquivos = listar(dirAbs).map((abs) => {
    const bytes = readFileSync(abs);
    const base = {
      caminho: relative(dirAbs, abs).split('/').join('/'),
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      extensao: extname(abs).toLowerCase().slice(1),
      formato: null, codec: null, duracaoS: null, canais: null, taxaHz: null,
      bitsPorAmostra: null, picoDb: null, loudnessLufs: null,
      /* ESTADO POR ARQUIVO. Antes, um WAV ilegível saía com todos os campos `null`,
         `ferramentas.ffprobe: true` e `naoMedido: []` — a mesma cara de uma medição
         que deu certo e achou null. Lição 5. Régua: `--autoteste`, INV6/INV7/INV8. */
      medicao: { ffprobe: temFfprobe ? 'ok' : 'ausente', nivel: temFfmpeg ? 'ok' : (rapido ? 'pulado' : 'ausente') },
      erro: null,
    };
    if (temFfprobe) {
      try { Object.assign(base, sonda(abs)); } catch (e) {
        base.medicao.ffprobe = 'falhou';
        base.erro = String(e.stderr || e.message || e).trim().split('\n').pop().slice(0, 200);
      }
    }
    if (temFfmpeg) {
      const n = nivel(abs);
      if (n.ok) { base.picoDb = n.picoDb; base.loudnessLufs = n.loudnessLufs; }
      else { base.medicao.nivel = 'falhou'; base.erro = base.erro || n.erro; }
    }
    return base;
  });
  const falhas = arquivos.filter((f) => f.medicao.ffprobe === 'falhou' || f.medicao.nivel === 'falhou');
  return {
    _leia: 'Metadado técnico de arquivos privados. NÃO contém áudio, forma de onda nem transcrição.'
      + ' `sha256` liga ao campo `sha256Fonte` de docs/audio/proveniencia.json.'
      + ' `medicao` por arquivo diz o que foi medido: campo null com `medicao.ffprobe: "falhou"'
      + '` é ausência de dado, não valor.',
    ferramentas: {
      ffprobe: temFfprobe,
      ffmpeg: temFfmpeg,
      naoMedido: [!temFfprobe && 'formato/duração/canais/taxa (ffprobe ausente)',
        !temFfmpeg && 'pico/loudness (ffmpeg ausente ou --rapido)'].filter(Boolean),
    },
    total: arquivos.length,
    falhas: falhas.length,
    arquivosComFalha: falhas.map((f) => ({ caminho: f.caminho, medicao: f.medicao, erro: f.erro })),
    arquivos,
  };
}

/* ── autoteste: a fixture é gerada aqui, com ruído determinístico ──────────
   Prova as duas coisas que importam: o hash e a ordem são estáveis entre
   execuções, e nenhum campo de nível vira 0 quando a ferramenta falta. */
if (process.argv.includes('--autoteste')) {
  const tmp = mkdtempSync(join(tmpdir(), 'csbr-inv-'));
  try {
    mkdirSync(join(tmp, 'b'), { recursive: true });
    const wav = (n, semente) => {
      const dados = Buffer.alloc(n * 2);
      let x = semente;
      for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; dados.writeInt16LE((x % 20000) - 10000, i * 2); }
      const cab = Buffer.alloc(44);
      cab.write('RIFF', 0); cab.writeUInt32LE(36 + dados.length, 4); cab.write('WAVEfmt ', 8);
      cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(1, 22);
      cab.writeUInt32LE(48000, 24); cab.writeUInt32LE(96000, 28); cab.writeUInt16LE(2, 32);
      cab.writeUInt16LE(16, 34); cab.write('data', 36); cab.writeUInt32LE(dados.length, 40);
      return Buffer.concat([cab, dados]);
    };
    writeFileSync(join(tmp, 'b', 'dois.wav'), wav(24000, 7));
    writeFileSync(join(tmp, 'um.wav'), wav(12000, 3));
    writeFileSync(join(tmp, 'leiame.txt'), 'não é áudio');
    /* Arquivo com extensão de áudio e conteúdo que não é áudio: é assim que um
       WAV truncado ou meio-baixado chega. */
    writeFileSync(join(tmp, 'quebrado.wav'), 'isto nao e um wav valido');

    const a = inventariar(tmp), b = inventariar(tmp);
    const falhas = [];
    if (JSON.stringify(a) !== JSON.stringify(b)) falhas.push('INV1 duas execuções no mesmo diretório deram saídas diferentes — não é determinístico.');
    if (a.total !== 3) falhas.push(`INV2 esperava 3 arquivos de áudio, veio ${a.total} (o .txt não pode entrar).`);
    if (a.arquivos.map((f) => f.caminho).join(',') !== 'b/dois.wav,quebrado.wav,um.wav') {
      falhas.push(`INV3 ordem instável: ${a.arquivos.map((f) => f.caminho).join(',')}.`);
    }
    if (a.arquivos[0].sha256 === a.arquivos[1].sha256) falhas.push('INV4 arquivos diferentes com o mesmo sha256.');
    for (const f of a.arquivos) {
      if (!a.ferramentas.ffprobe && f.duracaoS !== null) falhas.push(`INV5 ${f.caminho}: duração preenchida sem ffprobe.`);
      if (!a.ferramentas.ffmpeg && (f.picoDb !== null || f.loudnessLufs !== null)) {
        falhas.push(`INV5 ${f.caminho}: nível preenchido sem ffmpeg — campo não medido tem que vir null, não zero.`);
      }
    }
    /* O DEFEITO QUE ESTAS TRÊS FECHAM: com ffprobe presente e um arquivo ilegível, a
       saída trazia `naoMedido: []`, `ffprobe: true` e todos os campos `null` — a mesma
       cara de uma medição que deu certo e achou null. Lição 5: não saber tem que custar
       o mesmo que estar errado, e aqui não custava nada. */
    const q = a.arquivos.find((f) => f.caminho === 'quebrado.wav');
    if (!q) falhas.push('INV6 o arquivo ilegível sumiu do inventário.');
    else if (q.medicao?.ffprobe !== 'falhou') {
      falhas.push(`INV6 arquivo ilegível marcado como \`${q.medicao?.ffprobe}\`; tinha que ser \`falhou\`.`
        + ' Campo null sem estado é indistinguível de medição bem-sucedida que deu null.');
    }
    if (a.falhas !== 1) falhas.push(`INV7 \`falhas\` no topo veio ${a.falhas}; esperado 1.`);
    const bons = a.arquivos.filter((f) => f.medicao?.ffprobe === 'ok');
    if (a.ferramentas.ffprobe && bons.length !== 2) {
      falhas.push(`INV8 IRMÃ: ${bons.length} de 2 arquivos válidos medidos com sucesso —`
        + ' marcar tudo como falha não é sinalizar falha.');
    }
    if (a.ferramentas.naoMedido.length) console.log(`  (não medido nesta máquina: ${a.ferramentas.naoMedido.join('; ')})`);
    if (falhas.length) { for (const f of falhas) console.error(`  ✗ ${f}`); process.exit(1); }
    console.log(`  ✓ autoteste: ${a.total} arquivos, saída determinística, falha por arquivo sinalizada`
    + ` (${a.falhas} de ${a.total}), campo não medido fica null.`);
    process.exit(0);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

const alvo = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!alvo) {
  console.error('uso: node tools/audio/inventariar.mjs <dir> [--saida=<arquivo.json>] [--rapido]');
  process.exit(2);
}
const dirAbs = resolve(alvo);
if (!existsSync(dirAbs) || !statSync(dirAbs).isDirectory()) {
  console.error(`não é um diretório: ${dirAbs}`);
  process.exit(2);
}
const saida = arg('saida');
if (saida && !relative(RAIZ_REPO, resolve(saida)).startsWith('..')) {
  /* Inventário de material privado não entra no repositório, nem "só pra olhar":
     é a mesma decisão que tirou `public/audio/` e `references/` do git. */
  console.error(`recusado: ${saida} fica dentro do repositório. Escreva fora dele.`);
  process.exit(2);
}

const inv = inventariar(dirAbs);
const texto = JSON.stringify(inv, null, 1) + '\n';
if (saida) { writeFileSync(resolve(saida), texto); console.error(`${inv.total} arquivo(s) -> ${saida}`); }
else process.stdout.write(texto);
if (inv.ferramentas.naoMedido.length) console.error(`NÃO MEDIDO: ${inv.ferramentas.naoMedido.join('; ')}`);
/* Sai 1 quando algum arquivo não pôde ser medido: quem chama isto em pipeline
   precisa saber sem reler o JSON. `--tolerante` para inventariar mesmo assim. */
if (inv.falhas) {
  console.error(`FALHA EM ${inv.falhas} de ${inv.total} arquivo(s):`);
  for (const f of inv.arquivosComFalha.slice(0, 10)) console.error(`  ${f.caminho} — ${f.erro}`);
  if (!process.argv.includes('--tolerante')) process.exitCode = 1;
}
