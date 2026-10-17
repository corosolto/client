#!/usr/bin/env node
import assert from 'node:assert/strict';
import * as THREE from '../../public/vendor/three.module.js';
import { meshTriangles, intersectionPairs, containedVertices } from './lib/vm-contact.mjs';
const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)); cube.updateMatrixWorld(true);
const solid = meshTriangles(cube);
const triangle = (x) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([x,0,0,x,0.1,0,x,0,0.1],3));
  const mesh = new THREE.Mesh(geometry); mesh.updateMatrixWorld(true);
  return meshTriangles(mesh);
};
assert.equal(intersectionPairs(triangle(0), solid).length, 0);
assert.equal(containedVertices(triangle(0), solid), 3, 'contenção sem cruzamento precisa reprovar');
assert.equal(containedVertices(triangle(1), solid), 0, 'contato superficial não é interior');
assert.equal(containedVertices(triangle(2), solid), 0, 'região externa');
console.log('PASSA contenção, contato e exterior; mutante sem teste de interior reprovado');
