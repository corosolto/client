#!/usr/bin/env node
/* ============================================================================
   granada-recarga-morte-check.mjs — GRANADA × RECARGA × MORTE (relato do dono, 26/10/2026)
   ----------------------------------------------------------------------------
   OS RELATOS, LITERAIS:
     (1) "quando equipa a granada e antes de jogar tem um bug onde dispara a arma
          primaria e ai sim joga a granada"
     (2) "quando equipa a granada durante a animação de reload, a animação para/não
          volta e as balas são resetadas"
     (3) "quando vc morre durante o reload ou quando está preste a jogar a granada você
          finaliza a animação quando volta para base, em teoria deveria parar tudo e
          voltar para a base sem fazer nenhuma animação"
     (4) "se vc zera a 30 balas da arma primaria e troca para secundaria usa todas do
          pente e em seguida faz o reload a arma primaria faz o reload junto e está
          recarregada"

   POR QUE ELA MEDE ASSIM: o pacote pago (authoredvm.js) não carrega em node (NODE_RUNTIME
   mata o _loadFamily), então `vm.authored` nasce sem entries e `throwUtility` devolve false
   — ou seja, NO ARNÊS O BUG NÃO APARECE SOZINHO. A régua planta um DUBLÊ com o MESMO
   contrato do pacote pago (utilidade em voo, release em 58% da animação, mixer que só
   avança quando o jogo chama `update`) e roda o GAME DE PRODUÇÃO por cima dele. Tudo o que
   se mede abaixo é estado do jogo (munição, reloadUntil, granadas no mundo) e a animação
   que o jogo PEDE ao pacote — nunca uma declaração do código.

   O QUE MEDE:
     GRM1  com arremesso em voo, o gatilho NÃO dispara a arma (nem o auto-fire do botão
           segurado) antes da granada sair da mão — inclusive quando era a ÚLTIMA granada
           (é esse o caso que o relato (1) pega: o porte cai no mesmo quadro do arremesso).
     GRM1b acabada a animação, o tiro volta a funcionar (o portão é janela, não trava).
     GRM2  equipar granada no meio da recarga CANCELA a recarga no mesmo quadro: relógio
           zerado, aviso de recarga escondido e animação de volta ao idle (nada de pose
           congelada), e o pente NÃO se completa sozinho depois.
     GRM3  morrer recarregando para TUDO na hora: relógio zerado, animação em idle, e ao
           renascer não sai conclusão de recarga nenhuma.
     GRM4  morrer com o arremesso em voo aborta o arremesso: nenhuma granada nasce no
           mundo e o próximo arremesso, já vivo, funciona (sem `utility` encalhada).
     GRM5  recarga serve SÓ a arma que recarregou: pistola recarregando não enche o pente
           da AK (relato (4)).

   REPRODUZ: node tools/eval/granada-recarga-morte-check.mjs [--json] [--mutante=<id>]
   MUTANTES (teste do teste — cada um TEM que acender a régua):
     --mutante=sem-gate-arremesso  tira o portão do arremesso        -> GRM1 vermelha
     --mutante=recarga-sobrevive   granada não cancela a recarga     -> GRM2 vermelha
     --mutante=morte-nao-para      morte não cancela recarga/arremesso -> GRM3/GRM4 vermelhas
     --mutante=recarga-global      recarga enche o pente de TODAS as armas -> GRM5 vermelha
   ============================================================================ */
import { bootGame, initTextures } from './harness.mjs';
import { WEAPONS } from '../../public/js/data/weapons.js';

const JSON_OUT = process.argv.includes('--json');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['', 'sem-gate-arremesso', 'recarga-sobrevive', 'morte-nao-para', 'recarga-global'];
if (!MUTANTES.includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT} (válidos: ${MUTANTES.filter(Boolean).join(', ')})`);
  process.exit(2);
}

const DT = 1 / 60;
const textures = initTextures();
const resultados = [];
let falhas = 0;
const cobra = (id, ok, evidencia) => {
  resultados.push({ id, ok: Boolean(ok), evidencia });
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${evidencia}`);
  if (!ok) falhas++;
};

