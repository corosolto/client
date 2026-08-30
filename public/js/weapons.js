// Real weapon GLB models (Mint asset pack) — replaces the procedural box guns.
// Each source model is normalized to ~1 unit on its longest axis, so we scale each
// to a real-world length and rotate so the barrel points +Z (game forward).
import * as THREE from 'three';
import { VERSION } from './version.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const _cache = new Map();
export const WEAPON_IDS = ['awp', 'ak', 'm4', 'mp5', 'shotgun', 'deagle', 'pistol', 'knife',
  'm92', 'akm', 'g3', 'revolver38', 'md97', 'carbine', 'm400', 'mosin', 'rem700',
  'lmg', 'scar', 'tavor', 'famas', 'uzi', 'p90',
  'svd', 'g3sg1', 'sks'];   // snipers semi-auto (reusam o modelo de outra arma via MODEL_ALIAS)
// Modelos só de apresentação: não viram slot, pickup nem 27ª arma. O Bandeirante usa
// o mosquete histórico no corpo de 3ª pessoa, enquanto a balística continua no id `mosin`.
const DISPLAY_MODEL_IDS = ['mosquete'];

// Snipers semi-auto novas reaproveitam a MALHA de uma arma existente (sem asset novo):
// SVD←SCAR, G3SG1←G3, SKS←carabina. weaponModel/preload usam este alias.
const MODEL_ALIAS = {};   // as 3 snipers novas têm modelo próprio (Mint)

// len = real length along the barrel (m); rot = degrees to point the barrel +Z;
// gripZ = fraction of length from the muzzle where the hand grips (0=muzzle,1=stock).
// vm (opcional) = multiplicador SÓ da viewmodel FP (game.js), default 1. Cada arma já é
// normalizada ao comprimento real (len), então a 1ª pessoa fica proporcional; medido em
// 1080p, as SMGs (uzi/p90/mp5) NÃO estão gigantes. Este knob existe pra afinar UMA arma
// que ainda leia grande/pequena de perto, sem tocar no len (grip/3ª pessoa dependem dele).
// ATENÇÃO: vm≠1 escala o mesh em torno do grip → re-verificar gripError da arma no fparms-capture.
// rot = graus pra apontar o cano +Z. Verificado OBJETIVAMENTE arma a arma via weapontest.html
// (tools/eval/weapon-capture.mjs): mede a seção transversal perto de cada ponta Z — o cano é
// FINO, a coronha GROSSA; se a ponta +Z não é a mais fina, a arma está invertida e leva +180
// no yaw. (Os GLBs vêm de fontes diferentes, sem convenção; a leitura à olho falhava nas
// bullpups/compactas — a medição não.) Confirmadas pelo usuário: tavor, uzi, m400.
/* `vm` = escala do modelo NO VIEWMODEL (multiplica VM_FRAME.vmScale).
   RODADA DA REFERENCIA MEDIDA: 8 armas tiveram o vm REDUZIDO (shotgun 1->0,86; g3 0,85->0,75;
   md97 0,88->0,87; carbine 1->0,89; tavor 1->0,96; famas 1->0,91; g3sg1 0,85->0,71;
   sks 0,85->0,83). PORQUE: com a lente do viewmodel fechada de 80 para 42 (game.js,
   VM_FOV_DEFAULT — ver o comentario la), a arma cresce angularmente e a coronha, que fica
   ATRAS do grip, se aproxima da lente. A VM8 (tools/eval/invariants.mjs: coronha <= -0,05 no
   PICO DO COICE) e invariante intocavel desta rodada e passou a ser quem trava. Cada valor
   acima e o MAIOR vm que ainda deixa a coronha a 5,8 cm da lente no pico, calculado com o
   `back` medido no proprio GLB e o pull medido no vm_kick_sim.json — nao e chute por arma.
   Sao exatamente as armas de coronha longa (G3/G3SG1/SKS/carbine/shotgun/bullpups). */
