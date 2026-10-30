/* Miolo urbano: avenidas, vielas, 16 quarteirões, 4 lojas com interior, praça com feira e
   o lixo que o javaporco revira. Medidas e paleta: docs/maps/invasao-javaporcos-visual.md. */
import * as THREE from 'three';

export const AV = 6;             // meia-largura da avenida (12 m de asfalto)
export const CAL = 2;            // calçada
export const MEIO_FIO = 0.15;
export const SOLEIRA = 0.33;     // calçada + 0,18 da soleira: o degrau que faz o bicho tropeçar
export const VIELA = 1.75;
export const B_IN = [8, 20.25], B_OUT = [23.75, 31.5];
export const PERIMETRAL = [31.5, 36];
export const CIDADE_R = 36;

const QUADRANTES = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const faixa = (s, b) => (s > 0 ? [b[0], b[1]] : [-b[1], -b[0]]);

export function blocos() {
  const saida = [];
  for (const [sx, sz] of QUADRANTES) {
    for (const ax of ['i', 'o']) for (const az of ['i', 'o']) {
      const [x0, x1] = faixa(sx, ax === 'i' ? B_IN : B_OUT);
      const [z0, z1] = faixa(sz, az === 'i' ? B_IN : B_OUT);
      saida.push({ id: `${sx > 0 ? 'L' : 'O'}${sz > 0 ? 'S' : 'N'}-${ax}${az}`, sx, sz, ax, az, x0, x1, z0, z1 });
    }
  }
  return saida;
}

/* Quem recebe o quê. A praça fica no quarteirão mais perto do cruzamento central, as
   quatro lojas em quadrantes diferentes e os sobrados nunca colados um no outro. */
const PAPEL = {
  'ON-ii': 'praca', 'LN-ii': 'mercearia', 'OS-ii': 'padaria', 'LS-ii': 'boteco',
  'ON-oo': 'racao', 'LN-oo': 'igreja', 'OS-oo': 'sobrados', 'LS-oo': 'sobrados',
};

export function construirCidade(kit, campo, rnd) {
  const { MAT, caixa, piso, placa, root, colliders } = kit;
  const foodSpots = [], foodMeshes = new Map(), foodColliders = new Map();
  const portas = [], lojas = [], becos = [];
  const extras = novosExtras();
  let edificacoes = 0;

  /* ── Plataformas no campo de altura ANTES de qualquer malha: é o campo que manda, e é
     por isso que o bicho deixa de andar por baixo de calçada e soleira. */
  const calcadas = [];
  const faixaCalcada = (x0, x1, z0, z1) => {
    const r = [Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)];
    calcadas.push(r);
    campo.plataforma(r[0], r[1], r[2], r[3], MEIO_FIO);
  };
  /* A calçada PARA no cruzamento: a primeira versão atravessava a avenida e virava um
     degrau de 0,15 m no meio da pista, que ninguém constrói e ninguém espera. */
  const BRACOS = [[AV + CAL, CIDADE_R], [-CIDADE_R, -(AV + CAL)]];
  for (const s of [-1, 1]) for (const [a, b] of BRACOS) {
    faixaCalcada(s * AV, s * (AV + CAL), a, b);
    faixaCalcada(a, b, s * AV, s * (AV + CAL));
  }

  // ── Asfalto, calçada e meio-fio
  piso(2 * AV, 2 * CIDADE_R, MAT.asfalto, 0, 0, 0.012, 'chao-avenida-ns');
  piso(2 * CIDADE_R, 2 * AV, MAT.asfalto, 0, 0, 0.014, 'chao-avenida-ew');
  for (const s of [-1, 1]) for (const [a, b] of BRACOS) {
    const comp = Math.abs(b - a), meio = (a + b) / 2;
    piso(CAL, comp, MAT.calcada, s * (AV + CAL / 2), meio, MEIO_FIO, 'chao-calcada');
    piso(comp, CAL, MAT.calcada, meio, s * (AV + CAL / 2), MEIO_FIO + 0.002, 'chao-calcada');
    caixa(0.14, MEIO_FIO, comp, MAT.calcada, s * AV, 0, meio, { collide: false, cast: false });
    caixa(comp, MEIO_FIO, 0.14, MAT.calcada, meio, 0, s * AV, { collide: false, cast: false });
  }

  // ── Vielas de terra e anel perimetral: é por onde a horda corta quarteirão
  const VIELA_BRACOS = [[B_IN[0], PERIMETRAL[0]], [-PERIMETRAL[0], -B_IN[0]]];
  for (const s of [-1, 1]) for (const [a, b] of VIELA_BRACOS) {
    const comp = Math.abs(b - a), meio = (a + b) / 2;
    piso(2 * VIELA, comp, MAT.terra, s * 22, meio, 0.016, 'chao-viela');
    piso(comp, 2 * VIELA, MAT.terra, meio, s * 22, 0.018, 'chao-viela');
  }
  const [p0, p1] = PERIMETRAL;
  for (const s of [-1, 1]) {
    piso(2 * CIDADE_R, p1 - p0, MAT.terra, 0, s * (p0 + p1) / 2, 0.02, 'chao-perimetral');
    piso(p1 - p0, 2 * p0, MAT.terra, s * (p0 + p1) / 2, 0, 0.022, 'chao-perimetral');
  }

  // ── Quarteirões: cada bloco tem UM papel, senão a loja nasce dentro de uma casa
  const COM_LOJA = new Set(['mercearia', 'padaria', 'boteco', 'racao']);
  let pracaInfo = null, igrejaInfo = null;
  for (const b of blocos()) {
    const papel = PAPEL[b.id] || 'casas';
    if (papel === 'praca') { pracaInfo = praca(kit, campo, rnd, b); continue; }
    if (papel === 'igreja') {
      igrejaInfo = igrejinha(kit, campo, b);
      edificacoes += igrejaInfo.malhas; muroDeFundo(kit, campo, rnd, b, b.sz < 0 ? 'z1' : 'z0');
      continue;
    }
    if (COM_LOJA.has(papel)) {
      const l = loja(kit, campo, rnd, b, papel);
      lojas.push(l); portas.push(l.porta); edificacoes++;
      edificacoes += puxadinho(kit, campo, rnd, b, l);
      if (papel === 'racao') criarFood(kit, campo, foodSpots, foodMeshes, foodColliders,
        'racao-loja', 'racao', l.interior[0], l.interior[1]);
      continue;
    }
    if (BECOS[b.id]) {
      const bc = quarteiraoBeco(kit, campo, rnd, b, BECOS[b.id], extras);
      becos.push(bc.contrato); edificacoes += bc.casas;
      continue;
    }
    edificacoes += quarteiraoCasas(kit, campo, rnd, b, papel === 'sobrados' ? 2 : 0);
  }
  construirExtras(kit, extras);

  // ── Postes, fiação e carros parados
  const postes = fiacao(kit, campo, rnd);

  // ── Lixo que a horda revira, espalhado pelos quatro quadrantes
  const pontos = [
    ['lixo-av-n', 'lixo', -3.2, -17.4], ['lixo-av-s', 'lixo', 3.4, 18.1],
    ['lixo-viela-on', 'lixo', -22, -14.5], ['lixo-viela-ls', 'lixo', 22, 15.2],
    ['lixo-perim-n', 'lixo', -19.6, -33.4], ['lixo-perim-l', 'lixo', 33.2, -14.6],
    ['lixo-perim-s', 'lixo', 8.4, 33.1],
    ['cacamba-obra', 'cacamba', -33.1, -11.2], ['cacamba-viela', 'cacamba', 22, -22],
    ['cacamba-perim', 'cacamba', 27.6, 33.2],
    ['racao-galpao', 'racao', -33.4, 12.6],
  ];
  pracaInfo.feira.forEach(([x, z], i) => pontos.push([`feira-${i + 1}`, 'feira', x, z]));
  for (const [id, kind, x, z] of pontos) criarFood(kit, campo, foodSpots, foodMeshes, foodColliders, id, kind, x, z);

  lixoSolto(kit, campo, rnd);

  /* O objetivo mora num ponto ALCANÇÁVEL (corredor da feira, porta da loja, adro da
     igreja) e leva `r`: centro de prédio era bando empacado na parede a 6,6 m (medido). */
  const mercearia = lojas.find((l) => l.papel === 'mercearia') || lojas[0];
  const hordeObjectives = [
    { id: 'feira', x: +pracaInfo.objetivo[0].toFixed(2), z: +pracaInfo.objetivo[1].toFixed(2), hp: 1200, r: 3.2 },
    { id: 'mercearia', x: +mercearia.porta.x.toFixed(2), z: +mercearia.porta.z.toFixed(2), hp: 1200, r: 2.6 },
    { id: 'igreja', x: +igrejaInfo.frente[0].toFixed(2), z: +igrejaInfo.frente[1].toFixed(2), hp: 1200, r: 3.0 },
  ];

  return { foodSpots, foodMeshes, foodColliders, portas, lojas, hordeObjectives, becos, becoAreas: extras.becoAreas,
    censo: { edificacoes, postes, calcadas: calcadas.length, becos: becos.length, colisores: colliders.length }, root };
}

