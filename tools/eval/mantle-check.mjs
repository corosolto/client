// Mede reversibilidade, apoio finito e território no motor real.
// Contrato e mutantes: docs/visual-consistency/MANTLE-GATE.md.
import path from 'node:path';
import { writeFileSync, writeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';
/* Alias legítimo sai do registro dono (maps.js:ALIAS_MAPA), nunca de cópia aqui. */
const { ALIAS_MAPA } = await import('../../public/js/maps.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));


/* Prova terminal para o driver estrito: UMA linha JSON em fd2 com marca única, emitida
   só DEPOIS das medições reais — BASE na baseline, EVID/POST só com mutante aplicado. */
const EVID_MARCA = '__MANTLE_MUT_EVIDENCE__';
const POST_MARCA = '__MANTLE_MUT_POST__';
const BASE_MARCA = '__MANTLE_MUT_BASE__';
const provas = [];
function evidencia(mapId, extra) {
  provas.push(mapId);
  writeSync(2, EVID_MARCA + JSON.stringify({ tool: 'mantle-check', map: mapId, mutant: mutanteAtivo, ...extra }) + '\n');
}
function infra(msg) {
  console.error('INFRA (exit 2): ' + msg);
  process.exit(2);
}

/* CLI estrita: argv.slice(2) INTEIRO validado aqui, antes de boot/texture; desvio é infra 2. */
/* Só 0/1 posicional de mapa + --json/--detalhe (1x cada) + --mutante=<válido> (1x), ordem livre. */
const argv = process.argv.slice(2);
const MUT_VALIDOS = ['canal-fechado', 'beirada-baixa', 'beirada-alta', 'motor-explode', 'travessia-congelada', 'pouso-nan'];
const vistos = { '--json': 0, '--detalhe': 0 };
let ONLY = 'all', mutanteArg = null, mapaInformado = false;
for (const a of argv) {
  if (a.startsWith('--mutante')) {
    if (!a.startsWith('--mutante=')) infra('mutante sem valor: ' + a);
    const v = a.slice('--mutante='.length);
    if (!MUT_VALIDOS.includes(v)) infra('mutante desconhecido: ' + v);
    if (mutanteArg) infra('mutante duplicado: ' + mutanteArg + ',' + v);
    mutanteArg = v;
  } else if (a === '--json' || a === '--detalhe') {
    if (vistos[a]++) infra('flag duplicada: ' + a);
  } else if (a.startsWith('--')) infra('opção desconhecida: ' + a);
  else {
    if (mapaInformado) infra('mapa duplicado na linha de comando: ' + ONLY + ',' + a);
    ONLY = a; mapaInformado = true;
  }
}
const MUT_CANAL = mutanteArg === 'canal-fechado';
const MUT_BAIXA = mutanteArg === 'beirada-baixa';
const MUT_ALTA = mutanteArg === 'beirada-alta';
const MUT_EXPLODE = mutanteArg === 'motor-explode';
const MUT_XZ = mutanteArg === 'travessia-congelada';
const MUT_NAN = mutanteArg === 'pouso-nan';
const mutanteAtivo = mutanteArg;
const JSON_OUT = vistos['--json'] > 0;
const DETALHE = vistos['--detalhe'] > 0;
/* Alias legítimo (ALIAS_MAPA) vira id canônico JÁ NO CLI; desconhecido é infra 2, nunca DEFAULT. */
const MAPA = ONLY === 'all' || MAPS[ONLY] ? ONLY : ALIAS_MAPA[ONLY];
if (ONLY !== 'all' && !MAPS[MAPA]) infra(`mapa desconhecido: ${ONLY} — id canônico ou alias legítimo de maps.js`);

/* ---- CONSTANTES DE CORPO: as MESMAS do jogo, e não uma segunda opinião sobre elas.
   R_BODY 0,38 é o raio que o `_collide` usa (game.js:_updatePlayer). STEP_H 0,55 é o
   degrau que o corpo sobe andando (game.js:STEP_H). Duplicar número é o instrumento
   discordando do jogo — aqui eles são citados, não reinventados. */
const R_BODY = 0.38;
const STEP_H = 0.55;
const GRID = 0.5;          // passo da grade: menor que o raio do corpo
/* ALCANCE 1,5 m. A beirada NÃO é o vizinho de grade: o `_collide` mantém o corpo 0,38 m
   afastado da parede, e o topo da parede do canal do Córrego começa 0,38 m ADIANTE disso.
   A primeira versão desta régua olhava só o vizinho a 0,5 m e mediu ZERO beirada de 1,75 m
   num mapa que tem 1,75 m de parede em 80 m de canal — instrumento cego passa por verde.
   1,5 m é o braço estendido a partir do centro do corpo (0,38 de raio + ~1,1 de alcance). */
const ALCANCE = 1.5;

/* ---- LEDGE_MAX = 1,95 m. NÃO É NÚMERO REDONDO NEM COPIADO DE OUTRO JOGO: é o que os
   10 mapas TÊM. Medida a distribuição de subida-de-beirada enfrentada a partir de chão
   andável e alcançável (6.520 amostras nos 10 mapas, `--json`), o histograma é:

       0,55–0,80 m :  675    degrau alto / parapeito / meio-fio de laje
       0,80–1,00 m :  942
       1,00–1,20 m :   88
       1,20–1,40 m :  155
       1,40–1,60 m :  101
       1,60–1,80 m :  582    PAREDE DO CANAL do Córrego (−1,75 -> 0 = 1,75)
       1,80–1,95 m :  209    fundo do canal -> tablado da ponte (−1,75 -> 0,15 = 1,90)
       ------------------------------------------------- teto do mantle
       1,95–2,20 m :  141
       2,20–2,60 m :   36
       2,60–3,00 m :   58
       3,00+       : 3573    LAJE de prédio / mirante / muralha

   1,95 é 5 cm acima da beirada de escala humana MAIS ALTA dos 10 mapas (1,90 m, o canal
   do Córrego até o tablado da ponte) — que é exatamente a beirada do relato do dono. O
   corte NÃO é num vale do histograma (não existe vale limpo: há 235 subidas entre 1,95 e
   3,00 m), então ele é declarado pelo que RESOLVE: toda queda que o dono descreveu volta
   a ser reversível, e nada acima disso muda de comportamento. As 235 subidas acima do teto
   continuam exatamente como estão hoje, aparecem em `acimaTeto` no relatório por mapa, e
   se alguém quiser subi-las a discussão volta com número — não por silêncio.

   O teto NÃO é a única trava, e sozinho ele não seguraria nada: as subidas que abriam
   telhado nas Lajes e na Mansão mediam 0,75 / 0,90 / 1,59 / 1,62 / 1,80 m, todas abaixo
   de qualquer teto que ainda resolvesse o canal. Quem segura é a trava de ALCANCE em
   `Game._mantleAlcance` — ver o comentário lá. */
const LEDGE_MAX = 1.95;

/* ---- PROF_DEP = 1,62 m, a LINHA DO OLHO do jogador (game.js:`eye = 1.62`). Não é
   escolha estética: abaixo dessa cota o jogador não enxerga por cima da borda, e é aí
   que "cair" deixa de ser rota e vira desorientação. O canal do Córrego (1,75 m) foi
   projetado 13 cm acima dessa linha DE PROPÓSITO (ver o bloco "O CANAL TEM FUNDO" em
   map_corrego.js) — ou seja, o próprio mapa declara que é uma depressão de verdade. */
const PROF_DEP = 1.62;
/* ---- RAIO_DEP = 3,0 m: depressão é PAREDE PERTO, não "abaixo da mediana do mapa".
   A primeira versão desta régua definia depressão contra a mediana do chão do mapa e
   acusou 3.538 células no fy_escadao — que é um MORRO: a metade de baixo fica mesmo
   abaixo da mediana, e subir o morro é o mapa, não uma armadilha. Com parede local o
   escadão sai da lista e o canal do Córrego continua nela. 3,0 m porque 1,62 m de
   subida em 3 m são 28°: acima disso não é ladeira, é muro. */
const RAIO_DEP = 3.0;

/* ---- T_MAX = 2,0 s, e VEL 4,8 m/s (PLAYER_SPEED 5,35 x MOVE_MUL de rifle ~0,9, game.js).
   2,0 s são 9,6 m — 1,8x a largura do PISO ANDÁVEL do canal do Córrego (5,24 m: 6 m de
   vão menos os 0,38 de raio do corpo de cada lado). O teto diz "o corpo pode atravessar o
   buraco uma vez e se reposicionar, mas não pode VIAJAR AO LONGO dele procurando saída".
   Acima disso a saída deixa de ser rota e vira procura — que é, em número, o "difícil
   sair" do dono, ainda mais num canal onde a linha do olho (1,62 m) fica ABAIXO da borda
   (1,75 m) e ele literalmente não vê para onde ir. */
const T_MAX = 2.0;
const VEL = 4.8;

const textures = initTextures();
const MAP_IDS = ONLY === 'all' ? Object.keys(MAPS) : [MAPA];

const relatorio = [];
const falhas = [];
let canalAplicou = 0;
let nanAplicou = 0;
let nanCausal = null;
let xzAplicou = 0;
let motorAplicou = 0;

for (const mapId of MAP_IDS) {
  let g;
  try { g = bootGame(mapId, { textures, ctf: true, seed: 12345 }); }
  /* Sem boot não há medição: infra 2 nos dois modos, nunca falha MNT medida. */
  catch (e) { infra(`${mapId}: bootGame — ${(e && e.stack) || e}`); }
  const xzAntes = xzAplicou, nanAntes = nanAplicou;
  if (MUT_EXPLODE) {
    if (typeof g._updatePlayer !== 'function') infra(`${mapId}: motor-explode sem _updatePlayer — nada aplicado`);
    g._updatePlayer = () => {
      motorAplicou++;
      evidencia(mapId, { applied: true, clauses: [], status: 'infra', aplicacoes: motorAplicou });
      throw new Error('mutante causal: _updatePlayer explodiu');
    };
  }

  const W = g.world, B = W.bounds;
  /* MUTANTE canal-fechado: apaga as rampas de acesso do Córrego devolvendo o topo da
     parede na faixa |x| ∈ [3,5]. O canal continua com piso, e sem rampa não há saída
     nenhuma a pé — é o defeito exato que MNT1 tem que enxergar. */
  if (MUT_CANAL && mapId === 'corrego') {
    const orig = W.groundHeightAt;
    W.groundHeightAt = (x, z, y) => {
      const ax = Math.abs(x);
      if (ax >= 3 && ax <= 5 && Math.abs(z) < 39) return 0;
      return orig(x, z, y);
    };
    canalAplicou++;
    evidencia(mapId, { applied: true, clauses: ['MNT1'], aplicacoes: canalAplicou });
  }
  const gh = W.groundHeightAt ? (x, z, y) => W.groundHeightAt(x, z, y) : () => 0;
  /* MUTANTE beirada-baixa: teto de 0,60 m recortado DENTRO do motor (`_mantleTarget`),
     senão o MNT2 anda o `_updatePlayer` real e não vê o recorte da régua. */
  if (MUT_BAIXA && typeof g._mantleTarget === 'function') {
    const orig = g._mantleTarget.bind(g);
    g._mantleTarget = (pos, dx, dz) => {
      const a = orig(pos, dx, dz);
      if (!a) return null;
      return (a.y - gh(pos.x, pos.z, pos.y) > 0.60) ? null : a;
    };
    /* Evidência só após substituir _mantleTarget no Game de verdade. */
    evidencia(mapId, { applied: true, clauses: ['MNT2'], teto: 0.60 });
  } else if (MUT_BAIXA) infra(`${mapId}: beirada-baixa sem _mantleTarget no Game — nada aplicado`);
  /* Mutante de segurança: remove NO MOTOR a prova de que o apoio já pertence ao território
     caminhável. A ilha determinística que dá dente à cláusula é inserida depois de `livre`. */
  let altaGuardaFora = false;
  if (MUT_ALTA && typeof g._mantleAlcancavel === 'function') { g._mantleAlcancavel = () => true; altaGuardaFora = true; }
  else if (MUT_ALTA) infra(`${mapId}: beirada-alta sem _mantleAlcancavel no Game — guarda intacta, nada aplicado`);

  /* Conta somente passos reais; instalar o wrapper não prova aplicação. */
  if (MUT_XZ) {
    if (typeof g._stepMantle !== 'function') infra(`${mapId}: travessia-congelada sem _stepMantle — nada aplicado`);
    const orig = g._stepMantle.bind(g);
    g._stepMantle = (p, dt) => {
      const x = p.pos.x, z = p.pos.z, ativo = !!p.mantle;
      orig(p, dt);
      if (ativo || p.mantle) { p.pos.x = x; p.pos.z = z; xzAplicou++; }
    };
  }
  /* NaN só após o passo original encerrar um mantle com pouso finito. */
  if (MUT_NAN) {
    if (typeof g._stepMantle !== 'function') infra(`${mapId}: pouso-nan sem _stepMantle — nada aplicado`);
    const orig = g._stepMantle.bind(g);
    g._stepMantle = (p2, dt) => {
      const ativo = !!p2.mantle;
      const antes = { x: p2.pos.x, y: p2.pos.y, z: p2.pos.z };
      orig(p2, dt);
      const pouso = { x: p2.pos.x, y: p2.pos.y, z: p2.pos.z };
      if (ativo && !p2.mantle && Object.values(antes).every(Number.isFinite) && Object.values(pouso).every(Number.isFinite)) {
        p2.pos.x = NaN; p2.pos.z = NaN; nanAplicou++;
        nanCausal = { antes, pouso, mantleAntes: ativo, mantleDepois: !!p2.mantle,
          pousoFinito: Object.values(pouso).every(Number.isFinite),
          aposInjecaoFinito: [p2.pos.x, p2.pos.y, p2.pos.z].every(Number.isFinite) };
      }
    };
  }
  /* Teto de mantle EFETIVO. A régua NÃO reimplementa a decisão: chama `_mantleTarget`. */
  const temMantle = typeof g._mantleTarget === 'function';
  const mantleTeto = MUT_BAIXA ? 0.60 : LEDGE_MAX;
  const alvoMantle = (x, z, dx, dz, y) => {
    const chao = gh(x, z, y);
    if (!temMantle) return null;
    const alvo = g._mantleTarget(new THREE.Vector3(x, y, z), dx, dz);
    if (!alvo) return null;
    if (MUT_BAIXA && alvo.y - chao > mantleTeto) return null;
    return alvo;
  };

  /* ENCOSTA: anda o corpo até a beirada antes de perguntar qualquer coisa.
     A grade tem passo de 0,5 m e o `_collide` mantém o corpo a 0,38 m da parede — então o
     centro da célula andável mais próxima da parede do canal do Córrego fica a 0,75 m dela,
     longe demais para o braço alcançar, enquanto o JOGADOR encosta a 0,38 m e alcança. Sem
     este passo a régua reprovava um conserto que funciona (medido: MNT1 continuava com 74
     células sem saída no Córrego DEPOIS do mantle, e o motor subia 12 de 12 em MNT2 no
     mesmo mapa — o instrumento discordando de si mesmo). Andar para frente é de graça no
     motor, então incluir isso na aresta é modelar o corpo, não afrouxar a régua. */
  let semApoio = 0;
  const encosta = (x, z, y, dx, dz) => {
    let bx = x, bz = z;
    for (let d = 0.1; d <= 1.0 + 1e-9; d += 0.1) {
      const px = x + dx * d, pz = z + dz * d;
      const py = gh(px, pz, y + STEP_H);
      if (Math.abs(py - y) > STEP_H) break;      // deixou de ser o mesmo chão
      if (!livre(px, pz, py)) break;
      bx = px; bz = pz;
    }
    return [bx, bz];
  };

  /* BEIRADA ENFRENTADA a partir de (x, z) na direção (dx, dz): a primeira superfície
     ANDÁVEL dentro do alcance do braço. Se ela estiver até STEP_H acima, não é beirada —
     é chão, o corpo sobe andando. Acima disso, é a subida que o mantle tem que resolver. */
  const beiradaEm = (x0, z0, y, dx, dz) => {
    const [x, z] = encosta(x0, z0, y, dx, dz);
    for (let d = R_BODY + 0.2; d <= ALCANCE; d += 0.25) {
      const px = x + dx * d, pz = z + dz * d;
      const py = gh(px, pz, y + LEDGE_MAX + 0.5);
      if (!livre(px, pz, py)) continue;
      if (py - y <= STEP_H) return null;                 // chão contínuo: não há beirada aqui
      /* TEM QUE CABER UM CORPO EM CIMA. Beirada sem PROFUNDIDADE DE APOIO não é beirada,
         é parede com um pixel de sacada — subir nela entregaria o jogador a uma queda, e é
         justamente o que o MANTLE_APOIO do motor recusa. Sem esta condição a cláusula
         exigiria do conserto algo que o conserto tem razão em não fazer: medido, as duas
         únicas reprovações restantes de MNT2 (fy_campomorro, cotas 2,40 e 1,69) eram
         exatamente isto — o topo é sólido em toda a faixa de 0,83 a 1,58 m à frente e o
         corpo não fica em pé em lugar nenhum dele. Contadas em `semApoio`. */
      const ax = px + dx * 0.50, az = pz + dz * 0.50;
      const ay = gh(ax, az, py + 0.5);
      if (Math.abs(ay - py) > STEP_H || !livre(ax, az, ay)) { semApoio++; return null; }
      return { x: px, y: py, z: pz, sobe: py - y, d };
    }
    return null;
  };

  const livre = (x, z, y) => {
    if (x < B.minX + R_BODY || x > B.maxX - R_BODY || z < B.minZ + R_BODY || z > B.maxZ - R_BODY) return false;
    const p = new THREE.Vector3(x, y, z);
    g._collide(p, R_BODY);
    return Math.abs(p.x - x) < 1e-3 && Math.abs(p.z - z) < 1e-3;
  };

  /* SELFTEST de MNT3: injeta junto ao spawn uma plataforma-ilha de 1,20 m, profunda
     o bastante para pouso. O chão de partida pertence ao componente caminhável; sem o
     defeito a ilha fica fechada, e com a guarda removida o mantle abre células novas. */
  if (MUT_ALTA) {
    let fixture = null;
    const sx = g.player.pos.x, sz = g.player.pos.z;
    const spawnsLista = [];
    for (const lista of Object.values(W.spawns || {})) spawnsLista.push(...(lista || []));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const y = gh(sx, sz, g.player.pos.y + STEP_H);
      if (!Number.isFinite(y) || !livre(sx, sz, y)) continue;
      // corredor plano e livre até além da ilha; a ilha fica em along ∈ [2.55, 4.35]
      let plano = true;
      for (const d of [1.0, 2.0, 3.0, 4.8]) {
        const px = sx + dx * d, pz = sz + dz * d;
        if (Math.abs(gh(px, pz, y + STEP_H) - y) > 0.05 || !livre(px, pz, y)) { plano = false; break; }
      }
      if (!plano) continue;
      // nenhum spawn dentro da pegada: seed dentro da ilha a torna caminhável de nascença
      const pisaSpawn = spawnsLista.some((s) => {
        const rx = s.x - sx, rz = s.z - sz;
        const along = rx * dx + rz * dz, side = -rx * dz + rz * dx;
        return along >= 2.3 && along <= 4.6 && Math.abs(side) <= 0.9;
      });
      if (pisaSpawn) continue;
      fixture = { x: sx, z: sz, y, dx, dz };
      break;
    }
    if (!fixture) infra(`${mapId}: selftest MNT3 não encontrou piso livre junto ao spawn`);
    const orig = W.groundHeightAt.bind(W);
    W.groundHeightAt = (x, z, y) => {
      const rx = x - fixture.x, rz = z - fixture.z;
      const along = rx * fixture.dx + rz * fixture.dz;
      const side = -rx * fixture.dz + rz * fixture.dx;
      return along >= 2.55 && along <= 4.35 && Math.abs(side) <= 0.55
        ? fixture.y + 1.20
        : orig(x, z, y);
    };
    // Precondição de aplicação REAL: o motor tem que enxergar a ilha a partir do corredor.
    const alvoIlha = g._mantleTarget(new THREE.Vector3(sx + fixture.dx * 2.0, fixture.y, sz + fixture.dz * 2.0), fixture.dx, fixture.dz);
    if (!alvoIlha || Math.abs(alvoIlha.y - (fixture.y + 1.20)) > 1e-3)
      infra(`${mapId}: selftest MNT3 — ilha injetada mas o motor NÃO a vê como alvo de mantle`);
    g._mantleReach = null;
    /* Evidência só com as DUAS mutações feitas: guarda fora E ilha injetada. */
    if (!altaGuardaFora) infra(`${mapId}: beirada-alta aplicado pela metade`);
    evidencia(mapId, { applied: true, clauses: ['MNT3'], ilha: 1.20 });
  }
  /* ---------- GRADE ANDÁVEL ---------- */
  const nx = Math.floor((B.maxX - B.minX) / GRID), nz = Math.floor((B.maxZ - B.minZ) / GRID);
  const X = (i) => B.minX + (i + 0.5) * GRID, Z = (k) => B.minZ + (k + 0.5) * GRID;
  const alt = new Float32Array(nx * nz).fill(NaN);
  const repX = new Float32Array(nx * nz), repZ = new Float32Array(nx * nz);
  const idx = (i, k) => i * nz + k;
  /* PONTO REPRESENTATIVO da célula, e não o centro dela. A célula tem 0,5 m; exigir que o
     CENTRO esteja livre reprovou a escada do fy_lajes num degrau de 25 cm (o beiral da laje
     é um colisor de y 3,38–3,50 e o corpo só o limpa a partir da cota 3,20; o centro caiu
     em 3,10, o único ponto ruim). Consequência medida: as 2.915 células de laje apareciam
     como inalcançáveis a pé e o mantle levava a culpa por 3.813 "células novas" que já eram
     alcançáveis. Prova de que era o instrumento: ANDANDO O MOTOR morro acima, 7 de 7 colunas
     testadas chegaram à laje a 3,50 m sem mantle nenhum. */
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const cx = X(i), cz = Z(k), c = idx(i, k);
    for (const [ox, oz] of [[0, 0], [0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) {
      const x = cx + ox, z = cz + oz, y = gh(x, z, 1e3);
      if (livre(x, z, y)) { alt[c] = y; repX[c] = x; repZ[c] = z; break; }
    }
  }
  const RX = (i, k) => repX[idx(i, k)], RZ = (i, k) => repZ[idx(i, k)];
  const dentro = (i, k) => i >= 0 && i < nx && k >= 0 && k < nz && !Number.isNaN(alt[idx(i, k)]);

  /* ---------- GRAFO DIRIGIDO DO MOTOR ----------
     Descer é livre: o `tryAxis` do game.js só barra `rise > STEP_H`, então o corpo anda
     para fora de uma beirada e a gravidade resolve. Subir só vale até STEP_H. É essa
     ASSIMETRIA que transforma depressão em armadilha, e é ela que a régua modela. */
  const VIZ = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  /* ARESTA DE CAMINHADA conferida AO LONGO do trecho, não só nas duas pontas. Comparar
     centros ALIASA escada: no fy_lajes o degrau de 3,27 m cai entre dois centros de grade,
     a diferença ponta-a-ponta vira 0,74 m (acima de STEP_H) e as 2.915 células de laje
     apareciam como INALCANÇÁVEIS a pé — num mapa chamado "Lajes". Era o instrumento, não o
     mapa: a mesma medição na grade de 0,75 m do jogo achava 1.114 delas alcançáveis. O
     motor anda ~8 cm por quadro e nunca dá o salto que a grade dava. */
  const sobeOk = (i, k, di, dk) => {
    let y = alt[idx(i, k)];
    const x0 = RX(i, k), z0 = RZ(i, k), x1 = RX(i + di, k + dk), z1 = RZ(i + di, k + dk);
    for (let s = 1; s <= 5; s++) {
      const sx = x0 + (x1 - x0) * (s / 5), sz = z0 + (z1 - z0) * (s / 5);
      const sy = gh(sx, sz, y + STEP_H);
      if (sy - y > STEP_H) return false;
      y = sy;
    }
    return true;
  };
  const celDe = (x, z) => [Math.round((x - B.minX) / GRID - 0.5), Math.round((z - B.minZ) / GRID - 0.5)];
  /* ARESTA DE MANTLE de (i,k) na direção (di,dk): quem responde é o motor, e o POUSO
     também — a célula de destino é a que contém o ponto onde o jogo coloca o corpo, não
     um vizinho de grade escolhido aqui. */
  const arestaMantle = (i, k, di, dk) => {
    const y = alt[idx(i, k)];
    const [x, z] = encosta(RX(i, k), RZ(i, k), y, di, dk);
    const a = alvoMantle(x, z, di, dk, y);
    if (!a) return null;
    const [j, l] = celDe(a.x, a.z);
    if (!dentro(j, l)) return null;
    if (Math.abs(alt[idx(j, l)] - a.y) > STEP_H) return null;   // pousou noutra camada
    return [j, l];
  };

  function flood(sementes, comMantle) {
    const vis = new Uint8Array(nx * nz);
    const fila = [];
    for (const [i, k] of sementes) if (dentro(i, k) && !vis[idx(i, k)]) { vis[idx(i, k)] = 1; fila.push([i, k]); }
    for (let h = 0; h < fila.length; h++) {
      const [i, k] = fila[h];
      for (const [di, dk] of VIZ) {
        const j = i + di, l = k + dk;
        if (dentro(j, l) && !vis[idx(j, l)]) {
          const a = alt[idx(i, k)], b = alt[idx(j, l)];
          if (b <= a || sobeOk(i, k, di, dk)) { vis[idx(j, l)] = 1; fila.push([j, l]); }
        }
        if (!comMantle) continue;
        const m = arestaMantle(i, k, di, dk);
        if (m && !vis[idx(m[0], m[1])]) { vis[idx(m[0], m[1])] = 1; fila.push(m); }
      }
    }
    return { vis };
  }
  const sementes = [];
  for (const lista of Object.values(W.spawns || {})) for (const s of (lista || [])) {
    const i = Math.round((s.x - B.minX) / GRID - 0.5), k = Math.round((s.z - B.minZ) / GRID - 0.5);
    if (dentro(i, k)) sementes.push([i, k]);
  }
  if (!sementes.length) infra(`${mapId}: sem spawn na grade — instrumento cego`);

  const A = flood(sementes, false);          // alcançável SEM mantle
  const Bm = flood(sementes, true);          // alcançável COM mantle

  /* ---------- MEDIANA DO CHÃO ANDÁVEL ALCANÇÁVEL (só relatório) ---------- */
  const cotas = [];
  for (let c = 0; c < nx * nz; c++) if (A.vis[c]) cotas.push(alt[c]);
  cotas.sort((a, b) => a - b);
  const mediana = cotas[Math.floor(cotas.length / 2)];

  /* ================= MNT1 — SAIR DE ONDE SE CAI =================
     A pergunta é literalmente a do dono: "cai e é difícil sair". Cair só acontece onde
     existe QUEDA DE MÃO ÚNICA — uma aresta u->c em que o corpo desce mais que o degrau
     (o `tryAxis` deixa descer qualquer altura) e não consegue voltar andando.

     A queda que ESTA régua cobra de volta é a de ESCALA HUMANA: mais que STEP_H e até
     LEDGE_MAX. Acima disso não é tropeço, é MUDANÇA DE ANDAR — pular de uma laje de 3,5 m
     nas Lajes é decisão do jogador e a volta é pela escada, por projeto. A primeira versão
     desta régua não fazia essa distinção e acusou 2.255 células nas Lajes e 649 na Mansão:
     estava chamando "beco" de "buraco". Com o recorte em LEDGE_MAX sobra o que o mantle
     tem a ver com o assunto — e o Córrego continua vermelho. */
  const quedas = [];                    // {c: fundo, req: cota de onde se caiu}
  const ehFundo = new Uint8Array(nx * nz);
  const reqDe = new Float32Array(nx * nz).fill(-Infinity);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    /* A ORIGEM da queda tem que ser chão que a CAMINHADA alcança. Superfície-ilha — que
       só se pisa caindo de outra ilha — é dívida de MAPA, não de movimento: exigir o
       retorno dela obrigaria o mantle a abrir território e colocaria MNT1 contra MNT3.
       Elas são contadas em `ilhas` e nomeadas no relatório, não varridas para debaixo do
       tapete. Caso medido: fy_lajes tem 4 células de laje a 3,50 m cuja única chegada é
       cair da laje-ilha de 4,25 m, e a volta a pé custa 75,5 m. */
    const u = idx(i, k); if (!A.vis[u]) continue;
    for (const [di, dk] of VIZ) {
      const j = i + di, l = k + dk;
      if (!dentro(j, l)) continue;
      const c = idx(j, l), cai = alt[u] - alt[c];
      if (cai <= STEP_H || cai > LEDGE_MAX) continue;
      ehFundo[c] = 1;
      if (alt[u] > reqDe[c]) reqDe[c] = alt[u];
    }
  }
  /* A volta é medida por BFS reverso a partir da COTA DE ORIGEM. Agrupar por cota em
     baldes de 25 cm evita uma BFS por célula.
     O balde arredonda PRA BAIXO, e a primeira versão arredondava pra cima "para não
     afrouxar" — o que produziu o erro mais bobo possível: quem caiu do tablado da ponte do
     Córrego (0,15 m) virava balde 0,25 m, nenhuma célula do mapa chega a 0,25 m (a cota
     máxima é 0,15), o conjunto-alvo saía VAZIO e 74 células apareciam como "sem saída"
     DEPOIS do conserto que as tinha resolvido. Arredondar pra baixo é generoso em no
     máximo 25 cm, menos da metade do degrau que o corpo sobe andando (0,55): chegar a essa
     distância da borda já é estar fora do buraco. */
  const saidaComp = new Float32Array(nx * nz).fill(Infinity);
  const baldes = new Map();
  for (let c = 0; c < nx * nz; c++) if (ehFundo[c]) {
    const b = Math.floor(reqDe[c] / 0.25) * 0.25;
    if (!baldes.has(b)) baldes.set(b, []);
    baldes.get(b).push(c);
  }
  for (const [cota, celulas] of baldes) {
    const alvo = [];
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++)
      if (Bm.vis[idx(i, k)] && alt[idx(i, k)] >= cota - 1e-6) alvo.push([i, k]);
    if (!alvo.length) continue;
    const d = floodReverso(temMantle, alvo);
    for (const c of celulas) saidaComp[c] = d[c];
    quedas.push({ cota, n: celulas.length });
  }
  const emDep = ehFundo;

  /* BFS reverso: percorre as arestas ao contrário a partir do alvo, então `dist[c]` é
     quantos metros o corpo anda de `c` até chegar lá em cima. */
  function floodReverso(comMantle, sementesAlvo) {
    const dist = new Float32Array(nx * nz).fill(Infinity);
    const fila = [];
    for (const [i, k] of sementesAlvo) { dist[idx(i, k)] = 0; fila.push([i, k]); }
    for (let h = 0; h < fila.length; h++) {
      const [i, k] = fila[h];
      for (const [di, dk] of VIZ) {
        const j = i + di, l = k + dk;
        if (!dentro(j, l)) continue;
        if (dist[idx(j, l)] < Infinity) continue;
        // aresta ORIGINAL (j,l) -> (i,k): saindo de (j,l) o corpo chega em (i,k)?
        const a = alt[idx(j, l)], b = alt[idx(i, k)];
        let ok = b <= a || sobeOk(j, l, -di, -dk);
        if (!ok && comMantle) {
          const m = arestaMantle(j, l, -di, -dk);
          ok = !!m && m[0] === i && m[1] === k;
        }
        if (!ok) continue;
        dist[idx(j, l)] = dist[idx(i, k)] + GRID; fila.push([j, l]);
      }
      /* pouso de mantle a mais de uma célula: procura quem PODE ter chegado aqui subindo. */
      if (comMantle) {
        for (const [di, dk] of VIZ) for (let d = 1; d <= 4; d++) {
          const j = i + di * d, l = k + dk * d;
          if (!dentro(j, l) || dist[idx(j, l)] < Infinity) continue;
          const m = arestaMantle(j, l, -di, -dk);
          if (m && m[0] === i && m[1] === k) { dist[idx(j, l)] = dist[idx(i, k)] + GRID * d; fila.push([j, l]); }
        }
      }
    }
    return dist;
  }
  const depressoes = [];
  for (let c = 0; c < nx * nz; c++) if (emDep[c]) depressoes.push({ y: alt[c], d: saidaComp[c] });
  const semSaida = depressoes.filter((d) => !Number.isFinite(d.d));
  const piorD = depressoes.reduce((m, d) => (Number.isFinite(d.d) && d.d > m ? d.d : m), 0);
  /* velocidade REAL do corpo: PLAYER_SPEED × MOVE_MUL da arma inicial, lida do jogo. */
  const piorT = piorD / VEL;
  const mnt1 = depressoes.length === 0 ? 'N/A'
    : (semSaida.length === 0 && piorT <= T_MAX) ? 'OK' : 'FALHA';

  /* ================= MNT2 — SUBIR O QUE DEVE SUBIR =================
     Amostra as beiradas de escala humana e ANDA O MOTOR contra cada uma: o corpo parte
     da célula andável que detectou a borda, virado para ela, e `_updatePlayer` roda 2,5 s
     com W e Espaço segurado em janelas. Passou = os pés terminam na cota de cima.
     Reimplementar a física aqui daria uma régua que mede a régua. */
  const beiradas = [], todasSubidas = [];
  let ilhas = 0;
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const c = idx(i, k);
    if (!Bm.vis[c]) continue;
    for (const [di, dk] of VIZ) {
      const b = beiradaEm(RX(i, k), RZ(i, k), alt[c], di, dk);
      if (!b) continue;
      todasSubidas.push(b.sobe);
      if (b.sobe > LEDGE_MAX) continue;
      /* O TOPO tem que ser chão que a caminhada alcança. Se não for, subir nele seria
         abrir território e MNT3 reprovaria o mesmo conserto que MNT2 estaria exigindo —
         as duas cláusulas apontando para lados opostos sobre a MESMA beirada. Quem está
         errado nesse caso é o mapa, não o movimento: são superfícies-ilha. Contadas em
         `ilhas`, com o pior caso nomeado no relatório. */
      const [j, l] = celDe(b.x, b.z);
      if (!dentro(j, l) || !A.vis[idx(j, l)]) { ilhas++; continue; }
      beiradas.push({ x: RX(i, k), z: RZ(i, k), y: alt[c], ty: b.y, dx: di, dz: dk, sobe: b.sobe });
    }
  }
  // amostra determinística: no máximo 12 beiradas por mapa, espalhadas pela lista
  const amostra = [];
  const passo = Math.max(1, Math.floor(beiradas.length / 12));
  for (let n = 0; n < beiradas.length && amostra.length < 12; n += passo) amostra.push(beiradas[n]);

  const subiu = [];
  for (const b of amostra) subiu.push(andaContra(g, b, mapId));
  const mnt2 = amostra.length === 0 ? 'N/A' : subiu.every(Boolean) ? 'OK' : 'FALHA';
  if (MUT_XZ) {
    if (xzAplicou === xzAntes) infra(`${mapId}: travessia-congelada sem passo de mantle — nada aplicado`);
    evidencia(mapId, { applied: true, clauses: ['MNT2'], mecanismo: '_stepMantle', aplicacoes: xzAplicou - xzAntes });
  }
  if (MUT_NAN) {
    if (nanAplicou === nanAntes) infra(`${mapId}: pouso-nan sem pouso de mantle — nada aplicado`);
    evidencia(mapId, { applied: true, clauses: ['MNT2'], mecanismo: '_stepMantle', aplicacoes: nanAplicou - nanAntes, causal: nanCausal });
  }
  if (DETALHE) {
    for (let n = 0; n < amostra.length; n++) if (!subiu[n]) {
      const b = amostra[n];
      const alvo = g._mantleTarget ? g._mantleTarget(new THREE.Vector3(b.x, b.y, b.z), b.dx, b.dz) : null;
      console.log(`  [MNT2 ${mapId}] beirada em (${b.x.toFixed(3)}, ${b.z.toFixed(3)}) y=${b.y.toFixed(3)} dir=(${b.dx},${b.dz}) sobe ${b.sobe.toFixed(3)} -> alvo ${alvo ? `(${alvo.x.toFixed(3)}, ${alvo.y.toFixed(3)}, ${alvo.z.toFixed(3)})` : 'NULL'}`);
    }
    for (let c = 0; c < nx * nz; c++) if (emDep[c] && saidaComp[c] / VEL > T_MAX) {
      console.log(`  [MNT1 ${mapId}] fundo em (${repX[c].toFixed(1)}, ${repZ[c].toFixed(1)}) y=${alt[c].toFixed(2)} caiu de ${reqDe[c].toFixed(2)} -> volta ${Number.isFinite(saidaComp[c]) ? saidaComp[c].toFixed(1) + ' m' : 'IMPOSSÍVEL'}`);
    }
  }

  /* ================= MNT3 — NÃO SUBIR O QUE NÃO DEVE =================
     A cota máxima alcançável não pode subir por causa do mantle. Se subir, o mantle abriu
     superfície que o mapa não pretendia — telhado, topo de muro, borda de skybox. */
  let cotaA = -Infinity, cotaB = -Infinity, novas = 0, piorNova = null;
  for (let c = 0; c < nx * nz; c++) {
    if (A.vis[c]) cotaA = Math.max(cotaA, alt[c]);
    if (Bm.vis[c]) cotaB = Math.max(cotaB, alt[c]);
    if (Bm.vis[c] && !A.vis[c]) {
      novas++;
      if (piorNova == null || alt[c] > piorNova.y) piorNova = { y: alt[c], i: Math.floor(c / nz), k: c % nz };
    }
  }
  /* DUAS cláusulas, e a segunda é a que tem dente. A primeira (cota máxima) sozinha NÃO
     morde: com o mutante `beirada-alta` (teto de 4 m) o mantle abriu 4.360 células novas
     nas Lajes e 481 na Mansão — o jogador chega no telhado — e a cota máxima ficou PARADA
     em 5,00 e 4,50, porque aqueles telhados já eram alcançáveis pela escada. Território
     novo não aparece na cota; aparece na CONTAGEM. Por isso o contrato é ZERO célula nova:
     mantle é ATALHO para onde já se ia a pé, nunca chave de lugar novo. É também o que
     mantém o jogador e o bot no MESMO mapa — o A* dos bots não tem camada de mantle
     (decisão registrada: com camada, 5x mais bot travado), então toda célula que só o
     jogador alcança é vantagem que o bot não tem. */
  const mnt3 = (cotaB <= cotaA + 1e-6 && novas === 0) ? 'OK' : 'FALHA';

  relatorio.push({
    map: mapId, celulas: cotas.length, mediana: +mediana.toFixed(2),
    MNT1: mnt1, depressoes: depressoes.length, semSaida: semSaida.length,
    piorSaidaM: +piorD.toFixed(1), piorSaidaS: +piorT.toFixed(2), piorSaidaSReal: piorT,
    MNT2: mnt2, beiradas: beiradas.length, ilhas, semApoio, acimaTeto: todasSubidas.filter((s) => s > LEDGE_MAX && s <= 3).length,
    amostradas: amostra.length, subiram: subiu.filter(Boolean).length,
    MNT3: mnt3, cotaSemMantle: +cotaA.toFixed(2), cotaComMantle: +cotaB.toFixed(2),
    celulasNovas: novas, piorCotaNova: piorNova ? +piorNova.y.toFixed(2) : null,
    histograma: histo(todasSubidas),
  });
}

