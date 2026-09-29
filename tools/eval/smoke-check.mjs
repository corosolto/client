/* ============================================================================
   smoke-check.mjs — O CONTRATO DA FUMAÇA NO CS BRASIL (BUG-185 + BUG-186).
   ----------------------------------------------------------------------------
   POR QUE EXISTE — relatos literais do dono, 29/09/2026:

     BUG-185: "quando a arma atira ela solta fumaça isso é ERRADO queriamos apenas
               o traçado de balas, igual é em valorant, CS e fortnite"
     BUG-186: "as granadas de smoke nao fazem smoke mais. parece que a fumaca saiu
               da smoke grenade e foi pra armas"

   O QUE ESTA RÉGUA EXISTE PARA IMPEDIR DE VOLTAR (BUG-185): o tiro soltava
   3-4 baforadas em `_muzzleSmokeFx` (#405, RIG-PEGA-ARMA) + 1 puff bege no cano,
   medido no arnês (3 vivas por tiro fpCls, +4 por tiro de bot) e confirmado no
   browser. O dono decidiu: tiro = clarão + faíscas + tracer, ZERO fumaça. A
   fumaça que TEM que existir no jogo é a da GRANADA (BUG-186) — e ela nasce
   desta mesma régua: nuvem de 24 sprites, opaca em 1s, bloqueando a visão dos
   bots, e nunca mais clara que o céu (FOG1).

   O QUE ELA MEDE (comportamento, não declaração — o `_flash` e o `_throwNade`
   de PRODUÇÃO, chamados como o jogo chama):
     SMK1  `_flash` do jogador E de bot não adiciona partícula a sistema de
           fumaça nenhum (puffFx conta antes == depois; `_muzzleSmokeFx` nem
           pode existir — cutover limpo).
     SMK2  o tiro CONTINUA com FX: faíscas nascem (flashFx cresce). Sem isto a
           régua seria verde num `_flash` arrancado pela raiz.
     SMK3  `_tryShoot` real ainda produz TRACER (`tracers.length` cresce) — é o
           "traçado de balas" que o dono pediu, não um rastro a menos.
     SMK4  granada de smoke: fuse 2,2s → `_popSmoke` → 1 nuvem, 24 sprites, em
           cena, com textura e cor (BUG-186 offline; o caminho ONLINE depende do
           servidor mandar `nade`/`boom` e é medido no netcode-check).
     SMK5  a nuvem fica OPACA (`_opaque` em 1s) e BLOQUEIA a linha de visão dos
           bots (`_losClear` através do centro dela == false). Fumaça que não
           bloqueia é decoração.
     SMK6  FOG1: radiância da fumaça ≤ radiância do céu medido do mapa (a
           invariante do "a tela lava pra branco", medida pelo `_corDaFumaca`
           de produção contra `skyRadiance` do bloom.js).

   MUTAÇÕES QUE FAZEM ELA FICAR VERMELHA (rode cada uma e exija vermelho):
     --mutante=fumaca       injeta baforada de volta no _flash (estado de antes)
     --mutante=sem-fx       arranca as faíscas (a SMK2 tem que denunciar)
     --mutante=sem-tracer   zera o tracer da bala (a SMK3 denuncia)
     --mutante=sem-nuvem    _popSmoke vira no-op (a SMK4 denuncia)
     --mutante=transparente a nuvem nunca fica _opaque (a SMK5 denuncia)
     --mutante=acima-do-ceu dobra a radiância da fumaça (a SMK6 denuncia)
     --mutante=enterrada    volta os sprites para 0-2,6 m (a SMK4e denuncia; a
                            forma antiga enterrava metade da nuvem no piso)

   USO: npm run eval:smoke
        node tools/eval/smoke-check.mjs --mutante=fumaca
   ============================================================================ */