/* ---------- dublê do pacote pago: mesmo contrato de authoredvm.js ---------- */
function pacotePago() {
  return {
    anim: 'idle', utility: null, held: null, weapon: '', arremessos: 0,
    active: () => true,
    entry: () => null,
    state() { return this.anim; },
    fov: () => 80,
    setProfile() {},
    setAim() { return true; },
    setWeapon(w) { this.weapon = w; if (!this.utility && !this.held) this.anim = 'idle'; return true; },
    draw() { this.anim = 'draw'; return true; },
    reload() { this.anim = 'reload'; return true; },
    shoot() { this.anim = 'shoot'; return true; },
    inspect: () => false,
    muzzleVm: () => null,
    muzzleWorld: () => null,
    utilityReady: () => true,
    utilityHeld() { return this.held ? this.held.kind : null; },
    holdUtility(kind) { this.held = { kind }; if (!this.utility) this.anim = 'porte'; return true; },
    releaseUtility() {
      if (!this.held) return false;
      this.held = null;
      if (this.utility) return true;   // o arremesso em voo devolve a arma quando terminar
      this.anim = 'idle';
      return true;
    },
    throwUtility(kind, duracao, onRelease) {
      if (this.utility) return false;
      this.arremessos++;
      this.utility = { kind, elapsed: 0, duration: duracao, releaseAt: duracao * 0.58, released: false, onRelease };
      this.anim = 'arremesso';
      return true;
    },
    // APIs que o conserto precisa: abortar o arremesso (morte) e voltar ao idle (recarga cancelada).
    abortUtility() {
      if (!this.utility && !this.held) return false;
      this.utility = null; this.held = null; this.anim = 'idle';
      return true;
    },
    idleWeapon() { this.anim = 'idle'; return true; },
    update(dt) {
      const u = this.utility;
      if (!u) return;
      u.elapsed += dt;
      if (!u.released && u.elapsed >= u.releaseAt) { u.released = true; if (u.onRelease) u.onRelease(); }
      if (u.elapsed >= u.duration) { this.utility = null; this.anim = this.held ? 'porte' : 'idle'; }
    },
    dispose() {},
  };
}

const passos = (g, segundos) => { for (let i = 0; i < Math.round(segundos / DT); i++) g.update(DT, false); };

function cena({ arma = 'ak', smokes = 5, frags = 1 } = {}) {
  const g = bootGame('praca_poderes', { textures, bots: 2 });
  const vm = pacotePago();
  g.vm.authored = vm;
  const p = g.player;
  passos(g, 3.2);                     // o round nasce em 'countdown'; a régua mede valendo
  if (g.state !== 'live') throw new Error(`arnês não entrou em jogo: state=${g.state}`);
  // conta a conclusão de recarga pelo SOM que o jogo toca (sinal do relógio, não declaração)
  g.fimDeRecarga = 0;
  const sfx = g.sfx;
  g.sfx = new Proxy(sfx, { get: (t, k) => (k === 'reloadEnd' ? () => { g.fimDeRecarga++; } : t[k]) });
  p.primary = arma; p.secondary = 'pistol';
  p.weapon = ''; g._switchWeapon(arma);
  p.drawUntil = 0; p.nextShotAt = 0; p._nextNade = 0;
  p.smokes = smokes; p.frags = frags;
  p.ammo[arma] = { mag: WEAPONS[arma].mag, res: WEAPONS[arma].reserve };
  p.ammo.pistol = { mag: WEAPONS.pistol.mag, res: WEAPONS.pistol.reserve };
  g._updateSmokeHud();
  // MUTANTES: reescrevem o COMPORTAMENTO corrigido de volta ao estado do relato.
  if (MUT === 'sem-gate-arremesso') Object.defineProperty(p, 'nadeBusyUntil', { get: () => 0, set() {}, configurable: true });
  if (MUT === 'recarga-sobrevive') g._cancelReload = () => false;
  if (MUT === 'morte-nao-para') g._abortarArmaNaMorte = () => {};
  if (MUT === 'recarga-global') g._armasServidasPelaRecarga = () => Object.keys(p.ammo);
  return { g, p, vm };
}


/* ---------- GRM1: arremesso em voo trava o gatilho ---------- */
{
  const { g, p, vm } = cena({ smokes: 1 });
  g._equipNade('smoke');
  const magAntes = p.ammo.ak.mag;
  g.mouseDown0 = true;            // o jogador SEGURA o botão, como no relato
  g._tryShoot();                  // clique: arremessa (e some com o porte — era a última)
  const porteCaiu = p.nade === null;
  let magDurante = magAntes;
  for (let i = 0; i < Math.round(0.5 / DT); i++) { g.update(DT, false); magDurante = Math.min(magDurante, p.ammo.ak.mag); }
  cobra('GRM1', magDurante === magAntes && vm.arremessos === 1,
    `com o arremesso em voo o pente da AK ficou ${magAntes} → ${magDurante} (esperado intacto) · arremessos ${vm.arremessos} · porte caiu ${porteCaiu}`);
  g.mouseDown0 = false;           // solta o botão: o que vier agora é tiro PEDIDO
  passos(g, 0.8);                 // animação (1,05 s) termina
  cobra('GRM1a', g._grenades.length === 1 && p.ammo.ak.mag === magAntes,
    `granada no mundo: ${g._grenades.length} · e nenhum tiro saiu sozinho (pente ${p.ammo.ak.mag})`);
  g._tryShoot();
  cobra('GRM1b', p.ammo.ak.mag === magAntes - 1,
    `terminada a animação o tiro volta: pente ${magAntes} → ${p.ammo.ak.mag}`);
}

