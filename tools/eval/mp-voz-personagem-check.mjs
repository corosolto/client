#!/usr/bin/env node
/* Vozes de personagem no multiplayer (relato do dono, 09/11: "vozes de Saci e outros
   personagens que não estavam no servidor" + "os áudios do single não tocavam no MP").

   VOZ1-4  Sfx.characterVoice nunca empresta bordão de OUTRO personagem: take do evento →
           outro take ingame do mesmo personagem → pool da facção só para quem não tem voz
           ingame própria (string legada de seleção continua no pool).
   VOZ5-6  tools/audio/miticos-character-voice-apply.mjs estrutura os 9 Míticos a partir do
           pool M sem byte novo, recusa hash fora do pool e é idempotente.
   VOZ7-8  Game._botCall no nó dedicado marca `_voiceSnap='radio'` (cooldown 5 s) em vez de
           morrer no DOM; o codec v8 leva 'radio' íntegro.

   Mutantes: --mutante=pool-da-faccao (audio.js volta a sortear do pool da facção)
             --mutante=rede-muda (o _botCall antigo: sem DOM, sem voz no snapshot) */
import { readFileSync } from 'node:fs';
import { importAudioProbe } from './audio-probe-module.mjs';
import { aplicarVozesMiticas } from '../audio/miticos-character-voice-apply.mjs';
import { encodeSnapshot, decodeSnapshot } from '../../public/js/netcodec.js';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
if (mutante && !['pool-da-faccao', 'rede-muda'].includes(mutante)) { console.error(`mutante desconhecido: ${mutante}`); process.exit(2); }
const aplicaMutacao = (src, ancora, troca) => {
  if (src.split(ancora).length !== 2) { console.error(`mutante ${mutante} NÃO APLICOU: âncora ${ancora}`); process.exit(2); }
  return src.replace(ancora, troca);
};

let audio = readFileSync('public/js/audio.js', 'utf8');
if (mutante === 'pool-da-faccao') {
  audio = aplicaMutacao(audio, 'const own = rollback ? null : this._ownIngameVoice(characterId, event);',
    'const own = rollback ? null : this.pack?.characterVoice?.[characterId]?.[event];');
}
globalThis.location = { search: '', href: 'http://regua/' };
globalThis.performance ||= { now: () => Date.now() };
globalThis.Audio = class { constructor() { this.volume = 1; } addEventListener() {} play() { return Promise.resolve(); } pause() {} };
const { Sfx } = await importAudioProbe(audio, mutante || 'normal');