const CFG = {
  awp:     { len: 1.15, rot: [0, 90, 0], gripZ: 0.72, vm: 0.78 },   // vm: scope/rifle longo demais de perto (dono: "gigantesca")
  ak:      { len: 0.88, rot: [0, 270, 0], gripZ: 0.62 },  // +180: estava coronha em +Z (invertido)
  m4:      { len: 0.84, rot: [0, 90, 0], gripZ: 0.62 },
  mp5:     { len: 0.66, rot: [0, 90, 0], gripZ: 0.58 },   // medição borderline (7%); cano +Z confirmado à olho
  shotgun: { len: 1.00, rot: [0, 0, 0], gripZ: 0.6, vm: 0.86 },   // model is natively +Z (barrel forward)
  /* vm RE-RESOLVIDO POR ARMA (RODADA DO GRIP + PITCH). Estas 8 são as armas cujo Zg é
     travado pelo `minz` da CLASSE e não pela própria geometria — nelas, e só nelas, a escala
     muda o tamanho ANGULAR na tela (na maioria a fórmula de enquadramento é invariante à
     escala). Os valores saem de uma varredura de vm por arma sujeita à VM8 (coronha ≤ −0,05
     no pico do coice); o pior que sobrou é a carbine, com folga de 3 mm. */
  deagle:  { len: 0.30, rot: [0, 90, 0], gripZ: 0.7, vm: 0.94 },
  pistol:  { len: 0.26, rot: [0, 90, 0], gripZ: 0.7, vm: 1.10 },
  // vm 2,2 (RODADA DO GRIP + PITCH): a faca é a única arma cujo Zg é travado pelo `minz` da
  // classe e não pela própria geometria, e por isso ela é a única em que a ESCALA muda o
  // tamanho na tela (nas outras a fórmula é invariante à escala — ver o bloco RECUO DE
  // TAMANHO APARENTE em game.js). Com vm 1 a faca ocupava 1,4% da tela contra o piso de 6%
  // da VM5; com 2,2 vai a 7,2%/6,4%. A coronha no pico do coice fica em −0,094 (teto −0,05).
  knife:   { len: 0.30, rot: [0, 270, 0], gripZ: 0.6, vm: 2.2 },  // +180: lâmina estava pra trás (medição -Z)
  // arsenal-2 (Brazilian-flavored)
  /* m92 vm 1 -> 0,90 (RODADA DO ESCORÇO). É A ARMA QUE O DONO NOMEOU POR TAMANHO:
     "a ak 47 e a zastava toma a tela inteira". Medida: 14,50% de tela em 16:9 (12,65% em
     3:2) contra o TETO MEDIDO de 13,09% da VM18b — o maior dos 3 fuzis fotografados
     (references/viewmodel/, tools/eval/ref-measure.py). Era a ÚNICA arma do arsenal acima
     do teto, e a AK (11,54%) está DENTRO — ou seja, das duas que ele nomeou só esta tem
     violação medida, e só esta muda aqui.
     POR QUE ELA É GRANDE DE VERDADE, e não mal enquadrada: `len` normaliza pelo
     COMPRIMENTO, e a m92.glb tem a maior razão altura/comprimento do arsenal (dy/dz 0,479,
     contra ak 0,302 · m4 0,345 · scar 0,296). Normalizar 0,76 m de comprimento arrasta uma
     altura desproporcional junto — é o MESMO defeito que já tinha sido diagnosticado na
     uzi (ver o bloco de len 0,60->0,47 mais abaixo), e o remédio é o mesmo knob.
     POR QUE `vm` E NÃO `zMul` (a tentativa anterior, que falhou): a m92 é uma das armas
     cujo Zg é travado pelo `minz` da CLASSE (0,345 = VM_FRAME.cls.rifle.minz) e não pela
     própria geometria — nelas, e só nelas, a escala do mesh muda o tamanho ANGULAR sem
     mexer na profundidade do grip. Medido em tools/eval/vm-orto.mjs:
       vm  0,90 -> área 12,52%/10,97% · grip 0,981/0,965 (INTOCADO) · boca 0,536 · esq 0,568
       zMul 1,20 -> área 13,13%/11,84% (ainda ACIMA do teto) e grip 0,918/0,902 — a 0,0017
                    do piso 0,90 da VM9. zMul 1,30 (a tentativa da rodada passada) levava o
                    grip a 0,894: VERMELHA. zMul PAGA VM9 e nem chega no teto; vm não paga.
     CUSTO MEDIDO de 0,90: gordura 0,618 -> 0,590 (a VM18 já é vermelha nas 52 medidas, e
     nenhuma faixa vira); fatiaDir 0,367 -> 0,309 (VM16 já vermelha, e ANDA na direção do
     teto 0,20); bocaY 0,509 -> 0,536, que AFASTA a m92 do piso 0,50 da VM12 (a margem era
     de 0,009); VM8 melhora porque a coronha encolhe para o fundo. Folga sobre o teto:
     0,57 p.p., ~4x o erro de borda do rasterizador (0,15 p.p.).                        */
  m92:       { len: 0.76, rot: [0, 270, 0], gripZ: 0.6, vm: 0.90 },   // +180: Zastava M92 estava invertido
  g3:        { len: 1.10, rot: [0, 270, 0], gripZ: 0.58, vm: 0.75 },  // +180: HK G3 estava invertido
  akm:       { len: 0.88, rot: [0, 90, 0], gripZ: 0.62 },
  revolver38:{ len: 0.24, rot: [0, 270, 0], gripZ: 0.68, vm: 1.30 },  // +180: medição -Z (invertido)
  md97:      { len: 1.05, rot: [0, 270, 0], gripZ: 0.62, vm: 0.87 },  // +180: estava invertido
  carbine:   { len: 0.98, rot: [0, 0, 0], gripZ: 0.6, vm: 0.92 },   // natively +Z; [0,90,0] threw the barrel onto X (giant)
  m400:      { len: 0.92, rot: [0, 270, 0], gripZ: 0.62, vm: 0.85 },  // +180: usuário confirmou invertido
  mosin:     { len: 1.20, rot: [0, 270, 0], gripZ: 0.66, vm: 0.75 },  // +180: estava invertido
  /* mosquete: o cano nasce no eixo Z no GLB, mas apontando −Z (medido por seção
     transversal: a ponta +Z crua tem 2,84× a área da −Z — é a CORONHA). Com rot [0,0,0]
     o Bandeirante segurava o mosquete ao contrário (dono, 30/08). O +180° põe a boca em
     +Z como o contrato pede. rot em X jogava a seção transversal no eixo da normalização.
     Régua: weapon-scale-check (cláusula C; mutante `flip` devolve este defeito). */
  mosquete:  { len: 1.45, rot: [0, 180, 0], gripZ: 0.68 },
  rem700:    { len: 1.15, rot: [0, 270, 0], gripZ: 0.66, vm: 0.78 },  // +180: estava invertido
  // arsenal-3 (military)
  lmg:       { len: 1.10, rot: [0, 90, 0], gripZ: 0.58, vm: 0.72 },   // vm: caixão preto gigante na tela
  scar:      { len: 0.90, rot: [0, 90, 0], gripZ: 0.62 },
  tavor:     { len: 0.72, rot: [0, 270, 0], gripZ: 0.5, vm: 0.96 },   // +180: usuário confirmou invertido
  famas:     { len: 0.76, rot: [0, 90, 0], gripZ: 0.5, vm: 0.87 },
  uzi:       { len: 0.47, rot: [0, 270, 0], gripZ: 0.58, vm: 0.81 },  // vm: encolhe no FP (estava grande)
  // len 0.60 -> 0.47 (P0): o dono reportou "a uzi do hipster alternativo esta gigante, maior que
  // o corpo dele". O mount NAO estava errado nesse personagem — a sonda de 3a pessoa mediu fator
  // de escala 1,00 nele, o mais exato do elenco. O problema e a PROPORCAO do GLB: a uzi.glb tem
  // 0,42 m de altura para 0,60 m de comprimento (razao altura/comprimento 0,69, contra 0,30 do AK
  // e 0,36 da MP5 — a mais "alta" do arsenal inteiro). Como `len` normaliza pelo COMPRIMENTO, a
  // altura vinha junto e a arma inteira lia gigante ao lado de um personagem magro. 0,47 m e o
  // comprimento real de uma Uzi com a coronha dobrada; com ele a altura cai para ~0,33 m e a
  // silhueta volta a ler como SMG compacta. gripZ/rot conferidos, seguem valendo.
  // p90 rot 270→90 (G3-R1): a medição de seção transversal (tools/eval/vm-mint-audit.mjs)
  // provou que com 270 a ponta +Z era a GROSSA (raio 0.053 vs 0.010) — a arma entrava de ré.
  // O `vmRotY: Math.PI` que morava aqui era um curativo que consertava SÓ a 1ª pessoa e
  // deixava a 3ª pessoa invertida; com o rot certo os dois caminhos usam a mesma verdade.
  p90:       { len: 0.52, rot: [0, 90, 0], gripZ: 0.55, vm: 1.22 },
  // snipers semi-auto — herdam a malha (MODEL_ALIAS) e o rot/len do modelo reusado
  svd:       { len: 1.15, rot: [0, 270, 0], gripZ: 0.64, vm: 0.8 },   // modelo próprio (Mint); +180 (estava invertida)
  g3sg1:     { len: 1.12, rot: [0, 270, 0], gripZ: 0.58, vm: 0.71 },   // modelo do G3
  sks:       { len: 1.02, rot: [0, 270, 0], gripZ: 0.6, vm: 0.83 },    // modelo próprio (Mint), cano +Z como a SVD
};

