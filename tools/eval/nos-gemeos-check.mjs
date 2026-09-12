/* ============================================================================
   nos-gemeos-check.mjs — A LISTA DE NÓS DE MULTIPLAYER É UMA SÓ
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O registro de servidores por região vive em `public/js/nos.js` (ES module que o JOGO
   importa) e precisa ser conhecido também pela página de convite `/sala/<codigo>`, que é
   SSR e não consegue importar de `public/`. Hoje ela repete a lista.

   Duas listas divergem em silêncio, e a divergência aparece no pior lugar possível: no link
   que uma pessoa mandou para outra. Um nó novo em `nos.js` e ausente na página faz
   `/sala/US-7K3M` responder "convite inválido" para uma sala que existe.

   O QUE ELA MEDE: os pares (id, nome, url) dos dois arquivos, na mesma ordem.

   Mutantes: `--mutante=no-a-mais` acrescenta um nó só de um lado; `--mutante=url-diferente`
   troca a url de um nó. Os dois devem acender.

   Uso: node tools/eval/nos-gemeos-check.mjs [--mutante=no-a-mais|url-diferente]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mut && !['no-a-mais', 'url-diferente'].includes(mut)) throw new Error(`mutante desconhecido: ${mut}`);

let jogo = readFileSync('public/js/nos.js', 'utf8');
let pagina = readFileSync('src/pages/sala/[codigo].astro', 'utf8');
if (mut === 'no-a-mais') jogo = jogo.replace('export const NOS = [', "export const NOS = [\n  { id: 'xx', nome: 'Fantasma', url: 'wss://xx.corosolto.com.br/ws' },");
if (mut === 'url-diferente') pagina = pagina.replace('wss://br.corosolto.com.br/ws', 'wss://outro.corosolto.com.br/ws');

/* Lê os nós de um texto qualquer sem executar nada: o arquivo da página é .astro e o do jogo
   é ES module de browser — nenhum dos dois é importável aqui. */
function lerNos(texto, rotulo) {
  const bloco = texto.match(/const NOS = \[([\s\S]*?)\n\];/);
  if (!bloco) { console.error(`✗ ${rotulo}: não achei o bloco \`const NOS = [ … ];\``); process.exit(1); }
  const nos = [];
  const re = /\{\s*id:\s*'([^']+)',\s*nome:\s*'([^']+)',\s*url:\s*'([^']+)'\s*\}/g;
  let m;
  while ((m = re.exec(bloco[1]))) nos.push({ id: m[1], nome: m[2], url: m[3] });
  return nos;
}

const a = lerNos(jogo, 'public/js/nos.js');
const b = lerNos(pagina, 'src/pages/sala/[codigo].astro');

const falhas = [];
if (a.length === 0) falhas.push('a lista do jogo está vazia');
if (a.length !== b.length) falhas.push(`quantidade diferente: jogo tem ${a.length}, página tem ${b.length}`);
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  const x = a[i], y = b[i];
  if (!x || !y) { falhas.push(`nó ${i + 1} só existe num dos dois (${x ? x.id : y.id})`); continue; }
  for (const campo of ['id', 'nome', 'url']) {
    if (x[campo] !== y[campo]) falhas.push(`nó ${i + 1} (${x.id}): ${campo} "${x[campo]}" no jogo x "${y[campo]}" na página`);
  }
}
/* A REGIÃO É O PREFIXO DO CONVITE, e o parser casa exatamente duas letras. Um nó com id fora
   disso geraria convites que ninguém consegue abrir — o servidor já recusa subir assim, e
   aqui a lista do cliente é cobrada pela mesma regra. */
for (const n of a) if (!/^[a-z]{2}$/.test(n.id)) falhas.push(`id de nó "${n.id}" não tem duas letras — não vira prefixo de convite`);

if (falhas.length) {
  console.error('✗ NOS1 a lista de nós de multiplayer divergiu entre o jogo e a página de convite:');
  for (const f of falhas) console.error(`    ${f}`);
  console.error('  Um nó só num dos lados faz o link de convite de outra pessoa responder "convite inválido".');
  process.exit(1);
}
console.log(`✓ NOS1 lista de nós idêntica nos dois lados (${a.map((n) => n.id).join(', ')})`);
