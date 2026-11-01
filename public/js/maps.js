import { withVisibleShotOccluders } from './shot_surfaces.js';

/* Mapas sob demanda (lane glm/peso): registro com metadados leves; o módulo da
   arena só entra por carregaMapa. Régua eval:mapasobdemanda; fiação no PR. */

/* IDS SEM NOME DE COUNTER-STRIKE (rodada de 11/08).
   ═══════════════════════════════════════════════════════════════════════════════════
   Os ids antigos eram herança direta do CS 1.6 e não do nosso jogo: `awp_map` e
   `fy_pool_day` são nomes LITERAIS de mapas do CS, e o prefixo `fy_` ("fight yard") é
   convenção de lá. Os nomes EXIBIDOS já eram brasileiros desde sempre — era só o id que
   carregava o CS, e id vaza: ele aparece na URL que o jogador compartilha e vai gravado
   em toda partida do banco.

   Os ids novos saem do nome exibido, então o que está no código passa a ser o que o
   jogador lê na tela:

     awp_map        -> praca_poderes    (Praça dos Três Poderes)
     fy_pool_day    -> piscina_treta    (Piscina da Treta)
     fy_havan       -> loja_h           (Loja H — Estacionamento)
     fy_ferrovelho  -> ferro_velho      (Ferro Velho do Zé)
     fy_quebrada    -> quebrada         (Quebrada — Rua do Baile)

   Ver `ALIAS_MAPA` logo abaixo do registro: id antigo continua resolvendo, e o motivo
   de isso não ser opcional está lá. */
const JAVAPORCOS_META = { ctfMode: false, objectiveMode: 'horde',
    loadingWall: '/img/loading-javaporcos.webp',
    props: ['carro_batido_scan_03', 'perua_pichada_scan', 'junk_car', 'carro_batido_scan_07',
      'dumpster', 'porta_aco', 'arvore_mata', 'shopping_cart', 'capim_touceira_a', 'capim_touceira_b',
      'arbusto_mata_a', 'arbusto_mata_b', 'samambaia_mata', 'calathea_mata', 'galhos_secos', 'toco_arvore',
      'tronco_caido', 'pedra_mata', 'saco_lixo', 'caixa_papelao', 'engradado_plastico', 'cadeira_plastico',
      'pneu_velho', 'tambor_metal', 'tampa_bueiro', 'lixeira_metal', 'lata_enferrujada', 'poste_luz_praca',
      'caixote_madeira'],
    ambience: ['rat', 'pigeonGround', 'dog', 'parrot'],
  };