/* ── CASA TÉRREA / SOBRADO ─────────────────────────────────────────────────────────── */
function casa(kit, campo, rnd, x, z, w, d, ry, alt, cor, paredeMat = null) {
  const { MAT, caixa, placa } = kit;
  const y = campo.amostra(x, z);
  const parede = paredeMat || MAT.reboco[cor % MAT.reboco.length];
  caixa(w, alt, d, parede, x, y, z, { ry });
  caixa(w + 0.04, 1.1, d + 0.04, MAT.barra, x, y, z, { ry, collide: false, cast: false });
  const cume = alt > 5 ? 1.3 : 1.1;
  const telhado = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.76, cume, 4), rnd() < 0.15 ? MAT.fibrocimento : MAT.telha);
  telhado.position.set(x, y + alt + cume / 2, z);
  telhado.rotation.y = ry + Math.PI / 4;
  telhado.castShadow = true; telhado.receiveShadow = true;
  kit.root.add(telhado); kit.occluders.push(telhado);
  const cs = Math.cos(ry), sn = Math.sin(ry);
  const frente = (ox, oy, oz) => [x + ox * cs + oz * sn, y + oy, z - ox * sn + oz * cs];
  const [px, py, pz] = frente(0, 0, d / 2 + 0.02);
  placa(1.0, 2.15, 0.08, MAT.vao, px, py + 0.02, pz, ry);
  for (const ox of [-w / 4 - 0.4, w / 4 + 0.4]) {
    const [jx, jy, jz] = frente(ox, 1.15, d / 2 + 0.02);
    placa(1.1, 1.0, 0.08, MAT.vao, jx, jy, jz, ry);
  }
  if (alt > 5) {
    const [lx, ly, lz] = frente(0, alt * 0.52, d / 2 + 0.02);
    placa(w * 0.86, 0.12, 0.6, MAT.calcada, lx, ly, lz, ry);
  }
  return 1;
}

function quarteiraoCasas(kit, campo, rnd, b, sobrados) {
  const { MAT, caixa } = kit;
  const largura = b.x1 - b.x0, fundo = b.z1 - b.z0;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  let n = 0;
  const giro = () => (rnd() < 0.22 ? (rnd() - 0.5) * 0.49 : 0);
  if (largura >= 11 && fundo >= 11) {
    n += casa(kit, campo, rnd, b.x0 + 3.5, b.z0 + 4.2, 6.4, 7.6, giro(), sobrados ? 6 : 3, (rnd() * 4) | 0);
    n += casa(kit, campo, rnd, b.x1 - 3.4, b.z1 - 3.9, 6.2, 7.0, giro() + Math.PI, 3, (rnd() * 4) | 0);
    n += casa(kit, campo, rnd, b.x1 - 3.0, b.z0 + 3.4, 4.6, 5.2, giro() + Math.PI / 2, sobrados > 1 ? 6 : 3, (rnd() * 4) | 0);
  } else if (largura >= fundo) {
    n += casa(kit, campo, rnd, cx - largura / 4, cz, 5.4, fundo - 2.6, giro(), sobrados ? 6 : 3, (rnd() * 4) | 0);
    n += casa(kit, campo, rnd, cx + largura / 4, cz, 5.0, fundo - 3.2, giro(), 3, (rnd() * 4) | 0);
  } else {
    n += casa(kit, campo, rnd, cx, cz - fundo / 4, largura - 2.6, 5.4, giro() + Math.PI / 2, sobrados ? 6 : 3, (rnd() * 4) | 0);
    n += casa(kit, campo, rnd, cx, cz + fundo / 4, largura - 3.2, 5.0, giro() + Math.PI / 2, 3, (rnd() * 4) | 0);
  }
  muroDeFundo(kit, campo, rnd, b);
  quintal(kit, campo, rnd, b);
  return n;
}

