/* ============================================================================
   spec.mjs — SCAFFOLD E RÉGUA das fichas de conteúdo novo (times e mapas).
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   A skill `csbrasil` (skills/csbrasil/SKILL.md) transforma tema em ficha, ficha em
   referência, referência em prompt, prompt em asset. O elo fraco é a ficha: se ela
   nasce sem mecânica ou sem procedência, todo o resto do pipeline herda o vazio e
   o asset vira "skin genérica bonita" — o defeito mais caro deste projeto.

   Este script é a parte DETERMINÍSTICA do pipeline: o que dá pra checar sem
   julgamento, checa o script; o que exige julgamento (é engraçado? parece
   Brasil?), fica com a skill `asset-review`.

   ── O CONTRATO ──────────────────────────────────────────────────────────────
   Ficha é um MD em plans/ com `<!-- spec:time -->` ou `<!-- spec:mapa -->` na
   primeira linha. O marcador é o que separa ficha de plano comum: o check varre
   plans/ e só valida quem se declara spec.

   time: cada seção `## N. Nome — papel` exige Visual, Papel, Arma e Mecânica.
   mapa: exige as seções Local real, Layout, Cobertura, Linhas de visão,
         Referências e Régua de aceite.

   Uso:
     node tools/spec.mjs new time <slug>     → cria plans/NN-<SLUG>.md
     node tools/spec.mjs new mapa <slug>     → idem, schema de mapa
     node tools/spec.mjs check <arq|dir>…    → valida; sai 1 se algo falta
     node tools/spec.mjs check --mutante=sem-mecanica
       → prova que a régua morde: valida uma ficha PROPOSITALMENTE quebrada e
         exige que ela seja reprovada. Régua que aprova o mutante está cega.
   ============================================================================ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MARCADOR = /<!--\s*spec:(time|mapa)\s*-->/;
const CAMPOS_TIME = ['Visual', 'Papel', 'Arma', 'Mecânica'];
const SECOES_MAPA = [
  'Local real', 'Layout', 'Cobertura (cover)',
  'Linhas de visão', 'Referências', 'Régua de aceite',
];

/* ── extração ─────────────────────────────────────────────────────────────── */

