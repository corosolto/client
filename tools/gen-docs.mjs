#!/usr/bin/env node
// Gera (e VALIDA) os BLOCOS NUMÉRICOS da documentação — README.md, docs/ e os SKILL.md.
//
// POR QUE ESTE SCRIPT EXISTE
// O `.claude/skills/gauntlet-fps/SKILL.md` afirmava que o `game.js` tinha 3.234 linhas
// quando o arquivo já tinha 6.427. O `docs/` inteiro carregava dezenas de números do mesmo
// tipo — contagem de personagens, de armas, de mapas, de scripts do arnês, versão, tamanho
// de arquivo — todos escritos à mão, todos com prazo de validade de um commit.
//
// Corrigir 3.234 para 6.427 dura até o próximo commit. É a mesma lição que criou o
// `tools/gen-arch.mjs` (leia o cabeçalho dele), aplicada agora à documentação inteira:
//
//     número DERIVÁVEL do código   -> bloco GERADO, com `--check` no portão
//     número NÃO derivável         -> não é número, é decisão: escreva sem ele
//
// E a Lei 1 da casa fecha o argumento: o que não vira régua é otimizado para fora. Um
// gerador sem `--check` no `check:fast` desatualiza de novo em uma semana, porque nada
// obriga ninguém a rodá-lo.
//
// USO
//   node tools/gen-docs.mjs            reescreve os blocos gerados nos arquivos alvo
//   node tools/gen-docs.mjs --check    sai 1 se qualquer bloco estiver desatualizado (CI)
//   node tools/gen-docs.mjs --json     imprime TODOS os fatos medidos (para outras ferramentas)
//
// COMO MARCAR UM BLOCO NUM ARQUIVO
//   Markdown puro (README.md, .md lido no GitHub):
//     <!-- BEGIN:GERADO:numeros --> ... <!-- END:GERADO:numeros -->
//   MDX (tudo em docs/docs/, que o Docusaurus 3 compila como MDX — comentário HTML
//   ali é erro de parse, não comentário):
//     {/* BEGIN:GERADO:numeros */} ... {/* END:GERADO:numeros */}
//
// O script preserva a sintaxe do marcador que encontrar, e só reescreve o MIOLO. Texto
// fora dos marcadores é conhecimento humano e nunca é tocado.
//
// REGRA DE OURO DESTE ARQUIVO: todo fato aqui carrega o COMANDO que o reproduz, e o
// comando vai impresso na saída. Afirmação sem procedência é opinião — inclusive a minha.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => join(ROOT, p);
const ler = (p) => readFileSync(R(p), 'utf8');
const existe = (p) => existsSync(R(p));
/* contagem de linhas = `wc -l`, ou seja NEWLINES. O gen-arch.mjs usa split('\n').length,
   que dá +1 em arquivo terminado em newline — é por isso que ARCH.md diz 6.428 e o
   `wc -l` diz 6.427 para o MESMO arquivo. Os dois estão certos; o que não pode é a doc
   escolher um dos dois no olho e não dizer qual. Aqui é sempre `wc -l`. */
