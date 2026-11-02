/* ============================================================================
   javaporcos-check.mjs — A HORDA É GIGANTE, AGRESSIVA, PISA NO CHÃO E FAZ BARULHO

   O dono jogou a primeira versão do modo e reprovou em sete frentes (28-29/10/2026).
   Quatro delas são desta régua:

     "vem muito pouco javaporco, eles tem que ser mais agressivo e vir em ordas gigantes"
     "quanto mais javaporco mata, mais javaporco vem e mais agressivos eles ficam"
     "o javaporco tava indo por baixo da terra, está errado"
     "tem que fazer barulho de javaporco rosnando e também morrendo"
     "seria legal pôr lixos e alimentos pros javaporcos revirarem a cidade toda"

   O QUE ESTAVA MEDIDO ANTES: só a contabilidade da onda (pontos, assistência, placar,
   snapshot). Nada media quantos bichos entram na tela, a que distância eles reagem, se
   andam PARA o alvo, se o corpo acompanha o relevo, nem se alguém toca som. Era possível
   zerar o modo inteiro — horda de 8, raio de 7 m, bicho enterrado, mudo — com a régua
   verde. É por isso que esta régua cresceu de 8 para 20 cláusulas.

   DUAS CAMADAS
   1. PURA: as funções de estado da horda (contagem, fúria, alvo, comida) rodam sem cena.
   2. INTEGRADA: o modo de verdade (`criarInvasaoJavaporcos`) roda contra um MUNDO FALSO
      que implementa o contrato do mapa (groundHeightAt com barranco e calçada, waypoints,
      boarEntrances, foodSpots com `r`, hordeObjectives, cityBounds) e um JOGO FALSO cujo
      `_moveEntity` copia a conta de rumo do game.js:6553 ("wish = right*ax + forward*az")
      e DEIXA `pos.y` em 0 de propósito — é o modo que tem de aterrar o bicho.
      O arnês real (tools/eval/harness.mjs) não serve aqui: ele carrega os 20 mapas do
      registro, e esta régua precisa rodar em 0,2 s mesmo com o mapa da invasão em obras.

   PERF: o teto de 64 vivos simultâneos é medido em tools/eval/javaporcos-perf.mjs
   (jogo real, mapa real). Esta régua só cobra que o teto é respeitado e alcançado.

   MUTANTES (cada cláusula nova tem o seu; `--mutante=X` tem de deixar a régua VERMELHA):
     horda-magra      onda rala e teto de 24 (o estado que o dono reprovou)
     sem-furia        fúria congelada em 0
     furia-infinita   fúria sem teto (vira injogável)
     focinho-curto    raio de agressão de volta aos 7 m, sem manada
     ignora-comida    a horda pula o lixo e vai direto ao objetivo
     bicho-enterrado  o corpo para de acompanhar o groundHeightAt
     pivo-solto       o modelo perde a compensação de pivô e afunda a pata
     rumo-invertido   o bicho anda de costas (o bug de convenção de yaw)
     sem-investida    o ariete não dá mais o arranco
     morte-muda       o abate não chama o sfx.javaporco
     duplica-assistencia / sem-morte   (mutantes antigos, preservados)

   DOMÍNIO (dono, 30/10/2026): "os javaporcos querem DOMINAR o mapa". Os três objetivos
   com vida saíram; domínio é territorial e derrota exige todos os defensores mortos.
     dominio-surdo    setor nunca é tomado (controle não sobe)
     sem-retomada     defensor dentro do setor não devolve o controle
     sem-derrota      time inteiro morto não encerra a partida
     setor-cego       a horda não procura setor para tomar
     todo-lado        a horda volta a nascer nas dez bocas, não nas 3 frentes
     sem-rota         o bicho ignora a rota da trilha e corta direto
     beco-fechado     nenhum bicho entra pelo beco a partir da onda 3
     relogio-parado   a fúria para de crescer com o tempo de partida
     mapa-mudo        o HUD perde a % de domínio e o mini-mapa
     rede-sem-dominio o snapshot deixa de levar o controle por setor
     onda-eterna      onda com bicho escondido nunca acaba (o relógio da onda é ignorado)
   ============================================================================ */
import assert from 'node:assert/strict';

/* DOM mínimo: o HUD da horda só existe com `document`, e a fúria tem de aparecer nele. */
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.document = {
  createElement: () => ({ style: {}, textContent: '', append() {}, remove() {} }),
};

const { THREE } = await import('./three-node.mjs');
const {
  WAVE_COUNTS, MAX_ALIVE, BOAR_POINTS, BOAR_HP, FURIA, AGGRO, DASH, SPAWN_BASE,
  DOMINIO, BECO, FRENTES, passoDominio, lerHorda, gradeDeSetores, setorEm, vaiPeloBeco,
  criarHorda, iniciarOnda, passoHorda, registrarDano, registrarAbate,
  snapshotHorda, poseMorteJavaporco, escolherAlvo, atacarComida, comidaRestante,
  recalcularFuria, cadenciaDeSpawn, velocidadeDoJavaporco, danoDoJavaporco, raioDeAgressao,
  alturaDoChao, espacializarJavaporco, registrarModeloJavaporco, criarInvasaoJavaporcos,
} = await import('../../public/js/mode_javaporcos.js');
const { encodeSnapshot, decodeSnapshot } = await import('../../public/js/netcodec.js');
const { MODELOS_JAVAPORCOS, varianteJavaporco } = await import('../../public/js/data/javaporcos_modelos.js');

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
let falhas = 0;
const regra = (nome, fn) => {
  try { fn(); console.log(`✓ ${nome}`); }
  catch (erro) { falhas++; console.error(`✗ ${nome}: ${erro.message}`); }
};

/* ---------------------------------------------------------------- mundo falso */
const CHAO = (x, z) => {
  if (x > 8) return Math.min(2.4, (x - 8) * 0.2);     // barranco na borda leste
  if (Math.abs(z) < 3) return 0.15;                   // calçada
  return 0;
};

/* Contrato `world.horda` que o mapa novo exporta: 3 frentes com rota, 2 becos, 4 setores. */
const HORDA_FALSA = {
  frentes: [
    { id: 'norte', nome: 'Trilha norte', boca: { x: -8, z: -20 }, rota: [{ x: -8, z: -29 }, { x: -8, z: -24 }, { x: -8, z: -20 }] },
    { id: 'sul', nome: 'Trilha sul', boca: { x: 8, z: 20 }, rota: [{ x: 8, z: 29 }, { x: 8, z: 20 }] },
    { id: 'leste', nome: 'Trilha leste', boca: { x: 20, z: 2 }, rota: [{ x: 29, z: 2 }, { x: 24, z: 6 }, { x: 20, z: 2 }] },
  ],
  becos: [
    { id: 'beco-sul', nome: 'Beco do varal', de: { x: -12, z: 20 }, ate: { x: -12, z: 8 }, abreNaOnda: 3 },
    { id: 'beco-leste', nome: 'Beco do botijão', de: { x: 20, z: -10 }, ate: { x: 8, z: -10 }, abreNaOnda: 3 },
  ],
  setores: [
    { id: 'no', nome: 'Noroeste', x0: -18, z0: -18, x1: 0, z1: 0, peso: 1 },
    { id: 'ne', nome: 'Nordeste', x0: 0, z0: -18, x1: 18, z1: 0, peso: 1 },
    { id: 'so', nome: 'Sudoeste', x0: -18, z0: 0, x1: 0, z1: 18, peso: 1 },
    { id: 'se', nome: 'Sudeste', x0: 0, z0: 0, x1: 18, z1: 18, peso: 1 },
  ],
};

