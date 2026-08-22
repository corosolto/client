#!/usr/bin/env node
/* Sonda do kill-switch da replay cam: o `?replaycam=0` é lido no CARREGAMENTO do game.js,
   então só um processo novo mede — daí este arquivo em vez de uma cláusula inline. */
const h = await import('./harness.mjs');
const textures = h.initTextures(h.renderer);
const g = h.bootGame('praca_poderes', { textures, seed: 4242, bots: 4 });
const vitima = g.bots.find((b) => b.alive && b.team === 'B');
if (!vitima) { console.log('sem-vitima'); process.exit(0); }
vitima.hp = 1;
g._replayCam = null;
g._kill(vitima, g.player, 'AWP', true);
console.log(g._replayCam ? 'armada' : 'desarmada');
