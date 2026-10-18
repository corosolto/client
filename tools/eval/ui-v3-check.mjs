#!/usr/bin/env node
/* Régua da camada Treta Pop (UI v3): tokens, fontes, flag e componentes.
   Fonte dos números: design/treta-pop-2026-10-14 (README.md, telas/00-main.html e
   telas/17-transicoes.html). Cada cláusula tem um mutante que a deixa vermelha:
     node tools/eval/ui-v3-check.mjs              # mede a árvore
     node tools/eval/ui-v3-check.mjs --mutantes   # prova que cada cláusula morde */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ler = (p) => readFileSync(join(ROOT, p), 'utf8');

/* README do pacote, tabela "Tokens", e tela 17 (durações e curvas). */
const TOKENS = {
  '--tp-asfalto': '#090704', '--tp-painel': '#131418', '--tp-elevado': '#26221b',
  '--tp-fundo': '#0e0b07', '--tp-fundo-2': '#141008',
  '--tp-lima': '#b4d92e', '--tp-lima-tinta': '#131313', '--tp-ambar': '#f3b958', '--tp-ganho': '#46e08a',
  '--tp-esq': '#e03232', '--tp-dir': '#2f55e0', '--tp-esq-claro': '#ff6b6b', '--tp-dir-claro': '#7f9cff',
  '--tp-tinta-1': '#f0f0ed', '--tp-tinta-2': '#d3d3d1', '--tp-tinta-3': '#a5a5a3',
  '--tp-rar-comum': '#9aa3b5', '--tp-rar-incomum': '#3ddc84', '--tp-rar-raro': '#2fa8ff',
  '--tp-rar-epico': '#b45cff', '--tp-rar-lendario': '#ff9419', '--tp-rar-mitico': '#ffd400',
  '--tp-d-toque': '100ms', '--tp-d-rapido': '180ms', '--tp-d-painel': '280ms', '--tp-d-cena': '480ms',
  '--tp-ease-saida': 'cubic-bezier(.2,.8,.2,1)', '--tp-ease-cena': 'cubic-bezier(.65,0,.35,1)',
};
/* Hex fora dos tokens que a seção pode usar: paradas de gradiente das raridades
   (00-main.html:77-83), lima claro do JOGAR (17:68), NOVO (00:95), fim da barra (00:102). */
const HEX_EXTRA = new Set([
  '#b5bdcc', '#5e6678', '#66f0a4', '#1a8f52', '#5cc2ff', '#1460c8', '#c98bff', '#6a23b8',
  '#ffb257', '#c25a00', '#ffe766', '#c99a00', '#ff3d9a', '#cfe84a', '#e2402c', '#b6ff5c', '#fff', '#ffffff',
]);
const FACES = [
  ['Anton', 400, 'anton-latin-400-normal.woff2'],
  ['Barlow Semi Condensed', 500, 'barlow-semi-condensed-latin-500-normal.woff2'],
  ['Barlow Semi Condensed', 600, 'barlow-semi-condensed-latin-600-normal.woff2'],
  ['Barlow Semi Condensed', 700, 'barlow-semi-condensed-latin-700-normal.woff2'],
  ['Barlow Semi Condensed', 800, 'barlow-semi-condensed-latin-800-normal.woff2'],
  ['JetBrains Mono', 500, 'jetbrains-mono-latin-500-normal.woff2'],
  ['JetBrains Mono', 700, 'jetbrains-mono-latin-700-normal.woff2'],
  ['JetBrains Mono', 800, 'jetbrains-mono-latin-800-normal.woff2'],
];
const COMPONENTES = [
  '.tp-btn', '.tp-btn--primario', '.tp-btn--fantasma', '.tp-chip--timer', '.tp-pill-ts', '.tp-anel',
  '.tp-barra', '.tp-card', '.tp-abas__risco', '.tp-gaveta', '.tp-toast',
];
const KIT = 'public/ui-v3-kit.html';

function secao(css) {
  const ini = css.indexOf('/* BEGIN:treta-pop */');
  const fim = css.indexOf('/* END:treta-pop */');
  return ini < 0 || fim < ini ? '' : css.slice(ini, fim);
}
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
function bloco(css, seletor) {
  const i = css.indexOf(seletor + '{');
  if (i < 0) return '';
  const j = css.indexOf('}', i);
  return css.slice(i + seletor.length + 1, j);
}
const decl = (corpo, nome) => {
  const m = corpo.match(new RegExp(`(?:^|[;{\\s])${nome.replace(/[-]/g, '\\-')}\\s*:\\s*([^;}]+)`));
  return m ? m[1].trim().toLowerCase() : null;
};

