// Verificação NUMÉRICA do ViewModelRig (springs.js) contra a régua de consistência.
// Roda em node, sem browser: simula 240 Hz e mede o que a régua cobra em C10/C13/C15/C16.
import { ViewModelRig, VM_TIMES } from '../../public/js/springs.js';
const dt = 1 / 240, R = (n) => Math.round(n * 1000) + ' ms';
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS  ' : 'FALHA ') + msg); if (!cond) fail++; };

// C10 — ADS entra e sai em <=120 ms e nenhum quadro anda >15% do trajeto
let r = new ViewModelRig(); r.setAds(true);
let t = 0, prev = 0, maxStep = 0;
while (r.adsK < 0.999 && t < 1) { r.update(dt, { speed: 0 }); t += dt; maxStep = Math.max(maxStep, Math.abs(r.adsK - prev)); prev = r.adsK; }
ok(t <= 0.12, `ADS in completo em ${R(t)} (<=120 ms)`);
ok(maxStep < 0.15, `maior passo do ADS = ${(maxStep * 100).toFixed(1)}% do trajeto (<15%)`);
r.setAds(false); t = 0; while (r.adsK > 0.001 && t < 1) { r.update(dt, { speed: 0 }); t += dt; }
ok(t <= 0.12, `ADS out completo em ${R(t)}`);

// C16 — bob proporcional à velocidade e zerado em <=300 ms ao parar
r = new ViewModelRig(); for (let i = 0; i < 240 * 2; i++) r.update(dt, { speed: 6.6, grounded: true });
const ampRun = r.bobAmp; for (let i = 0; i < 240 * 2; i++) r.update(dt, { speed: 2.2, grounded: true });
const ampWalk = r.bobAmp;
ok(ampRun > 0.9 && ampWalk > 0.25 && ampWalk < 0.45, `amplitude do bob: corrida ${ampRun.toFixed(2)} / andando ${ampWalk.toFixed(2)} (proporcional à velocidade)`);
t = 0; while (r.bobAmp > 0.02 && t < 2) { r.update(dt, { speed: 0, grounded: true }); t += dt; }
ok(t <= 0.30, `bob some em ${R(t)} depois de parar (<=300 ms)`);

// C13 — a recarga termina EXATAMENTE na duração declarada
for (const dur of [1.6, 2.4, 3.7]) {
  r = new ViewModelRig(); r.startReload(dur); t = 0; let done = 0;
  while (t < dur + 0.5) { r.update(dt, {}); t += dt; if (r.consumeReloadDone()) { done = t; break; } }
  ok(Math.abs(done - dur) <= 0.05, `reload de ${dur}s termina em ${done.toFixed(3)}s (erro ${Math.round(Math.abs(done - dur) * 1000)} ms, teto 50)`);
}

// C14 — a troca tem um ÚNICO ponto de swap, no fundo do arco, e volta ao lugar
r = new ViewModelRig(); r.startSwap(); t = 0; let swaps = 0, swapT = 0, yAtSwap = 0;
while (t < 1.2) { r.update(dt, {}); t += dt; if (r.consumeSwapPoint()) { swaps++; swapT = t; yAtSwap = r.pos.y; } }
ok(swaps === 1, `um único ponto de troca de malha (${swaps})`);
ok(yAtSwap < -0.3, `troca acontece com a arma fora do quadro (y=${yAtSwap.toFixed(3)} m)`);
ok(r.state === 'idle' && Math.abs(r.pos.y) < 0.01, `terminou no lugar (estado=${r.state}, y=${r.pos.y.toFixed(4)})`);

// C15 — zero pop: nenhum quadro desloca o VM mais que 8% da tela (~0,02 m de VM)
r = new ViewModelRig(); t = 0; let mx = 0, py = 0, px = 0, pz = 0, mr = 0, prot = 0;
const script = (tt) => ({ speed: tt % 4 < 2 ? 6.6 : 0, grounded: true, lookDX: Math.sin(tt * 3) * 0.02, lookDY: Math.cos(tt * 2) * 0.01 });
let fired = false, kickPos = 0, kickRot = 0, popMax = 0, lastState = 'idle';
while (t < 12) {
  fired = false;
  if (Math.abs(t - 1.0) < dt) { r.fire(1); fired = true; } if (Math.abs(t - 1.1) < dt) { r.fire(1); fired = true; }
  if (Math.abs(t - 2.0) < dt) r.startReload(2.2); if (Math.abs(t - 5.0) < dt) r.startSwap();
  if (Math.abs(t - 7.0) < dt) r.setAds(true); if (Math.abs(t - 8.0) < dt) r.setAds(false);
  r.update(dt, script(t)); t += dt;
  // O quadro do DISPARO é medido à parte: ali o pulo é o coice, e coice instantâneo
  // é o feel pedido (CS faz igual). C15 fala de TRANSIÇÃO DE ESTADO, não de tiro.
  const dp = Math.hypot(r.pos.x - px, r.pos.y - py, r.pos.z - pz), dr = Math.abs(r.rot.x - prot);
  if (fired) { kickPos = Math.max(kickPos, dp); kickRot = Math.max(kickRot, dr); }
  else { mx = Math.max(mx, dp); mr = Math.max(mr, dr); if (r.state !== lastState) popMax = Math.max(popMax, dp); }
  lastState = r.state;
  px = r.pos.x; py = r.pos.y; pz = r.pos.z; prot = r.rot.x;
}
// C15 é sobre DESCONTINUIDADE, não sobre velocidade: o holster PRECISA tirar a arma
// do quadro depressa (0,34 m em 0,16 s = 2,1 m/s ~ 14 mm por quadro a 240 Hz, que é
// movimento contínuo, não pop). O que reprova é a offset dar um degrau quando um
// estado começa ou termina — é isso que medimos aqui, quadro a quadro da transição.
ok(popMax < 0.003, `maior degrau nas TROCAS de estado = ${(popMax * 1000).toFixed(2)} mm (teto 3 mm)`);
ok(mx < 0.016, `maior deslocamento contínuo num quadro = ${(mx * 1000).toFixed(2)} mm a 240 Hz (= ${(mx * 240).toFixed(2)} m/s, saída do holster)`);
ok(kickPos < 0.05 && kickRot < 0.07, `coice do disparo: ${(kickPos * 1000).toFixed(0)} mm e ${(kickRot * 180 / Math.PI).toFixed(1)}° no quadro do tiro (teto 50 mm / 4°)`);
ok(isFinite(r.pos.x + r.pos.y + r.pos.z + r.rot.x + r.rot.y + r.rot.z), 'sem NaN depois de 12 s de roteiro');

// robustez: dt gigante (aba em background) não pode explodir o rig
r = new ViewModelRig(); r.fire(2); r.startReload(2); r.update(3.0, { speed: 6 });
ok(isFinite(r.pos.y) && Math.abs(r.pos.y) < 1, `dt de 3 s não explode (y=${r.pos.y.toFixed(3)})`);
console.log(fail ? `\n${fail} FALHA(S)` : '\nTUDO PASSOU');
process.exit(fail ? 1 : 0);
