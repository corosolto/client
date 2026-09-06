/* mapa-id-check.mjs — ID DE MAPA É NOSSO, E ID ANTIGO NÃO PODE MORRER CALADO.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Os ids de mapa eram herança do Counter-Strike 1.6: `awp_map` e `fy_pool_day` são nomes
   LITERAIS de mapas de lá, e `fy_` ("fight yard") é convenção de lá. Os nomes exibidos
   sempre foram brasileiros — era só o id que carregava o CS. Trocamos em 11/08:

     awp_map -> praca_poderes · fy_pool_day -> piscina_treta · fy_havan -> loja_h
     fy_ferrovelho -> ferro_velho · fy_quebrada -> quebrada

   Só que renomear id neste repo tem precedente ruim, e ele é o motivo desta régua existir.
   O rename Time E (06/08) trocou `P` por `E` no `BRASAO` e esqueceu `COR_TIME` três linhas
   acima; a bandeira do jogador ficou sem cor E sem brasão, e NADA apareceu no console. O
   defeito foi achado pelo dono jogando, dias depois.

   Id de mapa tem a MESMA forma de falha, e pior alcance, porque ele sai do processo:

     · vai gravado no banco (`src/pages/api/match.ts` manda `p_map` em toda partida);
     · viaja em link (`?map=fy_quebrada` é o que se manda no grupo);
     · e `resolveMapId` devolve o DEFAULT_MAP para id desconhecido — então link velho não
       daria erro: abriria a Praça no lugar da Quebrada, calado.

   O QUE ELA MEDE
     M1 · nenhum id no estilo Counter-Strike sobrevive no código vivo.
     M2 · todo id antigo declarado em `ALIAS_MAPA` resolve para um mapa que EXISTE — e a
          lista de alias cobre todos os ids antigos conhecidos, não um subconjunto.
     M3 · todo mapa do registro tem a imagem de prévia em disco, com o nome do id novo.
          Esta cláusula nasceu do próprio rename: as prévias em `public/img/map-previews/`
          são nomeadas pelo id (`main.js` monta `/img/map-previews/${id}.jpg`), então
          renomear o id sem renomear o arquivo deixa o menu com cartaz quebrado — e
          imagem faltando é 404 no navegador, não erro no build.

   ONDE ELA NÃO OLHA, E POR QUÊ
     `CHANGELOG.md`, `KNOWN-BUGS.md` e `docs/historico/` são REGISTRO DO PASSADO. Reescrever
     id lá seria falsificar o que aconteceu: aquelas linhas descrevem partidas e defeitos
     que ocorreram quando o mapa se chamava `fy_quebrada`. O alias é justamente o que mantém
     esses textos verdadeiros E navegáveis. `public/js/maps.js` também sai da varredura do
     M1: é onde a tabela de alias mora, e ela precisa citar os nomes antigos para funcionar.

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (as três foram executadas)
     --mutar=id-cs        finge um `fy_` novo num módulo    -> M1 acusa
     --mutar=sem-alias    remove um id antigo do ALIAS_MAPA -> M2 acusa a cobertura
     --mutar=sem-preview  finge prévia ausente              -> M3 acusa o cartaz quebrado

   USO
     node tools/eval/mapa-id-check.mjs
     node tools/eval/mapa-id-check.mjs --mutar=id-cs

   Node puro, lê texto e disco, roda em milissegundos — cabe no `check:fast`.
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUTAR = val('mutar', '');

const RAIZ = process.cwd();
const PREVIEWS = 'public/img/map-previews';

/* Os ids antigos, escritos aqui de propósito: é a lista contra a qual o M2 cobra a
   cobertura do ALIAS_MAPA. Se um mapa novo for renomeado no futuro, ele entra aqui E no
   alias — e a régua reprova enquanto só um dos dois tiver sido feito. */
const IDS_ANTIGOS = ['awp_map', 'fy_pool_day', 'fy_havan', 'fy_ferrovelho', 'fy_quebrada'];

/* A FORMA de um id do Counter-Strike, e não uma lista de nomes. Lista de nome fechada
   envelhece — foi exatamente assim que o `[PBUCF]` dentro de um regex cegou o C3 do
   brasao-check no rename anterior. Aqui o que se procura é o padrão: prefixo de mapa do
   CS seguido de palavra, em contexto de id (entre aspas ou crase).

   `cs_` FICOU DE FORA, e não por descuido. A primeira versão o incluía e acusou nove
   ocorrências, todas legítimas: `cs_session`, `cs_lang`, `cs_acq` (main.js) e `cs_anon`
   (api/presence.ts) são chaves de localStorage do PRÓPRIO projeto — `cs` de CORO SOLTO /
   CS BRASIL, não de Counter-Strike. Régua que fica vermelha sem defeito é como se ensina
   a ignorar vermelho, e aí ela não serve nem quando estiver certa. Os quatro prefixos que
   sobraram não têm uso legítimo aqui. */
