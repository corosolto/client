import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
globalThis.location ||= { search: '' };
const { makeNetcode } = await import(process.env.NETGAME_UNDER_TEST || '../public/js/netgame.js');

function fixture(protocolVersion, emote = 'capoeira') {
  const sent = [];
  const player = {
    pos: new THREE.Vector3(1, 2, 3), vel: new THREE.Vector3(),
    weapon: 'ak', scoped: false, yaw: 0.4, pitch: -0.1,
  };
  const game = {
    player, _emoteAtual: emote, camView: 'first', mouseDown0: false,
    online: true, paused: false, time: 0,
  };
  const net = {
    meta: { protocolVersion, snapshotHz: 20 }, yourEnt: 1, espectador: false,
    startPing() {}, stopPing() {},
    sendInput(input) { sent.push(input); return sent.length; },
  };
  const mp = makeNetcode(game, net);
  return { game, net, mp, player, sent };
}

function input() {
  return { ax: 0, az: 0, crouch: false, shift: false, jump: false };
}

test('v10 sends a capture emote in live input and paused heartbeat', () => {
  const f = fixture(10);
  try {
    f.mp.stepPlayer(f.player, input());
    assert.equal(f.sent.at(-1).emote, 'capoeira');
    f.game.paused = true;
    f.mp._inputAt = 1;
    f.mp._now = () => 3000;
    f.mp._pulsoDePausa();
    assert.equal(f.sent.at(-1).emote, 'capoeira');
  } finally {
    f.mp.dispose();
  }
});

test('v9 fallback does not send capture IDs that its codec rejects', () => {
  const f = fixture(9);
  try {
    f.mp.stepPlayer(f.player, input());
    assert.equal(f.sent.at(-1).emote, null);
  } finally {
    f.mp.dispose();
  }
});
