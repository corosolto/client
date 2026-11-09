/* MPR — REMOTO RECUANDO NO MP ANDA DE COSTAS, NÃO FAZ MOONWALK.
   Defeito (lane 1, 13/10/2026, mst + AK): `Netcode.updateRemoteBot` passava back=false fixo
   ao CharController. Remoto andando para trás a 1,8 m/s tocava `run` para frente (capture-
   3p-mp-path.mjs, folha mp_backpedal_1.8: run em 5 de 6 quadros), enquanto o mesmo recuo
   no SP (_updateBot, back = fwd < -0,25) toca `walk` com timeScale negativo.

   Mede em node, pelo Netcode.prototype.updateRemoteBot real, com o buffer de interpolação
   alimentado a 20 Hz (o que o nó manda: x,y,z,yaw) e _netSpd como no applySnapshot.
   Clipe medido = o DOMINANTE (curName: o de maior peso no par 8-way).
   Com o pack extras.glb (o que vai para produção), o clipe autoral é OBRIGATÓRIO:
     MPR1 · bot remoto, yaw 0, recuando 1,8 m/s        run_back
     MPR2 · bot remoto, yaw 2,1, recuando 1,8 m/s      run_back
     MPR3 · humano remoto (corpo yaw+π), recuando      run_back
     MPR4 · bot remoto andando 1,1 m/s para frente     walk para frente (inalterado)
     MPR5 · bot remoto correndo 4,7 m/s para frente    run (inalterado)
     MPR6 · humano remoto andando 1,1 m/s para frente  walk para frente (inalterado)
     MPR7 · bot remoto à direita 4,7 m/s               strafe_right
     MPR8-9 · à direita girando 4-6 rad/s              strafe_right em todo quadro
   Sem o pack (cláusulas separadas, modelo com os extras removidos) o fallback legado continua:
     MPR10-12 · recuando                               walk reverso (timeScale < 0)
     MPR13 · à direita                                 run
     MPR14-15 · de lado girando 4-6 rad/s              run em todo quadro: a velocidade do segmento
              projetada no yaw do instante (±giro·25 ms) piscava walk reverso 1 quadro em 3
   Mutantes: `semrecuo` força back=false (reprova MPR1-3); `yawinstante` projeta no yaw do
   instante (reprova MPR14-15; com o strafe autoral o erro só inverte uma frente ≈0 e não troca
   o clipe dominante); `semlateral` zera a lateral do remoto (reprova MPR7-9); `sempack` tira o
   pack das cláusulas autorais (reprova MPR1-3 e MPR7-9).
   Uso: node tools/eval/mp-recuo-check.mjs [--mutante=semrecuo|yawinstante|semlateral|sempack] */
import fs from 'node:fs';
import path from 'node:path';

