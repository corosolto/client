// Attachments e SILHOUETTE KITS procedurais dos viewmodels estáticos (GAUNTLET 2.0):
// peças simples alinhadas ao eixo do cano — o cano dos GLBs Tripo é baked em DIAGONAL,
// então tudo é posicionado em gun-space (t = param stock→muzzle, h = altura ⊥ eixo,
// s = lateral). Medidas em tools/g2-gunspace.mjs. O crítico R2: "identidade é FORMA,
// não cor" — os kits abaixo mudam a SILHUETA de cada arma sobre o mesh M4 base.
// Importado pelo game.js e pelo vm-inspect.html (debug visual com ?att=kind,cls).
import * as THREE from 'three';

export const VM_GUNSPACE = {
  rifle:   { stock: [0.275, -0.117, -0.431], muzzle: [-0.356, 0.285, 0.465] },
  pistol:  { stock: [0.118, -0.235, -0.446], muzzle: [-0.230, 0.350, 0.462] },
  shotgun: { stock: [0.169, -0.200, -0.432], muzzle: [-0.117, 0.105, 0.463], tip: [-0.251, 0.335, 0.476] },   // tip (G2-R8): o slab em Z pega a mão da pump — bore = 1% mais distante AO LONGO do eixo
  awp:     { stock: [-0.054, -0.058, -0.428], muzzle: [-0.133, 0.136, 0.469] },
  // AK-herói dedicada (G2-R7, arms_ak.glb): eixo quase sem cant em X (diferente da
  // classe rifle), sobe ~28° em Y — medido em tools/g2r7-measure.mjs. ATENÇÃO: os
  // dedos da mão esquerda passam da boca do cano em +Z — o muzzle do eixo é o centroide
  // da ponta (contaminado p/ flash); a BOCA real é o `tip` (calibrado com landmarks
  // anotados em tools/eval/g2r7-mzmarks.mjs).
  ak:      { stock: [-0.102, -0.167, -0.431], muzzle: [-0.101, 0.309, 0.467], tip: [-0.10, 0.33, 0.44] },
  // Heróis G2-R7B (medidos em tools/g2r7-measure.mjs; mp5 medido ao longo de X — o cano
  // dela corre quase em -X no model space; o eixo foi refeito seguindo o TRILHO do cano
  // em fatias de x — o centroide de pontas cai em mãos/front sight e entorta a base).
  // tips calibrados com mzmarks.
  m4:      { stock: [-0.089, -0.052, -0.437], muzzle: [-0.001, 0.174, 0.468], tip: [-0.001, 0.174, 0.468] },
  mp5:     { stock: [0.35, 0.105, -0.025], muzzle: [-0.49, 0.245, 0.185], tip: [-0.49, 0.245, 0.185] },
  awphero: { stock: [-0.052, -0.101, -0.438], muzzle: [-0.184, 0.271, 0.465], tip: [-0.184, 0.271, 0.465] },
  // Heróis G2-R11 (P90/UZI — medidos em tools/g2r7-measure.mjs; tips p/ mzmarks).
  // p90: o slab em Z mentiu (eixo z-dominante); refeito pelo TRILHO do cano em fatias
  // de X — o cano corre em -X subindo (bore = centro do muzzle brake x∈[-0.475,-0.42]).
  p90:     { stock: [0.25, -0.11, 0.07], muzzle: [-0.45, 0.33, 0.455], tip: [-0.45, 0.33, 0.455] },
  uzi:     { stock: [0.144, -0.221, -0.423], muzzle: [-0.188, 0.361, 0.465], tip: [-0.188, 0.361, 0.465] },
  // Heróis G2-R11B (TAVOR/FAMAS). tips p/ mzmarks.
  // tavor: o slab em Z pegou a mão da frente (muzzle baixo) — o bore real é o 1% mais
  // distante AO LONGO do eixo (validado com landmarks: candidato A no brake).
  tavor:   { stock: [0.378, -0.107, -0.370], muzzle: [0.037, -0.211, 0.409], tip: [-0.463, 0.291, 0.377] },
  famas:   { stock: [-0.041, -0.100, -0.431], muzzle: [-0.022, 0.234, 0.464], tip: [-0.022, 0.234, 0.464] },
  // Herói G2-R13 (SVD — coronha esqueleto de madeira + PSO-1).
  svd:     { stock: [0.200, -0.153, -0.432], muzzle: [-0.284, 0.307, 0.465], tip: [-0.284, 0.307, 0.465] },
};
export function gunBasis(cls) {
  const g = VM_GUNSPACE[cls];
  const st = new THREE.Vector3(...g.stock), mz = new THREE.Vector3(...g.muzzle);
  const axis = mz.clone().sub(st); const L = axis.length(); axis.normalize();
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(axis, -axis.y).normalize();
  const side = new THREE.Vector3().crossVectors(up, axis);
  const m = new THREE.Matrix4().makeBasis(side, up, axis);
  return { st, axis, up, side, L, quat: new THREE.Quaternion().setFromRotationMatrix(m) };
}
export function buildVmAttachment(cls, kind) {
  const { st, axis, L, quat } = gunBasis(cls);
  const grp = new THREE.Group();
  grp.position.copy(st);                           // origem = stock (P usa t ao longo do eixo)
  grp.quaternion.copy(quat);                       // +Z local = eixo do cano, +Y = cima
  // materiais coerentes com o fix global (metal ≤0.55, rough ≥0.45, env 1.8)
  const mat = (color, rough = 0.5, metal = 0.5, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: Math.max(0.45, rough), metalness: Math.min(0.55, metal), envMapIntensity: 1.8, ...extra });
  const P = (t, h, s) => new THREE.Vector3(s, h, t * L);   // gun-space local (origem=stock)
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  // caixa com BEVEL mínimo (crítico R4: "caixas pretas chapadas") — chanfro de 6mm
  const bevelBox = (w, h, d, m) => {
    const s = new THREE.Shape();
    const hw = w / 2, hh = h / 2;
    s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(-hw, hh);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.004, d - 0.012), bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
    g.translate(0, 0, -Math.max(0.004, d - 0.012) / 2);
    return new THREE.Mesh(g, m);
  };
  const cyl = (r0, r1, len, m, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, seg), m);
  const sph = (r, m) => new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
  // add: t = param no eixo, h = altura, s = lateral; rot opcional [x,y,z] aplicada ao mesh
  const add = (mesh, t, h, s, rot) => {
    mesh.position.copy(P(t, h, s));
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    grp.add(mesh); return mesh;
  };
  const dark = mat(0x17191b, 0.55, 0.5);
  const black = mat(0x101214, 0.6, 0.4);
  const gunmetal = mat(0x2a2d30, 0.55, 0.5);   // casa com o corpo texturizado (crítico R4)
  const wood = mat(0x6b3d1e, 0.65, 0.05);
  const bakelite = mat(0x7a3d1c, 0.6, 0.1);
  const steel = mat(0x24272a, 0.5, 0.5);

  if (kind === 'suppressor') {
    // MP5SD: supressor GORDO e LONGO (crítico R4: +30%, r 0.06) projetando-se além
    // do front sight
    add(cyl(0.06, 0.06, 0.44, gunmetal), 1.0 + 0.19 / L, 0, 0, [Math.PI / 2, 0, 0]);
    add(cyl(0.066, 0.066, 0.035, dark), 1.0 + 0.005 / L, 0, 0, [Math.PI / 2, 0, 0]);   // flange na boca
  } else if (kind === 'aimpoint') {
    // CompM4/Aimpoint (SCAR): TUBO, não caixa — diferencia da holo EOTech do M4 (crítico R3)
    const body = mat(0x8a7657, 0.6, 0.25);
    add(cyl(0.024, 0.024, 0.10, body, 12), 0.44, 0.175, 0, [Math.PI / 2, 0, 0]);
    add(box(0.05, 0.02, 0.05, body), 0.44, 0.145, 0);
  } else if (kind === 'holo' || kind === 'holo_tan') {
    // ×1.6 (crítico R2: "cubo preto de 20px") — EOTech lê de longe
    const body = kind === 'holo_tan' ? mat(0x9a8563, 0.6, 0.2) : dark;
    add(box(0.075, 0.016, 0.105, body), 0.44, 0.148, 0);
    add(box(0.062, 0.052, 0.075, body), 0.44, 0.181, 0);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.006, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
    dot.position.copy(P(0.44 - 0.039 / L, 0.181, 0)); dot.rotation.y = Math.PI; grp.add(dot);   // retículo p/ o atirador
  } else if (kind === 'reflex') {
    add(box(0.058, 0.015, 0.075, dark), 0.46, 0.148, 0);
    add(box(0.05, 0.04, 0.05, dark), 0.46, 0.175, 0);
  } else if (kind === 'akmag' || kind === 'akmag_bakelite') {
    // MAG CURVA 7.62 — O traço da AK (crítico R2): arco de torus achatado cobrindo a mag
    // reta baked, curvando p/ frente; lê de perfil no ângulo FP
    const m = kind === 'akmag_bakelite' ? bakelite : steel;
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.042, 8, 16, 1.15), m);
    add(tor, 0.485, -0.125, 0.008, [0, 0, -1.42]);
    tor.scale.set(1, 1, 0.52);
  } else if (kind === 'gastube') {
    // gas tube acima do cano (AKM): cilindro fino sobre o handguard
    add(cyl(0.024, 0.024, 0.30, steel), 0.70, 0.105, 0, [Math.PI / 2, 0, 0]);
    add(cyl(0.030, 0.030, 0.05, steel), 0.845, 0.09, 0, [Math.PI / 2, 0, 0]);   // bloco de gás
  } else if (kind === 'slantbrake') {
    // AKM: freio de boca INCLINADO (slant) — diferença de FORMA AK×AKM em grayscale
    // (crítico R3: não pode depender de pente preto vs laranja)
    add(box(0.045, 0.055, 0.075, steel), 1.0 + 0.025 / L, 0.012, 0, [0.35, 0, 0]);
  } else if (kind === 'slimmag') {
    // mag fina (MP5): cobre a mag STANAG baked curvando p/ FRENTE (mais larga que a
    // baked ~0.03 de meia-largura, senão fica enterrada)
    add(box(0.062, 0.15, 0.065, dark), 0.47, -0.12, 0, [0, 0, 0.12]);
    add(box(0.058, 0.12, 0.06, dark), 0.50, -0.245, 0, [0, 0, 0.38]);
  } else if (kind === 'g3mag') {
    // mag fina reta e longa do G3 (7.62 NATO)
    add(box(0.05, 0.26, 0.06, dark), 0.475, -0.19, 0, [0, 0, 0.06]);
  } else if (kind === 'g3stock') {
    // coronha fixa larga do G3: lê de perfil (crítico R4) — bloco cheio com bevel
    add(bevelBox(0.10, 0.17, 0.32, mat(0x2a2e22, 0.65, 0.1)), 0.05, 0.02, 0);
    add(bevelBox(0.08, 0.11, 0.28, mat(0x2a2e22, 0.65, 0.1)), 0.67, 0.02, 0);   // handguard largo
  } else if (kind === 'm92barrel') {
    // carabina de alavanca: cano longo GROSSO + magazine tubular sob o cano (crítico R4)
    add(cyl(0.030, 0.030, 0.34, gunmetal), 1.0 + 0.12 / L, 0, 0, [Math.PI / 2, 0, 0]);
    add(cyl(0.020, 0.020, 0.30, steel), 1.0 + 0.10 / L, -0.052, 0, [Math.PI / 2, 0, 0]);
    add(box(0.022, 0.05, 0.03, dark), 1.0 + 0.27 / L, 0.035, 0);   // mira de cunha
  } else if (kind === 'lever') {
    // alavanca: arco VISÍVEL abaixo do grip (crítico R4/R5). G2-R12: maior e mais
    // alta — no framing novo (R8) a mão cobria o arco
    const lev = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.015, 6, 14, 3.9), steel);
    add(lev, 0.30, -0.055, 0, [0, Math.PI / 2, 2.7]);
  } else if (kind === 'longbarrel') {
    // carbine: cano longo GROSSO (crítico R4)
    add(cyl(0.028, 0.028, 0.32, gunmetal), 1.0 + 0.11 / L, 0, 0, [Math.PI / 2, 0, 0]);
  } else if (kind === 'uzibody') {
    // UZI: receiver BOXY cobrindo o MEIO do corpo (tijolo central, não bloco traseiro
    // — diferencia da cheek do tavor e da coronha do G3)
    add(bevelBox(0.11, 0.15, 0.38, gunmetal), 0.45, 0.11, 0);
    add(box(0.05, 0.03, 0.06, black), 0.55, 0.20, 0);   // cocking knob no topo
  } else if (kind === 'uzimag') {
    // mag longa e fina DENTRO do grip — protrui abaixo da mão (base da mão h≈-0.20)
    add(box(0.034, 0.22, 0.05, black), 0.33, -0.25, 0, [0, 0, -0.03]);
    add(cyl(0.028, 0.028, 0.07, dark), 0.985, 0, 0, [Math.PI / 2, 0, 0]);   // barrel nut
  } else if (kind === 'p90mag') {
    // P90: MAG HORIZONTAL em cima do corpo — traço inconfundível. G2-R9: mais alta
    // (h 0.16→0.185) e cumprida p/ trás — no framing novo ela recorta a linha do
    // receiver e lê de primeira (antes sumia atrás do rail)
    add(box(0.10, 0.04, 0.52, mat(0x2e2a24, 0.6, 0.2)), 0.42, 0.185, 0);
    add(box(0.06, 0.02, 0.05, dark), 0.68, 0.175, 0);   // boca da mag
  } else if (kind === 'p90body') {
    // corpo bullpup compacto: shroud cobrindo receiver (protrui lados/frente)
    add(box(0.10, 0.13, 0.36, mat(0x3a4030, 0.6, 0.15)), 0.40, 0.075, 0);
    add(box(0.05, 0.10, 0.10, mat(0x3a4030, 0.6, 0.15)), 0.70, -0.06, 0);   // front grip
  } else if (kind === 'famashump') {
    // FAMAS: carry handle ARQUEADO ALTO recortando o céu (crítico R3 — a corcova
    // embutida não lia de quadril). Arco aberto sobre o corpo: 2 montantes + laje,
    // com vão visível entre a alça e o receiver. G2-R8: gunmetal (era black — lia
    // como "caixinha preta" descolada do corpo texturizado)
    add(box(0.05, 0.06, 0.30, gunmetal), 0.40, 0.145, 0);                       // corpo da alça (base)
    add(box(0.026, 0.09, 0.026, gunmetal), 0.30, 0.20, 0);                      // montante traseiro
    add(box(0.026, 0.09, 0.026, gunmetal), 0.52, 0.20, 0);                      // montante dianteiro
    add(box(0.028, 0.026, 0.27, gunmetal), 0.41, 0.25, 0);                      // laje do arco (recorta o céu)
    add(box(0.014, 0.024, 0.014, gunmetal), 0.545, 0.27, 0);                    // mira no topo
  } else if (kind === 'tavorbody') {
    // TAVOR bullpup: corpo estendido pra TRÁS + CHEEK REST = DEGRAU alto no fundo
    // (diferencia da caixa boxy do uzi e da coronha do g3). G2-R8: gunmetal (era
    // black — o crítico leu "caixa preta gigante cobrindo 1/3 da tela") + corpo
    // ~15% mais estreito pra não dominar o quadro no framing novo
    add(box(0.085, 0.14, 0.44, gunmetal), 0.28, 0.08, 0);
    add(box(0.06, 0.09, 0.20, gunmetal), 0.04, 0.175, 0);                       // degrau bochecha
    add(box(0.045, 0.02, 0.36, dark), 0.38, 0.175, 0);
  } else if (kind === 'tavormag') {
    // mag ATRÁS do grip (bullpup) — protrui BEM abaixo da linha da coronha (lê de quadril)
    add(box(0.042, 0.24, 0.065, gunmetal), 0.19, -0.25, 0, [0, 0, 0.06]);
  } else if (kind === 'tavorshroud') {
    // cobre a mag baked INTEIRA (bullpup não tem mag no meio) — lê como front grip
    add(box(0.075, 0.30, 0.09, gunmetal), 0.47, -0.16, 0);
  } else if (kind === 'uzimagcover') {
    // UZI: sem pente frontal — cobre a mag baked (a Uzi tem mag no grip, não à frente)
    add(box(0.075, 0.28, 0.09, dark), 0.47, -0.15, 0);
  } else if (kind === 'lmgbox') {
    // caixa de munição + CINTO DE CARTUCHOS subindo ao receiver (crítico R3: sem cinto
    // lia como gambiarra solta). G2-R12: gunmetal PBR (era preto chapado 0x1c1e1c met 0.15
    // — o crítico leu "cubo preto sem PBR"). G2-R13: COSTURAS/ribetes na caixa (2 frisos
    // verticais + tampa) pra quebrar a leitura de cubo liso
    add(box(0.10, 0.10, 0.13, mat(0x2e3236, 0.5, 0.55)), 0.42, -0.075, 0.08);
    add(box(0.03, 0.04, 0.10, gunmetal), 0.42, -0.015, 0.055);   // feed tray
    add(box(0.104, 0.012, 0.134, mat(0x1e2124, 0.55, 0.5)), 0.42, -0.045, 0.08);   // friso superior
    add(box(0.104, 0.012, 0.134, mat(0x1e2124, 0.55, 0.5)), 0.42, -0.105, 0.08);   // friso inferior
    add(box(0.012, 0.104, 0.134, mat(0x1e2124, 0.55, 0.5)), 0.42, -0.075, 0.08);   // friso lateral
    const brass = mat(0x8a7434, 0.5, 0.55);
    for (let i = 0; i < 5; i++) add(box(0.013, 0.013, 0.028, brass), 0.435 + i * 0.014, -0.028, 0.062);
  } else if (kind === 'bipod') {
    // bipé aberto à frente. G2-R12: mount gunmetal (era dark — "laje preta" do crítico)
    add(cyl(0.009, 0.009, 0.24, steel, 6), 0.80, -0.13, -0.055, [0.6, 0, 0.35]);
    add(cyl(0.009, 0.009, 0.24, steel, 6), 0.80, -0.13, 0.055, [0.6, 0, -0.35]);
    add(cyl(0.014, 0.014, 0.05, gunmetal, 6), 0.80, -0.045, 0, [Math.PI / 2, 0, 0]);
  } else if (kind === 'deagleslide') {
    // Deagle: slide longo/pesado — extensão CURTA e embutida (a frente fica pequena pra
    // não ler como "cartão" pra câmera), cromo escuro casando com o slide
    const chrome = mat(0x9aa0a8, 0.5, 0.55);
    add(box(0.048, 0.085, 0.11, chrome), 1.0 + 0.025 / L, 0.01, 0, [1.12, 0, 0]);
    add(box(0.014, 0.026, 0.014, black), 1.0 + 0.075 / L, 0.055, 0, [1.12, 0, 0]);   // mira frontal
  } else if (kind === 'drum2') {
    // Revólver (GUNFEEL): o crítico não achava tambor, martelo, guarda-mato nem dedo no
    // gatilho — "a arma é 6% da massa visual do quadro". O tambor saiu de t=0.68 (longe,
    // atrás da mão no framing novo) pra t=0.56 e ganhou CANELURAS (6 faces), martelo e
    // guarda-mato: são esses 3 traços que fazem um .38 ler como revólver de primeira.
    // CALIBRAÇÃO R2 — dois defeitos, nesta ordem de gravidade:
    //  (1) EIXO ERRADO. O tambor estava com rot [0,0,π/2], que gira o eixo do cilindro
    //      para o LATERAL (gun-space X). Tambor de revólver gira em torno de um eixo
    //      PARALELO À ALMA — é [π/2,0,0], a mesma convenção do supressor/luneta neste
    //      arquivo. Deitado de través ele lia como um caroço, nunca como tambor.
    //  (2) OCLUSÃO. t=0.56 cai em cima do punho no enquadramento do FP; o tambor ia
    //      inteiro pra trás da mão. Foi pra 0.72 (à frente do punho, na altura em que
    //      o frame do .38 realmente aparece) e o martelo/guarda-mato/gatilho subiram
    //      junto, pra não ficarem enterrados no antebraço.
    // Bônus de leitura DE FRENTE (a câmera vê a .38 quase pela linha da alma): haste
    // ejetora + lug embaixo do cano e massa de mira em cima — a silhueta de dois
    // andares na boca é o tell do .38 que sobrevive ao escorço.
    // ?rev38=0 volta ao layout da rodada 1 (A/B do dono).
    const blued = mat(0x2b3038, 0.45, 0.55);
    const r2 = (typeof location === 'undefined') || new URLSearchParams(location.search).get('rev38') !== '0';
    if (!r2) {
      add(cyl(0.078, 0.078, 0.175, blued, 6), 0.56, 0.0, 0.012, [0, 0, Math.PI / 2]);
      add(cyl(0.022, 0.022, 0.20, steel, 8), 0.56, 0.0, 0.012, [0, 0, Math.PI / 2]);
      add(box(0.030, 0.055, 0.045, blued), 0.30, 0.115, 0, [0.5, 0, 0]);
      const g0 = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 12, 3.1), blued);
      add(g0, 0.40, -0.085, 0, [0, Math.PI / 2, 0.4]);
      add(box(0.012, 0.040, 0.014, steel), 0.41, -0.055, 0, [0.25, 0, 0]);
    } else {
      add(cyl(0.082, 0.082, 0.22, blued, 6), 0.72, 0.0, 0.018, [Math.PI / 2, 0, 0]);      // tambor caneluado, COAXIAL à alma
      add(cyl(0.090, 0.090, 0.020, steel, 6), 0.615, 0.0, 0.018, [Math.PI / 2, 0, 0]);    // escudo de recuo (face traseira do tambor)
      add(cyl(0.020, 0.020, 0.28, steel, 8), 0.86, -0.052, 0, [Math.PI / 2, 0, 0]);       // haste ejetora sob o cano
      add(box(0.034, 0.046, 0.26, blued), 0.87, -0.050, 0);                               // lug/underlug — 2º andar na boca
      add(box(0.014, 0.030, 0.030, blued), 0.985, 0.052, 0);                              // massa de mira na ponta
      add(box(0.030, 0.058, 0.045, blued), 0.56, 0.105, 0, [0.5, 0, 0]);                  // martelo (cão) armado
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 12, 3.1), blued);
      add(guard, 0.61, -0.088, 0, [0, Math.PI / 2, 0.4]);                                 // guarda-mato
      add(box(0.012, 0.040, 0.014, steel), 0.62, -0.058, 0, [0.25, 0, 0]);                // gatilho
    }
  } else if (kind === 'tacguard') {
    // MD97: handguard TÁTICO ventilado sobre o pump (crítico R3: M3 madeira × MD97
    // militar tinham a mesma silhueta) — caixa com slots cobrindo o pump de madeira
    add(box(0.062, 0.075, 0.24, dark), 0.68, -0.01, 0);
    for (let i = 0; i < 3; i++) add(box(0.068, 0.02, 0.03, black), 0.62 + i * 0.06, 0.028, 0);
  } else if (kind === 'pgrip') {
    // MD97: coronha pistol-grip (cunha atrás do receiver em vez da coronha fixa de madeira)
    add(box(0.045, 0.10, 0.055, dark), 0.24, -0.10, 0, [0, 0, 0.45]);
  } else if (kind === 'svdstock') {
    // SVD: coronha ESQUELETO (frame com vão ALTO — o poste traseiro é o que lê).
    // G2-R10: frame MAIOR (lê na borda do quadro — o trio sniper lia "o mesmo rifle preto")
    add(box(0.032, 0.036, 0.34, gunmetal), -0.02, 0.12, 0);
    add(box(0.032, 0.036, 0.34, gunmetal), -0.02, -0.05, 0);
    add(box(0.032, 0.26, 0.034, gunmetal), -0.175, 0.035, 0);
    add(box(0.038, 0.04, 0.10, dark), 0.05, 0.16, 0);
  } else if (kind === 'svdguard') {
    // handguard ventilado da SVD
    add(box(0.055, 0.065, 0.24, gunmetal), 0.70, 0.0, 0);
    for (let i = 0; i < 3; i++) add(box(0.06, 0.016, 0.032, black), 0.63 + i * 0.07, 0.036, 0);
  } else if (kind === 'mosinbolt') {
    // MOSIN: ferrolho proeminente — haste HORIZONTAL saindo do lado da luneta
    // (a scope domina o frame; o ferrolho tem que protruir no flanco da câmera)
    add(cyl(0.013, 0.013, 0.075, steel, 8), 0.34, 0.05, 0.10, [Math.PI / 2, 0, Math.PI / 2]);
    add(sph(0.028, mat(0x4a4e55, 0.45, 0.55)), 0.34, 0.05, 0.155);
  } else if (kind === 'mosinbarrel') {
    // cano longo e fino da Mosin-Nagant + guarnição de madeira embaixo
    add(cyl(0.019, 0.019, 0.30, gunmetal, 10), 1.0 + 0.12 / L, 0, 0, [Math.PI / 2, 0, 0]);
    add(box(0.014, 0.03, 0.014, dark), 1.0 + 0.25 / L, 0.03, 0);
  } else if (kind === 'sksmag') {
    // SKS: pente integral GRANDE (caixa flush embaixo do receiver — lê no ângulo FP)
    add(box(0.055, 0.13, 0.12, gunmetal), 0.45, -0.10, 0);
  } else if (kind === 'sksclip') {
    // SKS (G2-R10): PENTE de munição (stripper clip) em cima do receiver — lê contra o
    // céu no flanco esquerdo, traço da carabina de pente
    add(box(0.016, 0.018, 0.11, steel), 0.38, 0.155, 0);
    add(box(0.010, 0.012, 0.05, mat(0x8a7434, 0.5, 0.55)), 0.38, 0.172, 0);   // ponta dos cartuchos
  } else if (kind === 'sksbayonet') {
    // baioneta fina sob o cano — LONGA, lendo sob o cano contra o chão. G2-R13: mais
    // longa e mais pra frente (o crítico não via a baioneta no ângulo FP)
    add(box(0.016, 0.036, 0.42, steel), 0.86, -0.06, 0);
  } else if (kind === 'rem700barrel') {
    // Rem700: cano PESADO (bull barrel) — cilindro grosso envolvendo o cano à frente
    add(cyl(0.042, 0.042, 0.44, gunmetal, 14), 0.72, 0.0, 0, [Math.PI / 2, 0, 0]);
  } else if (kind === 'g3sg1stock') {
    // G3SG1: coronha G3 larga + cheek riser ALTO e inconfundível
    add(bevelBox(0.085, 0.15, 0.28, gunmetal), 0.02, 0.02, 0);
    add(box(0.06, 0.075, 0.15, dark), 0.09, 0.155, 0);
  } else if (kind === 'g3sg1guard') {
    // G3SG1 (G2-R10): handguard LARGO ventilado (o trio sniper lia igual — a G3SG1
    // tem o guarda-mão "tátil" largo da G3, muito mais gordo que o da SVD/SKS)
    add(bevelBox(0.085, 0.095, 0.30, gunmetal), 0.68, 0.0, 0);
    for (let i = 0; i < 3; i++) add(box(0.088, 0.018, 0.036, black), 0.60 + i * 0.075, 0.045, 0);
  } else if (kind === 'scope_awp') {
    // AWP: campânula GRANDE (objetiva grossa — a luneta é o que aparece no frame)
    add(cyl(0.055, 0.055, 0.09, gunmetal, 14), 0.13, 0.23, 0, [Math.PI / 2, 0, 0]);
    add(cyl(0.058, 0.058, 0.02, dark, 14), 0.185, 0.23, 0, [Math.PI / 2, 0, 0]);
  } else if (kind === 'scope_svd') {
    // SVD/PSO-1: ocular com COPO DE BORRACHA GROSSO (lê perto da câmera) + objetiva pequena
    add(cyl(0.040, 0.043, 0.06, black, 12), 0.47, 0.23, 0, [Math.PI / 2, 0, 0]);
    add(cyl(0.030, 0.030, 0.03, gunmetal, 12), 0.14, 0.23, 0, [Math.PI / 2, 0, 0]);
  } else if (kind === 'scope_pu') {
    // Mosin PU: objetiva FINA e LONGA protruindo à frente da luneta baked
    add(cyl(0.019, 0.019, 0.18, gunmetal, 10), 0.07, 0.23, 0, [Math.PI / 2, 0, 0]);
    add(cyl(0.026, 0.026, 0.04, dark, 10), 0.47, 0.23, 0, [Math.PI / 2, 0, 0]);
  } else if (kind === 'scope_zf') {
    // G3SG1 ZF: campânula CURTA e gorda
    add(cyl(0.043, 0.043, 0.05, gunmetal, 14), 0.145, 0.23, 0, [Math.PI / 2, 0, 0]);
  } else if (kind === 'scope_hunt') {
    // Rem700: luneta de caça média (objetiva média)
    add(cyl(0.045, 0.045, 0.07, gunmetal, 14), 0.14, 0.23, 0, [Math.PI / 2, 0, 0]);
  } else if (kind === 'p90cover') {
    // P90: cobre a mag vertical baked (identidade = top mag + SEM mag embaixo) —
    // o shroud lê como continuação do corpo bullpup
    add(bevelBox(0.085, 0.30, 0.10, mat(0x3a4030, 0.6, 0.15)), 0.47, -0.15, 0);
  } else if (kind === 'drumside') {
    // Revólver: conjunto cilindro+grua POR FORA do frame (o frame da pistol é sólido —
    // deslocado lateralmente pro lado da câmera, alargando a silhueta)
    // GUNFEEL: alinhado ao tambor novo (t 0.58→0.56) e um pouco mais pra fora (s 0.075→0.085)
    // — no framing da pistola (arma 54% maior e 28% mais perto) ele passava por dentro da mão.
    // CALIBRAÇÃO R2: acompanha o drum2 — coaxial à alma ([π/2,0,0], não [0,0,π/2]) e em
    // t=0.72, à frente do punho. É esta peça que ALARGA a silhueta pro lado da câmera:
    // sem ela a .38 fica com a largura do frame sólido do mesh de pistola e lê como slide.
    const rv = mat(0x2b3038, 0.45, 0.55);
    const r2s = (typeof location === 'undefined') || new URLSearchParams(location.search).get('rev38') !== '0';
    if (!r2s) {
      add(cyl(0.07, 0.07, 0.15, rv, 6), 0.56, 0.04, 0.085, [0, 0, Math.PI / 2]);
      add(box(0.028, 0.028, 0.075, rv), 0.56, 0.04, 0.03);
      add(cyl(0.02, 0.02, 0.05, steel, 8), 0.56, 0.04, 0.085, [0, 0, Math.PI / 2]);
    } else {
      add(cyl(0.076, 0.076, 0.20, rv, 6), 0.72, 0.005, 0.082, [Math.PI / 2, 0, 0]);   // tambor deslocado pro lado da câmera
      add(box(0.075, 0.030, 0.060, rv), 0.615, 0.005, 0.050);                          // grua (liga o tambor ao frame)
      add(cyl(0.024, 0.024, 0.055, steel, 8), 0.72, 0.005, 0.082, [Math.PI / 2, 0, 0]);// eixo do tambor (haste ejetora fica no drum2, s=0 — não duplica)
    }
  } else if (kind === 'shells') {
    add(box(0.028, 0.055, 0.17, dark), 0.30, 0.06, 0.075);
    const shell = mat(0xa8232a, 0.55, 0.1);
    for (let i = 0; i < 4; i++) add(cyl(0.013, 0.013, 0.055, shell, 8), 0.26 + i * 0.03, 0.10, 0.075);
  }
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  return grp;
}

