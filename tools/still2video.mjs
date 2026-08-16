// Transforma um retrato PARADO num loop de vídeo que respira.
//
// POR QUE ISTO EXISTE, E NÃO UM MODELO DE VÍDEO
// ---------------------------------------------
// O retrato aprovado (tools/gen-char-realista.mjs, estilo 3D-gamer) tem uma
// densidade de detalhe que o GLB low-poly não alcança: trama de tecido, dente de
// zíper, costura, tatuagem com traço nítido. Pôr ISSO em movimento por IA quadro a
// quadro não funciona — o modelo não tem memória entre quadros, então a tatuagem
// muda de desenho e o zíper anda sozinho. Além de custar ~70s POR QUADRO.
//
// Então o movimento não vem da IA: vem daqui. Um empurrão de câmera lento, uma
// deriva lateral e um grão fino. É pouco de propósito — num avatar de 512px em
// loop de 3s, o olho lê "retrato vivo" e não procura o gesto que não existe.
//
// O LOOP FECHA porque zoom e deriva são SENO de `on/total`: o último quadro volta
// exatamente ao primeiro. Rampa linear (o `zoompan` padrão) daria um salto visível
// a cada volta — que é o defeito clássico deste efeito.
//
// Uso:
//   node tools/still2video.mjs --in /tmp/gen-image/mandrake-gamer.png --id mandrake
//   node tools/still2video.mjs --in x.png --id y --secs 4 --fps 24 --w 512 --zoom 0.05
//
// Flags:
//   --in <png>     retrato de entrada (obrigatório)
//   --id <nome>    nome de saída, sem extensão (obrigatório)
//   --out <dir>    padrão public/video/chars
//   --secs N       duração do loop (padrão 3)
//   --fps N        padrão 24
//   --w N          largura de saída (padrão 512)
//   --h N          altura de saída (padrão = --w, ou seja, quadrado)
//   --zoom N       amplitude do empurrão, 0..0.2 (padrão 0.045)
//   --deriva N     deriva lateral em px do quadro de origem (padrão 10)
//   --grao N       intensidade do grão, 0 desliga (padrão 5)
//   --mp4          também grava .mp4 (padrão: só .webm)
import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = (n) => argv.includes(`--${n}`);
const die = (m) => { console.error('ERRO:', m); process.exit(1); };

const IN = arg('in');
const ID = arg('id');
if (!IN) die('faltou --in <png>');
if (!ID) die('faltou --id <nome>');
if (!existsSync(IN)) die(`--in não existe: ${IN}`);
if (!/^[a-z0-9_-]+$/.test(ID)) die(`--id inválido: "${ID}"`);

const OUT = arg('out', 'public/video/chars');
const SECS = parseFloat(arg('secs', '3'));
const FPS = parseInt(arg('fps', '24'), 10);
const W = parseInt(arg('w', '512'), 10);
/* Altura própria: forçar quadrado esmagava retrato 2:3 — a arte de corpo inteiro
   entrou espremida na primeira leva. Padrão segue quadrado (o caso do avatar). */
const H = parseInt(arg('h', String(W)), 10);
const ZOOM = parseFloat(arg('zoom', '0.045'));
const DERIVA = parseFloat(arg('deriva', '10'));
const GRAO = parseInt(arg('grao', '5'), 10);

const TOTAL = Math.max(2, Math.round(SECS * FPS));
mkdirSync(OUT, { recursive: true });

/* zoompan trabalha em cima do quadro de ENTRADA, então o `on` vai de 0 a TOTAL-1.
   Uso seno completo (2π) para que on=0 e on=TOTAL caiam no mesmo ponto — é isso que
   faz a emenda do loop sumir. O `d=1` diz "um quadro de saída por quadro de entrada";
   sem ele o zoompan repete o mesmo quadro 25 vezes e o vídeo congela. */
const w2 = `2*PI*on/${TOTAL}`;
const z = `1+${ZOOM}*(0.5-0.5*cos(${w2}))`;          // 1 → 1+ZOOM → 1, suave nas pontas
const x = `iw/2-(iw/zoom/2)+${DERIVA}*sin(${w2})`;
const y = `ih/2-(ih/zoom/2)+${(DERIVA * 0.4).toFixed(2)}*sin(${w2}+PI/2)`;

const filtros = [
  `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${W}x${H}:fps=${FPS}`,
  // respiração de luz: ±1,5% de brilho no mesmo período, para o quadro não ficar morto
  `eq=brightness=0.015*sin(${w2.replace(/on/g, `n`)})`,
];
if (GRAO > 0) filtros.push(`noise=alls=${GRAO}:allf=t`);

const base = ['-y', '-loop', '1', '-i', IN, '-t', String(SECS), '-vf', filtros.join(','), '-an'];

const feitos = [];
const webm = `${OUT}/${ID}.webm`;
execFileSync('ffmpeg', [...base, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', '32', webm], { stdio: 'pipe' });
feitos.push(webm);
if (flag('mp4')) {
  const mp4 = `${OUT}/${ID}.mp4`;
  execFileSync('ffmpeg', [...base, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow', '-movflags', '+faststart', mp4], { stdio: 'pipe' });
  feitos.push(mp4);
}

const kb = (f) => Math.round(execFileSync('stat', ['-f', '%z', f], { encoding: 'utf8' }).trim() / 1024);
console.log(`✓ ${ID} · ${TOTAL}f · ${SECS}s → ${feitos.map((f) => `${f} (${kb(f)}KB)`).join(' , ')}`);
