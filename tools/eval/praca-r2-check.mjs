import { initTextures, bootGame, THREE } from './harness.mjs';

const arg = process.argv.find((value) => value.startsWith('--mutante='));
const mutante = arg ? arg.split('=')[1] : '';
const falhas = [];
const verdes = [];
let mutou = false;

const game = bootGame('praca_poderes', { textures: initTextures(), ctf: true, seed: 3311 });
const world = game.world;
const root = world.root;
game.scene.updateMatrixWorld(true);
root.updateMatrixWorld(true);

const visivel = (objeto) => {
  for (let atual = objeto; atual; atual = atual.parent) if (!atual.visible) return false;
  return true;
};

// PA1 — o espelho usa a água viva já auditada pelo runtime, em vez de um plano opaco.
{
  let agua = null;
  root.traverse((objeto) => {
    if (objeto.isMesh && objeto.userData?.aguaViva) agua = objeto;
  });
  if (mutante === 'agua' && agua) {
    agua.userData.aguaViva = false;
    agua = null;
    mutou = true;
  }
  if (!agua) {
    falhas.push('PA1: espelho sem mesh aguaViva');
  } else {
    const caixa = new THREE.Box3().setFromObject(agua);
    const lista = game.scene.userData.waters || [];
    const uniforme = agua.material?.uniforms || {};
    const sol = world.sun.position.clone().normalize();
    const alinhamento = uniforme.uSolDir?.value?.clone().normalize().dot(sol) ?? -1;
    if (!agua.material?.isShaderMaterial) falhas.push('PA1: aguaViva não usa ShaderMaterial');
    if (!lista.some((item) => item.mesh === agua)) falhas.push('PA1: água fora de scene.userData.waters');
    if (caixa.min.z < 70 || caixa.max.z > 90 || caixa.max.x - caixa.min.x < 20)
      falhas.push(`PA1: água fora da bacia (${caixa.min.x.toFixed(1)}..${caixa.max.x.toFixed(1)} / ${caixa.min.z.toFixed(1)}..${caixa.max.z.toFixed(1)})`);
    if (alinhamento < 0.98) falhas.push(`PA1: sol da água desalinhado (${alinhamento.toFixed(3)})`);
    if (uniforme.uProfEscala?.value > 1) falhas.push(`PA1: profundidade de oceano (${uniforme.uProfEscala.value})`);
    if (!falhas.some((falha) => falha.startsWith('PA1'))) verdes.push(`PA1 água viva e alinhada (dot ${alinhamento.toFixed(3)})`);
  }
}

// PA2 — das rotas sob os pilotis, o horizonte precisa terminar em massa urbana vertical.
{
  if (mutante === 'horizonte') {
    root.traverse((objeto) => {
      if (objeto.userData?.pracaHorizonte) {
        objeto.visible = false;
        mutou = true;
      }
    });
  }
  const alvos = [];
  root.traverse((objeto) => {
    if (objeto.isMesh && !objeto.isSprite && visivel(objeto) && objeto.material?.visible !== false) alvos.push(objeto);
  });
  const raio = new THREE.Raycaster();
  raio.near = 20;
  raio.far = 330;
  const origem = new THREE.Vector3();
  const direcao = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const angulos = [0, 10, -10, 20, -20, 35, -35, 50, -50].map((graus) => graus * Math.PI / 180);
  let total = 0;
  let acertos = 0;
  for (const sinal of [-1, 1]) for (const x of [36, 44]) for (let z = -60; z <= 60; z += 10) {
    for (const angulo of angulos) {
      origem.set(sinal * x, 1.62, z);
      direcao.set(sinal * Math.cos(angulo), 0, Math.sin(angulo)).normalize();
      raio.set(origem, direcao);
      total++;
      const acertou = raio.intersectObjects(alvos, false).some((hit) => {
        if (!hit.face) return false;
        normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        return Math.abs(normal.y) < 0.6;
      });
      if (acertou) acertos++;
    }
  }
  const fracao = acertos / total;
  if (fracao < 0.5) falhas.push(`PA2: horizonte urbano cobre ${(fracao * 100).toFixed(0)}% dos raios [mínimo 50%]`);
  else verdes.push(`PA2 horizonte urbano ${(fracao * 100).toFixed(0)}%`);
}

