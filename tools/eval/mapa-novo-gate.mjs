/* ============================================================================
   mapa-novo-gate.mjs — O PORTÃO ÚNICO DE MAPA NOVO.
   ----------------------------------------------------------------------------
   POR QUE EXISTE (o defeito é de PROCESSO, não de arte)

   Em 12/08/2026 o dono abriu o jogo e disse que os 5 mapas novos (escadão, campo
   do morro, lajes, córrego, mansão) estavam "low poly e injogáveis". A causa não
   foi mão de artista: foi que NINGUÉM MEDIU.

     · `gl-shots.mjs` tinha lista de mapas LITERAL, parada em 5, enquanto o jogo
       foi para 10. Os 5 novos nunca passaram por captura nenhuma. Mapa que não é
       fotografado não é criticado, e o que não é criticado regride calado. A
       prova está no código: `map_ferrovelho.js` tem comentário citando crítico do
       gauntlet ("horizonte vazio", "crítico R6") e tem skyline em camadas; os 5
       novos não tinham UMA LINHA de horizonte.
     · `MAP1` (corpo dentro de sólido) era o único critério sem cláusula de
       reprovação: imprimia "dentro 5, pior 1,384" e saía 0.

   Régua espalhada em 6 arquivos, cada uma com sua lista de mapas, é como a
   defasagem nasce. Este arquivo é UM portão: ele varre o REGISTRO (não uma lista
   à mão), roda as cláusulas estruturais contra todo mapa que existe, e reprova
   mapa que não atinge o patamar.

   O DEFEITO QUE ELE PREMIA (pergunta 1 da skill `regua`)
   Um portão que só soma cláusulas premia quem PICA a geometria: 200 caixinhas
   giradas dão o mesmo "% de massa girada" que 200 casas giradas. Por isso ORT1
   cobra DUAS coisas ao mesmo tempo — fração de massa fora da grade E variedade de
   ângulos distintos. Picar caixa não inventa ângulo novo: a Piscina tem 385
   massas e UM ângulo (0°). E por isso ALT1 mede altura por PERCENTIL de massa, que
   não sobe porque você acrescentou entulho.

   COMO ELE MEDE (tudo no MUNDO REAL do jogo: `bootGame` + `world.root`, node puro)
     ORT1  ortogonalidade: ângulo em torno de Y de cada massa com altura ≥ 0,5 m,
           dobrado em 90° (caixa é simétrica a cada 90°), >3° = fora da grade.
     ALT1  verticalidade: percentil 90 do topo das massas.
     SUP1  fração de MATERIAIS sem `map` — a mesma medida do
           `corrego-superficie-check.mjs`, com o TETO LIDO DAQUELE ARQUIVO.
     SUP2  fração de ÁREA sem textura — vinda do `texel-check.mjs --json-out`.
     JOG1  corpo dentro de sólido == 0, lido do `map_check.json`.
     JOG2  borda de andar alto sem guarda, sem regressão, do mesmo JSON.
     COB1  o parse de registro do `gl-shots.mjs` devolve TODO id que existe.
     COB2  nenhuma bateria de captura carrega lista fixa que omite id do registro.

   POR QUE ELE NÃO REIMPLEMENTA MEDIDA QUE JÁ EXISTE (LIÇÃO 2 do docs/LICOES.md:
   dois limiares para o mesmo conceito é o instrumento discordando de si)
     · SUP2 e JOG1/JOG2 são CONSUMIDOS de quem já mede (`texel-check`, `map-check`).
     · SUP1 tem que ser medida aqui porque o `corrego-superficie-check.mjs` só
       cobre `corrego` e não é importável (o corpo do módulo sobe o jogo e chama
       `process.exit`). Então o TETO é LIDO DO CÓDIGO-FONTE daquele arquivo — se
       alguém mudar 0,40 lá, este portão segue junto sem ninguém lembrar — e a
       CONTA foi calibrada contra a saída real dele: `corrego` dá 23/103 = 22,3%
       nos dois. Teto que não é achado no fonte = VERMELHO, não um valor de reserva.

   COMO ELE FALHA QUANDO NÃO SABE MEDIR (pergunta 4 da skill: não saber custa o
   mesmo que estar errado — foi `null` com cara de fato que publicou licença errada)
     · `texel-check` não roda / JSON sem o mapa ....... VERMELHO
     · `map_check.json` ausente ou MAIS VELHO que os fontes de mapa ... VERMELHO
     · teto não encontrado no fonte do corrego-check ... VERMELHO
     · mapa que não constrói ........................... VERMELHO (não é pulado)

   ORTOGONALIDADE SÓ VALE ONDE A REFERÊNCIA É ORGÂNICA
   Favela, morro e ferro-velho são autoconstrução: a massa nasce torta porque o
   terreno é torto. Salão de piscina fechado e galpão de loja com vaga demarcada
   são ORTOGONAIS DE VERDADE — cobrar ângulo torto deles é cobrar infidelidade.
   Por isso ORT1 incide sobre a classe `organico`, e o PADRÃO de mapa novo é
   `organico`: quem quiser isenção põe o nome na tabela CLASSE, com motivo. Uma
   isenção que exige um ato explícito e revisável não é a mesma coisa que um teto
   frouxo.

   USO
     node tools/eval/mapa-novo-gate.mjs                 # os 10 mapas
     node tools/eval/mapa-novo-gate.mjs --mapa=lajes # um só
     node tools/eval/mapa-novo-gate.mjs --json-out=/tmp/x.json
     node tools/eval/mapa-novo-gate.mjs --mutante=<nome>

   MUTANTES — um por cláusula, e cada um acende SÓ a sua (mutação que acende duas
   não prova nenhuma). Todos abortam com "MUTANTE NAO APLICOU" se não casarem.
     grade-perfeita ......... ORT1   (encaixa toda massa na grade de 90°)
     teto-baixo ............. ALT1   (achata a massa construída)
     tudo-chapado ........... SUP1   (arranca `map` de todo material)
     texel-ausente .......... SUP2   (prova o vermelho de "não sei medir")
     corpo-dentro ........... JOG1   (injeta corpo dentro de sólido no JSON lido)
     mapcheck-velho ......... JOG2   (prova a cláusula de frescor do JSON)
     registro-fora-de-forma . COB1   (reindenta o registro: o parse encolhe calado)
     bateria-fixa ........... COB2   (tira do gl-shots a leitura do registro)
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { THREE, MAPS, initTextures, bootGame } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (n, d = null) => {
  const p = process.argv.find((a) => a.startsWith(`--${n}=`));
  return p ? p.slice(n.length + 3) : (process.argv.includes(`--${n}`) ? true : d);
};
const SO_MAPA = arg('mapa');
const JSON_OUT = arg('json-out');
const MUT = arg('mutante');
const MUTANTES = ['grade-perfeita', 'teto-baixo', 'tudo-chapado', 'texel-ausente',
  'corpo-dentro', 'mapcheck-velho', 'registro-fora-de-forma', 'bateria-fixa'];
if (MUT && !MUTANTES.includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT}\nconhecidos: ${MUTANTES.join(' | ')}`);
  process.exit(2);
}
/* Semente fixa: o `loja_h` sorteia os carros por partida (`havanPropsForMatch()`), e
   prop girado ENTRA na conta de ortogonalidade. Sem semente, duas execuções mediriam
   estacionamentos diferentes (medido: 5,7% sem props contra 6,9% com). 13007 é a mesma
   do corrego-superficie-check, para que os dois olhem a mesma partida. */