function secoes(md) {
  /* Devolve [{ titulo, corpo }] para cada `## ` do documento. */
  const partes = md.split(/^## /m).slice(1);
  return partes.map((p) => {
    const quebra = p.indexOf('\n');
    return { titulo: p.slice(0, quebra).trim(), corpo: p.slice(quebra + 1) };
  });
}

function campoPreenchido(corpo, campo) {
  /* `- **Visual:** texto` conta; `- **Visual:**` (só o marcador) não.
     Aceita as duas grafias: `**Campo:**` e `**Campo**:`. O resto da linha,
     depois do marcador INTEIRO, é o que vale. */
  const re = new RegExp(`^\\s*-\\s*\\*\\*${campo}(:\\*\\*|\\*\\*:?)\\s*`, 'm');
  const linha = corpo.split('\n').find((l) => re.test(l));
  if (!linha) return false;
  return linha.replace(re, '').trim().length > 0;
}

/* ── validação ────────────────────────────────────────────────────────────── */

function validaTime(md, arq) {
  const erros = [];
  const fichas = secoes(md).filter((s) => /^\d+\./.test(s.titulo));
  if (!fichas.length) {
    erros.push(`${arq}: spec:time sem nenhuma seção "## N. Nome — papel"`);
    return erros;
  }
  for (const f of fichas) {
    for (const c of CAMPOS_TIME) {
      if (!campoPreenchido(f.corpo, c)) {
        erros.push(`${arq}: "${f.titulo}" sem **${c}:** preenchido`);
      }
    }
  }
  return erros;
}

function validaMapa(md, arq) {
  const erros = [];
  const titulos = secoes(md).map((s) => s.titulo.toLowerCase());
  for (const s of SECOES_MAPA) {
    if (!titulos.some((t) => t.startsWith(s.toLowerCase()))) {
      erros.push(`${arq}: spec:mapa sem a seção "## ${s}"`);
    }
  }
  return erros;
}

function validaArquivo(arq) {
  const md = readFileSync(arq, 'utf8');
  const m = md.slice(0, 400).match(MARCADOR);
  if (!m) return []; // não é spec — plano comum, fora da jurisdição desta régua
  return m[1] === 'time' ? validaTime(md, arq) : validaMapa(md, arq);
}

/* ── scaffold ─────────────────────────────────────────────────────────────── */

function proximoNumero() {
  const ns = readdirSync('plans')
    .map((f) => parseInt(f.match(/^(\d+)-/)?.[1] ?? '', 10))
    .filter((n) => Number.isFinite(n));
  return String(Math.max(...ns) + 1).padStart(2, '0');
}

const MOLDE_TIME = (slug) => `<!-- spec:time -->
# ${proximoNumero()} — ${slug}

> Preencher pela skill csbrasil: pesquisa com procedência ANTES de escrever.
> Vetos: sem pessoa real contemporânea, sem copyright, sem gore.
> Cada personagem tem UMA mecânica própria — ninguém é só skin.

## 1. Nome — papel

- **Visual:**
- **Papel:**
- **Arma:**
- **Mecânica:**
- **Nota:**

## Fora do time (banco de reservas)
`;

const MOLDE_MAPA = (slug) => `<!-- spec:mapa -->
# ${proximoNumero()} — ${slug}

> Lugar aberto sem cover deliberado vira sniper fest. O spec mostra onde o
> jogador se esconde ANTES de qualquer geometria existir.

## Local real

## Layout

## Cobertura (cover)

## Linhas de visão

## Referências

## Régua de aceite
`;

function scaffold(tipo, slug) {
  if (!['time', 'mapa'].includes(tipo)) {
    console.error(`tipo desconhecido: "${tipo}" (use time|mapa)`);
    process.exit(2);
  }
  const nome = `plans/${proximoNumero()}-${slug.toUpperCase().replace(/\s+/g, '-')}.md`;
  if (existsSync(nome)) {
    console.error(`já existe: ${nome}`);
    process.exit(2);
  }
  writeFileSync(nome, tipo === 'time' ? MOLDE_TIME(slug) : MOLDE_MAPA(slug));
  console.log(`criado: ${nome}`);
}

/* ── mutante: a régua precisa provar que morde ────────────────────────────── */

const FIXTURE_QUEBRADA = `<!-- spec:time -->
# 99 — TIME QUEBRADO

## 1. Fulano — assalto

- **Visual:** roupa qualquer
- **Papel:**
- **Arma:** fuzil
- **Mecânica:**
`;

function mutante() {
  /* A fixture tem Papel e Mecânica vazios. Se a régua aprovar, ela está cega. */
  const erros = validaTime(FIXTURE_QUEBRADA, '<mutante>');
  if (erros.length === 0) {
    console.error('MUTANTE PASSOU: spec sem Papel/Mecânica foi aprovado — a régua está cega.');
    process.exit(1);
  }
  console.log(`mutante reprovado como esperado (${erros.length} erros apontados).`);
}

/* ── main ─────────────────────────────────────────────────────────────────── */

const [, , cmd, ...args] = process.argv;

if (cmd === 'new') {
  scaffold(args[0], args[1] ?? 'sem-nome');
} else if (cmd === 'check') {
  if (args[0] === '--mutante') { mutante(); process.exit(0); }
  const alvos = args.flatMap((a) =>
    a.endsWith('.md') ? [a]
      : readdirSync(a).filter((f) => f.endsWith('.md')).map((f) => join(a, f)));
  const erros = alvos.flatMap(validaArquivo);
  if (erros.length) {
    console.error(erros.map((e) => `  ✗ ${e}`).join('\n'));
    console.error(`\nspec:check — ${erros.length} problema(s).`);
    process.exit(1);
  }
  console.log(`spec:check — ${alvos.length} arquivo(s) varridos, tudo preenchido.`);
} else {
  console.error('uso: node tools/spec.mjs new time|mapa <slug> | check <arq|dir>… | check --mutante');
  process.exit(2);
}
