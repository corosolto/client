/* NET_FLASH_DISABLE — #1179: flash desligada não pode virar FRAG local.
 * Contratos, baseline e mutante: docs/visual-consistency/PICKUPS-FLASH.md */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const JS = path.join(ROOT, 'public/js');
const SHA = 'f4bcffdf2';
const ALVO_VARIANTE = ['NF1', 'NF3'];   // exatamente estas — cláusula extra é recusa, não detecção

function parseCLI(argv) {
  if (argv.length === 0) return 'nominal';
  if (argv.length === 1 && argv[0] === '--baseline') return 'baseline';
  if (argv.length === 1 && argv[0] === '--mutante=reintroduz') return 'mutante';
  console.error(`uso: node tools/eval/net-flash-disable-check.mjs [--baseline|--mutante=reintroduz] — recebido: ${JSON.stringify(argv)}`);
  process.exit(2);
}

function fonteAtual() { return fs.readFileSync(path.join(JS, 'netgame.js'), 'utf8'); }
function fonteAntiga() { return execSync(`git show ${SHA}:public/js/netgame.js`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 << 20 }); }
export function fonteMutante() {
  const atual = fonteAtual();
  const s1 = atual.replace(/if \(e\.kind === 'flash' && !this\.flashOn\) return;.*\n/, '');
  if (s1 === atual) throw new Error('mutante: linha da guarda do nade não encontrada');
  const s2 = s1.replace("e.kind === 'smoke' || e.kind === 'flash' ? e.kind : 'frag'",
    "e.kind === 'smoke' || (e.kind === 'flash' && this.flashOn) ? e.kind : 'frag'");
  if (s2 === s1) throw new Error('mutante: mapeamento de kind não encontrado');
  const s3 = s2.replace(/else if \(e\.kind === 'flash'\) \{ if \(this\.flashOn\) game\._popFlash\(pos, this\._netMap\.get\(e\.o \| 0\) \|\| null\); \}/,
    "else if (e.kind === 'flash' && this.flashOn) game._popFlash(pos, this._netMap.get(e.o | 0) || null)");
  if (s3 === s2) throw new Error('mutante: ramo boom do flash não encontrado');
  return s3;
}

/* Módulo-variante em memória (imports absolutos, em node_modules/.gate-tmp para o
   shim 'three' resolver); tmp removido em finally mesmo se o import estourar. */
