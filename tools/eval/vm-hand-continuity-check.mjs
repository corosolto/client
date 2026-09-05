#!/usr/bin/env node
// BUG-85: chama os aplicadores REAIS de cada rota, incluindo o bind assíncrono.
import fs from 'node:fs';
import * as THREE from 'three';
import { applyTeamHandMaterial, teamHandStyle } from '../../public/js/vmhands.js';
import { KnifeMeleeViewModel } from '../../public/js/meleevm.js';
import { AuthoredViewModels } from '../../public/js/authoredvm.js';
const source = fs.readFileSync(new URL('../../public/js/authoredvm.js', import.meta.url), 'utf8');
function actualFunction(name, end) {
  const body = source.slice(source.indexOf(`function ${name}(`), source.indexOf(end, source.indexOf(`function ${name}(`)));
  if (!body || !body.includes(`function ${name}`)) throw new Error(`função ausente ${name}`);
  return new Function('THREE', 'applyTeamHandMaterial', 'SKIN_MATERIAL', 'GLOVE_MATERIAL', 'PESO_TINT', 'materialsOf', 'MATERIAL_TEXTURE_BASE',
    `${body}; return ${name};`)(THREE, applyTeamHandMaterial, /CoroSolto_FP_Hand/i, /CoroSolto_FP_Gloves?/i,
    { pele: 1, luva: .55, manga: .5 }, o => Array.isArray(o.material) ? o.material : [o.material],
    { Hand: 'T_Arm01', Glove: 'T_Glove01', Cloth: 'T_Cloth01' });
}
const tint = actualFunction('tintHandMaterial', '\nfunction cameraSpacePackage');
const bind = actualFunction('bindSharedArmTextures', '\n// Clipes gerais');
const checks = [];
for (const faction of ['E','B','C','F','U']) {
  const profile = { id: 'player-a', faction, skin: 0xb78968, sleeve: 0xaa3333, accent: 0xdd2222 };
  const scene = new THREE.Group(); scene.add(new THREE.PerspectiveCamera(32,1.5,.01,100));
  const material = new THREE.MeshStandardMaterial(); material.name = 'CoroSolto_FP_Gloves';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); scene.add(mesh);
  const animations = ['Idle','Draw','Slash','Stab','QuickThrust','HeavyStab'].map(n=>new THREE.AnimationClip(n,1,[]));
  const vm = new KnifeMeleeViewModel({ parent: new THREE.Group(), profile }); vm._accept({scene,animations});
  const gunMaterial = material.clone(); gunMaterial.name = 'CoroSolto_FP_Glove';
  const pistol = tint(gunMaterial, profile), second = tint(gunMaterial, {...profile,id:'player-b',sleeve:0x0000ff,accent:0xff0000});
  const expected = teamHandStyle(faction);
  if (process.argv.includes('--mutante=luva-por-arma')) delete mesh.material.userData.teamHands;
  checks.push({name:`${faction}: faca e pistola usam identidade do time`,ok:mesh.material.userData.teamHands?.faction===faction && pistol.userData.teamHands?.faction===faction});
  checks.push({name:`${faction}: personagem não muda luva`,ok:JSON.stringify(pistol.userData.teamHands)===JSON.stringify(second.userData.teamHands) && pistol.color.equals(second.color)});
  checks.push({name:`${faction}: dedos seguem direção aprovada`,ok:mesh.material.userData.teamHands?.fingerless===expected.fingerless && pistol.userData.teamHands?.fingerless===expected.fingerless});
  const teamMap = new THREE.Texture(), donor = new THREE.Texture(), normal = new THREE.Texture(), orm = new THREE.Texture();
  pistol.map = teamMap;
  bind([{material:pistol}],new Map([['T_Glove01_B',donor],['T_Glove01_N',normal],['T_Glove01_ORM',orm]]));
  checks.push({name:`${faction}: carregamento tardio não troca skin e mantém PBR`,ok:pistol.map===teamMap && pistol.normalMap===normal && pistol.roughnessMap===orm});
  const authored = new AuthoredViewModels(new THREE.Group(), null, profile);
  const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(), pistol);
  authored.entries.set('pistol', { handMeshes: [gunMesh] });
  vm.setProfile({ faction: 'B' }); authored.setProfile({ faction: 'B' });
  checks.push({name:`${faction}: troca de time atualiza as duas armas já carregadas`,ok:mesh.material.userData.teamHands?.faction==='B' && gunMesh.material.userData.teamHands?.faction==='B'});
  const cached = mesh.material;
  vm.setProfile({ faction: 'B', id: 'outro-personagem' });
  checks.push({name:`${faction}: mesmo time não recria material`,ok:mesh.material===cached});
  vm.dispose();
}
const game = fs.readFileSync(new URL('../../public/js/game.js',import.meta.url),'utf8');
checks.push({name:'Game passa facção para as duas rotas',ok:(game.match(/faction: this\.playerFaction/g)||[]).length>=2});
const ok=checks.every(c=>c.ok);console.log(JSON.stringify({ok,checks},null,2));process.exitCode=ok?0:1;
