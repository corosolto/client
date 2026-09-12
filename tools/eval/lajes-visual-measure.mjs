/* Geometria ativa, também serializada no browser com GLBs reais.
   Migração das cláusulas V3: docs/maps/LAJES-V4-DIRECAO.md. */
export function measureLajesVisual(THREE, game) {
  const w = game.world, tolerance = 1e-3;
  if (w.design?.revision !== 6) throw Error('Não sei medir: esperado layout Lajes V6');
  const arrows = [], doors = [], roofs = [];
  w.root.updateMatrixWorld(true);
  w.root.traverse(m => {
    if (m.userData.routeCue) arrows.push(m);
    if (m.userData.lajesDoor) doors.push(m);
    if (m.userData.lajesPlatform) roofs.push(m);
  });
  const arrowSamples = arrows.map(m => {
    const box = new THREE.Box3().setFromObject(m);
    const n = new THREE.Vector3(0, 0, 1).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(m.matrixWorld));
    return { heightSpan: box.max.y - box.min.y, normalY: n.y,
      valid: box.max.y - box.min.y < tolerance && n.y > 1 - tolerance };
  });
  const doorSamples = doors.map(m => {
    const b = new THREE.Box3().setFromObject(m), center = b.getCenter(new THREE.Vector3());
    const height = b.max.y - b.min.y, width = Math.max(b.max.z - b.min.z, b.max.x - b.min.x);
    const normal = new THREE.Vector3(...(m.userData.facadeNormal || [-Math.sign(center.x), 0, 0]));
    const origin = center.clone().add(normal);
    const ray = new THREE.Raycaster(origin, normal.clone().negate(), 0, 2);
    const visual = ray.intersectObject(m)[0], bullet = ray.intersectObjects(w.occluders, false)[0];
    const delta = visual && bullet ? Math.abs(visual.distance - bullet.distance) : null;
    return { center: center.toArray(), width, height, delta,
      valid: height >= 2 && height <= 2.3 && width >= .85 && width <= 1.1 && delta !== null && delta < tolerance };
  });
  const roofSamples = roofs.map(m => {
    const b = new THREE.Box3().setFromObject(m), p = b.getCenter(new THREE.Vector3());
    p.y = b.max.y + .25;
    const ray = new THREE.Raycaster(p, new THREE.Vector3(0, -1, 0), 0, .5);
    const visual = ray.intersectObject(m)[0], bullet = ray.intersectObjects(w.occluders, false)[0];
    const delta = visual && bullet ? Math.abs(visual.distance - bullet.distance) : null;
    return { center: p.toArray(), delta, valid: delta !== null && delta < tolerance };
  });
  const spawnSamples = [];
  for (const a of w.spawns.E) for (const b of w.spawns.B) {
    const from = new THREE.Vector3(a.x, w.groundHeightAt(a.x, a.z) + 1.62, a.z);
    const to = new THREE.Vector3(b.x, w.groundHeightAt(b.x, b.z) + 1.62, b.z);
    const direction = to.clone().sub(from), distance = direction.length();
    const hit = new THREE.Raycaster(from, direction.normalize(), 0, distance).intersectObjects(w.occluders, false)[0];
    spawnSamples.push({ from: from.toArray(), to: to.toArray(), blocked: !!hit, valid: !!hit });
  }
  const row = (expected, samples) => ({ expected, count: samples.length,
    valid: samples.length === expected && samples.every(s => s.valid), samples });
  return { tolerance, arrows: row(4, arrowSamples), doors: row(48, doorSamples), roofs: row(4, roofSamples),
    spawnLOS: { ...row(16, spawnSamples), clear: spawnSamples.filter(s => !s.blocked).length } };
}