// PA3 — cobertura precisa bloquear LOS de verdade e preservar a faixa de navegação.
// Contar caixas próximas era insuficiente: uma peça baixa podia existir e a bala passar
// por cima. Aqui o raio cruza as dez malhas a 1 m, os oito spawns precisam ficar protegidos
// na altura do olho e nenhum collider pode invadir um waypoint com o raio do bot.
{
  const malhas = [];
  root.traverse((objeto) => { if (objeto.isMesh && objeto.userData?.pracaR2) malhas.push(objeto); });
  if (mutante === 'cobertura') {
    for (const m of malhas) { m.position.y += 9; m.updateMatrixWorld(true); mutou = true; }
    for (const c of world.colliders) {
      if (c.pracaR2) {
        c.minY = 9;
        c.maxY = 9.1;
        mutou = true;
      }
    }
  }
  if (mutante === 'navegacao') {
    for (const c of world.colliders.filter((item) => item.pracaR2)) {
      const cx = Math.sign((c.minX + c.maxX) / 2) * 35.2;
      const w = c.maxX - c.minX;
      c.minX = cx - w / 2; c.maxX = cx + w / 2; mutou = true;
    }
  }
  game.scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  let flancosBloqueados = 0;
  for (const m of malhas) {
    const caixa = new THREE.Box3().setFromObject(m);
    const cx = (caixa.min.x + caixa.max.x) / 2, cz = (caixa.min.z + caixa.max.z) / 2;
    const de = new THREE.Vector3(cx, 1.0, cz - 6), ate = new THREE.Vector3(cx, 1.0, cz + 6);
    const dir = ate.clone().sub(de), distancia = dir.length();
    ray.set(de, dir.normalize()); ray.far = distancia;
    if (ray.intersectObjects(malhas, false).length) flancosBloqueados++;
  }
  let spawnsProtegidos = 0;
  for (const s of Object.values(world.spawns).flat()) {
    const observador = new THREE.Vector3(s.x, 1.62, s.z - Math.sign(s.z) * 22);
    const alvo = new THREE.Vector3(s.x, 1.62, s.z);
    if (!game._losClear(observador, alvo)) spawnsProtegidos++;
  }
  const raioBot = 0.55;
  const collidersR2 = world.colliders.filter((c) => c.pracaR2);
  const intrusoes = collidersR2.reduce((total, c) => total + world.waypoints.nodes.filter((n) =>
    n.x > c.minX - raioBot && n.x < c.maxX + raioBot && n.z > c.minZ - raioBot && n.z < c.maxZ + raioBot).length, 0);
  const nos = world.waypoints.nodes.length;
  if (malhas.length !== 10 || collidersR2.length !== 10 || flancosBloqueados !== 10 || spawnsProtegidos !== 8 || intrusoes !== 0 || nos < 550)
    falhas.push(`PA3: malhas/colliders ${malhas.length}/${collidersR2.length} de 10; LOS flancos ${flancosBloqueados}/10; spawns ${spawnsProtegidos}/8; waypoints invadidos ${intrusoes}; nós ${nos}/550`);
  else verdes.push(`PA3 dez coberturas bloqueiam LOS, oito spawns protegidos, zero waypoint invadido e ${nos} nós`);
}

// PA4 — três famílias de rota continuam acessíveis dos dois spawns às três bandeiras.
{
  const nos = world.waypoints.nodes;
  const adj = world.waypoints.adj;
  if (mutante === 'rota') {
    for (let i = 0; i < nos.length; i++) if (nos[i].x > 8) adj[i] = [];
    mutou = true;
  }
  const alcança = (inicio, fim, faixa = () => true) => {
    const fila = [inicio];
    const vistos = new Uint8Array(nos.length);
    vistos[inicio] = 1;
    for (let cursor = 0; cursor < fila.length; cursor++) {
      const atual = fila[cursor];
      if (atual === fim) return true;
      for (const proximo of adj[atual]) {
        if (vistos[proximo] || !faixa(nos[proximo])) continue;
        vistos[proximo] = 1;
        fila.push(proximo);
      }
    }
    return false;
  };
  const faixas = [
    ['oeste', (n) => n.x < -8],
    ['centro', (n) => Math.abs(n.x) <= 14],
    ['leste', (n) => n.x > 8],
  ];
  let ligacoes = 0;
  for (const spawns of Object.values(world.spawns)) {
    const inicio = world.nearestWaypoint(spawns[0].x, spawns[0].z);
    for (const bandeira of game.ctfPts) {
      const fim = world.nearestWaypoint(bandeira.x, bandeira.z);
      if (alcança(inicio, fim)) ligacoes++;
    }
  }
  const rotasLongitudinais = faixas.map(([nome, faixa]) => {
    const candidatos = nos.map((n, i) => ({ ...n, i })).filter(faixa);
    const sul = candidatos.reduce((melhor, n) => !melhor || n.z < melhor.z ? n : melhor, null);
    const norte = candidatos.reduce((melhor, n) => !melhor || n.z > melhor.z ? n : melhor, null);
    return { nome, ok: !!(sul && norte && norte.z - sul.z >= 100 && alcança(sul.i, norte.i, faixa)) };
  });
  const laterais = rotasLongitudinais.every((rota) => rota.ok);
  if (ligacoes !== 6 || !laterais) falhas.push(`PA4: rotas acessíveis ${ligacoes}/6; eixos ${rotasLongitudinais.map((r) => `${r.nome}=${r.ok}`).join(', ')}`);
  else verdes.push('PA4 seis ligações spawn→CTF e três eixos longitudinais navegáveis');
}

if (mutante && !mutou) {
  console.error(`MUTANTE NÃO APLICOU: ${mutante}`);
  process.exit(2);
}
for (const verde of verdes) console.log(`  ✓ ${verde}`);
for (const falha of falhas) console.log(`  ✗ ${falha}`);
console.log(falhas.length ? `✗ PRACA-R2${mutante ? ` [${mutante}]` : ''}: ${falhas.length} falha(s)` : `✓ PRACA-R2${mutante ? ` [${mutante}]` : ''}: PA1–PA4 verdes`);
process.exit(falhas.length ? 1 : 0);