const FORMA_CS = /['"`]((?:fy|de|aim|awp)_[a-z0-9_]+)['"`]/g;

const SEM_VARREDURA = [
  'node_modules', '.git', 'dist', '.vercel', 'graphify-out', 'historico',
  /* Worktrees são checkouts paralelos de OUTRAS branches — não são código vivo
     da árvore atual. Sem isto, a régua escaneia `.worktrees/<branch-velha>/` e
     acusa ids antigos que só existem lá, virando vermelha sem defeito. */
  '.worktrees',
  'CHANGELOG.md', 'KNOWN-BUGS.md',
  /* Atribuição histórica: `docs/LICENCA.md` cita o mapa `fy_pool_day` como veio
     do contribuidor daltonfontes — é o nome da contribuição na origem, não código
     vivo. Mesmo motivo de CHANGELOG/KNOWN-BUGS. */
  join('docs', 'LICENCA.md'),
  /* `public/docs` é SAÍDA DE BUILD do Docusaurus (`docs/` -> `npm run build:site`), com
     nome de arquivo por hash. Policiar artefato em vez de fonte deixa a régua vermelha
     toda vez que o bundle publicado ficar uma geração atrás de um rename — que foi
     exatamente o que aconteceu ao mesclar a main: os `.md` de `docs/docs/` já estavam
     certos e os bundles ainda carregavam os ids antigos. A FONTE daqueles bundles é
     `docs/docs/*.md`, que continua sendo varrida; o artefato se conserta sozinho no
     próximo build. Mesmo motivo de `dist/` já estar nesta lista. */
  join('public', 'docs'),
  join('public', 'js', 'maps.js'),
  /* A PRÓPRIA RÉGUA. Ela precisa citar os ids antigos — em `IDS_ANTIGOS`, que é a lista
     contra a qual o M2 cobra cobertura, e no cabeçalho que explica o rename. Sem esta
     linha ela se acusa: nove ocorrências, todas dela mesma. Mesmo motivo do `maps.js`,
     que também precisa nomear os antigos para o alias existir. */
  join('tools', 'eval', 'mapa-id-check.mjs'),
];
const EXT = new Set(['.js', '.mjs', '.ts', '.astro', '.html', '.css', '.json', '.py', '.md']);

function* arquivos(dir) {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    const rel = p.slice(RAIZ.length + 1);
    if (SEM_VARREDURA.some((s) => rel === s || rel.split('/').includes(s) || nome === s)) continue;
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { yield* arquivos(p); continue; }
    if (EXT.has(extname(nome))) yield rel;
  }
}

const maps = readFileSync('public/js/maps.js', 'utf8');
const idsNovos = [...maps.matchAll(/^\s{2}([a-z_][a-z0-9_]*):\s*\{ name:/gm)].map((m) => m[1]);
const aliasBloco = /export const ALIAS_MAPA = \{([\s\S]*?)\n\};/.exec(maps);
let alias = {};
if (aliasBloco) for (const m of aliasBloco[1].matchAll(/([a-z_][a-z0-9_]*):\s*'([a-z_][a-z0-9_]*)'/g)) alias[m[1]] = m[2];
if (MUTAR === 'sem-alias') delete alias.fy_quebrada;

console.log(`RÉGUA DE ID DE MAPA${MUTAR ? `  [MUTAÇÃO: ${MUTAR}]` : ''}`);
console.log(`registro declara ${idsNovos.length} mapas: ${idsNovos.join(', ')}\n`);

/* ── M1 ─────────────────────────────────────────────────────────────────────────── */
const achados = [];
for (const rel of arquivos(RAIZ)) {
  let txt;
  try { txt = readFileSync(join(RAIZ, rel), 'utf8'); } catch { continue; }
  if (MUTAR === 'id-cs' && rel === 'public/js/game.js') txt += `\nconst mapaFake = 'fy_novo_mapa';\n`;
  for (const m of txt.matchAll(FORMA_CS)) {
    achados.push({ rel, id: m[1], linha: txt.slice(0, m.index).split('\n').length });
  }
}
const m1 = achados.length === 0;
console.log('M1 · nenhum id no estilo Counter-Strike (fy_/de_/aim_/awp_) no código vivo');
if (m1) console.log('   nenhum');
else for (const a of achados.slice(0, 12)) console.log(`   ${a.rel}:${a.linha}  '${a.id}'`);
console.log(`   ${m1 ? 'PASSA' : 'FALHA'}\n`);

/* ── M2 ─────────────────────────────────────────────────────────────────────────── */
let m2 = true;
console.log('M2 · todo id antigo resolve para um mapa que existe');
for (const antigo of IDS_ANTIGOS) {
  const novo = alias[antigo];
  const ok = !!novo && idsNovos.includes(novo);
  if (!ok) m2 = false;
  console.log(`   ${antigo.padEnd(15)} -> ${novo ? novo.padEnd(15) : '(SEM ALIAS)'.padEnd(15)} ${ok ? 'ok' : 'FALHA — link antigo e linha do banco cairiam no mapa padrão, calados'}`);
}
const orfaos = Object.entries(alias).filter(([, novo]) => !idsNovos.includes(novo));
if (orfaos.length) { m2 = false; for (const [a, n] of orfaos) console.log(`   alias ${a} -> ${n}: destino NÃO existe no registro`); }
console.log(`   ${m2 ? 'PASSA' : 'FALHA'}\n`);

/* ── M3 ─────────────────────────────────────────────────────────────────────────── */
let m3 = true;
console.log('M3 · todo mapa tem prévia em disco com o nome do id');
for (const id of idsNovos) {
  const p = join(PREVIEWS, `${id}.jpg`);
  const existe = MUTAR === 'sem-preview' && id === idsNovos[0] ? false : existsSync(p);
  if (!existe) m3 = false;
  console.log(`   ${id.padEnd(15)} ${existe ? 'ok' : `FALTA ${p} — cartaz quebrado no menu, 404 sem erro de build`}`);
}
console.log(`   ${m3 ? 'PASSA' : 'FALHA'}\n`);

const passou = m1 && m2 && m3;
console.log(passou
  ? '✓ MAPID  ids são nossos, e todo id antigo continua chegando no mapa certo'
  : '✗ MAPID  id de mapa furado — link antigo e estatística do banco caem no mapa errado SEM erro no console');
process.exit(passou ? 0 : 1);
