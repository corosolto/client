#!/usr/bin/env node
/* ============================================================================
   gatilho.mjs — QUAL PR ACORDA O PORTÃO DE NAVEGADOR E O SMOKE
   ----------------------------------------------------------------------------
   FONTE ÚNICA. O job `decide` do portao-browser.yml e do smoke-web.yml chama este
   arquivo, e a régua `eval:portaogatilho` (tools/eval/portao-gatilho-check.mjs)
   mede este mesmo padrão contra o fecho de import do que os jobs rodam.

   POR QUE SAIU DO `paths:` DO WORKFLOW (14/10/2026)
   · O `paths:` listava arquivo por arquivo e envelheceu: em 48 h, 13 PRs de jogo
     passaram sem portão (#886 e #871 em net.js, #877 em netgame.js, #867 em
     community.js), porque nenhum desses nomes estava na lista.
   · Filtro de `paths:` não deixa check nenhum quando não casa (o PR fica sem rastro
     de que o portão existiu) e o GitHub IGNORA o filtro em PR com mais de 300
     arquivos, sem aviso.
   Aqui o padrão é o fecho, por diretório, e o pulo vira um job SKIPPED visível.

   REGRA DE OURO: só se PULA com afirmação explícita. A CLI imprime `rodar=false`
   apenas quando leu a lista inteira e nada casou; lista vazia, erro de leitura,
   erro de git ou de JSON imprimem `rodar=true`. Quem chama trata qualquer coisa
   diferente de `rodar=false` como rodar.

   package.json é caso à parte: quase todo PR de régua acrescenta um script, e se
   isso acordasse o portão ele rodaria em todo PR. Ele acorda quando muda um campo
   que não é `scripts` (dependência, versão, `type`...) ou quando muda um script que
   o job usa: os passos declarados abaixo, os `npm run` aninhados neles, os pre/post
   de cada um e os de ciclo de vida do `npm ci`.

   NOME COM ACENTO: o `git diff --name-only` padrão (core.quotePath=true) devolve
   `"public/img/a\303\247\303\243o.png"`, entre aspas e em octal. Nada casa com isso e o
   portão seria PULADO, falha aberta. O decide lista com `-c core.quotePath=false -z`
   (separado por NUL, nome cru) e, por defesa, esta CLI ainda desfaz a forma com aspas.

   Uso (CI):  git -c core.quotePath=false diff --no-renames --name-only -z BASE...HEAD \
                | BASE=<sha> HEAD=<sha> node scripts/ci/gatilho.mjs <portao|smoke>
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* O que o portão de navegador carrega: o jogo servido (public/ menos o site de docs,
   que é build estático do Docusaurus), a página que o boot abre, o que o astro dev
   compila para ela, as rotas /api que o jogo chama durante o boot, os arnêses e o
   que eles leem, a camada operacional e o próprio workflow. */
const COMUM = [
  /^public\/(?!docs\/)/,
  /^src\/pages\/index\.astro$/,
  /^src\/pages\/api\//,
  /^src\/(components|layouts|lib|data|styles)\//,
  /^astro\.config\.mjs$/,
  /^tsconfig\.json$/,
  /^scripts\/(aeo|module-cache|copy-wasm|install-git-hooks)\.mjs$/,
  /^package-lock\.json$/,
  /^scripts\/ci\/gatilho\.mjs$/,
];

export const GATILHOS = {
  portao: {
    workflow: '.github/workflows/portao-browser.yml',
    padroes: [
      ...COMUM,
      /^tools\/eval\/(serve|harness|three-node|ak-manga-gpu-check|graffiti-census|graffiti-audit|select-inflate|entrada-check|armas-check|boot-check|perfil-mobile-browser|sertao-livestock-runtime-check|treta-vitrine-browser|graffiti-census-accept|ego-graffiti-census|graffiti-current-ci-check|graffiti-current-accept|graffiti-current-browser-check|graffiti-curation-measure|graffiti-art-inventory|selected-weapon-probe|lobby-arma-mao-check|mira-alinhada-check|gate-accept|toque-controles-check|vm-autorado-vivo|viewmodel-network-fixture)\.mjs$/,
      /^tools\/eval\/(graffiti_census|graffiti_audit|select_inflate|select_inflate_debt)\.json$/,
      /^tools\/eval\/assets-check\.mjs$/,
      /^tools\/eval\/map-fauna-curated(?:-(?:ci|collector|browser|capture))?\.(?:mjs|json)$/,
      /^tools\/eval\/map-fauna-response-proof\.mjs$/,
      /^mint-assets\.json$/,
      /^tools\/audio\/(politica|map-ids)\.mjs$/,
      /^scripts\/fetch-decals\.sh$/,
      /^tools\/viewmodels\/vm-assets\.manifest\.json$/,
      /^tools\/ops\//,
      /^\.github\/workflows\/portao-browser\.yml$/,
    ],
    /* `npm run` que o workflow chama. A régua cobra os dois lados: passo novo sem
       entrada aqui é vermelho, e entrada aqui sem passo também (passo que sumiu). */
    passos: ['eval:serve', 'eval:map-fauna-curated:runtime', 'eval:grafite-atual', 'eval:select', 'eval:lobbyarmamao', 'eval:mira-public', 'eval:entrada', 'eval:perfilmobile:browser', 'eval:toquecontroles', 'eval:vm-maos-mobile-desktop', 'eval:armas', 'eval:boot', 'eval:sertao-livestock-runtime', 'eval:grafite:ar'],
  },
  smoke: {
    workflow: '.github/workflows/smoke-web.yml',
    padroes: [
      ...COMUM,
      /^tests\/smoke\//,
      /^playwright(\.[\w-]+)?\.config\.mjs$/,
      /^\.github\/workflows\/smoke-web\.yml$/,
    ],
    passos: ['dev'],
  },
};