export const MAPS = {
  campomorro: { name: 'Campinho do Morro', ctfMode: true,
    props: ['arquibancada', 'junkyard_container', 'caixa_som_baile', 'stall', 'fav_house', 'pilha_pneus', 'moto_cg', 'fusca', 'casa_favela_azul', 'casa_favela_tijolo', 'varal_roupas', 'grama_corrego_01', 'grama_corrego_02', 'planta_corrego_taboa', 'planta_corrego_taioba'],
    ambience: ['rat', 'pigeonGround', 'dog', 'escadaoCat', 'sertaoHen', 'cow', 'armadillo', 'parrot'],
    mobileAmbience: true,
  },
  mansao: { name: 'Mansão do Joá', ctfMode: true,
    props: ['mesa_guardasol', 'guarda_sol', '1968_volkswagen_beetle', '2014_mini_cooper_s_f56', '2002_volkswagen_golf_r32_mk4', 'palmeira_imperial', 'palmeira_ravenala', 'heliconia', 'costela_adao', 'bananeira', 'ixora', 'agave', 'samambaia', 'banco_jardim', 'poste_jardim', 'escultura_jardim', 'vaso_tropical', 'lounge_externo', 'lampiao_fachada', 'mansao_sofa', 'mansao_poltrona', 'mansao_mesa_centro', 'mansao_lustre', 'coqueiro'],
    ambience: ['rat', 'pigeonGround', 'parrot'],
  },
  amazonia: { name: 'Treta na Amazônia', ctfMode: true,
    props: ['samambaia', 'heliconia', 'planta_corrego_taboa', 'planta_corrego_taioba', 'grama_corrego_01', 'grama_corrego_02', 'stall', 'arara_roupas', 'caixa_dagua', 'botijao_gas', 'pilha_pneus', 'tires', 'dumpster', 'galinha_mint_amazonia', 'pintinho_mint_amazonia', 'canoa_rabeta_amazonia', 'palafita_aberta_amazonia', 'arvore_mata_amazonia', 'palmeira_babacu_amazonia'],
    ambience: ['rat', 'pigeonGround', 'dog', 'jacare', 'capivara', 'cat', 'chicken', 'cow', 'armadillo', 'cockroach', 'parrot', 'jacare', 'capivara', 'boto', 'onca', 'tucano', 'preguica', 'macaco', 'anta', 'arara', 'piranha', 'carcara'],
  },
  escadao: { name: 'Escadão (Morro)', ctfMode: true,
    props: ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca', 'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_dagua', 'varal_roupas_01', 'varal_roupas_02', 'casa_favela_azul', 'casa_favela_tijolo', 'varal_roupas', 'samambaia', 'grama_corrego_02', 'escadao_casa_r3', 'escadao_varanda_r4', 'escadao_eletrica_r4'],
    ambience: ['rat', 'pigeonGround', 'dog', 'cockroach', 'escadaoCat', 'sertaoHen'],
    mobileAmbience: true,
  },
  praca_poderes: { name: 'Praça dos Três Poderes',   // Brasília fiel (substitui o clássico)
    props: ['congresso', 'catedral', 'ministerio', 'palacio', 'justica', 'tires', 'stall', 'tent', 'bus', 'drinkstand', 'urna', 'towner'],
    propsComplete: true,
    ambience: ['rat', 'pigeonGround', 'armadillo'],
  },
  piscina_treta: { name: 'Piscina da Treta',   // salão fechado do CS 1.6; a versão Piscinão está em map_piscinao_ramos.js, fora do registro
    props: ['piscina_armarios', 'piscina_banco', 'piscina_espreguicadeira', 'piscina_escada'],
  },
  // props via getter APÓS carregaMapa: a seleção de carros é sorteada por partida
  // (seed no startGame). `ctfMode: true` = ABRE em CTF, mas o jogador pode trocar.
  loja_h: { name: 'Loja H (Estacionamento)', ctfMode: true },
  ferro_velho: { name: 'Ferro Velho do Zé', ctfMode: true,
    props: ['muro_carros', 'fileira_carros', 'monte_carros', 'guindaste', 'prensa_carros', 'pilha_pneus', 'ferro_balcao', 'abandoned_car', 'broken_car', 'broken_car_2', 'carro_danificado', 'destroyed_car', 'junk_car', 'dumpster', 'jersey_barrier', 'sandbags', 'concrete_roadblock'],
  },
  quebrada: { name: 'Quebrada (Rua do Baile)', ctfMode: true,
    props: ['pilha_pneus', 'tires', 'jersey_barrier', 'stall', 'tent', 'caixa_som', 'arquibancada', 'churrasqueira', 'mesa_guardasol', 'guarda_sol', 'moto_cg', 'kombi', 'uno_mille', 'fusca', 'saveiro', 'dumpster', 'arara_roupas', 'drinkstand', 'fav_house', 'fav_brasileira', 'fav_modular', 'tiara_gt83', 'botijao_gas', 'vw_9150', 'fachada_comercio', 'onibus_sptrans', 'caixa_som_baile'],
    ambience: ['rat', 'pigeonGround', 'dog', 'escadaoCat'],
    mobileAmbience: true,
  },
  corrego: { name: 'Córrego (Favela de SP)', ctfMode: true,
    props: ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca', 'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_som', 'fav_house', 'fav_brasileira', 'caixa_dagua', 'botijao_gas', 'uno_mille', 'fiat_uno', 'kombi', 'grama_corrego_01', 'grama_corrego_02', 'planta_corrego_taboa', 'planta_corrego_taioba', 'pipa_papel', 'helicoptero_pm'],
    ambience: ['rat', 'pigeonGround', 'cockroach', 'escadaoCat', 'sertaoHen', 'jacare', 'capivara'],
    mobileAmbience: true,
  },
  lajes: { name: 'Lajes (Comunidade)', ctfMode: true,
    props: ['lajes_casa_01', 'lajes_casa_02', 'lajes_casa_03', 'lajes_casa_04', 'lajes_casa_05', 'lajes_casa_06', 'lajes_casa_07', 'lajes_varal', 'caixa_dagua', 'helicoptero_pm', 'moto_cg'],
    ambience: ['rat', 'pigeonGround', 'dog', 'cockroach', 'escadaoCat', 'pipa'],
    mobileAmbience: true,
  },
  posto_treta: { name: 'Posto da Treta', ctfMode: true,
    props: ['bombas_combustivel', 'loja_conveniencia', 'kombi', 'saveiro', 'fusca', 'dumpster', 'quiosque', 'botijao_gas', 'jersey_barrier', 'concrete_roadblock', 'sandbags', 'pilha_pneus', 'tires', 'fileira_carros', 'opala', 'chevette', 'brasilia_vw', 'fiat_uno', 'uno_mille', 'moto_cg', 'cooler', 'caixa_som', 'guarda_sol', 'mesa_guardasol', 'shopping_cart', 'vw_9150', 'manequim', 'fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio', 'bus', 'onibus_urbano', 'ixora', 'agave', 'samambaia'],
  },
  upa_24h: { name: 'UPA 24h da Treta', ctfMode: true,
    props: ['upa_maca', 'upa_monitor', 'upa_soro', 'upa_oxigenio', 'upa_biombo', 'upa_longarina', 'upa_cadeira_rodas', 'upa_armario', 'upa_balcao'],
  },
  obras_prefeitura: { name: 'Obras da Prefeitura', ctfMode: true,
    props: ['andaime', 'container_escritorio', 'construction_rubble', 'guindaste', 'concrete_roadblock', 'jersey_barrier', 'sandbags', 'dumpster', 'botijao_gas', 'pilha_pneus', 'vw_9150', 'kombi', 'fav_house', 'fav_modular', 'fachada_comercio', 'opala', 'fiat_uno', 'chevette'],
  },
  atacadao_treta: { name: 'Atacadão da Treta', ctfMode: true,
    props: ['estante_pallets', 'freezer', 'ilha_caixas', 'caixa_cobranca', 'gondola_mercado', 'gondola_eletro', 'stall', 'balcao_acougue', 'balcao_padaria', 'ilha_hortifruti', 'geladeira_bebidas', 'moto_cg', 'drinkstand', 'guarda_sol', 'mesa_guardasol', 'shopping_cart', 'cooler', 'pilha_pneus', 'dumpster', 'vw_9150', 'fileira_carros', 'kombi', 'saveiro', 'opala', 'fiat_uno', 'chevette', 'brasilia_vw', 'fusca', 'fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio'],
  },
  parque_treta: { name: 'Parque da Treta', ctfMode: true,
    props: ['parque_coreto', 'roda_gigante_roda', 'roda_gigante_base', 'carrossel', 'barraca_quermesse', 'predio_artdeco'],
    ambience: ['rat', 'pigeonGround', 'dog', 'parrot'],
  },
  velho_oeste: { name: 'Sertão da Treta', ctfMode: true,
    props: ['sertao_macambira', 'sertao_juazeiro', 'sertao_xique_xique', 'sertao_poco_roda', 'sertao_capelinha', 'caixa_som_baile', 'casa_pedra', 'casa_geminada', 'igrejinha', 'caminhao_antigo'],
    ambience: ['rat', 'pigeonGround', 'parrot', 'calango', 'lagarto', 'sertaoGoat', 'sertaoHen', 'sertaoChick'],
  },
  invasao_javaporcos: { name: 'Cidade Invadida', ...JAVAPORCOS_META },
  distrito_rural: { name: 'Distrito Rural', ...JAVAPORCOS_META },
  vila_da_mata: { name: 'Vila da Mata', ...JAVAPORCOS_META },
  penitenciaria: { name: 'CARANDIRU', ctfMode: true,
    props: [],
    ambience: ['rat', 'pigeonGround'],
  },
};

