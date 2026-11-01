/* ============================================================================
   economia-jogo-check.mjs: TRETA$ DA PARTIDA DENTRO DO GAME REAL (arnês, sem browser)
   ----------------------------------------------------------------------------
   Irmã de economia-check.mjs (que mede o módulo puro). Aqui o Game sobe com
   `economia: true`, como o main.js faz no single player, e a régua cobra:

     EJ1 nasce com faca + pistola, sem primária, saldo 800 e SEM armário grátis
     EJ2 kill-switch: sem `economia` (arnês, nó dedicado, ?economia=0) volta o loadout
         de hoje: arma do personagem na mão e armário no spawn
     EJ3 kill paga por classe: pistola +300, faca +1500, aliado 0
     EJ4 compra no spawn e no tempo debita e equipa; fora do tempo e fora do spawn recusa
     EJ5 tecla 1 sem primária não dá AWP de brinde
     EJ6 morreu, perdeu: a primária comprada cai no chão e o renascido volta de pistola
     EJ7 fim de rodada: vitória 3250, derrota 1400, sobrevivente mantém a compra
     EJ8 modos especiais e nó dedicado não abrem loja mesmo com `economia: true`
     EJ9 nada disso escreve no localStorage de chave treta nem chama /api/treta
     EJ10 bots nascem de pistola com 800 e guardam a arma sorteada para comprar (a pistola
          sorteada de 600/700 já sai na rodada 1, paga)
     EJ11 começo de rodada: bot com saldo compra a sorteada e paga; sem saldo fica de pistola
     EJ12 bot que morre larga a arma (1x) e renasce no spawn com malha nova visível; com saldo
          recompra arma + equipamento e paga (preços da tabela); sem saldo fica na pistola (eco);
          bot remoto não recompra; quem mata recebe pela classe da arma
     EJ16 bot com primária pega do chão não compra a sorteada
     EJ13 teclado: B abre a loja em qualquer posição; N muda a câmera sem conflitar
     EJ14 arma do chão troca a do mesmo slot (a comprada cai)
     EJ15 varredura: nenhum `primary || 'awp'` no game.js
     EJ17 equipamento: kit 1000 dá colete 100 + capacete, 2 flashes de 200 e a 3ª recusa;
          sobrevivente guarda colete e flash na rodada seguinte; quem morre perde os dois
     EJ18 kill-switch: sem armadura (?armadura=0) colete some e recusa; sem flash (?flash=0) idem
     EJ19 bot armado gasta a sobra em colete + capacete e chega com ele na rodada; bot que
          guarda para a arma não gasta
     EJ20 Piscina não expõe armas estáticas; drops de morte continuam existindo
     EJ21 compra primária/secundária por cartucho, com teto e atalhos vírgula/ponto
     EJ22 janela e aviso de compra começam em 50 segundos
     EJ23 renascimento do jogador reabre a janela de 50 s com banner e aceita a RECOMPRA
          nela (saldo garantido antes da morte), em rodada E arena (relógio avançado além
          da janela do começo: janela que só abrisse no início acusa)

   Mutantes (rodam sempre; cada um TEM de acender pelo menos uma cláusula):
     carteira-menu  o crédito de abate também grava o saldo numa chave treta do localStorage
     tecla1-awp     _slotPrimaria volta a cair na AWP
     sem-perda      rearmar vira no-op (morrer não custa nada)
     armario        o armário grátis volta com a loja ligada
     bot-de-graca   o bot pega a arma sorteada sem pagar
     bot-sem-perda  bot que morre renasce com a arma comprada
     bot-gancho-depois-do-g    a troca de malha roda depois do posicionamento (bot invisível)
     bot-troca-arma-do-chao    bot paga para trocar a primária pega do chão (EJ16)
     bot-nao-recompra-no-renascer  renascer rearma sem recomprar (a regra antiga; EJ12)
     sem-reabertura-respawn  renascer não reabre a janela nem mostra o banner (EJ23)
     mapa-armas     os pickups estáticos do mapa voltam a aparecer (EJ20)
     sem-municao / municao-sem-teto   compra de cartuchos some ou passa do máximo (EJ21)
     compra-vinte   janela/aviso volta a 20 segundos (EJ22)
     sem-tecla / b-sempre-camera / repete-compra  teclado: B não abre, B briga com a câmera
                                                   e segurar a tecla repete a compra (EJ13)
     recusa-compra-no-renascer  janela+banner reabrem, mas a recompra após renascer é
                                recusada (EJ23)
     pickup-mao     a arma do chão larga a da mão, não a do slot (EJ14)
     awp-na-rodinha um único `primary || 'awp'` volta na rodinha (EJ15)

   Uso: node tools/eval/economia-jogo-check.mjs
   ============================================================================ */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rodarMutanteIsolado } from './economia-jogo-isolado.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { initTextures, renderer, sfx, seedRandom, CHARACTERS } =
  await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