const SEED = 13007;

/* ---------------------------------------------------------------------------
   TETOS — um lugar só, com a derivação de cada número.
   ------------------------------------------------------------------------- */
/* ORT1. Medido em 12/08 nos 10 mapas, com o instrumento corrigido (ver a nota
   INSTRUMENTO abaixo). Os organicos ficaram em dois grupos separados por uma
   faixa VAZIA, e o teto mora no meio dela — teto colado no medido reprova por
   ruído:
     passam: ferro_velho 41,1%/46 ang · quebrada 34,1%/46 · mansao 29,7%/31
     falham: corrego 7,7%/9 · lajes 4,3%/8 · escadao 0,7%/4 · campomorro 0,0%/1
   Entre 29,7% e 7,7% não existe mapa nenhum; entre 31 e 9 ângulos também não. */
export const ANG_DISTINTOS_MIN = 20;    // ângulos distintos (arredondados ao grau)
export const FRAC_GIRADA_MIN = 0.15;    // fração da massa fora da grade
export const FORA_DA_GRADE_GRAUS = 3;   // acima disso a massa não é "de esquadro"
export const ALT_MASSA_MIN = 0.5;       // abaixo disso não é massa construída, é detalhe

/* ALT1. Vem da fotografia: casa de favela é 3-4 lajes = 9-12 m.
   ATENÇÃO, e está no relatório: este teto NÃO SEPARA mapa bom de mapa ruim nesta
   base. Medido: passam só `praca_poderes` (15,4) e `campomorro` (9,6) — e o
   campomorro é um dos que o dono odeia, com 0,0% de massa girada. Reprovam
   `quebrada` (5,1) e `ferro_velho` (4,2), que estão entre os que ele considera
   menos ruins. Ou seja: ALT1 codifica a AMBIÇÃO de fidelidade, não o julgamento
   do dono, e os 8 reprovados de hoje estão em DIVIDA com nome e número. Ele
   continua valendo para mapa NOVO, que é o alvo deste portão. */
export const ALT_P90_MIN = 9.0;

/* SUP1/SUP2: os tetos NÃO moram aqui. São lidos do corrego-superficie-check.mjs
   (fonte única). Ver `tetosDoCorrego()`. */
const CORREGO_CHECK = path.join(HERE, 'corrego-superficie-check.mjs');

/* ---------------------------------------------------------------------------
   CLASSE URBANA — quem responde por ORT1. Padrão de mapa novo: `organico`.
   ------------------------------------------------------------------------- */
export const CLASSE = {
  // Brasília de Lúcio Costa/Niemeyer: a malha ortogonal É o projeto. Isento por
  // referência — e note que ele PASSARIA de qualquer jeito (27,2%/25 ângulos, por
  // causa das 295 instâncias de arborização), então a isenção não esconde nada.
  praca_poderes: 'planejado',
  // Salão de piscina fechado (herança do CS 1.6): caixa retangular, de propósito.
  piscina_treta: 'planejado',
  // Galpão de loja + estacionamento com vaga demarcada: grade é o assunto do lugar.
  loja_h: 'planejado',
};
const classeDe = (id) => CLASSE[id] || 'organico';

/* ---------------------------------------------------------------------------
   DÍVIDA DECLARADA — o mesmo contrato do tools/eval/KNOWN-RED.json: entrada aqui
   AVISA em vez de reprovar; qualquer vermelho FORA desta lista reprova. Mapa que
   não está no registro de hoje (isto é, MAPA NOVO) não tem dívida nenhuma: ele
   nasce tendo que passar em tudo. É esse o ponto do portão.

   NÃO ACRESCENTE NADA AQUI PARA FICAR VERDE. Todo número abaixo foi medido em
   12/08/2026 e está no relatório da rodada.

   Ela mora neste arquivo, e não no KNOWN-RED.json, de propósito: aquele arquivo é
   do portão de invariantes e é guardado pelo `eval:ratchet`, que reprova PR com
   entrada nova. Despejar 20 dívidas lá de carona reprovaria o PR de quem não tem
   nada com isso. Promover para lá é decisão de outra rodada.
   ------------------------------------------------------------------------- */
