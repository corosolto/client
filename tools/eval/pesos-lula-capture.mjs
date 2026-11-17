#!/usr/bin/env node
/* ============================================================================
   pesos-lula-capture.mjs — antes × depois do repeso dos três Lula, em 3ª pessoa
   com fuzil, no MESMO renderer do jogo (public/charvideo.html → glbchars.js).
   ----------------------------------------------------------------------------
   "Antes" e "depois" rodam na mesma página, mesma build, mesmo passo de tempo:
   só os bytes do GLB mudam. Para o "antes", a rota do GLB novo responde com o
   GLB antigo tirado do git (blob do commit anterior ao repeso), então a única
   variável é o peso de skin.

   Uso (servidor + lock de browser do repo):
     node tools/eval/serve.mjs 9437 &
     tools/eval/with-browser-lock.sh npm run evidencia:pesos-lula -- --base http://127.0.0.1:9437
   Saída (--saida, padrão /tmp/pesos-lula): <skin>.jpg (folha de contato por
   skin: antes, depois e |diferença| ×4) + recibo.json + quadros PNG em
   /tmp/pesos-lula-quadros/. A evidência publicada fica no studio-assets
   (evidence/pesos-skins-20261109/), não no client.
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { chromium } from 'playwright';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://127.0.0.1:9437');
const ORIGEM = arg('origem', ''); // vazio: pai do commit que apagou o GLB antigo no HEAD
const SAIDA = arg('saida', '/tmp/pesos-lula');
const QUADROS = '/tmp/pesos-lula-quadros';
mkdirSync(SAIDA, { recursive: true }); mkdirSync(QUADROS, { recursive: true });

const manifest = JSON.parse(readFileSync('public/models/skins/manifest.json', 'utf8'));
const ANTIGOS = { 'lula-mandrake': 'lula-mandrake-d7014fbc5694.glb', 'lula-cyborg': 'lula-cyborg-dee1c4685b95.glb', 'lula-drip': 'lula-drip-b7c49abc6b76.glb' };
const POSES = ['shoot', 'idle', 'walkfire'];
const VISTAS = [ // tronco + braços (fatia 0,7 da altura), de frente 3/4, de lado e de costas 3/4
  { nome: 'frente 3/4', q: 'shot=corpo&fatia=0.7&yaw=35' },
  { nome: 'lado', q: 'shot=corpo&fatia=0.7&yaw=90' },
  { nome: 'costas 3/4', q: 'shot=corpo&fatia=0.7&yaw=215' },
];
const TEMPO = 0.6; // s de clipe depois do aquecimento do charvideo

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'] });
/* Os nomes antigos somem da árvore com este repeso: o blob vem do pai do commit que os
   apagou (vale na branch e depois do merge) e o hash do nome confere os bytes. */
