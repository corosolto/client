// Estado do projeto do editor: poses por arma + FX globais.
// Persiste no navegador na MESMA chave da bancada antiga (dev.html) — não perde o
// que já foi afinado. Export gera o bloco de config no formato que a equipe cola
// no jogo (mesmo texto do dev.html: `arma QUADRIL/ MIRADO` + `FX ...`).
import { defaultPoseFor, POSE_FIXED, FXDEF, POSE_FIELDS } from './schema.js';
import { WEAPON_IDS } from '../weapons.js';

export const STORE = 'bancadaViewmodel';

// Fallback de arma quando o projeto ainda não tem entrada: seduz com a padrão real.
function clone(o) { return JSON.parse(JSON.stringify(o)); }

export class Project {
  constructor() {
    this.poses = {};        // arma -> { hip: {...}, ads: {...} }
    this.tuned = new Set(); // armas que saíram do padrão
    this.fx = {};
    for (const k in FXDEF) this.fx[k] = FXDEF[k].val;
    this._load();
    for (const id of WEAPON_IDS) {
      if (this.poses[id] === undefined) this.poses[id] = clone(defaultPoseFor(id));
      if (POSE_FIXED[id]) this.poses[id] = clone(POSE_FIXED[id]);
    }
  }

  _load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (d.pose) {
        for (const [id, p] of Object.entries(d.pose)) {
          if (WEAPON_IDS.includes(id)) this.poses[id] = clone(p);
        }
      }
      (d.tuned || []).forEach((x) => this.tuned.add(x));
      if (d.fx) Object.assign(this.fx, d.fx);
    } catch { /* projeto corrompido → começa do padrão */ }
  }

  save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ pose: this.poses, tuned: [...this.tuned], fx: this.fx }));
    } catch { /* quota cheia → segue sem persistir */ }
  }

  pose(id) { return this.poses[id]; }
  isTuned(id) { return this.tuned.has(id); }
  markTuned(id) { this.tuned.add(id); this.save(); }
  resetPose(id) {
    const was = this.tuned.delete(id);
    this.poses[id] = clone(defaultPoseFor(id));
    if (POSE_FIXED[id]) this.poses[id] = clone(POSE_FIXED[id]);
    this.save();
    return was;
  }
  setField(id, mode, key, v) { this.poses[id][mode][key] = v; }
  setFx(key, v) { this.fx[key] = v; this.save(); }

  setPose(id, mode, key, v) { this.setField(id, mode, key, v); this.markTuned(id); }

  // Texto que a equipe cola no jogo (mesmo formato do dev.html).
  exportPose(id) {
    const P = this.poses[id];
    const fmt = (o) => Object.keys(POSE_FIELDS).map((k) => `${k}=${o[k]}`).join(' ');
    return `${id} QUADRIL ${fmt(P.hip)}\n${id} MIRADO  ${fmt(P.ads)}`;
  }
  exportAll() {
    const ids = [...this.tuned].sort();
    return ids.length ? ids.map((id) => this.exportPose(id)).join('\n') : '(nenhuma arma ajustada ainda)';
  }
  exportFx() { return 'FX ' + Object.keys(FXDEF).map((k) => `${k}=${this.fx[k]}`).join(' '); }
}