const { Game } = await import(pathToFileURL(path.join(ROOT, 'public/js/game.js')));
const { charWeapon } = await import(pathToFileURL(path.join(ROOT, 'public/js/characters.js')));
const { ECONOMIA, precoDe, equipamentoDoBot } = await import(pathToFileURL(path.join(ROOT, 'public/js/economia-partida.js')));
console.info = () => {};   // o Game anuncia a composição dos times a cada boot
const textures = initTextures();
const FONTE = (await import('node:fs')).readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
const PERSONAGEM = CHARACTERS.find((c) => c.team === 'E' && !['pistol', 'deagle', 'revolver38'].includes(charWeapon(c.id)));

function boot({ economia = true, settings = {}, dedicated = false, mapId = 'ferro_velho', mut = null } = {}) {
  seedRandom(12345);
  const g = new Game({
    renderer, textures, sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1, ...settings },
    playerCharId: PERSONAGEM.id, playerTeam: 'E', playerFaction: PERSONAGEM.team, enemyFaction: 'B',
    nickname: 'SIM', mapId, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
    economia, dedicated,
  });
  g._ensureDolly = () => {};
  g.killsToWin = Infinity;
  if (mut) mut(g);
  g.start ? g.start() : g._startRound();
  g.scene.updateMatrixWorld(true);
  g.world.root.updateMatrixWorld(true);
  return g;
}

const tecla = (g, code, repeat = false) => g._kd({ code, target: null, repeat, preventDefault() {} });
const rack = (g) => g.drops.filter((d) => d.rack).length;
const inimigo = (g) => g.bots.find((b) => b.team !== g.playerTeam && b.alive);
const aliado = (g) => g.bots.find((b) => b.team === g.playerTeam);
const matar = (g, vit, att, weap) => { g.time += 0.05; g._kill(vit, att, weap, false); };
const saldo = (g) => g.player.carteira?.saldo;