/* Muro de fundo e de divisa: 1,80 m, 2,20 m na esquina. É o que transforma quarteirão em
   labirinto para a horda. `pular` guarda a face da fachada: muro ali sela a porta da loja. */
function muroDeFundo(kit, campo, rnd, b, pular = '') {
  const { MAT } = kit;
  const lados = [
    ['z0', b.x0, b.x1, b.z0, b.z0, 'z'], ['z1', b.x0, b.x1, b.z1, b.z1, 'z'],
    ['x0', b.x0, b.x0, b.z0, b.z1, 'x'], ['x1', b.x1, b.x1, b.z0, b.z1, 'x'],
  ];
  for (const [nome, x0, x1, z0, z1, eixo] of lados) {
    if (nome === pular) continue;
    if (rnd() < 0.45) continue;
    const alt = rnd() < 0.25 ? 2.2 : 1.8;
    const esp = alt > 2 ? 0.2 : 0.15;
    const y = campo.amostra((x0 + x1) / 2, (z0 + z1) / 2);
    if (eixo === 'z') {
      const comp = (x1 - x0) * (0.55 + rnd() * 0.4);
      kit.caixa(comp, alt, esp, MAT.bloco, (x0 + x1) / 2 + (rnd() - 0.5) * 1.2, y, z0, {});
    } else {
      const comp = (z1 - z0) * (0.55 + rnd() * 0.4);
      kit.caixa(esp, alt, comp, MAT.bloco, x0, y, (z0 + z1) / 2 + (rnd() - 0.5) * 1.2, {});
    }
  }
}

function quintal(kit, campo, rnd, b) {
  const { MAT, caixa, piso } = kit;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  piso(b.x1 - b.x0 - 0.4, b.z1 - b.z0 - 0.4, MAT.terraQuintal, cx, cz, 0.006, 'chao-quintal');
  if (rnd() < 0.55) {
    const y = campo.amostra(cx, cz);
    kit.caixa(1.1, 1.4, 1.1, MAT.caixaDagua, b.x0 + 1.4, y + 2.9, b.z1 - 1.5, { collide: false });
    kit.caixa(0.12, 2.9, 0.12, MAT.metal, b.x0 + 1.4, y, b.z1 - 1.5, { collide: false, cast: false });
  }
  if (rnd() < 0.5) kit.caixa(1.8, 0.9, 1.2, MAT.caixote, cx + (rnd() - 0.5) * 3, campo.amostra(cx, cz), cz + (rnd() - 0.5) * 3, { ry: rnd() * 3 });
}

/* ── LOJA COM INTERIOR ─────────────────────────────────────────────────────────────── */
const LOJA_LETREIRO = { mercearia: 'signBoteco', padaria: 'signPastel', boteco: 'signSindicato', racao: 'truckSide' };

function loja(kit, campo, rnd, b, papel) {
  const { MAT, caixa, piso, placa } = kit;
  /* A fachada olha para a rua mais perto: loja que abre para o fundo do quarteirão é loja
     que a horda nunca acha, e o pedido do dono é que ela ENTRE. */
  const eixo = b.ax === 'i' && b.az === 'i' ? 'z' : (b.ax === 'o' ? 'x' : 'z');
  const largX = b.x1 - b.x0, largZ = b.z1 - b.z0;
  const W = Math.min(8.4, (eixo === 'z' ? largX : largZ) - 0.8);
  const D = Math.min(7.2, (eixo === 'z' ? largZ : largX) - 0.8);
  const alt = 3.4, esp = 0.22, vao = 2.7;
  const sinal = eixo === 'z' ? -b.sz : -b.sx;
  const cx = eixo === 'z' ? (b.x0 + b.x1) / 2 : (b.sx < 0 ? b.x1 - D / 2 - 0.3 : b.x0 + D / 2 + 0.3);
  const cz = eixo === 'z' ? (b.sz < 0 ? b.z1 - D / 2 - 0.3 : b.z0 + D / 2 + 0.3) : (b.z0 + b.z1) / 2;
  const mundo = (n, l) => (eixo === 'z' ? [cx + l, cz + n] : [cx + n, cz + l]);
  const dims = (dn, dl) => (eixo === 'z' ? [dl, dn] : [dn, dl]);

  const y = campo.amostra(cx, cz);
  const [mw, md] = dims(D, W);
  campo.plataforma(cx - mw / 2, cx + mw / 2, cz - md / 2, cz + md / 2, SOLEIRA);
  const [pw, pd] = dims(D - 0.3, W - 0.3);
  piso(pw, pd, MAT.ceramica, cx, cz, SOLEIRA + 0.004, 'chao-loja');

  const parede = (n, l, h, dn, dl, base = y) => {
    const [px, pz] = mundo(n, l);
    const [w, d] = dims(dn, dl);
    caixa(w, h, d, MAT.rebocoLoja, px, base, pz, {});
  };
  const meio = (W - vao) / 2;
  const face = sinal * (D / 2 - esp / 2);
  for (const s of [-1, 1]) parede(face, s * (vao + meio) / 2, alt, esp, meio);
  parede(face, 0, alt - 2.4, esp, vao, y + 2.4);
  parede(-face, 0, alt, esp, W);
  for (const s of [-1, 1]) parede(0, s * (W / 2 - esp / 2), alt, D, esp);

  const cume = 1.2;
  const telhado = new THREE.Mesh(new THREE.ConeGeometry(Math.max(W, D) * 0.76, cume, 4), papel === 'racao' ? MAT.fibrocimento : MAT.telha);
  telhado.position.set(cx, y + alt + cume / 2, cz);
  telhado.rotation.y = Math.PI / 4;
  telhado.castShadow = true; telhado.receiveShadow = true;
  kit.root.add(telhado); kit.occluders.push(telhado);

  const letreiro = MAT[LOJA_LETREIRO[papel]] || MAT.billboard;
  const [lx, lz] = mundo(sinal * (D / 2 + 0.12), 0);
  const [lw, ld] = dims(0.1, W * 0.78);
  placa(lw, 0.85, ld, letreiro, lx, y + alt - 0.55, lz, 0);

  // balcão e prateleiras: é o que dá leitura de loja ao interior, em vez de caixa oca
  const [bx, bz] = mundo(-sinal * 1.9, 0);
  const [bw, bd] = dims(0.7, 3.0);
  caixa(bw, 1.05, bd, MAT.madeira, bx, SOLEIRA, bz, {});
  for (const s of [-1, 1]) {
    const [sx, sz] = mundo(-sinal * (D / 2 - 0.8), s * (W / 2 - 1.3));
    const [sw, sd] = dims(0.42, 2.0);
    caixa(sw, 1.8, sd, MAT.prateleira, sx, SOLEIRA, sz, {});
  }
  if (rnd() < 0.8) {
    const [tx, tz] = mundo(sinal * (D / 2 + 0.7), 0);
    const [tw, td] = dims(1.5, W * 0.6);
    placa(tw, 0.08, td, MAT.toldo[papel.length % 3], tx, y + 2.55, tz, 0, sinal * (eixo === 'z' ? 0.14 : -0.14));
  }

  const [portaX, portaZ] = mundo(sinal * (D / 2 + 1.1), 0);
  /* `dentro` fica entre a porta e o balcão: a 2,1 m do centro ele caía DENTRO do colisor
     do balcão, e nó dentro de sólido é destino que ninguém alcança (relato do modo). */
  const [dentroX, dentroZ] = mundo(sinal * (D / 2 - 1.1), 0);
  return { papel, eixo, sinal, fundo: D, largura: W, porta: { x: portaX, z: portaZ, dentro: [dentroX, dentroZ] }, interior: [cx, cz] };
}