export const DIVIDA = {
  // ORT1 — os 4 mapas chapados que o dono reprovou em 12/08.
  'ORT1:escadao': '0,7% de massa girada e 4 ângulos distintos (piso 15% / 20)',
  'ORT1:campomorro': '0,0% de massa girada e 1 ângulo distinto — grade perfeita',
  'ORT1:lajes': '4,3% de massa girada e 8 ângulos distintos',
  /* ORT1:corrego QUITADA em 12/08/2026 — 66,5% de massa girada e 39 ângulos
     distintos, contra 7,7%/9 na entrada da dívida. A entrada saiu daqui de propósito:
     dívida paga que continua declarada é dívida que deixa de morder se o mapa
     regredir, e o próprio portão manda removê-la ("QUITADAS — REMOVA a entrada"). */
  // ALT1 — 8 dos 10; ver a nota do teto: ele não separa bom de ruim nesta base.
  'ALT1:piscina_treta': 'h90 6,4 m (salão fechado: teto é o do prédio)',
  'ALT1:loja_h': 'h90 5,0 m (galpão de uma laje)',
  'ALT1:ferro_velho': 'h90 4,2 m (pátio: a massa é pilha de carro)',
  'ALT1:quebrada': 'h90 5,1 m',
  'ALT1:escadao': 'h90 7,9 m',
  'ALT1:lajes': 'h90 6,0 m',
  // ALT1:corrego QUITADA em 12/08/2026 — h90 9,4 m (era 4,7 m). Mesmo motivo acima.
  'ALT1:mansao': 'h90 4,1 m (casa térrea em plataforma)',
  // SUP1 — teto 40% (média dos 5 maduros hoje é 31,7%).
  'SUP1:loja_h': '67,6% dos materiais sem `map`',
  'SUP1:quebrada': '41,3% dos materiais sem `map`',
  'SUP1:escadao': '63,4% dos materiais sem `map`',
  'SUP1:campomorro': '50,0% dos materiais sem `map`',
  'SUP1:lajes': '55,6% dos materiais sem `map`',
  'SUP1:mansao': '97,4% dos materiais sem `map`',
  // SUP2 — teto 6%, derivado NO CÓRREGO (saia + colisor). Sua transferência para
  // mapa fechado é o elo fraco desta régua e está dito no relatório.
  'SUP2:piscina_treta': '20,0% da área sem textura',
  'SUP2:loja_h': '8,3% da área sem textura',
  'SUP2:quebrada': '7,6% da área sem textura',
  'SUP2:escadao': '13,4% da área sem textura',
  'SUP2:campomorro': '12,8% da área sem textura',
  'SUP2:lajes': '17,2% da área sem textura',
  'SUP2:mansao': '34,9% da área sem textura',
  // JOG2 — MAP6 do map-check, que já reprova sozinho lá.
  'JOG2:loja_h': '21 bordas de andar alto sem guarda (MAP6 do map-check)',
  // COB2 — as duas baterias com lista à mão. É a MESMA falha do gl-shots que
  // deixou 5 mapas invisíveis; aqui ela está declarada em vez de silenciosa.
  'COB2:g2ui-map-previews.mjs': 'lista fixa com os 5 mapas antigos; faltam os 5 novos',
  'COB2:map-evidence-views.mjs': 'câmeras só dos 5 mapas novos; faltam os 5 antigos',
};

/* ---------------------------------------------------------------------------
   INSTRUMENTO — como o ângulo é lido, e os dois furos que a primeira versão tinha.
   ------------------------------------------------------------------------- */
/* FURO 1 — ESCALA. `Euler.setFromRotationMatrix` só vale em matriz SEM escala; com
   escala não-uniforme o ângulo sai errado. E existe escala: 74 malhas no mansao,
   16 na praça, 13 no córrego. Aqui a matriz é DECOMPOSTA antes.
   FURO 2 — INSTANCING. `InstancedMesh` é UMA malha com N matrizes próprias. Ler só
   a matriz do pai esconde a rotação de cada instância — e é o pai que os mapas
   deixam parado. Medido: com a correção o ferro_velho vai de 353 para 1.060 massas
   e de 18,7% para 41,1%; a praça vai de 6,6% para 27,2%. Sem isso, INSTANCIAR AS
   CASAS seria a forma barata de fazer o número dizer o que você quiser — que é
   exatamente o "defeito que a régua premia" da skill. */
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _m = new THREE.Matrix4(), _e = new THREE.Euler();
const _bx = new THREE.Box3();

