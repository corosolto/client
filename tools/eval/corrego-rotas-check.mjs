/* RÉGUA DE ROTAS DO CÓRREGO — o mapa é andável do jeito que ele PARECE?

   Comprada em 28/08/2026, palavras literais do dono jogando a main:

     "a rampa por cima dos barracos nao é acessivel aos jogadores"
     "as rampas de acesso ao corrego nao da pra andar pra cima"
     "cando cai no corrego voce nao consegue passar por baixo da rampa e deveria dar"
     "o barraco tem que dar pra entrar nele e depois pegar a rampa por cima pro outro
      lado do mapa"

   O `corrego-contract-check` já existia e estava VERDE — ele cobra que a rampa EXISTA
   (geometria declarada), não que ela LEVE a algum lugar. É o corolário da lei 1 da
   bug-hunt: régua verde com o dono dizendo que está errado é hipótese de que a régua
   mede a coisa errada. Esta aqui mede TRAVESSIA, não presença.

   CLÁUSULAS
     ROTA1  as 4 rampas de acesso são andáveis de ponta a ponta: a célula do TOPO e a do
            FUNDO de cada rampa estão no MESMO componente conexo do flood-fill que sai
            dos spawns. Reprova a rampa que existe e não se sobe.
     ROTA2  o fundo do canal é alcançável a pé desde os spawns (não só "andável no
            papel": conectado de verdade).
     ROTA3  nenhuma ILHA ALTA andável: superfície com área >= AREA_ILHA_MIN e altura
            >= ALTO_MIN que o flood-fill NÃO alcança. É a cláusula que morde a "rampa
            por cima dos barracos que não é acessível" — e ela nomeia a ilha com x/z/y
            para o conserto saber onde ir.
     ROTA4  passagem POR BAIXO da rampa, dentro do canal: sonda de corpo à altura do
            fundo varrendo z ao longo da faixa da rampa. Esta cláusula NÃO usa o
            flood-fill: ele é 2.5D (`groundHeightAt` devolve UMA altura por x,z) e por
            construção não sabe representar dois pisos no mesmo ponto. Medir "por baixo"
            com ele daria verde por vacuidade — a armadilha da régua que passa sem medir.

   USO
     node tools/eval/corrego-rotas-check.mjs
     node tools/eval/corrego-rotas-check.mjs --json
     node tools/eval/corrego-rotas-check.mjs --mutante=<nome>

   MUTANTES (lei 2 — régua que não pode falhar não mede nada)
     rampa-plana     a rampa vira degrau único (groundHeightAt ignora o t)  -> ROTA1
     canal-tampado   o fundo do canal sobe ao nível da rua                  -> ROTA2
     ilha-solta      cria laje alta andável e desconectada                  -> ROTA3
     rampa-macica    enche o vão sob a rampa com colisor                    -> ROTA4

   Sai 1 se qualquer cláusula reprovar, ou se um mutante NÃO acender cláusula nenhuma. */
