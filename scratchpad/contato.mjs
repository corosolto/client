import sharp from 'sharp';
const YAWS = ['0','0.8','1.57','2.4','3.14'];
const W = 300;
for (const mapa of process.argv.slice(2)) {
  const tiles = [];
  for (const y of YAWS) {
    const buf = await sharp(`/tmp/gauntlet/g2ui-maps/${mapa}-p2-y${y}.png`).resize(W, W).toBuffer();
    tiles.push(buf);
  }
  await sharp({ create: { width: W * YAWS.length, height: W, channels: 3, background: '#000' } })
    .composite(tiles.map((input, i) => ({ input, left: i * W, top: 0 })))
    .jpeg({ quality: 82 })
    .toFile(`scratchpad/contato_${mapa}_p2.jpg`);
  console.log('contato', mapa, YAWS.join(' | '));
}