function mundoFalso({ horda = false } = {}) {
  const nodes = [], index = new Map();
  for (let z = -30; z <= 30; z += 1.5) for (let x = -30; x <= 30; x += 1.5) {
    const px = Number(x.toFixed(2)), pz = Number(z.toFixed(2));
    index.set(`${px},${pz}`, nodes.length);
    nodes.push({ x: px, z: pz, y: CHAO(px, pz) });
  }
  const adj = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) for (const [dx, dz] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
    const j = index.get(`${Number((nodes[i].x + dx).toFixed(2))},${Number((nodes[i].z + dz).toFixed(2))}`);
    if (j !== undefined) adj[i].push(j);
  }
  const nearestWaypoint = (x, z) => {
    let melhor = 0, distancia = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2;
      if (d < distancia) { distancia = d; melhor = i; }
    }
    return melhor;
  };
  const findPath = (de, para) => {
    const prev = new Int32Array(nodes.length).fill(-1), fila = [de];
    prev[de] = de;
    for (let q = 0; q < fila.length; q++) for (const viz of adj[fila[q]]) if (prev[viz] === -1) {
      prev[viz] = fila[q];
      if (viz === para) { const caminho = [viz]; for (let cur = fila[q]; cur !== de; cur = prev[cur]) caminho.unshift(cur); caminho.unshift(de); return caminho; }
      fila.push(viz);
    }
    return [de];
  };
  const foodSpots = [
    { id: 'lixo-a', x: -6, z: 4, hp: 90, kind: 'lixo', r: 0.85 },
    { id: 'lixo-b', x: 5, z: -6, hp: 90, kind: 'lixo', r: 0.85 },
    { id: 'feira', x: 0, z: 9, hp: 150, kind: 'feira', r: 1.3 },
    { id: 'cacamba', x: -11, z: -9, hp: 220, kind: 'cacamba', r: 1.9 },
    { id: 'racao', x: 9, z: 11, hp: 120, kind: 'racao', r: 0.9 },
    { id: 'lixo-c', x: 12, z: -2, hp: 90, kind: 'lixo', r: 0.85 },
  ];
  const meshes = new Map(foodSpots.map((spot) => [spot.id, new THREE.Group()]));
  /* Um muro de 12 m entre a mata e a feira: é contra ele que se mede o contorno.
     A grade de waypoints ATRAVESSA o muro de propósito — mapa real também costura
     aresta por dentro de parede (0,7% das arestas do mapa da invasão, medido). */
  const colliders = [{ minX: -6, maxX: 6, minZ: 13.4, maxZ: 14.2, minY: 0, maxY: 3 }];
  return {
    mode: 'horde', root: new THREE.Group(), colliders, occluders: [], pickups: [],
    groundHeightAt: CHAO,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    boarEntrances: [
      { x: -24, z: 28 }, { x: -8, z: 29 }, { x: 8, z: 29 }, { x: 24, z: 28 },
      { x: -24, z: -28 }, { x: 0, z: -29 }, { x: 24, z: -28 },
      { x: -29, z: -6 }, { x: -29, z: 8 }, { x: 29, z: 2 },
    ],
    hordeObjectives: [
      { id: 'praca', x: -14, z: 0, hp: 1000 },
      { id: 'mercado', x: 10, z: 6, hp: 1000 },
      { id: 'posto', x: 2, z: -14, hp: 1000 },
    ],
    foodSpots,
    foodMesh: (id) => meshes.get(id) || null,
    cityBounds: { minX: -18, maxX: 18, minZ: -18, maxZ: 18 },
    bounds: { minX: -31, maxX: 31, minZ: -31, maxZ: 31 },
    ...(horda ? { horda: structuredClone(HORDA_FALSA) } : {}),
  };
}

/* ------------------------------------------------------------------ jogo falso */
const VEL_BASE = 5.35;   // PLAYER_SPEED do game.js; a faca tem MOVE_MUL 1,0

function jogoFalso({ mundo = mundoFalso(), jogadorEm = [0, 0] } = {}) {
  const sons = [], eventos = [], danos = [];
  const player = {
    isPlayer: true, team: 'E', alive: true, hp: 100, yaw: 0, def: { id: 'sertanejo' },
    _playerId: 'defensor', pos: new THREE.Vector3(jogadorEm[0], CHAO(jogadorEm[0], jogadorEm[1]), jogadorEm[1]),
  };
  const semente = {
    isPlayer: false, team: 'B', def: { id: 'javaporco' }, alive: false, hp: 0, yaw: 0,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    mesh: { group: new THREE.Group(), isGLB: false, parts: {} },
    _objectiveNpc: 'javaporco',
  };
  const game = {
    world: mundo, scene: new THREE.Scene(), camera: { position: new THREE.Vector3() },
    time: 0, state: 'live', online: false, dedicated: false, matchSeed: 7,
    player, bots: [semente], combatants: [player, semente],
    el: { hud: { dataset: {}, append() {} } },
    sfx: { javaporco(kind, vol = 1, pan = 0, delay = 0) { sons.push({ kind, vol, pan, delay }); return true; } },
    _damage(ent, dano, autor, arma) { danos.push({ ent, dano, autor, arma }); ent.hp -= dano; },
    _endRound() {},
    _showScoreboard() {},
    _objectiveEvent(evento) { eventos.push(evento); },
    /* Mesma conta do game.js:6553 (wish = right*ax + forward*az) e o mesmo empurrão de
       colisor do game.js:6016. `pos.y` fica em 0 de propósito: aterrar é do modo. */
    _moveEntity(bot, inp, dt) {
      const sin = Math.sin(bot.yaw), cos = Math.cos(bot.yaw);
      const wx = inp.ax * cos + inp.az * sin, wz = -inp.ax * sin + inp.az * cos;
      bot.pos.x += wx * VEL_BASE * dt;
      bot.pos.z += wz * VEL_BASE * dt;
      bot.pos.y = 0;
      const r = 0.38;
      for (const c of mundo.colliders) {
        const nx = Math.max(c.minX, Math.min(bot.pos.x, c.maxX));
        const nz = Math.max(c.minZ, Math.min(bot.pos.z, c.maxZ));
        const dx = bot.pos.x - nx, dz = bot.pos.z - nz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 < 1e-8) { bot.pos.x += r; continue; }
        const d = Math.sqrt(d2), push = (r - d) / d;
        bot.pos.x += dx * push; bot.pos.z += dz * push;
      }
      return { sp: VEL_BASE, walking: false, sprint: false };
    },
  };
  const modo = criarInvasaoJavaporcos(game);
  modo.state.mutante = mutante;
  return { game, modo, sons, eventos, danos, player };
}

const passo = (ctx, dt) => {
  ctx.game.time += dt;
  ctx.modo.update(dt);
  for (const bot of ctx.modo.boars) ctx.modo.updateBot(bot, dt);
};
const vivos = (modo) => modo.boars.filter((bot) => bot._boarId && bot.alive);
regra('um sobrevivente mantém a resistência; wipe encerra a invasão', () => {
  const ctx=jogoFalso(), aliado={...ctx.player,isPlayer:false,pos:ctx.player.pos.clone()};
  ctx.game.combatants.push(aliado);ctx.player.alive=false;
  ctx.modo.update(.016);assert.equal(ctx.modo.state.winner,null);
  aliado.alive=false;ctx.modo.update(.016);assert.equal(ctx.modo.state.winner,'J');
});
/* Bicho já fora da trilha: as cláusulas de rumo, comida e muro medem o comportamento na cidade. */
const soltar = (bots) => { for (const bot of bots) { bot._boarPasso = bot._boarPlano?.length || 0; bot._boarExplorarAte = 0; } };
/* 2,5 s de onda: a cadência base é um bicho a cada 0,18 s, então um quadro só não
   enche bando nenhum e as cláusulas de bando mediriam o vazio. */