/* ===================== ENQUADRAMENTO DO VIEWMODEL MINT (G3-R1) =====================
   PORQUÊ existe: os 26 GLBs da Mint voltaram a ser a fonte do viewmodel de 1ª pessoa
   (antes: 8 GLBs-herói Tripo de 18 MB + kit de textura-variante sobre ~5 malhas base —
   "várias armas com visuais iguais"). Enquadrar 26 armas com uma TABELA POR ARMA seria
   26 chances de errar; aqui o enquadramento é DERIVADO do que weapons.js já mede
   (len / gripZ / vm) e de 5 números por CLASSE. Uma arma nova entra sem tuning.

   O modelo (câmera do VM na origem olhando -Z, grip do GLB na origem do grupo):
     back = escalaVM · |bboxMin.z|            coronha atrás do grip, em metros
     fwd  = escalaVM · bocaZ                  cano à frente do grip = gripZ·len (gripZ é
                                              medido A PARTIR DA BOCA — ver weapons.js)
     Zg   = max(back + clear, minz, fwd/fwdTan)
                                              profundidade do grip. 1ª cláusula: a coronha
                                              NUNCA cruza a lente (era isso que dava "arma
                                              cortada"/geometria invertida). 3ª cláusula:
                                              teto de segurança do ângulo que o cano ocupa
                                              (não morde em nenhuma das 26 hoje; existe pra
                                              uma arma futura de cano absurdo não explodir).
     gx   = Zg · tanH                         => o GRIP CAI SEMPRE NO MESMO PIXEL, arma
                                              qualquer (é a CONSISTÊNCIA que o dono pediu)
     gy   = -gx · tanBarrel                   => o ângulo do cano na tela é atan(|gy|/gx),
                                              INDEPENDENTE do aspecto (provado em
                                              tools/eval/vm-mint-audit.mjs) — 16:9 e 3:2
                                              leem o mesmo ângulo, que é o bug 3:2 morto.
   O que varia por arma é só o quanto o cano avança na tela = len·(1-gripZ) — que é
   exatamente a identidade que a Mint traz (SMG curta, sniper longa).
   (O kill-switch ?tripovm=1 que voltava ao pipeline Tripo foi removido em 07/08/2026 —
   junto com os arms_*.glb de public/models/fpvm. O histórico está no git.)              */
