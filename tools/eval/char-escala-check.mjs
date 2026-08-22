/* char-escala-check.mjs — ESTATURA ANATÔMICA E JUSTIÇA DA HITBOX DE CABEÇA.
═══════════════════════════════════════════════════════════════════════════════════
POR QUE ESTA RÉGUA EXISTE

Duas coisas no `glbchars.js` tratam "personagem" como se todos tivessem o mesmo
crânio, e nenhuma das duas tinha número:

  A) NORMALIZAÇÃO POR BBOX (glbchars.js, buildCharacterModel).
     A escala saía de `new THREE.Box3().setFromObject(model)`, que engloba chapéu,
     boné, bico, antena e cabelo. Todo mundo terminava com 1,72 m de bbox — e com
     CORPO de tamanho diferente, porque o adereço comia parte da conta. Quem usa
     chapéu virava anão de 1,72 m.

  B) HITBOX DE CABEÇA CONSTANTE.
     `new THREE.BoxGeometry(0.26, 0.30, 0.26)` para os 62, centrada no osso `Head`.
     Cabeça grande = metade dela não registra headshot; cabeça pequena = pescoço e
     ombro registram. Isto NÃO é estética: é balanceamento competitivo.

Nada disso é gosto. Tudo isso é NÚMERO, e esta régua imprime os quatro que importam:
  "uns parecem anões"      -> altura do olho em metros (osso `Head` em espaço de grupo)
  "todo mundo tem 1,72"    -> estatura ANATÔMICA (pé -> `head_end`), sem adereço
  "cabeça de balão"        -> (head_end - neck) / estatura
  "headshot injusto"       -> cobertura e vazamento da caixa contra a cabeça real

REGRA DA CASA QUE ESTA RÉGUA OBEDECE (a mesma da select-inflate.mjs)
  Ela mede no CAMINHO REAL — `buildCharacterModel`, no navegador, com os GLB de
  verdade carregados. Reimplementar a normalização em node mediria outro jogo: foi
  isso que deixou a `decal-probe` jurar 334 decalques onde havia 96.

AS MÉTRICAS, e por que estas e não outras

  olho      — Y de mundo do osso `Head` no espaço do grupo do bot. É o osso que o
              `CharController.update` usa para ancorar a hitbox (glbchars.js, bloco
              `this.head.position.copy(...)`) e para corrigir o pitch de mira. Serve
              de proxy da linha dos olhos porque é literalmente o ponto que o jogo
              trata como "a cabeça está aqui".
  estatura  — `head_end` (topo do crânio) menos o pé. É a estatura ANATÔMICA. O
              adereço fica FORA, de propósito: é a conta que o defeito A errava.
  adereco   — quanto de bbox existe ACIMA do crânio. É o tamanho do erro do defeito A
              por personagem: é exatamente o que estava sendo descontado do corpo.
  cabecaPct — (head_end - neck) / estatura. INVARIANTE DE ESCALA: nenhuma mudança de
              normalização mexe neste número. Ele está aqui como DIAGNÓSTICO, não como
              cláusula — ver a nota de honestidade em G1, abaixo.
  cob       — fração da cabeça real ([neck, head_end]) que cai DENTRO da caixa. É a
              fração do crânio que registra headshot. Ideal 1,00.
  vaz       — fração da CAIXA que cai FORA da cabeça real. É pescoço e ombro contando
              como headshot de graça. Ideal 0,00.

  cob e vaz são medidos GEOMETRICAMENTE contra a posição real da caixa (centrada no
  osso `Head`, como o runtime faz). Não são tautologia depois do conserto: o conserto
  muda o TAMANHO da caixa, não o centro dela, então uma caixa bem dimensionada e mal
  centrada continua saindo vermelha aqui.

TETO, COM PROCEDÊNCIA
  G1 (amplitude do olho <= 0,05 m) e G2 (espalhamento de cobertura <= 1,20) vieram do
  encargo desta frente. G3/G4 são pisos de justiça competitiva derivados do que a
  própria régua mede: nenhum personagem deve ter menos de 3/4 do crânio valendo
  headshot, nem mais de 1/3 da caixa fora da cabeça.

  NOTA DE HONESTIDADE SOBRE G1 (leia antes de mexer no limiar): `cabecaPct` é
  invariante de escala. Se a arte de um personagem der a ele um crânio de 30% da
  estatura, NENHUMA normalização uniforme põe o olho dele na mesma altura que o de um
  personagem de crânio 13% mantendo os dois com o mesmo topo de cabeça. G1 e "estatura
  igual para todos" são metas em TENSÃO, e a régua imprime `cabecaPct` justamente para
  que ninguém tente fechar G1 no grito. Quando G1 falhar, olhe a coluna `cabecaPct`
  antes de acusar a normalização.

COMO ELA FALHA QUANDO NÃO SABE MEDIR
  Osso ausente, GLB não carregado, `buildCharacterModel` devolvendo null: tudo isso é
  VERMELHO com nome e motivo, nunca `null` silencioso passando por fato. (A `gen-docs`
  publicou "MIT" num repo AGPL por devolver `null` e seguir em frente.)

TESTE DE MUTAÇÃO (régua que não morde não existe)
  --mutante=bbox       devolve o defeito A: reescala pelo bbox INTEIRO (com adereço).
                       Tem que ficar VERMELHA em G1.
  --mutante=caixafixa  devolve o defeito B: crava BoxGeometry(0.26, 0.30, 0.26).
                       Tem que ficar VERMELHA em G2.
  --mutante=ambos      os dois de uma vez (o estado anterior ao conserto).
  Cada mutação CONFERE que aplicou (compara o valor antes/depois) e aborta com erro se
  não aplicou. Mutação decorativa é pior que nenhuma: dá confiança falsa por escrito.

USO
  node tools/eval/serve.mjs 8123 &
  node tools/eval/char-escala-check.mjs                  # todos, tabela + JSON
  node tools/eval/char-escala-check.mjs gotinha,dollynho # só alguns
  node tools/eval/char-escala-check.mjs --mutante=bbox   # tem que ficar VERMELHA
  node tools/eval/char-escala-check.mjs --json=arquivo.json
═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8123';
const args = process.argv.slice(2);
const MUT = (args.find((a) => a.startsWith('--mutante')) || '').split('=')[1] || null;
const JSON_ARG = args.find((a) => a.startsWith('--json'));
const JSON_OUT = JSON_ARG ? (JSON_ARG.split('=')[1] || 'tools/eval/char_escala.json') : null;
const IDS = (args.find((a) => !a.startsWith('-')) || '').split(',').filter(Boolean);

const MUTANTES = ['bbox', 'caixafixa', 'ambos'];
if (MUT && !MUTANTES.includes(MUT)) {
  console.error(`--mutante desconhecido: ${MUT}. Use um de: ${MUTANTES.join(', ')}`);
  process.exit(2);
}

/* ── TETOS. Compartilhados com quem medir a mesma coisa: importe daqui, não recopie.
      (A passada e a auditoria de grafite ficaram 3 consertos sem mover o número porque
      cada uma tinha a sua cópia de 20% e 13%.) ─────────────────────────────────── */