/* ── IGREJINHA E PRAÇA ─────────────────────────────────────────────────────────────── */
function igrejinha(kit, campo, b) {
  const { MAT, caixa, placa } = kit;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const y = campo.amostra(cx, cz);
  const paraCidade = b.sz < 0 ? 1 : -1;
  caixa(6.6, 5.2, 7.0, MAT.rebocoIgreja, cx, y, cz, { ry: 0.06 });
  const telhado = new THREE.Mesh(new THREE.ConeGeometry(5.1, 1.7, 4), MAT.telha);
  telhado.position.set(cx, y + 5.2 + 0.85, cz); telhado.rotation.y = Math.PI / 4 + 0.06;
  telhado.castShadow = true; kit.root.add(telhado); kit.occluders.push(telhado);
  caixa(2.2, 9.8, 2.2, MAT.rebocoIgreja, cx - 2.0, y, cz + paraCidade * 2.6, { ry: 0.06 });
  // portal e sino: o campanário é o único volume que compete com a copa da mata
  placa(1.6, 2.6, 0.12, MAT.vao, cx + 0.9, y, cz + paraCidade * 3.56, 0.06);
  placa(1.0, 1.4, 0.1, MAT.vao, cx - 2.0, y + 7.6, cz + paraCidade * 3.72, 0.06);
  placa(0.18, 1.5, 0.18, MAT.metal, cx - 2.0, y + 10.5, cz + paraCidade * 2.6, 0);
  placa(1.1, 0.14, 0.14, MAT.metal, cx - 2.0, y + 10.1, cz + paraCidade * 2.6, 0);
  return { malhas: 2, frente: [cx + 0.9, b.sz < 0 ? b.z1 + 1.7 : b.z0 - 1.7] };
}

/* Praça com CORREDOR de feira, não anel de bancas. O anel selava o miolo: a horda
   chegava na praça e o objetivo ficava numa coroa sem saída (medido na navegação). */
function praca(kit, campo, rnd, b) {
  const { MAT, caixa, piso, placa } = kit;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  campo.plataforma(b.x0, b.x1, b.z0, b.z1, 0.18);
  piso(b.x1 - b.x0, b.z1 - b.z0, MAT.bloquete, cx, cz, 0.184, 'chao-praca');
  const y = 0.18;
  const coretoZ = cz + 4.1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.283;
    placa(0.2, 2.6, 0.2, MAT.madeira, cx + Math.cos(a) * 2.0, y, coretoZ + Math.sin(a) * 2.0, 0);
  }
  const cobertura = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.1, 6), MAT.telha);
  cobertura.position.set(cx, y + 3.1, coretoZ); cobertura.castShadow = true;
  kit.root.add(cobertura); kit.occluders.push(cobertura);
  caixa(4.4, 0.35, 4.4, MAT.bloquete, cx, y, coretoZ, { collide: false, cast: false });
  colisorRedondo(kit, cx, coretoZ, 2.4, y, y + 3.2);
  /* Duas fileiras com corredor de 5,6 m no meio: as posições 1 e 3 de cada fileira são
     foodSpots de feira, então a banca que o bicho revira É uma banca da feira. */
  const feira = [];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const bx = cx + s * 3.3, bz = cz - 4.6 + i * 2.5;
    if (i % 2) { feira.push([bx, bz]); continue; }
    banca(kit, bx, bz, y, s > 0 ? Math.PI / 2 : -Math.PI / 2, MAT.toldo[(i + (s > 0 ? 1 : 0)) % 3]);
  }
  for (const [ox, oz] of [[-5.2, -4.4], [5.2, -4.4], [-5.2, 1.8], [5.2, 1.8]])
    caixa(1.7, 0.45, 0.5, MAT.madeira, cx + ox, y, cz + oz, { ry: (rnd() - 0.5) * 0.3 });
  // torre da caixa d'água: o marco alto que a referência de arte pede no miolo
  const tx = b.x0 + 2.0, tz = b.z1 - 2.0, ty = campo.amostra(tx, tz);
  for (const [ox, oz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]])
    kit.placa(0.18, 8.5, 0.18, MAT.metal, tx + ox, ty, tz + oz, 0);
  kit.placa(2.4, 2.1, 2.4, MAT.caixaDagua, tx, ty + 8.5, tz, rnd() * 0.3);
  colisorRedondo(kit, tx, tz, 1.1, ty, ty + 8.5);
  return { objetivo: [cx, cz - 2.0], feira };
}