/* ---------- GRM2: granada no meio da recarga CANCELA a recarga ---------- */
{
  const { g, p, vm } = cena();
  p.ammo.ak = { mag: 3, res: 90 };
  g._startReload();
  const prazo = p.reloadUntil;
  passos(g, 0.6);                              // meio da recarga (2,5 s na AK)
  const animNaRecarga = vm.anim;
  g._equipNade('smoke');
  const relogio = p.reloadUntil, aviso = g.el.reloadNote.classList.contains('hidden');
  g._unequipNade();                            // guarda a granada: a arma volta pra mão
  const animDeVolta = vm.anim;
  passos(g, 3.0);                              // passa do prazo original da recarga
  cobra('GRM2', relogio === 0 && prazo > 0,
    `equipar granada zera o relógio da recarga: prazo ${prazo.toFixed(2)} → reloadUntil ${relogio.toFixed(2)}`);
  cobra('GRM2a', animDeVolta !== 'reload' && g.fimDeRecarga === 0,
    `arma volta sem pose de recarga presa (era "${animNaRecarga}", voltou "${animDeVolta}") e sem concluir recarga nenhuma (${g.fimDeRecarga})`);
  cobra('GRM2b', aviso, 'o aviso "RECARREGANDO" sai da tela junto');
  cobra('GRM2c', p.ammo.ak.mag === 3,
    `recarga cancelada não serve o pente depois: mag ${p.ammo.ak.mag} (esperado 3)`);
}

/* ---------- GRM3: morrer recarregando para tudo ---------- */
{
  const { g, p, vm } = cena();
  p.ammo.ak = { mag: 2, res: 90 };
  g._startReload();
  passos(g, 0.5);
  g._kill(p, null, 'AK');
  const relogioNaMorte = p.reloadUntil, animNaMorte = vm.anim;
  passos(g, 3.2);                              // morte (2,2 s) + sobra viva
  cobra('GRM3', relogioNaMorte === 0, `morte zera o relógio da recarga na hora (ficou ${relogioNaMorte.toFixed(2)})`);
  cobra('GRM3a', animNaMorte === 'idle', `nenhuma animação sobra pra "terminar na base" (animação ficou "${animNaMorte}")`);
  cobra('GRM3b', p.alive && g.fimDeRecarga === 0,
    `voltou pra base sem terminar recarga nenhuma (vivo ${p.alive}, conclusões ${g.fimDeRecarga})`);
}

/* ---------- GRM4: morrer com o arremesso em voo ---------- */
{
  const { g, p, vm } = cena({ smokes: 2 });
  g._equipNade('smoke');
  g._tryShoot();                               // arremesso começa (release só em 58%)
  passos(g, 0.2);                              // morre ANTES do release
  g._kill(p, null, 'AK');
  const utilNaMorte = vm.utility, animNaMorte = vm.anim;
  passos(g, 3.2);                              // morte + respawn
  const granadasDaMorte = g._grenades.length;
  p.drawUntil = 0; p._nextNade = 0;
  g._equipNade('smoke');
  g._tryShoot();                               // arremesso novo, já vivo
  cobra('GRM4', utilNaMorte === null && animNaMorte === 'idle',
    `morte aborta o arremesso (utility ${utilNaMorte ? 'presa' : 'nula'}, animação "${animNaMorte}")`);
  cobra('GRM4a', granadasDaMorte === 0, `nenhuma granada nasce de quem morreu antes de soltar: ${granadasDaMorte}`);
  cobra('GRM4b', vm.arremessos === 2 && vm.utility !== null,
    `depois do respawn o arremesso volta a funcionar (arremessos ${vm.arremessos})`);
}

/* ---------- GRM5: recarga serve SÓ a arma que recarregou ---------- */
{
  const { g, p } = cena();
  p.ammo.ak = { mag: 0, res: 90 };             // AK zerada no pente, reserva cheia
  g._switchWeapon('pistol');
  p.drawUntil = 0;
  p.ammo.pistol = { mag: 0, res: 40 };
  g._startReload();
  passos(g, 2.4);                              // pistola recarrega (1,7 s) e completa
  cobra('GRM5', p.ammo.ak.mag === 0 && p.ammo.ak.res === 90,
    `recarga da pistola não mexe na AK: AK ${p.ammo.ak.mag}/${p.ammo.ak.res} (esperado 0/90)`);
  cobra('GRM5a', p.ammo.pistol.mag === WEAPONS.pistol.mag,
    `a arma que recarregou foi servida: pistola ${p.ammo.pistol.mag}/${p.ammo.pistol.res}`);
}

if (JSON_OUT) console.log(JSON.stringify({ versao: 1, mutante: MUT || null, resultados, falhas }, null, 2));
console.log(`\n${falhas ? `${falhas} FALHA(S)` : 'tudo verde'} — mutante: ${MUT || 'nenhum'}`);
process.exit(falhas ? 1 : 0);