const abrirOnda = (ctx, segundos = 2.5) => {
  iniciarOnda(ctx.modo.state);
  for (let i = 0; i < Math.round(segundos * 60); i++) passo(ctx, 1 / 60);
};

/* ---------------------------------------------------------------- horda gigante */
regra('oito ondas gigantes: 24 na primeira, 150 na última, 618 no total', () => {
  assert.deepEqual([...WAVE_COUNTS], [24, 36, 48, 64, 80, 96, 120, 150]);
  assert.equal(WAVE_COUNTS.reduce((t, n) => t + n, 0), 618);
  for (let i = 1; i < WAVE_COUNTS.length; i++)
    assert.ok(WAVE_COUNTS[i] > WAVE_COUNTS[i - 1], `onda ${i + 1} não cresceu`);
  assert.ok(WAVE_COUNTS[0] >= 24, `primeira onda ainda rala: ${WAVE_COUNTS[0]}`);
  assert.equal(MAX_ALIVE, 64);
  /* 618 bichos na partida só são jogáveis com vida baixa: 70 de vida = três tiros de
     fuzil no corpo. Horda gigante com esponja de bala vira sessão de recarga. */
  assert.ok(BOAR_HP.jovem <= 90 && BOAR_HP.adulto <= 150, `javaporco comum virou esponja: ${BOAR_HP.jovem}/${BOAR_HP.adulto}`);
  assert.ok(BOAR_HP.ariete >= 600, `ariete fraco demais para ser o peso da onda: ${BOAR_HP.ariete}`);
});

regra('vinte sementes fecham as oito ondas, enchem o teto de 64 e nunca passam dele', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const horda = criarHorda({ seed, mutante });
    let pico = 0;
    for (let onda = 1; onda <= 8; onda++) {
      iniciarOnda(horda);
      let guarda = 0;
      while (horda.phase === 'combat' && guarda++ < 40000) {
        passoHorda(horda, 0.1);
        pico = Math.max(pico, horda.alive.length);
        /* Defesa realista: ~3,3 abates por segundo. Matar mais rápido do que a horda
           nasce (5,5/s na fúria zero) seria medir um teto que nunca enche. */
        if (guarda % 3 === 0 && horda.alive.length) registrarAbate(horda, horda.alive[0].id, 'defensor', mutante);
      }
      assert.ok(guarda < 40000, `onda ${onda} travou na semente ${seed}`);
    }
    assert.equal(horda.winner, 'E');
    assert.ok(pico <= horda.maxAlive, `pico ${pico} passou do teto ${horda.maxAlive} na semente ${seed}`);
    assert.ok(pico >= 48, `horda rala: pico de só ${pico} vivos na semente ${seed}`);
    assert.ok(horda.teamBonus >= 15000, `bônus final incompleto na semente ${seed}`);
  }
});

regra('as três frentes entram no rodízio e os IDs são estáveis', () => {
  const a = criarHorda({ seed: 319, mutante });
  const b = criarHorda({ seed: 319, mutante });
  iniciarOnda(a); iniciarOnda(b);
  passoHorda(a, 2); passoHorda(b, 2);
  assert.deepEqual(snapshotHorda(a), snapshotHorda(b));
  assert.equal(FRENTES, 3);
  assert.deepEqual(new Set(a.alive.map((animal) => animal.entrance)), new Set([0, 1, 2]));
});

regra('as ondas reais alcançam todas as oito aparências', () => {
  const horda = criarHorda({ seed: 319 }), vistas = new Set();
  const pools = { jovem: ['jovem','listrado'], adulto: ['adulto','malhado','ruivo'], matriarca: ['matriarca','velho'], ariete: ['ariete'] };
  for(let onda=0;onda<8;onda++) {
    iniciarOnda(horda);let guarda=0;
    while(horda.remaining>0&&guarda++<10000) {
      passoHorda(horda,.25);
      for(const a of [...horda.alive]) {
        const n=Number(a.id.split('.')[1]),v=mutante==='variantes-correlacionadas'?pools[a.type][n%pools[a.type].length]:varianteJavaporco(a.type,n);
        vistas.add(v);registrarAbate(horda,a.id,'defensor');
      }
    }
    assert.ok(guarda<10000,'onda travada');
  }
  assert.deepEqual([...vistas].sort(),Object.keys(MODELOS_JAVAPORCOS).sort());
});

