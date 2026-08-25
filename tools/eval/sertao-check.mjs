/* ============================================================================
   sertao-check.mjs — A RÉGUA DO "NÃO PARECE VELHO-OESTE GENÉRICO, PARECE SERTÃO".
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   O dono quer o "Velho Oeste da Treta" retratado como Sertão da Treta
   (~/map2/prompt-opencode.md, frente 2): casario de adobe, vegetação de
   caatinga, marcos de sertão e fim de tarde quente — MANTENDO o layout e a
   gameplay (a régua eval:velhooeste continua verde; esta mede a IDENTIDADE,
   não a geometria). Sem instrumento, "parece sertão" vira gosto do autor do
   retheme, e a frente seguinte devolve o faroeste genérico sem acender nada.

   O QUE ELA MEDE (no mundo construído em node puro, MESMO lugar das demais)
     ST1  elementos-sertão VIVOS na cena: objetos com nome `sertao-*`
          (mandacaru, macambira, juazeiro, xique-xique, pedra, poço, capelinha,
          palhoça de forró, placa de distâncias). Piso de CONTAGEM e de
          DIVERSIDADE — um mapa com 30 mandacarus e nada mais não é sertão.
     ST2  adobe nas paredes do casario: fração das paredes principais
          (`parede-*`) cujo material é taipa (`oeste-adobe*`). O retheme é
          casario DE ADOBE; madeira pintada de faroeste voltar é o defeito.
     ST3  fim de tarde de sertão: horizonte e névoa QUENTES (R−B ≥ 60 no fog
          que o jogo desenha), sol RASPANDO (elevação ≤ 25°) e névoa SECA
          (densidade ≤ 0,0070 — mais seca que o Joá litorâneo, 0,0068 é o
          teto úmido da casa). O céu é webp medido por look-horizonte.py; o
          casamento fog==horizonte é cláusula do eval:look (não duplicada
          aqui — LIÇÃO 2: dois limiares pro mesmo conceito é instrumento
          discordando de si).

   PROCEDÊNCIA DOS PISOS (Lei 2 — teto sem procedência é opinião)
     ST1 ≥ 14 e ≥ 6 tipos · ST2 ≥ 75%: piso declarado ANTES do retheme
     (estado atual: 0 elementos, 0% adobe — saída deste script no commit da
     régua) e ajustado à primeira build que passou no eval:velhooeste SEM
     mudar layout; contagem fechada da build entregue: 8 mandacarus + 4
     macambiras + 2 juazeiros + 3 xique-xiques + 5 pedras + 2 lagartos + poço
     + capelinha + palhoça + placa = 28 elementos de 10 tipos (saída deste
     script). Piso 14/6 fica a 50%/60% da contagem: absorve trocar metade do
     elenco sem deixar o mapa virar faroeste de novo.
     ST2: 16 paredes de casario no mapa (12 prédios + 4 casas de rua), todas
     em taipa; piso 75% deixa 4 paredes voltarem a madeira (varanda/estábulo)
     sem perdoar o casario inteiro de adobe.
     ST3: R−B ≥ 60 medido no webp final por look-horizonte.py (horizonte
     0xd9905a → R−B = 127; ver cabeçalho do LOOK em look.js); o piso é a
     metade do medido. Elevação ≤ 25°: sol de fim de tarde no nascente do
     mapa (pos [−30,14,−18] → 21,4°); o estado atual está a 43° (medido,
     saída da régua no commit anterior ao retheme). Névoa ≤ 0,0065: o LOOK
     mais seco da casa é o mansao (0,0068, litoral úmido do Joá) — sertão
     pede AR SECO: alvo 0,0056.

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (Lei 3 — se não morde, não existe)
     --mutante=sem-sertao ..... remove TODO objeto `sertao-*`          -> ST1
     --mutante=volta-oeste .... devolve TODA parede à madeira de faroeste -> ST2
     --mutante=ceu-frio ....... névoa do jogo vira azul frio            -> ST3
     Cada mutante tem que acender SÓ a cláusula dele.

   USO
     node tools/eval/sertao-check.mjs
     node tools/eval/sertao-check.mjs --mutante=volta-oeste
   ============================================================================ */
