// Autocontida para executar também no navegador via page.evaluate.
export function probeSelectedWeapon({ game = globalThis.__game, decoy = false } = {}) {
  const vm = game?.vm;
  const weapon = game?.player?.weapon;
  const result = { weapon, meshes: 0, sceneMeshes: 0 };
  if (!vm || !weapon) return result;
  const meshes = new Set();
  const collect = (node, excludeHands = false) => {
    if (!node || (excludeHands && ['handR', 'handL'].includes(node.name))) return;
    if (node.isMesh && node.geometry?.attributes.position?.count) meshes.add(node);
    for (const child of node.children || []) collect(child, excludeHands);
  };
  let selected;
  if (game._vmVisibility?.authored) {
    const controller = vm.authored;
    const entry = controller?.entry(weapon);
    if (controller?.weapon !== weapon || !entry || (entry.mint && entry.mint.weaponId !== weapon)) return result;
    selected = entry.mount;
    collect(entry.mint?.active);
    for (const mesh of entry.weaponMeshes || []) collect(mesh);
  } else if (game._vmVisibility?.fallback) {
    selected = vm.models[weapon];
    const glb = selected?.getObjectByName('rw');
    if (glb && glb.userData.weaponSource !== weapon) return result;
    collect(glb || selected, true);
  }
  const wasVisible = selected?.visible;
  let unrelated;
  try {
    // Mutação e medição na mesma tarefa JS: o próximo frame não pode desfazer a ocultação.
    if (decoy && selected) {
      vm.root.traverseVisible((node) => {
        if (!unrelated && node.isMesh && node.geometry?.attributes.position?.count) unrelated = node.clone();
      });
      if (unrelated) { unrelated.visible = true; vm.root.add(unrelated); }
      selected.visible = false;
    }
    for (const mesh of meshes) {
      for (let node = mesh; node; node = node.parent) {
        if (!node.visible) break;
        if (node === vm.root) { result.meshes++; break; }
      }
    }
    vm.root.traverseVisible((node) => {
      if (node.isMesh && node.geometry?.attributes.position?.count) result.sceneMeshes++;
    });
    return result;
  } finally {
    unrelated?.removeFromParent();
    if (selected) selected.visible = wasVisible;
  }
}