function medir(mut = {}) {
  const rows = [];
  const check = (id, nome, pass, obs = {}) => rows.push({ id, nome, pass: !!pass, obs });

  {
    const g = boot({ mut: mut.boot });
    const p = g.player;
    check('EJ1', 'nasce com faca + pistola, 800 e sem armário',
      !!g._compra && p.weapon === 'pistol' && !p.primary && p.secondary === 'pistol' && saldo(g) === 800 && rack(g) === 0,
      { weapon: p.weapon, primary: p.primary, saldo: saldo(g), rack: rack(g) });

    tecla(g, 'Digit1');
    check('EJ5', 'tecla 1 sem primária não dá AWP', p.weapon === 'pistol' && !p.primary, { weapon: p.weapon });

    const v = inimigo(g), a = aliado(g);
    matar(g, v, p, 'PT-38'); const s1 = saldo(g);
    p.weapon = 'knife'; matar(g, inimigo(g), p, 'FACA'); const s2 = saldo(g);
    p.weapon = 'pistol';
    if (a) matar(g, a, p, 'PT-38');
    const s3 = saldo(g);
    check('EJ3', 'kill: pistola +300, faca +1500, aliado 0', s1 === 1100 && s2 === 2600 && s3 === 2600, { s1, s2, s3 });
  }

  {
    const g = boot({ mut: mut.boot });
    const p = g.player;
    g.player.carteira.saldo = 5000;
    g._compra.comprar('ak');
    const ok = p.weapon === 'ak' && p.primary === 'ak' && saldo(g) === 5000 - (charWeapon(PERSONAGEM.id) === 'ak' ? 2450 : 2700);
    const s0 = saldo(g);
    const tAntes = g.time;
    g.time = g._compra.compraAte + 0.1;
    const rTempo = g._compra.comprar('m4');
    g.time = tAntes;
    const pos = p.pos.clone();
    p.pos.x += 200;
    const rZona = g._compra.comprar('m4');
    p.pos.copy(pos);
    check('EJ4', 'compra no tempo/spawn equipa; fora do tempo e do spawn recusa',
      ok && rTempo.motivo === 'tempo' && rZona.motivo === 'zona' && saldo(g) === s0 && p.primary === 'ak',
      { weapon: p.weapon, saldo: saldo(g), tempo: rTempo.motivo || 'ACEITOU', zona: rZona.motivo || 'ACEITOU' });

    p.weapon = 'pistol';
    const antesDrops = g.drops.filter((d) => d.weapon === 'ak').length;
    matar(g, p, inimigo(g), 'AK');
    const caiu = g.drops.filter((d) => d.weapon === 'ak').length - antesDrops;
    g.state = 'live';
    g._respawnPlayer();
    check('EJ6', 'morreu: AK cai no chão, renasce de pistola sem primária',
      caiu === 1 && p.weapon === 'pistol' && !p.primary, { caiu, weapon: p.weapon, primary: p.primary });

    // sobrevivente: compra de novo, vence a rodada, rodada nova mantém a arma
    g.time = tAntes; g._compra.compraAte = g.time + 10;
    p.carteira.saldo = 3000; g._compra.comprar('mp5');
    const sAntes = saldo(g);
    g.roundKills = { E: 3, B: 1 };
    g._endRound();
    const ganhoVit = saldo(g) - sAntes;
    g._startRound();
    const mantem = p.primary === 'mp5' && p.weapon === 'mp5';
    const s2 = saldo(g);
    g.roundKills = { E: 0, B: 2 };
    g._endRound();
    const ganhoDer = saldo(g) - s2;
    p.carteira.saldo = 15900; g.roundKills = { E: 2, B: 0 }; g._endRound();
    check('EJ7', 'rodada: vitória 3250, derrota 1400, teto, sobrevivente mantém',
      ganhoVit === 3250 && ganhoDer === 1400 && mantem && saldo(g) === ECONOMIA.teto,
      { ganhoVit, ganhoDer, mantem, teto: saldo(g) });
  }

  {
    const g = boot({ mut: mut.boot });
    const bots = g.bots;
    check('EJ10', 'bots nascem de pistola com 800 e guardam a sorteada',
      // quem sorteou pistola de 600/700 já compra na rodada 1, como no CS; o resto segura os 800
      bots.length > 0 && bots.every((b) => b._armaAlvo && (b.weapon === 'pistol'
        ? b.carteira?.saldo === 800 : b.weapon === b._armaAlvo && b.carteira?.saldo === 800 - precoDe(b._armaAlvo))),
      { bots: bots.map((b) => `${b.weapon}/${b.carteira?.saldo}/${b._armaAlvo}`) });

    const [rico, pobre] = bots.filter((b) => b.team !== g.playerTeam);
    // arma na mão forçada: com outra semente o bot sorteado de DEAGLE já viria armado da rodada 1
    rico._armaAlvo = 'ak'; rico.carteira.saldo = 3000; rico.weapon = 'pistol';
    pobre._armaAlvo = 'awp'; pobre.carteira.saldo = 1000; pobre.weapon = 'pistol';
    g._startRound();
    check('EJ11', 'rodada: bot com saldo compra e paga; sem saldo fica de pistola',
      rico.weapon === 'ak' && rico._meshWeapon === 'ak' && rico.carteira.saldo === 300
      && pobre.weapon === 'pistol' && pobre.carteira.saldo === 1000,
      { rico: `${rico.weapon}/${rico.carteira.saldo}`, pobre: `${pobre.weapon}/${pobre.carteira.saldo}` });

    g.state = 'live';
    const antes = g.drops.filter((d) => d.weapon === 'ak').length;
    matar(g, rico, g.player, 'PT-38');
    const caiu = g.drops.filter((d) => d.weapon === 'ak').length - antes;
    // renasce com saldo: paga a arma E o equipamento, derivado dos preços da tabela real
    const grana = 5000;
    rico.carteira.saldo = grana;
    const precoArma = precoDe(rico._armaAlvo);
    const eq = equipamentoDoBot({ saldo: grana - precoArma, armado: true, colete: 0, capacete: false });
    const custoEq = eq ? precoDe(eq, { equip: { colete: 0, capacete: false } }) : 0;
    const esperado = grana - precoArma - custoEq;
    // morreu longe do spawn e o corpo GLB já sumiu (deadT > 1), como no jogo
    rico.mesh.group.position.x += 40; rico.mesh.group.visible = false;
    g._respawnEntity(rico);
    // a malha nova tem de nascer no ponto de renascimento, visível e na cena (gancho antes do `g`)
    const malha = rico.mesh.group;
    const malhaOk = malha.position.distanceTo(rico.pos) < 1e-6 && malha.visible && g.scene.children.includes(malha);
    // arma lógica E malha têm de coincidir com o que foi pago
    const recompraOk = rico.weapon === rico._armaAlvo && rico._meshWeapon === rico._armaAlvo
      && rico.carteira.saldo === esperado && rico.armor === 100 && rico.helmet === true;
    const sPobre = pobre.carteira.saldo;
    pobre.weapon = 'pistol'; matar(g, g.player, pobre, 'PT-38');
    const recompensaOk = pobre.carteira.saldo === sPobre + 300;
    // eco: sem saldo para a sorteada renasce de pistola, sem debitar e sem saldo negativo
    const semGrana = pobre.carteira.saldo;
    matar(g, pobre, g.player, 'PT-38');
    g._respawnEntity(pobre);
    const ecoOk = pobre.weapon === 'pistol' && pobre._meshWeapon === 'pistol'
      && pobre.carteira.saldo === semGrana && pobre.carteira.saldo >= 0;
    // bot remoto não passa pela loja local: nem rearma, nem paga (o servidor cuida dele)
    const remoto = bots.find((b) => b !== rico && b !== pobre);
    g._compra._armarBot(remoto, 'pistol');
    remoto._remote = true; remoto._armaAlvo = 'ak'; remoto.carteira.saldo = 5000;
    matar(g, remoto, g.player, 'PT-38');
    g._respawnEntity(remoto);
    const remotoOk = remoto.weapon === 'pistol' && remoto._meshWeapon === 'pistol' && remoto.carteira.saldo === 5000;
    check('EJ12', 'bot morto larga a arma; renasce: com saldo recompra (arma+kit), sem saldo fica na pistola',
      caiu === 1 && malhaOk && recompraOk && recompensaOk && ecoOk && remotoOk,
      { caiu, malhaOk, recompra: `${rico.weapon}/${rico._meshWeapon}/${rico.carteira.saldo}/${rico.armor}/${rico.helmet}`,
        esperado, eco: `${pobre.weapon}/${pobre._meshWeapon}/${pobre.carteira.saldo}`,
        remoto: `${remoto.weapon}/${remoto._meshWeapon}/${remoto.carteira.saldo}`,
        killer: pobre.carteira.saldo - sPobre });
  }

  {
    // bot com primária pega do chão não paga para trocá-la pela sorteada
    const g = boot({ mut: mut.boot });
    const b = g.bots.find((x) => x.team !== g.playerTeam);
    b._armaAlvo = 'shotgun'; b.carteira.saldo = 5000;
    g._syncRemoteWeapon(b, 'awp');
    g._startRound();
    // armado com a AWP, a sobra vai para o kit colete + capacete (1000), nunca para a escopeta
    check('EJ16', 'bot com AWP do chão não compra a escopeta sorteada', b.weapon === 'awp' && b.carteira.saldo === 5000 - 1000,
      { weapon: b.weapon, saldo: b.carteira.saldo });
  }

  {
    // caminho principal: B é exclusivamente compra; N alterna a câmera em qualquer posição.
    const g = boot({ mut: mut.boot });
    const p = g.player;
    p.carteira.saldo = 3000;
    const cam0 = g.camView;
    tecla(g, 'KeyB'); const abriu = !!g._compra.aberto;
    tecla(g, 'Digit4'); tecla(g, 'Digit4', true);
    const naoComprouNaRepeticao = !p.primary;
    tecla(g, 'Digit5');
    const comprou = p.primary === 'ak' && !g._compra.aberto && g.camView === cam0;
    p.pos.x += 200;
    tecla(g, 'KeyB');
    const bNaoMoveCamera = g.camView === cam0 && !g._compra.aberto;
    tecla(g, 'KeyN');
    const camera = g.camView !== cam0;
    check('EJ13', 'teclado: B abre/compra sem mexer na câmera; N muda a câmera',
      abriu && naoComprouNaRepeticao && comprou && bNaoMoveCamera && camera,
      { abriu, naoComprouNaRepeticao, comprou, primary: p.primary, bNaoMoveCamera, cam0, cam: g.camView });
  }

  {
    // arma do chão troca a do mesmo slot: a primária comprada cai, não some
    const g = boot({ mut: mut.boot });
    const p = g.player;
    p.carteira.saldo = 5000; g._compra.comprar('m4');
    g._switchWeapon('pistol');
    const antes = g.drops.filter((d) => d.weapon === 'm4').length;
    g._grabPickup({ weapon: 'ak', mesh: { position: p.pos.clone() }, rack: false }, p, true);
    const caiu = g.drops.filter((d) => d.weapon === 'm4').length - antes;
    check('EJ14', 'pegar AK do chão com M4 comprada larga a M4', p.primary === 'ak' && caiu === 1, { primary: p.primary, caiu });
  }

  {
    // varre em vez de enumerar: nenhum caminho de slot pode voltar a cair na AWP de brinde
    const src = mut.fonte ? mut.fonte(FONTE) : FONTE;
    const furos = (src.match(/primary\s*\|\|\s*'awp'/g) || []).length;
    check('EJ15', "game.js sem `primary || 'awp'` fora do _slotPrimaria", furos === 0, { furos });
  }

  {
    const g = boot({ mut: mut.boot });
    const p = g.player;
    p.carteira.saldo = 2000;
    g._compra.aberto = true;
    const kit = g._compra.comprar('colete-capacete');
    const f1 = g._compra.comprar('flash'), f2 = g._compra.comprar('flash'), f3 = g._compra.comprar('flash');
    const compra = { armor: p.armor, helmet: p.helmet, flashes: p.flashes, saldo: saldo(g), aberto: g._compra.aberto, f3: f3.motivo || 'ACEITOU' };
    const comprouOk = kit.ok && f1.ok && f2.ok && f3.motivo === 'limite' && p.armor === 100 && p.helmet && p.flashes === 2
      && saldo(g) === 2000 - 1000 - 400 && g._compra.aberto;
    p.armor = 61;   // apanhou e sobreviveu
    g.roundKills = { E: 3, B: 1 }; g._endRound(); g._startRound();
    const manteve = p.armor === 61 && p.helmet === true && p.flashes === 2;
    const sobrevive = { armor: p.armor, helmet: p.helmet, flashes: p.flashes };
    g.state = 'live';
    matar(g, p, inimigo(g), 'AK');
    // o HUD da utilidade larga o "⚡" já na morte, sem esperar a rodada nova
    const hudFlash = /⚡/.test(g.el?.smokeCount?.textContent || '');
    g._respawnPlayer();
    g._startRound();
    const perdeu = !(p.armor > 0) && !p.helmet && (p.flashes | 0) === 0 && !hudFlash;
    check('EJ17', 'kit + 2 flashes; sobrevivente guarda; morto perde',
      comprouOk && manteve && perdeu, { compra, sobrevive, morto: { armor: p.armor, helmet: p.helmet, flashes: p.flashes, hudFlash } });
  }

  {
    const g = boot({ mut: mut.boot });
    const p = g.player;
    p.carteira.saldo = 5000;
    g._armaduraLigada = () => false;
    const rCol = g._compra.comprar('colete');
    const semArmadura = g._compra.grupos().some((x) => x.id === 'equipamento');
    g._flashLiberada = () => false;
    const rFl = g._compra.comprar('flash');
    const semNada = g._compra.grupos().some((x) => x.id === 'equipamento');
    check('EJ18', '?armadura=0 e ?flash=0 tiram o item da loja',
      rCol.motivo === 'item' && rFl.motivo === 'item' && semArmadura && !semNada && saldo(g) === 5000 && !(p.armor > 0) && !(p.flashes > 0),
      { colete: rCol.motivo || 'ACEITOU', flash: rFl.motivo || 'ACEITOU', grupoSoFlash: semArmadura, grupoSemNada: semNada });
  }

  {
    const g = boot({ mut: mut.boot });
    const [rico, pobre] = g.bots.filter((b) => b.team !== g.playerTeam);
    rico._armaAlvo = 'ak'; rico.carteira.saldo = 3700; rico.weapon = 'pistol';
    pobre._armaAlvo = 'awp'; pobre.carteira.saldo = 1000; pobre.weapon = 'pistol';
    g._startRound();
    check('EJ19', 'bot armado leva o kit com a sobra; bot que guarda para a AWP não gasta',
      rico.weapon === 'ak' && rico.armor === 100 && rico.helmet === true && rico.carteira.saldo === 0
      && pobre.weapon === 'pistol' && !(pobre.armor > 0) && pobre.carteira.saldo === 1000,
      { rico: `${rico.weapon}/${rico.armor}/${rico.helmet}/${rico.carteira.saldo}`, pobre: `${pobre.weapon}/${pobre.armor}/${pobre.carteira.saldo}` });
  }

  {
    const g = boot({ mapId: 'piscina_treta', mut: mut.boot });
    const estaticas = g.world.pickups?.length || 0;
    const antes = g.drops.length;
    g.player.primary = 'ak'; g.player.weapon = 'pistol';
    matar(g, g.player, inimigo(g), 'AK');
    const dropsMorte = g.drops.length - antes;
    check('EJ20', 'mapa sem armas estáticas; arma de quem morre ainda cai',
      estaticas === 0 && dropsMorte === 1, { estaticas, dropsMorte });
  }

  {
    const g = boot({ mut: mut.boot });
    const p = g.player;
    p.carteira.saldo = 15000;
    g._compra.comprar('ak');
    const basePrimaria = p.ammo.ak.res;
    tecla(g, 'Comma');
    const depoisVirgula = p.ammo.ak.res;
    for (let i = 0; i < 20; i++) tecla(g, 'Comma');
    const tetoPrimaria = p.ammo.ak.res;
    const saldoNoTeto = saldo(g);
    tecla(g, 'Comma');
    const naoDebitouNoTeto = saldo(g) === saldoNoTeto;
    const baseSecundaria = p.ammo.pistol.res;
    tecla(g, 'Period');
    const depoisPonto = p.ammo.pistol.res;
    check('EJ21', 'vírgula/ponto compram um cartucho até o teto sem débito excedente',
      depoisVirgula === basePrimaria + 30 && tetoPrimaria === 180 && naoDebitouNoTeto
      && depoisPonto === baseSecundaria + 12,
      { basePrimaria, depoisVirgula, tetoPrimaria, baseSecundaria, depoisPonto, saldo: saldo(g) });
  }

  {
    const g = boot({ mut: mut.boot });
    const segundos = Math.round(g._compra.compraAte - g.stateUntil);
    const aviso = g.el?.bannerSub?.textContent || '';
    check('EJ22', 'rodada começa com aviso e janela de compra de 50 segundos',
      segundos === 50 && /PREPARE-SE PARA COMPRAR/i.test(aviso) && /50 SEGUNDOS/i.test(aviso),
      { segundos, aviso });
  }

  {
    // Saldo garantido antes da morte; relógio além da janela inicial para medir a reabertura.
    // A recompra só vale depois de conferir a perda da arma: docs/ECONOMIA-PARTIDA.md.
    const renasce = (g) => {
      const p = g.player;
      const preco = charWeapon(PERSONAGEM.id) === 'ak' ? 2450 : 2700;   // tabela + assinatura (EJ4)
      const sobra = 123;
      p.carteira.saldo = 2 * preco + sobra;
      const comprou = g._compra.comprar('ak');
      const antes = g.drops.filter((d) => d.weapon === 'ak').length;
      g.time = g._compra.compraAte + 7;
      g.state = 'live';
      matar(g, p, inimigo(g), 'AK');
      const caiu = g.drops.filter((d) => d.weapon === 'ak').length - antes;
      g._respawnPlayer();
      // no renascimento o aviso vai no TÍTULO do banner (sub vazio); no começo da rodada, no sub
      const aviso = `${g.el?.bannerTitle?.textContent || ''} ${g.el?.bannerSub?.textContent || ''}`;
      const perdeu = !p.primary && p.weapon === 'pistol';
      const janela = Math.round(g._compra.compraAte - g.time);
      const recompra = g._compra.comprar('ak');
      const recompraOk = recompra.ok && p.primary === 'ak' && saldo(g) === sobra;
      return {
        comprou: comprou.ok, caiu, perdeu, janela, aviso,
        recompra: recompra.ok ? `${p.primary}/${saldo(g)}` : recompra.motivo || 'RECUSOU', recompraOk,
      };
    };
    const rodada = renasce(boot({ mut: mut.boot }));
    const ga = boot({ mut: mut.boot });
    ga.arena = true;   // mesmo campo que ?arena=1 liga (o QS congela no import do módulo)
    const arena = renasce(ga);
    const clausula = (r) => r.comprou && r.caiu === 1 && r.perdeu && r.janela === 50
      && /PREPARE-SE PARA COMPRAR/i.test(r.aviso) && /50 SEGUNDOS/i.test(r.aviso) && r.recompraOk;
    check('EJ23', 'renascer reabre a janela de 50 s com banner e aceita a recompra nela, em rodada e arena',
      clausula(rodada) && clausula(arena), { rodada, arena });
  }

  {
    const off = boot({ economia: false, mut: mut.boot });
    check('EJ2', 'sem economia: arma do personagem e armário de hoje',
      !off._compra && off.player.weapon === charWeapon(PERSONAGEM.id) && rack(off) > 0,
      { weapon: off.player.weapon, rack: rack(off) });
  }

  {
    const modos = ['awp', 'knife', 'pistols'].map((m) => !!boot({ settings: { wpnMode: m } })._compra);
    const ded = !!boot({ dedicated: true })._compra;
    check('EJ8', 'modos especiais e dedicado sem loja', !modos.some(Boolean) && !ded, { modos, ded });
  }
  return rows;
}