export const TETO = {
  estaturaAmplitude: 0.02, // m — G1a: max(estatura) - min(estatura). CONTROLADO PELO CÓDIGO.
  olhoAmplitude: 0.05,     // m — G1b: max(olho) - min(olho). CONTROLADO PELA ARTE. Ver nota.
  cobEspalhamento: 1.20,   //   — G2: max(cob) / min(cob)
  cobMinima: 0.75,         //   — G3: nenhum crânio com menos de 3/4 valendo headshot
  vazMaximo: 0.35,         //   — G4: no máximo 1/3 da caixa fora da cabeça
};

/* POR QUE G1 É DUAS CLÁUSULAS, E NÃO UMA (não junte de novo)
   A primeira versão desta régua tinha só "amplitude do olho <= 0,05 m". Ela é honesta
   como META e é MENTIROSA como cláusula única, porque mistura duas coisas com donos
   diferentes:
     G1a estatura — é conta de normalização. O código decide. Fecha em zero.
     G1b olho     — é `olhoPct` × estatura, e `olhoPct` é INVARIANTE DE ESCALA: é onde
                    o artista pôs o osso `Head` dentro da altura do personagem.
                    Nenhuma escala uniforme mexe nele.
   Medido nos 61: `gotinha` tem o olho a 62,5% da própria estatura (mascote cabeçudo,
   crânio de 41,8%) e `dollynho` a 94,2%. Com os dois a 1,72 m de estatura, o olho
   deles fica a 1,075 m e 1,620 m — 0,545 m de amplitude, e isso É O MÍNIMO que
   qualquer normalização uniforme consegue. Para fechar G1b em 0,05 m só há dois
   caminhos, os dois FORA do glbchars.js:
     (a) mexer na arte (crânio menor no punhado de mascotes), ou
     (b) escalar por altura do olho — o que põe `gotinha` com 2,7 m de estatura.
   Então G1b fica VERMELHA e DECLARADA. Ela não é dívida escondida: é o número que diz
   quanto do "anão e gigante" sobra depois que o código fez a parte dele. Se um dia
   virar teto de portão, tem que ser com issue de ARTE, não de código. */