/* Módulo de cada mapa: import dinâmico, memoizado. `build` e `preload` só existem
   depois de `carregaMapa`; quem chamar `build` sem carregar recebe TypeError alto
   em vez de mapa mudo (LICOES.md, lição 5). */
const MODULOS = {
  campomorro: () => import('./map_campomorro.js'),
  mansao: () => import('./map_mansao.js'),
  amazonia: () => import('./map_amazonia.js'),
  escadao: () => import('./map_escadao.js'),
  praca_poderes: () => import('./map_brasilia.js'),
  piscina_treta: () => import('./map_piscina.js'),
  loja_h: () => import('./map_havan.js'),
  ferro_velho: () => import('./map_ferrovelho.js'),
  quebrada: () => import('./map_quebrada.js'),
  corrego: () => import('./map_corrego.js'),
  lajes: () => import('./map_lajes_authored.js'),
  posto_treta: () => import('./map_posto.js'),
  upa_24h: () => import('./map_upa.js'),
  obras_prefeitura: () => import('./map_obras.js'),
  atacadao_treta: () => import('./map_atacadao.js'),
  parque_treta: () => import('./map_parque.js'),
  velho_oeste: () => import('./map_velho_oeste.js'),
  invasao_javaporcos: () => import('./map_invasao_javaporcos.js'),
  distrito_rural: () => import('./map_javaporcos_rural.js'),
  vila_da_mata: () => import('./map_javaporcos_vila.js'),
  penitenciaria: () => import('./map_penitenciaria.js'),
};