/* `npm ci` roda estes do próprio pacote; o resto entra pelo pre/post de cada passo. */
const CICLO_DE_VIDA = ['preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'prepare', 'postprepare'];

export function casa(alvo, caminho) {
  const g = GATILHOS[alvo];
  if (!g) throw new Error(`alvo desconhecido: ${alvo}`);
  return g.padroes.some((re) => re.test(caminho));
}

/* Os scripts que o job executa de fato: passos, `npm run X` aninhados, pre/post. */
export function scriptsUsados(alvo, scripts) {
  const usados = new Set();
  const fila = [...GATILHOS[alvo].passos, ...CICLO_DE_VIDA];
  while (fila.length) {
    const nome = fila.shift();
    if (usados.has(nome)) continue;
    usados.add(nome);
    for (const gancho of [`pre${nome}`, `post${nome}`]) if (scripts?.[gancho] !== undefined) fila.push(gancho);
    for (const m of String(scripts?.[nome] ?? '').matchAll(/npm (?:run(?:-script)?|run-script)\s+(?:--?[\w-]+\s+)*([\w:.-]+)/g)) fila.push(m[1]);
  }
  return usados;
}

/* package.json acorda o alvo? Lança em JSON inválido: quem chama trata como rodar. */
export function pacoteRelevante(alvo, antesTxt, depoisTxt) {
  const antes = JSON.parse(antesTxt);
  const depois = JSON.parse(depoisTxt);
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  for (const k of chaves) {
    if (k === 'scripts') continue;
    if (JSON.stringify(antes[k]) !== JSON.stringify(depois[k])) return `package.json: campo \`${k}\` mudou`;
  }
  const usados = new Set([...scriptsUsados(alvo, antes.scripts), ...scriptsUsados(alvo, depois.scripts)]);
  for (const s of usados) {
    if ((antes.scripts || {})[s] !== (depois.scripts || {})[s]) return `package.json: script \`${s}\`, usado pelo job, mudou`;
  }
  return '';
}

/* Nome na forma C do git (`"a\303\247.png"`) volta a ser o nome cru, em UTF-8. */
export function desaspa(nome) {
  if (!/^".*"$/.test(nome)) return nome;
  const bytes = [];
  const corpo = nome.slice(1, -1);
  const SIMPLES = { n: 10, t: 9, r: 13, a: 7, b: 8, f: 12, v: 11, '"': 34, '\\': 92 };
  for (let i = 0; i < corpo.length; i++) {
    const c = corpo[i];
    if (c !== '\\') { bytes.push(...Buffer.from(c, 'utf8')); continue; }
    const oct = /^[0-7]{3}/.exec(corpo.slice(i + 1));
    if (oct) { bytes.push(parseInt(oct[0], 8)); i += 3; continue; }
    const s = SIMPLES[corpo[i + 1]];
    if (s === undefined) throw new Error(`escape desconhecido em ${nome}`);
    bytes.push(s); i += 1;
  }
  return Buffer.from(bytes).toString('utf8');
}

/* Lista do stdin: separada por NUL (`-z`) ou por linha, com a forma entre aspas desfeita. */
export function lerLista(texto) {
  return texto.split(/[\0\n]/).map((a) => a.replace(/\r$/, '')).filter((a) => a.trim()).map(desaspa);
}

/* Decide a partir da lista de arquivos. `lerPacote(ref)` devolve o texto do
   package.json naquela revisão. Devolve { rodar, motivo }. */
export function decidir(alvo, arquivos, lerPacote) {
  const lista = arquivos.map((a) => a.trim()).filter(Boolean);
  if (!lista.length) return { rodar: true, motivo: 'lista de arquivos vazia: sem saber o que mudou, roda' };
  const casou = lista.find((a) => casa(alvo, a));
  if (casou) return { rodar: true, motivo: `${casou} casa com o gatilho de ${alvo}` };
  if (lista.includes('package.json')) {
    const motivo = pacoteRelevante(alvo, lerPacote('BASE'), lerPacote('HEAD'));
    if (motivo) return { rodar: true, motivo };
  }
  return { rodar: false, motivo: `nenhum dos ${lista.length} arquivos toca o que ${alvo} mede` };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const alvo = process.argv[2];
  let veredito;
  try {
    if (!GATILHOS[alvo]) throw new Error(`alvo desconhecido: ${alvo || '(nenhum)'}`);
    const arquivos = lerLista(readFileSync(0, 'utf8'));
    const lerPacote = (lado) => {
      const sha = process.env[lado];
      if (!sha) throw new Error(`${lado} ausente para comparar o package.json`);
      return execFileSync('git', ['show', `${sha}:package.json`], { encoding: 'utf8' });
    };
    veredito = decidir(alvo, arquivos, lerPacote);
  } catch (e) {
    veredito = { rodar: true, motivo: `erro ao decidir (${e.message}): roda` };
  }
  console.error(`gatilho ${alvo}: ${veredito.motivo}`);
  console.log(`rodar=${veredito.rodar}`);
}
