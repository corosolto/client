import { wallpaperJavaporcos, nomeTimeJavaporcos, JAVAPORCO_RETRATO } from '../javaporcos_apresentacao.js';
/* Treta Pop · 04 VS até 5, 14 VS 6 a 8, 20 mobile. Carregado por tp/ligar.js só com ?ui=v3.
   Espelha o #load-overlay (barra, status, dica) e o elenco que o main.js sorteia (evento tp:elenco). */
import { tr, frase, LANG } from '../i18n.js';
import { urlDoBrasao } from '../brasoes_versao.js';
import { VERSION } from '../version.js';

const ATE_BANNER = 5;
const PASSO_MS = { banners: 60, grade: 30 };
const NOME_LADO = { E: 'TIME E', B: 'TIME B' };

const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

function retrato(id) {
  const img = el('img');
  img.alt = ''; img.decoding = 'async';
  /* nem todo personagem tem retrato hero: cai no busto da arte aprovada, depois no recorte do modelo */
  const fontes = ['chars-hero', 'chars/avatars', 'chars'].map((d) => `/img/${d}/${id}.webp?v=${VERSION}`);
  img.src = fontes.shift();
  img.addEventListener('error', () => { if (fontes.length) img.src = fontes.shift(); });
  return img;
}

function cartao(p, i) {
  const vaga = el('div', 'tp-carga__vaga');
  vaga.style.setProperty('--i', String(i));
  const c = el('div', 'tp-carga__ban');
  if (p.vazia) {
    c.dataset.vazia = '';
    c.append(el('span', 'tp-carga__k', tr('VAGA DE BOT ENTRANDO')));
  } else {
    if (p.voce) { c.dataset.voce = ''; vaga.dataset.voce = ''; }
    const portrait = p.javaporco ? el('img') : retrato(p.id);
    if (p.javaporco) { c.dataset.javaporco = ''; portrait.src = JAVAPORCO_RETRATO; portrait.alt = 'Javaporco'; }
    c.append(portrait, el('span', 'tp-carga__sombra'));
    const nm = el('span', 'tp-carga__nm');
    if (p.rotulo) nm.append(el('span', 'tp-carga__k', p.rotulo));
    nm.append(el('span', 'tp-carga__n', p.nome));
    c.append(nm);
    c.title = p.nome;
  }
  vaga.append(c);
  return vaga;
}

function cabecalho(lado, n, forma, times = 2) {
  const cab = el('div', 'tp-carga__cab');
  const bras = el('img');
  bras.alt = ''; bras.src = document.getElementById('load-overlay')?.dataset.mode === 'horde' && lado === 'B' && times === 2 ? JAVAPORCO_RETRATO : urlDoBrasao(lado.toLowerCase());
  if (bras.src.includes(JAVAPORCO_RETRATO)) bras.dataset.javaporco = '';
  const nome = tr(nomeTimeJavaporcos(document.getElementById('load-overlay')?.dataset.mode, lado, times) || NOME_LADO[lado]);
  const texto = forma === 'grade' ? (lado === 'E' ? `${nome} · ${n}` : `${n} · ${nome}`) : nome;
  const disp = el('span', 'tp-disp');
  disp.append(el('span', 'tp-ital', texto));
  cab.append(bras, disp);
  return cab;
}