/* Puxadinho ATRÁS da loja, e só quando sobra fundo de lote. Antes ele nascia em cima do
   balcão no quarteirão pequeno e selava o interior — a horda não entrava. */
function puxadinho(kit, campo, rnd, b, l) {
  const { MAT, caixa } = kit;
  const paraFora = l.eixo === 'z' ? 'z' : 'x';
  const bloco = paraFora === 'z' ? b.z1 - b.z0 : b.x1 - b.x0;
  const sobra = bloco - l.fundo - 0.6;
  const face = paraFora === 'z' ? (l.sinal > 0 ? 'z1' : 'z0') : (l.sinal > 0 ? 'x1' : 'x0');
  muroDeFundo(kit, campo, rnd, b, face);
  if (sobra < 3.6) return 0;
  const recuo = 1.7;
  const cx = paraFora === 'x' ? (l.sinal > 0 ? b.x0 + recuo : b.x1 - recuo) : (b.x0 + b.x1) / 2;
  const cz = paraFora === 'z' ? (l.sinal > 0 ? b.z0 + recuo : b.z1 - recuo) : (b.z0 + b.z1) / 2;
  const y = campo.amostra(cx, cz);
  const ry = (rnd() - 0.5) * 0.2;
  caixa(3.2, 2.7, 3.0, MAT.bloco, cx, y, cz, { ry });
  kit.placa(3.4, 0.14, 3.2, MAT.fibrocimento, cx, y + 2.7, cz, ry, 0.1);
  return 1;
}

function banca(kit, x, z, y, ry, toldoMat) {
  const { MAT, caixa, placa } = kit;
  caixa(2.0, 0.85, 1.0, MAT.madeira, x, y, z, { ry });
  for (const s of [-1, 1]) placa(0.08, 1.35, 0.08, MAT.metal, x + Math.cos(ry) * s * 0.9, y + 0.85, z - Math.sin(ry) * s * 0.9, ry);
  placa(2.3, 0.08, 1.3, toldoMat, x, y + 2.2, z, ry, 0.12);
  for (let i = 0; i < 3; i++) placa(0.5, 0.3, 0.38, MAT.caixote, x - 0.7 + i * 0.7, y + 0.85, z, ry);
}

function colisorRedondo(kit, x, z, raio, minY, maxY) {
  kit.colliders.push({ minX: x - raio, maxX: x + raio, minY, maxY, minZ: z - raio, maxZ: z + raio });
}

/* ── POSTES E FIAÇÃO ───────────────────────────────────────────────────────────────── */
function fiacao(kit, campo, rnd) {
  const { MAT, caixa } = kit;
  const borda = AV + CAL - 0.45;
  /* Cada LINHA de postes é uma calçada: o cabo só fecha vão entre vizinhos da mesma
     linha. Ligar todo par a menos de 16 m virava rede cruzando a avenida inteira. */
  const linhas = [];
  for (const s of [-1, 1]) {
    const ao = [], través = [];
    for (let t = -28; t <= 28; t += 14) { ao.push([s * borda, t]); través.push([t, s * borda]); }
    linhas.push(ao, través);
  }
  const postes = [];
  const vistos = new Set();
  const cabos = [];
  for (const linha of linhas) {
    const topo = [];
    for (const [x, z] of linha) {
      const k = `${x.toFixed(2)}|${z.toFixed(2)}`;
      const y = campo.amostra(x, z);
      if (!vistos.has(k)) {
        vistos.add(k);
        caixa(0.18, 9.0, 0.25, MAT.poste, x, y, z, { ry: (rnd() - 0.5) * 0.12 });
        caixa(1.5, 0.12, 0.12, MAT.metal, x, y + 8.35, z, { collide: false, cast: false });
        postes.push([x, y + 8.4, z]);
      }
      topo.push([x, y + 8.35, z]);
    }
    for (let i = 0; i + 1 < topo.length; i++) cabos.push([topo[i], topo[i + 1]]);
  }
  const seg = new THREE.BoxGeometry(1, 0.045, 0.045);
  const matrizes = [];
  const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const eixoX = new THREE.Vector3(1, 0, 0), dir = new THREE.Vector3();
  for (const [a, b] of cabos) {
    const nx = -(b[2] - a[2]), nz = b[0] - a[0];
    const comp = Math.hypot(nx, nz) || 1;
    for (let c = 0; c < 3; c++) {
      const off = (c - 1) * 0.3;
      for (let k = 0; k < 6; k++) {
        const t0 = k / 6, t1 = (k + 1) / 6;
        const flecha = (t) => -0.9 * 4 * t * (1 - t);
        const x0 = a[0] + (b[0] - a[0]) * t0 + off * nx / comp, z0 = a[2] + (b[2] - a[2]) * t0 + off * nz / comp;
        const x1 = a[0] + (b[0] - a[0]) * t1 + off * nx / comp, z1 = a[2] + (b[2] - a[2]) * t1 + off * nz / comp;
        const y0 = a[1] + (b[1] - a[1]) * t0 + flecha(t0), y1 = a[1] + (b[1] - a[1]) * t1 + flecha(t1);
        const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
        _p.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        _q.setFromUnitVectors(eixoX, dir.set(x1 - x0, y1 - y0, z1 - z0).normalize());
        _s.set(len, 1, 1);
        matrizes.push(new THREE.Matrix4().compose(_p, _q, _s));
      }
    }
  }
  if (matrizes.length) {
    const cabos = new THREE.InstancedMesh(seg, MAT.cabo, matrizes.length);
    for (let i = 0; i < matrizes.length; i++) cabos.setMatrixAt(i, matrizes[i]);
    cabos.name = 'fiacao'; cabos.instanceMatrix.needsUpdate = true;
    cabos.userData.nonSolidSurface = true;
    cabos.computeBoundingSphere();
    kit.root.add(cabos);
  }
  return postes.length;
}

