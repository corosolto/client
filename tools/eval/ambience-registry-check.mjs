/* ambience-registry-check.mjs — TODO MAPA DO REGISTRO TEM VIDA, não só o lajes.
 *
 * POR QUE EXISTE — pedido do dono, 17/08 (BUG-57), com estas palavras:
 *   "ele [lajes] tem ambiencia real coisa que nenhum dos outros mapas tem,
 *    horizonte, animais, animacoes no ceu, precismoa disso em todos os mapas"
 * A régua irmã (`eval:ambience`, browser) mede QUALIDADE da fauna em 3 mapas com
 * lista literal — o mesmo furo do gl-shots que deixou 5 mapas sem captura. Esta
 * varre o REGISTRO em node puro: mapa novo entra na cobrança sozinho.
 *
 * O QUE MEDE
 *  AR1  todo mapa do registro devolve `ambience` com animais instanciados
 *  AR2  população mínima por bioma: aberto ≥ 2 espécies (rato E pombo);
 *       interno (INTERNOS) ≥ 2 ratos — pombo dentro de prédio fechado é ruído
 *  AR3  nenhum animal nasce DENTRO de colisor (fauna dentro de parede é a
 *       classe LC5 do lajes-circuito, agora para bicho)
 *  AR4  espécies-chave por bioma (v2.1, BUG-57): favela tem gato, campo tem
 *       galinha E vaca, córrego tem galinha de quintal — a fauna nova do
 *       acervo Quaternius CC0 não pode existir só num mapa
 *  AR5  NENHUM pombo em modo flight no registro inteiro (dono, 18/08: "a pomba
 *       que nao esta com bracos avertos deveria ficar so na ponta das lajes ou
 *       no chao") — pombo voando com GLB estático de asas abertas é o defeito
 *  CV1  VIDA DE CÉU nos mapas que a declaram (r2, dono: "aviao voando, com
 *       propaganda no banner + animais como araras, passarinhos voando nao
 *       presente"): o mapa tem >= 1 avião, >= 2 araras e >= 5 passarinhos, todos
 *       ACIMA da cabeça (y >= CEU_Y_MIN) e FORA dos bounds jogáveis no caso do avião
 *  CV2  ELES VOAM DE VERDADE: cada um MUDA DE LUGAR em 0,8 s de simulação e
 *       percorre um CIRCUITO (volta perto de onde saiu depois de um período) —
 *       é a mesma pergunta da B8b do mansao-beach, que nasceu do defeito da AR5
 *       (bicho estático de asas abertas pendurado no céu)
 *  CV3  BANKING PARA DENTRO DA CURVA: o "cima" do voador aponta para o lado do
 *       CENTRO do círculo. Avião deitando para FORA é o defeito que um sinal
 *       trocado produz, e sem esta cláusula ele passa despercebido
 *  AR6  TODO mapa devolve `sound` (vida 1, plans/22, dono 19/08: "cena comuns
 *       do dia-dia animais urbanos ... com audio inclusive"). Forma mínima:
 *       { loops: [{ src, pos:[x,y,z], radius, vol }] } e/ou { bioma: '...' } —
 *       o hook existe por mapa; arquivo faltando é dívida do audio-pack, não
 *       da régua (o soundscape cai em silêncio com warn, como a fauna sem GLB)
 *
 * USO
 *   node tools/eval/ambience-registry-check.mjs
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-ambience     # AR1/AR2
 *   node tools/eval/ambience-registry-check.mjs --mutante=fauna-em-solido  # AR3
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-gato         # AR4
 *   node tools/eval/ambience-registry-check.mjs --mutante=pomba-voa-de-novo # AR5
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-som          # AR6
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-fauna2       # AR4 (tatu/barata/papagaio)
 *   node tools/eval/ambience-registry-check.mjs --mutante=ceu-vazio        # CV1
 *   node tools/eval/ambience-registry-check.mjs --mutante=aviao-pendurado  # CV2
 *   node tools/eval/ambience-registry-check.mjs --mutante=banking-invertido # CV3
 *
 * Horizonte/vida de céu por mapa era a parte 2 do BUG-57, adiada aqui à espera da
 * primeira referência aprovada pelo dono. A r2 da mansão do Joá é ela, e as
 * cláusulas CV1-CV3 acima são a cobrança. Mapa que declarar `ceuVivo` no build
 * entra na conta sozinho — lista literal foi o furo do gl-shots.
 */