const localFetch = async (url) => {
  const file = path.resolve('public', String(url).split('?')[0].replace(/^\//, ''));
  if (!fs.existsSync(file)) return new Response('', { status: 404 });
  return new Response(fs.readFileSync(file));
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
const { THREE, CHARACTERS } = await import('./harness.mjs');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  const file = path.resolve('public', url.split('?')[0].replace(/^\//, ''));
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'EXT_texture_webp',
    async loadTexture() { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; },
  }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(file);
    done(await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch((e) => fail?.(e));
};
const G = await import('../../public/js/glbchars.js');
const { makeNetcode } = await import('../../public/js/netgame.js');

const MUTANTES = { semrecuo: ['MPR1', 'MPR2', 'MPR3'], yawinstante: ['MPR14', 'MPR15'], semlateral: ['MPR7', 'MPR8', 'MPR9'],
  sempack: ['MPR1', 'MPR2', 'MPR3', 'MPR7', 'MPR8', 'MPR9'] };
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !MUTANTES[MUT]) throw new Error(`mutante desconhecido: ${MUT}`);
const EXTRAS_LOCO = ['run_back', 'walk_back', 'walk_back_pistol', 'strafe_left', 'strafe_right', 'strafe_left_pistol', 'strafe_right_pistol'];
const CHAR = 'mst', ARMA = 'ak', DT = 1 / 60, SNAP_MS = 50, ASSENTA = 30, QUADROS = 90;

await G.preloadCharacterAssets([CHAR], { weapons: [ARMA] });
if (!G.hasModel(CHAR)) throw new Error(`${CHAR}.glb não carregou — a régua não sabe medir`);
const def = CHARACTERS.find((c) => c.id === CHAR);

/* vf/vl no referencial do CORPO (frente/direita); o snapshot leva o yaw de rede, que no
   humano é o da câmera (o corpo gira yaw+π). O modelo olha +Z local, então a direita do
   corpo é -X local: (-cos c, sin c) em mundo. `semPack` remove os clipes de locomoção extras. */
async function roda({ yaw = 0, humano = false, vf = 0, vl = 0, giro = 0 }, semPack = false) {
  const m = G.buildCharacterModel(def, { weaponId: ARMA });
  m.ctrl._requestExtras();
  for (let i = 0; i < 100 && !m.ctrl.actions.strafe_right; i++) await new Promise((r) => setTimeout(r, 10));
  if (!m.ctrl.actions.strafe_right) throw new Error('extras.glb não registrou strafe_right');
  if (semPack) { for (const k of EXTRAS_LOCO) delete m.ctrl.actions[k]; m.ctrl._requestExtras = () => {}; }
  if (!m?.ctrl?.actions?.walk || !m.ctrl.actions.run) throw new Error('mst sem walk/run — a régua não sabe medir');
  if (MUT === 'semrecuo') { const up = m.ctrl.update.bind(m.ctrl); m.ctrl.update = (dt, mv, alvo, spd) => up(dt, mv, alvo, spd, false); }
  if (MUT === 'semlateral') { const up = m.ctrl.update.bind(m.ctrl); m.ctrl.update = (dt, mv, alvo, spd, back) => up(dt, mv, alvo, spd, back, 0); }
  let clock = 100000;
  const nc = makeNetcode({}, { meta: { snapshotHz: 20 }, startPing() {}, stopPing() {}, onSlot: null, onPersonagem: null });
  clearInterval(nc._nsTimer);
  if (MUT === 'yawinstante') nc.__mutYawInstante = true;
  nc._now = () => clock;
  const ent = { def, team: 'E', mesh: m, weapon: ARMA, pos: new THREE.Vector3(), yaw, alive: true, _remote: 7, _netBot: !humano,
    _bufAt: [], _bufX: [], _bufY: [], _bufZ: [], _bufYaw: [], _bufPitch: [], _netSpd: 0 };
  let x = 0, z = 0, ultimo = -Infinity, px = null, pz = null;
  const out = [];
  for (let f = 0; f < QUADROS; f++) {
    clock += DT * 1000; yaw += giro * DT;
    const corpo = humano ? yaw + Math.PI : yaw;
    x += (Math.sin(corpo) * vf - Math.cos(corpo) * vl) * DT; z += (Math.cos(corpo) * vf + Math.sin(corpo) * vl) * DT;
    if (clock - ultimo >= SNAP_MS) {
      ultimo = clock;
      ent._netSpd = px == null ? 0 : Math.hypot(x - px, z - pz) / (SNAP_MS / 1000);
      px = x; pz = z;
      ent._bufAt.push(clock); ent._bufX.push(x); ent._bufY.push(0); ent._bufZ.push(z); ent._bufYaw.push(yaw); ent._bufPitch.push(0);
      if (ent._bufAt.length > 10) for (const k of ['_bufAt', '_bufX', '_bufY', '_bufZ', '_bufYaw', '_bufPitch']) ent[k].shift();
    }
    nc.updateRemoteBot(ent, DT);
    if (f >= ASSENTA) {
      const c = m.ctrl, clip = c.curName;
      out.push({ clip, ts: c.actions[clip] ? c.actions[clip].timeScale : 0 });
    }
  }
  nc.dispose();
  return out;
}

const falhas = [];
async function cobra(cod, txt, cenario, esperado, semPack = MUT === 'sempack') {
  const serie = await roda(cenario, semPack);
  const ruins = serie.filter((s) => s.clip !== esperado.clip || Math.sign(s.ts) !== esperado.sinal);
  const trocas = serie.filter((s, i) => i && (s.clip !== serie[i - 1].clip || Math.sign(s.ts) !== Math.sign(serie[i - 1].ts))).length;
  const conta = {};
  for (const s of serie) { const k = `${s.clip}${s.ts < 0 ? '↺' : ''}`; conta[k] = (conta[k] || 0) + 1; }
  const ok = ruins.length === 0;
  console.log(`${cod} · ${txt}\n   esperado ${esperado.clip}${esperado.sinal < 0 ? ' reverso' : ''} · ${serie.length} quadros: ${Object.entries(conta).map(([k, v]) => `${k}×${v}`).join(' ')} (↺ = timeScale < 0) · ${trocas} troca(s) de clipe\n   ${ok ? 'PASSA' : 'FALHA'}`);
  if (!ok) falhas.push(cod);
}

await cobra('MPR1', 'bot remoto, yaw 0, recuando 1,8 m/s', { vf: -1.8 }, { clip: 'run_back', sinal: 1 });
await cobra('MPR2', 'bot remoto, yaw 2,1, recuando 1,8 m/s', { yaw: 2.1, vf: -1.8 }, { clip: 'run_back', sinal: 1 });
await cobra('MPR3', 'humano remoto (corpo yaw+π), yaw 0,7, recuando 1,8 m/s', { yaw: 0.7, humano: true, vf: -1.8 }, { clip: 'run_back', sinal: 1 });
await cobra('MPR4', 'bot remoto andando 1,1 m/s para frente', { yaw: 2.1, vf: 1.1 }, { clip: 'walk', sinal: 1 });
await cobra('MPR5', 'bot remoto correndo 4,7 m/s para frente', { yaw: 2.1, vf: 4.7 }, { clip: 'run', sinal: 1 });
await cobra('MPR6', 'humano remoto andando 1,1 m/s para frente', { yaw: 0.7, humano: true, vf: 1.1 }, { clip: 'walk', sinal: 1 });
await cobra('MPR7', 'bot remoto à direita 4,7 m/s', { yaw: 2.1, vl: 4.7 }, { clip: 'strafe_right', sinal: 1 });
await cobra('MPR8', 'bot remoto à direita 4,7 m/s girando 4 rad/s', { yaw: 0.3, vl: 4.7, giro: 4 }, { clip: 'strafe_right', sinal: 1 });
await cobra('MPR9', 'humano remoto à direita 2,5 m/s girando 6 rad/s', { yaw: 0.3, humano: true, vl: 2.5, giro: 6 }, { clip: 'strafe_right', sinal: 1 });
// Fallback legado, só quando o pack não tem o clipe: cláusulas separadas, nunca alternativa das autorais.
await cobra('MPR10', 'sem pack · bot remoto, yaw 0, recuando 1,8 m/s', { vf: -1.8 }, { clip: 'walk', sinal: -1 }, true);
await cobra('MPR11', 'sem pack · bot remoto, yaw 2,1, recuando 1,8 m/s', { yaw: 2.1, vf: -1.8 }, { clip: 'walk', sinal: -1 }, true);
await cobra('MPR12', 'sem pack · humano remoto, yaw 0,7, recuando 1,8 m/s', { yaw: 0.7, humano: true, vf: -1.8 }, { clip: 'walk', sinal: -1 }, true);
await cobra('MPR13', 'sem pack · bot remoto à direita 4,7 m/s', { yaw: 2.1, vl: 4.7 }, { clip: 'run', sinal: 1 }, true);
await cobra('MPR14', 'sem pack · bot remoto à direita 4,7 m/s girando 4 rad/s', { yaw: 0.3, vl: 4.7, giro: 4 }, { clip: 'run', sinal: 1 }, true);
await cobra('MPR15', 'sem pack · humano remoto à esquerda 2,5 m/s girando 6 rad/s', { yaw: 0.3, humano: true, vl: -2.5, giro: 6 }, { clip: 'run', sinal: 1 }, true);

const esperadas = MUTANTES[MUT] || [];
if (MUT) {
  const faltou = esperadas.filter((c) => !falhas.includes(c));
  if (faltou.length) { console.error(`✗ mutante ${MUT} NÃO foi pego em ${faltou.join(', ')} — a régua está cega`); process.exit(1); }
  console.log(`\n✓ mutante ${MUT} pego em ${esperadas.join(', ')}`);
  process.exit(0);
}
if (falhas.length) {
  console.error(`\n✗ MPR reprovado: ${falhas.join(', ')} — remoto com clipe errado (MPR1-3: sem run_back recuando; MPR7-9: sem strafe_right de lado ou piscando no giro; MPR10-13: fallback sem pack quebrado). Conserto: em Netcode.updateRemoteBot (netgame.js), back e lateral saem da velocidade do segmento do buffer, projetada no yaw do MESMO segmento, com o sinal do jogador local (direita do corpo = -X local).`);
  process.exit(1);
}
console.log('\n✓ MPR: remoto recuando toca run_back, de lado toca strafe_right; frente inalterada; fallback sem pack medido à parte.');
