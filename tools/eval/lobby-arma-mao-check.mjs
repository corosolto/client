#!/usr/bin/env node
/* lobby-arma-mao-check.mjs — A ARMA ESTÁ NA MÃO DO PERSONAGEM DO LOBBY?

   POR QUE EXISTE (28/10): um jogador antigo (Gustavo) escreveu "se eu acessar agora, no
   próprio lobby a arma está bugada na mão do personagem". O select-mount.mjs dava 63/63
   verde, porque mede POSIÇÃO (palma na arma, arma na frente, cano pra frente) — e a arma
   estava no lugar. O defeito era de ORIENTAÇÃO DA ARMA DENTRO DA MÃO: o porte de exibição
   do preview (glbchars.js, `opts.preview` → [-14°, 40°]) girava só a ARMA no mount, e a
   mão continuava na pose do clipe rifle-hold, que fecha os dedos em volta do punho no
   porte FUNCIONAL. Medido no main (?pvpulso=0): a arma saía 37,7-53,8° fora da pegada
   de jogo nos fuzis e 39,2-64,7° nas armas de 1 mão; com o conserto, 0,7-9,0°. Na tela: cabo encostado na palma aberta, dedos no ar, punho cruzando a
   mão. Conserto (PV_PULSO): quem gira para a vitrine é o PULSO; a relação mão↔arma fica a
   mesma do jogo.

   O QUE MEDE — mesmo caminho do pvSetChar (main.js): buildCharacterModel(preview:true,
   weaponId/weaponSkinId como o armaDoPreview entrega), grupo girado -0,4 rad, 4 s de
   ctrl.update a 60 Hz com o giro automático do palco (0,9 rad/s). Amostra a cada 0,5 s.
     LA1 PEGADA  ângulo entre a orientação da arma NO ESPAÇO DO OSSO DA MÃO no preview e a
                 mesma orientação no porte de jogo (buildCharacterModel sem preview, pose
                 assentada). É a pegada que o jogo já valida (select-mount, crítico do
                 dono); fora dela os dedos não fecham na arma. Teto 10°: o main mede 37,7-64,7°
                 e o conserto 0,7-9,0°; 10° é a folga de solver/rig sem chegar perto do defeito.
     LA2 PALMA   distância (m) do centro REAL da palma (média dos vértices skinned com peso
                 ≥0,9 no osso da mão direita, posição deformada) à origem da arma (o grip
                 de gripPoints). Peso ≥0,9 e não >0,5: os vértices do PULSO dividem peso com
                 o antebraço e a média deles anda com o giro do pulso sem a palma andar
                 (mst: 0,080 → 0,103 só por isso). Teto 0,10 m: a referência pior do select-mount (mst,
                 dedos longos) mede 0,08 m; arma "flutuando perto da mão" passa de 0,15.
     LA3 CAIXA   a palma está DENTRO da caixa da arma (distância à caixa da arma no espaço
                 LOCAL dela ≤ 0,02 m; caixa de mundo muda com o giro e mediria a vitrine).
                 Exceção declarada: se o PORTE DE JOGO já passa do teto (sertanejo/revolver38
                 mede 0,031 m no jogo, defeito de pegada do jogo e não do lobby, anotado no
                 PR), o lobby só reprova se for PIOR que o jogo em mais de 5 mm. Assim a régua
                 continua mordendo o lobby (--mutante=sem-pulso leva o sertanejo a 0,049)
                 sem cobrar
                 desta tela um conserto que é do porte de jogo.
     LA4 CANO    o cano aponta pra frente do corpo (componente Z no espaço do modelo ≥
                 0,594, o mesmo piso do select-mount) — o conserto não pode trocar a
                 vitrine por arma virada pra trás.
     LA5 ESTÁVEL nenhuma das 4 métricas acima varia mais que 2° / 1 cm ao longo dos 4 s:
                 o preview roda pra sempre no lobby; deriva lenta é defeito.

   MUTANTE (régua que não morde não existe):
     --mutante=sem-pulso  carrega a página com ?pvpulso=0 (kill-switch do conserto) e
                          exige LA1 vermelha. Se continuar verde, a régua está cega.
   O pivô na palma (?pvpivo=0 desliga) é guardado pelo select-mount, que mede o braço
   esticado: EXTRA=pvpivo=0 node tools/eval/select-mount.mjs esquerdomacho -> ESTICADO.

   uso: [BASE=http://localhost:<porta>] node tools/eval/lobby-arma-mao-check.mjs [--mutante=sem-pulso] [--json]
   Um Chrome por vez na máquina: segure a trava antes (ver preâmbulo de PR). */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { cobertura, lobbyFalhas } from './gate-accept.mjs';