/* ── LIXO, COMIDA E ESTRAGO ────────────────────────────────────────────────────────── */
const MEIA_EXT = { lixo: 0.45, cacamba: 1.5, feira: 0.9, racao: 0.5 };
const HP_PADRAO = { lixo: 90, feira: 150, cacamba: 220, racao: 120 };

function criarFood(kit, campo, foodSpots, foodMeshes, foodColliders, id, kind, x, z) {
  const { MAT } = kit;
  const grupo = new THREE.Group();
  grupo.name = `food-${id}`;
  grupo.userData.foodId = id;
  const y = campo.amostra(x, z);
  const inteiro = new THREE.Group(), revirado = new THREE.Group();
  const meia = MEIA_EXT[kind];
  const malha = (geo, mat, px, py, pz, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz); m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const cubo = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  if (kind === 'lixo') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.283;
      inteiro.add(malha(new THREE.IcosahedronGeometry(0.33, 0), MAT.saco,
        Math.cos(a) * 0.3, 0.3 + (i % 2) * 0.26, Math.sin(a) * 0.3, a));
    }
    inteiro.add(malha(cubo(0.73, 1.07, 0.58), MAT.lixeira, 0.55, 0.53, -0.3, 0.4));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283, r = 0.5 + (i % 3) * 0.35;
      revirado.add(malha(new THREE.IcosahedronGeometry(0.2, 0), MAT.saco, Math.cos(a) * r, 0.14, Math.sin(a) * r, a));
    }
    revirado.add(malha(cubo(1.07, 0.58, 0.73), MAT.lixeira, 0.6, 0.29, -0.4, 0.9));
  } else if (kind === 'cacamba') {
    inteiro.add(malha(cubo(3.0, 1.2, 1.6), MAT.cacamba, 0, 0.85, 0));
    inteiro.add(malha(cubo(2.8, 0.3, 1.4), MAT.entulho, 0, 1.5, 0));
    for (const s of [-1, 1]) inteiro.add(malha(cubo(0.3, 0.25, 1.5), MAT.metal, s * 1.2, 0.12, 0));
    revirado.add(malha(cubo(3.0, 1.2, 1.6), MAT.cacamba, 0, 0.85, 0));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283, r = 1.4 + (i % 3) * 0.4;
      revirado.add(malha(new THREE.IcosahedronGeometry(0.22, 0), MAT.entulho, Math.cos(a) * r, 0.16, Math.sin(a) * r, a));
    }
  } else if (kind === 'feira') {
    inteiro.add(malha(cubo(1.8, 0.85, 0.95), MAT.madeira, 0, 0.42, 0));
    for (let i = 0; i < 4; i++) inteiro.add(malha(cubo(0.5, 0.32, 0.38), MAT.caixote, -0.6 + i * 0.42, 1.0, 0, i * 0.3));
    revirado.add(malha(cubo(1.8, 0.85, 0.95), MAT.madeira, 0, 0.3, 0, 0.22));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283, r = 0.8 + (i % 2) * 0.5;
      revirado.add(malha(cubo(0.42, 0.26, 0.3), MAT.caixote, Math.cos(a) * r, 0.13, Math.sin(a) * r, a));
    }
  } else {
    for (let i = 0; i < 6; i++) inteiro.add(malha(cubo(0.8, 0.25, 0.45), MAT.racao, (i % 2) * 0.12, 0.13 + i * 0.25, 0, i * 0.18));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283;
      revirado.add(malha(cubo(0.8, 0.2, 0.45), MAT.racao, Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7, a + 0.4));
    }
  }
  inteiro.name = 'inteiro'; revirado.name = 'revirado'; revirado.visible = false;
  grupo.add(inteiro); grupo.add(revirado);
  grupo.position.set(x, y, z);
  /* Lixo é superfície pisável, não teto: quem barra o corpo é o colisor do monte, que o
     modo encolhe conforme o hp cai. Sem esta marca a sonda do map-check acusa saco rasgado. */
  grupo.userData.nonSolidSurface = true;
  kit.root.add(grupo);
  grupo.traverse((o) => { if (o.isMesh) { o.userData.foodId = id; kit.occluders.push(o); } });

  const altura = kind === 'cacamba' ? 1.5 : kind === 'feira' ? 1.1 : 0.9;
  const col = { minX: x - meia, maxX: x + meia, minY: y, maxY: y + altura, minZ: z - meia, maxZ: z + meia };
  kit.colliders.push(col);
  foodColliders.set(id, col);
  foodMeshes.set(id, grupo);
  foodSpots.push({ id, x: +x.toFixed(2), z: +z.toFixed(2), hp: HP_PADRAO[kind], kind, r: +(meia + 0.4).toFixed(2) });
}

/* Lixo cênico: não é foodSpot, é o estrago. Tudo em UMA InstancedMesh por família e
   marcado `nonSolidSurface` — peça solta de 0,3 m não pode virar teto na sonda do mapa. */
function lixoSolto(kit, campo, rnd) {
  const { MAT } = kit;
  const sacos = [], caixotes = [];
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const mtx = (x, y, z, ry, e) => {
    _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(e, e, e);
    return new THREE.Matrix4().compose(_p, _q, _s);
  };
  for (let i = 0; i < 54; i++) {
    const perto = rnd() < 0.6;
    let x, z;
    if (perto) {
      const eixo = rnd() < 0.5;
      const s = rnd() < 0.5 ? -1 : 1;
      const t = (rnd() - 0.5) * 2 * (CIDADE_R - 2);
      const o = s * (AV + 0.6 + rnd() * (CAL - 0.3));
      x = eixo ? o : t; z = eixo ? t : o;
    } else {
      x = (rnd() - 0.5) * 2 * (CIDADE_R - 3); z = (rnd() - 0.5) * 2 * (CIDADE_R - 3);
    }
    const y = campo.amostra(x, z);
    if (rnd() < 0.55) sacos.push(mtx(x, y + 0.2, z, rnd() * 6.283, 0.5 + rnd() * 0.5));
    else caixotes.push(mtx(x, y + 0.16, z, rnd() * 6.283, 0.7 + rnd() * 0.6));
  }
  const add = (lista, geo, mat, nome) => {
    if (!lista.length) return;
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    for (let i = 0; i < lista.length; i++) m.setMatrixAt(i, lista[i]);
    m.name = nome; m.castShadow = true; m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true; m.userData.nonSolidSurface = true;
    m.computeBoundingSphere();
    kit.root.add(m);
  };
  add(sacos, new THREE.IcosahedronGeometry(0.34, 0), MAT.saco, 'lixo-saco-solto');
  add(caixotes, new THREE.BoxGeometry(0.5, 0.32, 0.38), MAT.caixote, 'lixo-caixote-solto');
}