/* ===================== CARREGADOR (PENTE) — md97 e mp5 ==============================
   DEFEITO (dono, 04/08): "tem algumas armas que estão sem carregador (pente de balas):
   md97 e a mp5".

   CAUSA RAIZ — e ela NÃO é código: nenhuma linha do jogo monta carregador. Em 24 das 26
   armas o pente vem BAKED no GLB da Mint; em `md97.glb` e `mp5.glb` a Mint entregou a
   arma com o poço de carregador VAZIO. (O `att: ['slimmag']` que existe no game.js:361 é
   do pipeline TRIPO antigo — o caminho Mint de hoje, que é o que a tela desenha, não
   passa pelo vmattach.js.) Por isso o conserto mora AQUI, no único lugar que os três
   caminhos (viewmodel, 3ª pessoa e pickup no chão) atravessam: weaponModel().

   MEDIDA que prova o defeito e calibra o conserto (gun-space do weaponModel: grip na
   origem, cano +Z, METROS REAIS — mesmo espaço do tools/eval/vm-mint-audit.mjs
   `gunSpace`). Isolando os vértices ABAIXO do piso do receiver e À FRENTE do grip:

     arma    largura(x)  altura(y)   z do pente        fundo y
     ak        0,033      0,148     [0,015 ; 0,191]    -0,133
     m4        0,038      0,130     [0,016 ; 0,263]    -0,145
     akm       0,029      0,150     [0,015 ; 0,184]    -0,132
     scar      0,049      0,132     [0,021 ; 0,107]    -0,133
     g3        0,050      0,136     [0,016 ; 0,143]    -0,141
     uzi       0,057      0,178          (smg)         -0,163
     md97        —          —             —          NENHUM VÉRTICE abaixo do receiver
     mp5       0,036      0,025      (guarda-mato)   o ponto mais baixo é o PUNHO, -0,118

   O md97 tem inclusive um VAZIO de malha em z ∈ [0,00 ; 0,05] — exatamente entre o
   guarda-mato (z -0,04..0,00, piso -0,048) e o guarda-mão (z 0,05..0,15, piso +0,01).
   Esse vazio É o poço do carregador da arma real; o pente entra lá dentro.

   A tabela acima é a caixa do AGLOMERADO (ela engloba guarda-mato e poço). A SEÇÃO do
   pente sozinho — só os vértices com y < -0,090, altura em que nenhuma outra peça existe —
   é o que calibra `w` e `d` daqui:
     ak 0,033×0,077 · m4 0,028×0,069 · akm 0,029×0,057 · scar 0,035×0,076 · g3 0,037×0,080
     uzi 0,039×0,047 · svd 0,027×0,090 · m400 0,027×0,090 · m92 0,042×0,117
     md97: NADA abaixo de -0,090 · mp5: 0,012×0,003 (é a ponta do punho, não pente)
   Faixa do arsenal: largura 0,027-0,042 · espessura 0,047-0,117. md97 (0,040×0,074) e
   mp5 (0,034/0,036×0,056/0,060) caem dentro das duas — a arma nova não inventa proporção,
   ela copia a do arsenal.

   POR QUE O `npm run eval:vm` NÃO ENXERGA ISTO (e é dívida declarada, não descuido):
   o auditor lê os GLBs do disco (`readGLB`) e reprojeta os vértices; ele não executa o
   weaponModel(), então geometria procedural é invisível pra ele — o que também já valia
   pros attachments do vmattach.js. As linhas de md97/mp5 no eval:vm saem IDÊNTICAS antes
   e depois. O efeito real na tela foi medido com um clone do auditor com estes mesmos
   segmentos injetados na nuvem de pontos, e é este (16:9 / 3:2):
     md97  área 8,20/7,32% -> 8,43/7,64%   gordura 0,426/0,409 -> 0,481/0,476
     mp5   área 11,02/9,73% -> 11,54/10,44% gordura 0,400/0,378 -> 0,495/0,521
     bordaEsq, bocaTela, gripTela, fatiaDir e coronhaZ: INALTERADOS nas duas
   Ou seja: VM1/VM5/VM12/VM16/VM9 seguem em banda e a VM18 (gordura, piso medido 0,427 —
   ver BUG-11) sai de VERMELHA pra VERDE nas duas armas, porque pente é literalmente
   espessura perpendicular ao cano, que é o que a VM18 mede.
   A dívida que fica: o auditor precisa aprender a ler esta tabela (ela é declarativa e
   está em ESCALA REAL de propósito, pra caber num `MAG` lido igual ao `CFG`). Enquanto
   não ler, nenhuma invariante impede alguém de apagar este bloco e passar verde.

   Convenção de um segmento: caixa (w,h,d) em metros centrada em (MAG[id].x, y, z), com
   `rake` = inclinação em GRAUS em torno de X (negativo = base do pente PRA FRENTE, na
   direção da boca — que é como carregador de FAL/AR e de MP5 caem). */