import { THREE, MAPS, initTextures } from './harness.mjs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['sem-ambience', 'fauna-em-solido', 'sem-gato', 'pomba-voa-de-novo', 'sem-som', 'sem-fauna2',
  'ceu-vazio', 'aviao-pendurado', 'banking-invertido']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

/* Mapa 100% interno (sem céu): pombo não entra; rato sim — UPA com rato é a sátira. */
const INTERNOS = new Set(['upa_24h']);

/* Espécie-chave por bioma (v2.1, frente D): gato de telhado na favela, galinha de
   quintal/campinho, vaca na várzea. Mapa novo desse bioma herda a cobrança. */
const BIOMA_FAUNA = {
  lajes: ['cat'], quebrada: ['cat'], corrego: ['cat', 'chicken', 'cockroach'],
  campomorro: ['chicken', 'cow', 'armadillo'],
  /* fauna 2 (vida 1, plans/22): tatu no cerrado (campo/Brasília), barata urbana
     (córrego/atacadão), papagaio de poleiro (mansão/parque) */
  praca_poderes: ['armadillo'], atacadao_treta: ['cockroach'],
  mansao: ['parrot'], parque_treta: ['parrot'],
};
const FAUNA2 = new Set(['armadillo', 'cockroach', 'parrot']);

/* VIDA DE CÉU (r2). População mínima com a fala do dono ao lado de cada número:
   "aviao voando" = 1, "araras" (plural) = 2, "passarinhos" em bando = 5.
   CEU_Y_MIN 8 m: o pé-direito duplo da mansão é 4,5 e o muro 2,5 — abaixo de 8 o
   bicho não está no CÉU, está na altura da cabeça. CIRCUITO_TOL 0,22 do raio:
   depois de um período o voador tem de voltar para perto de onde saiu, senão a rota
   é uma reta que some no infinito. */
const CEU_MINIMO = Object.freeze({ plane: 1, macaw: 2, songbird: 5 });
const CEU_TIPOS = Object.freeze(Object.keys(CEU_MINIMO));
const CEU_Y_MIN = 8;
const CEU_ANDOU_MIN = 0.5;   // m em 0,8 s — mesmo limiar da cláusula B8b do mansao-beach
const CIRCUITO_TOL = 0.22;