const argvLobby = process.argv.slice(2);
const MUT = (argvLobby.find((a) => a.startsWith('--mutante=')) || '').slice(10);
const ESPERADO = { 'sem-pulso': ['LA1'] };
const usoLobby = (m) => { console.error(`uso: [BASE=...] node tools/eval/lobby-arma-mao-check.mjs [--mutante=sem-pulso] [--json] — ${m}`); process.exit(2); };
if (argvLobby.filter((a) => a.startsWith('--mutante=')).length > 1) usoLobby('--mutante= duplicado');
if (argvLobby.some((a) => a.startsWith('--mutante=') && !a.slice(10)) || (MUT && !Object.hasOwn(ESPERADO, MUT))) usoLobby('mutante vazio/desconhecido');
if (argvLobby.filter((a) => a === '--json').length > 1) usoLobby('--json duplicado');
if (argvLobby.some((a) => a !== '--json' && !a.startsWith('--mutante='))) usoLobby('opção desconhecida');

// Sem BASE, sobe o próprio servidor (nunca a 8123 compartilhada, que pode ser de outra sessão).
import { createServer } from 'node:net';
// Porta LIVRE do sistema: porta fixa deixava a 2ª execução (mutante) cair no servidor alheio.
const PORTA = process.env.PORTA || await new Promise((ok) => { const t = createServer().listen(0, () => { const p = t.address().port; t.close(() => ok(String(p))); }); });
const BASE = process.env.BASE || `http://127.0.0.1:${PORTA}`;
const servidor = process.env.BASE ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
let morreu = null;
servidor?.on('exit', (c) => { morreu = c; });
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 120 && !pronto && morreu === null; i++) {
    try { pronto = (await fetch(BASE)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((r) => setTimeout(r, 500));
  }
  if (!pronto || morreu !== null) { console.error(`infra: servidor próprio não subiu em ${BASE} (saída ${morreu})`); process.exit(3); }
}
const JSON_OUT = process.argv.includes('--json');

/* [personagem, arma, pintura de arma, skin de personagem]. Cobre: arma de vibe padrão
   (2 mãos e 1 mão, rig de 24 e de 28 juntas), arma EQUIPADA diferente da vibe (o
   esquerdomacho de pistola segurando a AK pintada, caso do jogador com skin de AK), e uma
   skin de personagem Mint (rig e clipes próprios, perfil de pegada mint24). */
const CASOS = [
  ['mst', 'ak', null, null],
  ['mandrake', 'ak', 'estrela-vermelha-ak', null],
  ['coach', 'scar', null, null],
  ['doutora', 'm4', null, null],
  ['esquerdomacho', 'pistol', null, null],
  ['esquerdomacho', 'ak', 'caveira-urbana', null],
  ['sertanejo', 'revolver38', null, null],
  ['capitao', 'md97', null, 'bolsonaro-drip'],
  // mascotes de braço-toco (IK_L_SKIP / P1H_SKIP, folga de corpo): onde o CCD de 2 ossos é mais frágil
  ['canarinho', 'deagle', null, null],
  ['gotinha', 'mp5', null, null],
  ['dollynho', 'p90', null, null],
];
/* Teto de LA1 por personagem (dívida declarada, 29/10): o canarinho tem porte de 1 mão
   PRÓPRIO (braço-toco) e fica a 16,1° da pegada de jogo; antes do conserto, 65,3°. */
const TETO_PEGADA = { canarinho: 20 };
const TETO = { pegadaGraus: 10, palmaM: 0.10, caixaM: 0.02, canoZmin: 0.594, derivaGraus: 2, derivaM: 0.01 };

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
  });
} catch (e) {
  console.error(`infra: browser não subiu (${e.message})`);
  process.exit(3);
}
const page = await browser.newPage({ viewport: { width: 320, height: 320 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/eval-character.html?debug=1${MUT === 'sem-pulso' ? '&pvpulso=0' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });

const out = [];
for (const caso of CASOS) {
  const r = await page.evaluate(async ([cid, wid, wskin, cskin]) => {
    const THREE = await import('three');
    const G = await import('./js/glbchars.js');
    const C = await import('./js/characters.js');
    const W = await import('./js/weapons.js');
    const S = await import('./js/weapon-skins.js');
    const base = C.CHARACTERS.find((c) => c.id === cid);
    if (!base) return { erro: 'sem definição' };
    const def = { ...base, skinId: cskin || null };
    await G.preloadCharacterAssets([cid]);
    if (cskin) await G.preloadCosmeticAssets([cskin]);
    await W.preloadWeapons([wid]);
    if (wskin) await S.preloadWeaponSkinCandidate(wskin);
    if (!G.hasModel(cid)) return { erro: 'sem GLB' };

    const achar = (m) => {
      let gun = null, hand = null;
      m.group.traverse((o) => {
        if (!gun && /^arma-(glb|caixa)$/.test(o.name)) gun = o;
        if (!hand && o.isBone && /right.?hand|hand.?r\b|rhand|r_hand/i.test(o.name)) hand = o;
      });
      return { gun, hand };
    };
    /* Palma -> caixa DA ARMA no espaço LOCAL da arma. Box3.setFromObject é alinhada aos
       eixos do MUNDO e muda de tamanho quando a arma gira: o revólver do sertanejo media
       0,016 no porte de jogo (yaw 4°) e 0,024 na vitrine (yaw 26°) com a MESMA pegada. */
    const caixaLocal = (gun, ponto) => {
      gun.updateWorldMatrix(true, true);
      const inv = gun.matrixWorld.clone().invert();
      const bb = new THREE.Box3(), tmp = new THREE.Box3();
      gun.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        tmp.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        bb.union(tmp);
      });
      const p = ponto.clone().applyMatrix4(inv);
      const s = new THREE.Vector3(); gun.getWorldScale(s);   // volta a metros
      return bb.distanceToPoint(p) * s.x;
    };
    // arma no espaço do osso da mão: a "pegada"
    const pegada = (gun, hand) => hand.getWorldQuaternion(new THREE.Quaternion()).invert()
      .multiply(gun.getWorldQuaternion(new THREE.Quaternion()));

    // Referência: porte de JOGO, pose assentada (o que select-mount e o jogo validam).
    const ref = G.buildCharacterModel(def, { weaponId: wid, weaponSkinId: wskin });
    const sref = new THREE.Scene(); sref.add(ref.group);
    for (let i = 0; i < 60; i++) ref.ctrl.update(1 / 60, 0, false, 0);
    sref.updateMatrixWorld(true);
    const rr = achar(ref);
    const qRef = pegada(rr.gun, rr.hand);
    // Diagnóstico (não decide veredito): palma→caixa no porte de JOGO, pra separar defeito
    // do lobby de propriedade da pegada que o jogo já tem.
    const compR = (a, i, k) => (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i));
    let caixaJogo = null;
    {
      const pr = new THREE.Vector3(), vv = new THREE.Vector3(); let n = 0;
      ref.group.traverse((o) => {
        if (!o.isSkinnedMesh || o.name === 'luvas-3p') return;
        const hi = o.skeleton.bones.indexOf(rr.hand); if (hi < 0) return;
        const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
        for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) if (compR(si, i, k) === hi && compR(sw, i, k) >= 0.9) { o.getVertexPosition(i, vv); pr.add(vv.applyMatrix4(o.matrixWorld)); n++; }
      });
      if (n) { pr.divideScalar(n); caixaJogo = +caixaLocal(rr.gun, pr).toFixed(3); }
    }

    // Preview do lobby, como o pvSetChar monta e o loop do menu anima.
    const m = G.buildCharacterModel(def, { weaponId: wid, weaponSkinId: wskin, preview: true });
    const scene = new THREE.Scene(); scene.add(m.group);
    m.group.rotation.y = -0.4;
    const { gun, hand } = achar(m);
    if (!gun || !hand) return { erro: 'sem arma ou sem mão' };
    const comp = (a, i, k) => (k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i));
    const verts = [];
    m.group.traverse((o) => {
      if (!o.isSkinnedMesh || o.name === 'luvas-3p') return;
      const hi = o.skeleton.bones.indexOf(hand);
      if (hi < 0) return;
      const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight;
      for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) if (comp(si, i, k) === hi && comp(sw, i, k) >= 0.9) verts.push([o, i]);
    });
    if (!verts.length) return { erro: 'mão sem vértices' };
    const amostras = [];
    const v = new THREE.Vector3();
    const medir = () => {
      scene.updateMatrixWorld(true);
      const palma = new THREE.Vector3();
      for (const [o, i] of verts) { o.getVertexPosition(i, v); palma.add(v.applyMatrix4(o.matrixWorld)); }
      palma.divideScalar(verts.length);
      const grip = gun.getWorldPosition(new THREE.Vector3());
      const model = m.ctrl.tpMount?.model || m.group;
      const qM = model.getWorldQuaternion(new THREE.Quaternion()).invert();
      const cano = new THREE.Vector3(0, 0, 1).applyQuaternion(gun.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(qM);
      const ang = pegada(gun, hand).angleTo(qRef) * 180 / Math.PI;
      amostras.push({
        pegada: +ang.toFixed(1),
        palma: +palma.distanceTo(grip).toFixed(3),
        caixa: +caixaLocal(gun, palma).toFixed(3),
        canoZ: +cano.z.toFixed(3),
        // palma no espaço do GRUPO (metros, sem a escala do modelo) contra o porte de jogo
      });
    };
    for (let s = 0; s < 8; s++) {
      for (let i = 0; i < 30; i++) { m.ctrl.update(1 / 60, 0, false, 0); m.group.rotation.y += 0.9 / 60; }
      medir();
    }
    return { amostras, caixaJogo, arma: gun.name, pintura: gun.userData?.weaponSkin || null };
  }, caso);
  out.push({ caso, ...r });
}
await browser.close();

