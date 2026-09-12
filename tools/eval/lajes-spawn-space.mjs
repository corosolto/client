// Respawn em travessa sem pátio: contrato humano V6 e procedência em docs/maps/LAJES-V7-SPAWN.md.
export function medirRespawnBeco(game) {
  const R = .38, STEP = .30, EPS = 1e-6, SAMPLE = R / 2;
  const evidence = { radius: R, diameter: 2 * R, sampleStep: SAMPLE, maxFloor: STEP, checks: [], slots: [], pairs: [] };
  const check = (id, ok, detail) => evidence.checks.push({ id, ok: !!ok, detail });
  const W = game?.world;
  if (!W || typeof game._collide !== 'function' || typeof game._spawnY !== 'function' || typeof W.groundHeightAt !== 'function'
    || typeof W.findPath !== 'function' || typeof W.nearestWaypoint !== 'function'
    || !Array.isArray(W.waypoints?.nodes) || !Array.isArray(W.waypoints?.adj)) {
    check('estrutura', false, 'Game, colisão, apoio ou navegação ausentes');
    return { ok: false, evidence };
  }
  const teams = Object.entries(W.spawns || {}), nodes = W.waypoints.nodes;
  check('slots', teams.length === 2 && teams.every(([, slots]) => Array.isArray(slots) && slots.length === 4), '2 equipes × 4 slots da planta V6');
  const field = W.praca;
  check('campo', field && field.x0 === -5.1 && field.x1 === 5.1 && field.z0 === -7.5 && field.z1 === 7.5, 'campo central da planta V6: x ±5,1; z ±7,5');
  if (evidence.checks.some(c => !c.ok)) return { ok: false, evidence };
  const insideField = p => p.x >= field.x0 && p.x <= field.x1 && p.z >= field.z0 && p.z <= field.z1;
  let collisionSamples = 0;
  const probe = (x, z, previousFloor = 0) => {
    const y = W.groundHeightAt(x, z, previousFloor), p = { x, y, z };
    if (![x, y, z].every(Number.isFinite) || y < -EPS || y > STEP + EPS || Math.abs(y - previousFloor) > STEP + EPS)
      return { ok: false, x, y, z, reason: 'apoio fora do térreo ou salto de altura' };
    game._collide(p, R); collisionSamples++;
    const displacement = Math.hypot(p.x - x, p.z - z);
    return { ok: Number.isFinite(displacement) && displacement <= EPS, x, y, z, displacement };
  };
  const walk = (start, path) => {
    let p = { ...start, y: 0 }, length = 0, samples = 0;
    for (const target of path) {
      if (![target.x, target.y, target.z].every(Number.isFinite) || Math.abs(target.y) > STEP + EPS
        || target.x < W.bounds.minX || target.x > W.bounds.maxX || target.z < W.bounds.minZ || target.z > W.bounds.maxZ)
        return { ok: false, reason: 'rota sobe para outra camada', at: target, length, samples };
      const source = { ...p }, distance = Math.hypot(target.x - p.x, target.z - p.z);
      const count = Math.max(1, Math.ceil(distance / SAMPLE));
      for (let i = 1; i <= count; i++) {
        const next = probe(source.x + (target.x - source.x) * i / count, source.z + (target.z - source.z) * i / count, p.y);
        samples++;
        if (!next.ok) return { ok: false, reason: 'segmento sem passagem física no térreo', at: next, length, samples };
        length += Math.hypot(next.x - p.x, next.z - p.z); p = next;
      }
    }
    return { ok: insideField(p) && length > 2 * R, length, samples, end: { x: p.x, y: p.y, z: p.z } };
  };
  const target = { x: 0, y: 0, z: 0 }, to = W.nearestWaypoint(target.x, target.z, 0);
  for (const [team, slots] of teams) {
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      const distance = Math.hypot(slots[i].x - slots[j].x, slots[i].z - slots[j].z);
      const ok = Number.isFinite(distance) && distance + EPS >= 2 * R;
      evidence.pairs.push({ team, a: i, b: j, distance, ok });
    }
    for (const [index, slot] of slots.entries()) {
      const at = probe(slot.x, slot.z), spawnY = game._spawnY(slot.x, slot.z);
      const ground = at.ok && Number.isFinite(spawnY) && Math.abs(spawnY) <= EPS && Math.abs(at.y) <= EPS && !insideField(slot);
      const sideBySide = ['x', 'z'].map(axis => {
        const points = [-R, R].map(offset => probe(slot.x + (axis === 'x' ? offset : 0), slot.z + (axis === 'z' ? offset : 0)));
        return { axis, ok: points.every(p => p.ok && Math.abs(p.y) <= EPS), points };
      });
      const from = W.nearestWaypoint(slot.x, slot.z, 0), ids = W.findPath(from, to);
      const validPath = Array.isArray(ids) && ids.length > 0 && ids.length <= nodes.length
        && ids[0] === from && ids.at(-1) === to && ids.every(id => Number.isInteger(id) && nodes[id])
        && ids.slice(1).every((id, i) => W.waypoints.adj[ids[i]]?.includes(id));
      const route = ground && validPath ? walk(slot, [...ids.map(id => nodes[id]), target])
        : { ok: false, reason: ground ? 'findPath não retornou caminho completo no grafo real' : 'slot não é térreo livre na travessa' };
      evidence.slots.push({ team, index, x: slot.x, z: slot.z, spawnY, ground, at, sideBySide, route });
    }
  }
  check('terreo-livre', evidence.slots.every(s => s.ground), '8 corpos de raio 0,38m livres no térreo, fora do campo');
  check('separacao', evidence.pairs.every(p => p.ok), 'pares da mesma equipe separados por pelo menos 0,76m');
  check('dois-corpos', evidence.slots.every(s => s.sideBySide.some(a => a.ok)), 'cada slot comporta centros em ±0,38m no eixo x ou z');
  check('saida-terrea', evidence.slots.every(s => s.route.ok), '8 percursos findPath completos até o campo, com passos ≤0,19m e colisão/apoio reais');
  evidence.collisionSamples = collisionSamples;
  return { ok: evidence.checks.every(c => c.ok), evidence };
}
