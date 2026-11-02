/* Snapshot binário v7: round-trip do codec real, progresso de mantle remoto, estado
   autoritativo de objetivo, totais de abates por rodada, reboque privado, CTF,
   compatibilidade v6..v2, limites hostis e integração do NetClient.

   O QUE MUDOU NA v5: o bloco privado de ack, munição, recarga e slots saiu de cada
   entidade e virou reboque de 30 bytes para o dono. Posição de vizinho virou u16,
   com passo de 15,6 mm. A v6 somou placar da rodada; a v7 soma um byte opcional
   de progresso de mantle por entidade. */
import fs from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
let falhas = 0, ok = 0;
const resultado = {};
const cobra = (cond, msg) => {
  resultado[msg] = !!cond;
  if (cond) { ok++; console.log(`  ok   ${msg}`); }
  else { falhas++; console.log(`  FALHA ${msg}`); }
};

const ALVO_DO_MUTANTE = {
  'sem-negociacao': 'cliente negocia v7/v6/v5/v4/v3/v2 binário com fallback v1 JSON',
  'sem-decoder': 'o caminho de produção chama o decoder real',
};
/* Aplicação de mutante é estado SEPARADO da detecção: âncora ausente ou duplicada é erro
   de arnês (exit 2), nunca mordida — a falha de replace não pode virar "DETECTADO". */
const aplicaMutacao = (nome, src, ancora, troca) => {
  const n = src.split(ancora).length - 1;
  if (n !== 1) {
    console.error(`mutante ${nome} NÃO APLICOU: âncora presente ${n} vez(es) — exige exatamente 1 (${ancora})`);
    process.exit(2);
  }
  return src.replace(ancora, troca);
};

/* A abertura do socket saiu do net.js e virou `TransporteWS` (public/js/transporte.js) —
   o seam por onde o WebTransport entra sem reescrever o NetClient. As cláusulas de
   negociação e de limite passam a ler o arquivo NOVO; as de decodificação continuam no
   net.js, que é quem decide o que fazer com os bytes. */
let netSrc = fs.readFileSync('public/js/net.js', 'utf8');
let tpSrc = fs.readFileSync('public/js/transporte.js', 'utf8');
if (MUT === 'sem-negociacao') tpSrc = aplicaMutacao(MUT, tpSrc, 'new WebSocket(this.url, SNAPSHOT_PROTOCOLS)', 'new WebSocket(this.url)');
else if (MUT === 'sem-decoder') netSrc = aplicaMutacao(MUT, netSrc, 'decodeSnapshot(dados)', 'JSON.parse(dados)');
else if (MUT && !ALVO_DO_MUTANTE[MUT]) { console.log(`mutante desconhecido: ${MUT}`); process.exit(1); }

