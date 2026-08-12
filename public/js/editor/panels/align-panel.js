// Painel de alinhamento: modo (personagem/arma), seleção de arma/personagem,
// giro em 90° por eixo (X/Y/Z), screenshot e display de config da arma.
import { group, btn, row } from '../ui.js';
import { WEAPONS } from '../presets.js';
import { CHARACTERS } from '../../characters.js';

const ARMAS = WEAPONS.map((w) => w.id);
const CHARS = CHARACTERS.map((c) => c.id);

function mkSelect(opts, val) {
  const s = document.createElement('select');
  s.innerHTML = opts.map((o) => `<option value="${o}">${o}</option>`).join('');
  s.value = val;
  return s;
}

function mkLabel(txt, el) {
  const l = document.createElement('label');
  l.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px';
  const sp = document.createElement('span');
  sp.style.cssText = 'font-size:12px;color:#aeb9c4;white-space:nowrap';
  sp.textContent = txt;
  l.appendChild(sp);
  l.appendChild(el);
  return l;
}

export function mountAlignPanel(side, stage) {
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.style.cssText = 'position:static;transform:none;font-size:11px;color:#7fd';
  hint.textContent = 'arrasta = girar · scroll = zoom · o cano deve seguir a seta VERDE (+Z)';
  side.appendChild(hint);

  // ── modo ───────────────────────────────────────────────────────────────────
  const gVis = group('Visualização');
  const modeSeg = document.createElement('div');
  modeSeg.className = 'seg';
  const bChar = document.createElement('button');
  bChar.textContent = 'Personagem';
  bChar.dataset.mode = 'char';
  bChar.className = 'on';
  const bGun = document.createElement('button');
  bGun.textContent = 'Só a arma';
  bGun.dataset.mode = 'gun';
  modeSeg.append(bChar, bGun);
  gVis.appendChild(modeSeg);

  const selW = mkSelect(ARMAS, stage.weaponId);
  const selC = mkSelect(CHARS, stage.charId);
  const rowW = mkLabel('Arma', selW);
  const rowC = mkLabel('Personagem', selC);
  gVis.append(rowW, rowC);
  side.appendChild(gVis);

  // ── rotação ────────────────────────────────────────────────────────────────
  const gRot = group('Girar 90° (só a arma)');
  const bX = btn('X');
  const bY = btn('Y');
  const bZ = btn('Z');
  const bRst = btn('zerar');
  const bShot = btn('📷 baixar PNG');
  gRot.append(row(bX, bY, bZ, bRst), bShot);
  side.appendChild(gRot);

  // ── config ─────────────────────────────────────────────────────────────────
  const gCfg = group('Config da arma');
  const cfg = document.createElement('pre');
  cfg.style.cssText = 'white-space:pre;font-size:12px;color:#9fb;line-height:1.6;margin:0';
  gCfg.appendChild(cfg);
  side.appendChild(gCfg);

  function refreshCfg() { cfg.textContent = stage.getCfgText(); }
  stage.onCfgChange = refreshCfg;

  // ── eventos ────────────────────────────────────────────────────────────────
  [bChar, bGun].forEach((b) => b.addEventListener('click', async () => {
    stage.mode = b.dataset.mode;
    bChar.classList.toggle('on', stage.mode === 'char');
    bGun.classList.toggle('on', stage.mode === 'gun');
    rowC.style.display = stage.mode === 'char' ? '' : 'none';
    await stage.rebuild();
  }));

  selW.addEventListener('change', async () => { stage.weaponId = selW.value; await stage.rebuild(); });
  selC.addEventListener('change', async () => { stage.charId = selC.value; await stage.rebuild(); });

  bX.addEventListener('click', () => stage.rotateAxis(0));
  bY.addEventListener('click', () => stage.rotateAxis(1));
  bZ.addEventListener('click', () => stage.rotateAxis(2));
  bRst.addEventListener('click', () => stage.resetDelta());
  bShot.addEventListener('click', () => stage.screenshot());

  rowC.style.display = stage.mode === 'char' ? '' : 'none';
  refreshCfg();

  return { stage };
}