export async function netcodeDe(source, tag = `var-${Math.random().toString(16).slice(2)}`) {
  const url = pathToFileURL(JS + '/').href;
  const dir = path.join(ROOT, 'node_modules', '.gate-tmp');
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `netgame-${tag}.mjs`);
  try {
    fs.writeFileSync(tmp, source.replace(/from '\.\//g, `from '${url}`));
    return (await import(pathToFileURL(tmp).href)).makeNetcode;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

export function clausulasExatamente(falhas, alvo) {
  const f = new Set(falhas), a = new Set(alvo);
  return f.size === a.size && [...a].every((c) => f.has(c));
}

/* Mesma medição para nominal/baseline/mutante: Game+Netcode reais, owner REAL no
   _netMap e dispose no finally (o setInterval(250ms) do Netcode segura o processo). */
export async function medir(makeNetcode, harness) {
  const { bootGame, initTextures, THREE } = harness;
  const NADE = (i, kind, o = 9) => ({ k: 'nade', i, kind, o, x: 1, y: 1, z: 1, vx: 1, vz: 0 });
  const BOOM = (i, kind, o = 9) => ({ k: 'boom', i, kind, o, x: 1, y: 1, z: 1 });

  function cenario({ flashOn }) {
    const g = bootGame('quebrada', { textures: initTextures(), bots: 4, seed: 777 });
    const net = { meta: { events: true, flash: true, snapshotHz: 20 }, yourEnt: 5, startPing() {}, send() {} };
    const nc = makeNetcode(g, net);
    nc.flashOn = flashOn;
    const remoto = g.bots[0];                 // owner remoto REAL do jogo
    nc._netMap.set(9, remoto);                // id do servidor -> entidade local, como _casar faz
    const chamadas = { spawn: [], donos: [], flash: 0, flashDono: null, smoke: 0, frag: 0, donoFrag: null };
    const guarda = (obj, k, fn) => { const o = obj[k]; obj[k] = (...a) => { fn(a); return o && o.apply(obj, a); }; };
    guarda(g, '_spawnGrenade', (a) => { chamadas.spawn.push(a[2]); chamadas.donos.push(a[3]); });
    guarda(g, '_popFlash', (a) => { chamadas.flash++; chamadas.flashDono = a[1]; });
    guarda(g, '_popSmoke', () => { chamadas.smoke++; });
    guarda(g, '_explodeFrag', (a) => { chamadas.frag++; chamadas.donoFrag = a[1]; });
    return { g, nc, chamadas, remoto };
  }

  const falhas = [];
  const linhas = [];
  const erros = [];   // falha de instrumento (exceção de cenário): nunca vira cláusula
  const check = (id, pass, msg) => { linhas.push(`${pass ? 'ok ' : 'XX '} ${id} ${msg}`); if (!pass) falhas.push(id); };

  // NF1/NF6: flashOff ignora flash remota; id duplicado não duplica spawn
  try {
    const { g, nc, chamadas } = cenario({ flashOn: false });
    try {
      nc._evento(NADE(1, 'flash'));
      check('NF1', chamadas.spawn.length === 0 && g._grenades.length === 0 && chamadas.frag === 0 && chamadas.flash === 0,
        `nade flash flashOff: ${chamadas.spawn.length} spawns, ${chamadas.frag} frags, ${chamadas.flash} flashes`);
      nc._evento(NADE(2, 'frag')); nc._evento(NADE(2, 'frag'));
      check('NF6', g._grenades.filter((x) => x._nid === 2).length === 1, 'id duplicado ignorado');
    } finally { nc.dispose?.(); g.dispose?.(); }
  } catch (err) { erros.push({ cenario: 'NF1/NF6', err: err?.message }); linhas.push(`XX NF1/NF6 cenário estourou: ${err?.message}`); }

  // NF2: flashOn spawna flash COM owner real (remoto) e fallback para o player
  try {
    const { g, nc, chamadas, remoto } = cenario({ flashOn: true });
    try {
      nc._evento(NADE(3, 'flash', 9));
      nc._evento(NADE(31, 'flash', 5));       // o === yourEnt -> fallback game.player
      const ok = chamadas.spawn.length === 2 && chamadas.spawn[0] === 'flash' && chamadas.spawn[1] === 'flash'
        && chamadas.donos[0] === remoto && chamadas.donos[1] === g.player;
      check('NF2', ok, `nade flash flashOn: kinds=${JSON.stringify(chamadas.spawn)} dono9=${chamadas.donos[0] === remoto} dono5=${chamadas.donos[1] === g.player}`);
    } finally { nc.dispose?.(); g.dispose?.(); }
  } catch (err) { erros.push({ cenario: 'NF2', err: err?.message }); linhas.push(`XX NF2 cenário estourou: ${err?.message}`); }

  // NF3: boom flash flashOff remove residual REAL da cena (mesh com parent) e do array
  try {
    const { g, nc, chamadas } = cenario({ flashOn: false });
    try {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial());
      g.scene.add(mesh);
      g._grenades.push({ _nid: 4, mesh, v: new THREE.Vector3(), fuse: 1e9 });
      nc._evento(BOOM(4, 'flash'));
      const sumiu = !g._grenades.some((x) => x._nid === 4) && mesh.parent === null;
      check('NF3', chamadas.frag === 0 && chamadas.flash === 0 && sumiu,
        `boom flash flashOff: frag=${chamadas.frag} flash=${chamadas.flash} array=${!g._grenades.some((x) => x._nid === 4)} cena=${mesh.parent === null}`);
    } finally { nc.dispose?.(); g.dispose?.(); }
  } catch (err) { erros.push({ cenario: 'NF3', err: err?.message }); linhas.push(`XX NF3 cenário estourou: ${err?.message}`); }

  // NF4: boom frag explode com owner real (cenário limpo — contador não divide com NF3)
  try {
    const { g, nc, chamadas, remoto } = cenario({ flashOn: false });
    try {
      nc._evento(BOOM(404, 'frag', 9));
      check('NF4', chamadas.frag === 1 && chamadas.donoFrag === remoto,
        `boom frag explode: frag=${chamadas.frag} dono=${chamadas.donoFrag === remoto}`);
    } finally { nc.dispose?.(); g.dispose?.(); }
  } catch (err) { erros.push({ cenario: 'NF4', err: err?.message }); linhas.push(`XX NF4 cenário estourou: ${err?.message}`); }

  // NF5: boom smoke
  try {
    const { g, nc, chamadas } = cenario({ flashOn: false });
    try {
      nc._evento(BOOM(405, 'smoke', 9));
      check('NF5', chamadas.smoke === 1, `boom smoke: ${chamadas.smoke}`);
    } finally { nc.dispose?.(); g.dispose?.(); }
  } catch (err) { erros.push({ cenario: 'NF5', err: err?.message }); linhas.push(`XX NF5 cenário estourou: ${err?.message}`); }

  // NF7: boom flash flashOn chama _popFlash com owner remoto REAL e remove o residual
  try {
    const { g, nc, chamadas, remoto } = cenario({ flashOn: true });
    try {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial());
      g.scene.add(mesh);
      g._grenades.push({ _nid: 7, mesh, v: new THREE.Vector3(), fuse: 1e9 });
      nc._evento(BOOM(7, 'flash', 9));
      const sumiu = !g._grenades.some((x) => x._nid === 7) && mesh.parent === null;
      check('NF7', chamadas.flash === 1 && chamadas.flashDono === remoto && sumiu && chamadas.frag === 0 && chamadas.smoke === 0,
        `boom flash flashOn: pop=${chamadas.flash} dono=${chamadas.flashDono === remoto} cena=${mesh.parent === null} frag=${chamadas.frag}`);
    } finally { nc.dispose?.(); g.dispose?.(); }
  } catch (err) { erros.push({ cenario: 'NF7', err: err?.message }); linhas.push(`XX NF7 cenário estourou: ${err?.message}`); }

  return { falhas, linhas, erros };

  return { falhas, linhas, erros };
}

async function main() {
  const modo = parseCLI(process.argv.slice(2));
  const harness = await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
  console.info = () => {};

  // Nominal primeiro em TODO modo: instrumento doente não gera detecção.
  const nominal = await medir(await netcodeDe(fonteAtual(), 'nominal'), harness);
  console.log(nominal.linhas.join('\n'));
  if (nominal.erros.length) {
    console.error(`x NOMINAL infra: exceção de cenário não é cláusula (${nominal.erros.map((e) => e.cenario).join(',')})`);
    process.exit(3);
  }
  if (nominal.falhas.length) {
    console.error(`x NOMINAL vermelho (${nominal.falhas.join(',')}) — instrumento quebrado, variante não é detecção`);
    process.exit(1);
  }

  if (modo === 'baseline') {
    const res = await medir(await netcodeDe(fonteAntiga(), `baseline-${SHA}`), harness);
    console.log(res.linhas.join('\n'));
    console.log(`baseline ${SHA}: falhas=${res.falhas.join(',') || '-'}`);
    if (res.erros.length) {
      console.error(`x BASELINE infra: exceção de cenário não é cláusula (${res.erros.map((e) => e.cenario).join(',')})`);
      process.exit(3);
    }
    if (!clausulasExatamente(res.falhas, ALVO_VARIANTE)) {
      console.error(`x BASELINE tem que acender exatamente ${ALVO_VARIANTE.join(',')} — régua cega ou cláusula extra`);
      process.exit(1);
    }
    console.log(`ok BASELINE ${SHA}: defeito do antecedente detectado em exatamente ${ALVO_VARIANTE.join(',')}`);
    return;
  }
  if (modo === 'mutante') {
    const res = await medir(await netcodeDe(fonteMutante(), 'mutante-reintroduz'), harness);
    console.log(res.linhas.join('\n'));
    console.log(`mutante reintroduz: falhas=${res.falhas.join(',') || '-'}`);
    if (res.erros.length) {
      console.error(`x MUTANTE infra: exceção de cenário não é cláusula (${res.erros.map((e) => e.cenario).join(',')})`);
      process.exit(3);
    }
    if (!clausulasExatamente(res.falhas, ALVO_VARIANTE)) {
      console.error(`x MUTANTE tem que acender exatamente ${ALVO_VARIANTE.join(',')} — cega ou cláusula extra (ex. NF2/NF4/NF5)`);
      process.exit(1);
    }
    console.log(`ok MUTANTE reintroduz detectado (exatamente ${ALVO_VARIANTE.join(',')}; NF2/NF4/NF5/NF6/NF7 verdes)`);
    return;
  }
  console.log('NET_FLASH_DISABLE ok · flashOff ignora flash remota; frag/smoke/flashOn (nade e boom)/owner intactos');
}

const chamadoDireto = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (chamadoDireto) await main();