// Export do módulo que casa com cada entrada do registro (para a conferência).
const EXPORTS = {
  campomorro: { build: 'buildCampoMorro', props: 'CAMPOMORRO_PROPS', ambience: 'CAMPOMORRO_AMBIENCE' },
  mansao: { build: 'buildMansao', props: 'MANSAO_PROPS', ambience: 'MANSAO_AMBIENCE', preload: 'preloadMansaoAmbience' },
  amazonia: { build: 'buildAmazonia', props: 'AMAZONIA_PROPS', ambience: 'AMAZONIA_AMBIENCE' },
  escadao: { build: 'buildEscadao', props: 'ESCADAO_PROPS', ambience: 'ESCADAO_AMBIENCE' },
  praca_poderes: { build: 'buildBrasilia', props: 'BRASILIA_PROPS', ambience: 'BRASILIA_AMBIENCE' },
  piscina_treta: { build: 'buildPoolDay', props: 'PISCINA_PROPS' },
  loja_h: { build: 'buildHavan', propsGetter: 'havanPropsForMatch' },
  ferro_velho: { build: 'buildFerroVelho', props: 'FERRO_PROPS' },
  quebrada: { build: 'buildQuebrada', props: 'QUEBRADA_PROPS', ambience: 'QUEBRADA_AMBIENCE' },
  corrego: { build: 'buildCorrego', props: 'CORREGO_PROPS', ambience: 'CORREGO_AMBIENCE' },
  lajes: { build: 'buildLajes', props: 'LAJES_PROPS', ambience: 'LAJES_AMBIENCE' },
  posto_treta: { build: 'buildPosto', props: 'POSTO_PROPS' },
  upa_24h: { build: 'buildUpa', props: 'UPA_PROPS' },
  obras_prefeitura: { build: 'buildObras', props: 'OBRAS_PROPS' },
  atacadao_treta: { build: 'buildAtacadao', props: 'ATACADAO_PROPS' },
  parque_treta: { build: 'buildParque', props: 'PARQUE_PROPS', ambience: 'PARQUE_AMBIENCE' },
  velho_oeste: { build: 'buildVelhoOeste', props: 'VELHO_OESTE_PROPS', ambience: 'VELHO_OESTE_AMBIENCE' },
  invasao_javaporcos: { build: 'buildInvasaoJavaporcos', props: 'INVASAO_JAVAPORCOS_PROPS', preload: 'preloadJavaporcos' },
  distrito_rural: {build:'buildDistritoRural',props:'DISTRITO_RURAL_PROPS',preload:'preloadJavaporcos'},
  vila_da_mata: {build:'buildVilaDaMata',props:'VILA_DA_MATA_PROPS',preload:'preloadJavaporcos'},
  penitenciaria: { build: 'buildPenitenciaria', props: 'PENITENCIARIA_PROPS', ambience: 'PENITENCIARIA_AMBIENCE' },
};

