/* Snapshot binário v4: round-trip do codec real, estado autoritativo do slot, CTF,
   compatibilidade v3/v2,
   limites hostis e integração do NetClient.
   O formato roda como ES module puro em public/, sem bundler nem dependência de runtime. */
import fs from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
let falhas = 0, ok = 0;
const cobra = (cond, msg) => {
  if (cond) { ok++; console.log(`  ok   ${msg}`); }
  else { falhas++; console.log(`  FALHA ${msg}`); }
};

let netSrc = fs.readFileSync('public/js/net.js', 'utf8');
if (MUT === 'sem-negociacao') {
  const before = netSrc;
  netSrc = netSrc.replace('new WebSocket(this.url, SNAPSHOT_PROTOCOLS)', 'new WebSocket(this.url)');
  cobra(netSrc !== before, 'mutação sem-negociacao aplicou');
} else if (MUT === 'sem-decoder') {
  const before = netSrc;
  netSrc = netSrc.replace('decodeSnapshot(ev.data)', 'JSON.parse(ev.data)');
  cobra(netSrc !== before, 'mutação sem-decoder aplicou');
} else if (MUT && !['sem-negociacao', 'sem-decoder'].includes(MUT)) {
  console.log(`mutante desconhecido: ${MUT}`); process.exit(1);
}

cobra(/new WebSocket\(this\.url, SNAPSHOT_PROTOCOLS\)/.test(netSrc), 'cliente negocia v4/v3/v2 binário com fallback v1 JSON');
cobra(/binaryType\s*=\s*['"]arraybuffer['"]/.test(netSrc), 'frames binários chegam como ArrayBuffer, não Blob');
cobra(/decodeSnapshot\(ev\.data\)/.test(netSrc), 'o caminho de produção chama o decoder real');
cobra(/MAX_SNAPSHOT_BYTES/.test(netSrc), 'cliente limita frame antes de alocar/decodificar');

let codec = null;
try { codec = await import('../../public/js/netcodec.js'); }
catch (e) { cobra(false, `netcodec.js existe e importa sem build: ${e.code || e.message}`); }

if (codec) {
  const ents = Array.from({ length: 10 }, (_, i) => ({
    id: 100 + i, name: `JOGADOR_${i}`, team: i < 5 ? 'E' : 'B', bot: i === 0 ? 0 : 1,
    x: i * 3.125 - 12, y: 0.2, z: 40 - i * 4.25, yaw: i * 0.2, pitch: -0.1,
    hp: i === 9 ? 0 : 100 - i, alive: i !== 9, weapon: i % 2 ? 'ak' : 'awp',
    fire: i === 3 ? 1 : 0, voice: i === 4 ? 'radio' : 0, k: i, d: 9 - i,
    respawnIn: i === 9 ? 2.25 : 0, killedBy: i === 9 ? 'JOGADOR_1' : undefined,
    ackSeq: i === 0 ? 812 : 0, mag: i === 0 ? 17 : null, res: i === 0 ? 61 : null,
    reloadIn: i === 0 ? 1.25 : 0, primary: i === 0 ? 'ak' : null,
    secondary: i === 0 ? 'pistol' : null,
  }));
  const sample = {
    type: 'snapshot', room: 'livre', tick: 123456, t: 87.125, state: 'live', owner: null,
    players: 1, spectators: 2, livre: { E: 4, B: 5 }, timeLeft: 72,
    roundNum: 2, scoreE: 1, scoreB: 0,
    ctf: {
      capsE: 4, capsB: 2, roundCapsE: 2, roundCapsB: 1, capsToWin: 3, matchLeft: 318.5,
      points: [
        { owner: 'E', prog: 1, capTeam: null, contested: false },
        { owner: 'B', prog: 1, capTeam: null, contested: false },
        { owner: null, prog: 0.625, capTeam: 'E', contested: true },
      ],
    },
    ents,
  };
  const bin = codec.encodeSnapshot(sample);
  const out = codec.decodeSnapshot(bin);
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  cobra(out.type === 'snapshot' && out.room === sample.room && out.tick === sample.tick,
    'envelope sobrevive ao round-trip');
  cobra(out.ents.length === 10 && out.ents.every((e, i) => e.id === ents[i].id && e.name === ents[i].name),
    'identidade das 10 entidades sobrevive');
  cobra(out.ents.every((e, i) => near(e.x, ents[i].x) && near(e.z, ents[i].z) && near(e.yaw, ents[i].yaw)),
    'posição e orientação preservam precisão submilimétrica da régua');
  cobra(out.ents[9].alive === false && out.ents[9].killedBy === 'JOGADOR_1' && near(out.ents[9].respawnIn, 2.25),
    'morte, respawn e autoria sobrevivem');
  cobra(out.ents[0].ackSeq === 812 && out.ents[0].mag === 17 && out.ents[0].res === 61
      && near(out.ents[0].reloadIn, 1.25) && out.ents[0].primary === 'ak'
      && out.ents[0].secondary === 'pistol',
    'v4 devolve ack e loadout autoritativos do slot sem um segundo canal');
  cobra(out.ctf && out.ctf.capsE === 4 && out.ctf.roundCapsB === 1 && near(out.ctf.matchLeft, 318.5),
    'placares e relógio de CTF sobrevivem ao round-trip v3');
  cobra(out.ctf && out.ctf.points.length === 3 && out.ctf.points[2].capTeam === 'E'
      && out.ctf.points[2].contested === true && near(out.ctf.points[2].prog, 0.625),
    'dono/progresso/contestação das bandeiras sobrevivem ao round-trip v3');
  const outV3 = codec.decodeSnapshot(codec.encodeSnapshot(sample, 3));
  cobra(!('ackSeq' in outV3.ents[0]), 'snapshot v3 continua decodificável e omite somente a extensão de slot v4');
  const outV2 = codec.decodeSnapshot(codec.encodeSnapshot(sample, 2));
  cobra(!('ctf' in outV2), 'snapshot v2 continua decodificável e omite somente a extensão CTF');
  const jsonBytes = Buffer.byteLength(JSON.stringify(sample));
  cobra(bin.byteLength < jsonBytes * 0.45,
    `payload binário fica abaixo de 45% do JSON (${bin.byteLength}/${jsonBytes} bytes)`);
  cobra(codec.SNAPSHOT_PROTOCOLS[0] === 'coro-snapshot-v4'
      && codec.SNAPSHOT_PROTOCOLS[1] === 'coro-snapshot-v3'
      && codec.SNAPSHOT_PROTOCOLS[2] === 'coro-snapshot-v2'
      && codec.SNAPSHOT_PROTOCOLS.includes('coro-json-v1'),
    'ordem de negociação prefere v4 e preserva fallbacks v3/v2/JSON');

  for (const ruim of [bin.slice(0, 12), new Uint8Array([0, 1, 2, 3]), new Uint8Array(codec.MAX_SNAPSHOT_BYTES + 1)]) {
    let recusou = false; try { codec.decodeSnapshot(ruim); } catch { recusou = true; }
    cobra(recusou, `decoder recusa frame hostil de ${ruim.byteLength} bytes`);
  }
}

if (MUT) {
  const acendeu = falhas > 0;
  console.log(acendeu ? `\nmutante "${MUT}" DETECTADO — a régua morde` : `\nmutante "${MUT}" NÃO detectado`);
  process.exit(acendeu ? 0 : 1);
}
console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