const falhas = [];
const check = (id, ok, detalhe) => { if (!ok) falhas.push(`${id}: ${detalhe}`); console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${detalhe}`); };

/* ---- VOZ1-4: identidade da voz ---- */
const L = ['audio/a/lampiao-1.mp3', 'audio/a/lampiao-2.mp3'], S = ['audio/a/saci-1.mp3'], W = ['audio/a/lobo-1.mp3'];
const sfx = new Sfx();
const tocou = []; sfx._sample = (f) => { tocou.push(f); return { pause() {} }; };
sfx.pack = {
  voice: { M: [...S, ...L, ...W], E: ['audio/a/meme-e.mp3'] },
  characterVoice: { lampiao: { select: ['audio/a/lampiao-select.mp3'], kill: L }, saci: { kill: S }, cuca: 'audio/a/cuca-select.mp3' },
};
const sorteia = (id, evento, fac, n = 40) => { tocou.length = 0; for (let i = 0; i < n; i++) { sfx._lastKillVoice = 0; sfx.characterVoice(id, evento, { fallbackFaction: fac }); } return new Set(tocou); };
const killLampiao = sorteia('lampiao', 'kill', 'M');
check('VOZ1', killLampiao.size > 0 && [...killLampiao].every((f) => L.includes(f)), `kill do Lampião só com takes dele (${[...killLampiao].join(',') || 'silêncio'})`);
const radioLampiao = sorteia('lampiao', 'radio', 'M');
check('VOZ2', radioLampiao.size > 0 && [...radioLampiao].every((f) => L.includes(f)), `rádio do Lampião (sem take de rádio) usa os bordões DELE, não o pool M (${[...radioLampiao].join(',') || 'silêncio'})`);
const selectLampiao = sorteia('lampiao', 'select', 'M', 5);
check('VOZ3', selectLampiao.size === 1 && selectLampiao.has('audio/a/lampiao-select.mp3'), 'seleção usa a fala longa própria, nunca bordão de kill');
const killCuca = sorteia('cuca', 'kill', 'M'), killNinguem = sorteia('ninguem', 'kill', 'E');
check('VOZ4', killCuca.size > 0 && [...killCuca].every((f) => sfx.pack.voice.M.includes(f)) && killNinguem.has('audio/a/meme-e.mp3'),
  'forma string (só seleção) e personagem sem voz própria seguem no pool da facção (status quo)');

/* ---- VOZ5-6: patch do manifest vivo ---- */
const mapa = JSON.parse(readFileSync('tools/audio/miticos-voice-map.json', 'utf8'));
const poolM = Object.values(mapa.personagens).flatMap((p) => p.kill.map((t) => t.file));
const vivo = { voice: { M: [...poolM, 'audio/a/extra.mp3'] }, characterVoice: { lampiao: 'audio/a/lampiao-select.mp3', saci: 'audio/a/saci-select.mp3' }, characterVoiceText: {} };
const alvo = aplicarVozesMiticas(vivo);
const ids = Object.keys(mapa.personagens);
check('VOZ5', ids.length === 9 && ids.every((id) => Array.isArray(alvo.characterVoice[id]?.kill) && alvo.characterVoice[id].kill.length >= 6)
  && alvo.characterVoice.lampiao.select[0] === 'audio/a/lampiao-select.mp3' && alvo.characterVoice.lampiao.kill.length === 6
  && !alvo.characterVoice.lobisomem.select && alvo.characterVoice.lobisomem.kill.length === 8
  && JSON.stringify(alvo.voice.M) === JSON.stringify(vivo.voice.M)
  && new Set(ids.flatMap((id) => alvo.characterVoice[id].kill)).size === 56
  && alvo.characterVoiceText[mapa.personagens.lampiao.kill[0].file] === mapa.personagens.lampiao.kill[0].text
  && JSON.stringify(aplicarVozesMiticas(alvo)) === JSON.stringify(alvo),
  '9 Míticos estruturados (select preservada, 56 hashes únicos do pool, pool M intacto, legendas, idempotente)');
let recusou = false;
try { aplicarVozesMiticas({ voice: { M: poolM.slice(1) }, characterVoice: {} }); } catch { recusou = true; }
check('VOZ6', recusou, 'hash do mapa ausente do pool M recusa o manifest (pack diferente)');

/* ---- VOZ7-8: rádio dos bots no nó dedicado ---- */
const { Game } = await import('./harness.mjs');
let botCall = Game.prototype._botCall;
if (mutante === 'rede-muda') {
  botCall = function (b) {
    if (!this.el || !this.el.radioLog || this.state !== 'live') return;
    if (this.time < (this._radioCd || 0)) return;
    this._radioCd = this.time + 5;
  };
}
const no = { state: 'live', time: 10, _radioCd: 0, dedicated: true, el: null, player: null };
const bot = { team: 'B', pos: null, name: 'bot' };
botCall.call(no, bot, {});
const segundo = { team: 'E', pos: null };
botCall.call(no, segundo, {});
check('VOZ7', bot._voiceSnap === 'radio' && no._radioCd === 15 && !segundo._voiceSnap, `nó dedicado marca _voiceSnap='radio' com cooldown de 5 s (voz=${bot._voiceSnap}, cd=${no._radioCd})`);
const cliente = { state: 'live', time: 10, _radioCd: 0, dedicated: false, el: null, player: null };
const botLocal = { team: 'B' };
botCall.call(cliente, botLocal, {});
const roundTrip = decodeSnapshot(encodeSnapshot({
  type: 'snapshot', room: 'r', tick: 1, t: 1, state: 'live', owner: '', players: 1, spectators: 0, livre: { E: 0, B: 0 },
  timeLeft: 60, roundNum: 1, scoreE: 0, scoreB: 0, roundKillsE: 0, roundKillsB: 0, ctf: null, objective: null,
  ents: [{ id: 7, name: 'bot', team: 'B', bot: 1, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hp: 100, alive: true, weapon: 'ak', fireN: 0, voice: 'radio', voiceN: 3, k: 0, d: 0, respawnIn: 0 }],
}, 8)).ents[0];
check('VOZ8', !botLocal._voiceSnap && roundTrip.voice === 'radio' && roundTrip.voiceN === 3, 'cliente sem DOM não marca snapshot; codec v8 leva radio/voiceN íntegros');

/* ---- VOZ9: o cliente aplica a régua do single ao rádio remoto (55 m, aliado sempre, log) ---- */
{
  const { makeNetcode } = await import('../../public/js/netgame.js');
  const { THREE } = await import('./harness.mjs');
  const vozes = [];
  const radioLog = { children: [], appendChild(el) { this.children.push(el); }, get firstChild() { return this.children[0]; } };
  const game = { player: { pos: new THREE.Vector3(0, 0, 0), team: 'E' }, el: { radioLog }, _voiceKey: () => 'M',
    sfx: { characterVoice: (id, kind) => { vozes.push(`${id}:${kind}`); return true; } } };
  const net = { espectador: false, yourEnt: 1, meta: {}, startPing() {} };
  const nc = makeNetcode(game, net);
  clearInterval(nc._nsTimer);
  const perto = { name: 'Lampião', team: 'E', def: { id: 'lampiao' }, pos: new THREE.Vector3(10, 0, 0) };
  const longe = { name: 'Saci', team: 'E', def: { id: 'saci' }, pos: new THREE.Vector3(80, 0, 0) };
  nc.voice(perto, 'radio'); nc.voice(longe, 'radio'); nc.voice(longe, 'kill');
  check('VOZ9', JSON.stringify(vozes) === JSON.stringify(['lampiao:radio', 'saci:kill']) && radioLog.children.length === 1
    && /Lampião \(RÁDIO\)/.test(radioLog.children[0].textContent || ''),
    `aliado a 10 m fala e entra no log; a 80 m o rádio cala (kill não tem distância) — ${JSON.stringify(vozes)}`);
}

if (falhas.length) { console.error(`MP-VOZ-PERSONAGEM VERMELHA (${falhas.length})\n  ${falhas.join('\n  ')}`); process.exit(1); }
console.log('MP-VOZ-PERSONAGEM verde — voz é do personagem; rádio dos bots chega ao multiplayer.');