regra('dois clientes fecham as oito ondas com o mesmo estado', () => {
  const clientes = [criarHorda({ seed: 551, mutante }), criarHorda({ seed: 551, mutante })];
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

/* --------------------------------------------------------------------- fúria */
regra('fúria cresce com abate e com onda, e os três efeitos andam junto', () => {
  const horda = criarHorda({ seed: 3, mutante });
  iniciarOnda(horda);
  const zero = horda.fury;
  const cadenciaZero = cadenciaDeSpawn(horda), velocidadeZero = velocidadeDoJavaporco(horda, 'adulto');
  const danoZero = danoDoJavaporco(horda, 'adulto', 'jogador');
  for (let i = 0; i < 300; i++) { passoHorda(horda, 0.2); if (i % 2 === 0 && horda.alive.length) registrarAbate(horda, horda.alive[0].id, 'defensor', mutante); }
  assert.ok(horda.kills >= 30, `só ${horda.kills} abates no trecho medido`);
  assert.ok(horda.fury > zero + 0.1, `fúria não subiu com abate: ${zero} → ${horda.fury}`);
  assert.ok(cadenciaDeSpawn(horda) < cadenciaZero * 0.95, 'cadência de spawn não acelerou com a fúria');
  assert.ok(velocidadeDoJavaporco(horda, 'adulto') > velocidadeZero * 1.02, 'velocidade não subiu com a fúria');
  assert.ok(danoDoJavaporco(horda, 'adulto', 'jogador') > danoZero * 1.02, 'dano não subiu com a fúria');
  assert.equal(cadenciaDeSpawn(horda), SPAWN_BASE / (1 + horda.fury * FURIA.cadencia));
});

regra('fúria tem teto explícito: 500 abates não deixam o modo injogável', () => {
  const horda = criarHorda({ seed: 4, mutante });
  horda.wave = 8;
  horda.kills = 500;
  recalcularFuria(horda);
  assert.ok(horda.fury <= FURIA.teto + 1e-9, `fúria estourou o teto: ${horda.fury}`);
  assert.ok(horda.fury >= FURIA.teto - 1e-9, `fúria não alcança o teto nem com 500 abates: ${horda.fury}`);
  assert.ok(velocidadeDoJavaporco(horda, 'jovem') < 1.6, 'javaporco mais rápido que 1,6× o jogador');
  assert.ok(cadenciaDeSpawn(horda) >= 0.05, 'spawn mais rápido que 20 bichos por segundo');
});

/* ----------------------------------------------------------------- agressão */
regra('bando saqueia sem provocação e alerta estica até 34 m', () => {
  const mundo = mundoFalso();
  const estado = criarHorda({ seed: 5, mutante });
  estado.wave = 1;
  const jogador = { alive: true, team: 'E', _playerId: 'defensor', pos: { x: 0, z: 0 } };
  const bicho = { pos: { x: 0, z: 16 }, _boarType: 'adulto' };
  assert.ok(raioDeAgressao(estado) >= 18, `raio base pequeno demais: ${raioDeAgressao(estado)}`);
  assert.notEqual(escolherAlvo(bicho, { world: mundo, state: estado, jogadores: [jogador], tempo: 1 }).kind, 'jogador');
  const longe = { pos: { x: 0, z: 30 }, _boarType: 'adulto' };
  assert.notEqual(escolherAlvo(longe, { world: mundo, state: estado, jogadores: [jogador], tempo: 1 }).kind, 'jogador');
  longe._boarAlertaAte = 5;   // ouviu tiro (game.js `_botOuve`) ou foi puxado pela manada
  assert.equal(escolherAlvo(longe, { world: mundo, state: estado, jogadores: [jogador], tempo: 1 }).kind, 'jogador');
  assert.ok(AGGRO.ouvido >= 30 && AGGRO.visao >= 18, 'constantes de agressão encolheram');
});

regra('mordida respeita parede fechada e passa pela porta aberta', () => {
  const ctx = jogoFalso({ jogadorEm: [.6, 0] });
  ctx.modo.assignar({ id: 'qa.parede', type: 'adulto', hp: 70, entrance: 0 });
  const bot = vivos(ctx.modo)[0];
  soltar([bot]); bot.pos.set(-.6, CHAO(-.6, 0), 0); bot._boarAttackAt = 0;
  const parede = new THREE.Mesh(new THREE.BoxGeometry(.2, 3, 4), new THREE.MeshBasicMaterial());
  parede.position.y = 1.5; parede.updateMatrixWorld(true);
  ctx.game.world.occluders = [parede];
  ctx.modo.listarJogadores();
  ctx.modo.updateBot(bot, 1 / 60);
  assert.equal(ctx.danos.length, 0, 'mordeu o defensor através da parede');
  ctx.game.world.occluders = [];
  bot.pos.set(-.6, CHAO(-.6, 0), 0); bot._boarAttackAt = 0;
  ctx.modo.updateBot(bot, 1 / 60);
  assert.equal(ctx.danos.length, 1, 'não mordeu pelo vão aberto');
});

regra('manada: quem vê o jogador puxa o vizinho de 9 m para a perseguição', () => {
  const ctx = jogoFalso({ jogadorEm: [0, 0] });
  abrirOnda(ctx);
  const bando = vivos(ctx.modo);
  assert.ok(bando.length >= 2, 'onda não abriu bichos suficientes');
  const [lider, vizinho] = bando;
  lider.pos.set(0, 0, 10); vizinho.pos.set(4, 0, 12);
  lider._boarAlertaAte = ctx.game.time + 3;
  vizinho._boarAlertaAte = 0;
  ctx.modo.manadaAte = 0;
  ctx.modo.propagarManada(ctx.game.time);
  assert.ok(vizinho._boarAlertaAte > ctx.game.time, 'vizinho não foi puxado pela manada');
  const distante = bando[2];
  if (distante) {
    distante.pos.set(0, 0, 28);
    distante._boarAlertaAte = 0;
    ctx.modo.manadaAte = 0;
    ctx.modo.propagarManada(ctx.game.time);
    assert.ok(!(distante._boarAlertaAte > ctx.game.time), 'manada contagiou o mapa inteiro');
  }
});

regra('ariete investe entre 4 e 12 m e anuncia a carga', () => {
  const ctx = jogoFalso({ jogadorEm: [0, 0] });
  abrirOnda(ctx);
  const bicho = vivos(ctx.modo)[0];
  bicho._boarType = 'ariete';
  bicho._boarDashLivre = 0;
  ctx.sons.length = 0;
  const alvo = { kind: 'jogador', x: 0, z: 0, ent: ctx.player, distance: 8 };
  assert.equal(ctx.modo.investir(bicho, alvo, ctx.game.time), true, 'ariete não investiu a 8 m');
  assert.ok(bicho._boarDashAte > ctx.game.time, 'investida não durou nada');
  assert.ok(ctx.sons.some((s) => s.kind === 'carga'), 'investida saiu muda');
  assert.equal(ctx.modo.investir(bicho, alvo, ctx.game.time), false, 'investida sem espera entre arrancos');
  assert.equal(ctx.modo.investir(bicho, { ...alvo, distance: 30 }, ctx.game.time + DASH.espera + 1), false, 'ariete investiu de 30 m');
  const jovem = vivos(ctx.modo)[1];
  jovem._boarType = 'jovem'; jovem._boarDashLivre = 0;
  assert.equal(ctx.modo.investir(jovem, alvo, ctx.game.time), false, 'bicho comum ganhou investida de ariete');
});

/* --------------------------------------------------------------------- comida */
regra('a horda revira o LIXO antes de bater no objetivo', () => {
  const mundo = mundoFalso();
  const estado = criarHorda({ seed: 6, mutante });
  estado.wave = 2;
  const bicho = { pos: { x: -6, z: 10 }, _boarType: 'adulto' };
  const primeiro = escolherAlvo(bicho, { world: mundo, state: estado, jogadores: [], tempo: 1 });
  assert.equal(primeiro.kind, 'comida', `sem jogador por perto o alvo foi ${primeiro.kind}`);
  assert.ok(primeiro.raio > 0 && primeiro.raio <= 2.2, `raio de focinhada estranho: ${primeiro.raio}`);
  for (const spot of mundo.foodSpots) atacarComida(estado, spot, 9999);
  assert.equal(estado.foodRevirada, mundo.foodSpots.length, 'contador de cidade revirada não fechou');
  const depois = escolherAlvo(bicho, { world: mundo, state: estado, jogadores: [], tempo: 1 });
  assert.ok(['setor', 'vagar'].includes(depois.kind), `com o lixo revirado a horda tinha de ir tomar setor, foi ${depois.kind}`);
});

regra('focinhar gasta o ponto de comida e o bicho só sai quando acaba', () => {
  const ctx = jogoFalso({ jogadorEm: [26, 26] });
  abrirOnda(ctx);
  const bicho = vivos(ctx.modo)[0];
  soltar(vivos(ctx.modo));
  const spot = ctx.game.world.foodSpots[0];
  bicho.pos.set(spot.x, 0, spot.z);
  bicho._boarAttackAt = 0;
  const cheio = comidaRestante(ctx.modo.state, spot);
  for (let i = 0; i < 180; i++) passo(ctx, 1 / 60);
  const restante = comidaRestante(ctx.modo.state, spot);
  assert.ok(restante < cheio, `lixo intacto depois de 3 s: ${restante}/${cheio}`);
  assert.ok(ctx.eventos.some((e) => e.k === 'FOOD_HIT'), 'nenhum evento de revirada foi emitido');
});

/* ----------------------------------------------------------------------- chão */
regra('o corpo segue o groundHeightAt do mapa e nunca fica abaixo dele', () => {
  const ctx = jogoFalso({ jogadorEm: [0, 0] });
  abrirOnda(ctx);
  for (let i = 0; i < 240; i++) passo(ctx, 1 / 60);
  const bando = vivos(ctx.modo);
  assert.ok(bando.length >= 8, `só ${bando.length} bichos vivos para medir`);
  let piorFolga = 0, alturasDiferentes = new Set();
  for (const bot of bando) {
    const chao = CHAO(bot.pos.x, bot.pos.z);
    piorFolga = Math.max(piorFolga, Math.abs(bot.pos.y - chao));
    alturasDiferentes.add(Math.round(chao * 100));
    assert.ok(bot.pos.y >= chao - 1e-6, `javaporco por baixo da terra em (${bot.pos.x.toFixed(1)}, ${bot.pos.z.toFixed(1)}): y=${bot.pos.y.toFixed(3)} chão=${chao.toFixed(3)}`);
  }
  assert.ok(piorFolga < 1e-6, `corpo descolado do chão: ${piorFolga.toFixed(4)} m`);
  assert.ok(alturasDiferentes.size >= 2, 'a amostra não passou por relevo nenhum — medida sem valor');
  assert.equal(alturaDoChao({}, 1, 2), 0, 'mapa sem groundHeightAt tem de cair em 0');
  assert.equal(alturaDoChao(ctx.game.world, 18, 0), CHAO(18, 0));
});

regra('a pata encosta no chão mesmo com o pivô do GLB fora do lugar', () => {
  const molde = new THREE.Group();
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 2), new THREE.MeshBasicMaterial());
  molde.add(corpo);   // centro na origem: o pivô do GLB fica 0,7 m acima da pata
  registrarModeloJavaporco('jovem', molde);
  const ctx = jogoFalso({ jogadorEm: [0, 0] });
  abrirOnda(ctx);
  for (let i = 0; i < 120; i++) passo(ctx, 1 / 60);
  const bando = vivos(ctx.modo).filter((bot) => !(bot._boarFocinhoAte > ctx.game.time));
  assert.ok(bando.length >= 4, 'sem bichos em marcha para medir a pata');
  const caixa = new THREE.Box3();
  for (const bot of bando) {
    bot._boarVisual.updateMatrixWorld(true);
    const base = caixa.setFromObject(bot._boarVisual).min.y;
    const chao = CHAO(bot.pos.x, bot.pos.z);
    assert.ok(base >= chao - 0.01, `modelo enterrado ${(chao - base).toFixed(3)} m`);
    assert.ok(base <= chao + 0.06, `modelo flutuando ${(base - chao).toFixed(3)} m`);
  }
  registrarModeloJavaporco('jovem', null);
});