/* Fail-closed dos mutantes de injeção: rótulo no CLI não é prova de aplicação. */
if (MUT_CANAL && !canalAplicou) infra('mutante canal-fechado solicitado e NÃO aplicado em nenhum mapa (mapa corrego ausente da execução?)');
if (MUT_NAN && !nanAplicou) infra('mutante pouso-nan solicitado e NENHUM pouso de mantle ocorreu');
if (MUT_XZ && !xzAplicou) infra('mutante travessia-congelada solicitado e NENHUM passo de mantle ocorreu');
if (MUT_EXPLODE && !motorAplicou) infra('mutante motor-explode solicitado e _updatePlayer NÃO foi chamado');
if (MUT_NAN && DETALHE && nanCausal) console.log(`  [MNT2 nan] update real encerrou mantle; pouso finito antes da injecao=${nanCausal.pousoFinito}; finito depois=${nanCausal.aposInjecaoFinito}`);

// Anda o motor real e exige pouso apoiado e avanço XZ; exceção é falha de arnês.
function andaContra(g, b, mapId) {
  const p = g.player;
  const rec = {
    x: p.pos.x, y: p.pos.y, z: p.pos.z, vx: p.vel.x, vy: p.vel.y, vz: p.vel.z, yaw: p.yaw,
    grounded: p.grounded, spaceHeld: p._spaceHeld, mantleScanAt: p._mantleScanAt,
    jumpBufferedUntil: p.jumpBufferedUntil, coyoteUntil: p.coyoteUntil,
  };
  /* Mantle, borda do Espaço e buffers são estado. Qualquer um vazando entre amostras faz
     a seguinte começar no meio da ação ou ignorar o primeiro toque. */
  p.mantle = null; p.mantleF = 0; p._spaceHeld = false; p._mantleScanAt = 0; p.jumpBufferedUntil = 0; p.coyoteUntil = 0;
  /* POUSO FINITO: mantle encerrado, grounded, avanço XZ >= 0,25 m e chão coerente e
     finito. `ty` vem de sonda de grade (±0,25 m); a camada certa é a cláusula do chão. */
  const apoia = () => {
    if (p.mantle || !p.grounded) return false;
    const avanco = b.dx * (p.pos.x - b.x) + b.dz * (p.pos.z - b.z);
    const chao = g.world.groundHeightAt(p.pos.x, p.pos.z, p.pos.y + STEP_H);
    if (![p.pos.x, p.pos.y, p.pos.z, avanco, chao, b.ty].every(Number.isFinite)) return false;
    if (p.pos.y < b.ty - 0.12) return false;
    if (avanco < 0.25) return false;
    return Math.abs(chao - p.pos.y) <= 0.12 && Math.abs(chao - b.ty) <= STEP_H;
  };
  let keys0 = null;
  try {
    // A célula é livre; recuar às cegas pode nascer dentro do colisor atrás dela.
    p.pos.set(b.x, b.y, b.z);
    p.vel.set(0, 0, 0); p.grounded = true;
    // yaw do jogo: forward = (−sin, −cos)
    p.yaw = Math.atan2(-b.dx, -b.dz);
    keys0 = g.keys;
    g.keys = { KeyW: true, Space: false };
    let ok = false, viuMantle = false, maxY = p.pos.y;
    const tentativas = [];
    for (let n = 0; n < 150; n++) {                 // 2,5 s a 60 Hz
      g.keys.Space = n % 30 < 17;                    // segurar permite pular cedo e agarrar ao alcançar
      if (DETALHE && g.keys.Space && !p._spaceHeld) {
        const alvo = g._mantleTarget?.(p.pos, b.dx, b.dz);
        tentativas.push(`${n}@${p.pos.x.toFixed(2)},${p.pos.y.toFixed(2)},${p.pos.z.toFixed(2)}=>${alvo ? alvo.y.toFixed(2) : '-'}`);
      }
      try { g._updatePlayer(1 / 60); }
      catch (e) { infra(`MNT2 runtime — ${(e && e.stack) || e}`); }
      viuMantle ||= !!p.mantle;
      maxY = Math.max(maxY, p.pos.y);
      if (apoia()) { ok = true; break; }
    }
    if (!ok && DETALHE) console.log(`  [MNT2 runtime] final=(${p.pos.x.toFixed(2)},${p.pos.y.toFixed(2)},${p.pos.z.toFixed(2)}) maxY=${maxY.toFixed(2)} mantle=${p.mantle ? 1 : 0}/${viuMantle} grounded=${p.grounded} avanco=${(b.dx * (p.pos.x - b.x) + b.dz * (p.pos.z - b.z)).toFixed(2)} ty=${b.ty.toFixed(2)} tentativas=${tentativas.join(';')}`);
    return ok;
  } finally {
    if (keys0) g.keys = keys0;
    p.mantle = null; p.mantleF = 0;
    p.grounded = rec.grounded;
    p._spaceHeld = rec.spaceHeld; p._mantleScanAt = rec.mantleScanAt;
    p.jumpBufferedUntil = rec.jumpBufferedUntil; p.coyoteUntil = rec.coyoteUntil;
    p.pos.set(rec.x, rec.y, rec.z); p.vel.set(rec.vx, rec.vy, rec.vz); p.yaw = rec.yaw;
  }
}
/* Histograma das subidas: inclui as ALTAS (acima de LEDGE_MAX) de propósito — é ele que
   mostra o VÃO medido entre a beirada humana mais alta e a laje de prédio mais baixa, que
   é de onde o teto sai. Sem as altas no mesmo gráfico o teto vira palpite. */