const linhas = (p) => {
  const t = ler(p);
  return t.length ? t.split('\n').length - (t.endsWith('\n') ? 1 : 0) : 0;
};
const num = (n) => n.toLocaleString('pt-BR');
const numEn = (n) => n.toLocaleString('en-US');
const sh = (cmd, args) => {
  try { return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8' }); } catch { return ''; }
};
const glob = (dir, teste) => (existe(dir) ? readdirSync(R(dir)).filter(teste).sort() : []);
/* Varredura recursiva. `src/pages/` tem subpasta (`api/`, `u/`), e contar só o primeiro
   nível devolvia 10 páginas para um site que tem mais — número errado com cara de medido. */
const globR = (dir, teste, acc = []) => {
  if (!existe(dir)) return acc;
  for (const e of readdirSync(R(dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) globR(p, teste, acc);
    else if (teste(e.name)) acc.push(p);
  }
  return acc.sort();
};
/* Comentário É a cultura deste repo — os arquivos têm parágrafos inteiros explicando de
   onde cada número veio, e vários CITAM a constante com outro valor ("Com CTF_CAPS_TO_WIN
   = 2, o mapa mais lento…"). Ler constante sem tirar comentário antes devolve o número da
   HISTÓRIA em vez do número do CÓDIGO — foi exatamente o que aconteceu na 1ª execução
   deste script, que leu 2 onde o código diz 3. */
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ═══════════════════════════════════════════════════════════ FATOS MEDIDOS
   Cada campo diz de onde veio. Se um `try` falhar, o campo vira null e o bloco que o usa
   diz "não medido" em vez de inventar — silêncio é melhor que número errado. */

function medir() {
  const f = {};

  /* ---- o jogo, em arquivos e linhas ---- */
  const js = glob('public/js', (x) => x.endsWith('.js'));
  f.jogo = {
    arquivos: js.length,
    linhas: js.reduce((a, x) => a + linhas(`public/js/${x}`), 0),
    porArquivo: Object.fromEntries(js.map((x) => [x, linhas(`public/js/${x}`)])),
    cmd: 'cat public/js/*.js | wc -l · ls public/js/*.js | wc -l',
  };

  /* ---- versão: version.js e package.json TÊM que concordar ---- */
  const pkg = JSON.parse(ler('package.json'));
  const vjs = ler('public/js/version.js').match(/VERSION\s*=\s*'([^']+)'/);
  f.versao = {
    jogo: vjs ? vjs[1] : null,
    pacote: pkg.version,
    concordam: !!vjs && vjs[1] === pkg.version,
    cmd: "grep VERSION public/js/version.js · node -p \"require('./package.json').version\"",
  };

  /* ---- assets em GLB ---- */
  f.assets = {
    armas: glob('public/models/weapons', (x) => x.endsWith('.glb')).length,
    personagens: glob('public/models/characters', (x) => x.endsWith('.glb')).length,
    props: glob('public/models/props', (x) => x.endsWith('.glb')).length,
    anims: (sh('git', ['ls-files', 'public/models/anims']).trim().split('\n').filter(Boolean)).length,
    cmd: 'ls public/models/PASTA/*.glb | wc -l · git ls-files public/models/anims | wc -l',
  };

  /* ---- elenco: parseado do array CHARACTERS, não de um grep solto no arquivo inteiro
         (há `team:` fora do array, e grep no arquivo devolvia 47 para 44 personagens) ---- */
  const csrc = ler('public/js/characters.js');
  const ini = csrc.indexOf('export const CHARACTERS');
  const bloco = ini >= 0 ? csrc.slice(ini, csrc.indexOf('\n];', ini)) : '';
  /* id e team lidos JUNTOS, da mesma entrada: as linhas de comentário que separam as
     facções escrevem `team:'C'` no texto, e contá-las dava 47 personagens para 44. */
  const entradas = [...bloco.matchAll(/\{\s*id:\s*'([^']+)',\s*team:\s*'([A-Z])'/g)];
  const times = {};
  for (const [, , t] of entradas) times[t] = (times[t] || 0) + 1;
  f.elenco = {
    total: entradas.length,
    porFaccao: times,
    faccoes: Object.keys(times).length,
    cmd: "array CHARACTERS de public/js/characters.js (node tools/gen-docs.mjs --json)",
  };

  /* ---- mapas: o REGISTRO é a verdade. Arquivo map_*.js no disco não implica mapa
         jogável — o map_piscinao_ramos.js está no disco e fora do menu de propósito. ---- */
  const msrc = ler('public/js/maps.js');
  const mbloco = msrc.slice(msrc.indexOf('export const MAPS'), msrc.indexOf('\n};', msrc.indexOf('export const MAPS')));
  const importsDeMapa = new Map();
  for (const m of msrc.matchAll(/import\s+\{([^}]+)\}\s+from\s+'\.\/(map_[\w]+\.js)'/g))
    for (const nome of m[1].split(',').map((x) => x.trim()).filter(Boolean)) importsDeMapa.set(nome, m[2]);
  const mapas = [];
  for (const l of mbloco.split('\n')) {
    const m = /^\s{2}([a-z0-9_]+):\s*\{.*?name:\s*'([^']+)'/.exec(l);
    const build = /build:\s*([A-Za-z0-9_]+)/.exec(l)?.[1];
    if (m) mapas.push({ id: m[1], nome: m[2], ctf: /ctfMode:\s*true/.test(l), arquivo: build ? importsDeMapa.get(build) || null : null });
  }
  /* "Fora do registro" = existe no disco e NINGUÉM o importa em maps.js. É o caso do
     map_piscinao_ramos.js (o "Piscinão"), e a distinção importa: arquivo de mapa em
     public/js/ não implica mapa jogável — quem decide é o objeto MAPS. */
  const arquivosMapa = glob('public/js', (x) => /^map_.*\.js$/.test(x) && /export function build/.test(ler(`public/js/${x}`)));
  const importados = new Set([...msrc.matchAll(/from\s+'\.\/(map_[\w]+\.js)'/g)].map((m) => m[1]));
  f.mapas = {
    registrados: mapas,
    total: mapas.length,
    emCaptura: mapas.filter((m) => m.ctf).length,
    emRodadas: mapas.filter((m) => !m.ctf).length,
    arquivosNoDisco: arquivosMapa.length,
    importados: [...importados],
    foraDoRegistro: arquivosMapa.filter((a) => !importados.has(a)),
    cmd: 'objeto MAPS de public/js/maps.js',
  };

  /* ---- regras de partida: lidas das constantes, não da memória de quem escreveu a doc ---- */
  const gsrc = ler('public/js/game.js');
  const gcode = semComentarios(gsrc);
  const cte = (re) => { const m = re.exec(gcode); return m ? m[1] : null; };
  const linhaDe = (re) => {
    const l = gsrc.split('\n').findIndex((x) => re.test(x));
    return l >= 0 ? l + 1 : null;
  };
  f.regras = {
    roundTime: cte(/\bROUND_TIME\s*=\s*([\d.]+)/),
    roundsToWin: cte(/\bROUNDS_TO_WIN\s*=\s*([\d.]+)/),
    respawn: cte(/\bRESPAWN_DELAY\s*=\s*([\d.]+)/),
    ctfCaps: cte(/\bCTF_CAPS_TO_WIN\s*=\s*([\d.]+)/),
    ctfRounds: cte(/\bCTF_ROUNDS_TO_WIN\s*=\s*([\d.]+)/),
    ctfMatchTime: cte(/\bCTF_MATCH_TIME\s*=\s*([\d.]+)/),
    /* REGEN e RANKING_ON são FLAGS, e o estado delas é decisão do dono. O que este script
       mede é qual é o padrão HOJE no código — se alguém religar, a doc muda sozinha. */
    regenLigado: /const\s+REGEN\s*=\s*QS\.get\('regen'\)\s*===\s*'1'/.test(gcode) ? false : null,
    regenLinha: linhaDe(/const\s+REGEN\s*=/),
    rankingOn: existe('src/lib/site.ts') ? /RANKING_ON\s*=\s*true/.test(ler('src/lib/site.ts')) : null,
    cmd: 'constantes de public/js/game.js · RANKING_ON de src/lib/site.ts',
  };

  /* ---- o portão ---- */
  const inv = 'tools/eval/invariants.mjs';
  const uniq = (re) => new Set([...ler(inv).matchAll(re)].map((m) => m[1])).size;
  f.portao = {
    linhas: linhas(inv),
    ids: uniq(/put\('([A-Z0-9_]+)'/g),
    comSkip: uniq(/skip\('([A-Z0-9_]+)'/g),
    scriptsEval: glob('tools/eval', (x) => x.endsWith('.mjs') || x.endsWith('.py')).length,
    scriptsTools: glob('tools', (x) => x.endsWith('.mjs')).length,
    arnesesHtml: glob('public', (x) => x.endsWith('.html')).length,
    cmd: "grep -o \"put('[A-Z0-9_]*'\" tools/eval/invariants.mjs | sort -u | wc -l",
  };

  /* ---- scripts do package.json (as chaves `//nome` são comentário, não script) ---- */
  const scripts = Object.entries(pkg.scripts).filter(([k]) => !k.startsWith('//'));
  f.scripts = {
    total: scripts.length,
    check: pkg.scripts.check || null,
    checkFast: pkg.scripts['check:fast'] || null,
    nomes: scripts.map(([k]) => k),
    cmd: "node -p \"Object.keys(require('./package.json').scripts)\"",
  };

  /* ---- stack: versão declarada, não versão lembrada ---- */
  const dep = (n) => pkg.dependencies?.[n] || pkg.devDependencies?.[n] || null;
  const three = existe('public/vendor/three.module.js')
    ? (ler('public/vendor/three.module.js').match(/REVISION\s*=\s*'([^']+)'/) || [])[1] : null;
  const docsPkg = existe('docs/package.json') ? JSON.parse(ler('docs/package.json')) : null;
  f.stack = {
    three: three ? `r${three}` : null,
    threeOnde: 'public/vendor/three.module.js (vendorizado — sem CDN, sem npm no runtime)',
    astro: dep('astro'),
    adapter: dep('@astrojs/vercel'),
    supabase: dep('@supabase/supabase-js'),
    playwright: dep('playwright'),
    gltfTransform: dep('@gltf-transform/core'),
    meshopt: dep('meshoptimizer'),
    sharp: dep('sharp'),
    resvg: dep('@resvg/resvg-js'),
    docusaurus: docsPkg?.dependencies?.['@docusaurus/core'] || null,
    node: (() => { const m = /node-version:\s*'?([\d.]+)/.exec(existe('.github/workflows/ci.yml') ? ler('.github/workflows/ci.yml') : ''); return m ? m[1] : null; })(),
    cmd: 'dependencies/devDependencies do package.json · REVISION de public/vendor/three.module.js',
  };

  /* ---- pipeline de asset: quem consome cada SDK, medido por grep ---- */
  const consomem = (padrao, dir) => {
    const out = sh('grep', ['-rl', padrao, dir]).trim().split('\n').filter(Boolean);
    return out.filter((x) => x.endsWith('.mjs')).length;
  };
  f.pipeline = {
    playwright: consomem('playwright', 'tools'),
    gltf: consomem('@gltf-transform', 'tools'),
    meshopt: consomem('meshoptimizer', 'tools'),
    mint: (() => {
      if (!existe('mint-assets.json')) return null;
      const j = JSON.parse(ler('mint-assets.json'));
      const a = Object.values(j.assets || {});
      const kinds = {};
      for (const x of a) kinds[x.source?.kind || '?'] = (kinds[x.source?.kind || '?'] || 0) + 1;
      return { total: a.length, kinds };
    })(),
    cmd: 'grep -rl SDK tools/ | grep .mjs · mint-assets.json',
  };

  /* ---- skills: o que vem no CLONE (git), não o que está no disco de alguém ---- */
  const skl = sh('git', ['ls-files', '.agents/skills']).trim().split('\n').filter(Boolean);
  const dirsSkill = new Set(skl.map((p) => p.split('/')[2]).filter(Boolean));
  /* SÓ dado de git — e isto é correção, não gosto: as duas contagens "no disco" desta
     máquina (30 pastas × 9 versionadas) deixavam o docs:check VERMELHO em qualquer clone,
     inclusive o da Vercel — medido no deploy do PR #91 (08/08): check:deploy reprovou no
     docs:check por stack.md, e o build não publicou. Número que só existe na máquina de
     uma pessoa não é régua, é retrato — e vermelho que não corresponde a defeito ensina
     a ignorar vermelho. O fato que importa sobrevive com git puro: o lock declara N e o
     clone carrega M < N (o resto é baixado sob demanda). */
  f.skills = {
    versionadas: dirsSkill.size,
    comSkillMd: skl.filter((p) => p.endsWith('/SKILL.md') && p.split('/').length === 4).length,
    lock: existe('skills-lock.json') ? Object.keys(JSON.parse(ler('skills-lock.json')).skills || {}).length : null,
    gauntlet: existe('.claude/skills/gauntlet-fps/SKILL.md'),
    cmd: 'git ls-files .agents/skills · skills-lock.json',
  };

  /* ---- gente: quem assina commit, descontando agentes ---- */
  /* Clone RASO (Vercel, CI com fetch-depth:1) não TEM o histórico: o shortlog ali mede
     só o commit da ponta. Medido no deploy do PR #91 (08/08): docs:check vermelho no
     colaborar.md dentro do build da Vercel, verde na máquina. Número que não existe no
     ambiente não pode derrubar o portão — com clone raso o bloco `pessoas` NÃO é
     regenerado (fica o que está commitado) e o --check passa trivialmente; onde há
     histórico completo, ele continua mordendo. */
  f.raso = sh('git', ['rev-parse', '--is-shallow-repository']).trim() === 'true';
  const short = sh('git', ['shortlog', '-sn', '--no-merges', 'HEAD']).trim().split('\n').filter(Boolean);
  const autores = short.map((l) => { const m = /^\s*(\d+)\s+(.*)$/.exec(l); return m ? { n: +m[1], nome: m[2] } : null; }).filter(Boolean);
  const ehAgente = (n) => /^claude\b/i.test(n) || /^(codex|kimi|gpt|cursor|devin)\b/i.test(n) || /bot\b/i.test(n) || /^github-actions/i.test(n);
  const humanos = autores.filter((a) => !ehAgente(a.nome));
  f.pessoas = {
    humanos: humanos.length,
    nomes: humanos.map((a) => a.nome),
    commitsDeAgente: autores.filter((a) => ehAgente(a.nome)).reduce((s, a) => s + a.n, 0),
    total: autores.reduce((s, a) => s + a.n, 0),
    cmd: 'git shortlog -sn --no-merges (descontando autores que são agentes)',
  };

  /* ---- backend e licença ---- */
  f.supabase = {
    migrations: glob('supabase/migrations', (x) => x.endsWith('.sql')).length,
    opcionais: glob('supabase/opcional', (x) => x.endsWith('.sql')).length,
    cmd: 'ls supabase/migrations/*.sql | wc -l',
  };
  /* ---- o site, para a tabela de ZONAS: a fronteira public/ × src/ é a primeira coisa
         que um agente precisa saber, e ela tem tamanho medível dos dois lados ---- */
  f.site = {
    paginas: globR('src/pages', (x) => x.endsWith('.astro')).length,
    apis: globR('src/pages/api', (x) => x.endsWith('.ts')).length,
    /* A pegadinha que custa a primeira hora de todo mundo, medida em vez de afirmada:
       servir `public/` estaticamente NÃO roda o jogo, porque não há index.html ali. Se
       um dia alguém criar o arquivo, este bloco muda e a frase inverte sozinha. */
    indexHtml: existe('public/index.html'),
    cmd: "find src/pages -name '*.astro' | wc -l · find src/pages/api -name '*.ts' | wc -l · ls public/index.html",
  };

  /* ---- licença: o arquivo LICENSE é a verdade, e as SUPERFÍCIES são os lugares que
         repetem o nome dela e por isso mudam JUNTO com ela.
         Duas listas escritas à mão já enumeraram esses lugares (README.md e
         `plans/08 §3`) e as duas esquecem o JSON-LD de `src/pages/index.astro` e o
         rodapé desta documentação. Lista à mão de onde a licença aparece tem o mesmo
         prazo de validade de qualquer outro número escrito à mão — por isso é medida. */
  /* POR QUE ISTO NÃO É MAIS `head -1 LICENSE` + regex de sigla — custou uma doc publicada
     mentindo. O texto oficial da AGPL começa com "GNU AFFERO GENERAL PUBLIC LICENSE" e NÃO
     contém a sigla `AGPL-3.0` em lugar nenhum do cabeçalho. Quando a migração rodou
     (07/08/2026), a regex antiga não casou, `atual` virou `null` — e o gerador SEGUIU EM
     FRENTE: a tabela publicou "0 ocorrências de `null` em 0 das 8 superfícies" e a prosa
     passou a chamar `MIT` de "aviso de mudança planejada". O site publicado dizia MIT num
     repositório AGPL.
     A lição é a Lei 1 da casa aplicada à própria régua: régua que não sabe medir tem que
     ficar VERMELHA, não devolver `null` com cara de fato. Por isso agora são três coisas:
     (1) o nome sai do TEXTO da licença, não da sigla; (2) `package.json` é a segunda fonte
     e divergir entre as duas é inconsistência declarada; (3) não identificar entra em
     `inconsistencias`, que reprova o `--check`. */
  /* `titulo` identifica o arquivo `LICENSE`; `mencao` acha a licença NAS SUPERFÍCIES — e são
     coisas diferentes, porque cada superfície nomeia a licença no dialeto dela: o `LICENSE`
     escreve o título por extenso e nunca a sigla, o JSON-LD escreve a URL da FSF
     (`agpl-3.0.html`), o README escreve `AGPL-3.0`, a prosa escreve `AGPL`. Procurar só a
     sigla dava "não nomeia a licença" justamente para o arquivo canônico: falso negativo com
     cara de fato, que é o mesmo defeito de novo, um degrau abaixo. */
  const LICENCAS_CONHECIDAS = [
    { titulo: /GNU AFFERO GENERAL PUBLIC LICENSE/i, sigla: 'AGPL-3.0', longo: 'GNU Affero General Public License, versão 3', mencao: /\bAGPL(-3\.0)?\b|GNU AFFERO GENERAL PUBLIC LICENSE|agpl-3\.0/i },
    /* O `(?<![a-z])` não é enfeite: sem ele, `gpl-3.0` casa DENTRO de `AGPL-3.0` (e a URL da
       FSF no JSON-LD é minúscula), e a GPL aparecia citada em toda superfície que só fala de
       AGPL. Sigla que é sufixo de outra sigla precisa de âncora à esquerda. */
    { titulo: /GNU GENERAL PUBLIC LICENSE/i, sigla: 'GPL-3.0', longo: 'GNU General Public License, versão 3', mencao: /(?<![a-z])GPL-3\.0\b|(?<!AFFERO )GNU GENERAL PUBLIC LICENSE/i },
    { titulo: /GNU LESSER GENERAL PUBLIC LICENSE/i, sigla: 'LGPL-3.0', longo: 'GNU Lesser General Public License, versão 3', mencao: /\bLGPL(-3\.0)?\b|GNU LESSER GENERAL PUBLIC LICENSE/i },
    { titulo: /Mozilla Public License/i, sigla: 'MPL-2.0', longo: 'Mozilla Public License 2.0', mencao: /\bMPL-2\.0\b|Mozilla Public License/i },
    { titulo: /Apache License/i, sigla: 'Apache-2.0', longo: 'Apache License 2.0', mencao: /\bApache-2\.0\b|Apache License/i },
    { titulo: /BSD 3-Clause/i, sigla: 'BSD-3-Clause', longo: 'BSD 3-Clause', mencao: /\bBSD-3-Clause\b/i },
    /* `MIT` fica SEM o `i` de propósito: em minúscula a sigla casa dentro de palavra alheia,
       e menção de licença falsa é ruído que ninguém confere duas vezes. */
    { titulo: /\bMIT License\b/i, sigla: 'MIT', longo: 'MIT License', mencao: /\bMIT\b/ },
  ];
  const SUPERFICIES = [
    ['licença canônica', 'LICENSE'],
    ['badge + seção de licenças', 'README.md'],
    ['termo que o contribuidor aceita', 'CONTRIBUTING.md'],
    ['rodapé do site', 'src/layouts/Layout.astro'],
    ['JSON-LD do jogo', 'src/pages/index.astro'],
    ['página `/sobre`', 'src/pages/sobre.astro'],
    ['`llms.txt` (resposta para LLM)', 'public/llms.txt'],
    ['rodapé desta documentação', 'docs/docusaurus.config.js'],
  ];
  /* O cabeçalho é o TÍTULO da licença, e ele pode ocupar mais de uma linha (o texto oficial
     da AGPL quebra em "GNU AFFERO GENERAL PUBLIC LICENSE" / "Version 3, 19 November 2007").
     Ler cinco linhas e achatar o espaço é o que faz o casamento não depender da largura da
     coluna do arquivo. */
  const textoLicenca = existe('LICENSE') ? ler('LICENSE') : '';
  const cabecalho = textoLicenca.split('\n').slice(0, 5).join(' ').replace(/\s+/g, ' ').trim() || null;
  const casada = cabecalho ? LICENCAS_CONHECIDAS.find((l) => l.titulo.test(cabecalho)) : null;
  const atual = casada ? casada.sigla : null;           // sigla SPDX — 'AGPL-3.0'
  const atualLongo = casada ? casada.longo : null;      // nome por extenso, para a prosa
  /* Segunda fonte: `package.json`. `AGPL-3.0-only` e `AGPL-3.0-or-later` são o MESMO
     `AGPL-3.0` para efeito de "qual licença este projeto usa". */
  const pkgLicenca = (() => {
    try { return JSON.parse(ler('package.json')).license || null; } catch { return null; }
  })();
  const pkgBase = pkgLicenca ? pkgLicenca.replace(/-(only|or-later)$/, '') : null;
  const ondeAparece = (arq, lic) => {
    if (!existe(arq) || !lic) return [];
    return ler(arq).split('\n').map((l, i) => (lic.mencao.test(l) ? i + 1 : 0)).filter(Boolean);
  };
  /* OUTROS nomes de licença citados nas superfícies. Não é "a licença futura" — a direção da
     mudança não é derivável do repositório, e chutá-la foi exatamente o defeito anterior.
     O que é derivável é o fato: tal arquivo cita tal nome que não é o do `LICENSE`. O motivo
     (histórico de migração, crédito a dependência de terceiro) é prosa humana, não medida. */
  const outras = LICENCAS_CONHECIDAS.filter((l) => l.sigla !== atual);
  f.licenca = {
    nome: atual,
    nomeLongo: atualLongo,
    atual,
    /* Siglas conhecidas expostas pro guarda das traduções lá embaixo. A lista mora
       aqui dentro e o guarda mora fora do `medir()`; duplicá-la seria criar duas
       verdades sobre quais licenças o projeto sabe reconhecer. */
    siglas: LICENCAS_CONHECIDAS.map((l) => l.sigla),
    cabecalho,
    pacote: pkgLicenca,
    /* Divergir entre `LICENSE` e `package.json` é doc mentindo em uma das duas pontas. */
    concordam: !!(atual && pkgBase) && pkgBase === atual,
    superficies: SUPERFICIES.map(([rotulo, arq]) => ({
      rotulo, arquivo: arq, existe: existe(arq), linhas: ondeAparece(arq, casada),
    })),
    /* O próprio `LICENSE` fica FORA desta varredura, e o motivo é textual: o corpo da AGPL
       cita a GPL no preâmbulo e no "How to Apply". Contar isso como "outra licença citada"
       seria denunciar a licença por ter preâmbulo. As outras sete superfícies são prosa do
       projeto — lá, citar outro nome é fato que interessa. */
    outrasMencoes: outras.flatMap((lic) => SUPERFICIES
      .filter(([, arq]) => arq !== 'LICENSE')
      .map(([, arq]) => ({ nome: lic.sigla, arquivo: arq, linhas: ondeAparece(arq, lic) }))
      .filter((x) => x.linhas.length)),
    /* A doc em inglês (`docs/i18n/en/`) é tradução À MÃO, e os blocos GERADOS dela são cópia
       humana do bloco em português: `npm run docs` não reescreve nenhum deles. Foi por aí que
       a rota `/license` seguiu publicando "the code is under the MIT License" enquanto o
       `LICENSE` já era AGPL. Gerar os dois idiomas pede um gerador bilíngue (issue #54).
       A página de licença saiu do site de docs em 12/08/2026; a tabela de superfícies
       mora no `CONTRIBUTING.md`. */
    /* Sem crase aqui dentro: o rodapé já embrulha este texto em crase, e crase aninhada
       vira markdown quebrado nas duas pontas (GitHub e Docusaurus). */
    cmdNome: 'título lido do texto do LICENSE, conferido contra o campo license do package.json',
    cmd: 'grep -n dos nomes de licença conhecidos, nas superfícies declaradas em tools/gen-docs.mjs',
  };
  f.issues = {
    escritas: glob('docs/issues', (x) => /^\d+-.*\.md$/.test(x)).length,
    cmd: 'ls docs/issues/[0-9]*.md | wc -l',
  };

  return f;
}

/* ═══════════════════════════════════════════════════════════ BLOCOS
   Cada bloco é uma função pura de `f` para markdown. NENHUM número literal aqui. */

/* O `cmd` sai SEMPRE dentro de crase. Sem isso, um comando com `<sdk>` ou `<pasta>` vira
   tag JSX aberta e derruba o build do Docusaurus — medido: `end-tag-mismatch` em stack.md. */
const rodape = (cmd) => `\n> Bloco gerado por \`node tools/gen-docs.mjs\`. Fonte: \`${cmd}\`\n`;

const BLOCOS = {
  versao_atual: (f) => [
    `**O jogo está em \`${f.versao.jogo}\`.** Prerelease do semver ordena sozinho`,
    '(`alpha` < `beta` < release), e o fluxo automático cuida do bump.',
    rodape(f.versao.cmd),
  ].join('\n'),
  status_atual: (f) => [
    `- **Versão:** \`${f.versao.jogo}\``,
    `- **Conteúdo jogável:** ${f.elenco.faccoes} facções, ${f.elenco.total} personagens, ${f.mapas.total} mapas e ${f.assets.armas} armas com GLB`,
    `- **Código do jogo:** ${num(f.jogo.linhas)} linhas em ${f.jogo.arquivos} módulos JavaScript`,
    `- **Automação:** ${f.scripts.total} comandos npm, ${f.portao.scriptsEval} scripts de avaliação e ${f.portao.scriptsTools} scripts de pipeline`,
    rodape('package.json · CHARACTERS · MAPS · public/models/weapons · public/js · tools/'),
  ].join('\n'),
  /* Os números do projeto, com o comando que reproduz cada um. */
  numeros: (f) => [
    '| O que | Quanto | Onde confere |',
    '|---|---:|---|',
    `| Código do jogo | ${num(f.jogo.linhas)} linhas em ${f.jogo.arquivos} arquivos | \`cat public/js/*.js \\| wc -l\` |`,
    `| \`game.js\` | **${num(f.jogo.porArquivo['game.js'])}** linhas | \`wc -l public/js/game.js\` |`,
    `| \`main.js\` | ${num(f.jogo.porArquivo['main.js'])} linhas | \`wc -l public/js/main.js\` |`,
    `| Armas com GLB | ${f.assets.armas} | \`ls public/models/weapons/*.glb \\| wc -l\` |`,
    `| GLBs de personagem | ${f.assets.personagens} | \`ls public/models/characters/*.glb \\| wc -l\` |`,
    `| Props em GLB | ${f.assets.props} | \`ls public/models/props/*.glb \\| wc -l\` |`,
    `| Clipes de animação versionados | ${num(f.assets.anims)} | \`git ls-files public/models/anims \\| wc -l\` |`,
    `| Personagens jogáveis | ${f.elenco.total}, em ${f.elenco.faccoes} facções | array \`CHARACTERS\` de \`characters.js\` |`,
    `| Mapas no registro | ${f.mapas.total} | objeto \`MAPS\` de \`maps.js\` |`,
    `| Arnêses visuais em HTML | ${f.portao.arnesesHtml} | \`ls public/*.html \\| wc -l\` |`,
    `| Scripts do arnês | ${f.portao.scriptsEval} | \`ls tools/eval/*.mjs tools/eval/*.py \\| wc -l\` |`,
    `| Scripts de pipeline | ${f.portao.scriptsTools} | \`ls tools/*.mjs \\| wc -l\` |`,
    `| Tarefas de entrada escritas | ${f.issues.escritas} | \`ls docs/issues/[0-9]*.md \\| wc -l\` |`,
    `| Versão | \`${f.versao.jogo}\` | \`public/js/version.js\`${f.versao.concordam ? ' e `package.json` (batem)' : ' — **DIVERGE do `package.json`: `' + f.versao.pacote + '`**'} |`,
    rodape('o comando da coluna direita de cada linha'),
  ].join('\n'),

  /* AS DUAS ZONAS (mais o arnês). É a primeira coisa que um agente precisa saber antes de
     escrever uma linha, e é a que mais gente escreve à mão errado — por isso os dois lados
     da fronteira vêm MEDIDOS. O porquê de cada regra é conhecimento humano e mora na doc;
     aqui só o tamanho e a regra em uma linha. */
  zonas: (f) => [
    '| Zona | O que é | Tamanho medido | Regra |',
    '|---|---|---|---|',
    `| \`public/\` | o **jogo** | ${f.jogo.arquivos} arquivos \`.js\`, ${num(f.jogo.linhas)} linhas · Three.js \`${f.stack.three}\` vendorizado | ES modules servidos crus, **zero build**, sem dependência de runtime |`,
    `| \`src/\` | o **site** | ${f.site.paginas} páginas \`.astro\`, ${f.site.apis} rotas \`/api\` · Astro \`${f.stack.astro}\` | framework é bem-vindo; \`service_role\` só no servidor |`,
    `| \`tools/\` | o **arnês** | ${f.portao.scriptsEval} scripts em \`tools/eval/\`, ${f.portao.scriptsTools} em \`tools/\` | node puro: sobe o jogo real sem browser |`,
    '',
    f.site.indexHtml
      ? '⚠️ **Existe `public/index.html`** — o que contradiz a doc, que afirma o contrário em várias páginas. Confira quem serve o quê antes de acreditar em qualquer das duas.'
      : '**Não existe `public/index.html`.** O HTML do jogo é `src/pages/index.astro`, servido na rota `/`. ' +
        'Servir `public/` estaticamente entrega os arnêses visuais, **não o jogo** — é a pegadinha que custa a primeira hora de todo mundo.',
    rodape(f.site.cmd),
  ].join('\n'),

  /* AS SUPERFÍCIES DA LICENÇA — todo arquivo que REPETE o nome da licença e por isso muda
     JUNTO com ela. Duas listas escritas à mão já tentaram enumerar isto (README.md e
     `plans/08 §3`) e as duas esquecem lugares reais. A lista de superfícies é decisão
     humana (vive no topo deste script); ONDE cada uma nomeia a licença é medido. */
  licenca_pontos: (f) => [
    `| Superfície | Arquivo | Onde diz \`${f.licenca.atual || '?'}\` |`,
    '|---|---|---|',
    /* Teto de 4 linhas por superfície: o corpo do `LICENSE` nomeia a própria licença onze
       vezes, e uma célula com onze números não informa mais que uma com quatro — informa
       menos, porque ninguém lê. O total honesto vai no `+N` e na contagem abaixo da tabela. */
    ...f.licenca.superficies.map((s) => `| ${s.rotulo} | \`${s.arquivo}\` | ${
      !s.existe ? '**arquivo não existe**'
        : s.linhas.length ? `linha${s.linhas.length > 1 ? 's' : ''} ${s.linhas.slice(0, 4).join(', ')}${s.linhas.length > 4 ? ` (+${s.linhas.length - 4})` : ''}`
          : '— (não nomeia a licença)'}  |`),
    '',
    `**${f.licenca.superficies.reduce((a, s) => a + s.linhas.length, 0)} ocorrências** de ` +
    `\`${f.licenca.atual}\` em **${f.licenca.superficies.filter((s) => s.linhas.length).length}** das ` +
    `${f.licenca.superficies.length} superfícies declaradas. Trocar a licença é mudar **todas elas no mesmo commit**: ` +
    'metade trocada é pior que nenhuma, porque cada arquivo passa a responder uma coisa diferente para quem pergunta.',
    '',
    f.licenca.outrasMencoes.length
      ? `**Outros nomes de licença citados nessas superfícies:** ${f.licenca.outrasMencoes.map((m) => `\`${m.nome}\` em \`${m.arquivo}\` (linha${m.linhas.length > 1 ? 's' : ''} ${m.linhas.join(', ')})`).join(', ')}. ` +
        'Citar não é declarar — essas linhas são histórico da migração ou crédito a dependência de terceiro. ' +
        `A regra continua a mesma: **só o \`LICENSE\` declara**, e hoje ele diz \`${f.licenca.atual}\`.`
      : 'Nenhuma superfície cita outro nome de licença.',
    rodape(f.licenca.cmd),
  ].join('\n'),

  /* Regras de partida, lidas das constantes. */
  regras: (f) => [
    '| Regra | Valor | Constante |',
    '|---|---|---|',
    `| Facções · personagens | ${f.elenco.faccoes} · ${f.elenco.total} (${Object.entries(f.elenco.porFaccao).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}) | \`CHARACTERS\` |`,
    `| Mapas no menu | ${f.mapas.total} — ${f.mapas.emRodadas} abrem em rodadas, **${f.mapas.emCaptura} em captura** | \`MAPS\` / \`ctfMode\` |`,
    `| Respawn | ${String(f.regras.respawn).replace('.', ',')} s | \`RESPAWN_DELAY\` |`,
    `| Round | ${f.regras.roundTime} s, ${f.regras.roundsToWin} vitórias | \`ROUND_TIME\` / \`ROUNDS_TO_WIN\` |`,
    /* O alvo da rodada de captura NÃO é mais derivável de uma constante: desde 05/08 ele é
       `this.ctfPts.length` — TODAS as bandeiras do mapa, que hoje são 3 ou 4 conforme o mapa
       (pedido literal do dono: "tem que ser todas sempre"). Escrever "alvo de 3" aqui era
       justamente o tipo de número certo-em-um-lugar-e-errado-no-jogo que este gerador existe
       para impedir. `CTF_CAPS_TO_WIN` sobrou como fallback do layout padrão e por isso saiu
       da frase. */
    `| Captura | alvo = **todas as bandeiras do mapa**, ${f.regras.ctfRounds} rodadas (rede de segurança ${f.regras.ctfMatchTime} s) | \`capsToWin = ctfPts.length\` / \`CTF_ROUNDS_TO_WIN\` |`,
    `| Regeneração de vida | **${f.regras.regenLigado === false ? 'DESLIGADA — `?regen=1` religa' : 'LIGADA por padrão'}** | \`REGEN\` |`,
    `| Ranking / páginas \`/u/\` | **${f.regras.rankingOn ? 'LIGADOS' : 'DESLIGADOS — é uma flag, volta numa linha'}** | \`RANKING_ON\` em \`src/lib/site.ts\` |`,
    rodape(f.regras.cmd),
  ].join('\n'),

  /* O registro de mapas. Quem não está aqui não é jogável. */
  mapas: (f) => [
    '| Id | Nome no menu | Abre em | Arquivo em `public/js/` | Linhas |',
    '|---|---|---|---|---:|',
    ...f.mapas.registrados.map((m) => {
      const arq = m.arquivo;
      return `| \`${m.id}\` | ${m.nome} | ${m.ctf ? '**captura**' : 'rodadas'} | \`${arq || '—'}\` | ${arq ? num(linhas('public/js/' + arq)) : '—'} |`;
    }),
    '',
    `**${f.mapas.total} mapas registrados** — ${f.mapas.emRodadas} abrem em rodadas e ${f.mapas.emCaptura} em captura. ` +
    `\`ctfMode\` **abre** o mapa em captura, não prende: o jogador troca no menu (é a \`MOD1\`). ` +
    `Há ${f.mapas.arquivosNoDisco} arquivos \`map_*.js\` em \`public/js/\` — arquivo no disco **não** implica mapa jogável.`,
    rodape(f.mapas.cmd),
  ].join('\n'),

  /* Tamanho dos arquivos que o gen-arch.mjs indexa. */
  arquivos: (f) => {
    const alvos = ['game.js', 'main.js', 'characters.js', 'glbchars.js', 'vmattach.js', 'weapons.js', 'springs.js'];
    return [
      '| Arquivo | Linhas |',
      '|---|---:|',
      ...alvos.filter((a) => f.jogo.porArquivo[a] != null)
        .sort((a, b) => f.jogo.porArquivo[b] - f.jogo.porArquivo[a])
        .map((a) => `| \`public/js/${a}\` | ${num(f.jogo.porArquivo[a])} |`),
      '',
      `Total de \`public/js/\`: **${num(f.jogo.linhas)} linhas em ${f.jogo.arquivos} arquivos**. ` +
      'O índice símbolo→linha, com a tabela de conflito, é outro bloco gerado: `tools/eval/ARCH.md` (`npm run arch`).',
      rodape('`wc -l public/js/*.js`'),
    ].join('\n');
  },

  /* A stack — o que este projeto usa, com a versão declarada. */
  /* 4 colunas com caminho longo estouravam a largura do conteúdo do Docusaurus a
     1200 px e a última coluna era CORTADA (capturado antes de commitar). 3 colunas
     curtas cabem; o detalhe de cada linha está na prosa logo abaixo do bloco. */
  stack: (f) => [
    '| Camada | Ferramenta | Versão |',
    '|---|---|---|',
    `| Motor 3D (WebGL) | **Three.js**, vendorizado | \`${f.stack.three}\` |`,
    `| Jogo | ES modules vanilla, **zero build** | ${f.jogo.arquivos} arquivos |`,
    `| Site | **Astro** com SSR | \`${f.stack.astro}\` |`,
    `| Hospedagem | adapter **Vercel** | \`${f.stack.adapter}\` |`,
    `| Banco | **Postgres gerenciado** (RLS; schema privado, fora do repo) | \`${f.stack.supabase}\` |`,
    `| Browser nas réguas | **Playwright** | \`${f.stack.playwright}\` |`,
    `| Pipeline de GLB | **gltf-transform** | \`${f.stack.gltfTransform}\` |`,
    `| Compressão de malha | **meshoptimizer** | \`${f.stack.meshopt}\` |`,
    `| Imagem (build e API) | **sharp** · **resvg** | \`${f.stack.sharp}\` · \`${f.stack.resvg}\` |`,
    `| Esta documentação | **Docusaurus** | \`${f.stack.docusaurus}\` |`,
    `| Runtime de CI | **Node** | \`${f.stack.node}\` |`,
    '',
    `Three.js sai de \`public/vendor/three.module.js\` (**sem CDN, sem npm no runtime**). ` +
    `Astro e Vercel de \`package.json\` + \`astro.config.mjs\` + \`vercel.json\`. ` +
        `Dos scripts de \`tools/\`, **${f.pipeline.playwright}** importam Playwright, ` +
    `**${f.pipeline.gltf}** importam gltf-transform e **${f.pipeline.meshopt}** importam meshoptimizer.`,
    rodape(f.stack.cmd),
  ].join('\n'),

  /* Geração de asset: qual serviço faz o quê, e por qual script. */
  assets: (f) => [
    '| Serviço | O que gera | Script | Chave |',
    '|---|---|---|---|',
    '| **mint.gg** (Mint MCP) | personagens rigados, packs, animação | ferramentas MCP; o registro do que foi gerado é `mint-assets.json` | conta do dono, via MCP |',
    '| **Tripo3D** | props 3D por texto (padrão) | `tools/gen-asset.mjs --provider tripo` | `TRIPO_API_KEY` |',
    '| **Meshy** | props 3D por texto (alternativa) e rig | `tools/gen-asset.mjs --provider meshy` | `MESHY_API_KEY` |',
    '| **OpenRouter** | arte 2D (cartaz de facção, wallpaper, splash) | `tools/gen-image.mjs` | `OPENROUTER_API_KEY` |',
    '',
    f.pipeline.mint
      ? `\`mint-assets.json\` registra **${f.pipeline.mint.total} assets** gerados via Mint (${Object.entries(f.pipeline.mint.kinds).map(([k, v]) => `${v} \`${k}\``).join(' · ')}), cada um com \`assetId\`, \`chatUrl\` e notas do que deu errado na tentativa anterior.`
      : '`mint-assets.json` não foi encontrado nesta árvore.',
    '',
    'As três chaves de API vivem em `.env` na raiz — **gitignored, modo 600, nunca em `argv`** ' +
    '(argv vaza no `ps` de qualquer processo da máquina). Sem elas o jogo roda igual: o pipeline ' +
    'de geração é offline, o resultado é que entra no repositório.',
    rodape(f.pipeline.cmd),
  ].join('\n'),

  /* Skills de agente versionadas no repositório. */
  skills: (f) => [
    '| Contagem | Quanto | O que significa |',
    '|---|---:|---|',
    `| Declaradas no \`skills-lock.json\` | ${f.skills.lock} | com \`source\`, \`skillPath\` e \`computedHash\` — skill de terceiro que mudar de conteúdo é detectável |`,
    `| Versionadas (chegam em quem clona) | ${f.skills.versionadas} | \`git ls-files .agents/skills\` |`,
    `| …dessas, com \`SKILL.md\` no git | ${f.skills.comSkillMd} | é o que um clone limpo consegue ler |`,
    '',
    '**As contagens divergem de propósito, e a diferença é o fato:** a maioria das skills é ' +
    'de terceiro, fixada por hash no lock e baixada sob demanda. Quem clonar o repositório recebe ' +
    'o lock inteiro e só uma parte do conteúdo. Publicar só uma das contagens esconderia exatamente ' +
    'o que o contribuidor precisa saber.',
    '',
    '`.claude/skills/` são **symlinks** para `.agents/skills/` — uma cópia só, dois nomes, porque ' +
    'o Claude Code lê de `.claude/` e outros arnêses leem de `.agents/`.',
    '',
    f.skills.gauntlet
      ? 'A skill do loop desta casa, **`gauntlet-fps`**, é a única que nasceu aqui: vive em `.claude/skills/gauntlet-fps/SKILL.md`, não é symlink e não entra no lock.'
      : '⚠️ A skill `gauntlet-fps` **não foi encontrada** nesta árvore.',
    rodape(f.skills.cmd),
  ].join('\n'),

  /* O portão, em números. */
  invariantes: (f) => [
    `- \`tools/eval/invariants.mjs\`: **${num(f.portao.linhas)} linhas**, **${f.portao.ids} identificadores de invariante declarados** (\`put()\`), dos quais **${f.portao.comSkip}** têm caminho de \`skip()\` declarado.`,
    `- O arnês inteiro são **${f.portao.scriptsEval} scripts** em \`tools/eval/\` (\`.mjs\` + \`.py\`), mais **${f.portao.scriptsTools} scripts** de pipeline em \`tools/\`.`,
    `- Quantas invariantes rodam como **críticas** numa execução **não é derivável do fonte**: depende de qual insumo existe na máquina (o JSON do auditor de viewmodel, um GLB, uma pasta de anims). Esse número só sai rodando o quality gate — e o lugar dele é o cabeçalho do \`KNOWN-BUGS.md\`, atualizado com saída real.`,
    '',
    'Reproduza:',
    '',
    '```bash',
    "grep -o \"put('[A-Z0-9_]*'\"  tools/eval/invariants.mjs | sort -u | wc -l",
    "grep -o \"skip('[A-Z0-9_]*'\" tools/eval/invariants.mjs | sort -u | wc -l",
    '```',
    rodape(f.portao.cmd),
  ].join('\n'),

  /* Os scripts do portão, direto do package.json. */
  scripts: (f) => [
    '```bash',
    `npm run check        # ${f.scripts.check}`,
    `npm run check:fast   # ${f.scripts.checkFast}`,
    '```',
    '',
    `\`package.json\` tem **${f.scripts.total} scripts**. Vários trazem uma chave \`//nome\` logo acima com o motivo de existirem — é onde mora o porquê.`,
    rodape(f.scripts.cmd),
  ].join('\n'),

  /* Quantas pessoas. */
  /* De propósito SEM o total de commits: ele muda a cada commit e deixaria o `docs:check`
     vermelho logo depois de todo commit — inclusive dos commits que só mexem em doc.
     Vermelho que não corresponde a defeito ensina a ignorar vermelho. O que este bloco
     publica é quem assina, que muda quando alguém novo aparece — que é o fato. */
  /* "neste repositório" era FALSO e custou caro descobrir: o shortlog roda contra o HEAD, e
     o HEAD é uma branch. A `v2/alpha` saiu de `main` antes do merge do PR #14 e por isso não
     tem os 13 commits do William Oliveira — a doc anunciava 3 pessoas num repositório que
     tem 4, apagando um contribuidor de terceiro da própria página que fala de contribuir.
     A frase agora diz qual histórico foi medido; a diferença entre branches está em
     `docs/LICENCA.md`, com o comando que a reproduz. */
  pessoas: (f) => [
    `**${f.pessoas.humanos} identidades de autoria humana** assinam commit no histórico ` +
    `**desta branch**: ${f.pessoas.nomes.map((n) => `\`${n}\``).join(', ')}. O resto dos commits é assinado por agentes de IA. ` +
    'Branch não é repositório: quem contribuiu num ramo que esta branch não contém **não aparece aqui**.',
    rodape(f.pessoas.cmd),
  ].join('\n'),

  /* Licença — a resposta correta é a que está no arquivo LICENSE, e só ela. */
  /* SEM link markdown para `LICENSE`: um link relativo `(LICENSE)` funciona no GitHub e
     é LINK QUEBRADO no Docusaurus (`onBrokenLinks: 'throw'` derruba o build), porque
     `LICENSE` não é uma rota do site. O mesmo bloco vive nos dois lugares, então ele só
     pode conter markdown que sobrevive aos dois renderizadores. */
  /* Sem nome identificado o bloco DIZ que não sabe. A versão anterior interpolava `null` e
     seguia — e é assim que uma página publicada passa três dias afirmando a licença errada. */
  licenca: (f) => [
    f.licenca.nome
      ? `O código está sob **${f.licenca.nome}** (${f.licenca.nomeLongo}) — é o que vale hoje, e a ` +
        'fonte é o arquivo `LICENSE` na raiz do repositório. Nenhum outro arquivo tem autoridade sobre isso.'
      : '⚠️ **A licença não foi identificada.** O `LICENSE` da raiz não casa com nenhum nome conhecido do ' +
        '`tools/gen-docs.mjs`. Enquanto isso não for resolvido, esta página **não responde** qual é a licença — ' +
        'leia o arquivo `LICENSE` direto no repositório.',
    rodape(f.licenca.cmdNome),
  ].join('\n'),

  /* Validação dos ponteiros arquivo:linha escritos à mão na prosa. Um ponteiro que aponta
     para além do fim do arquivo é a versão barata do mesmo defeito que este script combate. */
  ponteiros: () => {
    const alvos = ['README.md', 'STATUS.md', 'HANDOFF.md', 'KNOWN-BUGS.md', 'AGENTS.md',
      ...glob('docs/docs', (x) => x.endsWith('.md')).map((x) => `docs/docs/${x}`),
      ...(existe('.claude/skills/gauntlet-fps') ? ['.claude/skills/gauntlet-fps/SKILL.md'] : [])];
    const quebrados = [];
    let conferidos = 0;
    /* O QUE ESTE FILTRO CONSERTA — vale a explicação, porque o defeito era um loop.
       A varredura lia o arquivo INTEIRO, inclusive o bloco que ela mesma escreve. Quando
       um ponteiro quebrado era reportado, o relatório passava a CONTER o ponteiro
       (`… → \`game.js:99999\` …`), e a execução seguinte o encontrava de novo — no próprio
       relatório. Resultado medido: o `arquitetura.md` acusava um `game.js:99999` que não
       existia em parágrafo nenhum da página; o único lugar em que ele aparecia era a
       denúncia anterior. Régua que se alimenta da própria saída nunca fica verde, e
       vermelho que não corresponde a defeito ensina a ignorar vermelho.
       Conteúdo entre marcadores é GERADO — não é prosa humana e não se audita. */
    const semGerados = (t) => {
      const out = [];
      let dentro = false;
      for (const l of t.split('\n')) {
        if (/BEGIN:GERADO:/.test(l)) { dentro = true; continue; }
        if (/END:GERADO:/.test(l)) { dentro = false; continue; }
        if (!dentro) out.push(l);
      }
      return out.join('\n');
    };
    for (const alvo of alvos) {
      if (!existe(alvo)) continue;
      const txt = semGerados(ler(alvo));
      for (const [, arq, ln] of txt.matchAll(/`([\w./-]+\.(?:js|mjs|ts|py|astro|css|json|sql|yml))[:](\d+)/g)) {
        const cand = ['', 'public/js/', 'tools/eval/', 'tools/', 'src/lib/', 'src/pages/', 'public/']
          .map((p) => p + arq).find((p) => existe(p) && statSync(R(p)).isFile());
        if (!cand) continue;
        conferidos++;
        const total = linhas(cand);
        if (+ln > total) quebrados.push(`\`${alvo}\` → \`${arq}:${ln}\` (o arquivo tem ${num(total)} linhas)`);
      }
    }
    /* De propósito NÃO publica "N ponteiros conferidos": esse número muda a cada
       parágrafo escrito em qualquer doc, e o `--check` ficaria vermelho por edição de
       prosa. Vermelho que não corresponde a defeito ensina a ignorar vermelho. Aqui o
       bloco só muda quando um ponteiro DE FATO quebra. */
    void conferidos;
    return [
      quebrados.length
        ? ['⚠️ **Ponteiros que apontam para além do fim do arquivo** (a prosa envelheceu — corrija à mão):', '',
          ...[...new Set(quebrados)].map((q) => `- ${q}`)].join('\n')
        : 'Nenhum ponteiro `arquivo:linha` das docs aponta para fora do arquivo que ele cita. ✓',
      '',
      '> Isto confere só o **limite** do arquivo: um ponteiro que ainda cabe mas mudou de assunto ' +
      'passa aqui. É a razão de a doutrina da casa ser declarar o SÍMBOLO e deixar a linha para o ' +
      'gerador — ver `tools/gen-arch.mjs`.',
      rodape('varredura de `arquivo:linha` em README/STATUS/HANDOFF/KNOWN-BUGS/docs/docs/SKILL'),
    ].join('\n');
  },
};