/* ── BECOS ─────────────────────────────────────────────────────────────────────────── */
/* Um beco por lado, no quarteirão externo: liga o anel perimetral (pasto) à viela.
   Medidas e o porquê dos 2,5 m: docs/maps/invasao-javaporcos-layout.md, seção "Becos". */
export const BECO_MEIA = 1.25;
const BECO_FUNDO = 5.2;
const BECOS = {
  'LN-io': { id: 'beco-norte', nome: 'Beco do Medidor' },
  'OS-io': { id: 'beco-sul', nome: 'Beco do Varal' },
  'LS-oi': { id: 'beco-leste', nome: 'Beco do Botijão' },
  'ON-oi': { id: 'beco-oeste', nome: 'Beco da Caixa' },
};

function novosExtras() {
  return { medidor: [], eletroduto: [], vao: [], grade: [], arame: [], roupa: [], roupaCor: [], botijao: [], saco: [], lixeira: [], becoAreas: [] };
}

const _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
const mtx = (x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) => {
  _me.set(rx, ry, rz); _mq.setFromEuler(_me); _mp.set(x, y, z); _ms.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_mp, _mq, _ms);
};

function quarteiraoBeco(kit, campo, rnd, b, def, ex) {
  const { MAT, caixa, piso, colliders } = kit;
  const aoLongoZ = b.az === 'o';
  const [c0, c1] = aoLongoZ ? [b.x0, b.x1] : [b.z0, b.z1];
  const [l0, l1] = aoLongoZ ? [b.z0, b.z1] : [b.x0, b.x1];
  const sOut = aoLongoZ ? b.sz : b.sx;
  const lOut = sOut < 0 ? l0 : l1, lIn = sOut < 0 ? l1 : l0, dIn = Math.sign(lIn - lOut);
  const cm = (c0 + c1) / 2, comp = Math.abs(lIn - lOut);
  const larg = (c1 - c0) / 2 - BECO_MEIA - 0.35;
  const W = (c, l) => (aoLongoZ ? [c, l] : [l, c]);
  const dims = (dc, dl) => (aoLongoZ ? [dc, dl] : [dl, dc]);
  const ryPara = (f) => (aoLongoZ ? (f > 0 ? 0 : Math.PI) : (f > 0 ? Math.PI / 2 : -Math.PI / 2));
  const parede = MAT.rebocoDesc;

  const altA = 6, altB = rnd() < 0.5 ? 6 : 3;
  const [ax, az] = W(cm - BECO_MEIA - larg / 2, lOut + dIn * BECO_FUNDO / 2);
  casa(kit, campo, rnd, ax, az, larg, BECO_FUNDO, ryPara(-dIn), altA, 0, parede[0]);
  const [bx, bz] = W(cm + BECO_MEIA + larg / 2, lIn - dIn * BECO_FUNDO / 2);
  casa(kit, campo, rnd, bx, bz, larg, BECO_FUNDO, ryPara(dIn), altB, 1, parede[1]);

  const muroC = (cc, la, lb, esp, alt, mat) => {
    const [x, z] = W(cc, (la + lb) / 2), [w, d] = dims(esp, Math.abs(lb - la));
    caixa(w, alt, d, mat, x, campo.amostra(x, z), z, {});
  };
  const muroL = (ll, ca, cb, esp, alt, mat) => {
    const [x, z] = W((ca + cb) / 2, ll), [w, d] = dims(Math.abs(cb - ca), esp);
    caixa(w, alt, d, mat, x, campo.amostra(x, z), z, {});
  };
  const quintal = comp - BECO_FUNDO;
  muroC(cm - BECO_MEIA - 0.1, lOut + dIn * BECO_FUNDO, lIn, 0.2, 2.2, parede[1]);
  muroC(cm + BECO_MEIA + 0.1, lOut, lOut + dIn * quintal, 0.2, 2.2, parede[0]);
  muroL(lIn - dIn * 0.08, c0 + 0.2, cm - BECO_MEIA - 0.2, 0.16, 1.9, MAT.bloco);
  muroC(c0 + 0.1, lOut + dIn * BECO_FUNDO, lIn - dIn * 0.16, 0.16, 1.9, MAT.bloco);
  muroL(lOut + dIn * 0.08, cm + BECO_MEIA + 0.2, c1 - 0.2, 0.16, 1.9, MAT.bloco);
  muroC(c1 - 0.1, lOut + dIn * 0.16, lOut + dIn * quintal, 0.16, 1.9, MAT.bloco);

  const [fx, fz] = W(cm, (lOut + lIn) / 2), [fw, fd] = dims(2 * BECO_MEIA, comp);
  piso(fw, fd, MAT.cimento, fx, fz, 0.026, 'chao-beco');
  for (const [cc, la, lb] of [[cm - BECO_MEIA - larg / 2, lOut + dIn * BECO_FUNDO, lIn], [cm + BECO_MEIA + larg / 2, lOut, lOut + dIn * quintal]]) {
    const [qx, qz] = W(cc, (la + lb) / 2), [qw, qd] = dims(larg, Math.abs(lb - la));
    piso(qw, qd, MAT.terraQuintal, qx, qz, 0.006, 'chao-quintal');
  }
  const [ex0, ez0] = W(cm - BECO_MEIA, lOut), [ex1, ez1] = W(cm + BECO_MEIA, lIn);
  ex.becoAreas.push([Math.min(ex0, ex1), Math.max(ex0, ex1), Math.min(ez0, ez1), Math.max(ez0, ez1)]);

  const caixaLocal = (lista, c, y, l, dc, h, dl) => {
    const [x, z] = W(c, l), [w, d] = dims(dc, dl);
    lista.push(mtx(x, y, z, w, h, d));
  };
  // medidor com eletroduto subindo ao beiral, um em cada casa, na face do beco
  for (const [lado, lm, alt] of [[-1, lOut + dIn * 1.5, altA], [1, lIn - dIn * 1.5, altB]]) {
    const cw = cm + lado * (BECO_MEIA - 0.07);
    caixaLocal(ex.medidor, cw, 1.68, lm, 0.13, 0.44, 0.34);
    caixaLocal(ex.eletroduto, cm + lado * (BECO_MEIA - 0.03), 1.9 + (alt - 2.0) / 2, lm, 0.05, alt - 2.0, 0.05);
  }
  // janela gradeada: vão escuro e cinco barras, térreo e (sobrado) primeiro andar
  for (const [lado, lm, alt] of [[-1, lOut + dIn * 3.6, altA], [1, lIn - dIn * 3.6, altB]]) {
    for (const yb of alt > 5 ? [1.25, 4.05] : [1.25]) {
      caixaLocal(ex.vao, cm + lado * (BECO_MEIA - 0.02), yb + 0.5, lm, 0.06, 1.0, 0.9);
      for (let k = -2; k <= 2; k++) caixaLocal(ex.grade, cm + lado * (BECO_MEIA - 0.08), yb + 0.5, lm + k * 0.19, 0.025, 1.04, 0.025);
      for (const yy of [yb + 0.02, yb + 0.98]) caixaLocal(ex.grade, cm + lado * (BECO_MEIA - 0.08), yy, lm, 0.025, 0.025, 0.94);
    }
  }
  // varal na parede do sobrado: dois suportes, o arame e as peças penduradas acima de 1,6 m
  const vl0 = lOut + dIn * 0.9, vl1 = lOut + dIn * 4.4, vc = cm - BECO_MEIA + 0.36;
  for (const lv of [vl0, vl1]) caixaLocal(ex.arame, cm - BECO_MEIA + 0.18, 2.32, lv, 0.36, 0.03, 0.03);
  caixaLocal(ex.arame, vc, 2.3, (vl0 + vl1) / 2, 0.012, 0.012, Math.abs(vl1 - vl0));
  const CORES = [0xc94f4f, 0x3c5e8c, 0xe0d9c4, 0x6f8f4a, 0xd9a441, 0x8a5a9a, 0x2f2f33];
  for (let t = 0.12; t < 0.95; t += 0.16 + rnd() * 0.06) {
    const lr = vl0 + (vl1 - vl0) * t, h = 0.45 + rnd() * 0.25, w = 0.32 + rnd() * 0.2;
    const [x, z] = W(vc, lr);
    ex.roupa.push(mtx(x, 2.3 - h / 2, z, w, h, 1, aoLongoZ ? Math.PI / 2 : 0));
    ex.roupaCor.push(new THREE.Color(CORES[(rnd() * CORES.length) | 0]));
  }
  // botijão encostado no muro, com colisor; lixo e lixeira tombada no fim do beco
  const [gx, gz] = W(cm + BECO_MEIA - 0.24, lOut + dIn * 1.1);
  ex.botijao.push(mtx(gx, 0.3, gz, 1, 1, 1, rnd() * 6.283));
  colliders.push({ minX: gx - 0.17, maxX: gx + 0.17, minY: 0, maxY: 0.62, minZ: gz - 0.17, maxZ: gz + 0.17 });
  for (let k = 0; k < 4; k++) {
    const [x, z] = W(cm - BECO_MEIA + 0.3 + rnd() * 0.25, lIn - dIn * (0.5 + k * 0.42));
    const e = 0.75 + rnd() * 0.45;
    ex.saco.push(mtx(x, 0.2 * e, z, e, e * 0.8, e, rnd() * 6.283));
  }
  const [lx, lz] = W(cm + BECO_MEIA - 0.42, lIn - dIn * (BECO_FUNDO + 0.6));
  ex.lixeira.push(mtx(lx, 0.27, lz, 0.55, 0.52, 0.8, rnd() * 6.283, 0, Math.PI / 2));

  const [dx, dz] = W(cm, lOut - dIn * 0.6), [tx, tz] = W(cm, lIn + dIn * 0.6);
  return {
    casas: 2,
    contrato: { id: def.id, nome: def.nome, de: { x: +dx.toFixed(2), z: +dz.toFixed(2) }, ate: { x: +tx.toFixed(2), z: +tz.toFixed(2) },
      abreNaOnda: 3, largura: 2 * BECO_MEIA },
  };
}