regra('o bando anda PARA o alvo, não de costas', () => {
  const ctx = jogoFalso({ jogadorEm: [60, 60] });
  abrirOnda(ctx);
  const bando = vivos(ctx.modo);
  soltar(bando);
  const antes = bando.map((bot) => {
    const alvo=escolherAlvo(bot,{world:ctx.game.world,state:ctx.modo.state,jogadores:[],tempo:ctx.game.time});
    return {chave:alvo.chave,distancia:alvo.distance,ganho:0};
  });
  for (let i = 0; i < 120; i++) {
    passo(ctx, 1 / 60);
    bando.forEach((bot,k)=>{
      const alvo=bot._boarAlvo;if(!bot._boarId||!alvo)return;
      const distancia=Math.hypot(alvo.x-bot.pos.x,alvo.z-bot.pos.z),anterior=antes[k];
      if(alvo.chave===anterior.chave)anterior.ganho+=anterior.distancia-distancia;
      anterior.chave=alvo.chave;anterior.distancia=distancia;
    });
  }
  let aproximaram = 0, ganhoMedio = 0;
  bando.forEach((bot, i) => {
    if (!bot._boarId) return;
    ganhoMedio += antes[i].ganho;
    if (antes[i].ganho > 4) aproximaram++;
  });
  ganhoMedio /= Math.max(1, bando.length);
  assert.ok(aproximaram >= Math.ceil(bando.length * 0.7), `só ${aproximaram}/${bando.length} fecharam distância em 2 s`);
  assert.ok(ganhoMedio > 4, `avanço médio de só ${ganhoMedio.toFixed(2)} m em 2 s`);
});

regra('muro atravessado pela grade: o javaporco contorna em vez de empurrar tijolo', () => {
  const ctx = jogoFalso({ jogadorEm: [60, 60] });
  abrirOnda(ctx, 1);
  const bicho = vivos(ctx.modo)[0];
  assert.ok(bicho, 'onda não abriu nenhum javaporco');
  soltar([bicho]);
  bicho.pos.set(0, 0, 18);                       // atrás do muro (z 13,4-14,2), comida do outro lado
  bicho.yaw = Math.PI;
  const spot = ctx.game.world.foodSpots[2];
  const alvo = { kind: 'comida', chave: spot.id, spot, x: spot.x, z: spot.z, raio: spot.r };
  let maisFundo = bicho.pos.z;
  for (let i = 0; i < 60 * 10; i++) {
    ctx.game.time += 1 / 60;
    if (Math.hypot(bicho.pos.x - spot.x, bicho.pos.z - spot.z) <= spot.r) ctx.modo.revirar(bicho, alvo, ctx.game.time);
    else ctx.modo.moverPara(bicho, alvo, 1 / 60);
    maisFundo = Math.min(maisFundo, bicho.pos.z);
  }
  assert.ok(maisFundo < 13.4, `empacou no muro: chegou só a z=${maisFundo.toFixed(2)} em 10 s`);
  assert.ok(comidaRestante(ctx.modo.state, ctx.game.world.foodSpots[2]) < 150, 'passou do muro mas não comeu a feira');
});

regra('alvo cercado não prende o bando: ele desiste do ponto e vai tomar setor', () => {
  const mundo = mundoFalso();
  const preso = mundo.foodSpots[0];               // lixo-a (-6, 4), cercado por quatro muros
  for (const [dx, dz, w, d] of [[0, 2.2, 4.4, .4], [0, -2.2, 4.4, .4], [2.2, 0, .4, 4.4], [-2.2, 0, .4, 4.4]])
    mundo.colliders.push({ minX: preso.x + dx - w / 2, maxX: preso.x + dx + w / 2, minZ: preso.z + dz - d / 2, maxZ: preso.z + dz + d / 2, minY: 0, maxY: 3 });
  for (const spot of mundo.foodSpots.slice(1)) spot.hp = 1;
  const ctx = jogoFalso({ mundo, jogadorEm: [60, 60] });
  abrirOnda(ctx, 2);
  const bando = vivos(ctx.modo);
  soltar(bando);
  for (const spot of mundo.foodSpots.slice(1)) atacarComida(ctx.modo.state, spot, 9999);
  for (const bot of bando) {
    bot.pos.set(preso.x + 3.2, 0, preso.z + .5);
    bot._boarComidaId = preso.id; bot._boarEvitar = null; bot._boarRumo = null;
    bot._boarCansaco = 0; bot._boarMelhorEm = ctx.game.time; bot._boarAlvoChave = null;
  }
  const desistiu = new Set();
  for (let i = 0; i < 60 * 20; i++) {
    passo(ctx, 1 / 60);
    for (const bot of bando) if (bot._boarEvitar?.has(`c:${preso.id}`)
      && ['setor', 'vagar'].includes(bot._boarAlvo?.kind)) desistiu.add(bot);
  }
  assert.ok(comidaRestante(ctx.modo.state, preso) > 0, 'o ponto cercado foi comido através do muro');
  assert.ok(desistiu.size >= Math.ceil(bando.length * 0.8), `só ${desistiu.size}/${bando.length} largaram o ponto cercado e foram tomar setor em 20 s`);
});

/* -------------------------------------------------------------------- domínio */
regra('setor com 3 bichos e sem defensor é tomado; defensor sozinho retoma; disputa congela', () => {
  const setores = HORDA_FALSA.setores;
  const horda = criarHorda({ seed: 21, setores: setores.length, mutante });
  const um = (b, d) => passoDominio(horda, setores, [b, 0, 0, 0], [d, 0, 0, 0], 1);
  for (let t = 0; t < 10; t++) um(DOMINIO.minBichos - 1, 0);
  assert.equal(horda.controle[0], 0, `${DOMINIO.minBichos - 1} bichos já tomam setor`);
  for (let t = 0; t < Math.ceil(1 / DOMINIO.sobe); t++) um(DOMINIO.minBichos, 0);
  assert.equal(horda.controle[0], 1, `setor não foi tomado em ${Math.ceil(1 / DOMINIO.sobe)} s: ${horda.controle[0]}`);
  assert.ok(Math.abs(horda.dominio - 0.25) < 1e-9, `domínio de 1 setor em 4 devia ser 25%: ${horda.dominio}`);
  um(5, 1);
  assert.equal(horda.controle[0], 1, 'setor disputado mudou de dono');
  for (let t = 0; t < 4; t++) um(0, 1);
  assert.ok(horda.controle[0] < 0.7, `defensor sozinho não retomou o setor: ${horda.controle[0]}`);
});