const MAG = {
  // MD97 (IMBEL, 5.56): pente reto de 20 tiros (game.js WEAPONS.md97.mag = 20), vertical
  // com caimento leve, entrando no vazio entre guarda-mato e guarda-mão.
  // x 0,009 = centro do corpo medido em z ∈ [-0,04 ; 0,01] (x de -0,013 a +0,032).
  md97: { x: 0.009, cor: 0x2a2d31, seg: [
    { w: 0.040, h: 0.150, d: 0.074, y: -0.050, z: 0.040, rake: -7 },   // corpo
    { w: 0.046, h: 0.014, d: 0.082, y: -0.121, z: 0.049, rake: -7 },   // base (floorplate)
  ] },
  // MP5 (9 mm): pente de 30 tiros, à frente do grupo do gatilho e CAÍDO pra frente. A
  // curva característica é feita com 2 segmentos de caimento crescente (-5° -> -15°) —
  // uma caixa só leria como tábua. x -0,012 = centro do corpo em z ∈ [0,05 ; 0,11].
  mp5: { x: -0.012, cor: 0x1a1d21, seg: [
    { w: 0.036, h: 0.090, d: 0.060, y: -0.022, z: 0.072, rake: -5 },   // trecho de cima (no poço)
    { w: 0.034, h: 0.088, d: 0.056, y: -0.100, z: 0.083, rake: -15 },  // trecho de baixo (a "banana")
    { w: 0.040, h: 0.013, d: 0.060, y: -0.142, z: 0.095, rake: -15 },  // base (floorplate)
  ] },
};
/* Material: gunmetal fosco. roughness/metalness estão DENTRO da faixa que o
   `fixVmMaterials` do game.js:1392 impõe no caminho legado (metalness ≤ 0,55,
   roughness ≥ 0,45), então o pente lê igual nos três caminhos com ou sem esse clamp —
   é o mesmo princípio da MAT1 ("mesmo GLB, mesmo material, nos 3 caminhos").
   `cor` é POR ARMA e foi medida na captura, não escolhida no olho: o pente tem que ficar
   no mesmo degrau de luminância que o pente BAKED das outras armas guarda em relação ao
   próprio corpo. Medido em tools/eval (recorte do receiver, world model, 900×600):
     ak (pente baked)  corpo 77   pente 79   -> pente ~1,0-1,3× o corpo
     md97 com 0x2a2d31 corpo 111  pente 120  -> 1,08×  OK
     mp5  com 0x2a2d31 corpo 54   pente 119  -> 2,21×  fora (corpo da MP5 é quase preto)
   Por isso a MP5 leva 0x1a1d21 e a MD97 0x2a2d31 — mesma peça, corpos de albedo diferente.
   Geometria e material são compartilhados entre instâncias: weaponModel() é chamado uma
   vez por PICKUP do mapa, e o clone do GLB também compartilha material (THREE.clone()
   não duplica material), então isto não muda o contrato de quem clona/edita material. */
