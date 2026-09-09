#!/usr/bin/env node
/* Régua do encaixe Mint: equipar uma família autorada com o modelo de MUNDO ainda
 * não carregado NÃO pode deixar a mão segurando o vazio.
 *
 * Por que existe: a partida pré-carrega só as armas que sorteou (weapons.js:243) e
 * o resto chega em ocioso; `attachMintWeapon` escondia a arma do pack (vmweapon.js
 * hidePackGun) ANTES de saber se havia wrap Mint, e saía por `if (!wrap) return null`
 * com a família sem arma nenhuma — pelo resto da sessão. Medido em 07/09 no jogo
 * real: awp/shotgun/revolver38 com `arma 0/0` e a mão em quadro (luva vazia), e a
 * família que falha MUDA de partida para partida.
 *
 * A condição é forçada aqui (bloqueio do GLB) para a régua não depender de sorteio.
 *
 * Uso: node tools/eval/vm-attach-fallback-check.mjs [--porta=8167] [--arma=m4]
 *      [--caminho=autorado|legado] [--mutante=escondepack|forjawrap]
 *
 * Mutante `escondepack` reintroduz o ESTADO do defeito (esconde a arma do pack
 * depois do equip, como o hidePackGun incondicional fazia) — a régua tem de ficar
 * vermelha; se passar, ela e cega e sai 1 denunciando a si mesma.
 */
import process from 'node:process';
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const PORTA = arg('porta', '8157');
const ARMA = arg('arma', 'm4');
const MUT = arg('mutante', '');
const CAMINHO = arg('caminho', 'autorado');   // autorado | legado
const BASE = `http://127.0.0.1:${PORTA}`;

// Sobe o servidor como os irmaos do check:vm (authored-ads-check.mjs) — porta
// propria, para nao brigar com bancada de lane que ja esteja de pe.
let srv = null;
if (!(await fetch(BASE).then((r) => r.ok).catch(() => false))) {
  srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
  process.on('exit', () => srv?.kill());
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
    await new Promise((r) => setTimeout(r, 500));
  }
}
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

let bloqueados = 0;
// Bloqueia o modelo de MUNDO da arma alvo: reproduz "o GLB ainda não chegou".
await page.route('**/models/weapons/**', (rota) => {
  const url = rota.request().url();
  /* No legado o `rw` e montado UMA vez, no boot: para a condicao nao depender do
     sorteio da partida, deixa passar so a awp (a substituta) e bloqueia o resto. */
  const passa = CAMINHO === 'legado' ? /\/awp\.glb/.test(url) : !new RegExp(`/${ARMA}\\.glb`).test(url);
  if (passa) return rota.continue();
  bloqueados += 1;
  return rota.abort();
});