import { bootGame, initTextures, THREE } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['fumaca', 'sem-fx', 'sem-tracer', 'sem-nuvem', 'transparente', 'acima-do-ceu', 'enterrada'];
if (MUT && !MUTANTES.includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT} (válidos: ${MUTANTES.join(', ')})`);
  process.exit(2);
}

const textures = initTextures();
const g = bootGame('praca_poderes', { textures });
const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const vivas = (fx) => {
  let n = 0; const t = fx.uniforms.uTime.value;
  for (let i = 0; i < fx.max; i++) if (t - fx.birth[i] < fx.life[i]) n++;
  return n;
};

/* mutações in-memory: provam que a régua morde o estado errado, sem tocar em disco */
if (MUT === 'fumaca') {
  const orig = g._flash.bind(g);
  g._flash = (pos, dir, fp) => { orig(pos, dir, fp); g.puffFx.spawn(pos, { life: 0.5, size: 0.3, grow: 1.6 }); };
}
if (MUT === 'sem-fx') g.flashFx.spawn = () => {};
/* sem-tracer/transparente têm que agir na ESCRITA (o loop do jogo recria o estado:
   esvaziar `tracers` uma vez ou setar `_opaque=false` uma vez é desfeito no próximo
   update e a mutação passa verde — medido na 1ª rodada, corrigido aqui) */
if (MUT === 'sem-tracer') g.tracers.push = () => {};
if (MUT === 'sem-nuvem') g._popSmoke = () => {};
if (MUT === 'transparente') {
  const orig = g._popSmoke.bind(g);
  g._popSmoke = (...a) => { orig(...a); g._smokes.forEach((s) => Object.defineProperty(s, '_opaque', { get: () => false, set() {}, configurable: true })); };
}
if (MUT === 'acima-do-ceu') { const orig = g._corDaFumaca.bind(g); g._corDaFumaca = () => orig().multiplyScalar(2); }
if (MUT === 'enterrada') {
  const orig = g._popSmoke.bind(g);
  g._popSmoke = (...a) => { orig(...a); const s = g._smokes[g._smokes.length - 1]; s.group.position.y = Math.max(0.5, s.group.position.y); s.sprites.forEach((sp) => { sp.position.y = (Math.random() - 0.2) * 2.6; }); };
}

/* ---- SMK1/SMK2: o tiro não solta fumaça (e continua com faísca) ---- */
{
  const dir = g.camera.getWorldDirection(new THREE.Vector3());
  const cls = 'rifle';
  const puffsAntes = vivas(g.puffFx);
  const flashAntes = vivas(g.flashFx);
  g._flash(g._muzzleWorld(cls), dir.clone(), cls);            // tiro do próprio jogador
  g._flash(new THREE.Vector3(40, 1.6, 40), new THREE.Vector3(1, 0, 0));   // tiro de bot
  const puffsDepois = vivas(g.puffFx);
  const flashDepois = vivas(g.flashFx);
  cobra(g._muzzleSmokeFx === undefined, `SMK1a · o sistema _muzzleSmokeFx não pode existir (achou ${typeof g._muzzleSmokeFx})`);
  cobra(puffsAntes === puffsDepois, `SMK1b · _flash não pode soltar puff: ${puffsAntes} → ${puffsDepois} partículas`);
  cobra(flashDepois > flashAntes, `SMK2 · faíscas do tiro têm que nascer: ${flashAntes} → ${flashDepois}`);
}

/* ---- SMK3: e o traçado continua ---- */
{
  for (let i = 0; i < 300 && g.state !== 'live'; i++) g.update(1 / 30, false);
  const antes = g.tracers.length;
  g._tryShoot();
  cobra(g.tracers.length > antes, `SMK3 · _tryShoot real tem que produzir tracer (${antes} → ${g.tracers.length})`);
}

/* ---- SMK4/SMK5: a granada FAZ smoke, e a smoke BLOQUEIA ---- */
{
  g._throwNade('smoke', 'smokes');
  for (let i = 0; i < Math.ceil(3.4 * 30); i++) g.update(1 / 30, false);
  const nuvem = g._smokes[0];
  cobra(g._smokes.length === 1 && !!nuvem, `SMK4a · 1 nuvem após o fuse (achou ${g._smokes.length})`);
  if (nuvem) {
    cobra(nuvem.sprites.length === 24, `SMK4b · 24 sprites na nuvem (achou ${nuvem.sprites.length})`);
    cobra(!!nuvem.group.parent, 'SMK4c · a nuvem está em cena');
    cobra(!!nuvem.sprites[0].material.map, 'SMK4d · a nuvem tem textura');
    const minY = Math.min(...nuvem.sprites.map((sp) => nuvem.group.position.y + sp.position.y));
    cobra(minY >= 0.5, `SMK4e · nenhum sprite centrado abaixo de 0,5 m (menor: ${minY.toFixed(2)} m) — domo acima do chão`);
    cobra(nuvem._opaque === true, 'SMK5a · a nuvem fica opaca (_opaque) depois de crescer');
    const c = nuvem.center;
    const de = new THREE.Vector3(c.x - 30, c.y + 1, c.z);
    const para = new THREE.Vector3(c.x + 30, c.y + 1, c.z);
    cobra(g._losClear(de, para) === false, 'SMK5b · linha de visão ATRAVÉS da nuvem tem que ser bloqueada');
  }
}

/* ---- SMK6: FOG1 — a fumaça nunca é mais clara que o céu do mapa ---- */
{
  const { skyRadiance } = await import(new URL('../../public/js/bloom.js', import.meta.url));
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const ceu = skyRadiance('praca_poderes');
  const cor = g._corDaFumaca();
  cobra(lum(cor) <= lum(ceu) + 1e-6, `SMK6 · FOG1: radiância da fumaça ${lum(cor).toFixed(3)} > céu ${lum(ceu).toFixed(3)}`);
}

g.dispose();
if (falhas.length) {
  console.error(`✗ SMOKE — ${falhas.length} cláusula(s):`);
  for (const f of falhas) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('✓ SMOKE: tiro sem fumaça (clarão+faísca+tracer), granada faz smoke opaco que bloqueia visão, FOG1 ≤ céu');
