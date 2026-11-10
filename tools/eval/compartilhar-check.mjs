#!/usr/bin/env node
/* compartilhar-check.mjs: os pontos de compartilhar do jogo (ADR 0008) mandam a URL certa.
   Pedido do dono (14/10/2026): "vários pontos no jogo para compartilhar", com Web Share no celular.

     CP1 · compartilhar(): Web Share quando existe; cancelar não vira cópia; sem Web Share ou com
           erro copia o link; sem área de transferência devolve 'manual' (o botão mostra o link)
     CP2 · link: origem `https://corosol.to` em produção e same-origin em dev; utm_source=compartilhar e o ponto
     CP3 · cada ponto (fim de partida, sala, ranking, skin, perfil, clã) existe e está ligado com
           o caminho certo

   uso: node tools/eval/compartilhar-check.mjs [--mutante=cancelar|origem|ponto] */
import { readFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const mutar = (texto, de, para) => {
  const novo = texto.replace(de, para);
  if (novo === texto) { console.error(`MUTANTE ${MUT} NÃO APLICOU`); process.exit(2); }
  return novo;
};
let fonte = readFileSync('public/js/compartilhar.js', 'utf8');
if (MUT === 'cancelar') fonte = mutar(fonte, "if (erro?.name === 'AbortError') return 'cancelado';", '');
if (MUT === 'origem') fonte = mutar(fonte, "if (host.endsWith('corosolto.com.br')) return globalThis.window?.__SHARE_ORIGIN || 'https://corosol.to';", "if (host.endsWith('nunca-corosolto.com.br')) return globalThis.window?.__SHARE_ORIGIN || 'https://corosol.to';");
if (MUT === 'ponto') fonte = mutar(fonte, "url.searchParams.set('utm_medium', ponto);", "url.searchParams.set('utm_medium', 'mutante');");
const C = await import(`data:text/javascript;base64,${Buffer.from(fonte).toString('base64')}`);

const falhas = [];
const item = (id, erros, msg) => { if (erros.length) falhas.push(`${id} ${msg}: ${erros.slice(0, 4).join('; ')}`); else console.log(`✓ ${id}`); };

// CP1
{
  const erros = [];
  const dados = { titulo: 'T', texto: 'X', url: 'https://www.corosolto.com.br/loja' };
  const nav = (o = {}) => {
    const log = [];
    return { log, n: {
      ...(o.share !== false ? { share: async (d) => { log.push(['share', d]); if (o.erro) throw Object.assign(new Error('x'), { name: o.erro }); } } : {}),
      ...(o.canShare !== undefined ? { canShare: () => o.canShare } : {}),
      clipboard: { writeText: async (t) => { log.push(['copy', t]); if (o.semClip) throw new Error('negado'); } },
    } };
  };
  const casos = [
    [{}, 'compartilhado', ['share']],
    [{ erro: 'AbortError' }, 'cancelado', ['share']],
    [{ erro: 'NotAllowedError' }, 'copiado', ['share', 'copy']],
    [{ canShare: false }, 'copiado', ['copy']],
    [{ share: false }, 'copiado', ['copy']],
    [{ share: false, semClip: true }, 'manual', ['copy']],
  ];
  for (const [o, esperado, passos] of casos) {
    const { log, n } = nav(o);
    const r = await C.compartilhar(dados, n);
    if (r !== esperado || log.map((l) => l[0]).join() !== passos.join()) erros.push(`${JSON.stringify(o)} → ${r} [${log.map((l) => l[0])}], esperado ${esperado} [${passos}]`);
    const share = log.find((l) => l[0] === 'share')?.[1];
    if (share && (share.url !== dados.url || share.title !== 'T' || share.text !== 'X')) erros.push(`Web Share recebeu ${JSON.stringify(share)}`);
  }
  item('CP1', erros, 'compartilhar() fora do contrato');
}

// CP2
{
  const erros = [];
  const prod = { hostname: 'www.corosolto.com.br', origin: 'https://www.corosolto.com.br' };
  const origem = C.origemCompartilhamento(prod);
  if (origem !== 'https://corosol.to') erros.push(`origem ${origem}: produção deve compartilhar pelo domínio curto`);
  if (C.origemCompartilhamento({ hostname: 'localhost', origin: 'http://localhost:9434' }) !== 'http://localhost:9434') erros.push('dev não caiu na origem local');
  const link = new URL(C.linkCompartilhavel('/?map=lajes', 'fim-de-partida', 'https://corosol.to'));
  if (link.origin !== 'https://corosol.to' || link.pathname !== '/' || link.searchParams.get('map') !== 'lajes') erros.push(`link ${link.href}`);
  if (link.searchParams.get('utm_source') !== 'compartilhar' || link.searchParams.get('utm_medium') !== 'fim-de-partida') erros.push(`utm ${link.search}`);
  if (!/^Ganhei .*Lajes/.test(C.textoDaPartida({ venceu: true, mapa: 'Lajes' })) || !/^Perdi /.test(C.textoDaPartida({ venceu: false, mapa: 'Lajes' }))) erros.push('texto da partida');
  item('CP2', erros, 'link compartilhado fora do contrato');
}

// CP3
{
  const erros = [];
  let hub = readFileSync('src/pages/index.astro', 'utf8');
  if (MUT === 'ponto') hub = mutar(hub, '<button id="btn-share-match"', '<button id="btn-share-match-sumiu"');
  const main = readFileSync('public/js/main.js', 'utf8');
  const loja = readFileSync('public/js/treta-store.js', 'utf8') + readFileSync('src/components/TretaDialogs.astro', 'utf8');
  const comunidade = readFileSync('public/js/community.js', 'utf8');
  const clas = readFileSync('public/js/clans.js', 'utf8');
  const pontos = [
    ['fim de partida', hub, /<button id="btn-share-match"/, main, /ligarCompartilhar\(\$\('btn-share-match'\)[^\n]*linkCompartilhavel\(/],
    ['sala', hub, /<button id="mp-modal-compartilhar"/, main, /ligarCompartilhar\(mpEl\('mp-modal-compartilhar'\)[^\n]*linkDeConvite\(sala\.convite\)/],
    ['ranking', hub, /<button id="hub-rank-share"/, main, /ligarCompartilhar\(\$\('hub-rank-share'\)[^\n]*linkCompartilhavel\('\/comunidade\/ranking', 'ranking'\)/],
    ['skin', loja, /<button id="treta-share"/, loja, /ligarCompartilhar\(\$\('treta-share'\)[^\n]*linkCompartilhavel\('\/loja','skin'\)/],
    ['perfil', comunidade, /button\('COMPARTILHAR PERFIL'/, comunidade, /import\('\.\/compartilhar\.js'\)[^\n]*linkCompartilhavel\(p\.url,'perfil'\)/],
    ['clã', clas, /element\('button', 'COMPARTILHAR CLÃ'/, clas, /linkCompartilhavel\(`\/clans\/\$\{encodeURIComponent\(clan\.id\)\}`, 'cla'\)/],
  ];
  for (const [nome, marcacao, botao, codigo, ligacao] of pontos) {
    if (!botao.test(marcacao)) erros.push(`${nome}: botão ausente`);
    if (!ligacao.test(codigo)) erros.push(`${nome}: botão não ligado ao link certo`);
  }
  if (/^import[^\n]*compartilhar/m.test(comunidade)) erros.push('community.js importa compartilhar no topo: a régua do backend roda o arquivo num vm sem módulos');
  item('CP3', erros, `pontos de compartilhar (${pontos.length}) fora do contrato`);
}

if (falhas.length) { for (const f of falhas) console.error(`✗ ${f}`); process.exit(1); }
console.log('compartilhar-check: 6 pontos ligados, Web Share e cópia conferidos');
