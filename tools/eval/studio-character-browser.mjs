/* studio-character-browser.mjs — PERSONAGEM DO STUDIO NO RENDERER REAL (Chrome).
   ----------------------------------------------------------------------------
   Sobe tools/eval/serve.mjs com STUDIO_PACK_ROOT (o /packs/ real, sem cópia para
   public/), abre o harness charvideo.html?id=<release> — o MESMO preloadCharacterAssets
   + buildCharacterModel do jogo, sem o personagem estar no elenco — e cobra:

     B1  corpo e os 11 clipes vieram de Blob URLs verificadas, com o SHA do pin
     B2  rede: manifesto + modelo + 11 clipes + prévia pedidos em /packs/, 200; NENHUM
         pedido a models/characters/<id>.glb nem models/anims/<id>*
     B3  esqueleto do modelo montado tem as 28 juntas meshy-28 (26 nomes)
     B4  cada ação do controlador usa o clipe do pacote (identidade) e cada clipe,
         tocado no mixer, move o esqueleto; um still por estado em artifacts/
     B5  luva: corpo do Studio não casa com pacote de luva público (handle nulo)
     B6  pacote adulterado no fio (1 byte do jump.glb): preload REJEITA com
         studio_file_sha_mismatch, o id do Studio fica sem modelo/proveniência, o id
         legado pedido na mesma chamada carrega, e o erro aparece no console

   Sem STUDIO_PACK_ROOT (ou sem o pacote instalado nele) sai 78 = NÃO MEDIDO, nunca
   verde. Porta: PORTA ou a 1ª livre a partir de 9461 (lane 9100-9900). Rode sob with-browser-lock.sh. */
import { execSync, spawn } from 'node:child_process';
import net from 'node:net';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CHARACTER_RELEASES, STUDIO_CHARACTER_STATES, STUDIO_SKELETON_JOINTS } from '../../public/js/data/content-releases.js';

const NAO_MEDIDO = 78;
const ROOT = join(import.meta.dirname, '../..');
const RAIZ = process.env.STUDIO_PACK_ROOT;
const ID = process.argv.find((a) => a.startsWith('--id='))?.split('=')[1] || Object.keys(CHARACTER_RELEASES)[0];
const PIN = CHARACTER_RELEASES[ID];
if (!PIN) throw new Error(`release desconhecida: ${ID}`);
if (!RAIZ) {
  console.log(`UNRUN: STUDIO_PACK_ROOT ausente — /packs/ responde 404 e o pacote ${ID}@${PIN.version} não foi medido (não é verde).`);
  process.exit(NAO_MEDIDO);
}
const manifestoLocal = join(RAIZ, PIN.manifestUrl.replace(/^\/packs\//, ''));
if (!existsSync(manifestoLocal)) {
  console.log(`UNRUN: ${manifestoLocal} não existe — instale o pacote ${ID}@${PIN.version} na raiz antes de medir (não é verde).`);
  process.exit(NAO_MEDIDO);
}

/* Primeira porta livre da lane 9100-9900 a partir de 9461 (outras pistas deixam dev servers de pé). */
const livre = (p) => new Promise((ok) => {
  const s = net.createServer().once('error', () => ok(false)).listen(p, '127.0.0.1', () => s.close(() => ok(true)));
});
let PORTA = process.env.PORTA;
for (let p = 9461; !PORTA && p < 9900; p++) if (await livre(p)) PORTA = String(p);
const BASE = `http://127.0.0.1:${PORTA}`;
const OUT = join(ROOT, 'artifacts', 'studio-character', ID);
mkdirSync(OUT, { recursive: true });
const DIR_PACOTE = PIN.manifestUrl.replace(/manifest\.json$/, '');

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

const servidor = spawn(process.execPath, ['tools/eval/serve.mjs', PORTA], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, STUDIO_PACK_ROOT: RAIZ } });
const derruba = () => { try { servidor.kill(); } catch { /* já saiu */ } };
process.on('exit', derruba);
let pronto = false;
for (let i = 0; i < 120 && !pronto; i++) {
  try { pronto = (await fetch(`${BASE}/eval-character.html`)).ok; } catch { /* subindo */ }
  if (!pronto) await new Promise((r) => setTimeout(r, 500));
}
if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);

