import assert from 'node:assert/strict';
import {
  WAVE_COUNTS,
  criarHorda,
  iniciarOnda,
  passoHorda,
  registrarDano,
  registrarAbate,
  atingirObjetivo,
  snapshotHorda,
  poseMorteJavaporco,
} from '../../public/js/mode_javaporcos.js';
import { encodeSnapshot, decodeSnapshot } from '../../public/js/netcodec.js';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
let falhas = 0;
const regra = (nome, fn) => {
  try { fn(); console.log(`✓ ${nome}`); }
  catch (erro) { falhas++; console.error(`✗ ${nome}: ${erro.message}`); }
};

regra('oito ondas escalam de 8 para 34 inimigos', () => {
  assert.deepEqual(WAVE_COUNTS, [8, 12, 16, 20, 24, 28, 31, 34]);
});

regra('vinte sementes terminam sem passar de 24 vivos', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const horda = criarHorda({ seed });
    let pico = 0;
    for (let onda = 1; onda <= 8; onda++) {
      iniciarOnda(horda);
      let guarda = 0;
      while (horda.phase === 'combat' && guarda++ < 2000) {
        passoHorda(horda, 0.25);
        pico = Math.max(pico, horda.alive.length);
        for (const animal of [...horda.alive]) registrarAbate(horda, animal.id, 'defensor', mutante);
      }
      assert.ok(guarda < 2000, `onda ${onda} travou na semente ${seed}`);
    }
    assert.equal(horda.winner, 'E');
    assert.ok(pico <= 24, `pico ${pico} na semente ${seed}`);
    assert.ok(horda.teamBonus >= 15000, `bônus final incompleto na semente ${seed}`);
  }
});

regra('as quatro entradas geram IDs estáveis', () => {
  const a = criarHorda({ seed: 319 });
  const b = criarHorda({ seed: 319 });
  iniciarOnda(a); iniciarOnda(b);
  passoHorda(a, 2); passoHorda(b, 2);
  assert.deepEqual(snapshotHorda(a), snapshotHorda(b));
  assert.deepEqual(new Set(a.alive.map((animal) => animal.entrance)), new Set([0, 1, 2, 3]));
});
regra('dois clientes fecham as oito ondas com o mesmo estado', () => {
  const clientes = [criarHorda({ seed: 551 }), criarHorda({ seed: 551 })];
  for (const horda of clientes) for (let onda = 0; onda < 8; onda++) {
    iniciarOnda(horda);
    while (horda.phase === 'combat') {
      passoHorda(horda, 0.25);
      for (const animal of [...horda.alive]) {
        registrarDano(horda, animal.id, 'defensor', animal.hp);
        registrarAbate(horda, animal.id, 'defensor');
      }
    }
  }
  assert.deepEqual(snapshotHorda(clientes[0]), snapshotHorda(clientes[1]));
});


regra('snapshot v7 replica o estado completo da horda', () => {
  const horda = criarHorda({ seed: 91 });
  iniciarOnda(horda); passoHorda(horda, 1);
  const objective = snapshotHorda(horda);
  const wire = encodeSnapshot({
    type: 'snapshot', room: 'horda', tick: 1, t: 1, state: 'live', owner: '',
    players: 1, spectators: 0, livre: { E: 3, B: 0 }, timeLeft: 360, roundNum: 1,
    scoreE: 0, scoreB: 0, roundKillsE: 0, roundKillsB: 0, objective, ents: [],
  }, 7);
  assert.deepEqual(decodeSnapshot(wire).objective, objective);
});

regra('assistência distribui só 40% dos pontos', () => {
  const horda = criarHorda({ seed: 7 });
  iniciarOnda(horda);
  passoHorda(horda, 1);
  const alvo = horda.alive.find((animal) => animal.type === 'adulto') || horda.alive[0];
  alvo.type = 'adulto';
  registrarDano(horda, alvo.id, 'atirador', 60);
  registrarDano(horda, alvo.id, 'assistente', 40);
  registrarAbate(horda, alvo.id, 'atirador', mutante);
  assert.equal(horda.scores.atirador.points, 180);
  assert.equal(horda.scores.assistente.points, 72);
  assert.equal(horda.scores.assistente.assists, 1);
  assert.equal(horda.scores.assistente.damagePrevented, 40);
});

regra('três objetivos destruídos encerram a defesa', () => {
  const horda = criarHorda({ seed: 9 });
  atingirObjetivo(horda, 0, 1000);
  atingirObjetivo(horda, 1, 1000);
  atingirObjetivo(horda, 2, 1000);
  assert.equal(horda.winner, 'B');
});

regra('javaporco abatido tomba e permanece visível antes de sumir', () => {
  const inicio = poseMorteJavaporco(0, 1, mutante);
  const queda = poseMorteJavaporco(0.28, 1, mutante);
  const chao = poseMorteJavaporco(0.7, 1, mutante);
  const fim = poseMorteJavaporco(4.1, 1, mutante);
  assert.equal(inicio.tilt, 0);
  assert.ok(queda.tilt > 0.4, `queda sem rotação visível: ${queda.tilt}`);
  assert.ok(chao.tilt > queda.tilt, 'o corpo não concluiu o tombo');
  assert.ok(chao.sink > 0.02, 'o corpo não assentou no chão');
  assert.equal(chao.done, false, 'cadáver desapareceu cedo demais');
  assert.equal(fim.done, true, 'cadáver não foi limpo depois da animação');
});

if (mutante) {
  assert.ok(falhas > 0, `mutante ${mutante} passou despercebido`);
  console.log(`✓ mutante ${mutante} acendeu a régua`);
  process.exit(0);
}
if (falhas) process.exit(1);
