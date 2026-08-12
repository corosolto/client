// Contrato pré-integração da Lenda da Lan House. Lê o GLB real e reprova a mutação
// causal (mochila-slab reinserida), além de exigir os props canônicos e o rig.
// Uso: node tmp/lenda-lanhouse-contract.mjs asset.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const path = process.argv[2];
if (!path) throw new Error('uso: node tmp/lenda-lanhouse-contract.mjs asset.glb');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(path);
const root = document.getRoot();
const names = root.listNodes().map((node) => node.getName());
const materials = root.listMaterials().map((material) => material.getName());
const requiredMaterials = [
  'CS_LAN_BEIGE_PLASTIC',
  'CS_LAN_MOUSE_TRACKBALL',
  'CS_LAN_ETHERNET_BLUE',
  'CS_LAN_TOKEN_RED',
  'CS_LAN_TOKEN_YELLOW',
  'CS_LAN_TOKEN_GREEN',
  'CS_LAN_TOKEN_BLUE',
  'CS_LAN_TOKEN_PURPLE',
  'CS_LAN_TOKEN_ORANGE',
];
const failures = [];
if (root.listSkins().length !== 1) failures.push(`skins=${root.listSkins().length}, esperado 1`);
if (root.listMeshes().length !== 1) failures.push(`meshes=${root.listMeshes().length}, esperado 1`);
for (const material of requiredMaterials) if (!materials.includes(material)) failures.push(`material ausente: ${material}`);
if (names.some((name) => /mutant|MUTANT_BACKPACK_SLAB/i.test(name))) failures.push('mochila-slab causal reinserida');
const bones = names.filter((name) => /Hips|Spine|Head|Shoulder|Arm|Hand|Leg|Foot/.test(name));
if (bones.length < 15) failures.push(`ossos reconhecíveis=${bones.length}, esperado >=15`);
console.log(JSON.stringify({ path, meshes: root.listMeshes().length, skins: root.listSkins().length, bones: bones.length, requiredMaterials: requiredMaterials.length, failures }, null, 2));
if (failures.length) process.exit(1);