const T = await initTextures();
const ids = Object.keys(MAPS);
const linhas = [];
let mutanteAplicou = ['pomba-voa-de-novo', 'sem-som', 'sem-fauna2'].includes(MUTANTE) ? false : null;
for (const id of ids) {
  const scene = new THREE.Scene();
  let W;
  try { W = MAPS[id].build(scene, T); } catch (e) { linhas.push({ id, erro: String(e?.message || e) }); continue; }
  /* AR6: hook de áudio ambiente (vida 1). Válido = loop posicional bem formado
     e/ou bioma declarado (a pool de one-shots mora no soundscape.js). */
  let sound = W.sound;
  if (MUTANTE === 'sem-som' && !mutanteAplicou && sound) { sound = null; mutanteAplicou = true; }
  const loopRuim = (sound?.loops || []).find((l) => typeof l?.src !== 'string'
    || !Array.isArray(l?.pos) || l.pos.length !== 3 || typeof l?.radius !== 'number' || l.radius <= 0);
  const somOk = !!sound && ((sound.loops?.length > 0 && !loopRuim) || typeof sound.bioma === 'string');
  let amb = W.ambience;
  if (MUTANTE === 'sem-ambience' && id === ids[0]) amb = null;
  if (!amb || !Array.isArray(amb.animals)) { linhas.push({ id, animals: null, somOk }); continue; }
  if (MUTANTE === 'sem-gato') {
    const antes = amb.animals.length;
    amb.animals = amb.animals.filter((a) => a.type !== 'cat');
    if (amb.animals.length < antes) mutanteAplicou = true;
  }
  if (MUTANTE === 'sem-fauna2') {
    const antes = amb.animals.length;
    amb.animals = amb.animals.filter((a) => !FAUNA2.has(a.type));
    if (amb.animals.length < antes) mutanteAplicou = true;
  }
  if (MUTANTE === 'pomba-voa-de-novo' && !mutanteAplicou) {
    const pombo = amb.animals.find((a) => a.type === 'pigeon');
    if (pombo) { pombo.mode = 'flight'; mutanteAplicou = true; }
  }
  const por = {};
  for (const a of amb.animals) por[a.type] = (por[a.type] || 0) + 1;
  const voando = amb.animals.filter((a) => a.mode === 'flight').length;
  /* AR3: posição inicial dentro de colisor. Amostra o ponto do animal contra os AABBs;
     margem de 5 cm para encosto legítimo em parede. */
  const emSolido = [];
  for (const a of amb.animals) {
    const p = a.root?.position; if (!p) continue;
    const px = p.x, py = (p.y ?? 0) + 0.12, pz = p.z;
    for (const c of (W.colliders || [])) {
      if (typeof c.minX !== 'number') continue;
      if (px > c.minX + 0.05 && px < c.maxX - 0.05 && pz > c.minZ + 0.05 && pz < c.maxZ - 0.05
        && py > c.minY && py < c.maxY) { emSolido.push({ type: a.type, x: +px.toFixed(1), z: +pz.toFixed(1) }); break; }
    }
  }
  if (MUTANTE === 'fauna-em-solido' && emSolido.length === 0 && amb.animals.length && (W.colliders || []).length) {
    const c = W.colliders.find((k) => typeof k.minX === 'number' && k.maxY - k.minY > 0.5);
    if (c) emSolido.push({ type: 'mutante', x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2 });
  }
  /* ---------------- CV1/CV2/CV3 — VIDA DE CÉU ----------------
     Só mapa que TEM voador entra na conta; os outros ficam de fora sem virar falha
     (a cobrança por bioma é da AR4, não desta). */
  const voadores = amb.animals.filter((a) => CEU_TIPOS.includes(a.type));
  let ceu = null;
  if (voadores.length) {
    if (MUTANTE === 'ceu-vazio' && !mutanteAplicou) {
      amb.animals = amb.animals.filter((a) => !CEU_TIPOS.includes(a.type));
      mutanteAplicou = true;
    } else {
      if (MUTANTE === 'aviao-pendurado' && !mutanteAplicou) {
        // volta ao defeito da AR5: bicho de asa aberta pendurado, parado no céu
        amb._updateCircuito = function () {};
        mutanteAplicou = true;
      }
      if (MUTANTE === 'banking-invertido' && !mutanteAplicou) {
        const passo = amb._updateCircuito.bind(amb);
        amb._updateCircuito = function (a) { passo(a); a.root.rotation.z = -a.root.rotation.z; };
        mutanteAplicou = true;
      }
      amb.reset();
      const antes = voadores.map((a) => a.root.position.clone());
      for (let i = 0; i < 48; i++) amb.update(1 / 60);            // 0,8 s
      const andou = voadores.filter((a, i) => a.root.position.distanceTo(antes[i]) > CEU_ANDOU_MIN).length;
      /* CV3 lido AQUI, com o voador no meio de uma curva: "cima" do objeto contra a
         direção do centro do círculo, os dois no plano horizontal. */
      const cima = new THREE.Vector3();
      const paraDentro = voadores.filter((a) => {
        cima.set(0, 1, 0).applyQuaternion(a.root.quaternion);
        const dx = a.rota.centro[0] - a.root.position.x, dz = a.rota.centro[1] - a.root.position.z;
        const n = Math.hypot(dx, dz) || 1;
        return (cima.x * dx + cima.z * dz) / n > 0.02;
      }).length;
      /* CV2 (circuito): o período de CADA UM tem de trazer ELE de volta para perto da
         partida. Medir todos no período do mais lento reprovaria o bando rápido por
         estar no meio da volta seguinte — erro de sonda, não defeito de rota. */
      const emCurso = voadores.map((a) => a.root.position.clone());
      const alvo = voadores.map((a) => Math.round(a.rota.periodo * 60));
      const voltou = voadores.map(() => false);
      for (let i = 1; i <= Math.max(...alvo); i++) {
        amb.update(1 / 60);
        voadores.forEach((a, k) => {
          if (alvo[k] !== i) return;
          voltou[k] = a.root.position.distanceTo(emCurso[k]) < a.rota.raio * CIRCUITO_TOL;
        });
      }
      const fechou = voltou.filter(Boolean).length;
      const baixos = voadores.filter((a) => a.root.position.y < CEU_Y_MIN).length;
      const B = W.bounds;
      const aviaoDentro = B ? voadores.filter((a) => a.type === 'plane'
        && a.root.position.x > B.minX && a.root.position.x < B.maxX
        && a.root.position.z > B.minZ && a.root.position.z < B.maxZ).length : 0;
      const porTipo = {};
      for (const a of voadores) porTipo[a.type] = (porTipo[a.type] || 0) + 1;
      const faltam = CEU_TIPOS.filter((t) => (porTipo[t] || 0) < CEU_MINIMO[t]);
      ceu = { n: voadores.length, porTipo, faltam, baixos, aviaoDentro, andou, fechou, paraDentro };
    }
  }
  linhas.push({ id, animals: amb.animals.length, por, emSolido, voando, somOk, ceu });
}

