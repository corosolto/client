#!/usr/bin/env node
/* audio-manifest-marcas-check.mjs — MARCA DE TERCEIRO NÃO MORA EM ARQUIVO PÚBLICO. (MARCA)

   O QUE ESTA RÉGUA FECHA (BUG-136 / issue #1107)
   ─────────────────────────────────────────────
   `public/audio/manifest.example.json` não é documentação inerte. O
   `scripts/fetch-audio.sh:52` faz

       [ -f "$DEST/manifest.json" ] || cp "$DEST/manifest.example.json" "$DEST/manifest.json"

   e o jogo busca exatamente esse `manifest.json` em runtime
   (`public/js/main.js:658` e `public/js/audio.js:84`). O arquivo também é servido
   cru sob `/audio/manifest.example.json` — ele está em `public/` e tem entrada no
   `public/js/data/assetver.js`. Então ele é, ao mesmo tempo, arquivo público do
   repositório E caminho de runtime quando o zip não traz manifest próprio.

   Em 28/10/2026, 45 das 62 folhas nomeavam arquivo de Valve (Counter-Strike,
   Half-Life) ou Epic (Unreal Tournament): `awp-cs-1-6`, `usp_unsil`, `knife_slash`,
   `ut-double-kill`, `m4a1_unsil`. O próprio `public/js/audio.js:2` diz que sample
   real de CS não pode ser embutido.

   A DIFERENÇA PARA A PRV9
   ───────────────────────
   A PRV9 (`audio-proveniencia-check.mjs`) cobra CATALOGAÇÃO: cheiro de legado pode
   ficar, desde que esteja declarado e bloqueado no ledger. É a régua certa para
   nome de arma genérico (`galil-2`, `mp5-2`), que é designação de arma real, não
   propriedade de ninguém.

   Esta régua cobra o subconjunto onde catalogar NÃO resolve: MARCA e nome de
   arquivo de terceiro. Para esses não existe "está catalogado" — tem que sair do
   arquivo público. Por isso a lista aqui é curta e dura, e não tem escape por
   ledger: nenhum campo de JSON desliga esta cláusula.

   NÃO-VACUIDADE
   ─────────────
   Uma régua que varre zero arquivo, ou que anda numa árvore e não acha folha,
   passa verde sem ter olhado nada. É o modo de falha mais caro de um check de
   proibição, porque o verde parece prova. MARCA3 mede o próprio alcance e reprova
   se o varredor ficou cego.

   Uso: node tools/eval/audio-manifest-marcas-check.mjs [--mutante=…]
   Mutantes: marca-volta | chave-sumida | varredor-cego */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const MUTANTES = ['marca-volta', 'chave-sumida', 'varredor-cego'];
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
if (mutante && !MUTANTES.includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante} (conhecidos: ${MUTANTES.join(', ')})`);
  process.exit(2);
}

/* Marca e nome de arquivo de terceiro. Cada entrada diz de quem é — padrão sem dono
   vira lista de superstição que ninguém sabe revisar. */
const MARCAS = [
  { re: /cs[-_ ]?1[-_ ]?6/i,                  dono: 'Valve — Counter-Strike 1.6' },
  { re: /csgo|cs[-_ ]?go/i,                   dono: 'Valve — CS:GO' },
  { re: /counter[-_ ]?strike/i,               dono: 'Valve — Counter-Strike' },
  { re: /half[-_ ]?life/i,                    dono: 'Valve — Half-Life' },
  { re: /unreal|(?:^|[/_-])ut[-_](?=[a-z0-9])|(?:^|[/_-])ut[-_ ]?\d/i, dono: 'Epic — Unreal Tournament' },
  { re: /usp_unsil/i,                         dono: 'Valve — nome de arquivo do CS (usp_unsil)' },
  { re: /m4a1[-_]/i,                          dono: 'Valve — nome de arquivo do CS (m4a1_*)' },
  { re: /ak47[-_]/i,                          dono: 'Valve — nome de arquivo do CS (ak47-*)' },
  { re: /deagle[-_]/i,                        dono: 'Valve — nome de arquivo do CS (deagle-*)' },
  { re: /(?:^|[/_-])valve(?:$|[/_.-])/i,      dono: 'Valve' },
  { re: /(?:^|[/_-])epic(?:$|[/_.-])/i,       dono: 'Epic' },
];

const EXT_AUDIO = /\.(mp3|wav|ogg|m4a|webm)$/i;

const falhas = [];
const notas = [];
const reprova = (id, msg) => falhas.push(`${id}: ${msg}`);

/* ── Alvos: todo manifest de áudio VERSIONADO, não só o de exemplo ───────────
   Lista derivada do git, não escrita à mão: manifest novo entra na régua sozinho.
   Arquivo que não está versionado não é arquivo público, e não é problema daqui. */
let alvos = [];
try {
  alvos = execFileSync('git', ['ls-files', '--', 'public/audio/*.json'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
} catch {
  reprova('MARCA3', '`git ls-files` não rodou. Sem a lista de arquivos versionados esta régua'
    + ' não sabe o que deveria varrer, e verde sem alcance é verde mentiroso.');
}

/* ── Chaves que o runtime realmente lê — extraídas do código, não declaradas ──
   `this.pack?.<chave>` em audio.js + `manifest.<chave>` em main.js. Lista à mão
   aqui envelheceria no primeiro consumidor novo e passaria a reprovar manifest
   legítimo. */
const fonteAudio = readFileSync('public/js/audio.js', 'utf8');
const fonteMain = readFileSync('public/js/main.js', 'utf8');
const chavesLidas = new Set([
  ...[...fonteAudio.matchAll(/this\.pack\??\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
  ...[...fonteMain.matchAll(/\bmanifest\??\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
]);

/* ── CONTRATO: as famílias de pool que o manifest de exemplo tem que demonstrar ──
   Esta lista é CURTA e é um contrato, não um inventário: o manifest de exemplo é o
   que o `fetch-audio.sh` promove a `manifest.json`, então ele precisa exercitar
   todas as famílias que o carregador consome de um pack de samples. Renomear 45
   caminhos em massa quebra o jogo calado se derrubar uma família inteira — e é
   exatamente esse o bug que a própria troca de nomes podia introduzir.

   Cresce quando o carregador ganhar família nova; e a cláusula irmã logo abaixo
   não deixa a lista envelhecer no outro sentido: família que o runtime parou de
   ler vira contrato morto e reprova. */
const POOLS_CONTRATO = ['voice', 'round', 'general', 'cs', 'weapons'];

const contratoMorto = POOLS_CONTRATO.filter((k) => !chavesLidas.has(k));
if (contratoMorto.length) {
  reprova('MARCA2', `o contrato exige a(s) família(s) \`${contratoMorto.join(', ')}\`, mas nenhum`
    + ' consumidor em audio.js/main.js lê mais isso. Contrato morto obriga manifest a carregar'
    + ' pool que ninguém toca — atualize POOLS_CONTRATO junto com o carregador.');
}

