// Gate de LOCOMOTION 1P do viewmodel autorado (P3 da METRICA): bob/sway ligados à
// velocidade real, ADS com zero exato e sem deriva. Procedência dos números, leis
// e histórico RED/GREEN em docs/visual-consistency/MOVIMENTO-1P.md.
globalThis.window = {
  location: { search: '?vmauthored=1&vmready=deagle,revolver&vmweapon=deagle,revolver38' },
};
const THREE = await import('three');
const { AuthoredViewModels } = await import('../../public/js/authoredvm.js');
const { VM_TIMES, ViewModelRig } = await import('../../public/js/springs.js');
const { readFile } = await import('node:fs/promises');

const DT = 1 / 60;
// Violação de finitude A CADA update (P2-3 da R3): NaN saneado no frame seguinte conta.
const SUJOS = [];
function auditMounts(vm, tag) {
  for (const [key, entry] of vm.entries) {
    for (const [prop, eixos] of [['position', 'xyz'], ['scale', 'xyz'], ['quaternion', 'xyzw']])
      for (const eixo of eixos)
        if (!Number.isFinite(entry.mount[prop][eixo])) SUJOS.push(`${tag}:${key}.${prop}.${eixo}`);
  }
}
// Todo update da régua passa POR AQUI: finitude de TODOS os mounts (position/
// quaternion/scale) auditada imediatamente após cada update, sem exceção.
const upd = (vm, dt, ctx) => { vm.update(dt, ctx); auditMounts(vm, 'rule'); };
const WALK = { speed: 6.6, grounded: true, moving: true };
const STOP = { speed: 0, grounded: true, moving: false };
const AMP = { y: 0.010, x: 0.008, rz: 0.030 };
const FRAME = { x: 0.1, y: -0.05, z: -0.3 };
// Tolerância numérica ULP (não visual): os offsets compostos no mount valem até
// |frame.x|+|frame.y|+AMP.y no fixture; 64 EPSILON cobre o arredondamento da cadeia.
const TOL = 64 * Number.EPSILON * (Math.abs(FRAME.x) + Math.abs(FRAME.y) + AMP.y);
const RATE = Math.exp(-DT / VM_TIMES.bobStopTau);

function fixture(Runtime) {
  const vm = new Runtime();
  vm.entries = new Map();
  vm.profile = {};
  vm.weapon = 'deagle';
  vm._time = 0;
  vm.adsAmount = 0;
  vm.recoil = { update: () => ({ px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, pivot: [0, 0, 0] }) };
  const mount = new THREE.Group(), bone = new THREE.Bone();
  bone.name = 'hand';
  mount.add(bone);
  // Arma simulada: filho rígido do mount — prova que o pacote mão+arma anda junto.
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.18), new THREE.MeshBasicMaterial());
  gun.name = 'gun';
  gun.position.set(0.015, 0.004, -0.09);
  mount.add(gun);
  mount.visible = true;
  const clip = (name, end) => new THREE.AnimationClip(name, 0.2, [
    new THREE.VectorKeyframeTrack('hand.position', [0, 0.2], [end, 0, 0, end, 0, 0]),
  ]);
  const entry = { key: 'deagle#deagle', family: 'deagle', weapon: 'deagle', mount, scene: mount, bone,
    mixer: new THREE.AnimationMixer(mount),
    clips: new Map([['idle', clip('Idle', 2)], ['reload_empty', clip('ReloadEmpty', 8)], ['reload_tactical', clip('ReloadTac', 8)]]),
    queue: [], serial: 0, frame: { ...FRAME, rotDeg: [0, 0, 0] },
    drawTime: 1, drawDuration: 0.32, state: 'idle', stateUntil: 0, shootCycle: 0 };
  entry.mixer.addEventListener('finished', (event) => {
    if (event.action === entry.action) vm._continue(entry);
  });
  vm.entries.set(entry.key, entry);
  vm._idle(entry);
  return vm;
}