cobra(/new WebSocket\(this\.url, SNAPSHOT_PROTOCOLS\)/.test(tpSrc), 'cliente negocia v7/v6/v5/v4/v3/v2 binário com fallback v1 JSON');
cobra(/binaryType\s*=\s*['"]arraybuffer['"]/.test(tpSrc), 'frames binários chegam como ArrayBuffer, não Blob');
cobra(/decodeSnapshot\(dados\)/.test(netSrc), 'o caminho de produção chama o decoder real');
cobra(/MAX_SNAPSHOT_BYTES/.test(tpSrc), 'o transporte limita frame antes de alocar/decodificar');
cobra(/enviarInseguro/.test(tpSrc) && /enviarInseguro/.test(netSrc),
  'o transporte declara o canal que tolera perda, e o input já sai por ele (é o que vira datagrama)');

let codec = null;
try { codec = await import('../../public/js/netcodec.js'); }
catch (e) { cobra(false, `netcodec.js existe e importa sem build: ${e.code || e.message}`); }

if (codec) {
  const ents = Array.from({ length: 10 }, (_, i) => ({
    id: 100 + i, name: `JOGADOR_${i}`, team: i < 5 ? 'E' : 'B', bot: i === 0 ? 0 : 1,
    x: i * 3.125 - 12, y: 0.2, z: 40 - i * 4.25, yaw: i * 0.2, pitch: -0.1,
    hp: i === 9 ? 0 : 100 - i, alive: i !== 9, weapon: i % 2 ? 'ak' : 'awp',
    mantleF: i === 2 ? 0.62 : null,
    fire: i === 3 ? 1 : 0, fireN: i === 3 ? 7 : 0, voice: i === 4 ? 'radio' : 0,
    voiceN: i === 4 ? 5 : 0, k: i, d: 9 - i,
    respawnIn: i === 9 ? 2.25 : 0, killedBy: i === 9 ? 'JOGADOR_1' : undefined,
    ackSeq: i === 0 ? 812 : 0, mag: i === 0 ? 17 : null, res: i === 0 ? 61 : null,
    reloadIn: i === 0 ? 1.25 : 0, primary: i === 0 ? 'ak' : null,
    secondary: i === 0 ? 'pistol' : null,
  }));
  const sample = {
    type: 'snapshot', room: 'livre', tick: 123456, t: 87.125, state: 'live', owner: null,
    players: 1, spectators: 2, livre: { E: 4, B: 5 }, timeLeft: 72,
    roundNum: 2, scoreE: 1, scoreB: 0, roundKillsE: 7, roundKillsB: 4,
    ctf: {
      capsE: 4, capsB: 2, roundCapsE: 2, roundCapsB: 1, capsToWin: 3, matchLeft: 318.5,
      points: [
        { owner: 'E', prog: 1, capTeam: null, contested: false },
        { owner: 'B', prog: 1, capTeam: null, contested: false },
        { owner: null, prog: 0.625, capTeam: 'E', contested: true },
      ],
    },
    objective: { wave: 5, phase: 'combat', remaining: 12, objectiveHealth: [900, 600, 300] },
    ents,
  };
  const comum = codec.encodeSnapshot(sample);
  const reboque = codec.encodeTrailerV5({
    id: 100, ackSeq: 812, mag: 17, res: 61, reloadIn: 1.25,
    primary: 'ak', secondary: 'pistol', x: ents[0].x, y: ents[0].y, z: ents[0].z,
  });
  const bin = codec.juntarV5(comum, reboque);
  const out = codec.decodeSnapshot(bin);
  const near = (a, b) => Math.abs(a - b) < 1e-3;
  const perto = (a, b, tol) => Math.abs(a - b) <= tol;
  cobra(out.type === 'snapshot' && out.room === sample.room && out.tick === sample.tick,
    'envelope sobrevive ao round-trip');
  cobra(out.roundKillsE === 7 && out.roundKillsB === 4,
    'v7 preserva os totais autoritativos de abates introduzidos na v6');
  cobra(perto(out.ents[2].mantleF, 0.62, 1 / 254) && !('mantleF' in out.ents[1]),
    'v7 preserva progresso do mantle remoto em um byte e distingue ausência');
  cobra(out.objective?.wave === 5 && out.objective?.remaining === 12
      && out.objective?.objectiveHealth?.[2] === 300,
    'v7 preserva o estado autoritativo do objetivo');
  cobra(out.ents.length === 10 && out.ents.every((e, i) => e.id === ents[i].id && e.name === ents[i].name),
    'identidade das 10 entidades sobrevive');
  /* A precisão é DIFERENTE por papel, e é essa diferença que paga a banda: o vizinho é
     desenhado (16 mm não se vê), o dono é MEDIDO (a régua de reconciliação cobra milímetros
     dele, e quem a atende é o reboque em f32). */
  cobra(out.ents.slice(1).every((e, i) => perto(e.x, ents[i + 1].x, 0.02) && perto(e.z, ents[i + 1].z, 0.02)
      && perto(e.yaw, ents[i + 1].yaw, 0.002)),
    'vizinho chega quantizado dentro de 20 mm e 0,1° — invisível num corpo de 1,8 m');
  // f32, como sempre foi na v4: 1e-6 é mil vezes mais fino que o milímetro que a régua de
  // reconciliação cobra, e 30 mil vezes mais fino que os 16 mm do vizinho
  cobra(perto(out.ents[0].x, ents[0].x, 1e-6) && perto(out.ents[0].y, ents[0].y, 1e-6) && perto(out.ents[0].z, ents[0].z, 1e-6),
    'o DONO chega em f32 (é a posição que a reconciliação mede em milímetros)');
  cobra(out.ents[9].alive === false && out.ents[9].killedBy === 'JOGADOR_1' && perto(out.ents[9].respawnIn, 2.25, 0.05),
    'morte, respawn e autoria sobrevivem (respawn em décimos: é relógio de HUD, não de física)');
  cobra(out.ents[0].ackSeq === 812 && out.ents[0].mag === 17 && out.ents[0].res === 61
      && near(out.ents[0].reloadIn, 1.25) && out.ents[0].primary === 'ak'
      && out.ents[0].secondary === 'pistol',
    'o reboque v5 é remontado DENTRO da entidade do dono: quem consome não sabe que mudou');
  cobra(out.meu && out.meu.id === 100 && out.meu.ackSeq === 812,
    'e também fica acessível como `meu`, para quem precisar dele sem procurar a entidade');
  cobra(codec.decodeSnapshot(comum).ents.length === 10 && !codec.decodeSnapshot(comum).meu,
    'snapshot v5 SEM reboque continua decodificável — espectador não tem bloco privado');
  const semPrivado = codec.decodeSnapshot(comum);
  cobra(!('ackSeq' in semPrivado.ents[0]) && !('mag' in semPrivado.ents[0]),
    'e nenhuma entidade carrega bloco privado de ninguém (era 14 bytes × N por snapshot)');
  const outV6 = codec.decodeSnapshot(codec.encodeSnapshot(sample, 6));
  cobra(outV6.roundKillsE === 7 && outV6.roundKillsB === 4 && !('mantleF' in outV6.ents[2])
      && !('objective' in outV6),
    'snapshot v6 continua decodificável e omite os exclusivos da v7 (mantle e objetivo)');
  const outV5 = codec.decodeSnapshot(codec.encodeSnapshot(sample, 5));
  cobra(!('roundKillsE' in outV5) && !('roundKillsB' in outV5)
      && outV5.ents[3].fireN === 7,
    'snapshot v5 continua decodificável sem inventar campos exclusivos de v6/v7');
  const v4bin = codec.encodeSnapshot(sample, 4);
  /* v7 da UNIÃO (mantle + objetivo) carrega um estado que a v4 não tinha: o corte de 0,75
     continua valendo para o estado carregado (placar v6, mantle, privado), e o bloco
     objetivo entra no teto cobrado a byte exato (prefixo u16 + payload), não a ratio. */
  const bytesObjetivo = 2 + JSON.stringify(sample.objective).length;
  cobra(bin.byteLength < v4bin.byteLength * 0.75 + bytesObjetivo,
    `v7 preserva o corte de banda da v5 no estado carregado: ${bin.byteLength} contra ${v4bin.byteLength} bytes da v4 + ${bytesObjetivo} do bloco objetivo (${Math.round((1 - bin.byteLength / v4bin.byteLength) * 100)}% menos)`);
  const outV4 = codec.decodeSnapshot(v4bin);
  cobra(outV4.ents[0].ackSeq === 812 && near(outV4.ents[0].x, ents[0].x) && outV4.ents[3].fire === 1,
    'v4 continua byte-a-byte como era: bloco por entidade, posição em f32 e `fire` como bandeira');
  /* `fire` e `voice` eram bandeira de UM snapshot: datagrama perdido = tiro remoto mudo. Na v5
     são contadores, e o cliente lê a DIFERENÇA — pacote perdido não apaga o evento. */
  cobra(out.ents[3].fireN === 7 && out.ents[4].voiceN === 5 && out.ents[4].voice === 'radio',
    'v5 manda tiro e voz como CONTADOR, que sobrevive a pacote perdido');
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
  cobra(codec.SNAPSHOT_PROTOCOLS[0] === 'coro-snapshot-v7'
      && codec.SNAPSHOT_PROTOCOLS[1] === 'coro-snapshot-v6'
      && codec.SNAPSHOT_PROTOCOLS[2] === 'coro-snapshot-v5'
      && codec.SNAPSHOT_PROTOCOLS[3] === 'coro-snapshot-v4'
      && codec.SNAPSHOT_PROTOCOLS[4] === 'coro-snapshot-v3'
      && codec.SNAPSHOT_PROTOCOLS[5] === 'coro-snapshot-v2'
      && codec.SNAPSHOT_PROTOCOLS.includes('coro-json-v1'),
    'ordem de negociação prefere v7 e preserva fallbacks v6/v5/v4/v3/v2/JSON');

  for (const ruim of [bin.slice(0, 12), new Uint8Array([0, 1, 2, 3]), new Uint8Array(codec.MAX_SNAPSHOT_BYTES + 1)]) {
    let recusou = false; try { codec.decodeSnapshot(ruim); } catch { recusou = true; }
    cobra(recusou, `decoder recusa frame hostil de ${ruim.byteLength} bytes`);
  }
}

if (MUT) {
  const alvo = ALVO_DO_MUTANTE[MUT];
  const perdidas = Object.keys(resultado).filter((m) => !resultado[m]);
  const extras = perdidas.filter((m) => m !== alvo);
  if (!perdidas.includes(alvo)) { console.log(`\nmutante "${MUT}" NÃO detectado — a cláusula alvo seguiu verde`); process.exit(1); }
  if (extras.length) { console.log(`\nmutante "${MUT}" REPROVADO — acendeu cláusulas além da alvo: ${extras.join(' | ')}`); process.exit(1); }
  console.log(`\nmutante "${MUT}" DETECTADO — só a cláusula alvo apagou; ${ok} positivo(s) mantido(s)`);
  process.exit(0);
}
console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
