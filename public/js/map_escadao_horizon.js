import * as THREE from 'three';

// Plano distante, só visual: fecha o vazio acima das casas sem criar cobertura,
// colisão ou uma rota nova fora da arena.
export function buildEscadaoHorizon(root, { low = false } = {}) {
  const group = new THREE.Group();
  group.name = 'ESCADAO_HORIZONTE_MORRO';
  group.userData.nonSolidSurface = true;

  const segments = low ? 72 : 120;
  const rows = low ? 10 : 16;
  const positions = [], colors = [], indices = [];
  const earth = new THREE.Color(0x6b755a), green = new THREE.Color(0x405b4a);
  for (let row = 0; row <= rows; row++) {
    const radius = 58 + row / rows * 90;
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const ridge = 13 + 10 * Math.pow(.5 + .5 * Math.sin(angle * 2.2 + .7), 2)
        + 8 * Math.pow(.5 + .5 * Math.sin(angle * 5.1 - 1.3), 3);
      const fade = Math.sin(row / rows * Math.PI);
      const y = -7 + fade * (ridge + Math.sin(angle * 17 + row) * 1.1);
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const shade = .25 + .16 * Math.sin(angle * 3.7 + row * .4);
      const color = green.clone().lerp(earth, shade);
      colors.push(color.r, color.g, color.b);
      if (row < rows && i < segments) {
        const a = row * (segments + 1) + i, b = a + segments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const terrain = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  terrain.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  terrain.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.geometry.setIndex(indices); terrain.geometry.computeVertexNormals(); terrain.geometry.computeBoundingSphere();
  terrain.name = 'ESCADAO_MORRO_DISTANTE'; terrain.userData.nonSolidSurface = true;
  group.add(terrain);

  const houses = new THREE.Group(); houses.name = 'ESCADAO_CASARIO_DISTANTE';
  const palette = [0xa57862, 0x8f8773, 0x758574, 0xa89776];
  for (let i = 0; i < (low ? 36 : 64); i++) {
    const angle = (i * 2.3999632297) % (Math.PI * 2);
    const radius = 66 + (i % 6) * 5 + Math.floor(i / 12) * 2;
    const height = 3.5 + (i % 5) * 1.15;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.2 + (i % 3), height, 3 + ((i + 1) % 3)), new THREE.MeshStandardMaterial({ color: palette[i % palette.length], roughness: .96 }));
    mesh.position.set(Math.cos(angle) * radius, -2 + height / 2 + (i % 4) * .28, Math.sin(angle) * radius);
    mesh.name = 'ESCADAO_CASA_HORIZONTE'; mesh.userData.nonSolidSurface = true;
    houses.add(mesh);
  }
  group.add(houses); root.add(group);
  return group;
}
