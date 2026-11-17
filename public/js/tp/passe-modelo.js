/* Prévia 3D das recompensas do passe (tp/passe.js), carregada por import() só no clique: a tela do
   passe não paga three.js nem GLB. Mesmo pipeline do jogo: personagem por glbchars.js (o que o palco
   do lobby e a tela de carregamento usam), skin de arma pelo WeaponSkinStage da loja. Quem abre
   chama dispose() ao fechar: renderer, contexto WebGL e recursos próprios do boneco. */
import * as THREE from 'three';
import { CHARACTERS } from '../characters.js';
import { preloadCharacterAssets, buildCharacterModel, hasModel } from '../glbchars.js';
import { criaRenderer } from '../glcontext.js';

export class PersonagemStage {
  constructor(host) {
    this.host = host;
    this.disposed = false;
    this.owned = new Set();   // geometria, material e esqueleto deste boneco (buildCharacterModel ownedResources)
    this.built = null;
    this.yaw = 0.42;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = document.createElement('canvas');
    canvas.className = 'tp-passe-modelo__canvas';
    this.renderer = criaRenderer({ canvas, alpha: true, antialias: true }, { optional: true });
    if (!this.renderer) throw new Error('webgl_unavailable');
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    this.camera.position.set(0, 1.02, 4.1);
    this.camera.lookAt(0, 0.88, 0);
    /* mesma luz da tela de carregamento (loading3d.js): key quente, rim lima da Treta Pop */
    this.scene.add(new THREE.HemisphereLight(0xfff4df, 0x172318, 2.2));
    const key = new THREE.DirectionalLight(0xffe0b0, 3.1); key.position.set(-2.8, 4.5, 4.2); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xb4ff48, 2.4); rim.position.set(3.2, 2.8, -2.5); this.scene.add(rim);
    host.append(canvas);
    this.canvas = canvas;
    let arrasto = null;
    canvas.addEventListener('pointerdown', (e) => { arrasto = { x: e.clientX, yaw: this.yaw }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (arrasto) this.yaw = arrasto.yaw + (e.clientX - arrasto.x) * 0.012; });
    const soltar = () => { arrasto = null; };
    canvas.addEventListener('pointerup', soltar);
    canvas.addEventListener('pointercancel', soltar);
    this.arrastando = () => Boolean(arrasto);
    this.resize = () => {
      if (this.disposed) return;
      const { width, height } = host.getBoundingClientRect();
      this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      this.camera.aspect = Math.max(1, width) / Math.max(1, height);
      this.camera.updateProjectionMatrix();
    };
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => {
      if (this.disposed || document.hidden) return;
      const dt = Math.min(this.clock.getDelta(), 0.05);
      if (this.built) {
        if (!this.reduced && !this.arrastando()) this.yaw += dt * 0.5;
        this.built.group.rotation.y = this.yaw;
        if (!this.reduced) this.built.ctrl?.update(dt, 0, false, 0);
      }
      this.renderer.render(this.scene, this.camera);
    });
  }

  async load(id) {
    const def = CHARACTERS.find((c) => c.id === id);
    if (!def) throw new Error(`personagem_fora_do_roster:${id}`);
    await preloadCharacterAssets([id], { weapons: [] });
    if (this.disposed) return;
    const built = hasModel(id) ? buildCharacterModel(def, { weapon: false, ownedResources: this.owned }) : null;
    if (!built) throw new Error(`modelo_ausente:${id}`);
    built.ctrl?.update(0, 0, false, 0);
    this.built = built;
    this.scene.add(built.group);
    this.resize();
    this.host.dataset.pronto = '1';
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.observer.disconnect();
    this.renderer.setAnimationLoop(null);
    if (this.built) {
      this.built.mixer?.stopAllAction();
      this.built.mixer?.uncacheRoot(this.built.group);
      this.built.group.removeFromParent();
    }
    for (const r of this.owned) r?.dispose?.();
    this.owned.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}

/* Palco certo para a recompensa: personagem do roster ou skin de arma do catálogo do passe. */
export async function montarPalco(host, alvo) {
  if (alvo.kind === 'character') {
    const palco = new PersonagemStage(host);
    try { await palco.load(alvo.id); } catch (e) { palco.dispose(); throw e; }
    return palco;
  }
  const { WeaponSkinStage } = await import('../weapon-skin-stage.js');
  const palco = new WeaponSkinStage(host, { autoRotate: true });
  try { await palco.load(alvo.weapon, alvo.id); } catch (e) { palco.dispose(); throw e; }
  host.dataset.pronto = '1';
  return palco;
}
