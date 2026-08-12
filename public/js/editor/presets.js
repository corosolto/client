// Catálogo VIVO de itens do jogo pro editor: nada é copiado à mão — cada lista
// importa a fonte oficial (WEAPON_IDS/CHARACTERS) ou a lista de props do main.js.
// Novo item no jogo entra aqui sozinho, sem manutenção manual duplicada.
import { WEAPON_IDS, weaponCFG } from '../weapons.js';
import { CHARACTERS } from '../characters.js';

// As mesmas 26 armas do jogo, com o comprimento real de cada uma (para o enquadramento).
export const WEAPONS = WEAPON_IDS.map((id) => ({
  id,
  len: (weaponCFG(id) && weaponCFG(id).len) || 0.88,
}));

// O elenco do jogo (facções E/B) para os bots do palco de teste.
export const ENEMY_IDS = CHARACTERS.filter((c) => c.team === 'B').map((c) => c.id);

// Props de mapa do jogo (mesma lista que o main.js pré-carrega). São os "itens"
// que o editor de mapa pode colocar no chão — id real do GLB em models/props/.
export const MAP_PROPS = [
  'congresso', 'catedral', 'ministerio', 'palacio', 'justica', 'tires', 'stall', 'tent',
  'bus', 'drinkstand', 'urna', 'towner', 'quiosque', 'skate_ramp', 'lifeguard_tower',
  'guarda_sol', 'arquibancada', 'churrasqueira', 'mesa_guardasol', 'cooler', 'boia',
  'placa_piscina', 'caixa_som', 'kombi', 'fusca', 'saveiro', 'opala', 'onibus_sptrans',
  'caixa_som_baile', 'manequim', 'catedral', 'monte_carros',
];

// Geometrias procedurais que os mapas constroem com a mesma API (map_piscina addBox/addPlane).
export const GEOMETRY_KINDS = {
  box: { label: 'Caixa', props: ['w', 'h', 'd'] },
  plane: { label: 'Placa', props: ['w', 'h'] },
  cylinder: { label: 'Cilindro', props: ['r', 'h'] },
};

// Alturas "padrão" dos props (alvo do placeProp, em metros) — o mesmo default do jogo.
export const PROP_DEFAULT_H = 2.4;