const max = (a, k) => Math.max(...a.map((x) => x[k]));
const linhas = [];
const vermelhas = new Set();
let erros = 0;
const cobCasos = cobertura(out.map((r) => r.caso.join('|')), CASOS.map((c) => c.join('|')));
if (cobCasos.dup.length || cobCasos.missing.length || cobCasos.extra.length)
  erros++, linhas.push(`✗ cobertura: dup=${cobCasos.dup.length} faltando=${cobCasos.missing.length} extra=${cobCasos.extra.length}`);
for (const r of out) {
  const [cid, wid, wskin, cskin] = r.caso;
  const rot = `${cid}${cskin ? `(${cskin})` : ''} ${wid}${wskin ? `+${wskin}` : ''}`;
  const { falhas, invalidas } = lobbyFalhas(r, TETO, TETO_PEGADA);
  if (invalidas.length) {
    r.invalido = invalidas;
    erros++;
    linhas.push(`✗ ${rot.padEnd(46)} MEDIDA INVÁLIDA: ${invalidas.join('; ')}`);
    continue;
  }
  const a = r.amostras;
  falhas.forEach((x) => vermelhas.add(x));
  r.falhas = falhas;
  linhas.push(`${falhas.length ? '✗' : ' '} ${rot.padEnd(46)} pegada ${String(max(a, 'pegada')).padStart(5)}°  palma ${max(a, 'palma').toFixed(3)}  caixa ${max(a, 'caixa').toFixed(3)}  canoZ ${Math.min(...a.map((x) => x.canoZ)).toFixed(3)}  [caixa jogo ${r.caixaJogo}]  ${falhas.join(',') || 'ok'}`);
}
if (JSON_OUT) console.log(JSON.stringify({ teto: TETO, mutante: MUT || null, casos: out }, null, 1));
console.log(`\n=== ARMA NA MÃO DO LOBBY ${MUT ? `(mutante=${MUT})` : ''} ===`);
console.log('teto:', JSON.stringify(TETO));
for (const l of linhas) console.log(l);

if (MUT) {
  const faltou = ESPERADO[MUT].filter((c) => !vermelhas.has(c));
  const certo = !faltou.length && !erros;
  console.log(certo ? `MUTANTE MORDE: ${ESPERADO[MUT].join(',')} vermelha(s) com ${MUT}` : `MUTANTE NÃO MORDEU: ${faltou.join(',')} seguiu verde (régua cega)`);
  process.exit(certo ? 0 : 1);
}
const reprovados = out.filter((r) => r.erro || r.invalido || r.falhas?.length).length + (cobCasos.dup.length || cobCasos.missing.length || cobCasos.extra.length ? 1 : 0);
console.log(`\nREPROVADOS: ${reprovados}/${out.length}`);
process.exit(reprovados ? 1 : 0);
