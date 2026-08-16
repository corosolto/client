// Cards de og:image de /mapas, /armas e /personagens.
//
// MORA NUM LIB, e não dentro da rota, por um motivo prático: a rota é SSR e
// depende de resvg-wasm, e o dev server do Astro NÃO consegue carregar esse
// módulo (a rota da badge, que é código antigo, quebra igual em dev com
// "Maximum call stack size exceeded" dentro do Vite). Com o SVG isolado aqui,
// dá pra renderizar e medir o PNG em node puro, sem Astro no caminho - que é
// como a verificação desta issue foi feita. Ver tools/eval/og-check.mjs.
//
// O VOCABULÁRIO VISUAL É O DA BADGE de propósito: fundo #0c0e11, âmbar #ffd23f,
// faixa vermelha no topo e verde embaixo. Assim perfil e páginas de conteúdo
// parecem o mesmo produto quando aparecem lado a lado num feed.
import { MAPAS, ARMAS, PERSONAGENS, FACCOES } from '../data/jogo';
import { BRAND } from './site';

export interface Card {
  /** etiqueta do canto, ex. "5 ARENAS" - inteira, na caixa âmbar dimensionada por ela */
  etiqueta: string;
  titulo: string;
  sub: string;
  /** até 5 linhas [nome, meta] */
  itens: [string, string][];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A DejaVu é proporcional, então cortar por nº de caracteres é aproximação. O
// objetivo é não estourar a caixa, não justificar texto.
const corta = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…');

export const CARDS: Record<string, () => Card> = {
  mapas: () => ({
    etiqueta: `${MAPAS.length} ARENAS`,
    titulo: 'Mapas',
    sub: `${MAPAS.filter((m) => m.ctf).length} com Capture the Flag · rounds e CTF`,
    itens: MAPAS.slice(0, 5).map((m) => [m.nome, m.modo] as [string, string]),
  }),
  armas: () => {
    const classes = [...new Set(ARMAS.map((a) => a.classe))];
    return {
      etiqueta: `${ARMAS.length} ARMAS`,
      titulo: 'Arsenal',
      sub: `${classes.length} classes · de sniper a faca`,
      itens: ARMAS.slice(0, 5).map((a) => [a.curto || a.nome, `${a.classe} · ${a.dano} dano`] as [string, string]),
    };
  },
  personagens: () => ({
    etiqueta: `${PERSONAGENS.length} PERSONAGENS`,
    titulo: 'Elenco',
    sub: `${FACCOES.length} facções · todos fictícios`,
    itens: FACCOES.slice(0, 5).map((f) =>
      [f.nome, `${PERSONAGENS.filter((p) => p.faccao === f.id).length} personagens`] as [string, string]),
  }),
};

export const TIPOS = Object.keys(CARDS);

/** 1200×630 - o tamanho que X, Facebook e LinkedIn usam pro card grande. */
export const OG_W = 1200;
export const OG_H = 630;

export function cardSvg(c: Card): string {
  const linhas = c.itens.map(([nome, meta], i) => {
    const y = 300 + i * 58;
    return `<rect x="70" y="${y - 30}" width="1060" height="46" fill="#12160e" stroke="#2a2e20"/>
    <text x="90" y="${y}" font-size="24" font-weight="bold" fill="#f2ead8" font-family="DejaVu Sans">${esc(corta(nome, 40))}</text>
    <text x="1110" y="${y}" font-size="17" fill="#8a8064" font-family="DejaVu Sans" text-anchor="end">${esc(corta(meta, 34))}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">
  <rect width="${OG_W}" height="${OG_H}" fill="#0c0e11"/>
  <circle cx="1080" cy="120" r="300" fill="#ffd23f" opacity="0.05"/>
  <rect width="${OG_W}" height="8" fill="#e03232"/><rect y="${OG_H - 8}" width="${OG_W}" height="8" fill="#1faa4d"/>
  <text x="70" y="90" font-size="26" font-weight="bold" fill="#ffd23f" font-family="DejaVu Sans" letter-spacing="6">${esc(BRAND)}</text>
  ${(() => {
    /* Etiqueta âmbar do canto, no formato das telas do jogo ("05 ARENAS").
       A caixa é dimensionada pelo texto: com largura fixa, "44 PERSONAGENS"
       vazava, e a primeira versão disto mostrava só "5" porque cortava no
       primeiro espaço. 11,5px/char é medida da DejaVu Bold em 19px - folgado o
       bastante pra não apertar e apertado o bastante pra não flutuar. */
    const t = esc(c.etiqueta);
    const w = Math.round(c.etiqueta.length * 11.5 + 30);
    const x = 1130 - w;
    return `<rect x="${x}" y="60" width="${w}" height="38" fill="#ffd23f"/>
  <text x="${x + w / 2}" y="87" font-size="19" font-weight="bold" fill="#141008" font-family="DejaVu Sans" text-anchor="middle">${t}</text>`;
  })()}
  <text x="70" y="196" font-size="76" font-weight="bold" fill="#f2ead8" font-family="DejaVu Sans">${esc(c.titulo)}</text>
  <text x="70" y="238" font-size="22" fill="#b8d94a" font-family="DejaVu Sans">${esc(corta(c.sub, 70))}</text>
  <rect x="70" y="258" width="1060" height="1.5" fill="#3a3325"/>
  ${linhas}
  <text x="70" y="600" font-size="19" fill="#8a8064" font-family="DejaVu Sans">csbrasil.online · FPS grátis de navegador</text>
</svg>`;
}