import { MAPS, initTextures, bootGame } from './harness.mjs';

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const MUT = (args.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
/* Cada mutante aponta a cláusula que ELE tem de acender. `canal-tampado` estava
   registrado na ROTA2 e acendia a ROTA1: sem esta conferência o registro mentiria e a
   ROTA2 ficaria sem prova nenhuma. Foi o próprio autoteste (lei 2) que pegou. */
const MUTANTES = { 'rampa-plana': 'ROTA1', 'canal-tampado': 'ROTA1', 'canal-ilhado': 'ROTA2', 'ilha-solta': 'ROTA3', 'ponte-macica': 'ROTA4', 'ponte-sumida': 'ROTA4' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

/* Parâmetros do flood-fill: os MESMOS do pickup-check, de propósito. Dois números
   diferentes para "andável" em duas réguas da mesma casa é como o jogo passa a mentir
   em uma delas. STEP_G < R_BODY, então a discretização não abre fresta nem fecha vão. */
const STEP_G = 0.25;
const R_BODY = 0.38;
const DEGRAU = 0.30;
/* Ilha alta: 2,4 m é abaixo de um pavimento (PISO = 2,8 m em map_corrego.js:669), então
   qualquer laje de barraco conta; 1 m² evita acusar quina de colisor como "ilha". */
const ALTO_MIN = 2.4;
const CANAL_FUNDO = -1.75;   // espelho de map_corrego.js:31
const AREA_ILHA_MIN = 1.0;

const falhas = [];
const infos = [];
const textures = initTextures();
const g = bootGame('corrego', { textures, ctf: false, seed: 12345 });
const W = g.world;
const gh0 = W.groundHeightAt;

/* ---- mutantes que mexem no MUNDO, não no teste ---- */
let gh = gh0;
if (MUT === 'rampa-plana') gh = (x, z, y) => { const h = gh0(x, z, y); const ax = Math.abs(x); return (ax >= 3 && ax <= 5 && h < -0.01) ? -1.75 : h; };
if (MUT === 'ponte-macica') gh = (x, z, y) => gh0(x, z, undefined);          // ignora o yRef: volta o defeito
if (MUT === 'ponte-sumida') gh = (x, z, y) => { const h = gh0(x, z, y); return (Math.abs(x) <= 5.2 && [-22,0,22].some(b=>Math.abs(z-b)<=1.6)) ? CANAL_FUNDO : h; };
if (MUT === 'canal-tampado') gh = (x, z, y) => Math.max(gh0(x, z, y), 0);
/* canal-ilhado: as rampas somem (a faixa vira passeio plano) e o fundo do canal deixa de
   ter acesso a pé — é o defeito que a ROTA2 existe para barrar. */
/* Fechar SÓ as rampas não ilha o canal: as pontas assoreadas são a outra entrada, e o
   mapa declara isso ("rota baixa de 80 m, com saída pelas rampas e pontas alagadas",
   map_corrego.js:322). A primeira versão deste mutante fechava só as rampas e a ROTA2
   ficava verde com razão — o autoteste da lei 2 pegou. */
if (MUT === 'canal-ilhado') gh = (x, z, y) => {
  const ax = Math.abs(x);
  if (ax >= 3 && ax <= 5) return 0;                 // rampas viram passeio plano
  if (ax < 3 && Math.abs(z) > 30) return 0;         // pontas assoreadas viram muro
  return gh0(x, z, y);
};
if (!MUT) gh = gh0;

const B = { minX: -60, maxX: 60, minZ: -60, maxZ: 60 };
for (const c of W.colliders || []) {
  B.minX = Math.min(B.minX, c.minX); B.maxX = Math.max(B.maxX, c.maxX);
  B.minZ = Math.min(B.minZ, c.minZ); B.maxZ = Math.max(B.maxZ, c.maxZ);
}
const nGx = Math.ceil((B.maxX - B.minX) / STEP_G) + 1;
const nGz = Math.ceil((B.maxZ - B.minZ) / STEP_G) + 1;
const gid = (i, j) => j * nGx + i;
const GX = (i) => B.minX + i * STEP_G;
const GZ = (j) => B.minZ + j * STEP_G;

const andavelCache = new Int8Array(nGx * nGz).fill(-1);
const andavel = (i, j) => {
  if (i < 0 || j < 0 || i >= nGx || j >= nGz) return false;
  const k = gid(i, j);
  if (andavelCache[k] < 0) {
    const x = GX(i), z = GZ(j), p = { x, y: gh(x, z), z };
    g._collide(p, R_BODY);
    andavelCache[k] = (Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6) ? 1 : 0;
  }
  return andavelCache[k] === 1;
};
const altCache = new Float32Array(nGx * nGz).fill(NaN);
const altura = (i, j) => {
  const k = gid(i, j);
  if (Number.isNaN(altCache[k])) altCache[k] = gh(GX(i), GZ(j));
  return altCache[k];
};

/* mutante ilha-solta: laje andável a 5 m, cercada de não-andável. Entra como override do
   par (andavel, altura) — é geometria de mentira, mas o que a ROTA3 mede é topologia. */
const ILHA = { x0: 20, x1: 23, z0: 20, z1: 23, y: 5.0 };
const naIlha = (i, j) => MUT === 'ilha-solta'
  && GX(i) >= ILHA.x0 && GX(i) <= ILHA.x1 && GZ(j) >= ILHA.z0 && GZ(j) <= ILHA.z1;
const andavel2 = (i, j) => (naIlha(i, j) ? true : andavel(i, j));
const altura2 = (i, j) => (naIlha(i, j) ? ILHA.y : altura(i, j));

/* ---- flood-fill a partir dos spawns ---- */
const alcancado = new Uint8Array(nGx * nGz);
{
  const fila = [];
  for (const s of Object.values(W.spawns || {}).flat()) {
    let i = Math.round((s.x - B.minX) / STEP_G), j = Math.round((s.z - B.minZ) / STEP_G);
    let ok = andavel2(i, j);
    for (let rad = 1; rad <= 8 && !ok; rad++)
      for (let di = -rad; di <= rad && !ok; di++)
        for (let dj = -rad; dj <= rad && !ok; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
          if (andavel2(i + di, j + dj)) { i += di; j += dj; ok = true; }
        }
    if (!ok) continue;
    if (!alcancado[gid(i, j)]) { alcancado[gid(i, j)] = 1; fila.push(i, j); }
  }
  for (let h = 0; h < fila.length; h += 2) {
    const i = fila[h], j = fila[h + 1], y0 = altura2(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nGx || b >= nGz) continue;
      const k = gid(a, b);
      if (alcancado[k] || !andavel2(a, b)) continue;
      if (Math.abs(altura2(a, b) - y0) > DEGRAU) continue;
      alcancado[k] = 1; fila.push(a, b);
    }
  }
}
const totalAlcancado = alcancado.reduce((a, v) => a + v, 0);
infos.push(`flood-fill: ${totalAlcancado} células alcançadas a partir dos spawns (grade ${STEP_G} m)`);

const cel = (x, z) => [Math.round((x - B.minX) / STEP_G), Math.round((z - B.minZ) / STEP_G)];
/* "alcançado por perto": a célula exata pode cair na quina de um colisor. Anel de 3
   células (0,75 m) é menor que o corpo, então não inventa alcance que não existe. */
const alcancadoPerto = (x, z, rad = 3) => {
  const [ci, cj] = cel(x, z);
  for (let di = -rad; di <= rad; di++) for (let dj = -rad; dj <= rad; dj++) {
    const a = ci + di, b = cj + dj;
    if (a >= 0 && b >= 0 && a < nGx && b < nGz && alcancado[gid(a, b)]) return true;
  }
  return false;
};

/* ═══ ROTA1 — as 4 rampas sobem ═══
   As faixas saem do próprio mapa (RAMPAS em map_corrego.js:38). Repetidas aqui porque o
   módulo não as exporta; se alguém mudar lá e não aqui, a ROTA1 mede rampa que não
   existe — por isso a checagem de sanidade logo abaixo, que reprova se a altura medida
   no ponto declarado não bater com topo≈0 e fundo≈CANAL_FUNDO. */
const RAMPAS = [
  { nome: 'oeste z[-33,-27]', lado: -1, zAlto: -33, zBaixo: -27 },
  { nome: 'leste z[-13,-7]', lado: 1, zAlto: -13, zBaixo: -7 },
  { nome: 'oeste z[9,15]', lado: -1, zAlto: 9, zBaixo: 15 },
  { nome: 'leste z[26,32]', lado: 1, zAlto: 26, zBaixo: 32 },
];
const XR = 4.0;   // meio da faixa andável da rampa: |x| ∈ [3, 4.54] (o arrimo come de 4.54 a 5)
/* STEP_H do jogo (game.js:5044), não o DEGRAU da grade: o que a ROTA1 cobra é o degrau
   que o CORPO não sobe. Medir com 0,30 aqui reprovaria rampa que o jogador sobe. */
const STEP_H = 0.55;
const rampas = [];
for (const r of RAMPAS) {
  const xr = r.lado * XR;
  const z0 = Math.min(r.zAlto, r.zBaixo), z1 = Math.max(r.zAlto, r.zBaixo);
  /* SÓ DENTRO DO VÃO. Varrer um passo além pega a parede do canal voltando (1,75 m) e
     reprova as quatro rampas — foi o primeiro resultado desta régua, e era artefato do
     instrumento (lei 7), não defeito do mapa. */
  let pior = 0, zPior = null, prev = null;
  for (let z = z0; z <= z1 + 1e-9; z += STEP_G) {
    const y = gh(xr, z);
    if (prev !== null) { const d = Math.abs(y - prev); if (d > pior) { pior = d; zPior = z; } }
    prev = y;
  }
  const queda = Math.abs(gh(xr, r.zBaixo) - gh(xr, r.zAlto));
  rampas.push({ nome: r.nome, degrauMax: +pior.toFixed(3), zPior, queda: +queda.toFixed(2) });
  if (pior > STEP_H) falhas.push(`ROTA1 rampa ${r.nome}: degrau de ${pior.toFixed(3)} m em z=${zPior} — o corpo sobe no máximo ${STEP_H} m (game.js:5044). A rampa existe e não se sobe.`);
  if (queda < 1.0) falhas.push(`ROTA1 rampa ${r.nome}: desnível de só ${queda.toFixed(2)} m — ela não chega ao fundo do canal (${CANAL_FUNDO} m)`);
}
for (const r of rampas) infos.push(`  rampa ${r.nome}: degrau máx ${r.degrauMax} m | desnível ${r.queda} m`);

/* ═══ ROTA2 — o fundo do canal é alcançável a pé ═══
   A célula alcançada tem de estar NA PROFUNDIDADE DO CANAL. A primeira versão só pedia
   "alcançado por perto" e vinha verde pelo TABLADO das pontes, que passa por cima dos
   pontos de sonda — instrumento medindo a laje e chamando de fundo (lei 7). */
{
  const noFundo = (x, z, rad = 3) => {
    const [ci, cj] = cel(x, z);
    for (let di = -rad; di <= rad; di++) for (let dj = -rad; dj <= rad; dj++) {
      const a = ci + di, b = cj + dj;
      if (a < 0 || b < 0 || a >= nGx || b >= nGz || !alcancado[gid(a, b)]) continue;
      if (altura2(a, b) < CANAL_FUNDO + 0.4) return true;
    }
    return false;
  };
  const pontos = [[0, -18], [0, -10], [0, 8], [0, 16], [0, 28]];
  const bons = pontos.filter(([x, z]) => noFundo(x, z));
  infos.push(`fundo do canal: ${bons.length}/${pontos.length} pontos alcançados NA PROFUNDIDADE`);
  if (bons.length === 0) falhas.push(`ROTA2 o fundo do canal é INALCANÇÁVEL a pé desde os spawns (0/${pontos.length} pontos) — a rota baixa vira cenário`);
}

/* ═══ ROTA3 — nenhuma ilha alta andável e desconectada ═══
   Componentes conexos entre as células ANDÁVEIS que o flood-fill não alcançou. */
{
  const visto = new Uint8Array(nGx * nGz);
  const ilhas = [];
  for (let j = 0; j < nGz; j++) for (let i = 0; i < nGx; i++) {
    const k = gid(i, j);
    if (visto[k] || alcancado[k] || !andavel2(i, j)) continue;
    const fila = [i, j]; visto[k] = 1;
    let n = 0, sx = 0, sz = 0, yMax = -Infinity, yMin = Infinity;
    for (let h = 0; h < fila.length; h += 2) {
      const a = fila[h], b = fila[h + 1];
      const y = altura2(a, b);
      n++; sx += GX(a); sz += GZ(b);
      if (y > yMax) yMax = y; if (y < yMin) yMin = y;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = a + di, d = b + dj;
        if (c < 0 || d < 0 || c >= nGx || d >= nGz) continue;
        const kk = gid(c, d);
        if (visto[kk] || alcancado[kk] || !andavel2(c, d)) continue;
        if (Math.abs(altura2(c, d) - y) > DEGRAU) continue;
        visto[kk] = 1; fila.push(c, d);
      }
    }
    const area = n * STEP_G * STEP_G;
    if (area >= AREA_ILHA_MIN && yMax >= ALTO_MIN) ilhas.push({ area: +area.toFixed(1), x: +(sx / n).toFixed(1), z: +(sz / n).toFixed(1), yMax: +yMax.toFixed(2), yMin: +yMin.toFixed(2) });
  }
  ilhas.sort((a, b) => b.area - a.area);
  infos.push(`ilhas altas (>= ${AREA_ILHA_MIN} m², topo >= ${ALTO_MIN} m) desconectadas: ${ilhas.length}`);
  for (const il of ilhas.slice(0, 8)) infos.push(`  ilha ${il.area} m² em x=${il.x} z=${il.z}, y ${il.yMin}..${il.yMax}`);
  if (ilhas.length) {
    falhas.push(`ROTA3 ${ilhas.length} superfície(s) alta(s) andável(is) que o jogador NÃO alcança — a maior: ${ilhas[0].area} m² em x=${ilhas[0].x} z=${ilhas[0].z}, y=${ilhas[0].yMax}`);
  }
}

