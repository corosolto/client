// Painel de mapa: paleta de itens (props GLB/geometria/armas/spawn/CTF), edição do
// item selecionado (posição/rotação/tamanho/cor/colisão) e export do map_<nome>.js.
// Estado sempre no MapProject; o painel só monta controles sobre o item selecionado.
import { group, ctl, btn, row, pre, select, label } from '../ui.js';
import { MAP_PROPS } from '../presets.js';
import { newItem } from '../mapproject.js';

const PALETTE = [
  { item: () => newItem('box', { w: 2.4, h: 2.4, d: 2.4, color: 0x8a8f98 }), text: 'Caixa' },
  { item: () => newItem('cyl', { r: 1, h: 2.4, color: 0x3a4658 }), text: 'Cilindro' },
  { item: () => newItem('plane', { w: 8, h: 3, color: 0x2c3846 }), text: 'Placa' },
  { item: () => newItem('prop', { ref: MAP_PROPS[0], h: 2.4 }), text: 'Prop GLB' },
  { item: () => newItem('spawn', { team: 'E', ry: 0 }), text: 'Spawn E' },
  { item: () => newItem('spawn', { team: 'B', ry: Math.PI }), text: 'Spawn B' },
  { item: () => newItem('ctf', { label: 'BANDEIRA' }), text: 'Bandeira CTF' },
  { item: () => newItem('pickup', { weapon: 'ak', ry: 0 }), text: 'Arma no chão' },
];

const PROPS = MAP_PROPS.map((p) => `prop:${p}`);
const ARMAS = ['ak', 'm4', 'awp', 'mp5', 'shotgun', 'deagle', 'pistol', 'knife'];

