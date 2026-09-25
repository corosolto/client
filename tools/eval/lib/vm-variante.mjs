/* Variante de config AO VIVO, sem tocar arquivo (experimento antes do conserto):
   { frame: { x, y, z, rotDeg, fov }, ads: { off, rotDeg, auto } } aplicada à entry
   e ao VM_WEAPON do módulo que o jogo já carregou (mesma instância pelo import map). */
export async function aplicarVariante(page, arma, variante) {
  if (!variante || !Object.keys(variante).length) return null;
  return page.evaluate(async ({ arma, variante }) => {
    const { VM_WEAPON } = await import('./js/data/vmconfig.js');
    const e = window.__authoredVm.entry(arma);
    if (variante.frame) Object.assign(e.frame, variante.frame);
    if (variante.ads) VM_WEAPON[arma].ads = { ...VM_WEAPON[arma].ads, ...variante.ads };
    if (variante.frame?.fov) {
      e.cameraFov = variante.frame.fov;
      const g = window.__game; g.vmCamera.fov = window.__authoredVm.fov(arma, g.vmCamera.aspect); g.vmCamera.updateProjectionMatrix();
    }
    window.__authoredVm.__cap.step(0.05);
    return { frame: e.frame, ads: VM_WEAPON[arma].ads };
  }, { arma, variante });
}