/* ═══ ROTA4 — passar POR BAIXO das pontes, andando no fundo do canal ═══
   Fora do flood-fill de propósito: ele é 2.5D e por construção não sabe representar dois
   pisos no mesmo x,z — medir "por baixo" com ele daria verde por vacuidade. Aqui a sonda
   é o próprio `groundHeightAt` com o yRef de quem está DENTRO do canal, que é o que o
   `_updatePlayer` passa (game.js:5039/5047/5056). */
{
  let pior = 0, zPior = null, prev = null;
  for (let z = -30; z <= 30; z += STEP_G) {
    const y = gh(0, z, CANAL_FUNDO);
    if (prev !== null) { const d = Math.abs(y - prev); if (d > pior) { pior = d; zPior = z; } }
    prev = y;
  }
  infos.push(`fundo do canal (yRef=${CANAL_FUNDO}): maior degrau ${pior.toFixed(2)} m${zPior !== null ? ` em z=${zPior}` : ''}`);
  if (pior > STEP_H) falhas.push(`ROTA4 andando no fundo do canal há um degrau de ${pior.toFixed(2)} m em z=${zPior} — as pontes fecham a rota baixa. O corpo sobe ${STEP_H} m.`);

  /* E o contrário tem que continuar valendo: quem anda EM CIMA pisa no tablado. Sem esta
     cláusula o conserto "abre por baixo" derrubando a ponte, e a régua não veria. */
  for (const zc of [-22, 0, 22]) {
    const cima = gh(0, zc, 0.15);
    if (cima < 0.1) falhas.push(`ROTA4 a ponte z=${zc} sumiu para quem anda em cima (y=${cima.toFixed(2)}) — o multinível derrubou o tablado`);
  }
}

/* ---- saída ---- */
if (JSON_OUT) {
  console.log(JSON.stringify({ ok: falhas.length === 0, falhas, infos, rampas }, null, 1));
} else {
  for (const i of infos) console.log(`  ${i}`);
  for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
  if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m ROTA rampas sobem, canal alcançável, nenhuma ilha alta solta, vão sob a rampa livre');
}
/* lei 2: mutante que não acende cláusula nenhuma é portão cego */
if (MUT && !falhas.some((f) => f.startsWith(MUTANTES[MUT]))) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu a cláusula ${MUTANTES[MUT]} — portão cego (lei 2)`);
  process.exit(1);
}
process.exit(falhas.length ? 1 : 0);
