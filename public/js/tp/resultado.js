/* Treta Pop · 06 fim de partida, 22 mobile. Carregado por tp/ligar.js só com ?ui=v3.
   Só mostra o que o cliente mede; régua em tools/eval/ui-v3-resultado.mjs. */
import { tr } from '../i18n.js';
import { compartilhar, linkCompartilhavel } from '../compartilhar.js';

const $ = (id) => document.getElementById(id);
const TIME = { E: 'Time E', B: 'Time B' };
const COMBO = { 2: 'Abate duplo', 3: 'Abate triplo', 4: 'Abate quádruplo' };
const AVISO = { compartilhado: 'Compartilhado', copiado: 'Link copiado', manual: 'Copie o link' };

const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};
const tempo = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const FORMATO = { int: (v) => String(v), pct: (v) => `${v}%`, tempo };
const FIGURA_PADRAO = { fx: 0.5, fy: 0, fh: 1, ar: 2 / 3, fa: 2 / 3 };
const figuras = new Map();

/* Caixa opaca da arte (alfa), para centrar o nome sob o corpo e escalar pela figura, não pela margem do PNG. */
function figura(url) {
  if (!figuras.has(url)) figuras.set(url, new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const w = 64, h = Math.max(1, Math.round((64 * img.naturalHeight) / img.naturalWidth));
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      let a;
      try { a = ctx.getImageData(0, 0, w, h).data; } catch { return ok(FIGURA_PADRAO); }
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (a[(y * w + x) * 4 + 3] < 40) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 < 0) return ok(FIGURA_PADRAO);
      const fw = (x1 + 1 - x0) / w, fh = (y1 + 1 - y0) / h, ar = img.naturalWidth / img.naturalHeight;
      ok({ fx: (x0 + x1 + 1) / 2 / w, fy: y0 / h, fh, ar, fa: (fw * ar) / fh });
    };
    img.onerror = () => ok(FIGURA_PADRAO);
    img.src = url;
  }));
  return figuras.get(url);
}

function dados(fim) {
  const venceu = fim.classList.contains('win');
  const g = window.__game;
  if (g && g.state === 'matchEnd' && g.player && !g.arena) {
    const eu = g.playerTeam === 'B' ? 'B' : 'E', eles = eu === 'E' ? 'B' : 'E';
    const abates = g.player.kills | 0;
    return {
      nomes: g.world?.mode === 'horde' ? { E: g._teamName('E'), B: g._teamName('B'), J: g._teamName('J') } : null,
      empate: g.objective?.state?.winner === 'draw',
      territorio: g.objective ? (g.objective.regras.times === 3 ? ['E','B','J'] : ['E','J']).map(team=>[g._teamName(team),Math.round((g.objective.state.territorio?.[team] || 0)*100)]) : null,
      venceu, vencedor: g.objective?.state?.winner || (venceu ? eu : eles), placar: [g.roundsWon[eu] | 0, g.roundsWon[eles] | 0],
      abates, mortes: g.player.deaths | 0, hs: abates ? Math.round((100 * (g.player.headshots | 0)) / abates) : 0,
      segundos: Math.round(g.time || 0), combo: g.mk?.best | 0,
      personagem: g.playerDef?.name || '', online: !!g.online,
    };
  }
  /* Rota de inspeção (?tela=): sem partida, só os números que a tela de hoje já escreve. */
  const b = [...fim.querySelectorAll('#match-stats b')].map((x) => x.textContent);
  const placar = (b[0] || '').split('×').map((n) => parseInt(n, 10));
  if (placar.length !== 2 || placar.some(Number.isNaN)) return null;
  return {
    venceu, vencedor: null, placar, abates: parseInt(b[1], 10) || 0, mortes: parseInt(b[2], 10) || 0,
    hs: null, segundos: null, combo: 0, personagem: '', online: false,
  };
}