import { THREE, MAPS, initTextures } from './harness.mjs';
import { LOOK } from '../../public/js/look.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['sem-sertao', 'volta-oeste', 'ceu-frio'];
if (MUT && !MUTANTES.includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT}\nconhecidos: ${MUTANTES.join(' | ')}`);
  process.exit(2);
}

const PISO_ELEMENTOS = 14, PISO_TIPOS = 6;   // ST1 — ver procedência no cabeçalho
const PISO_ADOBE = 0.75;                     // ST2 — fração das paredes em taipa
const PISO_QUENTE = 60;                      // ST3 — R−B do fog (metade do medido 127)
const TETO_ELEV = 25;                        // ST3 — graus: sol raspando, não a pino
const TETO_NEBLINA = 0.0065;                 // ST3 — mais seco que o mansao (0,0068), o mais seco até aqui

const scene = new THREE.Scene();
const world = MAPS.velho_oeste.build(scene, await initTextures());

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const aquecido = (hex) => { const [r, , b] = rgb(hex); return r - b; };
const elevacao = (pos) => Math.atan2(pos[1] ?? pos.y, Math.hypot(pos[0] ?? pos.x, pos[2] ?? pos.z)) * 180 / Math.PI;

/* ── ST1: elementos-sertão por nome (fallback procedural conta: GLB é enfeite) ── */
const elementos = [];
world.root.traverse((o) => { if (o.name?.startsWith('sertao-')) elementos.push(o); });
const tipos = new Set(elementos.map((o) => o.name.split('-')[1]));
if (MUT === 'sem-sertao') {
  for (const o of elementos) o.parent?.remove(o);
  elementos.length = 0;
}

/* ── ST2: adobe nas paredes do casario ── */
const paredes = [], taipa = [];
world.root.traverse((o) => {
  if (!o.name?.startsWith('parede-') || !o.isMesh) return;
  paredes.push(o);
  const map = o.material?.map?.name || '';
  if (map.startsWith('oeste-adobe')) taipa.push(o);
});
if (MUT === 'volta-oeste') {
  const madeira = new THREE.MeshStandardMaterial({ color: 0x8a4f28, map: { name: 'oeste-wood-real' } });
  if (!paredes.length) { console.error('MUTANTE NÃO APLICOU: nenhuma parede-* para devolver à madeira'); process.exit(1); }
  for (const p of paredes) { p.material = madeira; }
  taipa.length = 0;
}
const fracaoAdobe = paredes.length ? taipa.length / paredes.length : 0;

/* ── ST3: fim de tarde quente, sol raspando, névoa seca ── */
const L = LOOK.velho_oeste;
let fogHex = null;
if (scene.fog?.color) {
  fogHex = scene.fog.color.getHex();
  if (MUT === 'ceu-frio') { scene.fog.color.set(0x9fb8cc); fogHex = 0x9fb8cc; }
}
const fogQuente = fogHex !== null && aquecido(fogHex) >= PISO_QUENTE;
const horizonteQuente = !!L && aquecido(L.horizonte) >= PISO_QUENTE;
const sol = world.sun;
const solBaixo = !!sol && elevacao(sol.position) <= TETO_ELEV && !!L && elevacao(L.sol.pos) <= TETO_ELEV;
const neblinaSeca = !!L && L.neblina.d <= TETO_NEBLINA;

/* ── veredito ── */
const clausulas = [
  { id: 'ST1 elementos-sertão', ok: elementos.length >= PISO_ELEMENTOS && tipos.size >= PISO_TIPOS,
    valor: `${elementos.length} elementos de ${tipos.size} tipos (pisos ${PISO_ELEMENTOS}/${PISO_TIPOS})` },
  { id: 'ST2 adobe no casario', ok: fracaoAdobe >= PISO_ADOBE,
    valor: `${taipa.length}/${paredes.length || 0} paredes em taipa = ${(fracaoAdobe * 100).toFixed(0)}% (piso ${(PISO_ADOBE * 100).toFixed(0)}%)` },
  { id: 'ST3 tarde quente de sertão', ok: fogQuente && horizonteQuente && solBaixo && neblinaSeca,
    valor: `fog ${fogHex === null ? 'ausente' : '#' + fogHex.toString(16).padStart(6, '0')} (R−B ${fogHex === null ? '—' : aquecido(fogHex)}) · LOOK ${L ? 'presente' : 'AUSENTE'} · sol a ${sol ? elevacao(sol.position).toFixed(1) : '—'}° · névoa d=${L ? L.neblina.d : '—'}` },
];

console.log(`SERTÃO — régua da frente  ${MUT ? `[mutante: ${MUT}]` : ''}`);
for (const c of clausulas) console.log(`  ${c.ok ? 'PASSA' : 'FALHA'}  ${c.id.padEnd(26)} ${c.valor}`);
const vermelhas = clausulas.filter((c) => !c.ok);

if (MUT) {
  const esperado = { 'sem-sertao': 'ST1', 'volta-oeste': 'ST2', 'ceu-frio': 'ST3' }[MUT];
  if (vermelhas.length !== 1 || !vermelhas[0].id.startsWith(esperado)) {
    console.error(`\nMUTANTE ${MUT} ${vermelhas.length ? `acendeu ${vermelhas.map((v) => v.id.split(' ')[0]).join(', ')} em vez de ${esperado}` : 'SOBREVIVEU'} — a régua não mede o que diz medir.`);
    process.exit(1);
  }
  console.log(`\nMUTANTE MORDIDO: ${MUT} -> ${esperado}`);
  process.exit(0);
}
if (vermelhas.length) {
  console.error(`\n✗ SERTÃO: ${vermelhas.length} cláusula(s) vermelha(s) — "parece sertão" tem número, e ele está aqui.`);
  process.exit(1);
}
console.log('\n✓ SERTÃO ok — adobe, caatinga e tarde quente nos pisos da frente.');
