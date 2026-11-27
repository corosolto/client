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
   o registro pode nascer em qualquer pasta, e de qualquer tamanho. Pula só binário
   (byte NUL nos primeiros 8 KB, a mesma heurística do git). Reprova qualquer linha
   com parâmetro de assinatura de URL de CDN seguido de `=`: Key-Pair-Id (CloudFront),
   X-Amz-Signature (S3 SigV4 pré-assinado) e X-Goog-Signature (GCS V4).
   Cabeçalho `Authorization: AWS4-HMAC-SHA256 … Signature=` não é URL e não casa.

   A mensagem cita só `arquivo:linha` e o nome do parâmetro, NUNCA o trecho: se a
   URL ainda valer, o log do CI não pode virar o segundo vazamento.

   ── OS MUTANTES ────────────────────────────────────────────────────────────
   Cada um exige vermelho (sai 0 só se a régua morder):
   · `url-assinada` injeta em memória um task record com link pré-assinado;
   · `url-assinada-grande` grava em tmp um registro de 3 MB com o link no fim e o
     lê pela MESMA função da varredura: um teto de tamanho voltaria a ser ponto cego.
   `npm run eval:urlassinada` roda a árvore real (verde) e os dois mutantes.

   Uso: node tools/eval/url-assinada-check.mjs [--mutante=url-assinada|url-assinada-grande]
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { openSync, readSync, closeSync, statSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MUTANTES = ['url-assinada', 'url-assinada-grande'];
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
if (mutante && !MUTANTES.includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const MARCAS = /\b(Key-Pair-Id|X-Amz-Signature|X-Goog-Signature)=/;

/* Texto do arquivo, ou null se não for arquivo comum ou for binário. Sem teto de
   tamanho: binário grande custa só a amostra de 8 KB. */
function lerTexto(caminho) {
  let st;
  try { st = statSync(caminho); } catch { return null; } // apagado no worktree, submódulo
  if (!st.isFile()) return null;
  const fd = openSync(caminho, 'r');
  try {
    const amostra = Buffer.alloc(8000);
    const lidos = readSync(fd, amostra, 0, amostra.length, 0);
    if (amostra.subarray(0, lidos).includes(0)) return null;
  } finally { closeSync(fd); }
  return readFileSync(caminho, 'latin1');
}

const versionados = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0').filter(Boolean);
const alvos = [];
for (const rel of versionados) {
  const texto = lerTexto(rel);
  if (texto !== null) alvos.push({ rel, texto });
}
if (!alvos.length) {
  console.error('url-assinada: nenhum arquivo de texto versionado lido — `git ls-files` fora de um checkout?');
  process.exit(2);
}
// Concatenada de propósito: a literal inteira no fonte faria a régua se flagrar.
const falsa = `https://cdn.exemplo/x.glb?${['Key-Pair-', 'Id=K1&', 'Policy=eyJ9&', 'Signature=abc'].join('')}`;
if (mutante === 'url-assinada') {
  alvos.unshift({ rel: 'mutante://task-record.json', texto: `{"model":"${falsa}"}` });
} else if (mutante === 'url-assinada-grande') {
  const dir = mkdtempSync(path.join(tmpdir(), 'url-assinada-'));
  try {
    const arquivo = path.join(dir, 'task-record.json');
    writeFileSync(arquivo, `${'{"log":"lote"}\n'.repeat(200_000)}{"model":"${falsa}"}\n`); // ~3 MB
    const texto = lerTexto(arquivo);
    if (texto !== null) alvos.unshift({ rel: 'mutante://task-record-3mb.json', texto });
  } finally { rmSync(dir, { recursive: true, force: true }); }
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
    console.error(`✗ mutante ${mutante} passou verde: a régua não morde`);
    process.exit(1);
  }
  console.log(`✓ mutante ${mutante} reprovado`);
} else if (achados.length) {
  for (const a of achados) console.error(`✗ url-assinada: ${a} carrega link pré-assinado de CDN — strip da query antes de commitar o registro.`);
  console.error(`url-assinada: ${achados.length} linha(s) em ${alvos.length} arquivos de texto versionados.`);
  process.exit(1);
} else {
  console.log(`✓ url-assinada: nenhum link pré-assinado de CDN em ${alvos.length} arquivos de texto versionados.`);
}