function anguloDaGrade(mat) {
  mat.decompose(_p, _q, _s);
  _e.setFromQuaternion(_q, 'YXZ');
  const a = Math.abs(((_e.y % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)) * 180 / Math.PI;
  return a > 45 ? 90 - a : a;
}

const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const ea = new THREE.Vector3(), eb = new THREE.Vector3(), cr = new THREE.Vector3();
/* Área amostrada — MESMA função do corrego-superficie-check.mjs (inclusive o passo
   de 400 triângulos). Duas contas de área diferentes para o mesmo conceito é o
   instrumento discordando de si. */
function areaDe(o) {
  const g = o.geometry;
  if (!g?.attributes?.position) return 0;
  const pos = g.attributes.position, idx = g.index, mw = o.matrixWorld;
  const n = (idx ? idx.count : pos.count) / 3;
  const passo = Math.max(1, Math.ceil(n / 400));
  let s = 0;
  for (let t = 0; t < n; t += passo) {
    const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    v0.fromBufferAttribute(pos, a).applyMatrix4(mw);
    v1.fromBufferAttribute(pos, b).applyMatrix4(mw);
    v2.fromBufferAttribute(pos, c).applyMatrix4(mw);
    ea.subVectors(v1, v0); eb.subVectors(v2, v0);
    s += cr.crossVectors(ea, eb).length() * 0.5;
  }
  return s * passo;
}

/* ---------------------------------------------------------------------------
   MUTANTES QUE MEXEM NO MUNDO (aplicados depois do build, antes de medir).
   ------------------------------------------------------------------------- */
function mutarMundo(root, mutante) {
  let tocados = 0;
  if (mutante === 'grade-perfeita') {
    const snap = (r) => Math.round(r / (Math.PI / 2)) * (Math.PI / 2);
    root.traverse((o) => {
      if (Math.abs(o.rotation.y - snap(o.rotation.y)) > 1e-9) { o.rotation.y = snap(o.rotation.y); tocados++; }
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, _m); _m.decompose(_p, _q, _s);
          _e.setFromQuaternion(_q, 'YXZ');
          const y = snap(_e.y);
          if (Math.abs(_e.y - y) > 1e-9) {
            _e.set(_e.x, y, _e.z, 'YXZ');
            _m.compose(_p, _q.setFromEuler(_e), _s);
            o.setMatrixAt(i, _m); tocados++;
          }
        }
        o.instanceMatrix.needsUpdate = true;
      }
    });
  }
  if (mutante === 'teto-baixo') {
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.updateWorldMatrix(true, false);
      /* O fator achata SEM tirar massa nenhuma do censo: a primeira versão deste
         mutante encolhia tudo por 0,35 e empurrava as massas baixas para debaixo de
         ALT_MASSA_MIN, o que mudava o DENOMINADOR do ORT1 e acendia ORT1:quebrada
         junto — mutação que acende duas cláusulas não prova nenhuma. Aqui nenhuma
         massa desce abaixo de 1,2 × ALT_MASSA_MIN, então o censo do ORT1 fica
         intacto e só a altura cai.
         Em InstancedMesh o piso é a MENOR instância que ainda conta como massa: usar
         a caixa do conjunto encolheria as instâncias baixas para fora do censo (foi o
         que sobrou de resíduo na praça e no ferro velho, os dois mapas instanciados). */
      let H;
      if (o.isInstancedMesh) {
        o.geometry.computeBoundingBox();
        const bb = o.geometry.boundingBox;
        H = Infinity;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, _m); _m.premultiply(o.matrixWorld);
          const c = new THREE.Box3().copy(bb).applyMatrix4(_m);
          const hi = c.max.y - c.min.y;
          if (isFinite(hi) && hi >= ALT_MASSA_MIN && hi < H) H = hi;
        }
        if (!isFinite(H)) return;      // nenhuma instância conta como massa
      } else {
        _bx.setFromObject(o);
        H = _bx.max.y - _bx.min.y;
        if (H < ALT_MASSA_MIN) return;
      }
      const k = Math.max(0.35, (ALT_MASSA_MIN * 1.2) / H);
      o.scale.y *= k; o.position.y *= 0.35; tocados++;
    });
  }
  if (mutante === 'tudo-chapado') {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      for (const x of arr) if (x && x.map) { x.map = null; tocados++; }
    });
  }
  root.updateMatrixWorld(true);
  return tocados;
}

/* ---------------------------------------------------------------------------
   1. O MUNDO CONSTRUÍDO — ORT1, ALT1 e SUP1 saem de UM boot por mapa.
   ------------------------------------------------------------------------- */
function medirMundo(id) {
  const T = initTextures();
  const g = bootGame(id, { textures: T, ctf: true, seed: SEED });
  const root = g.world?.root;
  if (!root) throw new Error(`bootGame(${id}) não devolveu world.root`);
  root.updateMatrixWorld(true);

  let tocadosMut = 0;
  if (MUT === 'grade-perfeita' || MUT === 'teto-baixo' || MUT === 'tudo-chapado') {
    tocadosMut = mutarMundo(root, MUT);
  }

  let massas = 0, giradas = 0;
  const topos = [], angulos = new Set();
  const materiais = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.visible === false) return;
    o.updateWorldMatrix(true, false);

    /* --- materiais (SUP1): definição IDÊNTICA à do corrego-superficie-check --- */
    const arr = Array.isArray(o.material) ? o.material : [o.material];
    const mm = arr.find((x) => x && x.map) || arr[0];
    if (mm && mm.visible !== false) {
      for (const x of arr) {
        if (!x) continue;
        const e = materiais.get(x.uuid) || { map: !!x.map, malhas: 0, area: 0 };
        e.malhas++; e.area += areaDe(o);
        materiais.set(x.uuid, e);
      }
    }

    /* --- massa construída (ORT1/ALT1) --- */
    if (o.isInstancedMesh) {
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, _m); _m.premultiply(o.matrixWorld);
        const c = new THREE.Box3().copy(bb).applyMatrix4(_m);
        const alt = c.max.y - c.min.y;
        if (!isFinite(alt) || alt < ALT_MASSA_MIN) continue;
        massas++; topos.push(c.max.y);
        const a = anguloDaGrade(_m);
        if (a > FORA_DA_GRADE_GRAUS) giradas++;
        angulos.add(Math.round(a));
      }
      return;
    }
    _bx.setFromObject(o);
    const alt = _bx.max.y - _bx.min.y;
    if (!isFinite(alt) || alt < ALT_MASSA_MIN) return;
    massas++; topos.push(_bx.max.y);
    const a = anguloDaGrade(o.matrixWorld);
    if (a > FORA_DA_GRADE_GRAUS) giradas++;
    angulos.add(Math.round(a));
  });

  topos.sort((a, b) => a - b);
  const perc = (f) => (topos.length ? topos[Math.floor(f * (topos.length - 1))] : 0);
  const matsTotal = materiais.size;
  const matsChapados = [...materiais.values()].filter((e) => !e.map).length;

  return {
    id, classe: classeDe(id), tocadosMut,
    massas, giradas, fracGirada: massas ? giradas / massas : 0, angulosDistintos: angulos.size,
    h50: perc(0.5), h90: perc(0.9), hmax: perc(1),
    matsTotal, matsChapados, fracMats: matsTotal ? matsChapados / matsTotal : 0,
  };
}