regra('domínio ponderado não encerra a partida', () => {
  const setores = [{ x0: 0, z0: 0, x1: 1, z1: 1, peso: 3 }, { x0: 1, z0: 0, x1: 2, z1: 1, peso: 1 }];
  const horda = criarHorda({ seed: 22, setores: 2, mutante });
  iniciarOnda(horda); passoHorda(horda, 1);
  for (let t = 0; t < Math.ceil(1 / DOMINIO.sobe) + 5 && !horda.winner; t++) passoDominio(horda, setores, [DOMINIO.minBichos, 0], [0, 0], 1);
  assert.ok(Math.abs(horda.dominio - 0.75) < 0.06, `setor de peso 3 em 4 devia valer 75%: ${horda.dominio}`);
  assert.equal(horda.winner, null);
  assert.equal(DOMINIO.max, 1);
});

regra('a horda vaga no setor, espalha pela lotação e toma a cidade sem defensor', () => {
  const ctx = jogoFalso({ mundo: mundoFalso({ horda: true }), jogadorEm: [60, 60] });
  abrirOnda(ctx, 2);
  for (const spot of ctx.game.world.foodSpots) atacarComida(ctx.modo.state, spot, 9999);
  let ocupados = 0;
  for (let i = 0; i < 60 * 70; i++) {
    passo(ctx, 1 / 60);
    if (i % 30) continue;
    const agora = new Set(vivos(ctx.modo).map((bot) => setorEm(HORDA_FALSA.setores, bot.pos.x, bot.pos.z)).filter((k) => k >= 0));
    ocupados = Math.max(ocupados, agora.size);
  }
  const avancados = ctx.modo.state.controle.filter((v) => v >= 0.5).length;
  assert.ok(avancados >= 3, `só ${avancados} setores passaram de 50% em 70 s de horda sem defensor`);
  assert.equal(ctx.modo.state.winner, null, 'ocupação territorial encerrou a partida');
  assert.ok(ocupados >= 3, `horda empilhada: no máximo ${ocupados} setores ocupados ao mesmo tempo`);
});