let folhasVistas = 0;

for (const alvo of alvos) {
  let dados;
  try {
    dados = JSON.parse(readFileSync(alvo, 'utf8'));
  } catch (e) {
    reprova('MARCA3', `${alvo} não é JSON válido (${e.message}). Manifest quebrado não é varrido.`);
    continue;
  }

  if (mutante === 'chave-sumida') delete dados.weapons;

  const folhas = [];
  (function anda(o) {
    if (mutante === 'varredor-cego') return;
    if (Array.isArray(o)) o.forEach(anda);
    else if (o && typeof o === 'object') Object.values(o).forEach(anda);
    else if (typeof o === 'string') folhas.push(o);
  })(dados);

  if (mutante === 'marca-volta') folhas.push('audio/game/awp-cs-1-6.mp3');
  folhasVistas += folhas.length;

  /* ── MARCA1: nenhuma folha cita marca ou nome de arquivo de terceiro ─────── */
  const sujas = [];
  for (const folha of folhas) {
    for (const { re, dono } of MARCAS) {
      if (re.test(folha)) { sujas.push(`${folha} (${dono})`); break; }
    }
  }
  if (sujas.length) {
    reprova('MARCA1', `${alvo} tem ${sujas.length} caminho(s) citando marca/arquivo de terceiro:`
      + ` ${sujas.slice(0, 5).join('; ')}${sujas.length > 5 ? ` … +${sujas.length - 5}` : ''}.`
      + ' Este arquivo é público E vira o manifest.json de runtime pelo fetch-audio.sh:52.'
      + ' Catalogar no ledger não cobre marca de terceiro — o nome tem que sair.');
  } else {
    notas.push(`MARCA1 ok: ${alvo} — ${folhas.length} caminho(s), nenhum cita marca de terceiro.`);
  }

  /* ── MARCA2: o contrato que o carregador espera continua de pé ────────────
     Renomear 45 caminhos em massa quebra o jogo calado se derrubar uma chave ou
     trocar um array por string. É o bug que esta mudança mesmo podia introduzir.
     Cobra nos DOIS sentidos — só perguntar "toda chave presente é lida?" passa
     verde quando uma família inteira some, que é o estrago mais caro. */
  const topo = Object.keys(dados);
  const orfas = topo.filter((k) => !chavesLidas.has(k));
  if (orfas.length) {
    reprova('MARCA2', `${alvo} declara chave(s) que nenhum consumidor lê: ${orfas.join(', ')}.`
      + ' Ou o carregador perdeu a chave, ou o manifest documenta o que não existe.');
  }
  const ehExemplo = alvo.endsWith('/manifest.example.json');
  const faltando = ehExemplo ? POOLS_CONTRATO.filter((k) => !topo.includes(k)) : [];
  if (faltando.length) {
    reprova('MARCA2', `${alvo} perdeu a(s) família(s) de pool \`${faltando.join(', ')}\`.`
      + ' Este é o arquivo que o fetch-audio.sh:52 promove a manifest.json: família que some aqui'
      + ' vira evento mudo em runtime, sem erro nenhum no console.');
  }
  const malFormadas = [];
  for (const [chave, valor] of Object.entries(dados)) {
    for (const [sub, lista] of Object.entries(valor && typeof valor === 'object' ? valor : {})) {
      if (!Array.isArray(lista) || !lista.length || !lista.every((p) => typeof p === 'string' && EXT_AUDIO.test(p))) {
        malFormadas.push(`${chave}.${sub}`);
      }
    }
  }
  if (malFormadas.length) {
    reprova('MARCA2', `${alvo}: ${malFormadas.length} pool(s) não são array não-vazio de caminho de áudio`
      + ` (ex.: ${malFormadas.slice(0, 3).join(', ')}). O carregador faz _pick() direto no array.`);
  }
  if (!orfas.length && !faltando.length && !malFormadas.length) {
    notas.push(`MARCA2 ok: ${alvo} — ${topo.length} chave(s) de topo, todas lidas pelo runtime`
      + `${ehExemplo ? `, as ${POOLS_CONTRATO.length} famílias do contrato presentes` : ''},`
      + ' todos os pools são array não-vazio de caminho de áudio.');
  }
}