const _magMat = new Map();
const _magGeo = new Map();
// Kill-switch `?pente=0` (mesma convenção do `?rev38=0` do vmattach.js e do `?bloom=0`):
// serve pra provar A/B na captura e pra o dono desfazer sem editar código.
const MAG_ON = (typeof location === 'undefined') || new URLSearchParams(location.search).get('pente') !== '0';
function buildMag(id) {
  const spec = MAG_ON ? MAG[id] : null;
  if (!spec) return null;
  let matl = _magMat.get(id);
  if (!matl) { matl = new THREE.MeshStandardMaterial({ color: spec.cor, roughness: 0.62, metalness: 0.35, envMapIntensity: 1.2 }); _magMat.set(id, matl); }
  const g = new THREE.Group();
  g.name = 'mag';
  spec.seg.forEach((s, i) => {
    const key = `${id}:${i}`;
    let geo = _magGeo.get(key);
    if (!geo) { geo = new THREE.BoxGeometry(s.w, s.h, s.d); _magGeo.set(key, geo); }
    const m = new THREE.Mesh(geo, matl);
    m.position.set(spec.x, s.y, s.z);
    m.rotation.x = (s.rake || 0) * Math.PI / 180;
    g.add(m);
  });
  return g;
}

const loadGLB = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

/* `ids` opcional: a partida carrega SÓ as armas que ela sorteou (ver pickMatchWeapons), e o
   resto chega em ocioso. Sem lista = elenco inteiro MAIS os modelos que só aparecem em
   vitrine (o mosquete do bandeirante), que é o caminho do arnês e do menu. */
