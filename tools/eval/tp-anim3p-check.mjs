#!/usr/bin/env node
/* ============================================================================
   tp-anim3p-check.mjs — O CORPO EM TERCEIRA PESSOA DENUNCIA O QUE ESTÁ FAZENDO?
   ----------------------------------------------------------------------------
   Levantamento de 21/10: o controlador 3P é sólido no que tem (11 clipes,
   crossfade, histerese, anti-deslize por timeScale, IK de apoio), mas duas
   coisas que o jogador PRECISA ler no corpo do outro não existiam:

     · RECARREGAR era invisível — sem estado, sem clipe (não há reload.glb no
       acervo) e game.js nunca avisava o controlador. "Ele está recarregando"
       é informação tática num FPS;
     · movimentação LATERAL tocava o run frontal: corpo parado de frente,
       deslizando de lado (não há clipe de strafe nem inclinação de peso).

   O QUE ESTA RÉGUA COBRA (partida viva; AN1–AN3 tentam até 8 bots, porque o
   primeiro vivo pode ter rig menos alcançável, e a cláusula precisa é do
   CONTRATO, não de um rig sorteado):
     AN1  na janela de recarga a mão esquerda vai ao PENTE (CCD no mesmo
          solver da mão de apoio) e VOLTA quando a janela fecha;
     AN2  o tronco mergulha na recarga: a CABEÇA desce e volta (métrica na
          cabeça — offsets entre vértebras são milimétricos);
     AN3  lateral inclina o corpo (cabeça desloca no eixo da direita), some
          sem lateral, e corpo morto não inclina;
     AN4  a fiação existe no jogo: recarga do jogador em 3ª pessoa E a do bot
          chamam ctrl.reload;
     AN5  o manifesto de animações declara os 8 clipes base para todos e o
          fallback de opcionais é REGISTRADO (hoje: ue2), não acidente.

   MUTANTES (reescrevem o arquivo servido; o disco não é tocado):
     --mutante=pega-morta        tira o CCD do pente          -> AN1
     --mutante=torso-mudo        tira o mergulho do tronco    -> AN2
     --mutante=lean-morto        zera o alvo de inclinação    -> AN3
     --mutante=reload-mudo       desliga a fiação dos bots    -> AN4
     --mutante=opcional-fantasma planta char sem clipe base   -> AN5

   Uso: BASE=http://127.0.0.1:9321 node tools/eval/tp-anim3p-check.mjs
   ============================================================================ */
import { execFileSync, execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BASE_EXTERNA = process.env.BASE;
const PORTA = process.env.PORTA || '9326';
const BASE = BASE_EXTERNA || `http://127.0.0.1:${PORTA}`;
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ESPERADO = { 'pega-morta': ['AN1'], 'torso-mudo': ['AN1', 'AN2'], 'lean-morto': ['AN3'], 'reload-mudo': ['AN4'], 'opcional-fantasma': ['AN5'],
  'flinch-mudo': ['AN6'], 'agachado-estatua': ['AN7'], 'ar-correndo': ['AN8', 'AN9'], 'quadril-colado': ['AN9'], 'lod-cego': ['AN10'] };
if (MUT && !ESPERADO[MUT]) throw new Error(`mutante desconhecido: ${MUT}`);
if (!MUT) execFileSync(process.execPath, [fileURLToPath(new URL('./tp-reload-paired-check.mjs', import.meta.url)), '--self-test'], { stdio: 'inherit' });

const PARTIDA = 'debug=1&economia=0&auto=E,esquerdomacho&map=praca_poderes';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

const servidor = BASE_EXTERNA ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 60 && !pronto; i++) {
    try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((r) => setTimeout(r, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);
}

const STUB = 'export default {};export const createHotContext=()=>({accept(){},dispose(){},prune(){},on(){},off(){},send(){},invalidate(){},data:{}});'
  + 'export const updateStyle=()=>{};export const removeStyle=()=>{};export const injectQuery=(u)=>u;export class ErrorOverlay{}';

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }),
  /* Regra do boot-orcamento: no Darwin usa a GPU real (args vazios); nas demais
     plataformas mantém o software GL explícito (2 flags SwiftShader). Isto é infra
     de lançamento — o perfil efetivo pode variar e não garante verde por si só. */
  args: [...(process.platform === 'darwin' ? [] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']), '--headless=new', '--mute-audio'],
});

