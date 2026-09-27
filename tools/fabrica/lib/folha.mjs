// Folha de contato (grade de PNGs com rótulo) — para o crítico e para a página do dono.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export async function folhaDeContato(arquivos, destino, { colunas = 4, largura = 480, rotulos = [] } = {}) {
  const metas = await Promise.all(arquivos.map((f) => sharp(f).metadata()));
  const altura = Math.round(largura * (metas[0].height / metas[0].width));
  const linhas = Math.ceil(arquivos.length / colunas);
  const camadas = [];
  for (let i = 0; i < arquivos.length; i += 1) {
    const x = (i % colunas) * largura;
    const y = Math.floor(i / colunas) * (altura + 22);
    camadas.push({ input: await sharp(arquivos[i]).resize(largura, altura).toBuffer(), left: x, top: y + 22 });
    const texto = (rotulos[i] || path.basename(arquivos[i])).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    camadas.push({
      input: Buffer.from(`<svg width="${largura}" height="22"><rect width="100%" height="100%" fill="#111"/><text x="6" y="16" font-family="Menlo, monospace" font-size="13" fill="#ffd54a">${texto}</text></svg>`),
      left: x, top: y,
    });
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  await sharp({ create: { width: colunas * largura, height: linhas * (altura + 22), channels: 3, background: '#000' } })
    .composite(camadas).png().toFile(destino);
  return destino;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [destino, ...arquivos] = process.argv.slice(2);
  await folhaDeContato(arquivos, destino);
  console.log(destino);
}