export async function preloadWeapons(ids) {
  await Promise.all((ids && ids.length ? ids : [...WEAPON_IDS, ...DISPLAY_MODEL_IDS]).map(async (id) => {
    const src = MODEL_ALIAS[id] || id;    // snipers reusadas carregam a malha da arma-fonte
    if (_cache.has(src)) return;
    try { const g = await loadGLB(`models/weapons/${src}.glb?v=${VERSION}`); _cache.set(src, g.scene); }
    catch (e) { console.warn('weapon load failed', src, e); }
  }));
}

export function hasWeapon(id) { return _cache.has(MODEL_ALIAS[id] || id); }

// Geometry facts for aligning hands/mounts: real length + grip point (fraction from muzzle).
export function weaponCFG(id) { return CFG[id] || CFG.awp; }
// One-handed weapons get no support hand on a handguard.
export const ONE_HANDED = new Set(['pistol', 'deagle', 'revolver38', 'knife']);
// Sidearm slot (tecla 2). Everything else except the knife is a primary (tecla 1).
export const PISTOLS = new Set(['pistol', 'deagle', 'revolver38']);

// Pontos de empunhadura no espaço local do grupo do weaponModel() (grip na origem,
// cano apontando +Z). ÚNICA FONTE usada por: alignHands (game.js, mãos procedurais),
// IK dos braços FP (fparms.js) e IK da mão de apoio em 3ª pessoa (glbchars.js).
// fore = ponto no guarda-mão, à frente do grip (fração do trecho grip→boca); null p/ 1 mão.
// ATENÇÃO à convenção: no grupo da viewmodel (game.js) o GLB entra girado em π (cano -Z),
// então lá o fore vira z' = GRIP_Z - fore.z; nos mounts de 3ª pessoa o cano é +Z direto.
export function gripPoints(id) {
  const cfg = weaponCFG(id);
  return {
    grip: new THREE.Vector3(0, 0, 0),
    fore: ONE_HANDED.has(id) ? null : new THREE.Vector3(0.005, -0.045, 0.82 * cfg.len * (1 - cfg.gripZ) * 0.72),
  };
}

