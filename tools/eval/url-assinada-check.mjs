#!/usr/bin/env node
/* ============================================================================
   url-assinada-check.mjs — LINK PRÉ-ASSINADO DE CDN NÃO ENTRA VERSIONADO. (alerta #17)
   ----------------------------------------------------------------------------
   O GitHub abriu o secret-scanning #17 porque task records do Tripo (lote de 09/08)
   foram commitados com o link de CloudFront inteiro na query string (Key-Pair-Id +
   Policy + Signature). Tripo e Meshy devolvem links assim em TODA resposta de
   geração. O link baixa UM objeto e expira em ~1 dia, então o dano direto é pequeno;
   o dano real é o alerta virar ruído até o dia em que um segredo de verdade passar
   batido, e metadata de pipeline ir pro deploy dentro de public/. Os registros foram
   limpos em 4b2c933 (branch sec/tripo-signed-urls); esta régua impede a volta.

   Procedência é o PATH (task id, data, arquivo). A assinatura não é documento, é
   credencial descartável: strip da query antes de commitar o registro.

   ── COMO ELA MEDE ──────────────────────────────────────────────────────────
   Varre TODO arquivo versionado (`git ls-files`), não só public/docs/tools/scripts:
   o registro pode nascer em qualquer pasta. Pula binário (byte NUL nos primeiros
   8 KB, a mesma heurística do git) e arquivo acima de 2 MB. Reprova qualquer linha
   com parâmetro de assinatura de URL de CDN seguido de `=`: Key-Pair-Id (CloudFront),
   X-Amz-Signature (S3 SigV4 pré-assinado) e X-Goog-Signature (GCS V4).
   Cabeçalho `Authorization: AWS4-HMAC-SHA256 … Signature=` não é URL e não casa.

   A mensagem cita só `arquivo:linha` e o nome do parâmetro, NUNCA o trecho: se a
   URL ainda valer, o log do CI não pode virar o segundo vazamento.

   ── O MUTANTE ──────────────────────────────────────────────────────────────
   `--mutante=url-assinada` injeta em memória um task record com link pré-assinado
   e exige vermelho (sai 0 só se a régua morder). `npm run eval:urlassinada` roda
   os dois: árvore real verde e mutante mordido.

   Uso: node tools/eval/url-assinada-check.mjs [--mutante=url-assinada]
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { openSync, readSync, closeSync, statSync, readFileSync } from 'node:fs';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
if (mutante && mutante !== 'url-assinada') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const MARCAS = /\b(Key-Pair-Id|X-Amz-Signature|X-Goog-Signature)=/;
const TETO_BYTES = 2 * 1024 * 1024;

function binario(caminho) {
  const fd = openSync(caminho, 'r');
  try {
    const amostra = Buffer.alloc(8000);
    const lidos = readSync(fd, amostra, 0, amostra.length, 0);
    return amostra.subarray(0, lidos).includes(0);
  } finally { closeSync(fd); }
}

const versionados = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0').filter(Boolean);
const alvos = [];
for (const rel of versionados) {
  let st;
  try { st = statSync(rel); } catch { continue; } // apagado no worktree, submódulo
  if (!st.isFile() || st.size > TETO_BYTES || binario(rel)) continue;
  alvos.push({ rel, texto: readFileSync(rel, 'latin1') });
}
if (!alvos.length) {
  console.error('url-assinada: nenhum arquivo de texto versionado lido — `git ls-files` fora de um checkout?');
  process.exit(2);
}
if (mutante === 'url-assinada') {
  // Concatenada de propósito: a literal inteira no fonte faria a régua se flagrar.
  const falsa = ['Key-Pair-', 'Id=K1&', 'Policy=eyJ9&', 'Signature=abc'].join('');
  alvos.unshift({ rel: 'mutante://task-record.json', texto: `{"model":"https://cdn.exemplo/x.glb?${falsa}"}` });
}

const achados = [];
for (const { rel, texto } of alvos) {
  const linhas = texto.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    const m = MARCAS.exec(linhas[i]);
    if (m) achados.push(`${rel}:${i + 1} (${m[1]})`);
  }
}

if (mutante) {
  if (!achados.some((a) => a.startsWith('mutante://'))) {
    console.error('✗ mutante url-assinada passou verde: a régua não morde');
    process.exit(1);
  }
  console.log('✓ mutante url-assinada reprovado');
} else if (achados.length) {
  for (const a of achados) console.error(`✗ url-assinada: ${a} carrega link pré-assinado de CDN — strip da query antes de commitar o registro.`);
  console.error(`url-assinada: ${achados.length} linha(s) em ${alvos.length} arquivos de texto versionados.`);
  process.exit(1);
} else {
  console.log(`✓ url-assinada: nenhum link pré-assinado de CDN em ${alvos.length} arquivos de texto versionados.`);
}