const ar1 = linhas.filter((r) => r.erro || r.animals === null || r.animals === 0);
const ar2 = linhas.filter((r) => {
  if (r.erro || !r.por) return false;
  const rato = r.por.rat || 0, pombo = r.por.pigeon || 0;
  return INTERNOS.has(r.id) ? rato < 2 : (rato < 1 || pombo < 1);
});
const ar3 = linhas.filter((r) => r.emSolido && r.emSolido.length);
const ar4 = linhas.filter((r) => !r.erro && (BIOMA_FAUNA[r.id] || []).some((especie) => !(r.por?.[especie] > 0)));
const ar5 = linhas.filter((r) => !r.erro && r.voando > 0);
const ar6 = linhas.filter((r) => !r.erro && !r.somOk);
const comCeu = linhas.filter((r) => r.ceu);
const cv1 = comCeu.filter((r) => r.ceu.faltam.length || r.ceu.baixos || r.ceu.aviaoDentro);
const cv2 = comCeu.filter((r) => r.ceu.andou < r.ceu.n || r.ceu.fechou < r.ceu.n);
const cv3 = comCeu.filter((r) => r.ceu.paraDentro < r.ceu.n);
/* Mapa que TINHA vida de céu e ficou sem ela é falha de CV1, não silêncio: senão o
   mutante ceu-vazio passaria só por remover os voadores da lista. */
const CEU_ESPERADO = new Set(['mansao']);
const cvSumiu = linhas.filter((r) => !r.erro && CEU_ESPERADO.has(r.id) && !r.ceu);

console.log(`AMBIÊNCIA NO REGISTRO — ${ids.length} mapas${MUTANTE ? `  [mutante: ${MUTANTE}]` : ''}\n`);
for (const r of linhas) {
  if (r.erro) { console.log(`  x ${r.id.padEnd(17)} build lançou: ${r.erro}`); continue; }
  if (r.animals === null || r.animals === 0) { console.log(`  x ${r.id.padEnd(17)} SEM ambiência`); continue; }
  const pop = Object.entries(r.por).map(([k, v]) => `${k}:${v}`).join(' ');
  const solido = r.emSolido.length ? `  <- ${r.emSolido.length} EM SÓLIDO ${JSON.stringify(r.emSolido[0])}` : '';
  const voo = r.voando ? `  <- ${r.voando} EM VOO` : '';
  const mudo = r.somOk ? '' : '  <- MUDO';
  console.log(`  ${r.emSolido.length || r.voando || !r.somOk ? 'x' : 'ok'} ${r.id.padEnd(17)} ${String(r.animals).padStart(2)} animais  ${pop}${solido}${voo}${mudo}`);
}
const f4 = ar4.map((r) => `${r.id}(faltam ${BIOMA_FAUNA[r.id].filter((e) => !(r.por?.[e] > 0)).join('+')})`).join(', ');
const f5 = ar5.map((r) => `${r.id}:${r.voando}`).join(', ');
console.log(`\n  AR1 todo mapa tem ambiência       ${ar1.length ? `FALHA — ${ar1.map((r) => r.id).join(', ')}` : 'PASSA'}`);
console.log(`  AR2 população mínima por bioma    ${ar2.length ? `FALHA — ${ar2.map((r) => r.id).join(', ')}` : 'PASSA'}`);
console.log(`  AR3 fauna fora de sólido          ${ar3.length ? `FALHA — ${ar3.map((r) => r.id).join(', ')}` : 'PASSA'}`);
console.log(`  AR4 espécie-chave por bioma       ${ar4.length ? `FALHA — ${f4}` : 'PASSA'}`);
console.log(`  AR5 nenhuma pomba em voo          ${ar5.length ? `FALHA — ${f5} (mode flight sobreviveu; BUG-57 v2.1)` : 'PASSA'}`);
console.log(`  AR6 todo mapa tem som ambiente    ${ar6.length ? `FALHA — ${ar6.map((r) => r.id).join(', ')}` : 'PASSA'}`);
for (const r of comCeu) {
  const c = r.ceu;
  console.log(`\n  vida de céu em ${r.id}: ${Object.entries(c.porTipo).map(([k, v]) => `${k}:${v}`).join(' ')}`
    + `  ·  ${c.andou}/${c.n} andaram em 0,8 s  ·  ${c.fechou}/${c.n} fecharam o circuito  ·  ${c.paraDentro}/${c.n} inclinam para dentro`);
}
const f1 = [...cv1.map((r) => `${r.id}(${[r.ceu.faltam.length && `faltam ${r.ceu.faltam.join('+')}`, r.ceu.baixos && `${r.ceu.baixos} abaixo de ${CEU_Y_MIN} m`, r.ceu.aviaoDentro && 'avião dentro dos bounds'].filter(Boolean).join('; ')})`),
  ...cvSumiu.map((r) => `${r.id}(sem vida de céu)`)].join(', ');