const falhas = [];
const falha = (m) => falhas.push(m);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  // ── B1..B5: pacote íntegro no harness real ─────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 640, height: 720 } });
  const page = await ctx.newPage();
  const erros = [], pedidos = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('response', (r) => { const u = new URL(r.url()); if (u.origin === BASE) pedidos.push({ path: u.pathname, status: r.status() }); });
  await page.goto(`${BASE}/charvideo.html?id=${ID}&bg=cena&w=640&h=720&shot=corpo`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.CHARVID?.ready, null, { timeout: 240000 }).catch(() => {});
  const pronta = await page.evaluate(() => !!window.CHARVID?.ready);
  if (!pronta) falha(`B1: charvideo não ficou pronto (${erros.join(' | ') || 'sem erro de página'})`);
  else {
    const r = await page.evaluate(async ({ estados, juntas }) => {
      const THREE = await import('three');
      const C = window.CHARVID, ctrl = C.ctrl, st = C.studio;
      const out = { studio: st && { kind: st.kind, id: st.id, version: st.version, manifestSha256: st.manifestSha256, modelSha256: st.modelSha256, modelUrl: st.modelUrl, animationUrls: { ...st.animationUrls }, previewUrls: [...st.previewUrls] } };
      let pele = null;
      ctrl.model.traverse((o) => { if (!pele && o.isSkinnedMesh && o.skeleton) pele = o; });
      out.juntas = pele ? pele.skeleton.bones.map((b) => b.name) : [];
      out.juntasFaltando = juntas.filter((n) => !out.juntas.includes(n));
      const ossos = pele ? pele.skeleton.bones : [];
      // Só rotações: translação de quadril vem na unidade do rig (cm) e inflaria a medida.
      const foto = () => ossos.map((b) => b.quaternion.toArray());
      const dist = (a, b) => Math.max(0, ...a.map((v, i) => Math.max(...v.map((x, k) => Math.abs(x - b[i][k])))));
      const pixels = async (url) => {
        const img = new Image(); img.src = url; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const c2 = cv.getContext('2d'); c2.drawImage(img, 0, 0);
        return c2.getImageData(0, 0, cv.width, cv.height).data;
      };
      /* Fração do quadro que muda quando o corpo some: prova que o still MOSTRA o personagem
         (um enquadramento quebrado renderiza parede e passaria nas outras medidas). */
      const cobertura = async (comCorpo) => {
        ctrl.group.visible = false; C.render(); const sem = await pixels(C.grab()); ctrl.group.visible = true; C.render();
        const com = await pixels(comCorpo);
        let n = 0;
        for (let i = 0; i < com.length; i += 4) if (Math.max(Math.abs(com[i] - sem[i]), Math.abs(com[i + 1] - sem[i + 1]), Math.abs(com[i + 2] - sem[i + 2])) > 24) n++;
        return n / (com.length / 4);
      };
      out.clipes = {};
      for (const s of estados) {
        const a = ctrl.actions[s];
        const doPacote = !!a && !!st && a.getClip() === st.clips[s];
        ctrl.mixer.stopAllAction();
        let mexe = 0, tempo = 0, png = null, quadro = 0;
        if (a) {
          /* "Toca" = a pose do esqueleto muda entre dois instantes do clipe. Sem skeleton.pose():
             a pose de bind no espaço do esqueleto desmonta o enquadramento do harness. */
          a.reset(); a.setLoop(2201, Infinity); a.enabled = true; a.setEffectiveWeight(1); a.setEffectiveTimeScale(1); a.play();
          ctrl.mixer.update(a.getClip().duration * 0.1);
          const cedo = foto();
          ctrl.mixer.update(a.getClip().duration * 0.35);
          mexe = dist(cedo, foto());
          tempo = a.time;
          C.render();
          png = C.grab();
          quadro = await cobertura(png);
        }
        // Tamanho real da pose (vértices esfolados): pega corpo explodido/encolhido no still.
        const caixa = new THREE.Box3().setFromObject(ctrl.model, true);
        const altura = caixa.max.y - caixa.min.y, largura = Math.max(caixa.max.x - caixa.min.x, caixa.max.z - caixa.min.z);
        out.clipes[s] = { existe: !!a, doPacote, nome: a?.getClip().name, duracao: a?.getClip().duration || 0, tempo, mexe, altura, largura, quadro, png };
      }
      const G = await import('/js/glbchars.js');
      out.luva = G.getGloveHandle(C.id);
      out.hasModel = G.hasModel(C.id);
      return out;
    }, { estados: STUDIO_CHARACTER_STATES, juntas: STUDIO_SKELETON_JOINTS });

    const st = r.studio;
    if (!st || st.kind !== 'studio' || st.id !== ID) falha(`B1: sem proveniência Studio para ${ID}: ${JSON.stringify(st)}`);
    else {
      if (st.manifestSha256 !== PIN.manifestSha256) falha(`B1: manifesto ${st.manifestSha256} ≠ pin ${PIN.manifestSha256}`);
      if (!st.modelUrl.startsWith('blob:')) falha(`B1: modelo não veio de Blob URL: ${st.modelUrl}`);
      const urls = STUDIO_CHARACTER_STATES.map((s) => st.animationUrls[s]);
      if (urls.some((u) => !u?.startsWith('blob:')) || new Set(urls).size !== 11) falha(`B1: clipes sem 11 Blob URLs distintas: ${JSON.stringify(st.animationUrls)}`);
    }
    const doPacote = pedidos.filter((p) => p.path.startsWith(DIR_PACOTE));
    const esperados = ['manifest.json', 'model/', ...STUDIO_CHARACTER_STATES.map((s) => `animations/${s}.glb`), 'previews/'];
    for (const e of esperados) {
      const hit = doPacote.find((p) => p.path.slice(DIR_PACOTE.length).startsWith(e));
      if (!hit) falha(`B2: ${DIR_PACOTE}${e} não foi pedido`);
      else if (hit.status !== 200) falha(`B2: ${hit.path} → ${hit.status}`);
    }
    const legado = pedidos.filter((p) => p.path.includes(`/models/characters/${ID}`) || p.path.includes(`/models/anims/${ID}`));
    if (legado.length) falha(`B2: pedidos ao acervo legado para ${ID}: ${legado.map((p) => p.path).join(', ')}`);
    if (r.juntas.length !== 28 || r.juntasFaltando.length) falha(`B3: esqueleto com ${r.juntas.length} juntas; faltando ${r.juntasFaltando.join(',') || 'nenhuma'}`);
    const linhas = [];
    for (const s of STUDIO_CHARACTER_STATES) {
      const c = r.clipes[s];
      if (!c.existe) { falha(`B4: sem ação ${s}`); continue; }
      if (!c.doPacote) falha(`B4: ação ${s} não usa o clipe do pacote (fallback compartilhado?)`);
      if (c.nome !== s) falha(`B4: clipe ${s} chamado ${c.nome}`);
      if (!(c.mexe > 1e-3) || !(c.tempo > 0)) falha(`B4: clipe ${s} não moveu o esqueleto (Δ ${c.mexe}, t ${c.tempo})`);
      // Corpo de 1,72 m normalizado: nenhuma pose passa de 2,6 m nem some (morte deitada ≥ 0,2 m).
      if (!(c.altura > 0.2 && c.altura < 2.6 && c.largura < 2.6)) falha(`B4: pose ${s} fora de escala (altura ${c.altura?.toFixed(2)} m, largura ${c.largura?.toFixed(2)} m)`);
      if (!(c.quadro > 0.03)) falha(`B4: still de ${s} não mostra o personagem (${((c.quadro || 0) * 100).toFixed(1)}% do quadro muda sem o corpo)`);
      const arquivo = join(OUT, `${s}.png`);
      if (c.png?.startsWith('data:image/png;base64,')) writeFileSync(arquivo, Buffer.from(c.png.split(',')[1], 'base64'));
      else falha(`B4: sem still de ${s}`);
      linhas.push(`${s.padEnd(10)} dur ${c.duracao.toFixed(2)}s  Δquat ${c.mexe.toFixed(3)}  altura ${c.altura.toFixed(2)} m  corpo ${(c.quadro * 100).toFixed(1)}% do quadro  ${arquivo}`);
    }
    if (r.luva !== null) falha(`B5: corpo do Studio ganhou handle de luva: ${JSON.stringify(r.luva)}`);
    if (!r.hasModel) falha('B1: hasModel falso depois do preload');
    if (erros.length) falha(`B1: erros de página: ${erros.join(' | ')}`);
    console.log(`proveniência: manifesto ${st?.manifestSha256}, modelo ${st?.modelSha256}`);
    console.log(`rede /packs/: ${doPacote.length} pedido(s) → ${[...new Set(doPacote.map((p) => p.status))].join(',')}`);
    console.log(`esqueleto: ${r.juntas.length} juntas (${r.juntasFaltando.length} meshy-28 faltando)`);
    for (const l of linhas) console.log(`  ${l}`);
  }
  await ctx.close();

  // ── B6: pacote adulterado no fio ───────────────────────────────────────────
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  const consoleErros = [];
  p2.on('console', (m) => { if (m.type() === 'error') consoleErros.push(m.text()); });
  await p2.route(`**${DIR_PACOTE}animations/jump.glb`, async (route) => {
    const res = await route.fetch();
    const corpo = Buffer.from(await res.body());
    corpo[corpo.length - 1] ^= 1;
    await route.fulfill({ response: res, body: corpo });
  });
  await p2.goto(`${BASE}/eval-character.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const adulterado = await p2.evaluate(async (id) => {
    const G = await import('/js/glbchars.js');
    let codigo = null, codigos = [];
    try { await G.preloadCharacterAssets([id, 'mst']); } catch (e) { codigo = e?.code || e?.name; codigos = (e?.errors || []).map((x) => x.code); }
    return { codigo, codigos, studio: G.hasModel(id), prov: G.studioCharacterProvenance(id), legado: G.hasModel('mst') };
  }, ID);
  if (adulterado.codigo !== 'studio_file_sha_mismatch') falha(`B6: preload adulterado terminou com ${adulterado.codigo} ${adulterado.codigos.join(',')} (queria studio_file_sha_mismatch)`);
  if (adulterado.studio || adulterado.prov) falha('B6: id do Studio ficou com modelo/proveniência depois da falha (estado parcial)');
  if (!adulterado.legado) falha('B6: id legado pedido na mesma chamada não carregou');
  if (!consoleErros.some((t) => t.includes('[studio]') && t.includes('studio_file_sha_mismatch'))) falha(`B6: falha não apareceu no console (${consoleErros.join(' | ') || 'nada'})`);
  console.log(`adulterado: ${adulterado.codigo}; Studio sem modelo: ${!adulterado.studio}; legado carregou: ${adulterado.legado}`);
  await ctx2.close();
} finally {
  await browser.close();
  derruba();
}

if (falhas.length) {
  console.error(`personagem do Studio no Chrome reprovado (${ID}@${PIN.version}):`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`personagem do Studio no Chrome confere: ${ID}@${PIN.version} do pacote verificado, 11 clipes tocando, adulteração rejeitada. Stills: ${OUT}`);
process.exit(0);