// EJ9: espiões no localStorage e no fetch durante TODA a medição
function comEspiao(fn) {
  const sujo = [];
  const ls = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), f0 = globalThis.fetch;
  const mem = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, writable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { if (/treta/i.test(k)) sujo.push(`set:${k}`); mem.set(k, String(v)); },
      removeItem: (k) => { if (/treta/i.test(k)) sujo.push(`rm:${k}`); mem.delete(k); },
      clear: () => sujo.push('clear'),
    },
  });
  globalThis.fetch = (u) => { if (/treta/i.test(String(u))) sujo.push(`fetch:${u}`); return Promise.resolve({ ok: true, json: async () => ({}) }); };
  let rows;
  try { rows = fn(); } finally {
    if (ls) Object.defineProperty(globalThis, 'localStorage', ls); else delete globalThis.localStorage;
    globalThis.fetch = f0;
  }
  rows.push({ id: 'EJ9', nome: 'carteira do menu intocada', pass: sujo.length === 0, obs: { sujo: sujo.slice(0, 5) } });
  return rows;
}

const MUTANTES = {
  'carteira-menu': { boot: (g) => {
    if (!g._compra) return;
    const a = g._compra.aoAbate.bind(g._compra);
    g._compra.aoAbate = (...x) => { a(...x); globalThis.localStorage.setItem('cs_treta_saldo', String(g.player.carteira.saldo)); };
  } },
  'tecla1-awp': { boot: (g) => { g._slotPrimaria = () => g.player.primary || 'awp'; } },
  'sem-perda': { boot: (g) => { if (g._compra) g._compra.rearmar = () => {}; } },
  'bot-sem-perda': { boot: (g) => { if (g._compra) g._compra._rearmarBot = () => {}; } },
  'bot-gancho-depois-do-g': { boot: (g) => {
    if (!g._compra) return;
    // troca a malha antes, mas o posicionamento cai na malha velha (o `g` capturado antes do gancho)
    const c = g._compra, ren = c.aoRenascerBot.bind(c), r0 = g._respawnEntity.bind(g);
    c.aoRenascerBot = () => {};
    g._respawnEntity = (b) => { const velha = b.mesh; ren(b); const nova = b.mesh; b.mesh = velha; r0(b); b.mesh = nova; };
  } },
  'bot-nao-recompra-no-renascer': { boot: (g) => {
    // a regra ANTES de 31/10: renasce rearmando, sem recomprar
    if (!g._compra) return;
    const c = g._compra; c.aoRenascerBot = (b) => { if (!b._remote) c._rearmarBot(b); };
  } },
  'sem-reabertura-respawn': { boot: (g) => {
    if (!g._compra) return;
    const c = g._compra, r0 = g._respawnPlayer.bind(g);
    // renascer sem reabrir a janela nem mostrar o banner (comportamento pré-31/10)
    g._respawnPlayer = () => {
      const el = g.el, ate = c.compraAte, t = el?.bannerTitle?.textContent, s = el?.bannerSub?.textContent;
      r0(); c.compraAte = ate;
      if (el?.bannerTitle) el.bannerTitle.textContent = t;
      if (el?.bannerSub) el.bannerSub.textContent = s;
    };
  } },
  'recusa-compra-no-renascer': { boot: (g) => {
    if (!g._compra) return;
    const c = g._compra, comp = c.comprar.bind(c), r0 = g._respawnPlayer.bind(g);
    // janela+banner reabrem normalmente, mas a janela REABERTA recusa a compra (EJ23)
    let janela0 = null;
    g._respawnPlayer = (...x) => { janela0 = c.compraAte; return r0(...x); };
    c.comprar = (...x) => (janela0 !== null && g.time > janela0 ? { ok: false, motivo: 'tempo' } : comp(...x));
  } },
  'bot-troca-arma-do-chao': { boot: (g) => {
    if (!g._compra) return;
    const c = g._compra;
    c._botCompra = (b) => { const id = b._armaAlvo; if (b.weapon === id || b.carteira.saldo < 1050) return; b.carteira.saldo -= 1050; c._armarBot(b, id); };
  } },
  'bot-de-graca': { boot: (g) => { if (g._compra) g._compra._botCompra = (b) => g._compra._armarBot(b, b._armaAlvo); } },
  'sem-tecla': { boot: (g) => { if (g._compra) g._compra.tecla = () => false; } },
  'b-sempre-camera': { boot: (g) => {
    const original = g._kd.bind(g);
    g._kd = (e) => {
      if (e.code === 'KeyB' && !g._compra?.podeComprar()) g.setCamView(g.camView === 'first' ? 'third' : 'first');
      return original(e);
    };
  } },
  'repete-compra': { boot: (g) => { if (g._compra) { const t = g._compra.tecla.bind(g._compra); g._compra.tecla = (c) => t(c, false); } } },
  'mapa-armas': { boot: (g) => { if (g._mapId === 'piscina_treta') g.world.pickups = [{ x: 0, y: 0, z: 0, weapon: 'ak' }]; } },
  'sem-municao': { boot: (g) => { if (g._compra) g._compra.comprarMunicao = () => ({ ok: false, motivo: 'item' }); } },
  'municao-sem-teto': { boot: (g) => { if (g._compra) g._compra.limiteMunicao = () => Number.MAX_SAFE_INTEGER; } },
  'compra-vinte': { boot: (g) => {
    if (!g._compra) return;
    const start = g.start.bind(g);
    g.start = () => {
      const r = start();
      g._compra.compraAte = g.stateUntil + 20;
      if (g.el?.bannerSub) g.el.bannerSub.textContent = 'PREPARE-SE PARA COMPRAR · VOCÊ TEM 20 SEGUNDOS';
      return r;
    };
  } },
  'pickup-mao': { boot: (g) => { const r = g._grabPickup.bind(g); g._grabPickup = (pk, who, isP) => { const c = g._compra; g._compra = null; const x = r(pk, who, isP); g._compra = c; return x; }; } },
  'awp-na-rodinha': { fonte: (s) => s.replace('const slots = [this._slotPrimaria(),', "const slots = [p.primary || 'awp',") },
  'equip-sem-entrega': { boot: (g) => { if (g._compra) g._compra._vestir = () => {}; } },
  'equip-nao-perde': { boot: (g) => {
    if (!g._compra) return;
    const a = g._compra.aoAbate.bind(g._compra);
    g._compra.aoAbate = (v, ...x) => { const e = [v.armor, v.helmet, v.flashes]; a(v, ...x); [v.armor, v.helmet, v.flashes] = e; };
  } },
  'rodada-zera-equip': { boot: (g) => { g._equiparArmadura = (ent) => { ent.armor = 0; ent.helmet = false; }; } },
  'loja-ignora-switch': { boot: (g) => { if (g._compra) g._compra.desligados = () => []; } },
  'armario': { boot: (g) => {
    if (!g._compra) return;
    const r = g._resetPositions.bind(g);
    g._resetPositions = () => { const c = g._compra; g._compra = null; r(); g._compra = c; };
  } },
  // Causal do CANT_TEST: boot que explode tem que ser classificado, nunca contado como mordida.
  'boot-explode': { causal: true, boot: () => { throw new Error('mutante causal: boot explodiu antes do start'); } },
};
const mutanteAlvo = process.argv.find((arg) => arg.startsWith('--mutante='))?.slice('--mutante='.length) || null;
if (mutanteAlvo && !MUTANTES[mutanteAlvo]) throw new Error(`Mutante desconhecido: ${mutanteAlvo}`);
const mutantesExecutados = mutanteAlvo ? [[mutanteAlvo, MUTANTES[mutanteAlvo]]] : Object.entries(MUTANTES).filter(([, m]) => !m.causal);

