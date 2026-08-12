/* ssr-render-check.mjs — PÁGINA SSR ENTREGA CORPO, MEDIDO NO BUILD.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO QUE COMPROU ESTA RÉGUA (11-12/08, achado EM PRODUÇÃO pelo dono)

   *"a pagina mapa online (aovivo) esta quebrada"*. Era, e não só ela: as TRÊS páginas
   `prerender = false` — `/mapa`, `/ranking` e `/u/<perfil>` — respondiam **HTTP 200 com
   0 bytes** em produção e no preview. Estáticas e endpoints iam bem.

   A cadeia, medida chamando o handler construído direto no node:

     1. `#194` (3e5b0ea, 11/08 23:23) pôs `moduleCacheManifest()` no escopo do módulo de
        `src/layouts/Layout.astro` — roda em TODA renderização de página.
     2. `scripts/module-cache.mjs` faz `readdirSync('public/js')` relativo ao cwd.
     3. Página estática: isso roda no BUILD, onde `public/js` existe. Passa.
     4. Página SSR: roda dentro da função da Vercel, cujo pacote NÃO inclui `public/js`.
        `ENOENT: scandir '<func>/public/js'`.
     5. Astro faz STREAMING: o 200 e os headers já saíram quando o erro estoura. O
        resultado não é 500 — é 200 com corpo vazio.

   ── POR QUE NENHUM PORTÃO PEGOU, E É O PONTO DESTA RÉGUA ────────────────────────
   O `eval:site` cobre `/ranking` e checa corpo. Ele passou o tempo todo, porque sobe um
   `astro dev` LOCAL — e no dev o cwd é a raiz do repo, onde `public/js` existe. Ele mede
   um mundo onde o defeito não pode acontecer. É a LIÇÃO 3 do `docs/LICOES.md` na forma
   mais cara: a régua e o jogo têm que rodar no MESMO mundo.
   (`/mapa` tinha ainda a cegueira trivial de não estar na lista das 13 rotas dele.)

   Por isso esta régua não sobe servidor de desenvolvimento. Ela pega o artefato de
   `.vercel/output/functions/_render.func/`, entra no diretório DELE — que é o cwd que a
   função tem em produção — e chama o handler. Se `public/js` faltar ali, ela vê o mesmo
   ENOENT que o jogador vê.

   O QUE ELA MEDE
     SSR1 · toda página `prerender = false` devolve corpo NÃO VAZIO. Um piso de bytes,
            não só status: 200 com 0 bytes foi exatamente o defeito, e status sozinho
            chamava isso de saudável.
     SSR2 · nenhuma delas lança ao montar o corpo. `resp.text()` que estoura é a
            assinatura do erro pós-streaming, e sem cobrar isso a cláusula acima poderia
            passar por um corpo que nunca chega a ser lido.

   AS MUTAÇÕES, E POR QUE SÃO TRÊS
     --mutante=corpo-vazio    o handler passa a devolver 200 com corpo vazio  -> SSR1 vermelha
     --mutante=lanca          a leitura do corpo passa a lançar               -> SSR2 vermelha
     --mutante=sem-publicjs   esconde `public/js` do cwd da função, reproduzindo o pacote
                              que a Vercel monta.

   `sem-publicjs` é o defeito HISTÓRICO, e hoje ela fica VERDE — de propósito. Antes do
   conserto ela reproduzia o ENOENT; depois de o manifesto passar a ser calculado no
   build, esconder `public/js` não muda nada, porque nenhuma página lê aquele diretório
   em tempo de requisição. Ela deixou de ser mutação e virou ASSERÇÃO: enquanto passar
   verde, a dependência de disco continua morta. Se um dia ela ficar vermelha, alguém
   reintroduziu a leitura em tempo de renderização.

   Quem prova que a régua morde são as duas primeiras, que atacam as cláusulas
   diretamente — 200 com corpo vazio foi o sintoma exato que o dono viu.

   USO
     npm run build && node tools/eval/ssr-render-check.mjs
     node tools/eval/ssr-render-check.mjs --mutante=sem-publicjs

   EXIGE BUILD (`.vercel/output`), não exige browser nem rede. É passo de pré-deploy,
   junto do `eval:boot`.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { existsSync, readdirSync, readFileSync, mkdtempSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTANTE = val('mutante', '');

const RAIZ = process.cwd();
const FUNC = resolve('.vercel/output/functions/_render.func');
const ENTRY = join(FUNC, 'dist/server/entry.mjs');

/* As rotas SSR saem do FONTE, não de lista escrita à mão: página nova com
   `prerender = false` entra nesta régua sozinha, no commit que a cria. Lista fechada
   envelhece — foi assim que `/mapa` ficou de fora do eval:site. */
