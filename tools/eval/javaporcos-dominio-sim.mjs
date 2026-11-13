/* ============================================================================
   javaporcos-dominio-sim.mjs — A PARTIDA INTEIRA DA INVASÃO, COM BOTS, NO JOGO REAL

   Instrumento do A/B da mecânica de DOMÍNIO (decisões do dono, 30/10/2026). Sobe o
   Game de verdade pelo arnês (tools/eval/harness.mjs) no mapa invasao_javaporcos, com
   o jogador parado no spawn e os aliados bots defendendo, e roda até o fim da partida.

   O QUE ELE MEDE (e imprime em JSON no fim):
     dominio    % de domínio da horda no fim de cada onda e o pico da partida
     frentes    quantos bichos nasceram por boca/frente
     becos      % dos bichos das ondas ≥ 3 que passaram pelo corredor de um beco
     furia      fúria, cadência de spawn e velocidade aos 2 e aos 10 min de partida
     fim        vencedor, onda e minuto em que acabou

   Funciona com o código ANTIGO também (o "antes" do A/B): sem `state.dominio`, o
   domínio é calculado aqui, por observação, com o mesmo modelo de setor da régua.

   `--becos=vielas` planta um `world.horda.becos` nas quatro vielas do mapa de 29/10 (|x|
   ou |z| = 22), para medir o beco enquanto o mapa novo não exporta o contrato.

   USO
     node tools/eval/javaporcos-dominio-sim.mjs [--seed=7] [--minutos=14] [--bots=3] [--becos=vielas]
   ============================================================================ */
import { bootGame, initTextures, MAPS } from './harness.mjs';

const arg = (nome, padrao) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.split('=')[1] ?? padrao;
const SEED = Number(arg('seed', 7));
const MINUTOS = Number(arg('minutos', 14));
const BOTS = Number(arg('bots', 3));
const DT = 1 / 30;

const modulo = await import('../../public/js/mode_javaporcos.js');
if (arg('becos', '') === 'vielas') {
  const original = MAPS.invasao_javaporcos.build;
  MAPS.invasao_javaporcos.build = (...a) => {
    const w = original(...a);
    if (!w.horda) w.horda = { becos: [
      { id: 'viela-no', de: { x: -22, z: -34 }, ate: { x: -22, z: -10 }, abreNaOnda: 3 },
      { id: 'viela-ne', de: { x: 34, z: -22 }, ate: { x: 10, z: -22 }, abreNaOnda: 3 },
      { id: 'viela-se', de: { x: 22, z: 34 }, ate: { x: 22, z: 10 }, abreNaOnda: 3 },
      { id: 'viela-so', de: { x: -34, z: 22 }, ate: { x: -10, z: 22 }, abreNaOnda: 3 },
    ] };
    return w;
  };
}
const g = bootGame('invasao_javaporcos', { textures: initTextures(), seed: SEED, bots: BOTS });
const modo = g.objective;
const W = g.world;

/* Setores: os do mapa (contrato world.horda) ou a grade 4×4 de fallback sobre ±36. */
const grade = () => {
  const lista = [];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++)
    lista.push({ id: `g${i}${k}`, x0: -36 + i * 18, z0: -36 + k * 18, x1: -18 + i * 18, z1: -18 + k * 18, peso: 1 });
  return lista;
};
const setores = modo.setores || W.horda?.setores || grade();
const becos = modo.becos || W.horda?.becos || [];
const setorEm = (x, z) => setores.findIndex((s) => x >= s.x0 && x < s.x1 && z >= s.z0 && z < s.z1);

/* Observador de domínio para o código antigo, que não tem `state.dominio`: mesmas constantes do novo. */
const OBS = modulo.DOMINIO || { minBichos: 3, sobe: 1 / 40, desce: 1 / 10 };
const controle = new Float32Array(setores.length);
function observar(dt) {
  const bichos = new Int32Array(setores.length), defensores = new Int32Array(setores.length);
  for (const b of g.bots) if (b._boarId && b.alive) { const s = setorEm(b.pos.x, b.pos.z); if (s >= 0) bichos[s]++; }
  for (const c of g.combatants) if (c.team === 'E' && c.alive) { const s = setorEm(c.pos.x, c.pos.z); if (s >= 0) defensores[s]++; }
  for (let i = 0; i < setores.length; i++) {
    if (bichos[i] >= OBS.minBichos && !defensores[i]) controle[i] = Math.min(1, controle[i] + OBS.sobe * dt);
    else if (defensores[i] && !bichos[i]) controle[i] = Math.max(0, controle[i] - OBS.desce * dt);
  }
}
const pesoTotal = setores.reduce((t, s) => t + (s.peso || 1), 0);
const dominioAgora = () => {
  if (Number.isFinite(modo.state.dominio)) return modo.state.dominio;
  let soma = 0;
  setores.forEach((s, i) => { soma += controle[i] * (s.peso || 1); });
  return soma / pesoTotal;
};

