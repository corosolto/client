import * as THREE from 'three';

let _csTex = null, _csGeo = null;
function contactShadowTexture() {
  if (_csTex) return _csTex;
  const S = 96;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  // Núcleo quase opaco + cauda longa: sombra de contato real tem miolo escuro sob o
  // pé e abre rápido. Um gradiente linear puro lê como borrão de Photoshop.
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.00, 'rgba(0,0,0,1)');
  g.addColorStop(0.30, 'rgba(0,0,0,0.86)');
  g.addColorStop(0.60, 'rgba(0,0,0,0.34)');
  g.addColorStop(1.00, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  _csTex = new THREE.CanvasTexture(c);
  _csTex.colorSpace = THREE.SRGBColorSpace;
  return _csTex;
}
export function makeContactShadow(size = 0.9, opacity = .45) {
  if (!_csGeo) _csGeo = new THREE.PlaneGeometry(1, 1);
  const m = new THREE.Mesh(_csGeo, new THREE.MeshBasicMaterial({
    map: contactShadowTexture(), color: 0x000000,
    transparent: true, opacity, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  }));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(size, size, 1);
  m.position.y = 0.02;                 // 2 cm: some acima do z-fight sem descolar do piso
  m.renderOrder = -1;                  // antes dos outros transparentes (fumaça, tracer)
  m.castShadow = false; m.receiveShadow = false;
  m.frustumCulled = false;
  m.userData.noHit = true;
  m.raycast = () => {};                // NUNCA absorve tiro: game.js raycasta o grupo inteiro
  m.userData.csBase = size;
  return m;
}
