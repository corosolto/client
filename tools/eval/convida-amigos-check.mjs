#!/usr/bin/env node
/* ============================================================================
   convida-amigos-check.mjs — O MODAL DE CONVITE TEM AS REDES PEDIDAS E COPIA?
   ----------------------------------------------------------------------------
   O CASO (lane glm/amigos, 14/10/2026): o dono pediu convidar amigos por
   Instagram, e-mail, LinkedIn, X e TikTok. Rede nenhuma libera lista de amigos
   de terceiro para a web; o fluxo honesto é mensagem copiada + caixa de entrada
   aberta (e WhatsApp, que aceita o texto na URL). Esta régua trava o contrato:
   as plataformas exigidas existem, os links são os de MENSAGEM (não a home),
   quem não recebe texto na URL COPIA antes de abrir, e o Web Share entra como
   "MAIS APPS" quando existe.

   MUTAÇÃO: `--mutante=sem-whatsapp` apaga o WhatsApp das PLATAFORMAS e EXIGE
   vermelho (a rede que prefila a mensagem não pode sumir calada).

   Uso: node tools/eval/convida-amigos-check.mjs [--mutante=sem-whatsapp]
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = join(import.meta.dirname, '../..');
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1];
if (mutante && mutante !== 'sem-whatsapp') throw new Error(`mutante desconhecido: ${mutante}`);

// stubs de DOM/navegador suficientes para montaConvite
const botoesDe = (dialog) => [...dialog.querySelectorAll('button')];
function docFalso() {
  const clicados = [];
  const dialog = {
    className: '', innerHTML: '',
    children: [], appended: [],
    append(...ns) { this.children.push(...ns); },
    querySelectorAll: () => {
      const achados = [];
      const desce = (nos) => { for (const n of nos) { if (n._botao) achados.push(n); if (n.children?.length) desce(n.children); } };
      desce(dialog.children);
      return achados;
    },
    close() { this.fechado = true; },
    addEventListener() {},
  };
  const doc = {
    _aviso: null,
    createElement(tag) {
      if (tag === 'dialog') return dialog;
      const no = { tag, children: [], _botao: false, dataset: {}, attrs: {} };
      no.append = (...ns) => no.children.push(...ns);
      no.setAttribute = (k, v) => { no.attrs[k] = v; };
      no.addEventListener = () => {};
      if (tag === 'button') {
        no._botao = true;
        no.onclick = null;
        no.click = () => clicados.push(no);
      }
      return no;
    },
  };
  return { doc, dialog, clicados };
}

let modulo;
if (mutante === 'sem-whatsapp') {
  const tmp = join(ROOT, 'public/js/convida-amigos.mutante.mjs');
  const src = readFileSync(join(ROOT, 'public/js/convida-amigos.js'), 'utf8')
    .replace("{ id: 'whatsapp', nome: 'WhatsApp', url: (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`, copia: false },", '');
  const { writeFileSync, rmSync } = await import('node:fs');
  writeFileSync(tmp, src);
  try { modulo = await import(pathToFileURL(tmp).href); } finally { rmSync(tmp, { force: true }); }
} else {
  modulo = await import(pathToFileURL(join(ROOT, 'public/js/convida-amigos.js')).href);
}

const falhas = [];
const EXIGIDAS = ['whatsapp', 'instagram', 'x', 'linkedin', 'tiktok', 'email'];
const ids = modulo.PLATAFORMAS.map((p) => p.id);
for (const id of EXIGIDAS) if (!ids.includes(id)) falhas.push(`plataforma exigida ausente: ${id}`);

const { doc, dialog } = docFalso();
const aberturas = [];
const clipboard = { escrito: null, writeText(t) { this.escrito = t; return Promise.resolve(); } };
const convite = modulo.textoConvite('testador');
const montado = modulo.montaConvite({ nick: 'testador', doc, nav: { clipboard, share: undefined }, abre: (u) => aberturas.push(u) });

if (montado !== dialog) falhas.push('montaConvite não devolveu o dialog criado no doc passado');

const porId = Object.fromEntries(modulo.PLATAFORMAS.map((p) => [p.id, p]));
if (porId.whatsapp && !porId.whatsapp.url(convite).startsWith('https://wa.me/?text=')) falhas.push('WhatsApp não manda o texto na URL (wa.me ?text=)');
if (porId.email && !/^mailto:\?subject=Bora%20jogar%20CORO%20SOLTO&body=/.test(porId.email.url(convite))) falhas.push('e-mail sem mailto com assunto e corpo preenchidos');
for (const id of ['instagram', 'x', 'linkedin', 'tiktok']) {
  const p = porId[id];
  if (p && p.copia !== true) falhas.push(`${id} precisa copiar a mensagem (a URL dele não recebe texto)`);
  if (p && !/messages|direct\/inbox|messaging|\/inbox/.test(p.url(convite))) falhas.push(`${id} não abre a caixa de mensagens (${p.url(convite)})`);
}

// clique de verdade: copiar + abrir
if (porId.instagram) {
  const botao = botoesDe(montado).find((b) => b.dataset.plataforma === 'instagram');
  await botao.onclick();
  if (clipboard.escrito !== convite) falhas.push('clique no Instagram não copiou o convite');
  if (!aberturas.some((u) => String(u).includes('instagram.com/direct/inbox'))) falhas.push('clique no Instagram não abriu a caixa de entrada');
}

// texto do convite com link rastreável e nick opcional
if (!convite.includes('utm_medium=convidar-amigos')) falhas.push('convite sem link com utm_medium=convidar-amigos');
if (modulo.textoConvite('').includes('Sou ')) falhas.push('convite sem nick não pode se apresentar como alguém');

// nativo só quando existe share
const comShare = docFalso();
modulo.montaConvite({ doc: comShare.doc, nav: { clipboard, share: async () => {} }, abre: () => {} });
const nativo = botoesDe(comShare.dialog).some((b) => b.dataset.plataforma === 'nativo');
if (!nativo) falhas.push('com navigator.share disponível, falta o botão MAIS APPS');
const semShare = docFalso();
modulo.montaConvite({ doc: semShare.doc, nav: { clipboard }, abre: () => {} });
if (botoesDe(semShare.dialog).some((b) => b.dataset.plataforma === 'nativo')) falhas.push('sem navigator.share, o botão MAIS APPS não devia existir');

if (mutante === 'sem-whatsapp') {
  const morde = falhas.some((f) => f.includes('whatsapp'));
  console.log(morde ? 'mutante sem-whatsapp reprovado como devia: a régua sentiu a falta do WhatsApp.' : 'MUTAÇÃO PASSOU — o WhatsApp sumiu e a régua não viu.');
  process.exit(morde ? 0 : 1);
}
if (falhas.length) {
  console.error('convite de amigos reprovado:');
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('convite confere: 6 plataformas, links de mensagem, cópia antes de abrir, mailto/wa prefilled, MAIS APPS quando há share.');