// Granada em porte/arremesso (P2 da revisão) + segunda arma para a troca DURANTE o
// porte (P3 #5): entradas diff weapon e held no mesmo runtime.
function utilityFixture(Runtime) {
  const vm = fixture(Runtime);
  const arma = (key, weapon, frame) => {
    const mount = new THREE.Group(), bone = new THREE.Bone();
    bone.name = 'hand';
    mount.add(bone);
    mount.visible = false;
    const clip = (name, end) => new THREE.AnimationClip(name, 0.2, [
      new THREE.VectorKeyframeTrack('hand.position', [0, 0.2], [end, 0, 0, end, 0, 0]),
    ]);
    const entry = { key, family: key.split('#')[0], weapon, mount, scene: mount, bone,
      mixer: new THREE.AnimationMixer(mount), clips: new Map([['idle', clip('Idle', 8)]]),
      queue: [], serial: 0, frame, drawTime: 1, drawDuration: 0.32,
      state: 'idle', stateUntil: 0, shootCycle: 0 };
    entry.mixer.addEventListener('finished', (event) => {
      if (event.action === entry.action) vm._continue(entry);
    });
    vm.entries.set(key, entry);
    vm._idle(entry);
    return entry;
  };
  arma('revolver#revolver38', 'revolver38', { x: 0.12, y: -0.05, z: -0.3, rotDeg: [0, 0, 0] });
  const mount = new THREE.Group(), bone = new THREE.Bone();
  bone.name = 'hand';
  mount.add(bone);
  mount.visible = false;
  const clip = (name, end) => new THREE.AnimationClip(name, 0.2, [
    new THREE.VectorKeyframeTrack('hand.position', [0, 0.2], [end, 0, 0, end, 0, 0]),
  ]);
  const entry = { key: 'grenade', family: 'grenade', weapon: 'grenade', mount, scene: mount, bone,
    mixer: new THREE.AnimationMixer(mount),
    clips: new Map([['idle', clip('Idle', -1)],
      ...['throw_start', 'throw_loop', 'throw_end'].map((name) => [name, clip(name, 8)])]),
    queue: [], serial: 0, frame: { x: 0.05, y: -0.02, z: -0.28, rotDeg: [1, 2, 3] },
    drawTime: 1, drawDuration: 0.32, state: 'idle', stateUntil: 0, shootCycle: 0,
    utilityModels: new Map([['he', new THREE.Group()]]) };
  entry.mixer.addEventListener('finished', (event) => {
    if (event.action === entry.action) vm._continue(entry);
  });
  vm.entries.set('grenade', entry);
  vm._idle(entry);
  return vm;
}

function run(vm, frames, ctx, ads = 0) {
  vm.setAim('deagle', ads);
  for (let i = 0; i < frames; i += 1) { vm.update(DT, { sway: null, ...ctx }); auditMounts(vm, 'run'); }
  return { x: vm.entry().mount.position.x, y: vm.entry().mount.position.y,
    rz: vm.entry().mount.rotation.z };
}

const saturar = (Runtime, ctx, ads = 0) => run(fixture(Runtime), 400, ctx, ads); // ~6,7 s: envelope no teto/chão

