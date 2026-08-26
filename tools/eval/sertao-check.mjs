/* ============================================================================
   sertao-check.mjs — A RÉGUA DO "NÃO PARECE VELHO-OESTE GENÉRICO, PARECE SERTÃO".
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   O dono quer o "Velho Oeste da Treta" retratado como Sertão da Treta (frente
   map2/velho-oeste). A r1 foi repintura e ele reprovou com todas as letras
   (feedback r2, verbatim):

     "continua com visual do velho oeste so mudou o nome do mapa, precisa de casas
      do sertão, precisa de visual sertão nordestino, castinga, cacto, calango,
      casas de pau a pique, caminhão antigo mercedes, igrejinha, cidade de
      pernambuco com menos de 3mil habitantes, pesquise referencias antes"

   Cada substantivo desse parágrafo virou cláusula com número. Sem instrumento,
   "parece sertão" vira gosto do autor do retheme, e a frente seguinte devolve o
   faroeste genérico sem acender nada.

   O QUE ELA MEDE (no mundo construído em node puro, MESMO lugar das demais;
   GLB não carrega em node, então "molde real" = instância declarada no mundo +
   ligação ao GLB medida no FONTE e no DISCO — o mesmo idioma da cláusula de
   texturas real-v1.webp da velho-oeste-check, que é precedente desta casa)
     ST1  elementos-sertão VIVOS na cena: objetos `sertao-*` (mandacaru,
           macambira, juazeiro, xique-xique, pedra, poço, capelinha, palhoça,
           placa, casa, igrejinha, caminhão…). Piso de CONTAGEM e DIVERSIDADE —
           um mapa com 30 mandacarus e nada mais não é sertão.
     ST2  taipa nas paredes do casario: fração das `parede-*` cujo material é
           `oeste-adobe*` (adobe de fiada OU pau a pique `oeste-adobe-paupique`
           — pau a pique É taipa de mão, Wikipédia "Pau a pique"). Madeira
           pintada de faroeste voltar é o defeito.
     ST3  fim de tarde de sertão: horizonte e névoa QUENTES (R−B ≥ 60 no fog
           que o jogo desenha), sol RASPANDO (elevação ≤ 25°) e névoa SECA
           (densidade ≤ 0,0065). O céu é webp medido por look-horizonte.py; o
           casamento fog==horizonte é cláusula do eval:look (não duplicada
           aqui — LIÇÃO 2: dois limiares pro mesmo conceito é instrumento
           discordando de si).
     ST4  O ARRAIAL PEDIDO PELO DONO (r2): ≥6 casas de pau a pique instanciadas
           (`sertao-casa-*`), igrejinha na praça central (grupo `sertao-igrejinha-*`
           a ≤16 m do centro do mapa) e caminhão antigo presente — os três
           MOLDES REAIS: o fonte do mapa instancia via placeProp e os GLB
           existem em public/models/props/ e estão no preload (VELHO_OESTE_PROPS).
     ST5  calango registrado: o mapa tem ≥2 calangos vivos na ambiência E o
           molde calango.glb existe em public/models/ambient/ e está no
           preload (VELHO_OESTE_AMBIENCE).

   PROCEDÊNCIA DOS PISOS (Lei 2 — teto sem procedência é opinião)
     ST1 ≥28 e ≥8 tipos · contagem fechada da build r2 (saída deste script):
     57 elementos de 13 tipos = 20 mandacarus + 6 macambiras + 4 juazeiros +
     6 xique-xiques + 5 pedras + 2 lagartos + poço + capelinha + palhoça +
     placa + 8 casas + igrejinha + caminhão. Piso 28/8 fica a ~49%/62% da
     contagem: mesma margem da r1 (14 de 28, 6 de 10) — absorve trocar metade
     do elenco sem deixar o mapa virar faroeste de novo.
     ST2 ≥75%: 9 paredes na r2 (8 casas + igrejinha), todas em taipa de mão;
     piso deixa 2 paredes voltarem à madeira sem perdoar o arraital inteiro.
     ST3 R−B ≥ 60 (medido 89 no fog, 166-77=89… valor fresco abaixo na saída);
     elevação ≤25° (medido 21,8°); névoa ≤0,0065 (medido 0,0056 — o LOOK mais
     seco da casa era o mansao com 0,0068: sertão pede AR SECO).
     ST4 ≥6 casas: o dono pediu "6-10 casas" → piso é o mínimo do pedido;
     igrejinha ≤16 m do centro: a igreja está a 15,5 m (0,-15,5) de frente pro
     largo — praça da matriz é o gesto de cidade PE pequena que ele citou.
     ST5 ≥2 calangos: 3 vivos na build; piso 2 sobrevive a um ajuste de rota.

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (Lei 3 — se não morde, não existe)
     --mutante=sem-sertao ...... remove a CAATINGA (mandacaru, macambira,
                                  juazeiro, xique-xique)           -> ST1
     --mutante=volta-oeste ..... devolve TODA parede à madeira       -> ST2
     --mutante=ceu-frio ........ névoa do jogo vira azul frio        -> ST3
     --mutante=sem-igrejinha ... remove o grupo `sertao-igrejinha-*` -> ST4
     --mutante=sem-calango ..... zera os calangos da ambiência       -> ST5
     Cada mutante tem que acender SÓ a cláusula dele. Na r2 o casario entrou no
     elenco `sertao-*`: um mutante que removesse TUDO derrubaria ST2 e ST4
     junto, e mutante que acende três cláusulas não prova nenhuma — por isso
     sem-sertao remove só a vegetação, que é o miolo da contagem (57-36=21 < 28).

   USO
     node tools/eval/sertao-check.mjs
     node tools/eval/sertao-check.mjs --mutante=sem-igrejinha
    ============================================================================ */
