import * as THREE from 'three';

export const TEAM_HANDS = Object.freeze({
  E: Object.freeze({ id: 'E', glove: '#34363a', sleeve: '#781f2a', accent: '#e2d6b5', motif: 'star', fingerless: false }),
  B: Object.freeze({ id: 'B', glove: '#4e5740', sleeve: '#4e5740', accent: '#a5a57b', motif: 'camo', fingerless: false }),
  C: Object.freeze({ id: 'C', glove: '#dad8cd', sleeve: '#493544', accent: '#ba3544', motif: 'plain', fingerless: false }),
  F: Object.freeze({ id: 'F', glove: '#34363a', sleeve: '#292b30', accent: '#696b70', motif: 'plain', fingerless: true }),
  U: Object.freeze({ id: 'U', glove: '#34363a', sleeve: '#292b30', accent: '#d9d7cf', motif: 'checker', fingerless: true }),
});
const NEUTRAL_HANDS = Object.freeze({ id: 'neutral', glove: '#34363a', sleeve: '#363a40', accent: '#797d80', motif: 'plain', fingerless: false });
export const teamHandStyle = (faction) => TEAM_HANDS[faction] || NEUTRAL_HANDS;

export function refreshTeamHands(meshes, profile, layout) {
  for (const mesh of meshes) {
    const update = (material) => {
      if (!material?.userData.teamHands) return material;
      if (material.userData.teamHands.faction === teamHandStyle(profile.faction).id) return material;
      const next = applyTeamHandMaterial(material, profile, layout);
      material.dispose(); // o material pertence ao controlador; atlas compartilhados ficam no cache
      return next;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(update) : update(mesh.material);
  }
}

const maps = new Map();
export function applyTeamHandMaterial(material, profile, layout) {
  const style = teamHandStyle(profile.faction);
  const role = layout === 'knife' ? 'combined' : /Cloth|Sleeves/i.test(material.name) ? 'cloth'
    : /Glove/i.test(material.name) ? 'glove' : 'skin';
  const key = `${layout}/${role}-${style.id}`;
  const copy = material.clone();
  copy.color.set(0xffffff);
  copy.metalness = 0;
  copy.roughness = role === 'skin' ? 0.72 : 0.86;
  // Os atlas têm UVs distintos; só a identidade é comum. Não colar UV de um rig no outro.
  if (typeof document !== 'undefined' && !(typeof process !== 'undefined' && process.versions?.node)) {
    if (!maps.has(key)) {
      const map = new THREE.TextureLoader().load(`/models/viewmodels/coro/hands/${key}.webp?v=team-hands-1`, undefined, undefined,
        (error) => console.error(`[viewmodel-hands] ${key}`, error));
      map.flipY = false;
      map.colorSpace = THREE.SRGBColorSpace;
      maps.set(key, map);
    }
    copy.map = maps.get(key);
  }
  copy.userData.teamHands = { faction: style.id, layout, role, key, fingerless: style.fingerless };
  copy.needsUpdate = true;
  return copy;
}