const rodapeEn = (cmd) => `\n> Block generated by \`node tools/gen-docs.mjs\`. Source: \`${cmd}\`\n`;
const BLOCOS_EN = {
  numeros: (f) => [
    '| What | How much | Where to check |', '|---|---:|---|',
    `| Game code | ${numEn(f.jogo.linhas)} lines in ${f.jogo.arquivos} files | \`cat public/js/*.js \\| wc -l\` |`,
    `| \`game.js\` | **${numEn(f.jogo.porArquivo['game.js'])}** lines | \`wc -l public/js/game.js\` |`,
    `| \`main.js\` | ${numEn(f.jogo.porArquivo['main.js'])} lines | \`wc -l public/js/main.js\` |`,
    `| Weapons with GLB | ${f.assets.armas} | \`ls public/models/weapons/*.glb \\| wc -l\` |`,
    `| Character GLBs | ${f.assets.personagens} | \`ls public/models/characters/*.glb \\| wc -l\` |`,
    `| Props in GLB | ${f.assets.props} | \`ls public/models/props/*.glb \\| wc -l\` |`,
    `| Versioned animation clips | ${numEn(f.assets.anims)} | \`git ls-files public/models/anims \\| wc -l\` |`,
    `| Playable characters | ${f.elenco.total}, in ${f.elenco.faccoes} factions | \`CHARACTERS\` array in \`characters.js\` |`,
    `| Maps in the registry | ${f.mapas.total} | \`MAPS\` object in \`maps.js\` |`,
    `| Visual harnesses in HTML | ${f.portao.arnesesHtml} | \`ls public/*.html \\| wc -l\` |`,
    `| Harness scripts | ${f.portao.scriptsEval} | \`ls tools/eval/*.mjs tools/eval/*.py \\| wc -l\` |`,
    `| Pipeline scripts | ${f.portao.scriptsTools} | \`ls tools/*.mjs \\| wc -l\` |`,
    `| Written entry tasks | ${f.issues.escritas} | \`ls docs/issues/[0-9]*.md \\| wc -l\` |`,
    `| Version | \`${f.versao.jogo}\` | \`public/js/version.js\` and \`package.json\` ${f.versao.concordam ? '(match)' : '**DIVERGE**'} |`,
    rodapeEn('the command in the right column of each row'),
  ].join('\n'),
  regras: (f) => [
    '| Rule | Value | Constant |', '|---|---|---|',
    `| Factions · characters | ${f.elenco.faccoes} · ${f.elenco.total} (${Object.entries(f.elenco.porFaccao).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}) | \`CHARACTERS\` |`,
    `| Maps in the menu | ${f.mapas.total} - ${f.mapas.emRodadas} open in rounds, **${f.mapas.emCaptura} in capture** | \`MAPS\` / \`ctfMode\` |`,
    `| Respawn | ${f.regras.respawn} s | \`RESPAWN_DELAY\` |`,
    `| Round | ${f.regras.roundTime} s, ${f.regras.roundsToWin} wins | \`ROUND_TIME\` / \`ROUNDS_TO_WIN\` |`,
    `| Capture | target = **all flags on the map**, ${f.regras.ctfRounds} rounds (${f.regras.ctfMatchTime} s safety net) | \`capsToWin = ctfPts.length\` / \`CTF_ROUNDS_TO_WIN\` |`,
    `| Health regeneration | **${f.regras.regenLigado === false ? 'OFF - `?regen=1` turns it back on' : 'ON by default'}** | \`REGEN\` |`,
    `| Ranking / \`/u/\` pages | **${f.regras.rankingOn ? 'ON' : 'OFF - controlled by one flag'}** | \`RANKING_ON\` in \`src/lib/site.ts\` |`,
    rodapeEn(f.regras.cmd),
  ].join('\n'),
  mapas: (f) => [
    '| Id | Menu name | Opens in | File in `public/js/` | Lines |', '|---|---|---|---|---:|',
    ...f.mapas.registrados.map((m) => `| \`${m.id}\` | ${m.nome} | ${m.ctf ? '**capture**' : 'rounds'} | \`${m.arquivo || '-'}\` | ${m.arquivo ? numEn(linhas('public/js/' + m.arquivo)) : '-'} |`),
    '', `**${f.mapas.total} registered maps** - ${f.mapas.emRodadas} open in rounds and ${f.mapas.emCaptura} in capture. \`ctfMode\` sets the initial mode; it does not lock it. There are ${f.mapas.arquivosNoDisco} \`map_*.js\` files on disk, so a file alone does **not** make a map playable.`,
    rodapeEn(f.mapas.cmd),
  ].join('\n'),
  scripts: (f) => ['```bash', `npm run check        # ${f.scripts.check}`, `npm run check:fast   # ${f.scripts.checkFast}`, '```', '', `\`package.json\` has **${f.scripts.total} scripts**. Keys prefixed with \`//\` explain why the adjacent command exists.`, rodapeEn(f.scripts.cmd)].join('\n'),
  stack: (f) => [
    '| Layer | Tool | Version |', '|---|---|---|',
    `| 3D engine (WebGL) | **Three.js**, vendored | \`${f.stack.three}\` |`, `| Game | vanilla ES modules, **zero build** | ${f.jogo.arquivos} files |`,
    `| Site | **Astro** with SSR | \`${f.stack.astro}\` |`, `| Hosting | **Vercel** adapter | \`${f.stack.adapter}\` |`,
    `| Database | **managed Postgres** (RLS; private schema) | \`${f.stack.supabase}\` |`, `| Browser checks | **Playwright** | \`${f.stack.playwright}\` |`,
    `| GLB pipeline | **gltf-transform** | \`${f.stack.gltfTransform}\` |`, `| Mesh compression | **meshoptimizer** | \`${f.stack.meshopt}\` |`,
    `| Images | **sharp** · **resvg** | \`${f.stack.sharp}\` · \`${f.stack.resvg}\` |`, `| This documentation | **Docusaurus** | \`${f.stack.docusaurus}\` |`, `| CI runtime | **Node** | \`${f.stack.node}\` |`,
    '', `Three.js comes from \`public/vendor/three.module.js\`. Of the scripts in \`tools/\`, **${f.pipeline.playwright}** import Playwright, **${f.pipeline.gltf}** import gltf-transform, and **${f.pipeline.meshopt}** import meshoptimizer.`, rodapeEn(f.stack.cmd),
  ].join('\n'),
  assets: (f) => [
    '| Service | What it generates | Script | Key |', '|---|---|---|---|',
    '| **mint.gg** (Mint MCP) | rigged characters, packs, animation | MCP tools; `mint-assets.json` records the result | owner account via MCP |',
    '| **Tripo3D** | 3D props from text | `tools/gen-asset.mjs --provider tripo` | `TRIPO_API_KEY` |',
    '| **Meshy** | 3D props and rigging | `tools/gen-asset.mjs --provider meshy` | `MESHY_API_KEY` |',
    '| **OpenRouter** | 2D art | `tools/gen-image.mjs` | `OPENROUTER_API_KEY` |', '',
    f.pipeline.mint ? `\`mint-assets.json\` records **${f.pipeline.mint.total} assets** generated through Mint (${Object.entries(f.pipeline.mint.kinds).map(([k, v]) => `${v} \`${k}\``).join(' · ')}).` : '`mint-assets.json` was not found.',
    '', 'API keys live in the gitignored root `.env`; generation is offline and the game runs without them.', rodapeEn(f.pipeline.cmd),
  ].join('\n'),
  skills: (f) => [
    '| Count | How many | Meaning |', '|---|---:|---|', `| Declared in \`skills-lock.json\` | ${f.skills.lock} | third-party skills pinned by source and hash |`,
    `| Versioned | ${f.skills.versionadas} | content available in a clean clone |`, `| Versioned with \`SKILL.md\` | ${f.skills.comSkillMd} | directly readable instructions |`, '',
    'The counts differ by design: the lock records more third-party skills than the repository vendors.', '',
    f.skills.gauntlet ? 'The house workflow skill, **`gauntlet-fps`**, is present locally and does not belong to the third-party lock.' : 'The `gauntlet-fps` skill was not found.', rodapeEn(f.skills.cmd),
  ].join('\n'),
  arquivos: (f) => {
    const alvos = ['game.js', 'main.js', 'characters.js', 'glbchars.js', 'vmattach.js', 'weapons.js', 'springs.js'];
    return ['| File | Lines |', '|---|---:|', ...alvos.filter((a) => f.jogo.porArquivo[a] != null).sort((a, b) => f.jogo.porArquivo[b] - f.jogo.porArquivo[a]).map((a) => `| \`public/js/${a}\` | ${numEn(f.jogo.porArquivo[a])} |`), '', `Total in \`public/js/\`: **${numEn(f.jogo.linhas)} lines in ${f.jogo.arquivos} files**. The symbol-to-line index lives in \`tools/eval/ARCH.md\`.`, rodapeEn('`wc -l public/js/*.js`')].join('\n');
  },
  invariantes: (f) => [`- \`tools/eval/invariants.mjs\`: **${numEn(f.portao.linhas)} lines**, **${f.portao.ids} declared invariant identifiers**, with **${f.portao.comSkip}** declared \`skip()\` paths.`, `- The harness contains **${f.portao.scriptsEval} scripts** in \`tools/eval/\`, plus **${f.portao.scriptsTools} pipeline scripts** in \`tools/\`.`, '- The number of critical checks in one run depends on the inputs present on that machine; dated results belong in `KNOWN-BUGS.md`.', '', '```bash', "grep -o \"put('[A-Z0-9_]*'\" tools/eval/invariants.mjs | sort -u | wc -l", "grep -o \"skip('[A-Z0-9_]*'\" tools/eval/invariants.mjs | sort -u | wc -l", '```', rodapeEn(f.portao.cmd)].join('\n'),
  pessoas: (f) => [`**${f.pessoas.humanos} human author identities** sign commits in this branch: ${f.pessoas.nomes.map((n) => `\`${n}\``).join(', ')}. Automated identities are excluded. A Git author name is not necessarily one unique person.`, rodapeEn(f.pessoas.cmd)].join('\n'),
};

/* ═══════════════════════════════════════════════════════════ MOTOR
   Acha os marcadores nos arquivos, reescreve o miolo, preserva o resto. */

/* COLOCAÇÃO DECLARADA: bloco -> arquivos em que ele TEM que aparecer.
   Sem isto, apagar o marcador de UMA página some com o bloco em silêncio e o `--check`
   continua verde, porque o bloco ainda existe em outra página. Foi medido: a mutação
   "apaga o marcador de `mapas` em comecando.md" passava VERDE antes desta tabela.
   O contrato agora é dos dois lados — o conteúdo é gerado E o lugar é declarado. */
const COLOCACAO = {
  versao_atual: ['CHANGELOG.md'],
  status_atual: ['STATUS.md'],
  numeros: ['README.md', 'docs/docs/comecando.md'],
  regras: ['README.md', 'docs/docs/comecando.md'],
  mapas: ['README.md', 'docs/docs/comecando.md', 'docs/docs/colaborar.md'],
  scripts: ['README.md', 'docs/docs/comecando.md', 'AGENTS.md'],
  zonas: ['AGENTS.md'],
  stack: ['README.md', 'docs/docs/stack.md'],
  assets: ['docs/docs/stack.md'],
  skills: ['docs/docs/stack.md'],
  licenca: ['README.md'],
  licenca_pontos: ['CONTRIBUTING.md'],
  arquivos: ['docs/docs/arquitetura.md'],
  ponteiros: ['docs/docs/arquitetura.md'],
  invariantes: ['docs/docs/quality-gates.md'],
  pessoas: ['docs/docs/colaborar.md'],
};
const COLOCACAO_EN = {
  numeros: ['docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md'],
  regras: ['docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md'],
  mapas: ['docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md', 'docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md'],
  scripts: ['docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md'],
  stack: ['docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md'],
  assets: ['docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md'],
  skills: ['docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md'],
  arquivos: ['docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md'],
  invariantes: ['docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md'],
  pessoas: ['docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md'],
};
const LOCALIZACOES = [
  { prefixo: '', blocos: BLOCOS, colocacao: COLOCACAO },
  { prefixo: 'en:', blocos: BLOCOS_EN, colocacao: COLOCACAO_EN },
];
const ARQUIVOS_ALVO = [...new Set(LOCALIZACOES.flatMap((l) => Object.values(l.colocacao).flat()))];

/* Aceita as duas sintaxes de comentário. MDX (docs/docs/) não tem comentário HTML:
   `<!--` ali é erro de parse do MDX 3, e derruba o build do Docusaurus. */
const marcador = (nome) => new RegExp(
  `(<!--\\s*BEGIN:GERADO:${nome}\\b[^>]*-->|\\{/\\*\\s*BEGIN:GERADO:${nome}\\b.*?\\*/\\})` +
  `([\\s\\S]*?)` +
  `(<!--\\s*END:GERADO:${nome}\\s*-->|\\{/\\*\\s*END:GERADO:${nome}\\s*\\*/\\})`,
);

function aplicar(fatos) {
  const mudancas = [];              // { arquivo, novo }
  const achados = new Map();        // bloco -> Set(arquivos em que foi encontrado)

  for (const arq of ARQUIVOS_ALVO) {
    if (!existe(arq)) continue;
    const atual = ler(arq);
    let novo = atual;
    for (const local of LOCALIZACOES) {
      if (!Object.values(local.colocacao).flat().includes(arq)) continue;
      for (const [nome, gerar] of Object.entries(local.blocos)) {
        const re = marcador(nome);
        if (!re.test(novo)) continue;
        const chave = local.prefixo + nome;
        if (!achados.has(chave)) achados.set(chave, new Set());
        achados.get(chave).add(arq);
        if (nome === 'pessoas' && fatos.raso) continue;
        novo = novo.replace(re, (_, abre, __, fecha) => `${abre}\n\n${gerar(fatos).trim()}\n\n${fecha}`);
      }
    }
    if (novo !== atual) mudancas.push({ arquivo: arq, novo });
  }

  /* Três defeitos diferentes, e cada um tem que ter nome próprio na saída. */
  const semLugar = [];
  const faltando = [];                                                          // colocação declarada, marcador ausente
  const semBloco = [];
  for (const local of LOCALIZACOES) {
    for (const nome of Object.keys(local.blocos)) if (!local.colocacao[nome]) semLugar.push(local.prefixo + nome);
    for (const [nome, arqs] of Object.entries(local.colocacao)) {
      if (!local.blocos[nome]) semBloco.push(local.prefixo + nome);
      for (const a of arqs)
        if (existe(a) && !achados.get(local.prefixo + nome)?.has(a)) faltando.push(`${local.prefixo}${nome} → ${a}`);
    }
  }

  return { mudancas, achados, semLugar, faltando, semBloco };
}

/* ═══════════════════════════════════════════════════════════ SAÍDA */

const fatos = medir();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(fatos, null, 2));
  process.exit(0);
}

const { mudancas, achados, semLugar, faltando, semBloco } = aplicar(fatos);

/* Consistências que NÃO são bloco de doc, mas que a doc depende para não mentir. */
const inconsistencias = [];

/* ── O GÊMEO EM INGLÊS TAMBÉM MENTE, E NINGUÉM ESTAVA OLHANDO (07/08) ─────────
   `COLOCACAO` só lista arquivos PT. As traduções em
   `docs/i18n/en/docusaurus-plugin-content-docs/current/` carregam os MESMOS
   marcadores `BEGIN:GERADO:` — e nunca são regeradas, porque o conteúdo dos blocos
   é escrito em português e traduzi-los automaticamente seria inventar.

   O resultado, achado pelo dono e não pelo portão: depois da migração para AGPL,
   `/docs/licenca` em português dizia "GNU AFFERO GENERAL PUBLIC LICENSE" e a página
   `/docs/license` em inglês continuava dizendo "**MIT License** — that is what holds
   today". Uma página pública de LICENÇA declarando a licença errada. O `/about` em
   inglês fazia o mesmo.

   Traduzir automático não dá. Mas DETECTAR dá, e é barato: se um gêmeo EN cita o
   nome de uma licença conhecida que NÃO é a vigente, ele está velho. É a mesma
   lição do bloco `LICENCAS_CONHECIDAS` lá em cima — não saber tem que custar o
   mesmo que estar errado, e agora vale para os dois idiomas. */
{
  const EN = 'docs/i18n/en/docusaurus-plugin-content-docs/current';
  const vigente = fatos.licenca.atual;
  for (const nome of (existe(EN) ? glob(EN, (x) => x.endsWith('.md')) : [])) {
    const txt = ler(`${EN}/${nome}`);
    if (!txt) continue;
    for (const sigla of (fatos.licenca.siglas || [])) {
      if (sigla === vigente) continue;
      // `MIT` aparece legitimamente na lista de dependências de terceiros (three.js
      // é MIT e continua sendo). O que não pode é a tradução DECLARAR a licença do
      // projeto — e declaração vem sempre com "is under" / "holds today".
      const declara = new RegExp(`(is under|holds today|licensed under)[^\\n]{0,80}\\b${sigla.replace(/[.]/g, '\\.')}\\b`, 'i');
      if (declara.test(txt)) {
        inconsistencias.push(`tradução EN \`${EN}/${nome}\` declara '${sigla}' e o LICENSE diz '${vigente}'`
          + ' — o gêmeo em inglês não é regerado, então ele precisa ser corrigido à mão no MESMO commit');
      }
    }
  }
}
if (!fatos.versao.concordam)
  inconsistencias.push(`version.js diz '${fatos.versao.jogo}' e package.json diz '${fatos.versao.pacote}'`);
{
  const top = ler('CHANGELOG.md').match(/^## \[([^\]]+)\]/m)?.[1];
  if (top !== fatos.versao.pacote)
    inconsistencias.push(`CHANGELOG.md começa em '${top || '(sem versão)'}' e package.json diz '${fatos.versao.pacote}'`);
}
/* LICENÇA — as duas maneiras de a página mentir, e as duas ficam vermelhas.
   Isto existe porque o caso real não foi nenhum dos erros que a gente imaginava: o gerador
   simplesmente NÃO RECONHECEU o LICENSE novo, devolveu `null` e publicou prosa coerente em
   cima de nada. Não saber tem que custar o mesmo que estar errado. */
if (!fatos.licenca.atual)
  inconsistencias.push(`LICENSE não casa com nenhuma licença conhecida (cabeçalho lido: '${fatos.licenca.cabecalho || '(vazio)'}') — acrescente o nome em LICENCAS_CONHECIDAS, em tools/gen-docs.mjs`);
else if (!fatos.licenca.concordam)
  inconsistencias.push(`LICENSE diz '${fatos.licenca.atual}' e package.json diz '${fatos.licenca.pacote}'`);

if (process.argv.includes('--check')) {
  const erros = [];
  if (mudancas.length) erros.push(`${mudancas.length} arquivo(s) com bloco gerado DESATUALIZADO: ${mudancas.map((m) => m.arquivo).join(', ')}`);
  if (faltando.length) erros.push(`${faltando.length} marcador(es) DECLARADO(S) e AUSENTE(S): ${faltando.join(' · ')}`);
  if (semLugar.length) erros.push(`${semLugar.length} bloco(s) sem colocação declarada em COLOCACAO: ${semLugar.join(', ')}`);
  if (semBloco.length) erros.push(`${semBloco.length} colocação(ões) apontando para bloco inexistente: ${semBloco.join(', ')}`);
  for (const i of inconsistencias) erros.push(i);
  if (erros.length) {
    console.error('✗ DOCS1  a documentação está DESATUALIZADA em relação ao código.');
    for (const e of erros) console.error('         - ' + e);
    console.error('         Rode: npm run docs');
    process.exit(1);
  }
  const marcadores = [...achados.values()].reduce((s, x) => s + x.size, 0);
  console.log(`✓ DOCS1  docs em dia (${achados.size} blocos em ${marcadores} marcadores, ${fatos.jogo.arquivos} arquivos de jogo, ${num(fatos.jogo.linhas)} linhas)`);
  process.exit(0);
}

for (const m of mudancas) writeFileSync(R(m.arquivo), m.novo);
console.log(`✓ gen-docs — ${mudancas.length} arquivo(s) atualizado(s), ${achados.size} bloco(s) gerados`);
for (const m of mudancas) console.log(`  · ${m.arquivo}`);
if (faltando.length) {
  console.log(`\n  ⚠ ${faltando.length} marcador(es) declarado(s) em COLOCACAO e AUSENTE(S) no arquivo:`);
  for (const x of faltando) console.log(`    - ${x}`);
  console.log('    (cole o marcador na página, ou tire a linha do COLOCACAO — as duas coisas são decisão, não acidente)');
}
for (const x of semLugar) console.log(`\n  ⚠ bloco '${x}' existe no gerador e não tem colocação declarada — ninguém o consome`);
for (const x of semBloco) console.log(`\n  ⚠ COLOCACAO declara '${x}', que não existe em BLOCOS`);
for (const i of inconsistencias) console.log(`\n  ⚠ ${i}`);