export const VM_FRAME = {
  vmScale: 0.72,        // escala global do GLB no viewmodel (invariante ao enquadramento — não encolhe a arma na tela)
  /* tanBarrel 0,28 -> 0,22 (RODADA DA REFERENCIA MEDIDA).
     ATENCAO AO QUE ESTE NUMERO NAO E: ele NAO e "o angulo do cano na tela". atan(0,22)=12,4°
     e a direcao em que o GRUPO da arma foi deslocado dentro do vm.root, ignorando o
     VM_OFF[1] — que e o termo que domina a posicao na tela. O angulo que o olho ve (e que a
     VM3 passou a medir) e o PCA da silhueta em pixel, e ele estava em 33-61° enquanto este
     campo dizia 15,64°. Ver o comentario da VM3 em tools/eval/invariants.mjs.
     0,22 sai da busca do vm-solve com a lente nova (V0=42): e o valor que, junto com
     tanH 0,20, poe o eixo da silhueta dos rifles em 24-31° — a faixa medida no CS 1.6
     (27,3° na AK do dust, 34,8° na M4 do dust2). Continua sendo o unico termo que depende
     do aspecto na altura do grip (Delta VM10 = 0,0931·tanH·tanBarrel = 0,004, bem abaixo
     do teto 0,03). */
  tanBarrel: 0.22,      // par do tanH 0,20 e da lente V0=42 — os tres so funcionam juntos
  adsPullZ: 0.02,       // ADS traz a arma 2 cm em direção à lente (sem cruzar a coronha)
  /* LOOK FINAL ESCOLHIDO PELO DONO (08/2026): CS 1.6 — medido frame a frame no vídeo de
     referência (aim_ak-colt). A arma fica BAIXA (boca a ~0,66H, ABAIXO da mira — é
     "segurada relaxada", não "apontada pro crosshair"), mostra o FLANCO, e a coronha
     termina no canto inferior-direito INTEIRA (no máximo beijando a borda). O trio que
     faz o look: lente moderada (V0=80 no vmFovForAspect) + arma mais longe (recuoZ 1,10)
     + VM_OFF y −0,23 (game.js), que desce a arma até a boca ficar abaixo da mira.
     ATUALIZAÇÃO (rodada do vm-solve): O OFFSET VERTICAL MUDOU DE FORMA, NÃO DE VALOR.
     VM_OFF[1] = −0,23 continua sendo o número do look, mas agora vale NA REFERÊNCIA 16:9;
     o offset REAL aplicado ao vm.root é −0,23 · V(aspecto)/V(16:9) = −0,23 · (16/9)/aspecto
     (game.js, `vmOffY`). Em 16:9 nada muda — em 3:2 o offset vira −0,2726, que é o mesmo
     deslocamento EM FRAÇÃO DE ALTURA DE TELA. Isso não é tuning, é a única forma que fecha:
     com offset constante em metros, (gripY − 0,5) escala com o aspecto na razão fixa
     (16/9)/(3/2) = 1,1852, então grip a ≥ 0,84 nos dois aspectos (VM9) implica Δ ≥ 0,0630
     entre eles, contra o teto de 0,03 da VM10 — VM9 e VM10 eram IMPOSSÍVEIS juntas, para
     qualquer valor de recuoZ/tanH/minz/zMul/vmScale/V0. A prova numérica e a busca estão em
     tools/eval/vm-solve.mjs. O look medido (boca ABAIXO da mira, VM12) fica PRESERVADO:
     a boca do cano vai a 0,667-0,803 da altura, contra o teto de 0,66.
     A rodada anterior foi o look Quake 4 (lente 92, recuoZ 0,75, nearX 1,35, tanH 0,80 —
     arma grande, por trás, coronha cortada); o dono comparou e escolheu CS. Quake fica
     reproduzível: ?vmfov=92&vmzmul=0.75&vmnearx=1.35&vmtanh=0.80&vmtanb=0.30&vmoff=0.03,-0.10,0
     Tunáveis ao vivo: ?vmzmul= ?vmnearx= (mais ?vmfov= ?vmtanh= ?vmtanb= ?vmoff=). */
  /* recuoZ 1,10 -> 1,00 e nearX 1,05 -> 6,00 (RODADA DA REFERENCIA MEDIDA).
     recuoZ: era o multiplicador global de Zg. Com o minz por classe resolvido pelo solver
       (o valor JA e o Zg alvo), um multiplicador extra so obrigaria a dividir os seis minz
       por 1,10 e esconder o numero. 1,00 = "o minz da classe E a profundidade do grip".
     nearX: ERA UMA TRAVA ASSERIDA, e ela contradizia a foto. "A coronha pode projetar no
       maximo 1,05 da meia-largura" e a mesma afirmacao do doc antigo ("a coronha termina no
       canto INTEIRA, no maximo beijando a borda") que o dono desmentiu: nos 3 frames de
       referencia a silhueta CRUZA a borda direita (ref_viewmodel.json ->
       faixas.cruzaBordaDireita: true) e sai pela base (fatiaBaixo 0,383 e 0,480). Com a
       lente fechada (V0=42) a coronha fica angularmente grande e a trava de 1,05 empurrava
       o grip para Zg 0,46 — FORA da janela da VM9 — em g3/lmg/carbine.
       O que substitui a trava, com numero medido em vez de asserido:
         VM8  (invariants.mjs) — coronha <= -0,05 no PICO DO COICE: e ela que impede a
              coronha de atravessar a lente, que era o perigo real.
         VM16 (invariants.mjs) — fatia na borda direita entre 0,02 e 0,20 da altura
              (ref 0,053-0,095): e ela que impede a arma de sair pela lateral em vez de
              raspar a quina, que era o perigo estetico.
       6,00 e "praticamente solta": o piso que ela impoe vira back·1,051, abaixo do minz de
       todas as classes. Nao foi zerada para o parametro continuar existindo e tunavel
       (?vmnearx=) — quem quiser o comportamento antigo poe 1,05 e ve a arma encolher. */
  /* ══ recuoZ 1,00 -> 1,50 (RODADA DA ESCALA — pedido do dono, 04/08) ══════════════════
     PEDIDO, nas palavras dele: "o ângulo das armas está muito bom, mas a escala está
     grande ainda — digamos que as armas estão 1,5x do tamanho que deveriam. Eu vejo isso
     pq o cano da arma pra mira no centro da tela a distância é minúscula."

     ELE DEU O SINTOMA CERTO, E O SINTOMA É MENSURÁVEL — MAS NÃO É ÁREA. Medido no RENDER
     (diff on/off do vm-quake-capture, 1200x800 = 3:2, o aspecto dele) contra a referência
     medida (ref_viewmodel.json, `python3 tools/eval/ref-measure.py --masks`):

       DISTÂNCIA BOCA -> MIRA, em fração de ALTURA de tela   (hypot((bocaX-0,5)*asp; bocaY-0,5))
         referência   CS 1.6 AK 0,103 · CS 1.6 M4 0,131 · Valorant Vandal 0,277
         nós (1,00)   ak 0,073 · m4 0,093 · awp 0,110 · deagle 0,148   <- AK e M4 ABAIXO
                                                                          do MÍNIMO medido
         nós (1,50)   ak 0,137 · m4 0,154 · awp 0,157 · deagle 0,183   <- todas DENTRO

       ÁREA na tela (a grandeza que a VM5 gateia), MESMAS capturas:
         referência   9,76 · 9,78 · 13,09 %
         nós (1,00)   ak 7,95 · m4 8,63 · awp 6,81 · deagle 5,05 %  <- JÁ ABAIXO da ref
         nós (1,50)   ak 5,44 · m4 6,30 · awp 4,09 · deagle 4,16 %

     Ou seja: a arma NUNCA tomou mais área que a do CS 1.6. O que ela fazia era entrar no
     quadro com 82% da malha FORA dele (foraPct da ak, 3:2) — o que sobrava na tela era um
     pedaço AMPLIADO de cano e guarda-mão, com a boca a 0,073 da mira. Área igual, arma ~2x
     maior. É por isso que a régua de área dizia "dentro da faixa" enquanto o olho do dono
     dizia "grande": areaPct NÃO É UMA RÉGUA DE ESCALA quando o recorte muda (VM5 mede o
     que aparece; foraPct diz que aparece um quinto).

     POR QUE recuoZ E NÃO vmScale/V0/tanH: o enquadramento é INVARIANTE À ESCALA DA MALHA
     (back, fwd e gx crescem todos com vmScale — game.js, bloco RECUO DE TAMANHO APARENTE),
     então mexer em vmScale não muda um pixel. recuoZ multiplica só o Zg: encolhe o tamanho
     aparente por 1/recuoZ EM TORNO DO GRIP, que fica no MESMO pixel (gx = Zg·tanH escala
     junto). Consequência direta: a boca se afasta da mira sozinha, que é o sintoma que ele
     nomeou. E o que ele elogiou fica: eixo da silhueta em PIXEL medido no render
     1,00 -> 1,50: ak 34,8° -> 33,3° · m4 34,7° -> 31,3° (VM3 = 22-42°), e pitch/yaw/roll,
     tanBarrel e knifeRot não foram tocados.

     O QUE EU VI (capturas em /tmp/vmscale/z{1.0,1.1765,1.3333,1.5}, 5 armas cada):
       1,00  ak = cano + guarda-mão ampliados, coronha e pente fora do quadro; a faca é uma
             lâmina gigante atravessando a tela inteira, ponta em x=0,32.
       0,85  boca já sai de cima da mira (dBoca 0,099), mas o pente da ak ainda é cortado.
       0,75  bom; pente ainda cortado pela base.
       0,67  a AK INTEIRA lê — guarda-mão de madeira, tubo de gás, pente curvo, receiver — e
             a coronha sai pela quina inferior direita, que é a assinatura do CS 1.6 (VM16)
             e o enquadramento do references/viewmodel/cs16_ak_dust.jpg. A faca vira uma
             faca (cabo + guarda + lâmina) com a MESMA direção de lâmina de antes.
     CUSTO MEDIDO, declarado: a silhueta inteira anda ~0,04 para a direita, então a borda
     esquerda (VM1, faixa 0,50-0,60 sobre ref medida 0,520-0,565) fica mais apertada, e a
     área cai abaixo do piso de 6% da VM5 — piso que o próprio comentário da VM5 declara
     como extrapolação sem pixel ("DÍVIDA DE MEDIÇÃO, não licença"). Ver VM5/VM20. */
  recuoZ: 1.50,         // recuo de tamanho aparente: multiplica o Zg do enquadramento (?vmzmul=)
  nearX: 6.00,          // trava de borda: coronha pode projetar até esta fração da meia-largura (?vmnearx=)
  cls: {
    // tanH  = tangente do ângulo horizontal do grip. 0,800 (Quake) → 0,670 (CS 1.6): arma
    //         mais longe e lente mais fechada pedem menos ângulo pra borda esquerda do VM
    //         ficar em ~0,62-0,66 W (medido no vídeo do CS 1.6). MESMO valor nas 6 classes
    //         (validado em captura) — a variação de tamanho por classe vem de len/gripZ/zMul.
    // clear = folga em metros entre a coronha e a lente
    // minz  = profundidade mínima do grip (alcance do braço FP: ombro→grip ≤ 0,60 m).
    //         0,4200 nas 6 classes (era 0,230-0,360, uma por classe). PORQUÊ UNIFORME: com o
    //         offset vertical em fração de altura, gripY = 0,5 + 0,5·c/Zg + k·tanH·tanBarrel,
    //         e a VM9 (grip entre 0,84 e 0,92 nos DOIS aspectos) vira uma janela ESTREITA de
    //         Zg — [0,445 ; 0,558] com c = 0,23·(16/9)/H. Zg fora dela = grip fora da banda,
    //         não importa a arma: a faca e as pistolas iam a Zg 0,25 e o grip caía a 1,16 da
    //         altura (mão FORA da tela). 0,42·recuoZ = 0,462 põe as 26 dentro (Zg 0,462-0,503,
    //         VM9 0,873-0,886, folga 0,0116).
    //         POR QUE 0,42 E NÃO 0,4545 (que daria folga 0,027 na VM9): acima de 0,4245 o grip
    //         de TODAS as 26 passa a ficar a menos de 2 cm do limite do braço direito, e o
    //         vm-mint-audit passa a acusar "MÃO SOLTA NO AR" em 26 armas em vez das 5 que já
    //         acusava. Isso não entra em nenhuma invariante do portão (os braços FP estão
    //         desligados por padrão — WEAPON_ONLY em game.js), então seria uma regressão
    //         INVISÍVEL para a régua e visível com ?hands=1. 0,42 mantém o alcance do braço
    //         EXATAMENTE como estava (5 armas acusadas, as mesmas de antes) e ainda deixa a
    //         VM9 com 23× a resolução do JSON. Medido em tools/eval/vm-solve.mjs.
    // fwdTan = teto de (cano à frente do grip)/(profundidade do grip) — trava o tamanho
    //         aparente das atarracadas sem achatar a identidade das longas
    // roll   = cant (rad) em torno do EIXO DA CÂMERA. É de graça no que importa: girar em Z
    //         não move a direção do cano (0,0,-1) nem 1 grau, então a arma continua apontada
    //         exatamente pra mira — só mostra o topo do receiver, como no CS.
    /* pitch/yaw = INCLINAÇÃO PRÓPRIA DA ARMA (RODADA DO GRIP + PITCH). Euler XYZ em rad,
       aplicado ao MESMO grupo do roll (game.js `_vmFrame`), então a ordem é RX·RY·RZ e com
       pitch=yaw=0 a cadeia inteira volta a ser exatamente a de antes.
         pitch > 0  levanta a BOCA (ponto em z=-d vai para y=+d·sin(pitch))
         yaw   > 0  leva a BOCA para a ESQUERDA (x = -d·sin(yaw)), ou seja em direção à mira

       POR QUE ISTO PRECISOU EXISTIR — é uma IMPOSSIBILIDADE, não um gosto. Com o cano
       paralelo ao eixo da câmera (só roll), a boca fica rigidamente amarrada ao grip:
           bocaY − 0,5 = (gripY − 0,5)·Zg/(Zg + S·fwd) − 0,5·S·mzY/((Zg + S·fwd)·V)
       Com a VM9 MEDIDA (grip ≥ 0,90 — ref-measure.py) e a VM12 MEDIDA (boca ≤ 0,62), e com
       a VM8 exigindo Zg ≥ S·back + 0,05 (a coronha não cruza a lente), sai a condição
           0,05 ≤ S·( (3/7)·mzZ − back )
       que é NEGATIVA para as 26 armas do arsenal (a AK, por exemplo: (3/7)·0,539 = 0,231
       contra back 0,334). Ou seja: a interseção VM8 ∩ VM9 ∩ VM12 é VAZIA para QUALQUER
       vmScale, V0, tanH, tanBarrel, offY, minz ou zMul. Prova reproduzível em
       `node tools/eval/vm-solve.mjs --prova-vazio`.
       O CS 1.6 escapa disso porque o v_model dele TEM inclinação própria: por isso ele
       consegue grip fora da tela E boca em 0,513 no mesmo frame. É a explicação literal do
       "o ângulo, a perspectiva, a escala, o tamanho está tudo diferente".

       E O CANO CONTINUA APONTANDO PRA ONDE A BALA VAI? A bala nunca saiu do cano: a direção
       do tiro é `camera.quaternion` (game.js `_tryShoot`) e a do clarão é
       `camera.getWorldDirection()` — o viewmodel é DECORATIVO, como no CS 1.6. O que segue
       a arma é só a ORIGEM do clarão/tracer (`_vmMuzzleExt[id]`, derivada de `rw.localToWorld`
       DENTRO deste grupo), e ela acompanha o pitch/yaw de graça, que é o comportamento
       certo: o fogo nasce na boca desenhada e o tiro vai pro centro da mira.
       NO ADS o pitch/yaw são ZERADOS (game.js `vmAdsRot`, invariante VM17): com a arma
       inclinada, mirar deixaria a alça fora do eixo. O roll NÃO é zerado — ele não desalinha
       nada e já era assim. */
    /* RODADA DA REFERENCIA MEDIDA — tanH 0,670 -> 0,200, clear 0,040 -> 0,030 e minz
       DE VOLTA A SER POR CLASSE (era 0,4200 uniforme).
       tanH: com a lente fechada (V0=42) o mesmo tanH jogava a arma pra FORA do quadro pela
         direita — a borda esquerda da silhueta ia a 0,63-0,69 e a referencia medida da
         0,520-0,565 (ref-measure.py). 0,20 poe os rifles em 0,58-0,60.
       minz: o 0,4200 uniforme da rodada passada foi escolhido pra uniformizar profundidade e
         custou 77% do tamanho angular da faca e 67% do das pistolas. Com a boca subindo para
         0,50-0,62 a restricao muda de sinal, entao ele volta a ser por classe. A VARIACAO E
         PEQUENA DE PROPOSITO: a VM9 (grip entre 0,84 e 0,92, intocada) fecha uma janela de Zg
         de [0,2936 ; 0,3651] — so 24% de ponta a ponta — e cada classe fica no ponto DELA
         dentro dessa janela (tools/eval/vm-solve.mjs escolhe maximizando a soma das margens
         das armas da classe). "Faca perto do rosto, sniper longe" cabe ai dentro; mais que
         isso tira o grip da banda da VM9.
       clear: 0,030 abre 1 cm de aproximacao. A VM8 (coronha <= -0,05 no pico do coice)
         continua sendo quem trava — e continua verde. */
    /* RODADA DO GRIP + PITCH — pitch/yaw RESOLVIDOS (tools/eval/vm-solve.mjs + a varredura
       por classe descrita no relatório), e tanH 0,200 -> 0,360 junto com eles.
       Os números em GRAUS, que é como se compara com a foto (rad = graus·π/180):
         rifle    pitch  9°  yaw 16°      shotgun  pitch  6°  yaw 20°
         sniper   pitch  9°  yaw 12°      pistol   pitch 15°  yaw 28°
         smg      pitch 24°  yaw 28°      knife    n/a (usa knifeRot)
       POR QUE tanH SUBIU JUNTO: yaw>0 leva a BOCA para a esquerda e a CORONHA para a
       direita. Com tanH 0,20 a coronha ia para a direita mas parava antes da borda, e a
       VM16 (a coronha tem que RASPAR a quina — 0,02 a 0,20 da altura) continuava em 0,000
       em 26/26. Com tanH 0,36 as medidas fora de banda da VM16 caem de 42/52 para 21/52 e
       as da VM3 (eixo da silhueta) de 35/52 para 2/52. Os dois SÓ funcionam juntos: tanH
       0,36 sozinho (sem yaw) joga a borda esquerda da silhueta para fora da VM1.
       EFEITO MEDIDO NO CONJUNTO (medidas fora de banda, 52 = 26 armas × 2 aspectos):
         antes (5737ce8 + VM9 nova): VM1 20 VM3 35 VM5 19 VM9 44 VM12 33 VM16 42 = 193
         depois:                     VM1 10 VM3  2 VM5  6 VM9  0 VM12 14 VM16 21 =  53
       O que NÃO fechou está declarado no relatório: pistola e faca (sem foto de referência)
       e a borda esquerda de 5 armas. */
    rifle:   { roll: -0.070, pitch: 0.1571, yaw: 0.2793, tanH: 0.360, clear: 0.020, minz: 0.3450, fwdTan: 1.60 },
    sniper:  { roll: 0.580, pitch: 0.1571, yaw: 0.2094, tanH: 0.360, clear: 0.020, minz: 0.3350, fwdTan: 1.60 },
    shotgun: { roll: -0.078, pitch: 0.1047, yaw: 0.3491, tanH: 0.360, clear: 0.020, minz: 0.3450, fwdTan: 1.60 },
    smg:     { roll: -0.085, pitch: 0.4189, yaw: 0.4887, tanH: 0.360, clear: 0.020, minz: 0.3500, fwdTan: 1.60 },
    // Armas curtas: cant leve e natural, semelhante ao viewmodel clássico.  A pose
    // anterior (27°/32°) fazia uma PT-38 atravessar a tela na diagonal e escondia a
    // mão que segura o cabo; esta mantém a boca à esquerda sem parecer uma arma caída.
    pistol:  { roll: -0.105, pitch: 0.1745, yaw: 0.3142, tanH: 0.285, clear: 0.020, minz: 0.3500, fwdTan: 1.45 },
    knife:   { roll: 0, pitch: 0.000, yaw: 0.000, tanH: 0.240, clear: 0.020, minz: 0.3100, fwdTan: 1.60 },   // pitch/yaw n/a: a faca usa knifeRot
  },
  // A faca não tem cano: em vez do cant ela leva a pose CS clássica (lâmina atravessada,
  // gume pra dentro do quadro). Euler XYZ em rad, aplicado ao grupo do viewmodel.
  /* knifeRot RE-RESOLVIDO (RODADA DO GRIP + PITCH) — era [-0,14 ; 0,42 ; -0,40].
     Um crítico mediu que mutar este campo para [1.5,1.5,1.5] passava o portão VERDE: os
     espelhos (vm-mint-audit/vm-project/vm-solve) projetavam a faca com rotação ZERO, ou
     seja mediam uma faca que não é a desenhada. Agora eles usam knifeRot (ver o frame() do
     vm-mint-audit), então o campo virou MENSURÁVEL — e, medido, o valor antigo punha a faca
     em eixo 5,2°, área 1,4% e boca 0,927: fora de VM3, VM5 e VM12 ao mesmo tempo.
     [0,45 ; −0,90 ; 0,30] (26° / −52° / 17°) + tanH 0,24 + minz 0,31 + vm 2,2 (weapons.js)
     põem a faca DENTRO das 6 bandas: esq 0,582 · eixo 30,0°/33,2° · área 7,2%/6,4% ·
     boca 0,588/0,618 · fatiaDir 0,063 · grip 0,989/0,978. É a pose CS clássica com a lâmina
     mais atravessada (yaw maior) — o que sobe o eixo da silhueta de 5° para 30°. */
  /* ESPELHADA EM 04/08 — "a faca é a pior, ela está ao contrário da direção normal" (dono).
     E ele está certo: o valor anterior [0,45 ; −0,90 ; 0,30] foi resolvido para CABER em 6
     bandas de medição (borda, eixo, área, boca, fatia, grip) e nenhuma delas enxerga PARA
     QUE LADO a lâmina aponta. Silhueta de faca virada e faca certa medem quase igual — é a
     Lei 1 da casa acontecendo: o que não virou invariante foi otimizado para fora.

     CONFIRMADO OLHANDO (tools/eval/vm-quake-capture.mjs, 3 capturas):
       [0,45 ; −0,90 ;  0,30]  ponta saindo pela borda DIREITA, lâmina apontando pra fora
       [0,45 ;  2,24 ;  0,30]  giro de 180°: a faca sai quase inteira do quadro
       [0,45 ;  0,90 ; −0,30]  ponta pra dentro da cena, punho no canto  ← esta
     Espelhar yaw E roll (não só o yaw) é o que mantém o gume virado pra dentro em vez de
     mostrar as costas da lâmina.

     A RÉGUA QUE FALTA e que este defeito exige: nenhuma invariante mede direção de lâmina.
     Enquanto não existir, qualquer solver que mexer aqui pode virar a faca de novo e passar
     verde. É o item de maior risco de regressão do viewmodel. */
  // Lâmina lateral e baixa: punho no canto direito, ponta voltada para dentro da
  // tela.  Menos yaw que a revisão anterior evita a faca "deitada" na diagonal.
  knifeRot: [-0.10, 0.50, -0.48],
  /* zMul VAZIO — as 5 exceções por arma (m92/p90/uzi/famas/tavor) FORAM REMOVIDAS, não
     substituídas. Elas empurravam armas atarracadas p/ o fundo para corrigir tamanho
     aparente; com minz uniforme o Zg já é o mesmo (0,500-0,503) para as 26, e cada entrada
     que sobrasse só tiraria o grip da banda da VM9 (m92 com 1,12 ia a Zg 0,560 e o grip
     saía por 0,0009). DÍVIDA REMOVIDA: 5 exceções por arma -> 0. Se alguém precisar de uma,
     o custo é medido: a janela inteira de Zg da VM9 é [0,445 ; 0,558], ou seja ±11%. */
  // Compactas têm caixa muito alta para o comprimento. Afastá-las em torno do grip
  // preserva o ponto onde a mão entra no quadro, mas impede UZI/P90 de parecerem maiores
  // que um fuzil comprido na lente de primeira pessoa.
  zMul: { uzi: 1.34, p90: 1.16, mp5: 1.08 },
  // classe de ENQUADRAMENTO (≠ STATIC_CLASS do pipeline Tripo, ≠ BALL_CLASS da balística)
  classOf: {
    ak: 'rifle', akm: 'rifle', m4: 'rifle', m92: 'rifle', g3: 'rifle', carbine: 'rifle',
    scar: 'rifle', tavor: 'rifle', famas: 'rifle', lmg: 'rifle', md97: 'rifle',
    mp5: 'smg', uzi: 'smg', p90: 'smg',
    awp: 'sniper', mosin: 'sniper', rem700: 'sniper', m400: 'sniper', svd: 'sniper', g3sg1: 'sniper', sks: 'sniper',
    shotgun: 'shotgun',
    pistol: 'pistol', deagle: 'pistol', revolver38: 'pistol',
    knife: 'knife',
  },
};