const distSeg = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L)) : 0;
  return Math.hypot(a.x + dx * t - x, a.z + dz * t - z);
};

const nascidos = new Map();          // id → { onda, frente, beco: bool }
const porFrente = {};
const ondas = [];
let pico = 0, ultimaOnda = 0;
const furia = {};
const marcos = [120, 600];
const amostraFuria = () => ({
  furia: +(modo.state.fury || 0).toFixed(3),
  cadencia: +modulo.cadenciaDeSpawn(modo.state).toFixed(4),
  velocidadeAdulto: +modulo.velocidadeDoJavaporco(modo.state, 'adulto').toFixed(3),
  raio: +modulo.raioDeAgressao(modo.state).toFixed(2),
  onda: modo.state.wave,
});

const t0 = Date.now();
const passos = Math.round(MINUTOS * 60 / DT);
let fim = null;
for (let i = 0; i < passos; i++) {
  g.update(DT, false);
  if (g.state !== 'live') {
    if (modo.state.winner && !fim) fim = { vencedor: modo.state.winner, onda: modo.state.wave, minuto: +(modo.state.clock / 60).toFixed(2) };
    if (fim) break;
    continue;
  }
  if (!Number.isFinite(modo.state.dominio)) observar(DT);
  const s = modo.state;
  for (const a of s.alive) if (!nascidos.has(a.id)) {
    const chave = a.frente ?? a.entrance;
    const nome = (modo.frentes?.[chave]?.id) ?? W.boarEntrances?.[chave]?.id ?? String(chave);
    nascidos.set(a.id, { onda: s.wave, frente: nome, beco: false });
    porFrente[nome] = (porFrente[nome] || 0) + 1;
  }
  if (becos.length) for (const b of g.bots) {
    if (!b._boarId || !b.alive) continue;
    const reg = nascidos.get(b._boarId);
    if (!reg || reg.beco === true) continue;
    for (let k = 0; k < becos.length; k++) {
      const bk = becos[k];
      if (Math.hypot(b.pos.x - bk.de.x, b.pos.z - bk.de.z) < 3) reg.beco = k;
      else if (reg.beco === k && Math.hypot(b.pos.x - bk.ate.x, b.pos.z - bk.ate.z) < 3 && distSeg(b.pos.x, b.pos.z, bk.de, bk.ate) < 2.2) reg.beco = true;
    }
  }
  const d = dominioAgora();
  pico = Math.max(pico, d);
  if (s.wave !== ultimaOnda && ultimaOnda) ondas.push({ onda: ultimaOnda, minuto: +(s.clock / 60).toFixed(2), dominio: +(d * 100).toFixed(1) });
  ultimaOnda = s.wave;
  for (const m of marcos) if (!furia[`${m / 60}min`] && s.clock >= m) furia[`${m / 60}min`] = amostraFuria();
}
if (!fim) fim = { vencedor: modo.state.winner || null, onda: modo.state.wave, minuto: +(modo.state.clock / 60).toFixed(2) };
ondas.push({ onda: modo.state.wave, minuto: fim.minuto, dominio: +(dominioAgora() * 100).toFixed(1), fim: true });

const tardios = [...nascidos.values()].filter((r) => r.onda >= 3);
console.log(JSON.stringify({
  seed: SEED, bots: BOTS, setores: setores.length, becos: becos.length,
  frentesDoMapa: !!W.horda, ondas, picoDominio: +(pico * 100).toFixed(1),
  frentes: porFrente,
  becoOnda3: tardios.length ? +(100 * tardios.filter((r) => r.beco === true).length / tardios.length).toFixed(1) : null,
  furia, fim, abates: modo.state.kills, segundosDeSim: +((Date.now() - t0) / 1000).toFixed(1),
}, null, 1));
process.exit(0);