function montar() {
  const raiz = el('section', 'tp-res');
  raiz.hidden = true;
  raiz.setAttribute('aria-labelledby', 'tp-res-titulo');
  raiz.innerHTML = `
    <div class="tp-res__heroi" aria-hidden="true"></div>
    <div class="tp-res__assina" hidden>
      <span class="tp-res__nome tp-disp"><span class="tp-ital"></span></span>
      <span class="tp-res__linha tp-num"></span>
    </div>
    <div class="tp-res__col">
      <div class="tp-res__topo">
        <h2 class="tp-res__titulo tp-disp" id="tp-res-titulo"><span class="tp-ital"></span></h2>
        <span class="tp-res__placar tp-disp"><span class="tp-ital"><b class="tp-res__n" data-fmt="int"></b><i> × </i><b class="tp-res__n" data-fmt="int"></b></span></span>
      </div>
      <p class="tp-res__frase"></p>
      <div class="tp-res__stats"></div>
      <div class="tp-res__medalhas"></div>
      <div class="tp-res__fase2" hidden></div>
      <div class="tp-res__acoes">
      <button type="button" class="tp-btn tp-btn--primario tp-res__jogar"><span class="tp-ital"></span><kbd>ENTER</kbd></button>
      <p class="tp-res__proximo" hidden></p>
      <button type="button" class="tp-btn tp-res__outro"></button>
      <button type="button" class="tp-btn tp-btn--fantasma tp-res__lobby"></button>
      <button type="button" class="tp-btn tp-res__partilha"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12M7 8l5-5 5 5"/></svg><span class="tp-res__longo"></span><span class="tp-res__curto"></span></button>
      </div>
    </div>`;
  /* Fase 2 (XP, quests e T$): o espaço existe, mas só aparece quando o backend mandar o número. */
  const f2 = raiz.querySelector('.tp-res__fase2');
  for (const [k, rotulo] of [['xp', 'Experiência'], ['quests', 'Quests'], ['moedas', 'TRETA$ ganhos']]) {
    const s = el('section', 'tp-painel tp-res__f2');
    s.dataset.fase2 = k;
    s.append(el('span', 'tp-rotulo', tr(rotulo)));
    f2.append(s);
  }
  return raiz;
}