export function mountMapPanel(side, project, stage) {
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.style.cssText = 'position:static;transform:none;font-size:11px;color:#7fd';
  hint.textContent = 'clique num item da paleta, depois no chão (arrasta = girar · scroll = zoom)';
  side.append(hint);

  // ── paleta ──────────────────────────────────────────────────────────────────
  const gPal = group('Paleta');
  const palBtns = new Map();
  for (const { item, text } of PALETTE) {
    const b = btn(text);
    b.addEventListener('click', () => {
      palBtns.forEach((x) => x.classList.toggle('on', x === b));
      stage.setPending(item());
      hint.textContent = `colocando: ${text} — clique no palco`;
    });
    palBtns.set(text, b);
    gPal.appendChild(b);
  }
  const cancelar = btn('✕ cancelar');
  cancelar.addEventListener('click', () => {
    stage.setPending(null);
    palBtns.forEach((x) => x.classList.remove('on'));
    hint.textContent = 'clique num item da paleta, depois no chão';
  });
  gPal.appendChild(cancelar);
  side.append(gPal);

  // ── ferramentas extras da paleta: escolher prop / arma antes de soltar ─────
  const toolWrap = document.createElement('div');
  toolWrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center';
  const selProp = select(PROPS, { selected: `prop:${MAP_PROPS[0]}` });
  selProp.addEventListener('change', () => { if (stage.pending && stage.pending.kind === 'prop') stage.pending.ref = selProp.value.slice(5); });
  const selArma = select(ARMAS, { selected: 'ak' });
  selArma.addEventListener('change', () => { if (stage.pending && stage.pending.kind === 'pickup') stage.pending.weapon = selArma.value; });
  toolWrap.append(label('Prop:', selProp), label('Arma:', selArma));
  const gSel = group('Soltar item');
  gSel.appendChild(toolWrap);
  side.append(gSel);

  // ── propriedades do item selecionado ───────────────────────────────────────
  const gEdit = group('Propriedades');

  function refreshEdit() {
    [...gEdit.children].slice(1).forEach((n) => n.remove());
    const it = stage.selected;
    if (!it) {
      const note = document.createElement('div');
      note.className = 'cap';
      note.style.textTransform = 'none';
      note.style.letterSpacing = '0.3px';
      note.textContent = '(clique num item do palco pra editar)';
      gEdit.appendChild(note);
      return;
    }

    const cX = ctl('X', { min: -40, max: 40, value: it.x ?? 0 });
    const cZ = ctl('Z', { min: -40, max: 40, value: it.z ?? 0 });
    const cRy = ctl('girar', { min: -180, max: 180, value: Math.round(((it.ry ?? 0) * 180) / Math.PI) });
    const bind = (c, key, map = (v) => v) => c.bind((v) => { it[key] = map(v); stage.renderAll(); });
    bind(cX, 'x'); bind(cZ, 'z'); bind(cRy, 'ry', (deg) => (deg * Math.PI) / 180);
    gEdit.append(cX.el, cZ.el, cRy.el);

    if (it.kind === 'prop') {
      const sel = select(PROPS, { selected: `prop:${it.ref}` });
      sel.addEventListener('change', () => { it.ref = sel.value.slice(5); stage.renderAll(); });
      gEdit.appendChild(label('Prop', sel));
      const cH = ctl('altura', { min: 0.5, max: 8, step: 0.1, value: it.h ?? 2.4 });
      bind(cH, 'h');
      gEdit.appendChild(cH.el);
    } else if (it.kind === 'box') {
      gEdit.append(
        label('largura', ctl('', { min: 0.4, max: 16, step: 0.1, value: it.w ?? 2 }).bind((v) => { it.w = v; stage.renderAll(); }).el),
        label('altura', ctl('', { min: 0.4, max: 16, step: 0.1, value: it.h ?? 2 }).bind((v) => { it.h = v; stage.renderAll(); }).el),
        label('profundidade', ctl('', { min: 0.4, max: 16, step: 0.1, value: it.d ?? 2 }).bind((v) => { it.d = v; stage.renderAll(); }).el),
      );
    } else if (it.kind === 'cyl') {
      gEdit.append(
        label('raio', ctl('', { min: 0.3, max: 8, step: 0.1, value: it.r ?? 1 }).bind((v) => { it.r = v; stage.renderAll(); }).el),
        label('altura', ctl('', { min: 0.4, max: 16, step: 0.1, value: it.h ?? 2 }).bind((v) => { it.h = v; stage.renderAll(); }).el),
      );
    } else if (it.kind === 'plane') {
      gEdit.append(
        label('largura', ctl('', { min: 1, max: 40, step: 0.1, value: it.w ?? 4 }).bind((v) => { it.w = v; stage.renderAll(); }).el),
        label('altura', ctl('', { min: 0.4, max: 16, step: 0.1, value: it.h ?? 2 }).bind((v) => { it.h = v; stage.renderAll(); }).el),
      );
    } else if (it.kind === 'pickup') {
      const selW = select(ARMAS, { selected: it.weapon });
      selW.addEventListener('change', () => { it.weapon = selW.value; stage.renderAll(); });
      gEdit.appendChild(label('Arma', selW));
    }

    const bRmv = btn('🗑 remover');
    bRmv.addEventListener('click', () => { stage.removeItem(it); refreshEdit(); });
    gEdit.appendChild(row(bRmv));
  }

  stage.onSelect = () => refreshEdit();
  stage.onPlaced = () => {
    palBtns.forEach((x) => x.classList.remove('on'));
    hint.textContent = 'clique num item da paleta, depois no chão';
  };

  // ── export ──────────────────────────────────────────────────────────────────
  const gConf = group('Export');
  const nm = document.createElement('input');
  nm.type = 'text';
  nm.className = 'num';
  nm.value = project.name;
  nm.style.width = '100%';
  nm.style.boxSizing = 'border-box';
  nm.setAttribute('placeholder', 'nome do mapa (ex: bairro_novo)');
  nm.addEventListener('input', () => { project.name = nm.value.replace(/[^A-Za-z0-9_-]/g, '') || 'meu_mapa'; });
  gConf.appendChild(nm);
  const dl = btn('⬇ baixar map_<nome>.js', { primary: true });
  dl.addEventListener('click', () => download());
  gConf.appendChild(dl);
  const vals = pre('mapvals');
  gConf.appendChild(vals);
  side.append(gConf);

  function download() {
    const code = project.exportCode();
    vals.textContent = code;
    const a = document.createElement('a');
    a.download = `map_${project.name}.js`;
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    a.click();
    URL.revokeObjectURL(a.href);
  }

  refreshEdit();
  return { project, stage };
}