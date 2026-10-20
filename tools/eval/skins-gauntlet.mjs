#!/usr/bin/env node
/* ============================================================================
skins-gauntlet.mjs — TODA SKIN VENDÁVEL CHEGA NO LOBBY E NO JOGO?

POR QUE EXISTE (20/10/2026)
A AK Estrela Vermelha foi comprada, equipada e **não apareceu em lugar nenhum** —
primeiro porque o preview do lobby montava a arma de vibe do personagem, depois
porque a CSP de produção barrava o decoder meshopt. Nos dois casos a loja dizia
"EQUIPADO" e o jogo mostrava outra coisa. Uma skin por vez, conferida à mão, não
cobre um catálogo de 50 itens; este portão varre o catálogo inteiro.

O QUE ELE MEDE, por item equipado (arma, luva, pack, óculos):
  LOBBY  o preview 3D monta o que foi equipado - a leitura sai do objeto montado
         (dataset do canvas, alimentado em main.js/pvSetChar), nunca da intenção;
  JOGO   a partida de verdade: a arma em 1ª pessoa carrega com `userData.weaponSkin`
         e as mãos carregam o estilo de luva equipado.
Cada item rende duas capturas em tools/eval/out/skins-gauntlet/.

Uso:
  node tools/eval/skins-gauntlet.mjs                   # catálogo inteiro, lobby + jogo
  node tools/eval/skins-gauntlet.mjs --so luvas        # só uma família (armas|luvas|packs|oculos)
  node tools/eval/skins-gauntlet.mjs --item luvas-brasil
  node tools/eval/skins-gauntlet.mjs --lobby           # pula a partida (rápido)
  BASE=http://127.0.0.1:9441 ... (padrão) · PAR=3 páginas simultâneas
============================================================================ */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TRETA_WEAPON_SKINS, TRETA_GLOVES, TRETA_PACKS, TRETA_EYEWEAR } from '../../public/js/treta-catalog.js';
import { TRETA_PACKS as PACK_DEFS } from '../../public/js/data/pack-definitions.js';
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : null; };
const flag = (n) => process.argv.includes(`--${n}`);
const BASE = process.env.BASE || 'http://127.0.0.1:9441';
const PAR = Number(process.env.PAR || 3);
const OUT = path.resolve('tools/eval/out/skins-gauntlet');
mkdirSync(OUT, { recursive: true });

/* O catálogo do gauntlet é o MESMO que a loja vende (treta-catalog.js), porque
   `available()` cobra campo a campo o que o servidor manda contra o que o cliente conhece
   (slot, weapon_id, model_path, ready). Inventar o fixture à mão só produziria item
   indisponível - e um verde que não quer dizer nada. */
const produto = (s, familia, extra = {}) => ({
  id: s.id, familia, nome: s.name, slot: s.slot, weaponId: s.weapon || null,
  model: s.model, price: s.price, ...extra,
});
const CATALOGO = [
  ...TRETA_WEAPON_SKINS.map((s) => produto(s, 'armas')),
  ...TRETA_GLOVES.map((s) => produto(s, 'luvas')),
  ...TRETA_PACKS.map((s) => {
    // PACK_DEFS é LISTA (chaves 0..9): indexar por id devolvia undefined e o pack passava
    // sem ninguém cobrar a arma e a luva que ele promete.
    const def = PACK_DEFS.find ? PACK_DEFS.find((p) => p.id === s.id) : Object.values(PACK_DEFS).find((p) => p.id === s.id);
    return produto(s, 'packs', { esperaArma: def?.weaponSkins?.pistol || def?.weaponSkins?.ak || null, esperaLuva: def?.gloveSkin || null });
  }),
  ...TRETA_EYEWEAR.map((s) => produto({ ...s, slot: 'eyewear', price: 200, model: null }, 'oculos')),
];

const escolhidos = CATALOGO.filter((s) => (!arg('so') || s.familia === arg('so')) && (!arg('item') || s.id === arg('item')));
if (!escolhidos.length) { console.error('nenhum item casou com o filtro'); process.exit(2); }

const tretaFixture = (item, vazio = false) => ({
  authenticated: true,
  campaign: { starts_at: '2026-01-01T00:00:00Z', ends_at: '2099-01-01T00:00:00Z', email_reward: 50, referral_reward: 100,
    referral_cap: 3, sp_reward: 10, mp_reward: 20, daily_match_cap: 60 },
  quests: { email: 0, referral: 1, singleplayer: 2, multiplayer: 0 },
  wallet: { balance: 9000, referral_code: '00000000-0000-4000-8000-000000000001' },
  inventory: vazio ? [] : [{ skin_id: item.id, equipped: true }],
  catalog: vazio ? [] : [{ id: item.id, name: item.nome, character_id: null, available: true, slot: item.slot,
    weapon_id: item.weaponId, price: item.price, model_path: item.model }],
});

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--use-angle=metal'],
});

/* A captura do lobby usa `?pvcam=maos`: câmera na mão e idle congelado. Sem isso a
   imagem muda sozinha a cada quadro (o preview gira e anima) e diferença de pixel entre
   duas rodadas não prova nada - foi medido: 17k pixels mudando com o MESMO equipamento.
   O veredito, então, sai do objeto montado; a captura existe para o humano conferir fit. */