const _igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const _carregados = new Map();

export function carregaMapa(id) {
  const alvo = resolveMapId(id);
  if (_carregados.has(alvo)) return _carregados.get(alvo);
  const promessa = MODULOS[alvo]().then((m) => {
    const entrada = MAPS[alvo];
    const nomes = EXPORTS[alvo];
    for (const campo of ['props', 'ambience']) {
      const doModulo = m[nomes[campo]];
      if (doModulo === undefined) continue;
      if (!_igual(entrada[campo] ?? null, doModulo)) {
        throw new Error(`[mapas] ${alvo}.${campo} no registro diverge do módulo (${nomes[campo]}): atualize o registro em maps.js`);
      }
    }
    entrada.build = withVisibleShotOccluders(m[nomes.build]);
    if (nomes.preload) entrada.preload = m[nomes.preload];
    if (nomes.propsGetter) Object.defineProperty(entrada, 'props', { get: () => m[nomes.propsGetter](), configurable: true });
    return m;
  });
  _carregados.set(alvo, promessa);
  return promessa;
}

/* Fronteira única entre o registro lazy e quem constrói uma cena. A callback só
   recebe o mapa depois que o módulo instalou `build`; rejeição não vira fallback. */
export async function comMapaCarregado(id, usar, carregar = carregaMapa, mapas = MAPS) {
  const alvo = resolveMapId(id);
  await carregar(alvo);
  return usar(mapas[alvo], alvo);
}

export const mapaCarregado = (id) => typeof MAPS[resolveMapId(id)]?.build === 'function';

/* Seed dos carros da Loja H: o main.js importava setHavanCarSeed direto do módulo
   da arena (import estático que devolvia o mapa ao grafo do boot). Pela mesma porta. */
export async function defineSeedHavan(seed) {
  const m = await carregaMapa('loja_h');
  m.setHavanCarSeed(seed);
  return MAPS.loja_h;
}

export const MAP_IDS = Object.keys(MAPS);
export const DEFAULT_MAP = 'praca_poderes';

/* Mapas fora do jogo para retrabalho: saem do menu, não do registro (é dele que ~50
   réguas vivem). Contrato e volta: docs/maps/MAPAS-PARADOS.md. */
export const MAPAS_PARADOS = new Set([
  'distrito_rural',
  'vila_da_mata',
  'mansao',
  'parque_treta',
  'campomorro',
  'obras_prefeitura',
  'atacadao_treta',
  'penitenciaria',
]);

/* A lista que o JOGADOR vê. `MAP_IDS` continua sendo o registro inteiro porque é dele
   que as réguas vivem; quem desenha menu, carrossel, catálogo e rotação usa esta. */
export const MAP_IDS_JOGAVEIS = MAP_IDS.filter((id) => !MAPAS_PARADOS.has(id));

/* Oficina: a versão alternativa do jogo para refazer mapa por mapa. Com `?oficina=1` o
   menu volta a listar TODOS, parados inclusive; sem ela, só os jogáveis. */
export function mapasDoMenu(oficina = false) {
  return oficina ? MAP_IDS : MAP_IDS_JOGAVEIS;
}

export function mapaParado(id) {
  return MAPAS_PARADOS.has(resolveMapId(id));
}