export function medir(arq) {
  const css = arq['public/style.css'];
  const tpSecao = semComentarios(secao(css));
  /* folhas por tela (public/css/tp) seguem as mesmas regras de paleta e de animação da seção */
  const folhas = Object.entries(arq.folhas).map(([f, t]) => [f, semComentarios(t)]);
  const tp = [tpSecao, ...folhas.map(([, t]) => t)].join('\n');
  const raiz = bloco(tpSecao, ':root[data-ui="v3"]');
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });

  const faltam = Object.entries(TOKENS).filter(([k, v]) => decl(raiz, k) !== v);
  add('TP1', raiz && !faltam.length,
    raiz ? (faltam.length ? `tokens fora do README: ${faltam.map(([k, v]) => `${k}=${decl(raiz, k)} (quer ${v})`).join(', ')}` : `${Object.keys(TOKENS).length} tokens batem com o README`)
      : 'não há bloco :root[data-ui="v3"] entre BEGIN:treta-pop e END:treta-pop');

  const faces = [...tp.matchAll(/@font-face\{([^}]*)\}/g)].map((m) => m[1]);
  const erroFace = FACES.flatMap(([fam, peso, arquivo]) => {
    const f = faces.find((x) => x.includes(`'${fam}'`) && new RegExp(`font-weight:${peso}\\b`).test(x));
    if (!f) return [`${fam} ${peso} sem @font-face`];
    if (!f.includes(`/fonts/${arquivo}`)) return [`${fam} ${peso} não aponta para /fonts/${arquivo}`];
    const buf = arq.fontes[arquivo];
    if (!buf) return [`public/fonts/${arquivo} não existe`];
    if (buf.subarray(0, 4).toString('latin1') !== 'wOF2') return [`${arquivo} não é woff2`];
    return [];
  });
  add('TP2', !erroFace.length, erroFace.length ? erroFace.join('; ') : `${FACES.length} faces locais, woff2 válidas`);

  /* As regras do jogo consomem --font/--mono/--aaa-font-*; o hub redefine --font no #main-menu. */
  const familias = { '--font': '--tp-ui', '--mono': '--tp-num', '--aaa-font-display': '--tp-display', '--aaa-font-body': '--tp-ui' };
  const erroFonte = Object.entries(familias).filter(([k, v]) => decl(raiz, k) !== `var(${v})`).map(([k]) => k);
  const hub = bloco(tp, ':root[data-ui="v3"][data-home-ui="hub"] #main-menu');
  if (decl(hub, '--font') !== 'var(--tp-ui)') erroFonte.push('#main-menu do hub');
  const pilhas = ['--tp-display', '--tp-ui', '--tp-num'].map((k) => decl(raiz, k) || '');
  if (pilhas.some((p) => /arial/i.test(p) || !p)) erroFonte.push('pilha com Arial ou vazia');
  if (/bebas|rajdhani|st mono|share tech|barlow condensed/i.test(tp)) erroFonte.push('família antiga dentro da seção');
  add('TP3', !erroFonte.length, erroFonte.length ? `fontes antigas sobrevivem em v3: ${erroFonte.join(', ')}` : 'v3 troca as 4 famílias do jogo e a do hub, sem Arial');

  const hexes = [...tp.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => m[0].toLowerCase());
  const permitido = new Set([...Object.values(TOKENS).filter((v) => v.startsWith('#')), ...HEX_EXTRA]);
  const intrusos = [...new Set(hexes.filter((h) => !permitido.has(h)))];
  const amarelo = (tp.match(/#ffd400/gi) || []).length;
  add('TP4', !intrusos.length && amarelo === 1,
    intrusos.length ? `cor fora da paleta do pacote: ${intrusos.join(', ')}`
      : amarelo !== 1 ? `#FFD400 aparece ${amarelo}x; só pode ser o token de raridade mítica` : 'toda cor da seção está na paleta do pacote');

  const trans = [...tp.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g)].map((m) => m[1]);
  const props = trans.flatMap((t) => t.split(',').map((p) => p.trim().split(/\s+/)[0]));
  const ruins = [...new Set(props.filter((p) => !['transform', 'opacity', 'visibility'].includes(p)))];
  const anim = [...tp.matchAll(/@keyframes[^{]+\{([\s\S]*?\})\s*\}/g)].flatMap((m) => [...m[1].matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]));
  const animRuim = [...new Set(anim.filter((p) => !['transform', 'opacity'].includes(p)))];
  add('TP5', props.length && !ruins.length && !animRuim.length,
    !props.length ? 'nenhuma transição medida' : ruins.length || animRuim.length ? `anima propriedade que não compõe: ${[...ruins, ...animRuim].join(', ')}` : `${props.length} transições, só transform/opacity`);

  const reduz = tp.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*:root\[data-ui="v3"\]\{([^}]*)\}/);
  const opcao = bloco(tp, ':root[data-ui="v3"][data-motion="reduzido"]');
  const erroMov = [];
  for (const [nome, corpo] of [['prefers-reduced-motion', reduz?.[1] || ''], ['data-motion="reduzido"', opcao]]) {
    if (decl(corpo, '--tp-mov') !== '0') erroMov.push(`${nome} não zera --tp-mov`);
    for (const k of ['--tp-d-rapido', '--tp-d-painel', '--tp-d-cena']) if (parseInt(decl(corpo, k) || '999', 10) > 120) erroMov.push(`${nome} deixa ${k} acima de 120 ms`);
  }
  const usaMov = (tp.match(/var\(--tp-mov\)/g) || []).length;
  if (usaMov < 4) erroMov.push(`só ${usaMov} deslocamentos escalam por --tp-mov`);
  add('TP6', !erroMov.length, erroMov.length ? erroMov.join('; ') : `movimento reduzido vira fade de 120 ms (${usaMov} deslocamentos escalados)`);

  const astro = arq['src/pages/index.astro'];
  const head = astro.slice(astro.indexOf('<head>'), astro.indexOf('</head>') > 0 ? astro.indexOf('</head>') : undefined);
  const iLegacy = head.search(/(?:get\('ui'\)|\bui)\s*===\s*'legacy'/);
  const iFlag = head.search(/dataset\.ui\s*=\s*'v3'/);
  const iCss = head.indexOf('/style.css?v=');
  const optIn = /get\('ui'\)\s*!==\s*'v3'/.test(head);
  const legacy = /params\.get\('ui'\) === 'legacy'\) document\.documentElement\.dataset\.ui = 'legacy'/.test(arq['public/js/main.js']);
  add('TP7', iLegacy >= 0 && iFlag > iLegacy && iCss > iFlag && !optIn && legacy,
    iLegacy < 0 || optIn ? 'Treta Pop continua opt-in; a home sem query não recebe data-ui=v3'
      : iFlag <= iLegacy ? 'data-ui=v3 roda antes do kill-switch legado' : iCss <= iFlag ? 'a ativação roda depois do style.css'
        : !legacy ? 'kill-switch ?ui=legacy sumiu do main.js' : 'home liga v3 antes do CSS; ?ui=legacy preserva o rollback');

  const semRegra = COMPONENTES.filter((c) => !new RegExp(`${c.replace(/[.-]/g, '\\$&')}[\\s{:,\\[>]`).test(tp));
  const kit = arq[KIT] || '';
  const foraDoKit = COMPONENTES.filter((c) => !kit.includes(c.slice(1).replace(/__.*/, '')));
  const podado = arq['scripts/prune-dist.mjs'].includes("'dist/client/ui-v3-kit.html'");
  add('TP8', !semRegra.length && kit && !foraDoKit.length && podado,
    semRegra.length ? `componente sem regra: ${semRegra.join(', ')}`
      : !kit ? `${KIT} não existe` : foraDoKit.length ? `kit não exibe: ${foraDoKit.join(', ')}` : !podado ? 'kit não é podado do build' : `${COMPONENTES.length} componentes com regra e no kit; kit fora do deploy`);

  const soltos = [];
  for (const [f, t] of folhas) {
    const semBlocos = t.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');
    for (const m of semBlocos.matchAll(/([^{}]+)\{/g)) {
      const cab = m[1].trim();
      if (!cab || cab.startsWith('@')) continue;
      for (const sel of cab.split(',').map((x) => x.trim()))
        if (!sel.includes('[data-ui="v3"]') && !sel.startsWith('.tp-')) soltos.push(`${f}: ${sel}`);
    }
  }
  add('TP10', !soltos.length, soltos.length ? `seletor fora da v3 numa folha por tela: ${soltos.slice(0, 4).join('; ')}` : `${folhas.length} folhas por tela, todo seletor escopado à v3`);

  /* `//` não é comentário em CSS e já apagou um @keyframes inteiro. */
  const barras = [semComentarios(css), ...folhas.map(([, t]) => t)].join('\n').replace(/url\([^)]*\)/g, '').replace(/"[^"]*"|'[^']*'/g, '').match(/(^|[^:])\/\/.*/gm) || [];
  add('TP9', !barras.length, barras.length ? `"//" no CSS: ${barras[0].trim().slice(0, 60)}` : 'nenhum "//" fora de url() e string');
  return r;
}