function histo(lista) {
  const faixas = { '0.55-0.80': 0, '0.80-1.00': 0, '1.00-1.20': 0, '1.20-1.40': 0, '1.40-1.60': 0, '1.60-1.80': 0, '1.80-1.95': 0, '1.95-2.20': 0, '2.20-2.60': 0, '2.60-3.00': 0, '3.00+': 0 };
  for (const s of lista) {
    if (s <= 0.8) faixas['0.55-0.80']++; else if (s <= 1.0) faixas['0.80-1.00']++;
    else if (s <= 1.2) faixas['1.00-1.20']++; else if (s <= 1.4) faixas['1.20-1.40']++;
    else if (s <= 1.6) faixas['1.40-1.60']++; else if (s <= 1.8) faixas['1.60-1.80']++;
    else if (s <= 1.95) faixas['1.80-1.95']++; else if (s <= 2.2) faixas['1.95-2.20']++;
    else if (s <= 2.6) faixas['2.20-2.60']++; else if (s <= 3.0) faixas['2.60-3.00']++;
    else faixas['3.00+']++;
  }
  return faixas;
}

/* ---------- SAÍDA ---------- */
if (JSON_OUT) {
  writeFileSync(path.join(HERE, 'mantle_check.json'), JSON.stringify({ gerado: new Date().toISOString(), LEDGE_MAX, PROF_DEP, T_MAX, mapas: relatorio }, null, 2));
}
const MUT_NOME = MUT_CANAL ? 'canal-fechado' : MUT_BAIXA ? 'beirada-baixa' : MUT_ALTA ? 'beirada-alta' : MUT_EXPLODE ? 'motor-explode' : MUT_XZ ? 'travessia-congelada' : MUT_NAN ? 'pouso-nan' : '';
const larg = (s, n) => String(s).padEnd(n);
console.log(`MANTLE-CHECK — LEDGE_MAX ${LEDGE_MAX} m · PROF_DEP ${PROF_DEP} m · T_MAX ${T_MAX} s` + (MUT_NOME ? `  [MUTANTE ${MUT_NOME}]` : ''));
console.log(larg('mapa', 16) + larg('MNT1', 7) + larg('dep', 6) + larg('s/saída', 8) + larg('piorS', 7) +
  larg('MNT2', 7) + larg('beir', 6) + larg('sobe', 7) + larg('ilha', 6) + larg('MNT3', 7) + larg('cotaA', 7) + larg('cotaB', 7) + 'novas');
