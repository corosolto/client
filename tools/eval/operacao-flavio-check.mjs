import { criarEstadoEscolta, passoEscolta } from '../../public/js/mode_operacao_flavio.js';

const mutante = process.argv.includes('--mutante=sem-contestacao') ? 'sem-contestacao' : '';
let falhas = 0;
const cobra = (ok, texto) => {
  console.log(`${ok ? '✓' : '✗'} ${texto}`);
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

const abatido = criarEstadoEscolta(caminho);
passoEscolta(abatido, { defensores: [], atacantes: [], vipAlive: false }, 0.1, { mutante });
cobra(abatido.winner === 'E', 'abater Flávio entrega vitória aos atacantes');

const embarque = criarEstadoEscolta([{ x: 0, z: 0 }, { x: 0, z: 0.1 }]);
for (let i = 0; i < 40 && !embarque.winner; i++) {
  passoEscolta(embarque, { defensores: [vivo(0, 0, 'B')], atacantes: [], vipAlive: true }, 0.1, { mutante });
}
cobra(embarque.winner === 'B' && embarque.boardedFor >= 3, 'três segundos na escada concluem o embarque');

if (mutante) {
  const acendeu = falhas > 0;
  console.log(`${acendeu ? '✓' : '✗'} mutante sem contestação acendeu a régua`);
  process.exit(acendeu ? 0 : 1);
}
process.exit(falhas ? 1 : 0);
