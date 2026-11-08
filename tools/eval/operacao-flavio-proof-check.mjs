import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Uma falha de setup/âncora não é evidência de que a regressão foi detectada.
const familias = {
  collider: ['operacao-flavio-collider-check.mjs', {
    'fallback-solido': 'FALHA loaded-fallback-identical-colliders:',
    'sombra-fallback-solido': 'FALHA low-profile-avoids-transmission-and-decorative-shadows:',
    'cadeiras-gigantes': 'FALHA airport-chairs-human-scale-and-aligned-colliders:',
    'sem-rota-interna': 'FALHA five-service-routes-survive-cover-and-reach-boarding:',
    'sem-cobertura-extra': 'FALHA solid-covers-and-lateral-cover-points:',
    'proxy-so-glb': 'FALHA plane-proxy-independent-of-template:',
    'sem-yaw': 'FALHA prop-yaw-rotates-aabb:',
    'sem-asas': 'FALHA plane-proxy-independent-of-template:',
    'spawn-invertido': 'FALHA spawn-clearance-and-first-read:',
    'sem-cobertura': 'FALHA solid-covers-and-lateral-cover-points:',
    'lateral-nua': 'FALHA lateral-cover-chain-and-corridor-sightlines:',
    'corredor-sem-rele': 'FALHA lateral-cover-chain-and-corridor-sightlines:',
    'onibus-torto': 'FALHA bus-aligned-with-collider:',
    'caixote-fora-da-pilha': 'FALHA crate-stacks-render-equals-collider:',
    'rota-n2': 'FALHA graph-build-uses-local-candidates:',
    'vidro-low-fisico': 'FALHA low-profile-avoids-transmission-and-decorative-shadows:',
    'e-spawn-invertido': 'FALHA spawn-clearance-and-first-read:',
    'sombras-low-completas': 'FALHA low-profile-avoids-transmission-and-decorative-shadows:',
    'sem-jardineira-embarque': 'FALHA real-cover-hides-vip-and-stops-hitscan:',
    'container-oeste-decorativo': 'FALHA real-cover-hides-vip-and-stops-hitscan:',
    'gpu-decorativo': 'FALHA real-cover-hides-vip-and-stops-hitscan:',
    'ponto-sem-papel': 'FALHA cover-points-usable-and-formation-ready:',
    'ponto-afastado': 'FALHA cover-points-usable-and-formation-ready:',
    'armadilha-lounge': 'FALHA boarding-lounge-not-a-respawn-trap:',
    'bay-vira-beco': 'FALHA real-cover-hides-vip-and-stops-hitscan:',
    'ilha-patio-fantasma': 'FALHA real-cover-hides-vip-and-stops-hitscan:',
    'anel-no-lounge': 'FALHA lounge-without-floor-rings:',
    'faixa-afunda': 'FALHA hangar-stripes-above-slab:',
    'escada-invertida': 'FALHA boarding-stairs-face-door-from-every-route:',
    'escada-longe-da-porta': 'FALHA boarding-stairs-face-door-from-every-route:',
    'aviao-sem-espelho': 'FALHA boarding-stairs-face-door-from-every-route:',
    'placa-sem-seta': 'FALHA boarding-label-above-door:',
    'placa-oclusora': 'FALHA boarding-label-above-door:',
    'escada-solida': 'FALHA boarding-stairs-climbable:',
    'escada-plana': 'FALHA boarding-stairs-climbable:',
    'escada-degrau-alto': 'FALHA boarding-stairs-climbable:',
    'escada-sem-nav': 'FALHA boarding-stairs-climbable:',
    'asa-larga': 'FALHA aircraft-ring-walkable-and-faithful-colliders:',
    'fuselagem-larga': 'FALHA aircraft-ring-walkable-and-faithful-colliders:',
    'limite-norte-antigo': 'FALHA aircraft-ring-walkable-and-faithful-colliders:',
    'carro-na-asa': 'FALHA aircraft-ring-walkable-and-faithful-colliders:',
    'anel-fora-do-grafo': 'FALHA aircraft-ring-walkable-and-faithful-colliders:',
    'sem-detalhe-embarque': 'FALHA ground-operation-detail-around-boarding:',
    'carro-gigante': 'FALHA vehicle-props-human-scale-and-aligned-colliders:',
    'carro-eixo-trocado': 'FALHA vehicle-props-human-scale-and-aligned-colliders:',
    'balcao-gigante': 'FALHA vehicle-props-human-scale-and-aligned-colliders:',
    'jardineira-render-baixo': 'FALHA vehicle-props-human-scale-and-aligned-colliders:',
    'kit-barreira-no-patio': 'FALHA vehicle-props-human-scale-and-aligned-colliders:',
    'variante-no-container': 'FALHA escort-route-explicit-and-clear:',
    'variante-sem-no': 'FALHA escort-route-explicit-and-clear:',
    'variante-longe-da-escada': 'FALHA escort-route-explicit-and-clear:',
  }],
  menu: ['operacao-flavio-menu-check.mjs', Object.fromEntries(
    ['preferencia', 'sem-objetivo', 'botoes-ativos', 'rotulo'].map(m => [m, 'FALHA menu-objective-operacao_flavio-ctf:']))],
  'room-form': ['operacao-flavio-room-form-check.mjs', {
    'sem-prune': 'FALHA grade exclui seleção incompatível true/2:',
    'sem-validacao': 'FALHA criação recusa seleção obsoleta antes do ticket true/2:',
    'ctf-permitido': 'FALHA grade exclui seleção incompatível true/2:',
    'x1-permitido': 'FALHA grade exclui seleção incompatível false/1:',
    'sem-modo-evento': 'FALHA mudança real do campo atualiza a grade mp-modo:',
    'sem-tamanho-evento': 'FALHA mudança real do campo atualiza a grade mp-teamsize:',
  }],
  online: ['operacao-flavio-online-check.mjs', {
    'sem-hud': '✗ HUD online reflete snapshot autoritativo e relógio atual:',
    'sem-cinematica': '✗ vitória online dispara cinemática e título do objetivo:',
    'sem-reset': '✗ nova rodada online restaura apresentação sem reescrever o relógio do servidor:',
    'sem-placar': '✗ vitória online dispara cinemática e título do objetivo:',
    'sem-ordem': '✗ morte do VIP no snapshot de roundEnd determina o título atual:',
    'sem-parar': '✗ reset e nova cinemática encerram todas as fontes anteriores:',
    'titulo-antigo': '✗ vitória online dispara cinemática e título do objetivo:',
    'hud-antigo': '✗ vitória online dispara cinemática e título do objetivo:',
    'sem-retomada': '✗ nova rodada sem countdown observado, estado anterior live:',
    'sem-reancora': '✗ retomada live reancora jogador vivo e limpa predição:',
    'sem-limpar-drops': '✗ retomada live remove drops da rodada anterior e preserva rack:',
    'sem-fim-identidade': '✗ retomada roundEnd de outra rodada substitui a cerimônia anterior uma única vez:',
    'reset-match-end': '✗ matchEnd não prepara uma rodada de jogo mesmo com roundNum novo:',
    'empate-desconhecido': '✗ salto com dois placares crescidos mostra resultado desconhecido sem inventar empate:',
    'sem-winner-atual': '✗ salto com winner explícito atual E encena uma única vez:',
    'winner-persistido': '✗ winner ausente não herda estado antigo sem troca de identidade:',
  }],
  reset: ['operacao-flavio-reset-check.mjs', {
    'sem-reset': 'avião volta à posição original após rodada 1, online=false',
  }, 'Mutação aplicada: rodada preserva a posição anterior do avião.'],
  npc: ['operacao-flavio-npc-check.mjs', {
    'sem-id': '✗ snapshot do objetivo identifica VIP pelo id autoritativo:',
    'sem-reserva': '✗ corpos com o mesmo personagem preservam NPC e humano, ordem humano primeiro:',
    'limite-id16': '✗ estado publica apenas identificadores inteiros dentro do contrato:',
    'limite-reserva16': '✗ recepção uint32 reserva VIP mesmo com humano de mesma skin, ordem humano primeiro:',
  }],
  marcha: ['operacao-flavio-marcha-check.mjs', {
    'marcha-curta': 'spec docs/maps/operacao-decola.md: marcha18–24s, medida=',
  }, 'Mutante marcha-curta aplicado'],
  codec: ['objective-codec-contract-check.mjs', {
    'sem-time-j': '✗ v8 preserva NPC do terceiro time:',
    'limite-64': '✗ v8 comporta os 80 slots do contrato comum:',
    'j-legado': '✗ formatos anteriores continuam recusando terceiro time:',
  }],
  entrada: ['mode-announcements-entry-check.mjs', {
    'gesto-vaza': 'gesto não dispara ação padrão sob a splash',
    'import-tardio': 'download tardio não reabre anúncio',
  }],
  catalogo: ['mode-announcements-check.mjs', {
    'modo-ausente': 'force não anuncia um modo ausente do catálogo jogável',
  }],
  lobby: ['lobby-flavio-check.mjs', {
    'card-resenha': 'FALHA LF1 o painel é a Operação Flávio, com o desenho da invasão',
    'modal-sem-imagem': 'FALHA LF2 o card abre a história com texto e a arte real',
    'esc-sem-foco': 'FALHA LF3 FECHAR e Escape fecham e devolvem o foco ao card',
    'jogar-mapa-errado': 'FALHA LF4 JOGAR leva ao VS BOTS no operacao_flavio',
    'en-faltando': 'FALHA LF5 a história existe em EN',
  }],
};