function audit(Runtime) {
  SUJOS.length = 0;
  const checks = [];
  const check = (name, ok, detail = '') => checks.push({ name, ok, detail: String(detail) });
  const near = (a, b, eps) => Math.abs(a - b) <= eps;

  // A · CAUSAL: offset do gait == input composto (ganhos do legado) em duas fases.
  {
    const vm = fixture(Runtime);
    const parado = run(vm, 400, STOP);
    const fase1 = run(vm, 400, { ...WALK, stepPhase: 0.7 });
    const fase2 = run(vm, 1, { ...WALK, stepPhase: 2.9 });
    const esp = (ph, eixo) => Math.sin(eixo === 'y' ? ph * 2 : ph) * AMP[eixo];
    for (const eixo of ['y', 'x', 'rz']) {
      const d1 = fase1[eixo] - parado[eixo], d2 = fase2[eixo] - parado[eixo];
      check(`gait-causal-${eixo}`, near(d1, esp(0.7, eixo), 1e-6) && near(d2, esp(2.9, eixo), 1e-6),
        `fase0.7=${d1.toFixed(6)} esperado ${esp(0.7, eixo).toFixed(6)}; fase2.9=${d2.toFixed(6)} esperado ${esp(2.9, eixo).toFixed(6)} — andar sem mover o pacote (ctx não consumido?)`);
    }
  }

  // B · SEM ACÚMULO: frames idênticos → transform idêntico (offset aditivo sobre
  // composição absoluta, não += persistente).
  {
    const vm = fixture(Runtime);
    run(vm, 400, { ...WALK, stepPhase: 0.7 });
    const a = run(vm, 1, { ...WALK, stepPhase: 0.7 });
    const b = run(vm, 1, { ...WALK, stepPhase: 0.7 });
    check('sem-acumulo', a.x === b.x && a.y === b.y && a.rz === b.rz,
      `frame1 y=${a.y.toFixed(9)} frame2 y=${b.y.toFixed(9)} — deriva acumulada entre frames`);
  }

  // C · ADS COMPLETO: gait ZERO exato — walking ≡ parado (mira não anda no fim).
  {
    const vm = fixture(Runtime);
    const parado = run(vm, 400, STOP, 1);
    const andando = run(vm, 400, { ...WALK, stepPhase: 2.9 }, 1);
    check('ads-completo-zero', parado.x === andando.x && parado.y === andando.y && parado.rz === andando.rz,
      `parado y=${parado.y.toFixed(9)} andando y=${andando.y.toFixed(9)} — gait desloca a mira em ADS cheio`);
  }

  // D · ADS PARCIAL REDUZ: contribuição do gait a ads=0,5 é metade da de ads=0.
  {
    const vm = fixture(Runtime);
    const base0 = run(vm, 400, STOP, 0), cheio = run(vm, 400, { ...WALK, stepPhase: 0.9 }, 0);
    const baseH = run(vm, 400, STOP, 0.5), meio = run(vm, 400, { ...WALK, stepPhase: 0.9 }, 0.5);
    const full = cheio.y - base0.y, half = meio.y - baseH.y;
    check('ads-parcial-reduz', Math.abs(half) > 1e-6 && Math.abs(full) > Math.abs(half)
      && near(half, full * 0.5, 1e-6),
      `cheio=${full.toFixed(6)} meio=${half.toFixed(6)} — ADS parcial não reduz o motion na razão (1-ads)`);
  }

  // E · LEI DO ENVELOPE NA PARADA (invariante matemática, sem teto visual): com
  // fase constante, cada frame de parada decai o offset EXATAMENTE por
  // exp(-DT/VM_TIMES.bobStopTau) — tolerância ULP, monotonicidade estrita e
  // concordância com a forma fechada RATE^N (nenhuma acumulação).
  {
    const vm = fixture(Runtime);
    const parado = run(vm, 400, STOP);
    run(vm, 400, { ...WALK, stepPhase: 0.9 });
    const off = () => vm.entry().mount.position.y - parado.y;
    const N = 90;
    const off0 = off();
    let prev = off0, mono = true, maxDev = 0, worst = 0;
    for (let i = 0; i < N; i += 1) {
      upd(vm, DT, { sway: null, ...STOP, stepPhase: 0.9 });
      const o = off();
      if (!(Math.abs(o) < Math.abs(prev))) mono = false;
      const dev = Math.abs(o - prev * RATE);
      if (dev > maxDev) { maxDev = dev; worst = i; }
      prev = o;
    }
    const fechada = Math.abs(prev - off0 * Math.pow(RATE, N));
    check('parada-lei-envelope', mono && maxDev <= TOL && fechada <= N * TOL,
      `mono=${mono} maxDev=${maxDev.toExponential(3)} (tols ULP ${TOL.toExponential(3)}) no frame ${worst}; forma fechada dev=${fechada.toExponential(3)} (teto ${N * TOL.toExponential(3)}) — envelope não decai em exp(-dt/bobStopTau)`);
  }

  // F · RELOAD NÃO PERDE ESTADO: com gait ativo o clipe toca, termina e volta ao
  // idle em pose — e o gait segue causal depois.
  {
    const vm = fixture(Runtime);
    run(vm, 400, { ...WALK, stepPhase: 0.7 });
    const tocado = vm.reload('deagle', 0.3);
    let estado = '';
    for (let i = 0; i < 40; i += 1) upd(vm, DT, { sway: null, ...WALK, stepPhase: 0.7 });
    const entry = vm.entry();
    estado = `${entry.state}/${entry.queue.length}/${entry.action.getClip().name}`;
    const depois = run(vm, 400, { ...WALK, stepPhase: 0.7 });
    const parado = run(vm, 400, STOP);
    const esperado = Math.sin(1.4) * AMP.y;
    check('reload-integro', tocado && estado === 'idle/0/Idle'
      && near(depois.y - parado.y, esperado, 1e-6),
      `tocou=${tocado} estado=${estado} gaitPós=${(depois.y - parado.y).toFixed(6)} esperado=${esperado.toFixed(6)} — reload/utility deixou estado perdido`);
  }

  // G · SWAY SÓ PELAS MOLAS: ctx.sway carrega um POSION pos/rot (agregado do rig
  // com reload/draw). Consumir o agregado move o mount; só swayX/Y/R.value não.
  {
    const vm = fixture(Runtime);
    const sem = run(vm, 400, STOP);
    const molas = { swayX: { value: 0.012 }, swayY: { value: -0.006 }, swayR: { value: 0.03 },
      pos: { x: 0.05, y: 0.02, z: 0.04 }, rot: { x: 0.1, y: 0.2, z: 0.3 } };
    const com = run(vm, 400, { ...STOP, sway: molas });
    check('sway-so-molas', near(com.x - sem.x, 0.012, 1e-9) && near(com.y - sem.y, -0.006, 1e-9)
      && near(com.rz - sem.rz, 0.03, 1e-9),
      `dx=${(com.x - sem.x).toFixed(6)} dy=${(com.y - sem.y).toFixed(6)} drz=${(com.rz - sem.rz).toFixed(6)} — aplicou rg.pos/rot agregado (camada dupla de reload/draw/recoil)`);
  }

  // H · SWAY PARCIAL CAUSAL com rig REAL (redução parcial, não só ADS=1): um só
  // ViewModelRig evolui e alimenta 4 views — ads 0/0.5 com e sem sway. Parado o
  // gait é zero: a diferença isola o sway, que tem que valer valor·(1-ads).
  {
    const vm0 = fixture(Runtime), vmH = fixture(Runtime), vmN = fixture(Runtime), vmNH = fixture(Runtime);
    const rig = new ViewModelRig();
    let maxDev = 0, eixo = '', swayMax = 0;
    for (let i = 0; i < 90; i += 1) {
      rig.update(DT, { speed: 0, grounded: true, lookDX: 0.05 * Math.sin(i * 0.3), lookDY: 0.02 });
      swayMax = Math.max(swayMax, Math.abs(rig.swayX.value));
      const ctx = { sway: rig, ...STOP, stepPhase: 0.9 };
      vm0.setAim('deagle', 0); vm0.update(DT, ctx);
      vmH.setAim('deagle', 0.5); vmH.update(DT, ctx);
      vmN.setAim('deagle', 0); vmN.update(DT, { ...ctx, sway: null });
      vmNH.setAim('deagle', 0.5); vmNH.update(DT, { ...ctx, sway: null });
      const pares = [
        ['x', vm0.entry().mount.position.x - vmN.entry().mount.position.x, rig.swayX.value, 1],
        ['x', vmH.entry().mount.position.x - vmNH.entry().mount.position.x, rig.swayX.value, 0.5],
        ['y', vmH.entry().mount.position.y - vmNH.entry().mount.position.y, rig.swayY.value, 0.5],
        ['rz', vmH.entry().mount.rotation.z - vmNH.entry().mount.rotation.z, rig.swayR.value, 0.5],
      ];
      for (const [ax, obtido, valor, env] of pares) {
        if (!Number.isFinite(obtido) || !Number.isFinite(valor * env)) { maxDev = Infinity; eixo = `${ax}@${env}:NAO-FINITO`; continue; }
        const dev = Math.abs(obtido - valor * env);
        if (dev > maxDev) { maxDev = dev; eixo = `${ax}@${env}`; }
      }
      auditMounts(vm0, 'H'); auditMounts(vmH, 'H'); auditMounts(vmN, 'H'); auditMounts(vmNH, 'H');
    }
    check('sway-parcial-causal', swayMax > AMP.x && maxDev <= TOL,
      `swayMax=${swayMax.toFixed(4)} maxDev=${maxDev.toExponential(3)} (${eixo}, tols ${TOL.toExponential(3)}) — sway não aplica o envelope contínuo (1-ads) na redução parcial`);
  }

  // I · ADS COM RIG REAL ATÉ 1 (mira estável no fim): giro carrega as molas,
  // transição de ADS sobe (rampa dt/0.11 do game.js:7194) e no fim o pacote
  // gait+sway tem que dar ZERO EXATO — pose idêntica à corrida que nunca girou.
  {
    const cena = (rotaciona) => {
      const vm = fixture(Runtime);
      const rig = new ViewModelRig();
      let phase = 0.9;
      const frame = (ads, look) => {
        rig.update(DT, { speed: WALK.speed, grounded: true,
          lookDX: look ? 0.04 : 0, lookDY: look ? 0.01 : 0 });
        vm.setAim('deagle', ads);
        upd(vm, DT, { sway: rig, ...WALK, stepPhase: phase });
        phase += 0.115;
      };
      for (let i = 0; i < 60; i += 1) frame(0, rotaciona);
      rig.setAds(true);
      let adsF = 0;
      for (let i = 0; i < 7; i += 1) {
        adsF = Math.min(1, adsF + DT / 0.11);
        const a = adsF * adsF * (3 - 2 * adsF);
        frame(a, false);
      }
      for (let i = 0; i < 5; i += 1) frame(1, false);
      const m = vm.entry().mount;
      return { x: m.position.x, y: m.position.y, rz: m.rotation.z };
    };
    const girado = cena(true), calmo = cena(false);
    const dx = girado.x - calmo.x, dy = girado.y - calmo.y, drz = girado.rz - calmo.rz;
    check('ads-rig-real-zero', dx === 0 && dy === 0 && drz === 0,
      `dx=${dx.toExponential(3)} dy=${dy.toExponential(3)} drz=${drz.toExponential(3)} — resíduo das molas de sway desloca a mira com ADS cheio (envelope (1-ads) falta no sway)`);
  }

  // J · PACOTE RÍGIDO: filho (arma) cola no mount durante o gait — offset local
  // invariante sob a rotação do mount, sem rotação relativa, com mount em movimento.
  {
    const vm = fixture(Runtime);
    const mount = vm.entry().mount, gun = mount.getObjectByName('gun');
    const local0 = gun.position.clone();
    const parado = run(vm, 400, STOP);
    run(vm, 400, { ...WALK, stepPhase: 0.7 });
    let maxDrift = 0, maxRot = 0, yMin = Infinity, yMax = -Infinity;
    const gw = new THREE.Vector3(), mw = new THREE.Vector3(), q = new THREE.Quaternion();
    for (let i = 0; i < 60; i += 1) {
      upd(vm, DT, { sway: null, ...WALK, stepPhase: 0.7 + i * 0.11 });
      gun.getWorldPosition(gw); mount.getWorldPosition(mw);
      mount.getWorldQuaternion(q);
      const local = gw.sub(mw).applyQuaternion(q.clone().invert());
      maxDrift = Math.max(maxDrift, local.distanceTo(local0));
      // Rotação relativa pela MATRIZ (angleTo amplifica ~sqrt(eps) perto de 1):
      // filho sem rotação local ⇒ bloco de rotação idêntico, elemento a elemento.
      const eg = gun.matrixWorld.elements, em = mount.matrixWorld.elements;
      for (const k of [0, 1, 2, 4, 5, 6, 8, 9, 10]) maxRot = Math.max(maxRot, Math.abs(eg[k] - em[k]));
      yMin = Math.min(yMin, mount.position.y); yMax = Math.max(yMax, mount.position.y);
    }
    check('filho-rigido-gait', yMax - yMin > AMP.y / 2 && maxDrift <= TOL && maxRot <= TOL,
      `excursão do mount y=${((yMax - yMin)).toFixed(6)} (mín AMP.y/2) drift=${maxDrift.toExponential(3)} rot=${maxRot.toExponential(3)} — filho arma/mão não acompanha o mount rigidamente`);
  }

  // K · GRANADA EM PORTE/ARREMESSO SEM LOCOMOTION (P2: o held recebia gait/sway e o
  // arremesso congelava o offset por ~1,05 s até saltar no retorno — MOVIMENTO-1P inv. 9).
  {
    const MOLAS = { swayX: { value: 0.012 }, swayY: { value: -0.006 }, swayR: { value: 0.03 } };
    const LIMPO = { x: 0.05, y: -0.02, rz: 3 * (Math.PI / 180) };
    const poseDe = (entry) => ({ x: entry.mount.position.x, y: entry.mount.position.y,
      rz: entry.mount.rotation.z });
    const noLimpo = (p) => p.x === LIMPO.x && p.y === LIMPO.y && p.rz === LIMPO.rz;
    for (const fase of [0.7, 2.9]) {
      const vm = utilityFixture(Runtime);
      if (!vm.holdUtility('frag')) throw new Error('holdUtility falhou no fixture');
      const gren = vm.entries.get('grenade');
      for (let i = 0; i < 400; i += 1) upd(vm, DT, { sway: MOLAS, ...WALK, stepPhase: fase });
      const p = poseDe(gren);
      check(`granada-held-sem-locomotion-fase${fase}`, noLimpo(p),
        `held fase ${fase}: x=${p.x} y=${p.y} rz=${p.rz} esperado exato x=${LIMPO.x} y=${LIMPO.y} rz=${LIMPO.rz} — porte de granada carregando gait/sway`);
    }
    {
      const vm = utilityFixture(Runtime);
      const gren = vm.entries.get('grenade');
      vm.holdUtility('frag');
      let fase = 0.7, lancamentos = 0, pior = 0, salto = 0, anterior = null;
      for (let i = 0; i < 200; i += 1) { upd(vm, DT, { sway: MOLAS, ...WALK, stepPhase: fase }); fase += 0.115; }
      if (!vm.throwUtility('frag', 1.05, () => { lancamentos += 1; })) throw new Error('throwUtility falhou');
      for (let i = 0; i < 90; i += 1) {
        upd(vm, DT, { sway: MOLAS, ...WALK, stepPhase: fase });
        fase += 0.115;
        const p = poseDe(gren);
        pior = Math.max(pior, Math.abs(p.x - LIMPO.x), Math.abs(p.y - LIMPO.y), Math.abs(p.rz - LIMPO.rz));
        if (anterior) salto = Math.max(salto, Math.abs(p.x - anterior.x), Math.abs(p.y - anterior.y), Math.abs(p.rz - anterior.rz));
        anterior = p;
      }
      check('granada-throw-sem-offset', lancamentos === 1 && vm.utility === null
        && vm.held && gren.mount.visible && pior === 0 && salto === 0,
        `release=${lancamentos} utility=${vm.utility ? 'ativo' : 'null'} held=${Boolean(vm.held)} visivel=${gren.mount.visible} pior=${pior} salto=${salto} — offset congelado no arremesso e/ou saltando no retorno`);
    }
  }

  // L · MOUNTS FINITOS (irmão do P2 #2): position/quaternion/scale de todos os
  // mounts finitos após o pior caminho — andar, porte, troca durante o porte, arremesso e retorno.
  {
    const vm = utilityFixture(Runtime);
    run(vm, 60, { ...WALK, stepPhase: 0.7 });
    if (!vm.holdUtility('frag')) throw new Error('holdUtility falhou no fixture');
    vm.setWeapon('revolver38');
    run(vm, 30, { ...WALK, stepPhase: 1.9 });
    if (!vm.throwUtility('frag', 0.3, () => {})) throw new Error('throwUtility falhou no fixture');
    run(vm, 60, { ...WALK, stepPhase: 2.2 });
    if (!vm.releaseUtility()) throw new Error('releaseUtility falhou no fixture');
    upd(vm, DT, { sway: null, ...STOP });
    const alvos = [['position', 'xyz'], ['scale', 'xyz'], ['quaternion', 'xyzw']];
    const sujos = [];
    for (const [key, entry] of vm.entries) for (const [prop, eixos] of alvos) for (const eixo of eixos)
      if (!Number.isFinite(entry.mount[prop][eixo])) sujos.push(`${key}.${prop}.${eixo}`);
    check('mounts-finitos', sujos.length === 0, sujos.join(' ') || 'andar/porte/troca/arremesso/retorno todos finitos');
  }

  // M · TROCA DE ARMA DURANTE O PORTE COM GAIT ATIVO (interseção troca×utility×gait,
  // P3 #5 da revisão): parar durante o porte e devolver tem que recompor a arma NOVA
  // na pose de parado exata — o envelope decai no porte; offset do último passo não congela.
  {
    const vm = utilityFixture(Runtime);
    vm.setWeapon('revolver38');
    const parado = run(vm, 400, STOP);
    vm.setWeapon('deagle');
    run(vm, 400, { ...WALK, stepPhase: 0.7 });
    if (!vm.holdUtility('frag')) throw new Error('holdUtility falhou no fixture');
    vm.setWeapon('revolver38');
    run(vm, 120, { ...WALK, stepPhase: 1.9 });
    run(vm, 400, { ...STOP, stepPhase: 1.9 });
    vm.releaseUtility();
    upd(vm, DT, { sway: null, ...STOP, stepPhase: 1.9 });
    const m = vm.entry().mount;
    const dev = Math.max(Math.abs(m.position.x - parado.x), Math.abs(m.position.y - parado.y),
      Math.abs(m.rotation.z - parado.rz));
    check('troca-durante-porte-sem-offset', vm.weapon === 'revolver38' && m.visible && dev <= TOL,
      `arma=${vm.weapon} visivel=${m.visible} dev=${dev.toExponential(3)} (tol ${TOL.toExponential(3)}) — offset do gait congelou no retorno do porte e/ou arma nova não recomposta`);
  }

  // N · CONTROLES CAUSAIS de velocidade parcial/teto/ar/moving (P3-1 R3): envelope
  // linear em speed/6.6 com teto 1, e ZERO no ar ou com moving=false.
  {
    const esp = (ph, e) => Math.sin(e === 'y' ? ph * 2 : ph) * AMP[e];
    const parado = run(fixture(Runtime), 400, STOP);
    const full = run(fixture(Runtime), 400, { ...WALK, stepPhase: 0.7 });
    const half = run(fixture(Runtime), 400, { ...WALK, speed: 3.3, stepPhase: 0.7 });
    const teto = run(fixture(Runtime), 400, { ...WALK, speed: 9.9, stepPhase: 0.7 });
    check('gait-meia-velocidade',
      near(half.x - parado.x, esp(0.7, 'x') * 0.5, 1e-6) && near(half.y - parado.y, esp(0.7, 'y') * 0.5, 1e-6),
      `half.x=${(half.x - parado.x).toFixed(6)} (esp ${(esp(0.7, 'x') * 0.5).toFixed(6)}) half.y=${(half.y - parado.y).toFixed(6)} (esp ${(esp(0.7, 'y') * 0.5).toFixed(6)}) — amplitude não cai na razão speed/6.6`);
    check('gait-teto-1', near(teto.x, full.x, 1e-9) && near(teto.y, full.y, 1e-9),
      `teto.x=${teto.x.toFixed(6)} full.x=${full.x.toFixed(6)} — speed acima de 6.6 amplifica além do teto`);
    const ar = run(fixture(Runtime), 400, { ...WALK, grounded: false, stepPhase: 0.7 });
    check('gait-zero-no-ar', ar.x === parado.x && ar.y === parado.y && ar.rz === parado.rz,
      `ar.x=${ar.x.toFixed(6)} parado.x=${parado.x.toFixed(6)} — gait ativo no ar (grounded=false ignorado)`);
    const semMoving = run(fixture(Runtime), 400, { ...WALK, moving: false, stepPhase: 0.7 });
    check('gait-zero-sem-moving', semMoving.x === parado.x && semMoving.y === parado.y && semMoving.rz === parado.rz,
      `x=${semMoving.x.toFixed(6)} — gait ativo com moving=false (limiar ignorado)`);
  }

  // H2 · RELOAD ANDANDO COM ADS PARCIAL + SWAY REAL: mounts finitos A CADA frame —
  // NaN transitório saneado no frame seguinte continua sendo violação (P2-3 R3).
  {
    const vm = fixture(Runtime);
    const rig = new ViewModelRig();
    let sujos = 0, primeiro = -1;
    vm.setAim('deagle', 0.5);
    vm.reload('deagle', 0.3);
    for (let i = 0; i < 120; i += 1) {
      rig.update(DT, { speed: WALK.speed, grounded: true, lookDX: 0.05, lookDY: 0.02 });
      vm.setAim('deagle', 0.5);
      const n0 = SUJOS.length;
      upd(vm, DT, { sway: rig, ...WALK, stepPhase: 0.7 + i * 0.115 });
      if (SUJOS.length > n0) { sujos += SUJOS.length - n0; if (primeiro < 0) primeiro = i; }
    }
    check('reload-ads-parcial-finito', sujos === 0,
      sujos ? `${sujos} frames com mount não finito (1º no frame ${primeiro}) — NaN transitório no reload/ADS parcial` : 'reload+ADS 0,5+sway: todos os frames finitos');
  }

  // O · RESET DE LIFECYCLE (P3-3 R3): morte/respawn zera envelope/fase; troca e utility NÃO.
  {
    const vm = fixture(Runtime);
    const parado = run(vm, 400, STOP);
    const vm2 = fixture(Runtime);
    run(vm2, 400, { ...WALK, stepPhase: 0.7 });
    vm2.resetLocomotion();
    upd(vm2, DT, { sway: null, ...STOP, stepPhase: 0.7 });
    const m = vm2.entry().mount;
    const dev = Math.max(Math.abs(m.position.x - parado.x), Math.abs(m.position.y - parado.y), Math.abs(m.rotation.z - parado.rz));
    check('reset-locomotion', dev === 0,
      `dev=${dev} — 1º frame pós-reset difere do runtime parado novo (envelope/fase da vida anterior sobreviveu)`);
    const vm3 = utilityFixture(Runtime);
    run(vm3, 400, { ...WALK, stepPhase: 0.7 });
    const envAntes = vm3._gaitEnv;
    vm3.holdUtility('frag');
    check('utility-nao-reseta', vm3._gaitEnv === envAntes && envAntes > 0.5,
      `envAntes=${envAntes} envNoPorte=${vm3._gaitEnv} — porte resetou o envelope (deve só decair)`);
  }

  check('mounts-finitos-por-frame', SUJOS.length === 0,
    SUJOS.slice(0, 6).join(' ') || 'nenhum mount não finito em nenhum update das fixtures');
  return { ok: checks.every((c) => c.ok), checks };
}