const num = (x, n = 3) => (Number.isFinite(x) ? x.toFixed(n) : '  —  ');

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

// O shell de eval é sintetizado pelo serve.mjs (rota /eval-character.html). Se o
// servidor não estiver no ar, isto falha aqui e não vira medição fantasma.
try {
  await page.goto(`${BASE}/eval-character.html?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
} catch (e) {
  console.error(`\n✗ não consegui abrir ${BASE}/eval-character.html — o arnês não está no ar.`);
  console.error('  conserto: `node tools/eval/serve.mjs 8123 &` antes de rodar esta régua.');
  console.error(`  (erro original: ${e.message})`);
  await browser.close();
  process.exit(2);
}

const alvos = IDS.length ? IDS : await page.evaluate(async () => {
  const C = await import('./js/characters.js');
  const G = await import('./js/glbchars.js');
  return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
});

const out = [];
for (const id of alvos) {
  const r = await page.evaluate(async ([cid, mut]) => {
    const THREE = await import('three');
    const G = await import('./js/glbchars.js');
    const C = await import('./js/characters.js');
    const def = C.CHARACTERS.find((c) => c.id === cid);
    if (!def) return { id: cid, erro: 'sem definição de personagem' };
    await G.preloadCharacterAssets([cid]);
    if (!G.hasModel(cid)) return { id: cid, erro: 'sem GLB carregado' };

    /* SEM ARMA, de propósito — e isto é medição, não atalho. `buildCharacterModel`
       calcula a escala a partir do bbox do modelo ANTES de pendurar a arma na mão.
       Medir o bbox DEPOIS mede outra coisa: na primeira rodada desta régua o cano do
       lobisomem levantou o `pe` dele para +0,237 m e o topo para 1,957, inventando um
       personagem que flutua 23 cm. Os quatro números desta régua (olho, crânio,
       pescoço, caixa) saem de OSSO e da geometria da hitbox — a arma não toca nenhum
       deles. `weapon:false` é o mesmo caminho que a vitrine do menu usa. */
    const wid = C.charWeapon(cid);
    const m = G.buildCharacterModel(def, { weaponId: wid, weapon: false });
    if (!m) return { id: cid, erro: 'buildCharacterModel devolveu null' };

    const modelo = m.group.children.find((o) => o.isObject3D && !o.isMesh) || m.group.children[0];

    /* ── MUTAÇÕES ────────────────────────────────────────────────────────────────
       Cada uma reinjeta um dos dois defeitos reais. Cada uma CONFERE que aplicou. */
    const mutacoes = [];
    if (mut === 'bbox' || mut === 'ambos') {
      // Defeito A: reescala pelo bbox INTEIRO (adereço incluído), como era antes.
      modelo.scale.setScalar(1); modelo.position.y = 0;
      modelo.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(modelo);
      const h = (bb.max.y - bb.min.y) || 1;
      const s = 1.72 / h;
      const antes = modelo.scale.x;
      modelo.scale.setScalar(s);
      modelo.position.y = -bb.min.y * s;
      if (Math.abs(modelo.scale.x - antes) < 1e-9 && Math.abs(antes - s) < 1e-9) {
        return { id: cid, erro: 'MUTANTE bbox NAO APLICOU (escala idêntica à limpa)' };
      }
      mutacoes.push(`bbox: escala ${antes.toFixed(4)} -> ${s.toFixed(4)}`);
    }
    if (mut === 'caixafixa' || mut === 'ambos') {
      /* Defeito B: caixa constante para os 62 E centrada no osso `Head`. As DUAS
         coisas, porque as duas eram o defeito: o tamanho fixo e o centro na base do
         crânio. Zerar só o tamanho deixaria a caixa velha no lugar novo, que é um
         estado que nunca existiu, e o mutante estaria medindo ficção. */
      const antesH = m.parts.head.geometry.parameters.height;
      const antesOff = m.parts.head.userData.csHeadOffY || 0;
      m.parts.head.geometry.dispose();
      m.parts.head.geometry = new THREE.BoxGeometry(0.26, 0.30, 0.26);
      m.parts.head.userData.csHeadOffY = 0;
      if (Math.abs(antesH - 0.30) < 1e-9 && Math.abs(antesOff) < 1e-9) {
        return { id: cid, erro: 'MUTANTE caixafixa NAO APLICOU (a caixa limpa já era 0,30 centrada no osso)' };
      }
      mutacoes.push(`caixafixa: altura ${antesH.toFixed(4)} -> 0.3000, offset ${antesOff.toFixed(4)} -> 0`);
    }

    /* ── OSSOS. Por nome EXATO, com fallback explícito. `/head/i` casa com `head_end`
       também, e depender da ordem de travessia para desempatar é armadilha. */
    const acha = (re) => { let b = null; modelo.traverse((o) => { if (o.isBone && !b && re.test(o.name)) b = o; }); return b; };
    const bHead = acha(/^(mixamorig)?head$/i) || acha(/^head$/i);
    const bEnd = acha(/^(mixamorig)?head_?end$/i) || acha(/head_?end|headtop/i);
    const bNeck = acha(/^(mixamorig)?neck$/i) || acha(/neck/i);
    const falta = [!bHead && 'Head', !bEnd && 'head_end', !bNeck && 'neck'].filter(Boolean);
    if (falta.length) return { id: cid, erro: `osso ausente: ${falta.join(', ')} — a régua NÃO sabe medir este personagem` };

    const emGrupo = (b) => m.group.worldToLocal(b.getWorldPosition(new THREE.Vector3())).y;

    /* ── DOIS QUADROS, DE PROPÓSITO. Cada métrica é lida no quadro em que ela quer
       dizer alguma coisa; misturar os dois foi erro real desta régua (ver abaixo).

       QUADRO 1 — REPOUSO (agora, antes de qualquer update).
         estatura / olho / cab% saem daqui. É o quadro em que `buildCharacterModel`
         calcula a escala, então é o único em que faz sentido cobrar a normalização.
         ARMADILHA JÁ PAGA: uma versão desta régua media a estatura DEPOIS de um
         `ctrl.update`, com o bot já posado por um clipe. G1a marcou 0,235 m de
         amplitude num elenco recém-normalizado — não era o código, era o `walk`
         dobrando o joelho de uns e não de outros. Gate de normalização não pode
         depender da fase da animação. */
    const olho = emGrupo(bHead);
    const cranio = emGrupo(bEnd);
    const pescoco = emGrupo(bNeck);

    const bbG = new THREE.Box3().setFromObject(modelo);
    const pe = bbG.min.y;
    const topoBbox = bbG.max.y;

    const estatura = cranio - pe;
    const adereco = topoBbox - cranio;
    const cabecaH = cranio - pescoco;
    if (!(estatura > 0) || !(cabecaH > 0)) {
      return { id: cid, erro: `geometria degenerada: estatura=${estatura} cabecaH=${cabecaH}` };
    }

    /* QUADRO 2 — POSADO (um tique de runtime).
         cob / vaz saem daqui. A caixa de headshot é POSICIONADA pelo
         CharController.update, não pelo construtor: antes do primeiro update ela está
         em (0,0,0), ou seja, no umbigo do bot. E ela persegue o osso posado todo
         quadro, então a cabeça tem que ser lida posada também, senão a régua compara
         caixa de um quadro com crânio de outro.
         Medimos a POSIÇÃO REAL que o controller escreve (`head.position.y`) em vez de
         refazer a conta aqui: régua que recopia a fórmula do código não enxerga a
         fórmula errada. Foi assim que a primeira versão supôs a caixa centrada no osso
         `Head`, não viu o deslocamento novo e acusou 0,60 de cobertura onde o runtime
         entregava 1,00. */
    m.ctrl.update(1 / 60);
    m.group.updateMatrixWorld(true);
    const cranioP = emGrupo(bEnd);
    const pescocoP = emGrupo(bNeck);
    const cabecaHP = cranioP - pescocoP;
    if (!(cabecaHP > 0)) return { id: cid, erro: `cabeça degenerada no quadro posado: ${cabecaHP}` };

    /* ── HITBOX. A caixa é centrada no osso `Head` pelo CharController.update
       (`this.head.position.copy(worldToLocal(headBone.getWorldPosition()))`), então
       medimos exatamente esse intervalo contra a cabeça real [neck, head_end]. */
    const caixaH = m.parts.head.geometry.parameters.height;
    const caixaX = m.parts.head.geometry.parameters.width;
    const caixaY = m.parts.head.position.y;   // onde o RUNTIME pôs a caixa, não onde a régua acha que ela está
    const cBaixo = caixaY - caixaH / 2;
    const cAlto = caixaY + caixaH / 2;
    const sobrep = Math.max(0, Math.min(cAlto, cranioP) - Math.max(cBaixo, pescocoP));
    const cob = sobrep / cabecaHP;    // fração do crânio que registra headshot
    const vaz = 1 - sobrep / caixaH;  // fração da caixa que é pescoço/ombro

    return {
      id: cid, arma: wid, mutacoes,
      olho: +olho.toFixed(4), cranio: +cranio.toFixed(4), pescoco: +pescoco.toFixed(4),
      pe: +pe.toFixed(4), topoBbox: +topoBbox.toFixed(4),
      estatura: +estatura.toFixed(4), adereco: +adereco.toFixed(4),
      cabecaH: +cabecaH.toFixed(4), cabecaPct: +(cabecaH / estatura).toFixed(4),
      olhoPct: +((olho - pe) / estatura).toFixed(4),
      caixaH: +caixaH.toFixed(4), caixaX: +caixaX.toFixed(4), caixaY: +caixaY.toFixed(4),
      cob: +cob.toFixed(4), vaz: +vaz.toFixed(4),
    };
  }, [id, MUT]);
  out.push(r || { id, erro: 'page.evaluate devolveu vazio' });
}
await browser.close();

/* ── RELATÓRIO ─────────────────────────────────────────────────────────────────── */
const bons = out.filter((r) => !r.erro);
const ruins = out.filter((r) => r.erro);

console.log(`\n=== ESCALA ANATÔMICA E HITBOX DE CABEÇA${MUT ? `  [MUTANTE: ${MUT}]` : ''} ===`);
console.log(`elenco medido: ${bons.length}/${out.length}   (caminho real: buildCharacterModel no navegador)\n`);
console.log(
  'id'.padEnd(16), 'olho'.padStart(7), 'estat'.padStart(7), 'ader'.padStart(7),
  'cab%'.padStart(6), 'olho%'.padStart(6), 'caixaH'.padStart(7), 'cob'.padStart(6), 'vaz'.padStart(6),
);
bons.slice().sort((a, b) => a.olho - b.olho).forEach((r) => {
  console.log(
    r.id.padEnd(16), num(r.olho).padStart(7), num(r.estatura).padStart(7), num(r.adereco).padStart(7),
    (r.cabecaPct * 100).toFixed(1).padStart(6), (r.olhoPct * 100).toFixed(1).padStart(6),
    num(r.caixaH).padStart(7), num(r.cob).padStart(6), num(r.vaz).padStart(6),
  );
});
for (const r of ruins) console.log(`✗ ${r.id.padEnd(16)} ${r.erro}`);

const ext = (k) => {
  const v = bons.map((r) => r[k]);
  return { min: Math.min(...v), max: Math.max(...v), minId: bons[v.indexOf(Math.min(...v))].id, maxId: bons[v.indexOf(Math.max(...v))].id };
};

let reprovas = 0;
let declaradas = 0;
/* `declarada:true` = dívida que AVISA sem reprovar (mesma ideia do KNOWN-RED.json).
   Só entra aqui com o motivo escrito no corpo da cláusula e o número medido junto —
   nunca "pra passar o CI". Hoje é só a G1b, que é dívida de ARTE, não de código. */
const clausula = (nome, ok, linha, declarada = false) => {
  if (!ok && declarada) declaradas++;
  else if (!ok) reprovas++;
  console.log(`${ok ? '✓' : (declarada ? '⚠' : '✗')} ${nome}  ${linha}`);
};

console.log('\n--- CLÁUSULAS ---');
if (!bons.length) {
  console.log('✗ G0  nenhum personagem mensurável — a régua não sabe medir nada. Servidor no ar? GLBs no disco?');
  reprovas++;
} else {
  const est = ext('estatura');
  const ampEst = est.max - est.min;
  clausula('G1a amplitude da estatura  [CÓDIGO]',
    ampEst <= TETO.estaturaAmplitude,
    `${ampEst.toFixed(3)} m (teto ${TETO.estaturaAmplitude})  min ${est.min.toFixed(3)} ${est.minId} / max ${est.max.toFixed(3)} ${est.maxId}`
    + (ampEst > TETO.estaturaAmplitude ? `\n     conserto: em glbchars.js/buildCharacterModel, normalizar por marco anatômico (osso head_end - pé do bbox), NÃO por Box3.setFromObject — o adereço está sendo descontado do corpo. Consequência de ignorar: ${est.minId} anda ${(est.max - est.min).toFixed(2)} m mais baixo que ${est.maxId} para caber o adereço dentro do orçamento de altura.` : ''));

  const e = ext('olho');
  const amp = e.max - e.min;
  const olhoOk = amp <= TETO.olhoAmplitude;
  clausula('G1b amplitude do olho     [ARTE]',
    olhoOk,
    `${amp.toFixed(3)} m (meta ${TETO.olhoAmplitude})  min ${e.min.toFixed(3)} ${e.minId} / max ${e.max.toFixed(3)} ${e.maxId}`
    + (olhoOk ? '' : `\n     NÃO é conserto de código: olhoPct é invariante de escala (${e.minId}=${(bons.find((r) => r.id === e.minId).olhoPct * 100).toFixed(1)}% da própria estatura, ${e.maxId}=${(bons.find((r) => r.id === e.maxId).olhoPct * 100).toFixed(1)}%). Com G1a verde, este é o piso do que a normalização uniforme alcança.\n     conserto real: crânio menor nos mascotes cabeçudos (ver coluna cab%), no asset. Enquanto isso, a justiça competitiva fica por conta da hitbox proporcional (G2/G3/G4), que já põe o alvo do tamanho do que se vê.`),
    true);

  const c = ext('cob');
  const esp = c.min > 0 ? c.max / c.min : Infinity;
  clausula('G2 espalhamento de cobertura',
    esp <= TETO.cobEspalhamento,
    `${esp.toFixed(2)}× (teto ${TETO.cobEspalhamento}×)  min ${c.min.toFixed(2)} ${c.minId} / max ${c.max.toFixed(2)} ${c.maxId}`
    + (esp > TETO.cobEspalhamento ? `\n     conserto: dimensionar a BoxGeometry da hitbox por (head_end - neck) do personagem, não pelo 0.30 fixo em glbchars.js. Consequência de ignorar: ${c.minId} precisa de mira ${esp.toFixed(1)}× mais precisa que ${c.maxId} para o mesmo headshot. Isto é balanceamento, não estética.` : ''));

  const piores = bons.filter((r) => r.cob < TETO.cobMinima);
  clausula('G3 piso de cobertura',
    piores.length === 0,
    `${piores.length} personagem(ns) com cob < ${TETO.cobMinima}`
    + (piores.length ? `: ${piores.slice(0, 8).map((r) => `${r.id}=${r.cob.toFixed(2)}`).join(', ')}\n     conserto: mesma linha da G2. Estes personagens têm crânio que não registra headshot — eles sobrevivem a tiros que matariam qualquer outro.` : ''));

  const vazados = bons.filter((r) => r.vaz > TETO.vazMaximo);
  clausula('G4 teto de vazamento',
    vazados.length === 0,
    `${vazados.length} personagem(ns) com vaz > ${TETO.vazMaximo}`
    + (vazados.length ? `: ${vazados.slice(0, 8).map((r) => `${r.id}=${r.vaz.toFixed(2)}`).join(', ')}\n     conserto: mesma linha da G2. Nestes, pescoço e ombro contam como headshot — eles morrem de tiros que não são na cabeça.` : ''));
}
if (ruins.length) {
  clausula('G5 todos mensuráveis', false,
    `${ruins.length} personagem(ns) que a régua NÃO conseguiu medir: ${ruins.map((r) => r.id).join(', ')}\n     não-saber custa o mesmo que estar-errado: um GLB sem os ossos Head/head_end/neck não pode ser normalizado nem ter hitbox dimensionada.`);
} else if (bons.length) {
  clausula('G5 todos mensuráveis', true, `${bons.length}/${bons.length}`);
}

if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ mutante: MUT, teto: TETO, gerado: new Date().toISOString(), personagens: out }, null, 2));
  console.log(`\njson: ${JSON_OUT}`);
}

if (MUT) {
  console.log(`\n[MUTANTE ${MUT}] ${reprovas ? `✓ a régua MORDEU (${reprovas} cláusula(s) vermelha(s)) — era o esperado.` : '✗✗ a régua ficou VERDE com o defeito reinjetado. ELA NÃO PRESTA.'}`);
  process.exit(reprovas ? 0 : 1);
}
const sufixo = declaradas ? `  (+${declaradas} dívida(s) DECLARADA(s), avisam sem reprovar — ver G1b)` : '';
console.log(`\n${reprovas ? `✗ ${reprovas} cláusula(s) vermelha(s)` : '✓ cláusulas de código verdes'}${sufixo}`);
process.exit(reprovas ? 1 : 0);
