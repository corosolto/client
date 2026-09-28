/* Teste offline do playtester: métricas de partida, baseline e regressão. */
import { resumoDaPartida, fpsDe, compararBaseline, corpoIssue } from '../rodada.mjs';
import { carregarPersona } from '../../lib/persona.mjs';

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);

  const amostras = [
    { t: 0, mapa: 'quebrada', combatants: [{ isPlayer: true, vivo: true, x: 0, y: 1.7, z: 0, ground: 1.7 }], pickups: [{ x: 1, z: 1, tomado: false }, { x: 80, z: 80, tomado: false }] },
    { t: 3, mapa: 'quebrada', combatants: [{ isPlayer: true, vivo: true, x: 1, y: 1.7, z: 1, ground: 1.7 }, { vivo: true, x: 70, y: 1.7, z: 71 }], pickups: [{ x: 1, z: 1, tomado: true }, { x: 80, z: 80, tomado: false }] },
    { t: 6, mapa: 'quebrada', combatants: [{ isPlayer: true, vivo: true, x: 1, y: 1.7, z: 1, ground: 1.7 }], pickups: [{ x: 1, z: 1, tomado: true }, { x: 80, z: 80, tomado: false }] },
  ];
  const r = resumoDaPartida(amostras);
  t.igual(r.mapa, 'quebrada', 'mapa vem do _mapId da partida');
  t.igual(r.naoAlcancados.length, 1, 'um pickup não alcançado (ninguém chegou perto)');
  t.ok(r.naoAlcancados[0].minDist > 2, 'distância mínima registrada (acima do raio)');
  t.ok(r.tomados >= 1, 'pickup tomado não conta como não alcançado');
  t.ok(!r.spawnSuspeito, 'spawn com y == ground é limpo');
  const morto = resumoDaPartida([
    { t: 0, mapa: 'x', combatants: [{ isPlayer: true, vivo: true, x: 0, y: -1, z: 0, ground: 1.7 }], pickups: [] },
  ]);
  t.ok(morto.spawnSuspeito, 'spawn com y abaixo do ground além da tolerância é DENTRO da geometria');
  const tolerante = resumoDaPartida([
    { t: 0, mapa: 'x', combatants: [{ isPlayer: true, vivo: true, x: 0, y: 1.5, z: 0, ground: 1.7 }], pickups: [] },
  ]);
  t.ok(!tolerante.spawnSuspeito, 'diferença dentro da tolerância não é defeito');

  const f = fpsDe({ frames: 90, ms: 10_000, frameMs: [16, 17, 18, 19, 50] });
  t.igual(f.fpsMedio, 9, 'fps médio = frames/tempo');
  t.igual(f.frameP95ms, 50, 'p95 do frame time');

  const base = { naoAlcancados: [], spawnSuspeito: false, fps: { fpsMedio: 6 } };
  t.igual(compararBaseline(base, { naoAlcancados: [], spawnSuspeito: false, fps: { fpsMedio: 5.8 } }).length, 0, 'variação pequena de fps NÃO é regressão');
  t.igual(compararBaseline(base, { naoAlcancados: [{ i: 1 }], spawnSuspeito: false, fps: { fpsMedio: 6 } }).length, 1, 'pickup novo não alcançado é regressão');
  t.igual(compararBaseline(base, { naoAlcancados: [], spawnSuspeito: true, fps: { fpsMedio: 6 } }).length, 1, 'spawn piorou é regressão');
  t.igual(compararBaseline(base, { naoAlcancados: [], spawnSuspeito: false, fps: { fpsMedio: 4 } }).length, 1, 'fps caindo além do limiar é regressão');
  t.igual(compararBaseline({ naoAlcancados: [{ i: 0 }], spawnSuspeito: true, fps: { fpsMedio: 4 } }, { naoAlcancados: [], spawnSuspeito: false, fps: { fpsMedio: 6 } }).length, 0, 'MELHORA não é regressão');

  const issue = corpoIssue('quebrada', {
    duracaoS: 90, pickups: 22, tomados: 3, naoAlcancados: [{ i: 4, minDist: 88.2 }], spawnSuspeito: false, fps: { fpsMedio: 4.2, frameP95ms: 610 },
  }, [{ metrica: 'fps médio', base: 6, atual: 4.2 }], '/tmp/relatorio.json');
  t.contem(issue, '<!-- playtester: regressao quebrada -->', 'issue com marcador de mapa');
  t.contem(issue, `**${persona.nome}**`, 'issue abre com cartão da persona');
  t.ok(/^\| métrica\s+/m.test(issue), 'issue traz tabela de regressão');
  t.ok(persona.bordoes.some((b) => issue.includes(`— *${b}`)), 'issue fecha com bordão');
  t.contem(issue, 'MESMO ambiente', 'issue avisa que fps só vale relativo à baseline');
}