regra('a horda nasce nas 3 frentes do mapa e segue a rota da trilha até a cidade', () => {
  const ctx = jogoFalso({ mundo: mundoFalso({ horda: true }), jogadorEm: [60, 60] });
  iniciarOnda(ctx.modo.state);
  const inicios = HORDA_FALSA.frentes.map((f) => f.rota[0]);
  const leste = HORDA_FALSA.frentes[2].rota[1];         // dobra da trilha leste
  const nasceu = new Map(), perto = new Map();
  for (let i = 0; i < 60 * 6; i++) {
    passo(ctx, 1 / 60);
    for (const bot of vivos(ctx.modo)) {
      if (!nasceu.has(bot._boarId) && i < 60 * 1.5) nasceu.set(bot._boarId, { x: bot.pos.x, z: bot.pos.z });
      if (perto.has(bot._boarId) || Math.hypot(bot.pos.x - 29, bot.pos.z - 2) < 4) perto.set(bot._boarId, Math.min(perto.get(bot._boarId) ?? Infinity, Math.hypot(bot.pos.x - leste.x, bot.pos.z - leste.z)));
    }
  }
  assert.ok(nasceu.size >= 6, `só ${nasceu.size} bichos nasceram em 1,5 s`);
  const usadas = new Set();
  for (const p of nasceu.values()) {
    const d = inicios.map((q) => Math.hypot(q.x - p.x, q.z - p.z));
    const k = d.indexOf(Math.min(...d));
    assert.ok(d[k] < 4, `bicho nasceu fora das frentes em (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
    usadas.add(k);
  }
  assert.equal(usadas.size, 3, 'nem as 3 frentes entraram no rodízio');
  const passou = [...perto.values()].filter((d) => d < 3).length;
  assert.ok(perto.size >= 2 && passou >= Math.ceil(perto.size * 0.8), `só ${passou}/${perto.size} passaram pela dobra da trilha leste`);
  const fallback = lerHorda(mundoFalso());
  assert.equal(fallback.frentes.length, 3, 'sem world.horda o fallback não deu 3 frentes');
  const [a, b, c] = fallback.frentes.map((f) => f.plano[0]);
  assert.ok(Math.min(Math.hypot(a.x - b.x, a.z - b.z), Math.hypot(a.x - c.x, a.z - c.z), Math.hypot(b.x - c.x, b.z - c.z)) > 25, 'frentes de fallback coladas');
  assert.equal(fallback.becos.length, 0);
  assert.equal(fallback.setores.length, 16);
});

regra('a partir da onda 3 parte da horda entra pelo BECO e explora o quarteirão', () => {
  const pura = criarHorda({ seed: 5, becos: 2, mutante });
  for (const onda of [1, 2]) { pura.wave = onda; assert.ok(![...Array(60).keys()].some((o) => vaiPeloBeco(pura, o)), `beco aberto na onda ${onda}`); }
  pura.wave = BECO.abreNaOnda;
  const fatia = [...Array(200).keys()].filter((o) => vaiPeloBeco(pura, o)).length / 200;
  assert.ok(fatia >= 0.25 && fatia <= 0.55, `fração de beco fora da faixa: ${(fatia * 100).toFixed(0)}%`);
  const ctx = jogoFalso({ mundo: mundoFalso({ horda: true }), jogadorEm: [60, 60] });
  ctx.modo.state.wave = BECO.abreNaOnda - 1;
  iniciarOnda(ctx.modo.state);
  const viuBeco = new Set(), explorou = new Set(), becoBots = new Set();
  const seg = (b, p) => { const dx = b.ate.x - b.de.x, dz = b.ate.z - b.de.z, L = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((p.x - b.de.x) * dx + (p.z - b.de.z) * dz) / L)); return Math.hypot(b.de.x + dx * t - p.x, b.de.z + dz * t - p.z); };
  for (let i = 0; i < 60 * 25; i++) {
    passo(ctx, 1 / 60);
    for (const bot of vivos(ctx.modo)) {
      if (bot._boarExplorar) becoBots.add(bot._boarId);
      if (HORDA_FALSA.becos.some((b) => seg(b, bot.pos) < 2.2 && Math.hypot(bot.pos.x - b.de.x, bot.pos.z - b.de.z) > 2)) viuBeco.add(bot._boarId);
      if ((bot._boarExplorarAte || 0) > ctx.game.time) explorou.add(bot._boarId);
    }
  }
  assert.ok(becoBots.size >= 4, `só ${becoBots.size} bichos sorteados pro beco`);
  const dentro = [...becoBots].filter((id) => viuBeco.has(id)).length;
  assert.ok(dentro >= becoBots.size * 0.6, `só ${dentro}/${becoBots.size} bichos de beco andaram pelo corredor`);
  assert.ok(explorou.size >= becoBots.size * 0.5, `só ${explorou.size}/${becoBots.size} exploraram o quarteirão depois do beco`);
});

regra('onda que não é limpa no relógio não trava: a próxima vem com as sobras vivas', () => {
  const horda = criarHorda({ seed: 31, mutante });
  iniciarOnda(horda);
  let guarda = 0;
  while (horda.wave === 1 && guarda++ < 2000) passoHorda(horda, 0.1);
  assert.equal(horda.wave, 2, `onda 1 não andou com ${horda.alive.length} bichos escondidos (combate ${horda.combatLeft.toFixed(1)} s)`);
  assert.ok(horda.alive.some((a) => a.id.startsWith('1.')), 'as sobras da onda 1 sumiram na virada');
  horda.wave = WAVE_COUNTS.length - 1;
  for (let g = 0; g < 4000 && !horda.winner; g++) {
    passoHorda(horda, 0.1);
    if (horda.remaining && horda.alive.length >= horda.maxAlive) registrarAbate(horda, horda.alive[0].id, 'defensor');
  }
  assert.equal(horda.winner, 'E', 'sobreviver à última onda no relógio não deu vitória');
});

regra('o relógio da partida esquenta a horda: aos 10 min ela vem mais rápido e mais forte que aos 2', () => {
  const horda = criarHorda({ seed: 8, mutante });
  horda.wave = 3;
  const em = (minutos) => { horda.clock = minutos * 60; recalcularFuria(horda); return { f: horda.fury, c: cadenciaDeSpawn(horda), v: velocidadeDoJavaporco(horda, 'adulto'), d: danoDoJavaporco(horda, 'adulto') }; };
  const dois = em(2), dez = em(10);
  assert.ok(dez.f >= dois.f + 0.6, `fúria quase igual aos 2 e aos 10 min: ${dois.f.toFixed(2)} → ${dez.f.toFixed(2)}`);
  assert.ok(dez.c < dois.c * 0.8, 'spawn não acelerou com o tempo');
  assert.ok(dez.v > dois.v && dez.d > dois.d, 'velocidade/dano não subiram com o tempo');
  assert.ok(em(60).f <= FURIA.teto + 1e-9, 'o relógio furou o teto da fúria');
});

regra('o HUD mostra a % de domínio e o mini-mapa pinta de vermelho o setor tomado', () => {
  const ctx = jogoFalso({ mundo: mundoFalso({ horda: true }), jogadorEm: [0, 0] });
  abrirOnda(ctx, 0.2);
  ctx.modo.state.controle[1] = 1; ctx.modo.state.controle[2] = 0.5; ctx.modo.state.dominio = 0.375;
  ctx.modo.atualizaHud(true);
  assert.match(ctx.modo.hudDominio.textContent || '', /DOMÍNIO DA HORDA 38%/, 'HUD sem a % de domínio');
  assert.match(ctx.modo.hudSetores.textContent || '', /1\/4 SETORES TOMADOS · LIMPE PARA RETOMAR/, 'HUD sem a contagem de setores tomados');
  assert.equal(ctx.modo.hudBarra.style.width, '38%');
  assert.equal(ctx.modo.hudCelulas.length, HORDA_FALSA.setores.length, 'mini-mapa sem uma célula por setor');
  assert.equal(ctx.modo.hudCelulas[1].style.background, '#c42b18', 'setor tomado não ficou vermelho');
  assert.notEqual(ctx.modo.hudCelulas[2].style.background, '#c42b18', 'setor em disputa pintado como tomado');
});

regra('o snapshot leva o controle por setor e o cliente reconstrói o domínio', () => {
  const host = jogoFalso({ mundo: mundoFalso({ horda: true }) });
  abrirOnda(host, 0.5);
  host.modo.state.controle = [1, 0.42, 0, 0.8];
  host.modo.state.dominio = 0.555;
  const net = decodeSnapshot(encodeSnapshot({
    type: 'snapshot', room: 'horda', tick: 1, t: 1, state: 'live', owner: '', players: 1, spectators: 0,
    livre: { E: 3, B: 0 }, timeLeft: 60, roundNum: 1, scoreE: 0, scoreB: 0, roundKillsE: 0, roundKillsB: 0,
    objective: host.modo.netState(), ents: [],
  }, 7)).objective;
  const cliente = jogoFalso({ mundo: mundoFalso({ horda: true }) });
  cliente.game.online = true;
  cliente.modo.applyNetState(net);
  assert.deepEqual(cliente.modo.state.controle, [1, 0.42, 0, 0.8], 'controle por setor não chegou no cliente');
  assert.equal(cliente.modo.state.dominio, 0.555);
});

regra('o cliente multiplayer apresenta snapshots no HUD sem simular a horda', () => {
  const ctx = jogoFalso({ mundo: mundoFalso({ horda: true }) });
  ctx.game.online = true;
  ctx.modo.placarJNum = { textContent: '0' };
  ctx.modo.placarJ = { setAttribute() {} };
  const net = { ...ctx.modo.netState(), phase: 'combat', clock: 42, wave: 2,
    controle: [1, .5, 0, 0], dominio: .375, teamKills: { E: 2, B: 0, J: 7 }, alive: [] };
  ctx.modo.applyNetState(net);
  ctx.game.time = 1;
  const antes = structuredClone(ctx.modo.state);
  ctx.modo.updatePresentation();
  assert.match(ctx.modo.hudDominio.textContent, /DOMÍNIO DA HORDA 38% · 7 ABATES/);
  assert.equal(ctx.modo.placarJNum.textContent, 7);
  assert.equal(ctx.modo.hudBarra.style.width, '38%');
  assert.equal(ctx.modo.hudCelulas[0].style.background, '#c42b18');
  assert.deepEqual(ctx.modo.state, antes, 'apresentação avançou a simulação autoritativa');
  ctx.modo.applyNetState({ ...net, controle: [0, 0, 0, 0], dominio: 0, waitingForPlayers: true, players: 3, minPlayers: 4 });
  ctx.game.time += .13;
  ctx.modo.updatePresentation();
  assert.match(ctx.modo.hudTexto.textContent, /AGUARDANDO DEFENSORES · 3\/4/);
  assert.equal(ctx.modo.hudBarra.style.width, '0%');
  assert.equal(ctx.modo.hudCelulas[0].style.background, '#5d6b4a');
});

/* ------------------------------------------------------------------------ som */
regra('a marcha da cinemática passa pelo volume mestre', () => {
  const ctx = jogoFalso();
  const master = {}, destination = {}, destinos = [];
  const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  ctx.game.sfx.master = master;
  ctx.game.sfx.ctx = { currentTime: 0, destination,
    createOscillator: () => ({ frequency: param(), connect(node) { return node; }, start() {}, stop() {} }),
    createGain: () => ({ gain: param(), connect(node) { destinos.push(node); return node; } }) };
  ctx.modo.startCinematic('J');
  assert.equal(destinos.length, 72, 'marcha não foi exercitada');
  assert.ok(destinos.every(node => node === master), 'marcha contornou o volume mestre');
});

regra('abate chama o sfx.javaporco com volume e pan por distância', () => {
  const ctx = jogoFalso({ jogadorEm: [0, 0] });
  abrirOnda(ctx);
  const bicho = vivos(ctx.modo)[0];
  bicho.pos.set(6, 0, 0);
  ctx.sons.length = 0;
  ctx.modo.onKill(bicho, ctx.player);
  const morte = ctx.sons.find((s) => s.kind === 'morte');
  assert.ok(morte, `abate mudo (sons: ${JSON.stringify(ctx.sons.map((s) => s.kind))})`);
  assert.ok(morte.vol > 0 && morte.vol <= 1, `volume fora da faixa: ${morte.vol}`);
  assert.ok(Math.abs(morte.pan) <= 0.9, `pan fora da faixa: ${morte.pan}`);
  assert.ok(morte.delay >= 0 && morte.delay <= 0.25, `atraso fora da faixa: ${morte.delay}`);
  const longe = espacializarJavaporco(ctx.player, { x: 40, z: 0 }), perto = espacializarJavaporco(ctx.player, { x: 2, z: 0 });
  assert.ok(perto.vol > longe.vol, 'volume não cai com a distância');
  assert.ok(perto.pan > 0.5 && espacializarJavaporco(ctx.player, { x: -2, z: 0 }).pan < -0.5, 'pan não acompanha o lado');
});

regra('horda rosna perto do jogador e anuncia a onda uma vez só', () => {
  const ctx = jogoFalso({ jogadorEm: [0, 0] });
  abrirOnda(ctx);
  for (const bot of vivos(ctx.modo)) bot.pos.set(2, 0, 2);
  for (let i = 0; i < 600; i++) passo(ctx, 1 / 60);
  const kinds = ctx.sons.map((s) => s.kind);
  assert.ok(kinds.filter((k) => k === 'rosnado').length >= 3, `rosnado de menos: ${kinds.filter((k) => k === 'rosnado').length}`);
  assert.equal(kinds.filter((k) => k === 'horda').length, 1, 'anúncio da onda repetiu ou sumiu');
});

regra('cliente multiplayer rosna perto sem mover a IA e respeita intervalo', () => {
  const ctx = jogoFalso({ jogadorEm: [0, 0] });
  abrirOnda(ctx);
  const bot = vivos(ctx.modo)[0];
  ctx.modo.game.online = true;
  bot.pos.set(2, 0, 2);
  bot._boarRosnarAte = 0; ctx.modo.rosnadoAte = 0;
  ctx.sons.length = 0;
  if (mutante === 'cliente-mudo') ctx.modo.rosnar = () => {};
  const antes = bot.pos.clone();
  ctx.modo.updateBot(bot, 1 / 60);
  assert.equal(ctx.sons.filter(s => s.kind === 'rosnado').length, 1, 'cliente não rosna');
  ctx.modo.updateBot(bot, 1 / 60);
  assert.equal(ctx.sons.length, 1, 'cliente ignora intervalo');
  assert.equal(bot.pos.x, antes.x); assert.equal(bot.pos.z, antes.z);
});

/* ------------------------------------------------------------------ HUD e rede */
regra('o HUD mostra a fúria e quantos javaporcos estão na rua', () => {
  const ctx = jogoFalso({ jogadorEm: [0, 0] });
  abrirOnda(ctx);
  ctx.modo.state.kills = 120;
  recalcularFuria(ctx.modo.state);
  for (let i = 0; i < 30; i++) passo(ctx, 1 / 60);
  const texto = ctx.modo.hudTexto.textContent;
  assert.ok(/FÚRIA \d+%/.test(texto), `HUD sem fúria: ${texto}`);
  assert.ok(/\d+ NA RUA/.test(texto), `HUD sem contagem de vivos: ${texto}`);
  assert.ok(/LIXO \d+\/\d+/.test(texto), `HUD sem placar de lixo revirado: ${texto}`);
});

regra('snapshot v7 replica o estado completo da horda', () => {
  const horda = criarHorda({ seed: 91, mutante });
  iniciarOnda(horda); passoHorda(horda, 1);
  const objective = snapshotHorda(horda);
  const wire = encodeSnapshot({
    type: 'snapshot', room: 'horda', tick: 1, t: 1, state: 'live', owner: '',
    players: 1, spectators: 0, livre: { E: 3, B: 0 }, timeLeft: 360, roundNum: 1,
    scoreE: 0, scoreB: 0, roundKillsE: 0, roundKillsB: 0, objective, ents: [],
  }, 7);
  assert.deepEqual(decodeSnapshot(wire).objective, objective);
});

regra('snapshot com a horda cheia ainda cabe nos 8 KB do fio', () => {
  const horda = criarHorda({ seed: 12 });
  horda.wave = WAVE_COUNTS.length - 1;
  iniciarOnda(horda);
  while (horda.alive.length < horda.maxAlive && horda.remaining > 0) passoHorda(horda, 0.2);
  for (const spot of ['lixo-a', 'lixo-b', 'feira', 'cacamba', 'racao', 'lixo-c']) horda.foodHp[spot] = 12;
  for (let i = 0; i < 10; i++) { registrarDano(horda, horda.alive[i].id, `jogador${i}`, 40); registrarAbate(horda, horda.alive[i].id, `jogador${i}`); }
  const objective = snapshotHorda(horda);
  const bytes = Buffer.byteLength(JSON.stringify(objective));
  assert.ok(bytes < 8192, `objetivo de ${bytes} bytes estoura o limite do netcodec`);
  const wire = encodeSnapshot({
    type: 'snapshot', room: 'horda', tick: 9, t: 9, state: 'live', owner: '',
    players: 10, spectators: 0, livre: { E: 0, B: 0 }, timeLeft: 60, roundNum: 1,
    scoreE: 0, scoreB: 0, roundKillsE: 0, roundKillsB: 0, objective, ents: [],
  }, 7);
  assert.deepEqual(decodeSnapshot(wire).objective, objective);
});

/* -------------------------------------------------------------- contabilidade */
regra('assistência distribui só 40% dos pontos', () => {
  const horda = criarHorda({ seed: 7, mutante });
  iniciarOnda(horda);
  passoHorda(horda, 1);
  const alvo = horda.alive.find((animal) => animal.type === 'adulto') || horda.alive[0];
  alvo.type = 'adulto';
  registrarDano(horda, alvo.id, 'atirador', 60);
  registrarDano(horda, alvo.id, 'assistente', 40);
  registrarAbate(horda, alvo.id, 'atirador', mutante);
  assert.equal(horda.scores.atirador.points, BOAR_POINTS.adulto);
  assert.equal(horda.scores.assistente.points, 72);
  assert.equal(horda.scores.assistente.assists, 1);
  assert.equal(horda.scores.assistente.damagePrevented, 40);
});


regra('javaporco abatido tomba e permanece visível antes de sumir', () => {
  const inicio = poseMorteJavaporco(0, 1, mutante);
  const queda = poseMorteJavaporco(0.28, 1, mutante);
  const chao = poseMorteJavaporco(0.7, 1, mutante);
  const fim = poseMorteJavaporco(120.1, 1, mutante);
  assert.equal(inicio.tilt, 0);
  assert.ok(queda.tilt > 0.4, `queda sem rotação visível: ${queda.tilt}`);
  assert.ok(chao.tilt > queda.tilt, 'o corpo não concluiu o tombo');
  assert.ok(chao.sink > 0.02, 'o corpo não assentou no chão');
  assert.equal(chao.done, false, 'cadáver desapareceu cedo demais');
  assert.equal(fim.done, true, 'cadáver não foi limpo depois da animação');
});

regra('corpos assentam no chão e a fila preserva os oito mais recentes', () => {
  const ctx = jogoFalso({ jogadorEm: [60,60] });
  abrirOnda(ctx, 3);
  for (const [i,b] of vivos(ctx.modo).slice(0,10).entries()) { b.yaw=i*Math.PI/4; ctx.modo.onKill(b,ctx.game.player); }
  assert.equal(ctx.modo.corpses.length,8);
  ctx.game.online = true;
  ctx.game.time += 1; ctx.modo.updatePresentation();
  const box = new THREE.Box3();
  for (const corpse of ctx.modo.corpses) {
    corpse.visual.updateMatrixWorld(true); box.setFromObject(corpse.visual);
    const q = corpse.visual.children[0].getWorldQuaternion(new THREE.Quaternion());
    const frente = new THREE.Vector3(0,0,1).applyQuaternion(q);
    assert.ok(Math.abs(frente.y)<.01, `morte de ponta cabeça: eixo longitudinal y=${frente.y}`);
    const y = ctx.game.world.groundHeightAt(corpse.visual.position.x,corpse.visual.position.z);
    assert.ok(Math.abs(box.min.y-y-.015)<.01, `corpo sem contato: ${box.min.y-y}`);
  }
  ctx.game.time += 45; ctx.modo.updatePresentation(); assert.equal(ctx.modo.corpses.length,8);
  ctx.game.time += 80; ctx.modo.updatePresentation(); assert.equal(ctx.modo.corpses.length,0);
});

if (mutante) {
  assert.ok(falhas > 0, `mutante ${mutante} passou despercebido`);
  console.log(`✓ mutante ${mutante} acendeu a régua`);
  process.exit(0);
}
if (falhas) process.exit(1);
