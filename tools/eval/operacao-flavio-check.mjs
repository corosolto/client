import { aplicarSnapshotEscolta, criarEstadoEscolta, destinoProtecaoEscolta, passoEscolta, snapshotEscolta } from '../../public/js/mode_operacao_flavio.js';

const flags = process.argv.slice(2);
const unicos = new Set(flags);
const mutante = unicos.size === 1 && unicos.has('--mutante=sem-contestacao') ? 'sem-contestacao' : '';
if (flags.length !== unicos.size || (flags.length > 0 && !mutante)) {
  process.exit(2);
}
let falhas = 0;
const resultados = [];
const cobra = (ok, texto) => {
  console.log(`${ok ? '✓' : '✗'} ${texto}`);
  resultados.push({ texto, ok: ok === true });
  if (!ok) falhas++;
};
const caminho = [{ x: 0, z: 0 }, { x: 0, z: 4 }, { x: 0, z: 8 }];
const vivo = (x, z, team) => ({ x, z, team, alive: true });

const parado = criarEstadoEscolta(caminho);
passoEscolta(parado, { defensores: [], atacantes: [], vipAlive: true }, 1, { mutante });
cobra(parado.position.z === 0 && parado.escortCount === 0, 'Flávio não anda sem escolta');

const andando = criarEstadoEscolta(caminho);
passoEscolta(andando, { defensores: [vivo(0, 0, 'B')], atacantes: [], vipAlive: true }, 1, { mutante });
cobra(andando.position.z > 1.7 && andando.position.z < 1.9, 'escolta viva move Flávio a 1,8 m/s');

const contestado = criarEstadoEscolta(caminho);
passoEscolta(contestado, {
  defensores: [vivo(0, 0, 'B')],
  atacantes: [vivo(0, 0, 'E')],
  vipAlive: true,
}, 1, { mutante });
cobra(contestado.position.z === 0 && contestado.contested, 'atacante no raio interrompe a escolta');


const buscandoCobertura = criarEstadoEscolta(caminho);
passoEscolta(buscandoCobertura, { defensores: [vivo(0, 0, 'B')], atacantes: [], vipAlive: true }, 1);
const antesDaAmeaca = buscandoCobertura.position.z;
passoEscolta(buscandoCobertura, {
  defensores: [vivo(0, 0, 'B')],
  atacantes: [vivo(0, 5, 'E')],
  vipAlive: true,
}, 1);
cobra(buscandoCobertura.threatened && buscandoCobertura.position.z < antesDaAmeaca
  && buscandoCobertura.inCover, 'sob ameaça, Flávio recua e se abriga no último checkpoint seguro');

const bloqueado = criarEstadoEscolta(caminho);
passoEscolta(bloqueado, { defensores: [vivo(0, 0, 'B')], atacantes: [], vipAlive: true }, 1, {
  mover: (origem) => origem,
});
cobra(bloqueado.position.z === 0 && bloqueado.checkpoint === 0,
  'movimento físico pode bloquear Flávio sem dessincronizar o checkpoint');
const abatido = criarEstadoEscolta(caminho);
passoEscolta(abatido, { defensores: [], atacantes: [], vipAlive: false }, 0.1, { mutante });
cobra(abatido.winner === 'E', 'abater Flávio entrega vitória aos atacantes');

const embarque = criarEstadoEscolta([{ x: 0, z: 0 }, { x: 0, z: 0.1 }]);
for (let i = 0; i < 40 && !embarque.winner; i++) {
  passoEscolta(embarque, { defensores: [vivo(0, 0, 'B')], atacantes: [], vipAlive: true }, 0.1, { mutante });
}
cobra(embarque.winner === 'B' && embarque.boardedFor >= 3, 'três segundos na escada concluem o embarque');
const vip = { pos: { x: 12, z: -7 }, yaw: Math.PI / 4 };
const guardas = [0, 1, 2].map((i) => ({ pos: { x: i * 20, z: i * -20 }, team: 'B', alive: true }));
const ameaca = vivo(12, 3, 'E'); ameaca.pos = { x: 12, z: 3 };
const destinos = guardas.map((guarda) => destinoProtecaoEscolta(guarda, vip, guardas, [ameaca]));
const distancias = destinos.map((destino) => Math.hypot(destino.x - vip.pos.x, destino.z - vip.pos.z));
cobra(destinos.every(Boolean) && distancias.every((distancia) => distancia >= 2 && distancia <= 3.5)
  && new Set(destinos.map((destino) => `${destino.x.toFixed(2)}:${destino.z.toFixed(2)}`)).size === guardas.length,
  'bots defensores ocupam posições compactas e distintas ao redor de Flávio');
cobra(destinos[0].z > vip.pos.z && destinos.every((destino) => destino.leash <= 5.5
  && destino.engageRadius <= 7.5 && destino.slotRadius <= 1.6),
  'formação gira para interpor os guardas entre Flávio e a ameaça');
const servidor = criarEstadoEscolta(caminho);
Object.assign(servidor, {
  checkpoint: 1, escortCount: 3, contested: true, threatened: true, inCover: false,
  unattendedFor: 2.5, boardedFor: 1.25, winner: null,
});
servidor.position = { x: 1.5, z: 6.25 };
const cliente = criarEstadoEscolta(caminho);
aplicarSnapshotEscolta(cliente, snapshotEscolta(servidor));
cobra(JSON.stringify(snapshotEscolta(cliente)) === JSON.stringify(snapshotEscolta(servidor)),
  'snapshot autoritativo replica a escolta completa entre servidor e cliente');

if (mutante) {
  const proprioResultado = resultados.find((resultado) => resultado.texto === 'atacante no raio interrompe a escolta');
  const acendeu = Boolean(proprioResultado) && proprioResultado.ok === false
    && resultados.filter((resultado) => resultado.ok === false).length === 1;
  console.log(`${acendeu ? '✓' : '✗'} mutante sem contestação acendeu a régua`);
  process.exit(acendeu ? 0 : 1);
}
process.exit(falhas ? 1 : 0);