/* ── MARCA3: a régua provou que enxergou alguma coisa ────────────────────── */
if (!alvos.length) {
  reprova('MARCA3', 'nenhum manifest de áudio versionado foi encontrado em `public/audio/*.json`.'
    + ' Zero alvo faz MARCA1 passar sem olhar nada.');
} else if (!folhasVistas) {
  reprova('MARCA3', `varri ${alvos.length} arquivo(s) e não achei UMA folha de caminho.`
    + ' O varredor está cego: MARCA1 passaria verde sem ter examinado nada.');
} else {
  notas.push(`MARCA3 ok: ${alvos.length} manifest(s) versionado(s), ${folhasVistas} folha(s) examinada(s)`
    + ` contra ${MARCAS.length} padrão(ões) de marca.`);
}

for (const nota of notas) console.log(`  ✓ ${nota}`);

if (mutante) {
  if (falhas.length) {
    console.log(`\nMUTANTE ${mutante} DETECTADO — ${falhas.length} cláusula(s) vermelha(s):`);
    falhas.forEach((f) => console.log(`  ✗ ${f}`));
    process.exit(0);
  }
  console.error(`\nMUTANTE ${mutante} PASSOU BATIDO — a régua não vê o que deveria ver.`);
  process.exit(1);
}
if (falhas.length) {
  console.error(`\nAUDIO-MANIFEST-MARCAS VERMELHA (${falhas.length})`);
  falhas.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('\nAUDIO-MANIFEST-MARCAS verde — nenhum manifest de áudio versionado cita marca ou nome'
  + ' de arquivo de Valve/Epic, e o contrato que o carregador lê continua de pé.');