function arquivos() {
  const fontes = {};
  for (const [, , f] of FACES) { const p = join(ROOT, 'public/fonts', f); if (existsSync(p)) fontes[f] = readFileSync(p); }
  return {
    'public/style.css': ler('public/style.css'),
    'src/pages/index.astro': ler('src/pages/index.astro'),
    'public/js/main.js': ler('public/js/main.js'),
    'scripts/prune-dist.mjs': ler('scripts/prune-dist.mjs'),
    [KIT]: existsSync(join(ROOT, KIT)) ? ler(KIT) : '',
    folhas: Object.fromEntries(readdirSync(join(ROOT, 'public/css/tp')).filter((f) => f.endsWith('.css')).sort().map((f) => [f, ler(`public/css/tp/${f}`)])),
    fontes,
  };
}

const troca = (arq, chave, de, para) => {
  const antes = arq[chave];
  const depois = typeof de === 'string' ? antes.replace(de, para) : antes.replace(de, para);
  if (depois === antes) throw new Error(`mutante não aplicou em ${chave}: ${de}`);
  return { ...arq, [chave]: depois };
};
const MUTANTES = {
  TP1: (a) => troca(a, 'public/style.css', '--tp-lima:#b4d92e', '--tp-lima:#ffd400'),
  TP2: (a) => ({ ...a, fontes: { ...a.fontes, 'anton-latin-400-normal.woff2': Buffer.from('<html>404</html>') } }),
  TP3: (a) => troca(a, 'public/style.css', ':root[data-ui="v3"][data-home-ui="hub"] #main-menu{--font:var(--tp-ui)}', ''),
  TP4: (a) => troca(a, 'public/style.css', '.tp-chip--novo{background:#e2402c', '.tp-chip--novo{background:#5b4bd6'),
  TP5: (a) => troca(a, 'public/style.css', /\.tp-card\{([^}]*)transition:transform/, '.tp-card{$1transition:box-shadow'),
  TP6: (a) => troca(a, 'public/style.css', /(:root\[data-ui="v3"\]\[data-motion="reduzido"\]\{[^}]*)--tp-mov:0/, '$1--tp-mov:1'),
  TP7: (a) => troca(a, 'src/pages/index.astro', "if (ui === 'legacy') return;", "if (ui !== 'v3') return;"),
  TP8: (a) => troca(a, 'scripts/prune-dist.mjs', "'dist/client/ui-v3-kit.html',", ''),
  TP10: (a) => ({ ...a, folhas: { ...a.folhas, 'lobby.css': `${a.folhas['lobby.css']}\n.btn-big{color:#b4d92e}` } }),
  TP9: (a) => troca(a, 'public/style.css', '.tp-barra{', '// barra de progresso\n.tp-barra{'),
};

const arq = arquivos();
if (process.argv.includes('--mutantes')) {
  let falhas = 0;
  for (const [id, mut] of Object.entries(MUTANTES)) {
    const c = medir(mut(arq)).find((x) => x.id === id);
    const morde = c && !c.ok;
    if (!morde) falhas++;
    console.log(`${morde ? 'MORDE ' : 'CEGO  '} ${id}  ${c?.msg || 'cláusula sumiu'}`);
  }
  console.log(falhas ? `\n${falhas} mutante(s) passaram: régua cega` : `\n${Object.keys(MUTANTES).length}/${Object.keys(MUTANTES).length} mutantes reprovados`);
  process.exit(falhas ? 1 : 0);
}
const res = medir(arq);
for (const c of res) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
const ok = res.filter((c) => c.ok).length;
console.log(`\nui-v3: ${ok}/${res.length}`);
process.exit(ok === res.length ? 0 : 1);
