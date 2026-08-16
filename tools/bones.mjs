import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const names = doc.getRoot().listNodes().map(n => n.getName());
console.log('nodes (' + names.length + '):', names.join(', '));