/* ALIAS DE ID ANTIGO -> NOVO, e por que ele NÃO é opcional.
   ═══════════════════════════════════════════════════════════════════════════════════
   Id de mapa não é detalhe interno: ele SAI do processo por dois caminhos, e os dois
   sobrevivem ao rename.

   1. VAI GRAVADO NO BANCO. `src/pages/api/match.ts:56` manda `p_map` em toda partida
      enviada. As linhas já gravadas continuam dizendo `awp_map` para sempre; sem alias,
      o mesmo mapa vira DUAS entradas no ranking — a de antes e a de depois do rename —
      e nenhuma das duas fica certa.

   2. VIAJA EM LINK. `?map=fy_quebrada` é o que o jogador manda no grupo. E aqui está a
      parte perigosa: `resolveMapId` devolve o DEFAULT_MAP para id desconhecido, então
      link antigo NÃO daria erro — abriria calado a Praça no lugar da Quebrada. Falha
      silenciosa é a assinatura do defeito mais caro deste repo: foi assim que o rename
      Time E (06/08) apagou a bandeira do jogador sem uma linha no console.

   Por isso o alias resolve ANTES do fallback. Ele é a diferença entre "link velho abre o
   mapa certo" e "link velho abre outro mapa e ninguém percebe".

   Régua: `tools/eval/mapa-id-check.mjs` — M1 nenhum id do CS sobrevive no código, M2
   todo id antigo resolve para um mapa que existe. */
export const ALIAS_MAPA = {
  fy_campomorro: 'campomorro',
  fy_mansao: 'mansao',
  fy_amazonia: 'amazonia',
  vietnam: 'amazonia',
  awp_map: 'praca_poderes',
  fy_pool_day: 'piscina_treta',
  fy_havan: 'loja_h',
  fy_ferrovelho: 'ferro_velho',
  fy_quebrada: 'quebrada',
  /* O córrego nasceu `fy_corrego` na branch de origem e chega na main já renomeado — o
     M1 do mapa-id-check não deixa id no estilo CS entrar. O alias existe porque link e
     linha de banco gravados com o nome antigo NÃO podem cair no mapa padrão calados. */
  fy_corrego: 'corrego',
  fy_lajes: 'lajes',
};

export function resolveMapId(id) {
  if (MAPS[id]) return id;
  const antigo = ALIAS_MAPA[id];
  if (antigo && MAPS[antigo]) return antigo;
  return DEFAULT_MAP;
}

/* A fila anda só entre os JOGÁVEIS; lista vazia cai no DEFAULT_MAP em vez de
   dividir por zero. */
export function nextMapId(id) {
  const fila = MAP_IDS_JOGAVEIS.length ? MAP_IDS_JOGAVEIS : [DEFAULT_MAP];
  const atual = resolveMapId(id);
  const i = fila.indexOf(atual);
  return fila[(i + 1) % fila.length];
}

/* Rotação da sugestão inicial (pedido do dono: menos awp_map, mais exposição dos
   outros mapas): link ?map= manda sempre; quem escolheu no carrossel (pin) fica
   no escolhido; quem nunca escolheu recebe o próximo da fila a cada visita.

   Mapa parado fora da oficina cai no DEFAULT_MAP COM aviso: trocar o mapa do jogador
   calado é o defeito mais caro deste repo. */
export function mapaDaSessao({ urlMap, savedMap, pinned, oficina = false } = {}) {
  const guarda = (id, origem) => {
    const alvo = resolveMapId(id);
    if (!oficina && MAPAS_PARADOS.has(alvo)) {
      console.warn(`[mapas] '${alvo}' está parado para retrabalho (${origem}); abrindo '${DEFAULT_MAP}'. Use ?oficina=1 para jogá-lo assim mesmo.`);
      return DEFAULT_MAP;
    }
    return alvo;
  };
  if (urlMap) return guarda(urlMap, '?map=');
  if (pinned) return guarda(savedMap, 'mapa fixado');
  return nextMapId(savedMap);
}

export const ehMapaJavaporcos = id => MAPS[resolveMapId(id)]?.objectiveMode === 'horde';