import { existsSync, readFileSync } from 'node:fs';
import { THREE, MAPS, initTextures } from './harness.mjs';
import { LOOK } from '../../public/js/look.js';
import { VELHO_OESTE_PROPS, VELHO_OESTE_AMBIENCE } from '../../public/js/map_velho_oeste.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['sem-sertao', 'volta-oeste', 'ceu-frio', 'sem-igrejinha', 'sem-calango'];
if (MUT && !MUTANTES.includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT}\nconhecidos: ${MUTANTES.join(' | ')}`);
  process.exit(2);
}

const PISO_ELEMENTOS = 28, PISO_TIPOS = 8;    // ST1 — ver procedência no cabeçalho
const PISO_TAIPA = 0.75;                      // ST2 — fração das paredes em taipa de mão
const PISO_QUENTE = 60;                       // ST3 — R−B do fog
const TETO_ELEV = 25;                         // ST3 — graus: sol raspando, não a pino
const TETO_NEBLINA = 0.0065;                  // ST3 — mais seco que o mansao (0,0068)
const PISO_CASAS = 6, RAIO_PRACA = 16;        // ST4 — "6-10 casas" do dono; igreja a 15,5 m
const PISO_CALANGOS = 2;                      // ST5 — 3 vivos na build

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
  /* remove a CAATINGA (ver cabeçalho): casas/igrejinha ficam para não derrubar
     ST2/ST4 de carona — mutante que acende três cláusulas não prova nenhuma. */
  const caatinga = elementos.filter((o) => /^sertao-(mandacaru|macambira|juazeiro|xique)-/.test(o.name));
  if (!caatinga.length) { console.error('MUTANTE NÃO APLICOU: nenhuma planta de caatinga no mundo'); process.exit(1); }
  for (const o of caatinga) o.parent?.remove(o);
  elementos.length = 0;
  world.root.traverse((o) => { if (o.name?.startsWith('sertao-')) elementos.push(o); });
  tipos.clear(); elementos.forEach((o) => tipos.add(o.name.split('-')[1]));
}

/* ── ST2: taipa de mão nas paredes do casario ── */
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
const fracaoTaipa = paredes.length ? taipa.length / paredes.length : 0;

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

/* ── ST4: o arraial do dono — casas pau-a-pique, igrejinha na praça, caminhão ──
   Em node o GLB não carrega: a INSTÂNCIA vive como grupo `sertao-*` (posição,
   rotação e colisor são os dois ramos do mesmo sertaoElement); o MOLDE REAL é
   provado no fonte (placeProp com o id) + no disco (GLB existe) + no preload
   (VELHO_OESTE_PROPS, que o main.js usa para baixar antes do primeiro frame). */
const MOLDES_PROPS = {
  casa_pau_a_pique: 'public/models/props/casa_pau_a_pique.glb',
  igrejinha: 'public/models/props/igrejinha.glb',
  caminhao_antigo: 'public/models/props/caminhao_antigo.glb',
};
const mapSource = readFileSync(new URL('../../public/js/map_velho_oeste.js', import.meta.url), 'utf8');
let casas = [], igrejinhas = [], caminhoes = [];
world.root.traverse((o) => {
  if (!o.name?.startsWith('sertao-')) return;
  if (o.name.startsWith('sertao-casa-')) casas.push(o);
  else if (o.name.startsWith('sertao-igrejinha-')) igrejinhas.push(o);
  else if (o.name.startsWith('sertao-caminhao-')) caminhoes.push(o);
});
const igrejaNaPraca = (() => {
  if (MUT === 'sem-igrejinha') {
    if (!igrejinhas.length) { console.error('MUTANTE NÃO APLICOU: nenhuma sertao-igrejinha-* no mundo'); process.exit(1); }
    for (const o of igrejinhas) o.parent?.remove(o);
    igrejinhas.length = 0;
  }
  return igrejinhas.some((o) => Math.hypot(o.position.x, o.position.z) <= RAIO_PRACA);
})();
const moldesReais = Object.entries(MOLDES_PROPS).every(([id, file]) =>
  existsSync(new URL(`../../${file}`, import.meta.url))
  && mapSource.includes(`'${id}'`)
  && VELHO_OESTE_PROPS.includes(id));

/* ── ST5: calango registrado (molde + vivos na ambiência) ── */
const calangoGlb = existsSync(new URL('../../public/models/ambient/calango.glb', import.meta.url));
const calangoNoPreload = VELHO_OESTE_AMBIENCE.includes('calango');
let calangos = world.ambience?.animals?.filter((a) => a.type === 'calango') || [];
if (MUT === 'sem-calango') {
  if (!calangos.length) { console.error('MUTANTE NÃO APLICOU: nenhum calango na ambiência'); process.exit(1); }
  world.ambience.animals = world.ambience.animals.filter((a) => a.type !== 'calango');
  calangos = [];
}
const calangoRegistrado = calangos.length >= PISO_CALANGOS && calangoGlb && calangoNoPreload;

/* ── veredito ── */
const clausulas = [
  { id: 'ST1 elementos-sertão', ok: elementos.length >= PISO_ELEMENTOS && tipos.size >= PISO_TIPOS,
    valor: `${elementos.length} elementos de ${tipos.size} tipos (pisos ${PISO_ELEMENTOS}/${PISO_TIPOS})` },
  { id: 'ST2 taipa no casario', ok: fracaoTaipa >= PISO_TAIPA,
    valor: `${taipa.length}/${paredes.length || 0} paredes em taipa = ${(fracaoTaipa * 100).toFixed(0)}% (piso ${(PISO_TAIPA * 100).toFixed(0)}%)` },
  { id: 'ST3 tarde quente de sertão', ok: fogQuente && horizonteQuente && solBaixo && neblinaSeca,
    valor: `fog ${fogHex === null ? 'ausente' : '#' + fogHex.toString(16).padStart(6, '0')} (R−B ${fogHex === null ? '—' : aquecido(fogHex)}) · LOOK ${L ? 'presente' : 'AUSENTE'} · sol a ${sol ? elevacao(sol.position).toFixed(1) : '—'}° · névoa d=${L ? L.neblina.d : '—'}` },
  { id: 'ST4 arraial de pau a pique', ok: casas.length >= PISO_CASAS && igrejaNaPraca && caminhoes.length > 0 && moldesReais,
    valor: `${casas.length} casas (piso ${PISO_CASAS}) · igrejinha ${igrejaNaPraca ? `na praça (≤${RAIO_PRACA} m)` : igrejinhas.length ? 'FORA da praça' : 'AUSENTE'} · caminhão ${caminhoes.length ? 'presente' : 'AUSENTE'} · moldes reais ${moldesReais ? 'no fonte+disco+preload' : 'AUSENTES'}` },
  { id: 'ST5 calango registrado', ok: calangoRegistrado,
    valor: `${calangos.length} vivos (piso ${PISO_CALANGOS}) · calango.glb ${calangoGlb ? 'existe' : 'AUSENTE'} · preload ${calangoNoPreload ? 'sim' : 'NÃO'}` },
];

console.log(`SERTÃO — régua da frente  ${MUT ? `[mutante: ${MUT}]` : ''}`);
for (const c of clausulas) console.log(`  ${c.ok ? 'PASSA' : 'FALHA'}  ${c.id.padEnd(26)} ${c.valor}`);
const vermelhas = clausulas.filter((c) => !c.ok);

if (MUT) {
  const esperado = { 'sem-sertao': 'ST1', 'volta-oeste': 'ST2', 'ceu-frio': 'ST3', 'sem-igrejinha': 'ST4', 'sem-calango': 'ST5' }[MUT];
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
console.log('\n✓ SERTÃO ok — arraial de pau a pique, caatinga densa e tarde quente nos pisos da frente.');
