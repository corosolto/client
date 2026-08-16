// VMLAB (?vmlab=1) — modo de COMPARAÇÃO do viewmodel. Aplica no jogo a pose de arma
// afinada no editor de viewmodel (public/dev.html): quadril + mirado por arma. É opt-in;
// SEM a flag o jogo desenha o viewmodel calibrado normal (game.js, "nenhuma tabela por
// arma"). Aqui a tabela existe de propósito — é o experimento pra testar o look do editor
// dentro de uma partida de verdade, sem tocar no padrão.
//
// Unidades (iguais às do editor): fov = lente da câmera do VM em graus; sz = escala em %
// (×0.01); wx/wy/wz = posição em cm (×0.01) em view space (x=direita, y=cima, z=frente,
// negativo = pra longe do olho); rx/ry/wt = pitch/yaw/inclinação em graus.
import { weaponCFG } from './weapons.js';

// snipers de luneta: a arma some no ADS e a luneta cobre (o jogo já trata a máscara).
export const VMLAB_SCOPED = new Set(['awp', 'svd', 'g3sg1', 'sks', 'mosin', 'rem700', 'm400']);
// armas cujo mirado é POSICIONADO À MÃO (sem auto-centrar a alça medida).
export const VMLAB_NO_ALIGN = new Set(['pistol']);

// base herdada quando a arma não tem valor próprio (mesmos números do editor).
const BASE = {
  hip: { fov: 55, sz: 67, wx: 5, wy: -10, wz: -21, rx: 0, ry: 1, wt: 3 },
  ads: { fov: 47, sz: 68, wx: 0, wy: 1, wz: -25, rx: 0, ry: 0, wt: 0 },
};
const AK_LEN = 0.88;

// POSES AFINADAS (fonte: bancada). Só o que difere da base entra; o resto herda.
const TUNED = {
  pistol: { hip: { fov: 50, sz: 43, wx: 5, wy: -10, wz: -22, rx: 0, ry: 1, wt: 3 }, ads: { fov: 30, sz: 89, wx: 1, wy: -10, wz: -22, rx: 0, ry: 1, wt: 3 } },
  ak: { ads: { fov: 47, sz: 100, wx: 0, wy: 1, wz: -25, rx: 0, ry: 0, wt: 0 } },
  m4: { ads: { fov: 47, sz: 75, wx: 0, wy: -1, wz: -26, rx: 1, ry: 0, wt: 0 } },
  mp5: { ads: { fov: 41, sz: 59, wx: 1, wy: 2, wz: -29, rx: 0, ry: 1, wt: 0 } },
  deagle: { ads: { fov: 30, sz: 53, wx: 1, wy: 10, wz: -23, rx: 1, ry: 1, wt: 0 } },
  m92: { hip: { fov: 69, sz: 49, wx: 6, wy: -10, wz: -21, rx: 0, ry: 1, wt: 3 }, ads: { fov: 50, sz: 63, wx: 0, wy: 2, wz: -25, rx: 0, ry: 0, wt: 0 } },
  g3: { hip: { fov: 55, sz: 64, wx: 5, wy: -10, wz: -21, rx: 0, ry: 1, wt: 3 }, ads: { fov: 47, sz: 57, wx: 0, wy: -3, wz: -25, rx: 0, ry: 0, wt: 0 } },
  carbine: { hip: { fov: 55, sz: 79, wx: 5, wy: -10, wz: -21, rx: 0, ry: 1, wt: 3 }, ads: { fov: 47, sz: 61, wx: 0, wy: -1, wz: -25, rx: 0, ry: 0, wt: 0 } },
  lmg: { hip: { fov: 55, sz: 60, wx: 5, wy: -10, wz: -21, rx: 0, ry: 1, wt: 3 }, ads: { fov: 47, sz: 59, wx: 3, wy: 0, wz: -25, rx: 0, ry: 0, wt: 0 } },
  scar: { ads: { fov: 47, sz: 59, wx: 0, wy: 0, wz: -27, rx: 0, ry: 0, wt: 0 } },
  tavor: { ads: { fov: 32, sz: 72, wx: 0, wy: 0, wz: -27, rx: 0, ry: 0, wt: 0 } },
  revolver38: { ads: { fov: 59, sz: 43, wx: 0, wy: 10, wz: -16, rx: 0, ry: 0, wt: 0 } },
};

// default por arma: só ENCOLHE armas LONGAS (mesma regra do editor) pra não vir gigante.
function vmlabDefault(id) {
  const len = (weaponCFG(id) && weaponCFG(id).len) || AK_LEN;
  const k = Math.max(0.45, Math.min(1, AK_LEN / len));
  const sc = (b) => Math.round(Math.max(20, Math.min(100, b * k)));
  return { hip: { ...BASE.hip, sz: sc(BASE.hip.sz) }, ads: { ...BASE.ads, sz: sc(BASE.ads.sz) } };
}

// pose final da arma: default + o que foi afinado por cima (hip e ads independentes).
export function vmlabPose(id) {
  const d = vmlabDefault(id), t = TUNED[id] || {};
  return { hip: { ...d.hip, ...t.hip }, ads: { ...d.ads, ...t.ads } };
}

// lista das armas com pose própria (pra debug/telemetria).
export const VMLAB_TUNED_IDS = Object.keys(TUNED);