/* ---------------------------------------------------------------------------
   2. TETOS DE SUPERFÍCIE — lidos do fonte do corrego-superficie-check.
   ------------------------------------------------------------------------- */
function tetosDoCorrego() {
  const falta = (q) => {
    throw new Error(
      `mapa-novo-gate: não achei \`${q}\` em ${path.relative(ROOT, CORREGO_CHECK)}. ` +
      `Os tetos de superfície têm UMA fonte, e ela é aquele arquivo — este portão não ` +
      `guarda cópia de propósito (dois limiares para o mesmo conceito é o instrumento ` +
      `discordando de si). Se a constante mudou de nome, conserte a leitura aqui.`);
  };
  let src;
  try { src = fs.readFileSync(CORREGO_CHECK, 'utf8'); }
  catch { falta('o próprio arquivo'); }
  const le = (nome) => {
    const m = src.match(new RegExp(`export const ${nome}\\s*=\\s*([0-9.]+)`));
    if (!m) falta(nome);
    return parseFloat(m[1]);
  };
  return { MATS_CHAPADOS_MAX: le('MATS_CHAPADOS_MAX'), AREA_CHAPADA_MAX: le('AREA_CHAPADA_MAX') };
}

/* ---------------------------------------------------------------------------
   3. SUP2 — área sem textura, CONSUMIDA do texel-check.
   ------------------------------------------------------------------------- */