const result = audit(AuthoredViewModels);

// Kill-switch ?vmlocomotion=0: MESMO fonte reimportado com a janela falsa nova —
// prova que o gate de produção (não um stub) desliga o motion.
const url = new URL('../../public/js/authoredvm.js', import.meta.url);
const source = await readFile(url, 'utf8');
globalThis.window = { location: { search: '?vmauthored=1&vmready=deagle,revolver&vmweapon=deagle,revolver38&vmlocomotion=0' } };
const code = source.replace(/from '([^']+)'/g, (_, spec) =>
  `from '${spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)}'`);
const killed = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
function auditKillSwitch(AVM) {
  SUJOS.length = 0;
  const vm = fixture(AVM);
  const parado = run(vm, 400, STOP);
  const andando = run(vm, 400, { ...WALK, stepPhase: 2.9 });
  const checks = [{ name: 'kill-switch-vmlocomotion', ok: parado.x === andando.x && parado.y === andando.y && parado.rz === andando.rz,
    detail: `?vmlocomotion=0 andando y=${andando.y.toFixed(9)} parado y=${parado.y.toFixed(9)} — kill-switch não mata o gait` },
  { name: 'mounts-finitos-kill-switch', ok: SUJOS.length === 0,
    detail: SUJOS.length ? SUJOS.slice(0, 4).join(' | ') : '800 updates do kill-switch finitos' }];
  return { ok: checks.every(c => c.ok), checks };
}
const killCheck = auditKillSwitch(killed.AuthoredViewModels);
result.checks.push(...killCheck.checks); result.ok &&= killCheck.ok;

