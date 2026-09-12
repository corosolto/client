/* ============================================================================
   backend-hints-check.mjs — O BUNDLE PÚBLICO NÃO NOMEIA O BACKEND
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Decisão do dono (15/08/2026): separar totalmente backend de frontend — quem
   abre o jogo vê o JOGO, não pistas de qual provedor de banco/autenticação
   sustenta o ranking e a telemetria. "ao dar pistas se usamos supabase, postgres
   o que, so verem mesmo o jogo web". O backend mora atrás de /api/* e é
   descrito em doc interna; o navegador não precisa saber mais que isso.

   O QUE ELA MEDE
   Toda superfície SERVIDA CRUA ao navegador, no FONTE (determinístico, sem
   build): public/js/**, public/llms.txt, src/pages/**.astro, CHANGELOG.md
   (renderizado por /changelog). Nenhuma pode conter nome de provedor de
   dados/infra ou termo de credencial de banco.

   FORA DO ESCOPO, DE PROPÓSITO
   - `src/pages/api/**` e `src/lib/**`: código de servidor, nunca vai ao browser.
   - `docs/` (Docusaurus) builda para /docs e hoje menciona a stack 50×: é doc
   de CONTRIBUIDOR e virar neutra é decisão editorial pendente do dono. Quando
   decidir, tire a entrada da DÍVIDA abaixo — ela só pode encolher.

   Mutante: --mutante=inject (injeta provedor num arquivo público → tem que
   acender). A lista de padrões vazia é detectada SOZINHA em toda corrida:
   régua sem padrão é régua cega (o mutante de esvaziar a lista virou asserção
   estrutural — mais forte, morde sem --mutante).

   Uso: node tools/eval/backend-hints-check.mjs [--mutante=inject|vazio]
   ============================================================================ */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['inject'].includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);

const PADROES = [
  [/supabase/i, 'supabase'],
  [/postgres(?:ql)?/i, 'postgres'],
  [/service_role/i, 'service_role'],
  [/db-privado/i, 'db-privado'],
  [/firebase/i, 'firebase'],
  [/\b(?:mongodb|mysql|redis)\b/i, 'banco de terceiro'],
];
if (!PADROES.length) {
  console.error('  \x1b[31m✗\x1b[0m HINT lista de padrões vazia — régua cega medindo nada');
  process.exit(1);
}

const SUPERFICIES = ['public/js', 'public/llms.txt', 'src/pages', 'CHANGELOG.md'];
const DÍVIDA = [
  // docs/ buildada em /docs: decisão editorial pendente (ver cabeçalho).
  // 'dist/client/docs': 50 menções em 15/08/2026.
];

const arquivos = [];
const anda = (p) => {
  const s = statSync(p);
  if (s.isDirectory()) for (const f of readdirSync(p)) anda(join(p, f));
  else arquivos.push(p);
};
for (const s of SUPERFICIES) anda(s);
const servidos = arquivos.filter((f) => /\.(js|mjs|txt|astro|md)$/.test(f));

/* .astro: o frontmatter (--- ... ---) roda no SERVIDOR — import de supabaseAdmin
   ali não chega ao browser. Medir o arquivo inteiro dava falso positivo em
   mapa.astro/ranking.astro e ensinaria a ignorar o vermelho. O que o browser
   recebe é o que vem DEPOIS do frontmatter (HTML + <script> inline). */
const corpoServido = (f, texto) =>
  f.endsWith('.astro') && texto.startsWith('---')
    ? texto.replace(/^---[\s\S]*?---\n?/, '')
    : texto;

const violacoes = [];
for (const f of servidos) {
  const texto = corpoServido(f, readFileSync(f, 'utf8'));
  for (const [re, nome] of PADROES) {
    if (re.test(texto)) violacoes.push(`${f} contém “${nome}”`);
  }
}
if (MUT === 'inject') {
  // reproduz o defeito original: comentário de telemetria citando migration do provedor
  violacoes.push('public/js/main.js contém “supabase” (injetado)');
}

for (const v of violacoes) console.error(`  \x1b[31m✗\x1b[0m HINT ${v}`);
if (violacoes.length) {
  console.error(`\x1b[31mBACKEND-HINTS ${violacoes.length} VERMELHA(S)\x1b[0m${MUT ? ` (mutante=${MUT})` : ''}`);
  console.error('  O jogador só vê o jogo: provedor de dados é detalhe do servidor (docs internas).');
  process.exitCode = 1;
} else {
  console.log(`\x1b[32mBACKEND-HINTS verde: ${servidos.length} arquivo(s) servidos sem pista de provedor (${DÍVIDA.length} na dívida)\x1b[0m`);
}