function areaSemTextura() {
  const out = path.join(ROOT, `.tmp-mapanovo-texel-${process.pid}.json`);
  if (MUT === 'texel-ausente') {
    return { erro: 'MUTANTE texel-ausente: o insumo do texel-check foi retirado de propósito.' };
  }
  try {
    execFileSync(process.execPath, [path.join(HERE, 'texel-check.mjs'), `--json-out=${out}`],
      { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    /* exit != 0 do texel-check NÃO é motivo para desistir: ele reprova por densidade,
       que não é assunto deste portão. Só a ausência do JSON é. */
    if (!fs.existsSync(out)) return { erro: `texel-check não produziu ${path.basename(out)}: ${String(e.message).slice(0, 200)}` };
  }
  try {
    const j = JSON.parse(fs.readFileSync(out, 'utf8'));
    const por = {};
    for (const m of j.mapas || []) {
      if (m.erro) continue;
      const den = (m.areaSemTextura || 0) + (m.areaTotal || 0);
      por[m.id] = den > 0 ? (m.areaSemTextura || 0) / den : null;
    }
    return { por };
  } catch (e) {
    return { erro: `texel_check JSON ilegível: ${e.message}` };
  } finally {
    try { fs.unlinkSync(out); } catch { /* já foi */ }
  }
}

/* ---------------------------------------------------------------------------
   4. JOG1/JOG2 — consumidos do map_check.json, com cláusula de FRESCOR.
   Rodar o map-check aqui custaria minutos (medido: >2 min nos 10 mapas) e este
   portão perderia quem ia rodá-lo. Mas consumir JSON velho é pior que não medir:
   ele descreve um mapa que não existe mais. Por isso o frescor é cláusula.
   ------------------------------------------------------------------------- */
function jogabilidade() {
  const jsonPath = path.join(HERE, 'map_check.json');
  if (!fs.existsSync(jsonPath)) {
    return { erro: 'tools/eval/map_check.json não existe. Rode `node tools/eval/map-check.mjs all` — ' +
      'sem ele ninguém sabe se o corpo do jogador está dentro de sólido.' };
  }
  const mt = fs.statSync(jsonPath).mtimeMs;
  const fontes = fs.readdirSync(path.join(ROOT, 'public/js'))
    .filter((f) => /^maps?(_|\.js$)/.test(f) || /^map_.*\.js$/.test(f))
    .map((f) => path.join(ROOT, 'public/js', f));
  let maisNovo = 0, culpado = null;
  for (const f of fontes) {
    const s = fs.statSync(f).mtimeMs;
    if (s > maisNovo) { maisNovo = s; culpado = path.basename(f); }
  }
  const velho = MUT === 'mapcheck-velho' ? true : mt < maisNovo;
  if (velho) {
    return { erro: `map_check.json é MAIS VELHO que ${MUT === 'mapcheck-velho' ? '<mutante>' : culpado} ` +
      `(${new Date(mt).toISOString()} contra ${new Date(maisNovo).toISOString()}). Ele descreve um mapa ` +
      'que não existe mais. Rode `node tools/eval/map-check.mjs all`.' };
  }
  const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const por = {};
  for (const m of j.mapas || []) {
    por[m.map] = {
      dentro: m.corpoDentroDeSolido || 0,
      piorPenetracao: m.piorPenetracao || 0,
      bordas: (m.bordasSemGuarda || []).length,
    };
  }
  if (MUT === 'corpo-dentro') {
    const alvo = Object.keys(por)[0];
    if (!alvo) throw new Error('MUTANTE NAO APLICOU: map_check.json sem mapas');
    por[alvo] = { ...por[alvo], dentro: 3, piorPenetracao: 1.384 };
  }
  return { por };
}

/* ---------------------------------------------------------------------------
   5. COBERTURA DE CAPTURA — a cláusula-meta. Foi a AUSÊNCIA dela que deixou 5
   mapas invisíveis por semanas.
   ------------------------------------------------------------------------- */
const REGISTRO = path.join(ROOT, 'public/js/maps.js');
/* As baterias auditadas. `derivada: true` = ela LÊ o registro; para essas o portão
   confere que a leitura devolve tudo. Bateria com lista à mão responde por COB2. */
const BATERIAS = ['gl-shots.mjs', 'g2ui-map-previews.mjs', 'map-evidence-views.mjs'];

function cobertura(idsReais) {
  const falhas = [];
  const detalhe = {};

  /* --- COB1: o parse do gl-shots devolve TODO id que existe? ---
     Ele fatia o texto e casa `^\s{2}id: {`. Um `npm run format` que reindente o
     registro faz esse regex encolher CALADO: o `throw` de lá só dispara com menos
     de 2 ids. Aqui a régua compara o parse com a VERDADE do módulo. */
  let src;
  try { src = fs.readFileSync(REGISTRO, 'utf8'); }
  catch (e) { return { falhas: [`COB1: não consegui ler public/js/maps.js: ${e.message}`], detalhe }; }
  if (MUT === 'registro-fora-de-forma') {
    const antes = src;
    src = src.replace(/^ {2}(?=[a-z][a-z0-9_]*\s*:\s*\{)/gm, '    ');
    if (src === antes) throw new Error('MUTANTE NAO APLICOU: registro-fora-de-forma não reindentou maps.js');
  }
  const bloco = src.slice(src.indexOf('export const MAPS'), src.indexOf('\n};', src.indexOf('export const MAPS')));
  const parseados = [...bloco.matchAll(/^\s{2}([a-z][a-z0-9_]*)\s*:\s*\{/gm)].map((m) => m[1]);
  detalhe.parseGlShots = parseados;
  const perdidos = idsReais.filter((id) => !parseados.includes(id));
  if (perdidos.length) {
    falhas.push(`COB1: o parse de registro do gl-shots.mjs devolve ${parseados.length} de ${idsReais.length} ` +
      `ids — não vê ${perdidos.join(', ')}. A bateria geral capturaria MEIO JOGO em silêncio ` +
      '(o `throw` de lá só dispara abaixo de 2 ids). Conserto: `gl-shots.mjs:80`, o regex `^\\s{2}` ' +
      'depende da indentação de 2 espaços do registro.');
  }

  /* --- COB2: bateria com lista à mão não pode omitir id do registro --- */
  for (const nome of BATERIAS) {
    const f = path.join(HERE, nome);
    if (!fs.existsSync(f)) { falhas.push(`COB2 ${nome}: bateria declarada não existe no disco.`); continue; }
    let s = fs.readFileSync(f, 'utf8');
    if (MUT === 'bateria-fixa' && nome === 'gl-shots.mjs') {
      const antes = s;
      s = s.replace(/public\/js\/maps\.js/g, 'public/js/<registro-removido-pelo-mutante>');
      if (s === antes) throw new Error('MUTANTE NAO APLICOU: bateria-fixa não achou a leitura do registro no gl-shots.mjs');
    }
    const derivada = /public\/js\/maps\.js/.test(s) || /from '\.\/harness\.mjs'/.test(s) && /\bMAPS\b/.test(s);
    const citados = idsReais.filter((id) => new RegExp(`['"\`]?\\b${id}\\b`).test(s));
    detalhe[nome] = { derivada, citados: citados.length };
    if (derivada) continue;
    const faltam = idsReais.filter((id) => !citados.includes(id));
    if (faltam.length) {
      falhas.push(`COB2 ${nome}: lista de mapas à mão, sem ler o registro, e faltam ${faltam.length} de ` +
        `${idsReais.length} ids (${faltam.join(', ')}). É a MESMA falha que deixou os 5 mapas novos sem ` +
        'nenhuma captura até 12/08. Conserto: ler `public/js/maps.js` como o gl-shots.mjs faz.');
    }
  }
  return { falhas, detalhe };
}

/* ===========================================================================
   EXECUÇÃO
   ========================================================================= */
const IDS_REAIS = Object.keys(MAPS);
const ALVOS = SO_MAPA ? IDS_REAIS.filter((i) => i === SO_MAPA) : IDS_REAIS;
if (SO_MAPA && !ALVOS.length) { console.error(`mapa desconhecido: ${SO_MAPA}`); process.exit(2); }

const TETOS = tetosDoCorrego();
const sup2 = areaSemTextura();
const jog = jogabilidade();
const cob = cobertura(IDS_REAIS);

const linhas = [];
for (const id of ALVOS) {
  try { linhas.push(medirMundo(id)); }
  catch (e) { linhas.push({ id, classe: classeDe(id), erro: String(e.message).slice(0, 300) }); }
}

/* MUTANTE que mexe no mundo tem que ter APLICADO em algum mapa. */
if (['grade-perfeita', 'teto-baixo', 'tudo-chapado'].includes(MUT)) {
  const tot = linhas.reduce((a, l) => a + (l.tocadosMut || 0), 0);
  if (!tot) { console.error(`✗ MUTANTE NAO APLICOU: ${MUT} não tocou em nada.`); process.exit(3); }
}

/* --------------------------- as cláusulas --------------------------- */
const vermelhos = [];   // {clausula, mapa, msg}
const declarados = [];
const quitados = [];

/* `--simular-novo=<id>` responde a pergunta que dá nome ao portão: SE ESTE MAPA
   CHEGASSE HOJE, ele entrava? A dívida declarada existe para mapa que já está no
   registro; mapa novo não herda desculpa nenhuma. Com a bandeira, as entradas de
   DIVIDA daquele mapa são ignoradas e ele responde como um recém-chegado.
   Medido em 12/08: `--simular-novo=campomorro` reprova em ORT1, ALT1, SUP1 e
   SUP2 — ou seja, o portão teria barrado na entrada o mapa que o dono reprovou. */
const SIMULAR_NOVO = arg('simular-novo');
if (SIMULAR_NOVO && !IDS_REAIS.includes(SIMULAR_NOVO)) {
  console.error(`--simular-novo: mapa desconhecido "${SIMULAR_NOVO}"`); process.exit(2);
}
const acusa = (clausula, chave, msg) => {
  const id = `${clausula}:${chave}`;
  if (Object.hasOwn(DIVIDA, id) && chave !== SIMULAR_NOVO) declarados.push({ id, msg });
  else vermelhos.push({ id, msg });
};
const quita = (clausula, chave) => {
  const id = `${clausula}:${chave}`;
  if (Object.hasOwn(DIVIDA, id)) quitados.push(id);
};

for (const L of linhas) {
  if (L.erro) {
    vermelhos.push({ id: `BUILD:${L.id}`, msg: `${L.id} não construiu: ${L.erro}. Mapa que não sobe não é medido — ` +
      'e não saber custa o mesmo que estar errado.' });
    continue;
  }
  // ORT1 — só onde a referência é orgânica
  if (L.classe === 'organico') {
    const ok = L.angulosDistintos >= ANG_DISTINTOS_MIN && L.fracGirada >= FRAC_GIRADA_MIN;
    if (!ok) {
      acusa('ORT1', L.id, `${L.id}: ${(100 * L.fracGirada).toFixed(1)}% de massa girada (piso ` +
        `${(100 * FRAC_GIRADA_MIN).toFixed(0)}%) e ${L.angulosDistintos} ângulos distintos (piso ${ANG_DISTINTOS_MIN}) ` +
        `em ${L.massas} massas. Autoconstrução não nasce de esquadro: o mapa lê como maquete. ` +
        'Conserto: girar casa/muro/laje em ângulos VARIADOS (não um ângulo só repetido — o piso de ' +
        'ângulos distintos existe justamente para isso).');
    } else quita('ORT1', L.id);
  }
  // ALT1
  if (L.h90 < ALT_P90_MIN) {
    acusa('ALT1', L.id, `${L.id}: h90 = ${L.h90.toFixed(1)} m (piso ${ALT_P90_MIN} m). Casa de favela é 3-4 lajes ` +
      '= 9-12 m; 90% da massa abaixo disso é vila de um pavimento. Conserto: empilhar laje, não espalhar caixa.');
  } else quita('ALT1', L.id);
  // SUP1
  if (L.fracMats > TETOS.MATS_CHAPADOS_MAX) {
    acusa('SUP1', L.id, `${L.id}: ${(100 * L.fracMats).toFixed(1)}% dos materiais sem \`map\` ` +
      `(${L.matsChapados}/${L.matsTotal}, teto ${(100 * TETOS.MATS_CHAPADOS_MAX).toFixed(0)}%). Cor chapada é a ` +
      'superfície que nenhuma régua de px/m alcança: o mapa lê como plástico. Conserto: textura nos materiais ' +
      'estruturais (chão, parede, laje) antes de qualquer coisa.');
  } else quita('SUP1', L.id);
  // SUP2
  if (sup2.erro) {
    vermelhos.push({ id: `SUP2:${L.id}`, msg: `SUP2 sem insumo: ${sup2.erro}` });
  } else if (sup2.por[L.id] == null) {
    vermelhos.push({ id: `SUP2:${L.id}`, msg: `SUP2: o texel-check não devolveu área para ${L.id}. ` +
      'Régua que não sabe medir fica vermelha, não calada.' });
  } else if (sup2.por[L.id] > TETOS.AREA_CHAPADA_MAX) {
    acusa('SUP2', L.id, `${L.id}: ${(100 * sup2.por[L.id]).toFixed(1)}% da área sem textura ` +
      `(teto ${(100 * TETOS.AREA_CHAPADA_MAX).toFixed(0)}%, medida importada do texel-check).`);
  } else quita('SUP2', L.id);
  // JOG1/JOG2
  if (jog.erro) {
    vermelhos.push({ id: `JOG:${L.id}`, msg: `JOG sem insumo: ${jog.erro}` });
  } else {
    const j = jog.por[L.id];
    if (!j) {
      vermelhos.push({ id: `JOG:${L.id}`, msg: `JOG: ${L.id} não aparece no map_check.json — ele foi gerado ` +
        'antes deste mapa existir. Rode `node tools/eval/map-check.mjs all`.' });
    } else {
      if (j.dentro > 0) {
        acusa('JOG1', L.id, `${L.id}: ${j.dentro} ponto(s) andável(is) com o corpo DENTRO de geometria visível ` +
          `(pior ${j.piorPenetracao} m). É o defeito que o dono relatou primeiro ("submersos embaixo da estátua"). ` +
          'Jogabilidade precede visual: BAR-CONSISTENCIA põe "sem bug perceptível" acima de beleza.');
      } else quita('JOG1', L.id);
      if (j.bordas > 0) {
        acusa('JOG2', L.id, `${L.id}: ${j.bordas} borda(s) de andar alto sem guarda (MAP6 do map-check) — ` +
          'o jogador cai sob a laje.');
      } else quita('JOG2', L.id);
    }
  }
}
// COB
for (const f of cob.falhas) {
  const m = f.match(/^COB2 ([^:]+):/);
  if (m) acusa('COB2', m[1], f); else vermelhos.push({ id: 'COB1', msg: f });
}
for (const nome of BATERIAS) if (!cob.falhas.some((f) => f.includes(nome))) quita('COB2', nome);

/* --------------------------- relatório --------------------------- */
const pct = (x) => `${(100 * x).toFixed(1)}%`;
console.log('\n  PORTÃO DE MAPA NOVO — ortogonalidade, altura, superfície, jogabilidade, cobertura');
console.log('  ' + '-'.repeat(104));
console.log('  ' + 'mapa'.padEnd(15) + 'classe'.padEnd(11) + 'massas'.padStart(7) + 'girada'.padStart(8) +
  'âng'.padStart(5) + 'h90'.padStart(7) + 'mats✗'.padStart(8) + 'área✗'.padStart(8) + 'dentro'.padStart(7) + 'bordas'.padStart(7));
for (const L of linhas) {
  if (L.erro) { console.log('  ' + L.id.padEnd(15) + 'ERRO ' + L.erro.slice(0, 70)); continue; }
  const j = jog.por?.[L.id];
  const a2 = sup2.por?.[L.id];
  console.log('  ' + L.id.padEnd(15) + L.classe.padEnd(11) +
    String(L.massas).padStart(7) + pct(L.fracGirada).padStart(8) + String(L.angulosDistintos).padStart(5) +
    (L.h90.toFixed(1) + ' m').padStart(7) + pct(L.fracMats).padStart(8) +
    (a2 == null ? '  ?'.padStart(8) : pct(a2).padStart(8)) +
    (j ? String(j.dentro).padStart(7) : '?'.padStart(7)) + (j ? String(j.bordas).padStart(7) : '?'.padStart(7)));
}
console.log('  ' + '-'.repeat(104));
console.log(`  pisos: ORT1 ≥ ${ANG_DISTINTOS_MIN} ângulos E ≥ ${pct(FRAC_GIRADA_MIN)} de massa girada (só classe orgânica) · ` +
  `ALT1 h90 ≥ ${ALT_P90_MIN} m`);
console.log(`  tetos: SUP1 ≤ ${pct(TETOS.MATS_CHAPADOS_MAX)} de materiais sem map · SUP2 ≤ ${pct(TETOS.AREA_CHAPADA_MAX)} de área sem textura ` +
  '(ambos lidos de corrego-superficie-check.mjs)');
console.log(`  cobertura: ${IDS_REAIS.length} ids no registro · gl-shots parseia ${cob.detalhe.parseGlShots?.length ?? '?'}`);

if (declarados.length) {
  console.log(`\n  DÍVIDA DECLARADA (${declarados.length}) — avisa, não reprova:`);
  for (const d of declarados) console.log(`   ~ ${d.id}  ${DIVIDA[d.id]}`);
}
if (quitados.length) {
  console.log(`\n  QUITADAS (${quitados.length}) — passaram a verde; REMOVA a entrada de DIVIDA:`);
  for (const q of quitados) console.log(`   ✓ ${q}`);
}
console.log('');
if (vermelhos.length) {
  for (const v of vermelhos) console.error(`  ✗ ${v.msg}`);
  console.error(`\n  ✗ PORTÃO DE MAPA NOVO: ${vermelhos.length} cláusula(s) vermelha(s) fora da dívida declarada` +
    `${MUT ? ` (mutante ${MUT} mordido)` : ''}.`);
  process.exitCode = 1;
} else if (MUT) {
  console.error(`  ✗ MUTANTE ${MUT} SOBREVIVEU: a régua ficou verde com o defeito plantado. Ela não mede o que diz medir.`);
  process.exitCode = 3;
} else {
  console.log(`  ✓ PORTÃO DE MAPA NOVO OK — ${declarados.length} dívida(s) declarada(s), nenhum vermelho novo.`);
}

if (JSON_OUT) {
  const out = typeof JSON_OUT === 'string' ? path.resolve(ROOT, JSON_OUT) : path.join(HERE, 'mapa_novo_gate.json');
  fs.writeFileSync(out, JSON.stringify({
    gerado: new Date().toISOString(), mutante: MUT || null,
    pisos: { ANG_DISTINTOS_MIN, FRAC_GIRADA_MIN, ALT_P90_MIN, FORA_DA_GRADE_GRAUS, ALT_MASSA_MIN },
    tetos: TETOS, classe: CLASSE,
    mapas: linhas.map((L) => ({ ...L, areaSemTextura: sup2.por?.[L.id] ?? null, jogabilidade: jog.por?.[L.id] ?? null })),
    cobertura: cob.detalhe,
    vermelhos: vermelhos.map((v) => v.id), declarados: declarados.map((d) => d.id), quitados,
  }, null, 1));
  console.log(`\n  → ${path.relative(ROOT, out)}`);
}