async function abrir() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.route(/\.astro\/eval-vite|dev-toolbar|@vite\/client/, (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  const reescreve = (teste, troca) => page.route(teste, async (r) => {
    const res = await r.fetch();
    const antes = await res.text();
    const depois = troca(antes);
    if (depois === antes) throw new Error(`mutante ${MUT} não aplicou em ${r.request().url()}`);
    await r.fulfill({ response: res, body: depois });
  });
  if (MUT === 'pega-morta') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace('solveCCDIK(this.ikL.chain, this.ikL.end, _ikTgt, { iterations: 12, endOffset: this.ikL.endOffset });', 'void _ikTgt;'));
  if (MUT === 'torso-mudo') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace('_deltaMundo(torso.spines[0], cosY, 0, -sinY, k * 0.20);', 'void k; void cosY; void sinY;'));
  if (MUT === 'lean-morto') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace(') * 0.12;', ') * 0;'));
  if (MUT === 'flinch-mudo') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace('this._flinchDur = 0.18;', 'this._flinchDur = 0;'));
  if (MUT === 'agachado-estatua') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace('{ this._fireDur = 0.12; this._fireT = 0; return; }', '{ return; }'));
  if (MUT === 'ar-correndo') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace('} else if (this._ar && this.actions.jump) {', '} else if (false) {'));
  if (MUT === 'quadril-colado') await reescreve(/\/js\/glbchars\.js/, (t) => t.replace('const teto = 0.61;', 'const teto = 0;'));
  if (MUT === 'lod-cego') await reescreve(/\/js\/game\.js/, (t) => t.replace('const passo = distCam > 45 ? 0.1 : (distCam > 25 ? 0.05 : 0);', 'const passo = 0;'));
  if (MUT === 'reload-mudo') await reescreve(/\/js\/game\.js/, (t) => t.split('b.mesh?.ctrl?.reload?.(Wb.reload || 2.4); ').join('').split(' b.mesh?.ctrl?.reload?.(Wb.reload || 2.4);').join(''));
  // Diagnóstico de boot somente na falha; limites do teste permanecem os mesmos.
  const cap = (s) => String(s ?? '').replace(/https?:\/\/[^\s"'<>]+/g, (u) => {
    try { return new URL(u).pathname; } catch { return '(url)'; }
  }).slice(0, 300);
  const local = (u) => { try { const x = new URL(u); return x.origin === new URL(BASE).origin ? cap(x.pathname) : null; } catch { return null; } };
  const pend = new Set(), erros = [], http = [];
  const addErro = (e) => { if (erros.length < 12) erros.push(e); };
  const onReq = (r) => { const p = local(r.url()); if (p && pend.size < 32) pend.add(p); };
  const onFim = (r) => { const p = local(r.url()); if (p) pend.delete(p); };
  const onFalha = (r) => { const p = local(r.url()); if (p) addErro({ path: p, falha: cap(r.failure()?.errorText) }); };
  const onPageErr = (e) => addErro({ pageError: cap(e?.message) });
  const onConsole = (m) => { if (m.type() === 'error') addErro({ console: cap(m.text()) }); };
  const onResp = (r) => { const p = local(r.url()); if (p && r.status() >= 400 && http.length < 12) http.push({ status: r.status(), path: p }); };
  const ouvintes = [['request', onReq], ['requestfinished', onFim], ['requestfailed', onFim], ['requestfailed', onFalha],
    ['pageerror', onPageErr], ['console', onConsole], ['response', onResp]];
  for (const [ev, fn] of ouvintes) page.on(ev, fn);
  let fase = 'DOM';
  try {
    await page.goto(`${BASE}/?${PARTIDA}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    fase = 'LIVE';
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
  } catch (e) {
    let dom = null, timer;
    try {
      dom = await Promise.race([
        page.evaluate(() => ({ state: String(window.__game?.state ?? '').slice(0, 100), readyState: document.readyState })),
        new Promise((r) => { timer = setTimeout(() => r('timeout-3s'), 3000); }),
      ]);
    } catch { dom = 'indisponível'; } finally { clearTimeout(timer); }
    // Amostra opcional só depois da falha; cada espera inclui o prazo do diagnóstico.
    let pilha = null, sess, timerPilha, timerLimpeza, expirou = false;
    const amostra = (async () => {
      sess = await ctx.newCDPSession(page);
      if (expirou) { void sess.detach().catch(() => {}); return null; }
      await sess.send('Debugger.enable');
      if (expirou) return null;
      const pausado = new Promise((res) => sess.once('Debugger.paused', res));
      await sess.send('Debugger.pause');
      const ev = await pausado;
      return (ev?.callFrames || []).slice(0, 10).map((f) => ({
        fn: cap(f.functionName).slice(0, 100), url: cap(String(f.url || '').split(/[?#]/)[0]),
        line: Number.isInteger(f.location?.lineNumber) ? f.location.lineNumber : null,
        column: Number.isInteger(f.location?.columnNumber) ? f.location.columnNumber : null,
      }));
    })().catch(() => null);
    try {
      pilha = await Promise.race([amostra, new Promise((r) => { timerPilha = setTimeout(() => r(null), 3000); })]);
    } finally { expirou = true; clearTimeout(timerPilha); }
    if (sess) {
      try {
        await Promise.race([
          Promise.allSettled([sess.send('Debugger.resume'), sess.detach()]),
          new Promise((r) => { timerLimpeza = setTimeout(r, 2000); }),
        ]);
      } catch { /* diagnóstico nunca substitui a falha original */ }
      finally { clearTimeout(timerLimpeza); }
    }
    const dados = { fase, erro: cap(e?.message), pendentes: [...pend], erros, http, dom, pilha };
    while (Buffer.byteLength(JSON.stringify(dados)) > 8000) {
      if (dados.pendentes.length) dados.pendentes.pop();
      else if (dados.erros.length) dados.erros.pop();
      else if (dados.http.length) dados.http.pop();
      else if (dados.pilha?.length) dados.pilha.pop();
      else break;
    }
    console.log('TP_BOOT_DIAGNOSTIC ' + JSON.stringify(dados));
    try { await ctx.close(); } catch { /* preserva a falha original */ }
    try { await browser.close(); } catch { /* só o browser criado por este teste */ }
    throw e;
  } finally {
    for (const [ev, fn] of ouvintes) page.off(ev, fn);
  }
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('crash-overlay')?.remove());
  return { page, fechar: () => ctx.close() };
}

/* ---- AN1–AN3: até 8 bots; cada cláusula usa um rig que consiga exercê-la ---- */
const { page, fechar } = await abrir();
const m = await page.evaluate(async () => {
  const g = window.__game;
  const T = await import('/vendor/three.module.js');
  const { buildCharacterModel } = await import('/js/glbchars.js');
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const cand = (g.bots || []).filter(x => x.mesh?.ctrl?.ikL && x.mesh?.ctrl?.torso?.spines?.length && x.alive).slice(0, 8);
  const medidos = [];
  for (const b of cand) {
    // Corpos reais gêmeos isolam a recarga do tiro/lean anterior do bot vivo.
    const medido = buildCharacterModel(b.def, { weaponId: b.weapon });
    const controle = buildCharacterModel(b.def, { weaponId: b.weapon });
    if (!medido || !controle) throw new Error(`sem par de controle para ${b.def.id}`);
    for (const corpo of [medido, controle]) {
      corpo.group.position.copy(b.mesh.group.position);
      corpo.group.quaternion.copy(b.mesh.group.quaternion);
      corpo.ctrl.lod = b.mesh.ctrl.lod;
      corpo.ctrl.aimPitch = b.mesh.ctrl.aimPitch;
    }
    const ctrl = medido.ctrl, grupo = medido.group, torso = ctrl.torso;
    let cabeca = null; grupo.traverse(o => { if (!cabeca && o.isBone && /head/i.test(o.name)) cabeca = o; });
    const maoEsq = torso.lHand || ctrl.ikL.end;
    const roda = (n, lat = 0) => { for (let i = 0; i < n; i++) ctrl.update(1 / 60, 0, false, 0, false, lat); };
    const rodaControle = (n) => { for (let i = 0; i < n; i++) controle.ctrl.update(1 / 60, 0, false, 0, false, 0); };
    const pos = (osso) => { grupo.updateMatrixWorld(true); return osso.getWorldPosition(V()); };
    const direita = () => { const y = grupo.rotation.y; return V(Math.cos(y), 0, -Math.sin(y)); };
    const frente = () => { const y = grupo.rotation.y; return V(-Math.sin(y), 0, -Math.cos(y)); };
    roda(120); rodaControle(120);
    const base = { mao: pos(maoEsq), cabeca: pos(cabeca) };
    ctrl.reload(1.2); roda(36); rodaControle(36);
    const magAlvo = torso.gun.localToWorld(torso.magLocal.clone());
    const meio = { mao: pos(maoEsq), cabeca: pos(cabeca), k: ctrl.reloadK };
    roda(90); rodaControle(90);
    const fim = { mao: pos(maoEsq), cabeca: pos(cabeca), dur: ctrl._reloadDur };
    controle.group.updateMatrixWorld(true);
    const maoControle = (controle.ctrl.torso.lHand || controle.ctrl.ikL.end).getWorldPosition(V());
    roda(60, 3.5); const cabecaLean = pos(cabeca); const leanK = ctrl.leanK;
    roda(60, 0); const cabecaVolta = pos(cabeca);
    roda(30);
    const antesFlinch = pos(cabeca);
    ctrl.flinch({ x: 1, z: 0 }, 1); roda(6);
    const an6 = { picoCm: antesFlinch.distanceTo(pos(cabeca)) * 100 };
    roda(45); an6.voltaCm = antesFlinch.distanceTo(pos(cabeca)) * 100;
    ctrl.setCrouch(true); roda(12);
    ctrl.setMantle(0.5); roda(1);
    const an11 = { estado: ctrl.curName, tempo: ctrl.actions.jump?.time || 0 };
    ctrl.setMantle(null); roda(1);
    roda(24); ctrl.setCrouch(false); roda(12);
    ctrl.setAr(true); roda(40);
    const an8 = { noAr: ctrl.curName };
    ctrl.setAr(false); roda(4); an8.noPouso = ctrl.curName; roda(25);
    // AN9: o quadril fica para trás no giro de 2 rad e alcança. LOD 0 SOMENTE nesta
    // janela (restaurado ao LOD original do bot ao final); rig sem osso hips vira
    // FALHA visível — a seleção do rig acima é pelos critérios de contrato dos
    // candidatos, nunca pelo resultado do AN9.
    const an9 = { origLOD: ctrl.lod, hips: !!torso.hips };
    const finito = (x) => typeof x === 'number' && Number.isFinite(x);
    // Sem `|| 0`: NaN precisa aparecer como NaN, não virar zero.
    const lagAbs = () => { const l = ctrl.yawLag; return finito(l) ? Math.abs(l) : NaN; };
    if (an9.hips) {
      an9.prePrime = { yawLag: ctrl.yawLag ?? null, _yawAtraso: ctrl._yawAtraso ?? null };
      ctrl.lod = 0;
      roda(1); // prime no yaw antigo: estabelece _yawAtraso antes do giro
      const yaw0 = grupo.rotation.y;
      an9.antes = { yawLag: ctrl.yawLag ?? null, _yawAtraso: ctrl._yawAtraso ?? null };
      grupo.rotation.y = yaw0 + 2.0; roda(2); // giro de 2 rad em 2 ticks
      an9.lagImediato = lagAbs();
      an9.giro = { yawLag: ctrl.yawLag ?? null, _yawAtraso: ctrl._yawAtraso ?? null };
      roda(70); an9.lagDepois = lagAbs(); // 70 ticks para alcançar
      grupo.rotation.y = yaw0; roda(30); // restaura o yaw e observa o retorno
      an9.retorno = { yawLag: ctrl.yawLag ?? null, _yawAtraso: ctrl._yawAtraso ?? null };
      ctrl.lod = an9.origLOD; // restaura o LOD copiado do bot
      an9.bounded = ['antes', 'giro', 'retorno'].every((k) => finito(an9[k].yawLag) && finito(an9[k]._yawAtraso));
    } else { an9.lagImediato = NaN; an9.lagDepois = NaN; an9.semHips = true; }
    ctrl.die(); roda(90, 0); const morto0 = pos(cabeca); roda(30, 3.5); const mortoCom = pos(cabeca);
    const an1 = { foiCm: base.mao.distanceTo(meio.mao) * 100, aoPenteCm: meio.mao.distanceTo(magAlvo) * 100, basePenteCm: base.mao.distanceTo(magAlvo) * 100, voltouCm: fim.mao.distanceTo(maoControle) * 100, derivaIdleCm: maoControle.distanceTo(base.mao) * 100, kMeio: meio.k, durFim: fim.dur };
    const an2 = { quedaCm: (base.cabeca.y - meio.cabeca.y) * 100, frenteCm: Math.abs((meio.cabeca.clone().sub(base.cabeca)).dot(frente())) * 100, voltaCm: Math.abs((fim.cabeca.clone().sub(base.cabeca)).dot(frente())) * 100 };
    const an3 = { leanK, deslocCm: Math.abs((cabecaLean.clone().sub(base.cabeca)).dot(direita())) * 100, voltaCm: Math.abs((cabecaVolta.clone().sub(base.cabeca)).dot(direita())) * 100, mortoDeslocCm: Math.abs((mortoCom.clone().sub(morto0)).dot(direita())) * 100 };
    medidos.push({ charId: ctrl.charId, an1, an2, an3, an6, an8, an9, an11 });
    ctrl.mixer.stopAllAction(); controle.ctrl.mixer.stopAllAction();
  }
  if (!medidos.length) return { erro: 'sem bot com arma de 2 mãos' };
  const escolhe = (pred) => medidos.find(pred) || medidos[0];
  const m1 = escolhe((x) => x.an1.foiCm >= 8 && x.an1.aoPenteCm <= x.an1.basePenteCm - 10
    && x.an1.voltouCm <= 2 && x.an1.kMeio > 0.9 && x.an1.durFim === 0);
  const m2 = escolhe((x) => x.an2.frenteCm >= 5 && x.an2.voltaCm <= 1.5);
  const m3 = escolhe((x) => x.an3.leanK > 0.07 && x.an3.deslocCm >= 4
    && x.an3.voltaCm <= 1.5 && x.an3.mortoDeslocCm <= 0.5);
  const m6 = escolhe((x) => x.an6.picoCm >= 3 && x.an6.voltaCm <= 1.5);
  const m8 = escolhe((x) => x.an8.noAr === 'jump' && x.an8.noPouso === 'crouch');
  const m9 = escolhe((x) => x.an9.lagImediato >= 0.25 && x.an9.lagDepois <= 0.08);
  const m11 = escolhe((x) => x.an11 && x.an11.estado === 'jump' && x.an11.tempo > 0);
  return {
    charId: m1.charId,
    an1: m1.an1, an2: m2.an2, an3: m3.an3,
    an6: m6.an6, an8: m8.an8, an9: m9.an9,
    an11: m11.an11,
  };
});
// AN7 compara dois controladores reais no mesmo tempo: só A dispara. O delta do
// controle B desconta a animação natural, sem confundir o crossfade de AN11 com recuo.
const an7 = await page.evaluate(async () => {
  const g = window.__game;
  const bot = (g.bots || []).find(x => x.mesh?.ctrl?.ikL && x.mesh?.ctrl?.torso?.spines?.length && x.alive);
  if (!bot?.def) return { infra: 'sem bot com rig de 2 mãos' };
  const G = await import('/js/glbchars.js');
  const T = await import('/vendor/three.module.js');
  await G.preloadCharacterAssets([bot.def.id], { weapons: ['awp'] });
  const monta = () => G.buildCharacterModel(bot.def, { weaponId: 'awp' });
  const A = monta(), B = monta();
  if (!A?.ctrl?.headBone || !B?.ctrl?.headBone) return { infra: 'buildCharacterModel sem modelo/headBone (clipes ou _base ausentes)' };
  if (!A.ctrl.torso?.gun || !B.ctrl.torso?.gun) return { infra: 'controller sem arma montada' };
  if ([A, B].some(m => m.ctrl.torso.gun.name !== 'arma-glb')) return { infra: 'AWP real ausente; arma procedural não mede o contrato' };
  if (A.ctrl === B.ctrl || A.mixer === B.mixer || A.ctrl.actions.crouch === B.ctrl.actions.crouch) return { infra: 'controladores/mixers/actions compartilhados' };
  const ossosA = [], ossosB = [];
  A.group.traverse(o => { if (o.isBone) ossosA.push(o); });
  B.group.traverse(o => { if (o.isBone) ossosB.push(o); });
  if (!ossosA.length || ossosA.length !== ossosB.length || ossosA.some(o => ossosB.includes(o))) return { infra: 'ossos ausentes ou compartilhados' };
  const roda = (c) => c.update(1 / 60, false, false, 0, false, 0);
  for (const c of [A.ctrl, B.ctrl]) { c.setCrouch(true); for (let i = 0; i < 45; i++) roda(c); }
  const cabeca = (m) => { m.group.updateMatrixWorld(true); return m.ctrl.headBone.getWorldPosition(new T.Vector3()); };
  const a0 = cabeca(A), b0 = cabeca(B);
  if (A.ctrl.curName !== 'crouch' || B.ctrl.curName !== 'crouch' || a0.distanceTo(b0) > 1e-8 || A.mixer.time !== B.mixer.time) return { infra: 'par não sincronizado em crouch antes do tiro' };
  A.ctrl.shoot();
  for (let i = 0; i < 3; i++) { roda(A.ctrl); roda(B.ctrl); }
  const a1 = cabeca(A), b1 = cabeca(B);
  const finitos = [a0, a1, b0, b1].every((v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
  if (!finitos) return { infra: 'posição de cabeça não finita' };
  const recuoCm = a1.clone().sub(a0).sub(b1.clone().sub(b0)).length() * 100;
  return { charId: bot.def.id, weaponId: 'awp', tempo: A.mixer.time, recuoCm, controleCm: b1.distanceTo(b0) * 100, estadoA: A.ctrl.curName, estadoB: B.ctrl.curName };
});
await fechar();

/* ---- AN4: fiação no jogo (jogador 3P + bot colado no jogador) ---- */
const an4 = {};
if (MUT !== 'opcional-fantasma') {
  const { page: p2, fechar: f2 } = await abrir();
  an4.dados = await p2.evaluate(async () => {
    const g = window.__game;
    g.setCamView('third');
    g.update(1 / 60);
    const p = g.player, w = p.weapon;
    p.ammo[w] = { mag: 0, res: 30 };
    g._startReload();
    const jogadorRecarregando = (g.playerTP?.ctrl?._reloadDur || 0) > 0;
    const b = g.bots.find(x => x.mesh?.ctrl && x.alive && x.team !== g.playerTeam);
    b.mag = 0; b.nextShotAt = 0; b.reactAt = 0; b.focusUntil = 0; b.alertUntil = 0;
    b.target = g.player;
    b.pos.set(g.player.pos.x + 2.5, g.player.pos.y, g.player.pos.z); b.think = 0;
    let botRecarregou = false;
    for (let i = 0; i < 900 && !botRecarregou; i++) { g.update(1 / 60); botRecarregou = (b.mesh?.ctrl?._reloadDur || 0) > 0; }
    // AN10: cadência de animação cai com a distância (bot teleportado pra longe)
    const longe = g.bots.find(x => x.mesh?.ctrl && x.alive && x !== b) || b;
    longe.pos.set(g.player.pos.x + 80, longe.pos.y, g.player.pos.z + 80);
    let chamadasLonge = 0;
    const origLonge = longe.mesh.ctrl.update.bind(longe.mesh.ctrl);
    longe.mesh.ctrl.update = (...a) => { chamadasLonge++; return origLonge(...a); };
    const perto = g.bots.find(x => x.mesh?.ctrl && x.alive && x !== longe) || b;
    perto.pos.set(g.player.pos.x + 3, perto.pos.y, g.player.pos.z + 3);
    let chamadasPerto = 0;
    const origPerto = perto.mesh.ctrl.update.bind(perto.mesh.ctrl);
    perto.mesh.ctrl.update = (...a) => { chamadasPerto++; return origPerto(...a); };
    for (let i = 0; i < 120; i++) g.update(1 / 60);
    const lodLonge = longe.mesh.ctrl.lod;
    return { jogadorRecarregando, botRecarregou, armaBot: b.weapon, chamadasLonge, chamadasPerto, lodLonge };
  });
  await f2();
}

/* ---- AN5: manifesto de clipes ---- */
const BASE_OBRIGATORIOS = ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump'];
const OPCIONAIS_REGISTRADOS = ['ue2'];
const manifesto = JSON.parse(readFileSync('public/models/anims/index.json', 'utf8'));
const clipes = MUT === 'opcional-fantasma'
  ? { ...manifesto.clipes, fantasma: BASE_OBRIGATORIOS.slice(0, 7) }
  : manifesto.clipes;
const nomes = Object.keys(clipes);
const semBase = nomes.filter((k) => BASE_OBRIGATORIOS.some((c) => !clipes[k].includes(c)));
const semOpcional = nomes.filter((k) => !manifesto.opcionais.every((c) => clipes[k].includes(c)));

const r = [];
const cobra = (id, ok, msg) => r.push({ id, ok: !!ok, msg });

if (m.erro) {
  cobra('AN1', false, `AN1 · ${m.erro}`);
  cobra('AN2', false, `AN2 · ${m.erro}`);
  cobra('AN3', false, `AN3 · ${m.erro}`);
} else {
  cobra('AN1', m.an1.foiCm >= 8 && m.an1.aoPenteCm <= m.an1.basePenteCm - 10 && m.an1.voltouCm <= 2 && m.an1.kMeio > 0.9 && m.an1.durFim === 0,
    `AN1 · ${m.charId}: mão esquerda foi ${m.an1.foiCm.toFixed(1)} cm, de ${m.an1.basePenteCm.toFixed(1)} cm do pente a ${m.an1.aoPenteCm.toFixed(1)} cm, e voltou a ${m.an1.voltouCm.toFixed(2)} cm do controle sem recarga (idle ${m.an1.derivaIdleCm.toFixed(2)} cm)`);
  cobra('AN2', m.an2.frenteCm >= 5 && m.an2.voltaCm <= 1.5,
    `AN2 · o mergulho levou a cabeça ${m.an2.frenteCm.toFixed(1)} cm à frente (e ${m.an2.quedaCm.toFixed(1)} cm abaixo) no pico, e ela voltou a ${m.an2.voltaCm.toFixed(2)} cm da posição original`);
  cobra('AN3', m.an3.leanK > 0.07 && m.an3.deslocCm >= 4 && m.an3.voltaCm <= 1.5 && m.an3.mortoDeslocCm <= 0.5,
    `AN3 · lateral 3,5 m/s: cabeça deslocou ${m.an3.deslocCm.toFixed(1)} cm (leanK ${m.an3.leanK.toFixed(3)}), voltou a ${m.an3.voltaCm.toFixed(2)} cm sem lateral; morto deslocou ${m.an3.mortoDeslocCm.toFixed(2)} cm`);
}
if (an7.infra) {
  await browser.close(); servidor?.kill();
  console.log(`AN7 · INFRA SEM VEREDICTO — ${an7.infra}`);
  process.exit(2);
}
if (!m.erro) {
  cobra('AN6', m.an6.picoCm >= 3 && m.an6.voltaCm <= 1.5,
    `AN6 · levar tiro moveu a cabeça ${m.an6.picoCm.toFixed(1)} cm no eixo do disparo e ela voltou a ${m.an6.voltaCm.toFixed(2)} cm`);
  cobra('AN7', an7.recuoCm >= 0.5 && /crouch/.test(an7.estadoA || '') && /crouch/.test(an7.estadoB || ''),
    `AN7 · ${an7.charId}/${an7.weaponId} t=${an7.tempo.toFixed(3)}: recuo causal ${an7.recuoCm.toFixed(2)} cm; controle ${an7.controleCm.toFixed(2)} cm (A ${an7.estadoA}, B ${an7.estadoB})`);
  cobra('AN8', m.an8.noAr === 'jump' && m.an8.noPouso === 'crouch',
    `AN8 · no ar o estado é ${m.an8.noAr} (não locomoção) e o pouso amortece em ${m.an8.noPouso}`);
  cobra('AN9', m.an9.hips && m.an9.bounded && m.an9.lagImediato >= 0.25 && m.an9.lagDepois <= 0.08,
    `AN9 · giro de 2 rad deixou o quadril ${Number.isFinite(m.an9.lagImediato) ? m.an9.lagImediato.toFixed(2) : 'NaN'} rad atrás e ele alcançou em ${Number.isFinite(m.an9.lagDepois) ? m.an9.lagDepois.toFixed(3) : 'NaN'} rad (origLOD ${m.an9.origLOD}, hips ${m.an9.hips}, bounded ${!!m.an9.bounded}, prePrime ${JSON.stringify(m.an9.prePrime ?? null)}, antes ${JSON.stringify(m.an9.antes ?? null)}, giro ${JSON.stringify(m.an9.giro ?? null)}, retorno ${JSON.stringify(m.an9.retorno ?? null)})`);
  cobra('AN11', m.an11.estado === 'jump' && m.an11.tempo > 0,
    `AN11 · mantle vence o agachamento na pose ${m.an11.estado}, com tempo ${m.an11.tempo.toFixed(3)} s`);
}
if (an4.dados) {
  cobra('AN4', an4.dados.jogadorRecarregando && an4.dados.botRecarregou,
    `AN4 · jogador em 3ª pessoa ${an4.dados.jogadorRecarregando ? 'denuncia' : 'NÃO denuncia'} a recarga; bot com pente vazio ${an4.dados.botRecarregou ? 'denuncia' : 'NÃO denuncia'} (${an4.dados.armaBot})`);
}
if (an4.dados && an4.dados.chamadasPerto !== undefined) {
  cobra('AN10', an4.dados.chamadasLonge > 0 && an4.dados.chamadasLonge <= an4.dados.chamadasPerto * 0.6 && an4.dados.lodLonge >= 1,
    `AN10 · em 2 s o bot longe animou ${an4.dados.chamadasLonge}× contra ${an4.dados.chamadasPerto}× do bot perto (LOD ${an4.dados.lodLonge})`);
}
cobra('AN5', semBase.length === 0 && semOpcional.every((k) => OPCIONAIS_REGISTRADOS.includes(k)),
  `AN5 · ${nomes.length} personagens com os 8 clipes base${semBase.length ? ` — FALTANDO: ${semBase.join(', ')}` : ''}; sem os opcionais: ${semOpcional.length ? semOpcional.join(', ') : 'nenhum'} (registrados: ${OPCIONAIS_REGISTRADOS.join(', ') || 'nenhum'})`);

for (const c of r) console.log(`  ${c.ok ? 'ok  ' : 'FALHA'} ${c.msg}`);
const falhou = r.filter((c) => !c.ok).map((c) => c.id);
await browser.close();
servidor?.kill();

if (MUT) {
  const esperado = ESPERADO[MUT];
  const morde = falhou.length >= 1 && falhou.every((f) => esperado.includes(f));
  console.log(morde ? `\nmutante ${MUT} reprovado como devia (${esperado.join('+')})` : `\nMUTAÇÃO PASSOU — ${MUT} não acendeu ${esperado.join('+')} (falhas: ${falhou.join(', ') || 'nenhuma'})`);
  process.exit(morde ? 0 : 1);
}
console.log(`\n${falhou.length ? 'REPROVADO' : 'APROVADO'} — animação 3P: ${r.length - falhou.length}/${r.length}`);
process.exit(falhou.length ? 1 : 0);
