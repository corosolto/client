import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Uma falha de setup/âncora não é evidência de que a regressão foi detectada.
const familias = {
  collider: ['operacao-flavio-collider-check.mjs', {
    'fallback-solido': 'FALHA loaded-fallback-identical-colliders:',
    'proxy-so-glb': 'FALHA plane-proxy-independent-of-template:',
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
    'sem-retomada': '✗ nova rodada sem countdown observado, estado anterior live:',
    'sem-reancora': '✗ retomada live reancora jogador vivo e limpa predição:',
    'sem-limpar-drops': '✗ retomada live remove drops da rodada anterior e preserva rack:',
    'sem-fim-identidade': '✗ retomada roundEnd de outra rodada substitui a cerimônia anterior uma única vez:',
    'reset-match-end': '✗ matchEnd não prepara uma rodada de jogo mesmo com roundNum novo:',
    'empate-desconhecido': '✗ salto com dois placares crescidos mostra resultado desconhecido sem inventar empate:',
  }],
  reset: ['operacao-flavio-reset-check.mjs', {
    'sem-reset': 'avião volta à posição original após rodada 1, online=false',
  }, 'Mutação aplicada: rodada preserva a posição anterior do avião.'],
  npc: ['operacao-flavio-npc-check.mjs', {
    'sem-id': '✗ snapshot do objetivo identifica VIP pelo id autoritativo:',
    'sem-reserva': '✗ corpos com o mesmo personagem preservam NPC e humano, ordem humano primeiro:',
  }],
  marcha: ['operacao-flavio-marcha-check.mjs', {
    'marcha-curta': 'spec docs/maps/operacao-decola.md: marcha18–24s, medida=',
  }, 'Mutante marcha-curta aplicado'],
  codec: ['objective-codec-contract-check.mjs', {
    'sem-time-j': '✗ v7 preserva NPC do terceiro time:',
    'limite-64': '✗ v7 comporta os 80 slots do contrato comum:',
    'j-legado': '✗ formatos anteriores continuam recusando terceiro time:',
  }],
  entrada: ['mode-announcements-entry-check.mjs', {
    'gesto-vaza': 'gesto não dispara ação padrão sob a splash',
    'import-tardio': 'download tardio não reabre anúncio',
  }],
  catalogo: ['mode-announcements-check.mjs', {
    'modo-ausente': 'force não anuncia um modo ausente do catálogo jogável',
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
