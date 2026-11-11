// Bancada de captura da demo HD (só desenvolvimento; não entra em commit de produto).
// Uso no console: const lab = (await import('/js/hd_lab.js')).liga(); await lab.vista('beco');
export const VISTAS = {
  lajes: { beco: [-2, 0, 17, -0.0208, -0.104], laje: [-9, 3.1, -14, -2.0, -0.08], lajesol: [-7.2, 3.1, -3.5, 0.9, 0.1], parede: [-6.5, 3.1, -12.8, -2.0, -0.25] },
  velho_oeste: { perto: [-8.4, 0, 8.6, 2.80, 0.36], praca: [0, 0, 10, 0, 0.04], casa: [-7, 0, 7.2, 2.618, 0.30], base: [-7.5, 0, 6.6, 2.62, -0.10], fundos: [1.5, 0, 13.5, 3.05, 0.12] },
};
export function liga() {
  const g = window.__game, E = window.__escada, r = g.renderer;
  const trava = () => { if (E) { E.escada.degrau = 0; E.escada.teto = 0; E.escada._sofrendo = 0; if (r.getPixelRatio() < 1) E.aplicaDegrau(0); }
    g.bots.forEach((b, i) => { const f = i === 0 && window.__labBot; if (f) { b.pos.set(f[0], f[1], f[2]); b.vel?.set(0, 0, 0); b.yaw = f[3] || 0; } else b.pos.set(400, 0, 400); b.hp = 1e9; b.smokes = 0; b.flashes = 0; }); g.player.hp = 1e9; };
  E?.aplicaDegrau(0); trava(); clearInterval(window.__labT); window.__labT = setInterval(trava, 400);
  const lab = {
    async vista(nome) {
      const v = (VISTAS[g._mapId] || {})[nome] || nome; const p = g.player;
      const poe = () => { p.pos.set(v[0], v[1], v[2]); p.yaw = v[3]; p.pitch = v[4]; p.vel.set(0, 0, 0); p.grounded = true; };
      poe(); await new Promise((ok) => setTimeout(ok, 600)); poe(); await new Promise((ok) => setTimeout(ok, 350)); poe();
      return [p.pos.x, p.pos.y, p.pos.z].map((n) => +n.toFixed(2));
    },
    async conta() {
      r.info.autoReset = false; r.info.reset();
      await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const o = { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries,
        heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
      r.info.autoReset = true; return o;
    },
    materiais() {
      const mats = new Map();
      g.scene.traverse((o) => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!m) continue;
        const k = m.uuid; if (!mats.has(k)) mats.set(k, { map: m.map?.name || (m.map?.image?.src || '').split('/').pop() || '', px: m.map?.image ? `${m.map.image.width}x${m.map.image.height}` : '',
          rep: m.map ? [+m.map.repeat.x.toFixed(2), +m.map.repeat.y.toFixed(2)] : null, an: m.map?.anisotropy, nrm: !!m.normalMap, rough: !!m.roughnessMap, bump: !!m.bumpMap, n: 0, dono: (o.name || o.parent?.name || '').slice(0, 26) });
        mats.get(k).n++; } });
      return [...mats.values()].sort((a, b) => b.n - a.n);
    },
  };
  window.__lab = lab; return lab;
}

// Espera a partida, liga a bancada, esconde o aviso de depuração e devolve erros de shader do console.
export async function pronto(esperaMs = 4500) {
  for (let i = 0; i < 60 && !(window.__game && window.__game.state === 'live'); i++) await new Promise((ok) => setTimeout(ok, 500));
  const lab = liga();
  document.querySelectorAll('div').forEach((e) => { if (/WebSocket closed/.test(e.textContent || '') && e.children.length < 6 && e.textContent.length < 400) e.style.display = 'none'; });
  await new Promise((ok) => setTimeout(ok, esperaMs));
  lab.kit = () => window.__kitHD; lab.erros = () => { const gl = window.__game.renderer.getContext(); return window.__game.renderer.info.programs.filter((p) => p.diagnostics && !p.diagnostics.runnable).map((p) => (p.diagnostics.fragmentShader.log || p.diagnostics.vertexShader.log || p.diagnostics.programLog || '').slice(0, 300)); };
  return lab;
}