/* Peças do beco em lote: uma InstancedMesh por família para os quatro becos juntos. As
   que não têm colisor levam `nonSolidSurface` — não são chão nem teto para a sonda. */
function construirExtras(kit, ex) {
  const { MAT, root, occluders } = kit;
  const lote = (lista, geo, mat, nome, { solido = false, cores = null, sombra = true } = {}) => {
    if (!lista.length) return;
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    for (let i = 0; i < lista.length; i++) { m.setMatrixAt(i, lista[i]); if (cores) m.setColorAt(i, cores[i]); }
    m.name = nome; m.castShadow = sombra; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (solido) occluders.push(m); else m.userData.nonSolidSurface = true;
    m.computeBoundingSphere();
    root.add(m);
  };
  const cubo = new THREE.BoxGeometry(1, 1, 1);
  lote(ex.medidor, cubo, MAT.medidor, 'beco-medidor');
  lote(ex.eletroduto, cubo, MAT.cabo, 'beco-eletroduto', { sombra: false });
  lote(ex.vao, cubo, MAT.vao, 'beco-janela', { sombra: false });
  lote(ex.grade, cubo, MAT.metal, 'beco-grade', { sombra: false });
  lote(ex.arame, cubo, MAT.cabo, 'beco-varal', { sombra: false });
  const roupaGeo = new THREE.PlaneGeometry(1, 1);
  lote(ex.roupa, roupaGeo, MAT.roupa, 'beco-roupa', { cores: ex.roupaCor });
  const botijaoGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.6, 14);
  lote(ex.botijao, botijaoGeo, MAT.botijao, 'beco-botijao', { solido: true });
  const sacoGeo = new THREE.IcosahedronGeometry(0.3, 1);
  lote(ex.saco, sacoGeo, MAT.saco, 'beco-saco');
  lote(ex.lixeira, cubo, MAT.lixeiraAmarela, 'beco-lixeira');
}