const glbAntigo = (antigo) => {
  const caminho = `public/models/skins/${antigo}`;
  const apagou = ORIGEM ? '' : execFileSync('git', ['log', '-1', '--format=%H', '--diff-filter=D', 'HEAD', '--', caminho], { encoding: 'utf8' }).trim();
  const ref = ORIGEM || (apagou && `${apagou}^`);
  if (!ref) throw new Error(`${antigo}: nenhum commit do HEAD apagou ${caminho}; passe --origem`);
  const bytes = execFileSync('git', ['show', `${ref}:${caminho}`], { maxBuffer: 1 << 26 });
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  if (!antigo.endsWith(`-${hash}.glb`)) throw new Error(`${antigo}: bytes de ${ref} têm hash ${hash}`);
  return { bytes, ref };
};
const recibo = { base: BASE, origem: ORIGEM || 'pai do commit que apagou cada GLB antigo', tempo: TEMPO, skins: {} };
try {
  for (const [skin, antigo] of Object.entries(ANTIGOS)) {
    const novo = manifest.skins[skin].model.split('/').pop();
    const { bytes: bytesAntigos, ref: refAntigo } = glbAntigo(antigo);
    const tiles = { antes: [], depois: [] };
    for (const estado of ['antes', 'depois']) {
      const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
      const erros = [];
      page.on('pageerror', (e) => erros.push(String(e)));
      if (estado === 'antes') await page.route(`**/models/skins/${novo}*`, (r) => r.fulfill({ status: 200, contentType: 'model/gltf-binary', body: bytesAntigos }));
      for (const vista of VISTAS) {
        await page.goto(`${BASE}/charvideo.html?skin=${skin}&wpn=ak&bg=alpha&w=512&h=512&pose=idle&${vista.q}`);
        await page.waitForFunction(() => window.CHARVID?.ready, null, { timeout: 300000 });
        if (!(await page.evaluate(() => window.CHARVID.skinned))) throw new Error(`${skin} ${estado}: charvideo não vestiu a skin`);
        for (const pose of POSES) {
          const dataUrl = await page.evaluate(async ([p, t]) => { const C = window.CHARVID; C.pose(p); C.reset(); for (let s = 0; s < t; s += 1 / 30) C.step(1 / 30); return C.grab(); }, [pose, TEMPO]);
          const png = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
          writeFileSync(`${QUADROS}/${skin}-${estado}-${pose}-${vista.nome.replace(/[ /]/g, '_')}.png`, png);
          tiles[estado].push({ png, rotulo: `${pose} · ${vista.nome}` });
        }
      }
      if (erros.length) throw new Error(`${skin} ${estado}: erros na página: ${erros.join(' | ')}`);
      await page.close();
    }
    // Folha: linha 1 = antes, linha 2 = depois, linha 3 = |depois − antes| × 4
    // (onde o repeso mexeu); colunas = vista × pose.
    const T = 300, R = 30, n = tiles.antes.length;
    const camadas = [];
    const diffs = [];
    for (let ci = 0; ci < n; ci++) {
      const [a, d] = await Promise.all([tiles.antes[ci].png, tiles.depois[ci].png].map((b) => sharp(b).resize(T, T).ensureAlpha().raw().toBuffer()));
      const out = Buffer.alloc(T * T * 4);
      let soma = 0;
      for (let i = 0; i < T * T; i++) {
        let m = 0;
        for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(a[i * 4 + c] - d[i * 4 + c]));
        soma += m;
        const v = Math.min(255, m * 4);
        out[i * 4] = v; out[i * 4 + 1] = v * 0.35; out[i * 4 + 2] = 0; out[i * 4 + 3] = Math.max(v, Math.max(a[i * 4 + 3], d[i * 4 + 3]) * 0.25);
      }
      diffs.push(soma / (T * T));
      camadas.push({ input: await sharp(a, { raw: { width: T, height: T, channels: 4 } }).png().toBuffer(), left: ci * T, top: R });
      camadas.push({ input: await sharp(d, { raw: { width: T, height: T, channels: 4 } }).png().toBuffer(), left: ci * T, top: (T + R) + R });
      camadas.push({ input: await sharp(out, { raw: { width: T, height: T, channels: 4 } }).png().toBuffer(), left: ci * T, top: 2 * (T + R) + R });
    }
    const rotulos = [];
    const cor = { antes: '#ffb4a8', depois: '#b8f5c0', 'diferença ×4': '#ffd27a' };
    for (const [li, estado] of ['antes', 'depois', 'diferença ×4'].entries()) tiles.antes.forEach((t, ci) => {
      const extra = li === 2 ? ` (média ${diffs[ci].toFixed(2)})` : '';
      rotulos.push({ input: Buffer.from(`<svg width="${T}" height="${R}" xmlns="http://www.w3.org/2000/svg"><text x="8" y="21" fill="${cor[estado]}" font-size="14" font-family="Arial, sans-serif">${skin} · ${estado} · ${t.rotulo}${extra}</text></svg>`), left: ci * T, top: li * (T + R) });
    });
    const resolvidas = camadas;
    const arquivo = `${SAIDA}/${skin}.jpg`;
    const info = await sharp({ create: { width: n * T, height: 3 * (T + R), channels: 4, background: '#1a222c' } })
      .composite([...resolvidas, ...rotulos]).jpeg({ quality: 82 }).toFile(arquivo);
    recibo.skins[skin] = { antigo, origemAntigo: refAntigo, novo, folha: arquivo, bytes: info.size, quadros: n * 2, diferencaMediaPorQuadro: Object.fromEntries(tiles.antes.map((t, i) => [t.rotulo, +diffs[i].toFixed(3)])) };
    console.log(`${skin}: ${arquivo} (${info.size} B)`);
  }
} finally { await browser.close(); }
writeFileSync(`${SAIDA}/recibo.json`, `${JSON.stringify(recibo, null, 2)}\n`);