let saida = 0;
try {
  await page.goto(`${BASE}/?debug=1&auto=E&map=piscina_treta&armaslazy=0&vmready=ar,ak,lmg,sniper,shotgun,revolver,mp5,pistol`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  if (CAMINHO === 'legado') {
    /* No legado o `rw` de TODAS as armas e montado uma unica vez, no boot. Com so a
       awp liberada, toda arma que ganhar `rw` ganhou a malha DELA — a substituicao.
       A awp EM CACHE e a pre-condicao: sem ela a substituicao nao teria do que se
       servir, e a rodada sai INCONCLUSIVA em vez de verde mentiroso. */
    let r = null;
    for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
      r = await page.evaluate(async ({ arma, mut }) => {
        /* Pre-condicao: a awp precisa estar EM CACHE para a substituicao ter do que se
           servir. Depois do BUG-76 ela pode chegar tarde, entao espera-se o cache. */
        const mod = await import('/js/weapons.js');
        for (let t = 0; t < 40 && !mod.hasWeapon('awp'); t += 1) await new Promise((res) => setTimeout(res, 500));
        window.__game._switchWeapon(arma);
        if (mut === 'montaalheia') {   // reintroduz o estado: monta `rw` alheio na arma
          const g = window.__game.vm?.models?.[arma];
          if (g && !g.getObjectByName('rw')) { const f = new (g.constructor)(); f.name = 'rw'; g.add(f); }
        }
        await new Promise((res) => setTimeout(res, 1200));
        const models = window.__game.vm?.models || {};
        const comRw = Object.keys(models).filter((id) => models[id]?.getObjectByName?.('rw'));
        const rwAlvo = models[arma]?.getObjectByName?.('rw');
        const malhas = [];
        rwAlvo?.traverse?.((c) => { if (c.isMesh) malhas.push(c.name || '?'); });
        return { awpEmCache: mod.hasWeapon('awp'), awpTemRw: comRw.includes('awp'), substituidas: comRw.filter((id) => id !== 'awp'), malhasAlvo: malhas.slice(0, 6) };
      }, { arma: ARMA, mut: MUT });
      if (r.awpEmCache) break;
      if (tentativa < 4) { await page.reload({ waitUntil: 'load', timeout: 180000 }); await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 }); await page.waitForTimeout(2500); }
    }
    console.log(`[legado] alvo=${ARMA} bloqueios=${bloqueados} awpEmCache=${r.awpEmCache} awpTemRw=${r.awpTemRw} substituidas=[${r.substituidas.join(',')}] malhasAlvo=[${r.malhasAlvo.join(',')}]`);
    if (!r.awpEmCache) {
      console.error('INCONCLUSIVO: a awp nao entrou em cache — sem ela a substituicao nao teria do que se servir');
      saida = 2;
    } else if (r.substituidas.length) {
      if (MUT) { console.log(`mutante '${MUT}' reprovado como devia: ${r.substituidas.join(', ')}`); saida = 0; }
      else { console.log(`VERMELHO: ${r.substituidas.length} arma(s) montaram a malha da awp no viewmodel legado: ${r.substituidas.join(', ')}`); saida = 1; }
    } else if (MUT) {
      console.error(`RÉGUA CEGA: mutante '${MUT}' PASSOU — a cláusula não morde`);
      saida = 1;
    } else {
      console.log('VERDE: com so a awp carregada, nenhuma outra arma montou malha alheia');
    }
    await browser.close().catch(() => {});
    srv?.kill();
    process.exit(saida);
  }
  const m = await page.evaluate(async ({ arma, mut }) => {
    window.__game._switchWeapon(arma);
    await new Promise((r) => setTimeout(r, 2000));
    const e = window.__authoredVm.entry(arma);
    if (!e) return { erro: 'sem entry autorada' };
    if (mut === 'escondepack') for (const x of e.weaponMeshes || []) x.visible = false;
    if (mut === 'forjawrap') { e.mint = e.mint || { wraps: new Map() }; e.mint.weaponId = arma; e.mint.active = { name: `mint_weapon_${arma}`, visible: true, traverse(f) { f({ isMesh: true, visible: true, name: 'sniper_1' }); } }; }
    const packVisiveis = (e.weaponMeshes || []).filter((x) => x.visible).length;
    const packTotal = (e.weaponMeshes || []).length;
    let mintMalhas = 0;
    const nomesMint = [];
    e.mint?.active?.traverse?.((c) => { if (c.isMesh && c.visible) { mintMalhas += 1; nomesMint.push(c.name || '?'); } });
    return { packVisiveis, packTotal, mintAtivo: e.mint?.active?.name || null, mintMalhas, nomesMint: nomesMint.slice(0, 6) };
  }, { arma: ARMA, mut: MUT });
  if (m.erro) { console.error(`ERRO: ${m.erro}`); process.exit(2); }
  const desenha = m.mintMalhas > 0 || m.packVisiveis > 0;
  /* Segunda clausula: com o GLB da arma pedida bloqueado, NAO pode existir wrap
     Mint — `weaponModel` cai na malha da awp e devolveria a sniper com o nome da
     arma pedida (medido: `mint_weapon_m92` com malha `sniper_1`). Sem malha
     propria, o certo e o pack. */
  const substituiu = m.mintMalhas > 0;
  const aceita = desenha && !substituiu;
  console.log(`arma=${ARMA} bloqueios=${bloqueados} pack=${m.packVisiveis}/${m.packTotal} mint=${m.mintAtivo || 'null'} (${m.mintMalhas} malhas)`);
  if (!aceita) {
    const porque = substituiu
      ? `wrap Mint de OUTRA arma no lugar (${m.nomesMint.join(',')}) — substituição silenciosa`
      : 'não desenha arma nenhuma — mão segurando o vazio';
    if (MUT) { console.log(`mutante '${MUT}' reprovado como devia: ${ARMA} ${porque}`); saida = 0; }
    else { console.log(`VERMELHO: com o modelo de mundo ausente, ${ARMA} ${porque}`); saida = 1; }
  } else if (MUT) {
    console.error(`RÉGUA CEGA: mutante '${MUT}' PASSOU — a cláusula não morde (desenha=${desenha})`);
    saida = 1;
  } else {
    console.log('VERDE: a família continua com arma em quadro mesmo sem o modelo de mundo');
  }
} catch (e) {
  console.error('FALHA:', String(e).slice(0, 300));
  saida = 2;
} finally {
  await browser.close().catch(() => {});
  srv?.kill();
}
process.exit(saida);