console.log(`  CV1 vida de céu declarada e alta  ${cv1.length || cvSumiu.length ? `FALHA — ${f1}` : comCeu.length ? 'PASSA' : 'sem mapa com vida de céu'}`);
console.log(`  CV2 voador voa e fecha circuito   ${cv2.length ? `FALHA — ${cv2.map((r) => `${r.id} ${r.ceu.andou}/${r.ceu.n} andou, ${r.ceu.fechou}/${r.ceu.n} fechou`).join(', ')}` : 'PASSA'}`);
console.log(`  CV3 banking para DENTRO da curva  ${cv3.length ? `FALHA — ${cv3.map((r) => `${r.id} ${r.ceu.paraDentro}/${r.ceu.n}`).join(', ')}` : 'PASSA'}`);

const MUTANTES = { 'sem-gato': ['AR4', ar4], 'sem-fauna2': ['AR4', ar4], 'pomba-voa-de-novo': ['AR5', ar5], 'sem-som': ['AR6', ar6],
  'ceu-vazio': ['CV1', cvSumiu], 'aviao-pendurado': ['CV2', cv2], 'banking-invertido': ['CV3', cv3] };
if (MUTANTES[MUTANTE]) {
  const [esperado, falhas] = MUTANTES[MUTANTE];
  const mordeu = falhas.length > 0;
  if (!mutanteAplicou) { console.error(`\nMUTANTE NÃO APLICOU: ${MUTANTE}`); process.exit(1); }
  if (!mordeu) { console.error(`\nMUTANTE SOBREVIVEU: ${MUTANTE} não acendeu ${esperado}`); process.exit(1); }
  const colaterais = [ar1.length && 'AR1', ar2.length && 'AR2', ar3.length && 'AR3',
    esperado !== 'AR4' && ar4.length && 'AR4', esperado !== 'AR5' && ar5.length && 'AR5',
    esperado !== 'AR6' && ar6.length && 'AR6',
    esperado !== 'CV1' && (cv1.length || cvSumiu.length) && 'CV1',
    esperado !== 'CV2' && cv2.length && 'CV2', esperado !== 'CV3' && cv3.length && 'CV3'].filter(Boolean);
  if (colaterais.length) { console.error(`\nMUTANTE ${MUTANTE} acendeu cláusulas colaterais: ${colaterais.join(', ')}`); process.exit(1); }
  console.log(`\nMUTANTE MORDIDO: ${MUTANTE} -> ${esperado}`);
  process.exit(0);
}
process.exit(ar1.length || ar2.length || ar3.length || ar4.length || ar5.length || ar6.length
  || cv1.length || cvSumiu.length || cv2.length || cv3.length ? 1 : 0);