for (const r of relatorio) {
  console.log(larg(r.map, 16) + larg(r.MNT1, 7) + larg(r.depressoes, 6) + larg(r.semSaida, 8) + larg(r.piorSaidaS, 7) +
    larg(r.MNT2, 7) + larg(r.beiradas, 6) + larg(`${r.subiram}/${r.amostradas}`, 7) + larg(r.ilhas, 6) + larg(r.MNT3, 7) +
    larg(r.cotaSemMantle, 7) + larg(r.cotaComMantle, 7) + r.celulasNovas);
}
const global = { '0.55-0.80': 0, '0.80-1.00': 0, '1.00-1.20': 0, '1.20-1.40': 0, '1.40-1.60': 0, '1.60-1.80': 0, '1.80-1.95': 0, '1.95-2.20': 0, '2.20-2.60': 0, '2.60-3.00': 0, '3.00+': 0 };
for (const r of relatorio) for (const k of Object.keys(global)) global[k] += r.histograma[k];
console.log('\nHISTOGRAMA DE BEIRADA (10 mapas, subida enfrentada a partir de chão andável):');
for (const [k, v] of Object.entries(global)) console.log(`  ${k} m : ${v}`);

const ruins = relatorio.filter((r) => r.MNT1 === 'FALHA' || r.MNT2 === 'FALHA' || r.MNT3 === 'FALHA');
for (const r of ruins) {
  if (r.MNT1 === 'FALHA') falhas.push(`${r.map}: MNT1 — ${r.semSaida} célula(s) de depressão SEM saída a pé; pior saída ${r.piorSaidaM} m (${r.piorSaidaS} s, teto ${T_MAX} s)`);
  if (r.MNT2 === 'FALHA') falhas.push(`${r.map}: MNT2 — ${r.amostradas - r.subiram} de ${r.amostradas} beiradas de escala humana NÃO são escaláveis`);
  if (r.MNT3 === 'FALHA') falhas.push(`${r.map}: MNT3 — mantle abriu TERRITÓRIO NOVO: ${r.celulasNovas} células que não se alcança a pé (pior cota ${r.piorCotaNova} m; cota máxima ${r.cotaComMantle} m contra ${r.cotaSemMantle} m sem mantle)`);
}
/* UM POST por corrida de mutante, só depois da medição real do mapa mutado. */
if (mutanteAtivo && provas.length === 1 && relatorio[0] && relatorio[0].map === provas[0]) {
  const r = relatorio[0];
  writeSync(2, POST_MARCA + JSON.stringify({ tool: 'mantle-check', map: r.map, mutant: mutanteAtivo, celulas: r.celulas, mnt1: r.MNT1, mnt2: r.MNT2, mnt3: r.MNT3, ...(MUT_CANAL ? { depressoes: r.depressoes, semSaida: r.semSaida, piorSaidaSReal: r.piorSaidaSReal, tMax: T_MAX } : {}) }) + '\n');
}
/* UM relatório terminal por baseline: mapa canônico, contagem e estados MNT medidos. */
if (!mutanteAtivo && relatorio.length === 1)
  writeSync(2, BASE_MARCA + JSON.stringify({ tool: 'mantle-check', map: relatorio[0].map, mutant: null, celulas: relatorio[0].celulas, mnt1: relatorio[0].MNT1, mnt2: relatorio[0].MNT2, mnt3: relatorio[0].MNT3 }) + '\n');
if (falhas.length) {
  console.error('\nVERMELHO:');
  for (const f of falhas) console.error('  · ' + f);
  process.exit(1);
}
console.log('\nVERDE — as três cláusulas passam nos ' + relatorio.length + ' mapas.');