export function ligar() {
  const box = document.getElementById('load-overlay');
  if (!box || box.querySelector('.tp-carga')) return;
  const raiz = el('div', 'tp-carga');
  raiz.dataset.forma = 'vazio';
  raiz.innerHTML = `<img class="tp-carga__arte" alt="">
<div class="tp-carga__palco">
  <div class="tp-carga__lado" data-time="E"></div>
  <div class="tp-carga__lado" data-time="B"></div>
  <div class="tp-carga__vs tp-disp"><span class="tp-ital">VS</span></div>
  <div class="tp-carga__rodape">
    <div class="tp-carga__mapa"><span class="tp-carga__modo"></span><h1 class="tp-disp"><span class="tp-ital"></span></h1><p></p></div>
    <div class="tp-carga__progresso">
      <div class="tp-carga__dica"><b class="tp-num"></b><span></span></div>
      <div class="tp-carga__linha"><span class="tp-carga__status"></span><span class="tp-num tp-carga__pct">0%</span></div>
      <div class="tp-carga__barra"><i></i></div>
    </div>
  </div>
</div>`;
  box.append(raiz);
  const q = (s) => raiz.querySelector(s);
  const palco = q('.tp-carga__palco');
  const arte = q('.tp-carga__arte');
  q('.tp-carga__dica b').textContent = tr('DICA');
  let elencoEm = -1;

  /* palco no tamanho do artboard do pacote, escalado pela altura: 3:2 sai igual à referência */
  const escala = () => {
    const w = innerWidth, h = innerHeight;
    const celular = h <= 520 || w <= 700;
    const [bw, bh] = celular ? [844, 390] : [1536, 1024];
    const s = Math.min(w / bw, h / bh);
    raiz.dataset.tela = celular ? 'celular' : 'mesa';
    palco.style.width = `${w / s}px`;
    palco.style.height = `${h / s}px`;
    palco.style.transform = `scale(${s})`;
  };
  addEventListener('resize', escala);
  escala();

  const escreve = (sel, t) => { const e = q(sel); if (e.textContent !== t) e.textContent = t; };
  const espelha = () => {
    if (box.dataset.mode === 'horde') {
      const wall = box.style.getPropertyValue('--loading-wall').match(/url\(['"]?(.*?)['"]?\)/)?.[1];
      if (wall && arte.getAttribute('src') !== wall) { arte.src = wall; arte.hidden = false; }
    }
    const pct = document.getElementById('load-pct')?.textContent || '0%';
    escreve('.tp-carga__pct', pct);
    raiz.style.setProperty('--p', String(Math.min(1, (parseInt(pct, 10) || 0) / 100)));
    escreve('.tp-carga__status', document.getElementById('load-status')?.textContent || '');
    const dica = document.getElementById('load-tip')?.textContent || '';
    escreve('.tp-carga__dica span', dica);
    q('.tp-carga__dica').hidden = !dica;
    if (raiz.dataset.forma === 'vazio') {
      escreve('h1 .tp-ital', document.getElementById('load-map')?.textContent || document.getElementById('load-kicker')?.textContent || '');
    }
  };

  const limpa = () => {
    raiz.dataset.forma = 'vazio';
    delete raiz.dataset.times;
    for (const l of raiz.querySelectorAll('.tp-carga__lado')) l.replaceChildren();
    q('.tp-carga__modo').textContent = '';
    q('.tp-carga__mapa p').textContent = '';
    const parede = getComputedStyle(box).getPropertyValue('--loading-wall').match(/url\(['"]?([^'")]+)/);
    if (parede) arte.src = parede[1];
    arte.hidden = !parede;
  };

  const monta = (d) => {
    elencoEm = performance.now();
    const meuLado = d.lado === 'B' ? 'B' : 'E';
    const outro = meuLado === 'E' ? 'B' : 'E';
    /* online o elenco do servidor não diz quem é bot: sem rótulo em vez de chutar */
    const rotuloBot = d.online ? '' : tr('BOT');
    const gente = (defs) => defs.map((c) => ({ id: c.id, nome: tr(c.name || c.id), rotulo: rotuloBot }));
    const meus = [{ id: d.eu?.id, nome: tr(d.eu?.name || ''), rotulo: tr('VOCÊ'), voce: true }, ...gente(d.aliados || [])];
    const horde = box.dataset.mode === 'horde';
    const times = horde && d.javaporcosTimes === 3 ? 3 : 2;
    raiz.dataset.times = String(times);
    const vs = q('.tp-carga__vs');
    vs.replaceChildren();
    if (horde && times === 3) {
      const img = el('img'); img.src=JAVAPORCO_RETRATO; img.alt='Javaporcos';
      vs.append(img,el('span','tp-ital','E × B × JAVAPORCOS'));
    } else vs.append(el('span','tp-ital','VS'));
    const deles = horde && times === 2 ? [{ id: 'javaporco', nome: 'Javaporcos', rotulo: 'PRAGA INVASORA', javaporco: true }] : gente(d.inimigos || []);
    /* vaga só existe quando o servidor promete um time maior que o elenco que chegou */
    const completa = (lista) => { while (d.tamanho && lista.length < d.tamanho) lista.push({ vazia: true }); return lista; };
    completa(meus); if (!horde || times === 3) completa(deles);
    const forma = Math.max(meus.length, deles.length) <= ATE_BANNER ? 'banners' : 'grade';
    raiz.dataset.forma = forma;
    raiz.dataset.meuLado = meuLado;
    raiz.style.setProperty('--tp-carga-passo', `${PASSO_MS[forma]}ms`);
    let i = 0;
    for (const [lado, lista] of [[meuLado, meus], [outro, deles]]) {
      const alvo = q(`.tp-carga__lado[data-time="${lado}"]`);
      const elenco = el('div', 'tp-carga__elenco');
      const grade = el('div', 'tp-carga__grade');
      for (const p of lista) {
        const c = cartao(p, i++);
        (forma === 'grade' && !p.voce ? grade : elenco).append(c);
      }
      if (grade.childElementCount) elenco.append(grade);
      alvo.replaceChildren(cabecalho(lado, lista.length, forma, times), elenco);
      alvo.dataset.meu = lado === meuLado ? '1' : '0';
    }
    const formato = `${meus.length} × ${deles.length}`;
    q('.tp-carga__modo').textContent = horde ? 'INVASÃO · DISPUTA TERRITORIAL' : d.rounds ? `${frase(d.ctf ? 'ctfMelhorDeN' : 'melhorDeN', d.rounds)} · ${formato}` : formato;
    q('h1 .tp-ital').textContent = d.mapa || '';
    const desc = d.desc ? tr(d.desc) : '';
    /* descrição de mapa ainda sem inglês: melhor nenhuma frase do que português no meio do EN */
    q('.tp-carga__mapa p').textContent = LANG === 'en' && desc === d.desc ? '' : desc;
    if (d.arte) { arte.src = d.arte; arte.hidden = false; }
    espelha();
  };

  let visivel = !box.classList.contains('hidden');
  const obs = new MutationObserver((lista) => {
    if (lista.every((m) => raiz.contains(m.target))) return;
    const agora = !box.classList.contains('hidden');
    if (agora && !visivel && performance.now() - elencoEm > 250) limpa();
    visivel = agora;
    espelha();
  });
  obs.observe(box, { attributes: true, attributeFilter: ['class', 'style', 'data-mode'], childList: true, characterData: true, subtree: true });
  addEventListener('tp:elenco', (e) => { try { monta(e.detail || {}); } catch (err) { console.error('[treta-pop] carregamento', err); } });
  limpa();
  if (visivel && window.__tpElenco) monta(window.__tpElenco);
  espelha();
}