if (process.argv.includes('--mutantes')) {
  const mutacoes = [
    ['gait-mudo', 'if (VM_LOCOMOTION && !this.held) {', 'if (false && VM_LOCOMOTION) {'],
    ['gait-na-granada', 'if (VM_LOCOMOTION && !this.held) {', 'if (VM_LOCOMOTION) {'],
    ['gait-congelado-no-porte', 'this._stepGait(step, ctx);', 'if (!this.utility && !this.held) this._stepGait(step, ctx);'],
    ['sway-agregado', 'this._gait.x + (sway?.swayX?.value || 0) * hip', 'this._gait.x + (sway?.pos?.x || 0) * hip'],
    ['gait-sem-ads-damp', '* (1 - this.adsAmount)', '* 1'],
    ['sway-sem-ads-damp', 'const hip = 1 - this.adsAmount;', 'const hip = 1;'],
    ['bob-stop-tau-torto', 'VM_TIMES.bobStopTau', '0.17'],
    ['gait-sem-normalizar', 'Math.min(1, speed / 6.6)', 'speed > 0 ? 1 : 0'],
    ['gait-no-ar', '(ctx.grounded === false || ctx.moving === false) ? 0', '(ctx.moving === false) ? 0'],
    ['gait-moving-ignorado', '(ctx.grounded === false || ctx.moving === false) ? 0', '(ctx.grounded === false) ? 0'],
    ['nan-quaternion-reload', 'active.mount.rotation.z += this._gait.rz + (sway?.swayR?.value || 0) * hip;', 'active.mount.rotation.z += this._gait.rz + (sway?.swayR?.value || 0) * hip; if (this.adsAmount > 0.4 && this.adsAmount < 0.6 && sway && String(active.state).startsWith(\'reload\')) active.mount.rotation.x = NaN;'],
    ['reset-vazio', 'resetLocomotion() { this._gaitEnv = 0; this._gait = { x: 0, y: 0, rz: 0 }; }', 'resetLocomotion() { }'],
    ['nan-parcial', 'active.mount.position.y += this._gait.y + (sway?.swayY?.value || 0) * hip;', 'active.mount.position.y += (this.adsAmount > 0.4 && this.adsAmount < 0.6 && sway) ? NaN : this._gait.y + (sway?.swayY?.value || 0) * hip;'],
  ];
  result.mutations = [];
  globalThis.window = { location: { search: '?vmauthored=1&vmready=deagle,revolver&vmweapon=deagle,revolver38' } };
  for (const [nome, antes, depois] of mutacoes) {
    if (source.split(antes).length !== 2) throw new Error(`MUTAÇÃO NÃO APLICOU: ${nome}`);
    const mutated = await import(`data:text/javascript;base64,${Buffer.from(
      source.replace(antes, depois).replace(/from '([^']+)'/g, (_, spec) =>
        `from '${spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)}'`),
    ).toString('base64')}`);
    const check = audit(mutated.AuthoredViewModels);
    result.mutations.push({ name: nome, detected: !check.ok, failed: check.checks.filter((c) => !c.ok).map((c) => c.name) });
    result.ok &&= !check.ok;
  }
  const marker = '    if (VM_LOCOMOTION && !this.held) {';
  if (source.split(marker).length !== 2) throw Error('nan-kill-switch NAOAPLICOU: alvo não único');
  const nanKillSource = source.replace(marker, '    if (!VM_LOCOMOTION) active.mount.scale.z = NaN;\n' + marker);
  const oldWindow = globalThis.window;
  try {
    globalThis.window = { location: { search: '?vmauthored=1&vmready=deagle,revolver&vmweapon=deagle,revolver38&vmlocomotion=0' } };
    const mutant = await import(`data:text/javascript;base64,${Buffer.from(nanKillSource.replace(/from '([^']+)'/g, (_, spec) =>
      `from '${spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)}'`)).toString('base64')}`);
    const probe = fixture(mutant.AuthoredViewModels);
    const before = probe.entry().mount.scale.z;
    probe.update(DT, { ...STOP, sway: null });
    if (!Number.isFinite(before) || Number.isFinite(probe.entry().mount.scale.z)) throw Error('nan-kill-switch NAOAPLICOU: scale.z não mudou para não finito');
    const check = auditKillSwitch(mutant.AuthoredViewModels), failed = check.checks.filter(c => !c.ok).map(c => c.name);
    const detected = !check.ok && failed.includes('mounts-finitos-kill-switch');
    result.mutations.push({ name: 'nan-kill-switch', detected, failed }); result.ok &&= detected;
  } finally { globalThis.window = oldWindow; }
}

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