// MEDIÇÕES POR ARMA (G3-R1) — a 1ª pessoa voltou a usar estes 26 GLBs (um por arma) em vez
// dos 8 heróis Tripo, e precisa de 3 números que NENHUMA tabela escrita à mão acerta:
//   box    = caixa da arma no espaço do grupo (grip na origem, cano +Z, metros reais)
//   muzzle = BOCA DO CANO de verdade (centroide dos vértices nos 2% mais avançados em +Z).
//            É a origem do flash e do tracer: com uma constante herdada o clarão nascia a
//            ~250 px da arma ("impacto na parede").
//   sight  = ALÇA DE MIRA (topo do receiver na metade da frente). É o ponto que o ADS leva
//            ao centro da tela — sem ele "miro e não vejo a arma nem a mira".
// Medido UMA vez por arma e cacheado (weaponModel é chamado também por cada pickup do mapa).
const _metrics = new Map();
function measureGun(id, wrap) {
  if (_metrics.has(id)) return _metrics.get(id);
  wrap.updateMatrixWorld(true);
  const pts = [];
  const v = new THREE.Vector3();
  wrap.traverse((o) => {
    const pos = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) return;
    const step = Math.max(1, Math.ceil(pos.count / 30000));   // teto de 30k pontos: a medida não melhora acima disso
    for (let i = 0; i < pos.count; i += step) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone());
  });
  const box = new THREE.Box3();
  for (const p of pts) box.expandByPoint(p);
  const L = Math.max(1e-4, box.max.z - box.min.z);
  const cut = box.max.z - L * 0.02;
  const mz = new THREE.Vector3(); let n = 0;
  for (const p of pts) if (p.z >= cut) { mz.add(p); n++; }
  if (n) mz.divideScalar(n); else mz.set(0, 0, box.max.z);
  // alça: topo do corpo entre o grip (z=0) e 45% do caminho até a boca
  const z1 = mz.z * 0.45;
  let top = -1e9;
  for (const p of pts) if (p.z >= 0 && p.z <= z1 && p.y > top) top = p.y;
  let sx = 0, c = 0;
  for (const p of pts) if (p.z >= 0 && p.z <= z1 && p.y > top - 0.012) { sx += p.x; c++; }
  const sight = new THREE.Vector3(c ? sx / c : mz.x, top > -1e8 ? top : box.max.y, mz.z * 0.30);
  // norm = escala de normalização do wrap no momento da medida. box/muzzle/sight estão em
  // METROS REAIS (espaço do PAI do wrap); para usá-los com wrap.localToWorld é preciso
  // dividir por norm, senão a escala entra DUAS vezes e o flash nasce longe do cano.
  const m = { box: box.clone(), muzzle: mz.clone(), sight, norm: wrap.scale.x || 1 };
  _metrics.set(id, m);
  return m;
}
export function weaponMetrics(id) { return _metrics.get(id) || null; }

// Returns a THREE.Group holding the weapon, scaled to real size, barrel pointing +Z,
// grip roughly at the group origin (so it sits in a hand placed at origin).
export function weaponModel(id) {
  const tpl = _cache.get(MODEL_ALIAS[id] || id) || _cache.get('awp');
  if (!tpl) return null;
  const cfg = CFG[id] || CFG.awp;
  const model = tpl.clone(true);
  model.rotation.set(cfg.rot[0] * Math.PI / 180, cfg.rot[1] * Math.PI / 180, cfg.rot[2] * Math.PI / 180);

  const wrap = new THREE.Group();
  wrap.add(model);
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  /* Normaliza pelo MAIOR eixo, não só por Z: um `rot` errado deixa a arma torta (a régua
     de orientação pega), mas nunca gigante. Régua: tools/eval/weapon-scale-check.mjs. */
  const dx = box.max.x - box.min.x, dy = box.max.y - box.min.y, dz = box.max.z - box.min.z;
  const zlen = Math.max(dx, dy, dz) || 1;
  const s = Math.min(8, Math.max(0.05, cfg.len / zlen)); // guard against a bad bbox → giant gun
  wrap.scale.setScalar(s);
  // shift so the grip point (gripZ along the barrel) sits at the origin
  wrap.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(wrap);
  const gripWorldZ = b2.max.z - (b2.max.z - b2.min.z) * cfg.gripZ;
  model.position.z -= gripWorldZ / s;
  /* Pente procedural (só md97/mp5 — ver o bloco MAG). Entra DEPOIS do shift do grip,
     porque a tabela MAG está no espaço final (grip na origem, cano +Z, metros reais); o
     `scale 1/s` cancela o `s` do wrap, então os números da tabela são metros de verdade.
     Entra ANTES do measureGun de propósito: nas 24 armas que já têm pente ele conta na
     medida, e aqui contar não muda nada do que é consumido — o pente não estica o span
     em Z (é quem define `back`/`fwd` do enquadramento, game.js:1470), não é o ponto mais
     avançado em +Z (boca) nem o mais alto na metade da frente (alça de mira). O que muda
     é box.min.y, que ninguém lê. */
  const mag = buildMag(id);
  if (mag) { mag.scale.setScalar(1 / s); wrap.add(mag); }
  wrap.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  wrap.userData.metrics = measureGun(id, wrap);   // boca/alça/caixa medidas (ver measureGun)
  return wrap;
}