function rotasSSR(dir = 'src/pages', prefixo = '') {
  const out = [];
  for (const nome of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, nome.name);
    if (nome.isDirectory()) { out.push(...rotasSSR(p, `${prefixo}/${nome.name}`)); continue; }
    if (!nome.name.endsWith('.astro')) continue;
    if (!/export const prerender = false/.test(readFileSync(p, 'utf8'))) continue;
    let rota = `${prefixo}/${nome.name.replace(/\.astro$/, '')}`;
    rota = rota.replace(/\/index$/, '/');
    // rota dinâmica vira um caminho de exemplo — o que importa é que ela RENDERIZE
    rota = rota.replace(/\[\.\.\.[^\]]+\]/g, 'exemplo').replace(/\[[^\]]+\]/g, 'exemplo');
    out.push(rota);
  }
  return out;
}

if (!existsSync(ENTRY)) {
  console.error(`✗ SSR0  sem build: ${ENTRY} não existe.`);
  console.error('        rode `npm run build` antes — esta régua mede o ARTEFATO, não o dev server.');
  process.exit(1);
}

const rotas = rotasSSR();
console.log(`RÉGUA DE RENDERIZAÇÃO SSR${MUTANTE ? `  [MUTAÇÃO: ${MUTANTE}]` : ''}`);
console.log(`${rotas.length} rota(s) com prerender=false: ${rotas.join(', ')}\n`);

/* O CWD É O EXPERIMENTO. Em produção a função roda com o cwd dentro do próprio pacote,
   onde `public/js` não existe. Rodar a medição da raiz do repo esconderia o defeito —
   que foi, palavra por palavra, o que o eval:site fez por um dia inteiro. */
let cwdMedicao = FUNC;
if (MUTANTE === 'sem-publicjs') {
  // um cwd temporário com o mesmo conteúdo da função, MENOS qualquer public/ — é o
  // pacote que a Vercel monta hoje. Se a régua não ficar vermelha aqui, ela é teatro.
  const t = mkdtempSync(join(tmpdir(), 'ssr-mut-'));
  symlinkSync(join(FUNC, 'dist'), join(t, 'dist'));
  symlinkSync(join(FUNC, 'node_modules'), join(t, 'node_modules'));
  cwdMedicao = t;
}
process.chdir(cwdMedicao);

const mod = await import(pathToFileURL(ENTRY).href);
const handler = mod.default;

const PISO = 500;   // bytes. Página real deste site tem dezenas de KB; 500 separa
                    // "renderizou" de "veio casca vazia" sem depender do conteúdo.
let ssr1 = true, ssr2 = true;
const linhas = [];
for (const rota of rotas) {
  let status = null, bytes = 0, erro = null;
  try {
    let resp = await handler.fetch(new Request(`https://www.csbrasil.online${rota}`));
    /* As duas mutações que provam as cláusulas. Elas trocam a RESPOSTA, não o cwd:
       reproduzem o que o jogador recebeu (200 com casca vazia) e o que a pilha fez
       (erro depois do streaming), que são as duas formas do mesmo dia 11/08. */
    if (MUTANTE === 'corpo-vazio') resp = new Response('', { status: 200, headers: resp.headers });
    if (MUTANTE === 'lanca') {
      resp = new Response(new ReadableStream({ start(c) { c.error(new Error('ENOENT simulado: scandir public/js')); } }), { status: 200 });
    }
    status = resp.status;
    try { bytes = (await resp.text()).length; }
    catch (e) { erro = e.message.split('\n')[0]; }
  } catch (e) { erro = e.message.split('\n')[0]; }
  if (erro) ssr2 = false;
  if (!(status === 200 && bytes >= PISO)) ssr1 = false;
  linhas.push({ rota, status, bytes, erro });
}
process.chdir(RAIZ);

console.log(`SSR1 · toda página prerender=false devolve corpo (>= ${PISO} bytes), não só status 200`);
for (const l of linhas) console.log(`   ${l.rota.padEnd(12)} status=${l.status ?? '—'}  ${String(l.bytes).padStart(7)} bytes${l.bytes < PISO ? '  ✗ CORPO VAZIO' : ''}`);
console.log(`   ${ssr1 ? 'PASSA' : 'FALHA'}\n`);

console.log('SSR2 · nenhuma delas lança ao montar o corpo (erro depois do streaming)');
const comErro = linhas.filter((l) => l.erro);
if (!comErro.length) console.log('   nenhuma');
else for (const l of comErro) console.log(`   ${l.rota.padEnd(12)} ${l.erro}`);
console.log(`   ${ssr2 ? 'PASSA' : 'FALHA'}\n`);

const passou = ssr1 && ssr2;
console.log(passou
  ? '✓ SSR  as páginas SSR entregam corpo no artefato que vai pro ar'
  : '✗ SSR  PÁGINA SSR VAZIA — o jogador recebe 200 com corpo vazio, e status sozinho chama isso de saudável');
process.exit(passou ? 0 : 1);
