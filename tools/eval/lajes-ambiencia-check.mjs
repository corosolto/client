import fs from 'node:fs';
import { THREE, initTextures } from './harness.mjs';
import { buildLajes } from '../../public/js/map_lajes_authored.js';
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const w = buildLajes(new THREE.Scene(), initTextures());
const M = {}; w.root.traverse(o => { for (const m of [].concat(o.material || [])) if(m.name)M[m.name]=m; });
if (mutant === 'casas-azuis') M.adobe?.color.set(0x729d99);
if (mutant === 'sem-grama') w.root.getObjectByName('LAJES_GRAMADOS')?.removeFromParent();
if (mutant === 'fauna-parada') w.ambience.update = () => {};
if (mutant === 'poucas-pipas') w.ambience.pipaSky.group.children.filter(o => o.userData.skyLife === 'pipa').slice(2).forEach(o => o.removeFromParent());
const before = w.ambience.snapshot();
for (let i = 0; i < 600; i++) w.ambience.update(1 / 60, new THREE.Vector3(0, 0, 0));
const after = w.ambience.snapshot();
const moved = type => after.filter(a => a.type === type && a.y < .2 && Math.hypot(a.x - before.find(b => b.id === a.id).x, a.z - before.find(b => b.id === a.id).z) > .1).length;
const grass = w.root.getObjectByName('LAJES_GRAMADOS');
let grassTris = 0; grass?.traverse(o => { if (o.isMesh) grassTris += (o.geometry.index?.count || o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); });
const warm = [M.cream, M.brick, M.adobe, M.ochre, M.rose, M.sage].every(m => m && m.color.r > m.color.b && m.color.r >= m.color.g);
const pipas = w.ambience.pipaSky.group.children.filter(o => o.userData.skyLife === 'pipa').length;
const rows = [
 ['LAM1', 'paleta de paredes sem azul', warm],
 ['LAM2', 'piso dominante de terra', M.ground.color.r > M.ground.color.g * 1.3 && M.ground.roughness >= .9],
 ['LAM3', 'gramados com superfície e folhas reais', grassTris > 0 && grass.children.some(o => o.isInstancedMesh)],
 ['LAM4', 'ratos e baratas se deslocam no chão', moved('rat') >= 3 && moved('cockroach') >= 3],
 ['LAM5', 'mais pipas que as duas da V6', pipas > 2],
];
const report = { mutant, rows, moved: { rat: moved('rat'), cockroach: moved('cockroach') }, grassTris, pipas, before, after };
for (const [id, label, pass] of rows) console.log(`${pass ? '✓' : '✗'} ${id} ${label}`);
let disposed=false; M.ground.addEventListener('dispose',()=>disposed=true);
if(mutant==='sem-descarte')w.ambience.dispose=()=>{};
w.ambience.dispose();
console.log(`${disposed?'✓':'✗'} LAM6 recursos próprios descartados`); rows.push(['LAM6','descarte',disposed]);
const json = process.argv.find(a => a.startsWith('--json='))?.slice(7); if (json) fs.writeFileSync(json, JSON.stringify(report, null, 2));
if (rows.some(r => !r[2])) process.exitCode = 1;
else if (mutant) throw Error(`MUTANTE SOBREVIVEU: ${mutant}`);