export function provaValida(result, marcador, clausula) {
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  return result.status === 1 && !result.signal && !result.error
    && stdout.split(/\r?\n/).includes(marcador) && stderr.includes(clausula);
}

if (process.argv.includes('--autoteste')) {
  const marker = 'Mutação aplicada: exemplo', clause = 'FALHA comportamento:';
  const valid = { status: 1, stdout: marker+'\n', stderr: clause+' esperado' };
  assert.ok(provaValida(valid, marker, clause));
  for (const invalid of [
    { ...valid, status: 0 }, { ...valid, status: 2 },
    { ...valid, stdout: '', stderr: 'alvo único' },
    { ...valid, stderr: 'erro de importação' },
    { ...valid, signal: 'SIGTERM' }, { ...valid, error: new Error('timeout') },
  ]) assert.equal(provaValida(invalid, marker, clause), false);
  console.log('✓ prova exige status1, aplicação e cláusula; setup, timeout e crash são rejeitados');
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const names = process.argv.slice(2);
  assert.ok(names.length && names.every(n => familias[n]), 'famílias conhecidas obrigatórias');
  for (const name of names) {
    const [script, mutations, marker] = familias[name];
    for (const [mutant, clause] of Object.entries(mutations)) {
      const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), '--mutante='+mutant],
        { encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 * 1024 });
      if (!provaValida(result, marker || 'Mutação aplicada: '+mutant, clause)) {
        console.error(`${name}/${mutant}: prova ausente; status=${result.status}; sinal=${result.signal}`);
        console.error((result.stdout || '').slice(-1800), (result.stderr || '').slice(-2500));
        process.exitCode = 1;
      } else console.log(`✓ ${name}/${mutant}: mutação aplicada e falha esperada`);
    }
  }
}