export function ligar() {
  const fim = $('match-end');
  if (!fim || fim.querySelector('.tp-res')) return;
  const raiz = montar();
  fim.append(raiz);
  const q = (s) => raiz.querySelector(s);
  const jogar = q('.tp-res__jogar');
  let quadro = 0;

  const encerrar = () => {
    cancelAnimationFrame(quadro); quadro = 0;
    for (const n of raiz.querySelectorAll('[data-alvo]')) n.textContent = FORMATO[n.dataset.fmt](+n.dataset.alvo);
    delete raiz.dataset.anim;
    raiz.dataset.fim = '';
  };
  /* título no primeiro quadro; os números contam a partir de 80 ms, na duração de cena */
  const animar = () => {
    const css = getComputedStyle(document.documentElement);
    const mov = parseFloat(css.getPropertyValue('--tp-mov'));
    const dur = parseFloat(css.getPropertyValue('--tp-d-cena')) || 480;
    delete raiz.dataset.fim;
    if (!(mov > 0)) return encerrar();
    raiz.dataset.anim = '';
    const nums = [...raiz.querySelectorAll('[data-alvo]')];
    for (const n of nums) n.textContent = FORMATO[n.dataset.fmt](0);
    const t0 = performance.now() + 80;
    const passo = (t) => {
      const p = Math.min(1, Math.max(0, (t - t0) / dur));
      const k = 1 - (1 - p) ** 3;
      for (const n of nums) n.textContent = FORMATO[n.dataset.fmt](Math.round(+n.dataset.alvo * k));
      if (p < 1) quadro = requestAnimationFrame(passo); else encerrar();
    };
    quadro = requestAnimationFrame(passo);
  };

  const pintar = () => {
    const d = dados(fim);
    if (!d) { delete fim.dataset.tpRes; raiz.hidden = true; return; }
    const vit = d.venceu;
    raiz.dataset.resultado = d.empate ? 'empate' : vit ? 'vitoria' : 'derrota';
    q('.tp-res__titulo .tp-ital').textContent = tr(d.empate ? 'EMPATE' : vit ? 'VITÓRIA' : 'DERROTA');
    const placar = q('.tp-res__placar');
    placar.replaceChildren();
    const linha = el('span','tp-ital');
    placar.append(linha);
    if (d.territorio) {
      placar.style.fontSize = 'clamp(14px, 2.4vw, 28px)';
      for (const [nome, pct] of d.territorio) {
        const item = el('span', '', `${nome} `), n = el('b','tp-res__n',`${pct}%`);
        item.append(n); linha.append(item, document.createTextNode(' · '));
      }
      linha.lastChild?.remove();
      placar.setAttribute('aria-label', d.territorio.map(([nome,pct])=>`${nome}: ${pct}% do mapa`).join(', '));
    } else {
      placar.style.fontSize = '';
      for (let i=0;i<2;i++) { if(i) linha.append(el('i','',' × ')); const n=el('b','tp-res__n'); n.dataset.fmt='int'; n.dataset.alvo=d.placar[i]; linha.append(n); }
      placar.setAttribute('aria-label', tr('Rodadas {a} a {b}').replace('{a}', d.placar[0]).replace('{b}', d.placar[1]));
    }
    const frase = q('.tp-res__frase');
    frase.hidden = !d.vencedor;
    if (d.vencedor) {
      const modelo = vit ? 'A {time} levou a treta. O pastel da vitória está pago.' : 'A {time} levou a melhor. Já pediram CPI da partida.';
      frase.textContent = d.empate ? 'As equipes terminaram empatadas.' : d.nomes ? `${d.nomes[d.vencedor]} venceram a partida.` : tr(modelo).replace('{time}', tr(TIME[d.vencedor]));
    }

    const stats = q('.tp-res__stats');
    stats.replaceChildren();
    for (const [rotulo, valor, fmt, curto] of [['Abates', d.abates, 'int'], ['Mortes', d.mortes, 'int'], ['Headshot', d.hs, 'pct', 'HS'], ['Duração', d.segundos, 'tempo']]) {
      if (valor == null) continue;
      const s = el('div', 'tp-res__stat');
      const n = el('span', 'tp-num tp-res__n', FORMATO[fmt](valor));
      n.dataset.alvo = valor; n.dataset.fmt = fmt;
      const r = el('span', 'tp-rotulo');
      if (curto) r.append(el('span', 'tp-res__longo', tr(rotulo)), el('span', 'tp-res__curto', curto));
      else r.textContent = tr(rotulo);
      s.append(r, n);
      stats.append(s);
    }

    const medalhas = q('.tp-res__medalhas');
    medalhas.replaceChildren();
    const medalha = (selo, texto, tipo) => {
      const m = el('span', 'tp-res__medalha');
      m.dataset.medalha = tipo;
      m.append(el('span', 'tp-res__selo tp-disp', selo), tr(texto));
      medalhas.append(m);
    };
    if (d.combo >= 2) medalha(`${d.combo}×`, COMBO[d.combo] || 'Abate múltiplo', 'combo');
    medalhas.hidden = !medalhas.childElementCount;

    const heroi = q('.tp-res__heroi');
    const arte = $('me-hero')?.style.getPropertyValue('--me-art') || 'none';
    heroi.style.setProperty('--me-art', arte);
    const url = (arte.match(/url\(["']?([^"')]+)/) || [])[1];
    const pos = (f) => { for (const k in f) heroi.style.setProperty(`--${k}`, f[k]); };
    pos(FIGURA_PADRAO);
    if (url) figura(url).then((f) => { if (heroi.style.getPropertyValue('--me-art') === arte) pos(f); });
    q('.tp-res__assina').hidden = !d.personagem;
    q('.tp-res__nome .tp-ital').textContent = d.personagem;
    q('.tp-res__linha').textContent = `${d.abates} / ${d.mortes}${d.hs == null ? '' : ` · ${d.hs}% HS`}`;

    /* online o servidor gira o mapa: sem revanche nem troca de mapa, com o aviso de carga */
    const semRevanche = !!$('btn-again')?.classList.contains('hidden');
    jogar.hidden = !!semRevanche;
    q('.tp-res__outro').hidden = d.online || semRevanche;
    q('.tp-res__proximo').hidden = !!$('match-next')?.classList.contains('hidden');
    q('.tp-res__proximo').textContent = $('match-next')?.textContent || '';

    fim.dataset.tpRes = '';
    raiz.hidden = false;
    animar();
    const alvo = jogar.hidden ? q('.tp-res__lobby') : jogar;
    alvo.dataset.autoFoco = '';
    alvo.focus({ preventScroll: true });
  };

  q('.tp-res__jogar .tp-ital').textContent = tr('Jogar de novo');
  q('.tp-res__outro').textContent = tr('Outro mapa');
  q('.tp-res__lobby').textContent = tr('Lobby');
  const rotulos = (longo, curto) => { q('.tp-res__partilha .tp-res__longo').textContent = longo; q('.tp-res__partilha .tp-res__curto').textContent = curto; };
  rotulos(tr('Compartilhar card'), tr('Compartilhar'));
  for (const b of raiz.querySelectorAll('button')) b.addEventListener('blur', () => delete b.dataset.autoFoco);

  jogar.addEventListener('click', () => $('btn-again')?.click());
  q('.tp-res__lobby').addEventListener('click', () => $('btn-menu')?.click());
  q('.tp-res__outro').addEventListener('click', () => {
    // sai pro menu e abre a escolha de mapa (tp/modos vive no hub-map-modal)
    $('btn-menu')?.click();
    setTimeout(() => { $('hub-map-change')?.click(); }, 150);
  });
  const partilha = q('.tp-res__partilha');
  partilha.addEventListener('click', async () => {
    const mapa = window.__game?._mapId || new URLSearchParams(location.search).get('map') || '';
    const texto = tr(fim.classList.contains('draw') ? 'Empate no CORO SOLTO. Bora jogar?' : fim.classList.contains('win') ? 'Ganhei uma treta no CORO SOLTO. Bora jogar?' : 'Perdi uma treta no CORO SOLTO. Bora jogar?');
    const url = linkCompartilhavel(mapa ? `/?map=${encodeURIComponent(mapa)}` : '/', 'fim-de-partida');
    const aviso = AVISO[await compartilhar({ titulo: 'CORO SOLTO', texto, url })];
    if (!aviso) return;
    rotulos(tr(aviso), tr(aviso));
    setTimeout(() => rotulos(tr('Compartilhar card'), tr('Compartilhar')), 1600);
  });

  new MutationObserver(() => {
    if (!fim.classList.contains('hidden') && (fim.classList.contains('win') || fim.classList.contains('lose') || fim.classList.contains('draw'))) pintar();
    else { delete fim.dataset.tpRes; raiz.hidden = true; encerrar(); }
  }).observe(fim, { attributes: true, attributeFilter: ['class'] });
  const proximo = $('match-next');
  if (proximo) new MutationObserver(() => {
    q('.tp-res__proximo').textContent = proximo.textContent;
    q('.tp-res__proximo').hidden = proximo.classList.contains('hidden');
  }).observe(proximo, { attributes: true, childList: true, characterData: true, subtree: true });

  /* qualquer tecla durante a contagem só pula para o fim; o ENTER seguinte é que joga */
  addEventListener('keydown', (e) => {
    if (raiz.hidden || fim.classList.contains('hidden')) return;
    if ('anim' in raiz.dataset) { e.preventDefault(); e.stopImmediatePropagation(); encerrar(); return; }
    if (e.key === 'Enter' && !raiz.contains(document.activeElement) && !jogar.hidden) { e.preventDefault(); jogar.click(); }
  }, true);
}
