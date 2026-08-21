#!/usr/bin/env node
/* ============================================================================
   replaycam-check.mjs — A REPLAY CAM DO ABATE PERFEITO (PR #364)
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O #364 põe câmera orbital e hit-stop no headshot do JOGADOR — mudança sentida no
   corpo, em cima de uma base onde 98% das sessões roda abaixo de 30 FPS. Entrou sem
   régua: nada media se dispara, se termina, se devolve o FOV ou se o kill-switch
   desliga. Feature de sensação sem régua é opinião com commit.

   O QUE ELA MEDE (executando o Game de verdade, sem navegador)
   RC1 headshot do jogador ARMA a replay; abate de bot e abate sem headshot NÃO armam.
   RC2 hit-stop: durante a janela o tempo de jogo anda a ~18% do tempo real, e a janela
       dura 0,2 s REAIS — o acumulador tem de usar dt cru, senão em 30 FPS ela dobra.
   RC3 a replay termina sozinha e devolve o FOV (senão o jogador fica presoem câmera de
       terceira pessoa com o FOV do slowmo).
   RC4 `?replaycam=0` desliga: sem kill-switch, regressão de sensação não tem saída.

   NÚMERO MEDIDO (21/08/2026): a replay dura ~1,36 s REAIS, não os 1,2 s do REPLAY_DUR —
   `rc.t` acumula o dt JÁ ESCALADO, então o hit-stop estica a própria replay. Não é
   defeito, é consequência; a régua fixa a faixa para a conta não mudar sem alguém ver.

   Mutantes: sem-gatilho, sem-fim, sem-killswitch, hitstop-escalado.
   Uso: node tools/eval/replaycam-check.mjs [--mutante=<nome>]
   ============================================================================ */
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['sem-gatilho', 'sem-fim', 'sem-killswitch', 'hitstop-escalado'];
if (MUT && !MUTANTES.includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);

process.env.SIM_QS = MUT === 'sem-killswitch' ? '' : process.env.SIM_QS || '';
const h = await import('./harness.mjs');

/* Os mutantes trocam o COMPORTAMENTO na classe carregada — é o defeito que a régua tem de
   pegar, não um texto que ela lê. `sem-killswitch` mora no SIM_QS, logo acima. */
if (MUT === 'sem-gatilho') {
  const orig = h.Game.prototype._kill;
  h.Game.prototype._kill = function (...a) { const r = orig.apply(this, a); this._replayCam = null; return r; };
} else if (MUT === 'sem-fim') {
  const orig = h.Game.prototype._updateReplayCam;
  h.Game.prototype._updateReplayCam = function (dt) { const rc = this._replayCam; orig.call(this, dt); if (rc) this._replayCam = rc; };
} else if (MUT === 'hitstop-escalado') {
  const orig = h.Game.prototype.update;
  h.Game.prototype.update = function (dt, render) {
    const rc = this._replayCam;
    if (rc && (rc._wallT || 0) < 0.2) rc._wallT = (rc._wallT || 0) - dt * (1 - 0.18);   // acumula o dt ESCALADO
    return orig.call(this, dt, render);
  };
}

const DT = 1 / 60;
const falhas = [];
let medido = '';
const num = (v, n = 3) => Number(v).toFixed(n);

function novoJogo() {
  const textures = h.initTextures(h.renderer);
  return h.bootGame('praca_poderes', { textures, seed: 4242, bots: 4 });
}
/* Vítima de mentira com o mínimo que o `_kill` toca: sem isto o teste dependeria de o bot
   certo estar vivo na posição certa, e mediria o sorteio em vez da replay. */
function alvo(g) {
  const b = g.bots.find((x) => x.alive && x.team === 'B');
  if (b) { b.hp = 1; return b; }
  return null;
}

// ---- RC1: quem arma a replay ----
{
  const g = novoJogo();
  const vitima = alvo(g);
  if (!vitima) falhas.push('RC1 não achei bot vivo do time B para medir');
  else {
    g._replayCam = null;
    g._kill(vitima, g.player, 'AWP', true);
    const armouHeadshot = !!g._replayCam;

    const g2 = novoJogo(); const v2 = alvo(g2);
    g2._replayCam = null;
    g2._kill(v2, g2.player, 'AWP', false);
    const armouSemHead = !!g2._replayCam;

    const g3 = novoJogo(); const v3 = alvo(g3);
    const botAtacante = g3.bots.find((x) => x.alive && x.team === 'E' && !x.isPlayer);
    g3._replayCam = null;
    if (botAtacante) g3._kill(v3, botAtacante, 'AWP', true);
    const armouBot = !!g3._replayCam;

    if (!armouHeadshot) falhas.push('RC1 headshot do jogador NÃO armou a replay');
    if (armouSemHead) falhas.push('RC1 abate SEM headshot armou a replay (a promessa é abate perfeito)');
    if (armouBot) falhas.push('RC1 abate de BOT armou a replay do jogador');
  }
}

// ---- RC2/RC3: hit-stop em tempo real, fim da replay e FOV devolvido ----
{
  const g = novoJogo();
  const vitima = alvo(g);
  const fovAntes = g.camera.fov;
  g._kill(vitima, g.player, 'AWP', true);
  if (!g._replayCam) falhas.push('RC2 sem replay armada não dá para medir o hit-stop');
  else {
    const t0 = g.time;
    let real = 0, tempoNoSlowmo = null, duracaoReal = null;
    for (let i = 0; i < 60 * 5 && duracaoReal === null; i++) {
      g.update(DT, false);
      real += DT;
      if (tempoNoSlowmo === null && real >= 0.2 - 1e-9) tempoNoSlowmo = g.time - t0;
      if (!g._replayCam) duracaoReal = real;
    }
    // 0,2 s reais a 18% => ~0,036 s de jogo. Faixa larga o bastante para o passo do laço.
    if (tempoNoSlowmo === null || tempoNoSlowmo > 0.06)
      falhas.push(`RC2 hit-stop não segurou o tempo: ${num(tempoNoSlowmo)}s de jogo em 0,200s reais (esperado ~0,036s)`);
    if (duracaoReal === null) falhas.push('RC3 a replay NÃO terminou em 5 s reais — jogador preso na câmera orbital');
    else if (duracaoReal < 1.2 || duracaoReal > 1.6)
      falhas.push(`RC3 duração real da replay fora da faixa medida: ${num(duracaoReal)}s (esperado 1,2-1,6s)`);
    medido = `hit-stop ${num(tempoNoSlowmo)}s de jogo em 0,200s reais · replay ${num(duracaoReal)}s reais`;
    if (g.camera.fov !== fovAntes)
      falhas.push(`RC3 FOV não voltou depois da replay: ${g.camera.fov} (era ${fovAntes})`);
  }
}

// ---- RC4: kill-switch ----
{
  const { execFileSync } = await import('node:child_process');
  const saida = execFileSync(process.execPath, [new URL('./replaycam-probe.mjs', import.meta.url).pathname], {
    encoding: 'utf8', env: { ...process.env, SIM_QS: MUT === 'sem-killswitch' ? '' : '?replaycam=0' },
  }).trim().split('\n').pop().trim();   // o arnês escreve ruído no stdout; vale a última linha
  if (saida !== 'desarmada') falhas.push(`RC4 ?replaycam=0 não desligou a replay (sonda devolveu "${saida}")`);
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m RC replay cam: só no headshot do jogador, termina devolvendo o FOV, ?replaycam=0 desliga — ${medido}`);
if (MUT && !falhas.length) console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
process.exit(falhas.length ? 1 : 0);
