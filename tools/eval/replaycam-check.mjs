#!/usr/bin/env node
/* ============================================================================
   replaycam-check.mjs — O HEADSHOT NÃO PODE TIRAR A CÂMERA DA MÃO DO JOGADOR
   ----------------------------------------------------------------------------
   POR QUE ESTA RÉGUA MUDOU DE LADO
   O #364 pôs câmera orbital + hit-stop no headshot do JOGADOR, e a versão anterior
   deste arquivo media se a replay DISPARAVA, se terminava e se devolvia o FOV. O dono
   pediu o efeito de volta pra caixa: num FPS de rodada, ser arrancado da primeira
   pessoa 1,36 s depois de um abate é perder o duelo seguinte — e o abate perfeito já
   tem feedback (hitmarker vermelho, número de dano, killfeed, locutor).

   Apagar a feature sem régua é só empurrar o problema: o próximo agente relê o #364,
   acha bonito e repõe. Então a régua continua existindo, medindo o CONTRÁRIO.

   O QUE ELA MEDE (executando o Game de verdade, sem navegador)
   HS1 depois de um headshot do jogador a CÂMERA continua onde estava: mesma posição,
       mesma rotação e mesmo FOV, quadro a quadro, por 2 s.
   HS2 o relógio do jogo anda 1:1 com o tempo real depois do headshot — nada de
       hit-stop escalando o dt (era 18% por 0,2 s reais).
   HS3 o viewmodel e a mira continuam VISÍVEIS: a replay escondia os dois, e é isso que
       transformava o efeito em "perdi o controle".
   HS4 o abate segue contando: remover o efeito não pode remover o abate. É a cláusula
       que impede o conserto preguiçoso (matar o `_kill` inteiro fica verde em HS1-3).

   MEDIDO NA ÁRVORE ANTES DO CONSERTO (praca_poderes, seed 4242, 4 bots):
     câmera saltava 3,54 m no 1º quadro depois do headshot e o FOV ia de 70 para 50;
     em 0,200 s reais o relógio do jogo andava 0,036 s.

   Mutantes (repõem o defeito exato que a régua tem de pegar):
     orbita   — devolve a câmera orbital na vítima
     hitstop  — devolve o dt escalado por 0,2 s reais
     esconde  — devolve o "some o viewmodel e a mira"
     sem-kill — abate deixa de contar (prova que HS4 morde)
   Uso: node tools/eval/replaycam-check.mjs [--mutante=<nome>]
   ============================================================================ */
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['orbita', 'hitstop', 'esconde', 'sem-kill'];
if (MUT && !MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const h = await import('./harness.mjs');

/* Os mutantes recolocam o COMPORTAMENTO removido na classe já carregada — é o defeito
   que a régua tem de pegar, não um texto que ela lê. */
if (MUT === 'orbita' || MUT === 'hitstop' || MUT === 'esconde') {
  const origKill = h.Game.prototype._kill;
  h.Game.prototype._kill = function (ent, attacker, weap, head) {
    const r = origKill.call(this, ent, attacker, weap, head);
    if (head && attacker === this.player && ent.pos) this._replayCam = { t: 0, victimPos: ent.pos.clone(), killerYaw: attacker.yaw };
    return r;
  };
  /* O hit-stop escalava o dt ANTES do quadro; a órbita e o "some tudo" vinham DEPOIS de
     `_updatePlayer` — que reescreve câmera, viewmodel e mira todo quadro. Um mutante que
     aplicasse o efeito antes seria apagado pelo próprio jogo e passaria verde por engano. */
  const origUpd = h.Game.prototype.update;
  h.Game.prototype.update = function (dt, render) {
    const rc = this._replayCam;
    if (rc && MUT === 'hitstop') {
      rc._wallT = (rc._wallT || 0) + dt;
      if (rc._wallT < 0.2) dt *= 0.18;
    }
    const r = origUpd.call(this, dt, render);
    if (rc) {
      rc.t = (rc.t || 0) + dt;
      if (rc.t >= 1.2) this._replayCam = null;
      else if (MUT === 'orbita') {
        this.camera.position.set(rc.victimPos.x + 2.6, rc.victimPos.y + 1.7, rc.victimPos.z);
        this.camera.rotation.set(0, rc.killerYaw + Math.PI, 0);
        this.camera.fov = 50;
        this.camera.updateProjectionMatrix();
      } else if (MUT === 'esconde') {
        if (this.vm?.root) this.vm.root.visible = false;
        if (this.el.crosshair) this.el.crosshair.style.display = 'none';
      }
    }
    return r;
  };
} else if (MUT === 'sem-kill') {
  const origKill = h.Game.prototype._kill;
  h.Game.prototype._kill = function (ent, attacker, weap, head) {
    const antes = attacker ? attacker.kills : 0;
    const r = origKill.call(this, ent, attacker, weap, head);
    if (attacker) attacker.kills = antes;
    return r;
  };
}

const DT = 1 / 60;
const falhas = [];
const num = (v, n = 3) => Number(v).toFixed(n);

const textures = h.initTextures(h.renderer);
function novoJogo() { return h.bootGame('praca_poderes', { textures, seed: 4242, bots: 4 }); }
/* Vítima de mentira com o mínimo que o `_kill` toca: sem isto o teste dependeria de o bot
   certo estar vivo na posição certa, e mediria o sorteio em vez do efeito. */
function alvo(g) {
  const b = g.bots.find((x) => x.alive && x.team === 'B');
  if (b) { b.hp = 1; return b; }
  return null;
}

const g = novoJogo();
/* AQUECIMENTO OBRIGATÓRIO. O Game nasce com a câmera na origem e só o primeiro
   `_updatePlayer` a leva pro olho do jogador — 62,90 m de salto no quadro 1, que não tem
   nada a ver com headshot. Medir a partir do estado NÃO aquecido reprovava de graça (e
   pior: passaria a reprovar por outro motivo se o spawn mudasse de lugar). */
g.state = 'live';
for (let i = 0; i < 90; i++) g.update(DT, false);

const vitima = alvo(g);
if (!vitima) {
  falhas.push('HS0 não achei bot vivo do time B para medir');
} else {
  const cam = g.camera;
  const p0 = cam.position.clone(), r0 = { x: cam.rotation.x, y: cam.rotation.y, z: cam.rotation.z }, fov0 = cam.fov;
  const vmVisivel0 = g.vm?.root ? g.vm.root.visible : true;
  const killsAntes = g.player.kills;

  g._kill(vitima, g.player, 'AWP', true);

  if (g.player.kills !== killsAntes + 1)
    falhas.push(`HS4 o headshot deixou de contar abate: ${killsAntes} -> ${g.player.kills}`);

  const t0 = g.time;
  let real = 0, saltoPos = 0, saltoRot = 0, piorFov = 0, vmSumiu = false, miraSumiu = false;
  for (let i = 0; i < 120; i++) {
    g.update(DT, false);
    real += DT;
    saltoPos = Math.max(saltoPos, cam.position.distanceTo(p0));
    saltoRot = Math.max(saltoRot, Math.abs(cam.rotation.x - r0.x) + Math.abs(cam.rotation.y - r0.y) + Math.abs(cam.rotation.z - r0.z));
    piorFov = Math.max(piorFov, Math.abs(cam.fov - fov0));
    if (vmVisivel0 && g.vm?.root && !g.vm.root.visible) vmSumiu = true;
    if (g.el.crosshair && g.el.crosshair.style.display === 'none') miraSumiu = true;
  }
  const andouJogo = g.time - t0;

  // A câmera acompanha o jogador parado: sobra respiração/bob, não corte de plano.
  if (saltoPos > 0.25) falhas.push(`HS1 a câmera saiu do lugar depois do headshot: ${num(saltoPos)} m (teto 0,250 m)`);
  if (saltoRot > 0.25) falhas.push(`HS1 a câmera girou sozinha depois do headshot: ${num(saltoRot)} rad (teto 0,250 rad)`);
  if (piorFov > 0.5) falhas.push(`HS1 o FOV mudou sozinho depois do headshot: Δ${num(piorFov)}° (teto 0,5°)`);
  if (Math.abs(andouJogo - real) > 0.02)
    falhas.push(`HS2 hit-stop ainda escala o tempo: ${num(andouJogo)}s de jogo em ${num(real)}s reais`);
  if (vmSumiu) falhas.push('HS3 o viewmodel sumiu depois do headshot (a replay escondia a arma)');
  if (miraSumiu) falhas.push('HS3 a mira sumiu depois do headshot (a replay escondia o crosshair)');

  var medido = `câmera Δ${num(saltoPos)} m · Δ${num(saltoRot)} rad · ΔFOV ${num(piorFov)}° · relógio ${num(andouJogo)}s em ${num(real)}s reais`;
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m HS headshot não mexe na câmera, no relógio nem esconde a arma, e segue contando abate — ${medido}`);
const mutacaoCega = !!MUT && !falhas.length;
if (mutacaoCega) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');
}
process.exit(falhas.length ? 1 : 0);