async function medir(item, baseline = false) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 820 } });
  const erros = [];
  /* `.astro/eval-vite` é cache do servidor de régua, não existe em produção: quando ele
     expira no meio da corrida o 404 vira pageerror e reprovava item inocente. */
  page.on('pageerror', (e) => { const m = String(e.message); if (!m.includes('.astro/eval-vite')) erros.push(m.slice(0, 80)); });
  await page.route('**/api/treta**', (r) => r.fulfill({ json: baseline ? tretaFixture({ id: 'nada', nome: 'nada', slot: 'weapon', weaponId: null, model: null, price: 0 }, true) : tretaFixture(item) }));
  await page.addInitScript(() => {
    localStorage.setItem('cs_treta_intro', 'v1');
    localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false }));
  });
  const r = { id: item.id, familia: item.familia, lobby: null, jogo: null, erros };
  try {
    await page.goto(`${BASE}/?ui=v3&lang=pt&pvcam=maos`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2500);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('char-preview')?.dataset.glb === '1', null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    r.lobby = await page.evaluate(() => {
      const c = document.getElementById('char-preview');
      return { arma: c?.dataset.arma || '', armaSkin: c?.dataset.armaSkin || '', luva: c?.dataset.luva || '' };
    });
    await page.locator('#char-preview').screenshot({ path: baseline ? path.join(OUT, 'lobby-BASE.png') : path.join(OUT, `lobby-${item.id}.png`) }).catch(() => {});

    if (!flag('lobby')) {
      await page.evaluate(() => document.getElementById('btn-jogar')?.click());
      await page.waitForFunction(() => window.__game?._mapId, null, { timeout: 150000 }).catch(() => {});
      await page.waitForTimeout(9000);
      // Sem ativar a mira, o viewmodel fica na pose de espera e as MÃOS saem do quadro -
      // a captura do jogo vinha sem a luva que ela deveria mostrar.
      await page.mouse.click(550, 420).catch(() => {});
      await page.waitForTimeout(1500);
      if (item.weaponId) await page.evaluate((w) => window.__game?._switchWeapon?.(w), item.weaponId);
      await page.waitForTimeout(6000);
      r.jogo = await page.evaluate(() => {
        const g = window.__game;
        if (!g?.vmScene) return null;
        const pinturas = new Set(), luvas = new Set();
        g.vmScene.traverse((o) => {
          if (o.userData?.weaponSkin) pinturas.add(o.userData.weaponSkin);
          const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
          for (const m of mats) if (m.userData?.teamHands?.style) luvas.add(m.userData.teamHands.style);
        });
        return { pinturas: [...pinturas], luvas: [...luvas] };
      });
      await page.screenshot({ path: path.join(OUT, `jogo-${item.id}.png`) }).catch(() => {});
    }
  } catch (e) { r.falha = String(e.message).slice(0, 90); }
  await page.close();
  return r;
}

/* Veredito por família: cada uma promete coisa diferente ao jogador.
   `pack` promete arma E luva; `oculos` ainda não tem caminho 3D no lobby (TRETA_ITEMS),
   então aqui ele só não pode QUEBRAR a tela - cobrar fit de óculos é trabalho de outra lane. */
function julgar(item, r) {
  if (r.falha) return [false, r.falha];
  const l = r.lobby || {};
  const j = r.jogo;
  if (item.familia === 'armas') {
    const noLobby = l.armaSkin === item.id;
    const noJogo = !j || j.pinturas.includes(item.id);
    return [noLobby && noJogo,
      `lobby=${l.armaSkin || 'nenhuma'} jogo=${j ? (j.pinturas.join(',') || 'nenhuma') : 'pulado'}`];
  }
  if (item.familia === 'luvas') {
    const noLobby = l.luva === item.id;
    const noJogo = !j || j.luvas.includes(item.id);
    return [noLobby && noJogo,
      `lobby=${l.luva || 'nenhuma'} jogo=${j ? (j.luvas.join(',') || 'nenhuma') : 'pulado'}`];
  }
  if (item.familia === 'packs') {
    const arma = !item.esperaArma || l.armaSkin === item.esperaArma;
    const luva = !item.esperaLuva || l.luva === item.esperaLuva;
    return [arma && luva,
      `lobby arma=${l.armaSkin || 'nenhuma'} luva=${l.luva || 'nenhuma'} (promete ${item.esperaArma}/${item.esperaLuva})`];
  }
  return [!r.erros.length && !!l.arma, `preview vivo=${l.arma ? 'sim' : 'não'}${r.erros.length ? `; erros: ${r.erros[0]}` : ''}`];
}

// Baseline sem nada equipado: existe como referência visual do humano (lobby-BASE.png).
await medir({ id: 'nada', familia: 'base', nome: 'nada', slot: 'weapon', weaponId: null, model: null, price: 0 }, true);
const fila = [...escolhidos];
const resultados = [];
await Promise.all(Array.from({ length: Math.min(PAR, fila.length) }, async () => {
  while (fila.length) {
    const item = fila.shift();
    const r = await medir(item);
    const [ok, msg] = julgar(item, r);
    resultados.push({ item, ok, msg });
    console.log(`${ok ? 'VERDE   ' : 'VERMELHO'} ${item.familia}/${item.id}  ${msg}`);
  }
}));
await browser.close();

const reprovados = resultados.filter((r) => !r.ok);
for (const familia of ['armas', 'luvas', 'packs', 'oculos']) {
  const da = resultados.filter((r) => r.item.familia === familia);
  if (da.length) console.log(`${familia}: ${da.filter((r) => r.ok).length}/${da.length}`);
}
console.log(`gauntlet: ${resultados.length - reprovados.length}/${resultados.length} (capturas em ${path.relative(process.cwd(), OUT)})`);
process.exit(reprovados.length ? 1 : 0);