const print = (rows) => rows.map((r) => `${r.pass ? 'ok ' : 'XX '} ${r.id} ${r.nome}${r.pass ? '' : ' ' + JSON.stringify(r.obs)}`).join('\n');
const real = comEspiao(() => medir());
console.log(print(real));
const falhas = real.filter((r) => !r.pass);
const cegos = [], cantTest = [];
for (const [nome, m] of mutantesExecutados) {
  if (!mutanteAlvo) {
    const r = rodarMutanteIsolado(fileURLToPath(import.meta.url), nome, real.length);
    console.log(r.linha);
    if (r.estado === 'cego') cegos.push(nome);
    if (r.estado === 'cant_test') cantTest.push(nome);
    continue;
  }
  let vermelhas, erro = null;
  try {
    // o obs acompanha o vermelho: prova que a cláusula certa mordeu, não vermelho por acaso
    vermelhas = comEspiao(() => medir(m)).filter((r) => !r.pass).map((r) => `${r.id} ${JSON.stringify(r.obs)}`);
  } catch (e) { erro = e; }
  if (erro) { console.log(`mutante ${nome}: CANT_TEST — exceção do arnês sob mutante (NÃO conta mordida): ${erro.message}`); cantTest.push(nome); }
  else {
    console.log(`mutante ${nome}: ${vermelhas.length ? 'DETECTADO (' + vermelhas.join(' | ') + ')' : 'VERDE, régua cega'}`);
    if (!vermelhas.length) cegos.push(nome);
  }
}
console.log(`\neconomia no jogo: ${real.length - falhas.length}/${real.length} verdes; mutantes cegos: ${cegos.length ? cegos.join(',') : 'nenhum'}; cant_test: ${cantTest.length ? cantTest.join(',') : 'nenhum'}`);
if (falhas.length || cegos.length || cantTest.length) process.exitCode = 1;
process.exit();
