// Painel de viewmodel: amarra o Project (estado), os presets (catálogo) e o VmStage
// (cena). Cada controle escreve no Project; o stage lê de lá no frame() — não existe
// caminho para painel e cena divergirem.
import { group, ctl, chips, seg, btn, row, pre } from '../ui.js';
import { MODES, MODE_LABEL, POSE_FIELDS, FXDEF, FXGROUPS } from '../schema.js';
import { WEAPONS } from '../presets.js';

export function mountVmPanel(side, project, stage) {
  const armas = WEAPONS.map((w) => w.id);

  const gArma = group('Arma');
  const list = chips(armas, {
    selected: stage.wsel.value,
    title: (id) => `${id} (${WEAPONS.find((w) => w.id === id).len.toFixed(2)} m)`,
  });
  gArma.appendChild(list.el);
  const tcount = document.createElement('span');
  tcount.className = 'muted';
  gArma.querySelector('.cap').appendChild(tcount);

  const gModo = group('Modo');
  const modeSeg = seg(MODES.map((m) => ({ value: m, label: MODE_LABEL[m] })), { selected: 'hip' });
  gModo.appendChild(modeSeg.el);
  modeSeg.bind((m) => { stage.setMode(m); refreshPoseFields(); });

  const gCamFov = group('Câmera');
  const gCamPos = group('Posição');
  const gCamRot = group('Rotação');
  const campos = {};
  ['fov', 'sz'].forEach((k) => { campos[k] = ctl(POSE_FIELDS[k].label, POSE_FIELDS[k]); gCamFov.appendChild(campos[k].el); });
  ['wx', 'wy', 'wz'].forEach((k) => { campos[k] = ctl(POSE_FIELDS[k].label, POSE_FIELDS[k]); gCamPos.appendChild(campos[k].el); });
  ['rx', 'ry', 'wt'].forEach((k) => { campos[k] = ctl(POSE_FIELDS[k].label, POSE_FIELDS[k]); gCamRot.appendChild(campos[k].el); });

  function refreshPoseFields() {
    const pose = project.pose(stage.wsel.value)[stage.mode];
    for (const k of Object.keys(POSE_FIELDS)) campos[k].set(pose[k]);
  }
  for (const [k, c] of Object.entries(campos)) {
    c.bind((v) => { project.setPose(stage.wsel.value, stage.mode, k, v); });
  }

  const gFx = {};
  const fxCtl = {};
  for (const [gname, keys] of Object.entries(FXGROUPS)) {
    const g = group(gname, 'FX');
    gFx[gname] = g;
    for (const k of keys) {
      fxCtl[k] = ctl(FXDEF[k].label, FXDEF[k]);
      fxCtl[k].bind((v) => project.setFx(k, v));
      g.appendChild(fxCtl[k].el);
    }
  }

  const gAcoes = group('Ações');
  const play = btn('▶ testar na cena', { primary: true });
  const copy = btn('📋 copiar arma');
  const reset = btn('↺ resetar');
  const exp = btn('exportar tudo');
  const cpFx = btn('📋 copiar FX');
  gAcoes.appendChild(play);
  gAcoes.appendChild(row(copy, reset));
  gAcoes.appendChild(row(exp, cpFx));
  const vals = pre('vals');
  gAcoes.appendChild(vals);

  function refreshListDone() { for (const w of armas) list.mark(w, project.isTuned(w)); }
  function refreshCount() { tcount.textContent = `afinada ${project.tuned.size}/${armas.length}`; }
  function selectWeapon(id) {
    list.select(id);
    stage.setWeapon(id);
    refreshPoseFields();
    refreshCount();
    refreshListDone();
  }

  list.bind(selectWeapon);
  play.addEventListener('click', () => { stage.start(); stage._sfx.ensure && stage._sfx.ensure(); });
  copy.addEventListener('click', () => {
    vals.textContent = project.exportPose(stage.wsel.value);
    navigator.clipboard && navigator.clipboard.writeText(vals.textContent).catch(() => {});
  });
  exp.addEventListener('click', () => { vals.textContent = project.exportAll(); });
  cpFx.addEventListener('click', () => { vals.textContent = project.exportFx(); });
  reset.addEventListener('click', () => { project.resetPose(stage.wsel.value); refreshPoseFields(); refreshCount(); refreshListDone(); });

  side.append(gArma, gModo, gCamFov, gCamPos, gCamRot, ...Object.values(gFx), gAcoes);

  refreshPoseFields();
  refreshListDone();
  refreshCount();

  return {
    selectWeapon,
    setMode(m) { modeSeg.el.querySelector(`[data-value="${m}"]`)?.click?.(); },
    get weapon() { return stage.wsel.value; },
  };
}