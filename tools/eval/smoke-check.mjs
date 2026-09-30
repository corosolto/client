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
     --mutante=tracer-fantasma  volta o traçado de 1,15 cm / 58 ms (SMK3b denuncia;
                                o dono não enxergava — BUG-187)
     --mutante=fumaca-no-impacto  impacto de bala volta a soltar poeira (SMK7)
     --mutante=clarao-grande   dobra o clarão da 1ª pessoa (SMK2b denuncia; o do
                               CS 1.6 é bem mais sutil — dono, 30/09)
     --mutante=enterrada    volta os sprites para 0-2,6 m (a SMK4e denuncia; a
                            forma antiga enterrava metade da nuvem no piso)

   USO: npm run eval:smoke
        node tools/eval/smoke-check.mjs --mutante=fumaca
   ============================================================================ */
import { bootGame, initTextures, THREE } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['fumaca', 'sem-fx', 'sem-tracer', 'sem-nuvem', 'transparente', 'acima-do-ceu', 'enterrada', 'tracer-fantasma', 'fumaca-no-impacto', 'clarao-grande'];
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
if (MUT === 'tracer-fantasma') {
  g._tracerGeo = new THREE.CylinderGeometry(.0115, .0115, 1, 5, 1, true); g._tracerPool.length = 0;
  const orig = g._tracer.bind(g);
  g._tracer = (...a) => { orig(...a); const t = g.tracers.at(-1); if (t) { t.life = t.ttl = 0.058; t.seg = 1.45; } };
}
if (MUT === 'clarao-grande') { const orig = g._flash.bind(g); g._flash = (...a) => { orig(...a); const m = g._vmMzActive.at(-1); if (m) m.jetS *= 2; }; }
if (MUT === 'fumaca-no-impacto') { const orig = g._puff.bind(g); g._puff = (p, n, s) => orig(p, n, s, true); }

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
  /* SMK2b — clarão da 1ª pessoa ≤ 15% da altura da tela (alvo 12%, ref. CS 1.6 enviada
     pelo dono em 30/09; antes: estrela de ~25% com raios, flutuando acima do cano). */
  const m = g._vmMzActive.at(-1);
  if (m) {
    const w = new THREE.Vector3(); m.grp.getWorldPosition(w);
    const altura = 2 * Math.max(0.2, -w.z) * Math.tan(THREE.MathUtils.degToRad(g.vmCamera.fov) / 2);
    const frac = m.jetS / altura;
    cobra(frac <= 0.15, `SMK2b · clarão da 1ª pessoa ocupa ${(frac * 100).toFixed(0)}% da altura da tela (teto 15%)`);
  } else cobra(false, 'SMK2b · o tiro do jogador não acendeu o clarão da 1ª pessoa');
}

/* ---- SMK3: e o traçado continua ---- */
{
  for (let i = 0; i < 300 && g.state !== 'live'; i++) g.update(1 / 30, false);
  const antes = g.tracers.length;
  g._tryShoot();
  cobra(g.tracers.length > antes, `SMK3 · _tryShoot real tem que produzir tracer (${antes} → ${g.tracers.length})`);
  /* BUG-187: o dono não via o traçado com 1,15 cm e 58 ms (~0,8 px por 3 quadros a 15 m).
     Piso: ≥2 px de espessura a 15 m numa tela de 1080 px, ≥6 quadros de 60 Hz, ≥3 m de rastro. */
  const t = g.tracers.at(-1);
  const r = t?.m.geometry.parameters.radiusTop || 0;
  const focal = 1080 / (2 * Math.tan(THREE.MathUtils.degToRad(g.camera.fov) / 2));
  const px = 2 * r * focal / 15;
  cobra(!!t && px >= 2 && t.life >= 0.1 && t.seg >= 3,
    `SMK3b · traçado legível: ${px.toFixed(2)} px a 15 m (≥2), vida ${((t?.life || 0) * 1000).toFixed(0)} ms (≥100), rastro ${(t?.seg || 0).toFixed(2)} m (≥3)`);
}

/* ---- SMK3c: com a boca autorada 10,9 m atrás da câmera (medido em produção, AK,
   29/09) o traçado ainda nasce À FRENTE do olho, no raio da arma na tela ---- */
{
  const cam = g.camera.getWorldPosition(new THREE.Vector3());
  const fwd = g.camera.getWorldDirection(new THREE.Vector3());
  const bocaReal = g._muzzleWorld;
  g._muzzleWorld = () => cam.clone().addScaledVector(fwd, -9.6).add(new THREE.Vector3(1.6, -4.8, 0));
  const p = g.player; p.nextShotAt = 0; p.ammo[p.weapon] = { mag: 30, res: 90 };
  const antes = g.tracers.length;
  g._tryShoot();
  g._muzzleWorld = bocaReal;
  const t = g.tracers.length > antes ? g.tracers.at(-1) : null;
  const frente = t ? t.a.clone().sub(cam).dot(fwd) : -99;
  cobra(frente > 1 && frente < 3.5, `SMK3c · traçado nasce à frente da câmera mesmo com a boca autorada quebrada (${frente.toFixed(2)} m, esperado 1-3,5)`);
}

/* ---- SMK7: impacto de bala no mundo não solta fumaça ---- */
{
  const todos = () => [g.puffFx, ...Object.keys(g).filter((k) => k.startsWith('_fx_')).map((k) => g[k])];
  const conta = () => todos().reduce((n, fx) => n + vivas(fx), 0);
  let impactos = 0; const puffReal = g._puff; const puffBind = puffReal.bind(g); g._puff = (...a) => { impactos++; return puffBind(...a); };
  const antes = conta();
  const from = g.player.pos.clone(); from.y += 1.6;
  g.scene.updateMatrixWorld(true);
  const alvos = g.world.occluders.slice(0, 3).map((o) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()));
  for (const alvo of alvos) g._fireHitscan(g.player, from, alvo.sub(from).normalize(), 30, true, 'AK', 'ak', false);
  const depois = conta();
  g._puff = puffReal;
  cobra(impactos >= 3, `SMK7a · os 3 tiros têm que acertar o mundo (${impactos}), senão a SMK7 não mede nada`);
  cobra(depois === antes, `SMK7 · tiro na parede não pode soltar poeira/fumaça: ${antes} → ${depois} partículas`);
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
console.log('✓ SMOKE: tiro sem fumaça (clarão+faísca+tracer legível), impacto sem fumaça, granada faz smoke opaco que bloqueia visão, FOG1 ≤ céu');
