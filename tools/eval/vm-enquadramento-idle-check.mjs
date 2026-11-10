#!/usr/bin/env node
/* ============================================================================
   vm-enquadramento-idle-check.mjs — A ARMA PARADA (FP idle) CABE NO QUADRO?
   ----------------------------------------------------------------------------
   Jogo real no navegador (?debug=1&auto=P,mst), pintura equipada pelo caminho do
   jogador (/api/treta com a skin no inventário), troca de arma, saque assentado,
   pitch 0. Mede cada arma × rota (padrão e pintura) × aspecto (16:9 e 3:2) com a
   régua de tools/eval/lib/vm-enquadramento.mjs (cláusulas e limiares lá).

   Rotas: `padrao` = as 26 armas sem pintura (fab#/gold#ak; o catálogo pago vem de
   /private-assets — sem ele a arma cai no legado e a célula sai NÃO MEDE);
   `pintura` = pistol/ak/m4/scar com uma pintura da loja (gold#, GLB versionado).

   Uso:
     node tools/eval/vm-enquadramento-idle-check.mjs                 (tudo, verdito)
     node tools/eval/vm-enquadramento-idle-check.mjs --assar         (+ grava o placar
          tools/eval/vm-enquadramento-idle.json que o CI confere: eval:vm-enquadramento-placar)
     --armas=pistol,m4  --rotas=pintura  --aspectos=16x9  --porta=8179  --fotos=<dir>
     --mutante=pistola-longe    pistola pintada com a lente 1,6× mais aberta ao vivo: menor e
                                fora do centro da sem pintura (P1/P2) — tem de REPROVAR
     --mutante=pistola-girada   pistola pintada girada 35° em volta da câmera: cano e centro
                                saem da referência (P1/P3)
     --mutante=fuzil-fora       gold#m4 girado 30° em volta da câmera: a frente sai pela direita (E2)
   Pintada × referência (P1 centro, P2 área ±20%, P3 eixo ≤ 15°): lib/vm-enquadramento.mjs.
   Saída ≠ 0: célula VERMELHA/NÃO MEDE (sem mutante) ou mutante que não reprovou.
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ASPECTOS, ENTRADAS, LIMIARES, MASCARA_SOBRE, PINTADAS, PLACAR_ARQ, REDUCAO, REFERENCIA_DA_PINTURA, SOBRE, comparar, hashDasEntradas, julgar, medir } from './lib/vm-enquadramento.mjs';

const ROOT = process.cwd();
const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes(`--${n}`);
const { WEAPON_IDS } = await import(pathToFileURL(path.join(ROOT, 'public/js/weapons.js')).href);
const { TRETA_WEAPON_SKINS = [], TRETA_PACKS = [] } = await import(pathToFileURL(path.join(ROOT, 'public/js/treta-catalog.js')).href);

const MUTANTES = {   // aplicados só na célula alvo (arma + rota); a referência é medida intacta
  'pistola-longe': { arma: 'pistol', rota: 'pintura', aplicar: (e) => { e.cameraFov *= 1.6; } },
  'pistola-girada': { arma: 'pistol', rota: 'pintura', aplicar: (e) => { const r = e.frame.rotDeg || [0, 0, 0]; e.frame = { ...e.frame, rotDeg: [r[0], r[1] + 35, r[2]] }; } },
  // O pacote está no espaço da câmera: girar o mount em volta dela empurra o fuzil para a direita.
  'fuzil-fora': { arma: 'm4', rota: 'pintura', aplicar: (e) => { const r = e.frame.rotDeg || [0, 0, 0]; e.frame = { ...e.frame, rotDeg: [r[0], r[1] - 30, r[2]] }; } },
};

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const MUT_NOME = arg('mutante');
  const MUT = MUT_NOME ? MUTANTES[MUT_NOME] : null;
  if (MUT_NOME && !MUT) throw new Error(`mutante desconhecido: ${MUT_NOME} (há: ${Object.keys(MUTANTES).join(', ')})`);
  if (MUT && flag('assar')) throw new Error('--assar não aceita mutante');
  const aspectos = arg('aspectos', Object.keys(ASPECTOS).join(',')).split(',');
  for (const a of aspectos) if (!ASPECTOS[a]) throw new Error(`aspecto desconhecido: ${a}`);
  // O mutante mede também a referência sem pintura (a comparação P1–P3 precisa dela).
  const rotas = MUT ? ['padrao', 'pintura'] : arg('rotas', 'padrao,pintura').split(',');
  const filtro = MUT ? [MUT.arma, REFERENCIA_DA_PINTURA[MUT.arma]] : (arg('armas') ? arg('armas').split(',') : null);
  const pinturaDe = (arma) => {
    const p = TRETA_WEAPON_SKINS.find((s) => s.weapon === arma);
    if (p) return { ...p, slot: 'weapon' };
    const pack = TRETA_PACKS.find((k) => k.weaponSkins?.[arma]);
    return pack ? { id: pack.id, name: pack.name, slot: 'pack', weapon: null, price: pack.price, skin: pack.weaponSkins[arma] } : null;
  };
  const celulas = [];
  for (const rota of rotas) {
    const armas = (rota === 'pintura' ? PINTADAS : WEAPON_IDS).filter((a) => !filtro || filtro.includes(a));
    for (const arma of armas) celulas.push({ rota, arma, pintura: rota === 'pintura' ? pinturaDe(arma) : null });
  }
  for (const c of celulas) if (c.rota === 'pintura' && !c.pintura) throw new Error(`${c.arma}: nenhuma pintura da loja para a rota pintura`);

  const PORTA = arg('porta', '8179');
  const base = `http://127.0.0.1:${PORTA}`;
  const srv = spawn(process.execPath, ['tools/eval/serve.mjs', PORTA], { cwd: ROOT, stdio: 'ignore' });
  process.on('exit', () => srv.kill());
  let up = false;
  for (let i = 0; i < 240 && !up; i++) { try { up = (await fetch(base)).ok; } catch { /* subindo */ } if (!up) await new Promise((r) => setTimeout(r, 250)); }
  if (!up) throw new Error(`servidor de eval não subiu na porta ${PORTA}`);
  const pw = await import(pathToFileURL(`${execSync('npm root -g').toString().trim()}/playwright/index.js`).href);
  const chromium = pw.chromium || pw.default.chromium;
  const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chrome = process.env.CHROME_BIN || (process.platform === 'darwin' && fs.existsSync(MAC_CHROME) ? MAC_CHROME : '');
  const browser = await chromium.launch(chrome
    ? { executablePath: chrome, args: ['--headless=new', '--mute-audio', '--use-angle=metal', '--enable-gpu'] }
    : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const FOTOS = arg('fotos') ? path.resolve(arg('fotos')) : '';
  if (FOTOS) fs.mkdirSync(FOTOS, { recursive: true });

  const fixture = (pinturas) => ({
    authenticated: true,
    campaign: { starts_at: '2026-01-01T00:00:00Z', ends_at: '2099-01-01T00:00:00Z', email_reward: 50, referral_reward: 100, referral_cap: 3, sp_reward: 10, mp_reward: 20, daily_match_cap: 60 },
    quests: { email: 0, referral: 1, singleplayer: 2, multiplayer: 0 },
    wallet: { balance: 9000, referral_code: '00000000-0000-4000-8000-000000000001' },
    inventory: pinturas.map((p) => ({ skin_id: p.id, equipped: true })),
    catalog: pinturas.map((p) => ({ id: p.id, name: p.name, character_id: null, available: true, slot: p.slot, weapon_id: p.weapon, price: p.price, model_path: p.model })),
  });

  const resultados = [];
  try {
    for (const aspecto of aspectos) {
      const [width, height] = ASPECTOS[aspecto];
      for (const rota of rotas) {
        const doGrupo = celulas.filter((c) => c.rota === rota);
        if (!doGrupo.length) continue;
        const ctx = await browser.newContext({ viewport: { width, height } });
        const page = await ctx.newPage();
        const erros = [];
        page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
        await page.route('**/api/treta**', (r) => r.fulfill({ json: fixture(doGrupo.map((c) => c.pintura).filter(Boolean)) }));
        await page.addInitScript(() => {
          localStorage.setItem('cs_treta_intro', 'v1');
          localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false, allyBots: 0, enemyBots: 0, bots: 0, quality: 'high', camView: 'first' }));
        });
        await page.goto(`${base}/?${new URLSearchParams({ debug: '1', auto: 'P,mst', map: 'praca_poderes', armaslazy: '0' })}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
        await page.waitForFunction(() => window.__game?.state === 'live' && window.__game.player?.alive, null, { timeout: 240000 });
        for (const c of doGrupo) {
          const pintada = rota === 'pintura';
          const pronto = ({ w, skinId }) => {
            const g = window.__game;
            if (g.player.weapon !== w) return false;
            if (w === 'knife') return Boolean(g.vm.melee?.active && g.vm.melee.scene);
            const e = g.vm.authored?.entry?.(w);
            // Pintada = alguma peça da arma carrega ESTA pintura (a rota pode ser gold# ou fab#).
            let pintada = false;
            e?.mount?.traverse((o) => { if (o.userData?.weaponSkin === skinId) pintada = true; });
            return Boolean(e && g.vm.authored.active(w) && e.mount?.visible && (!skinId || pintada));
          };
          const skinId = pintada ? c.pintura?.skin || c.pintura?.id || null : null;
          let ok = false;
          for (let k = 0; k < 6 && !ok; k++) {
            await page.evaluate((w) => {
              const g = window.__game;
              g.player.hp = 100; g.timeLeft = 600;
              for (const b of g.bots || []) { b.nextShotAt = Infinity; b.target = null; }
              if (g.player.weapon !== w) g._switchWeapon(w);
              g.player.drawUntil = 0;
            }, c.arma);
            await page.waitForFunction(pronto, { w: c.arma, skinId }, { timeout: 30000 }).catch(() => {});
            await page.waitForTimeout(1200);
            // Saque terminado e máquina autorada em idle (arco de draw fora do quadro medido).
            await page.waitForFunction((w) => { const g = window.__game; const a = g.vm.authored; return g.time > g.player.drawUntil + 0.6 && (w === 'knife' || !a?.active?.(w) || a.state(w) === 'idle'); }, c.arma, { timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(500);
            ok = await page.evaluate(pronto, { w: c.arma, skinId });
          }
          const linha = { aspecto, rota, arma: c.arma, pintura: c.pintura?.id || null };
          if (!ok) {
            resultados.push({ ...linha, estado: 'NAO_MEDE', msg: 'viewmodel autorado não ficou ativo (catálogo pago ausente?)' });
            console.log(`… ${aspecto} ${rota} ${c.arma}: NÃO MEDE (viewmodel autorado não ativou)`);
            continue;
          }
          if (MUT && c.arma === MUT.arma && rota === MUT.rota) {
            await page.evaluate(({ w, src }) => {
              const e = window.__game.vm.authored.entry(w);
              // eslint-disable-next-line no-new-func
              new Function('e', src)(e);
            }, { w: c.arma, src: `(${MUT.aplicar.toString()})(e);` });
          }
          await page.evaluate(() => { window.__game.player.pitch = 0; });
          await page.evaluate(() => new Promise((res) => { let n = 6; const f = () => (n-- <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
          if (FOTOS) await page.screenshot({ path: path.join(FOTOS, `${c.arma}-${rota}-${aspecto}${MUT ? `-${MUT_NOME}` : ''}.png`) });
          const m = await page.evaluate(MASCARA_SOBRE, { S: SOBRE, ds: REDUCAO });
          if (m.erro) { resultados.push({ ...linha, estado: 'NAO_MEDE', msg: m.erro }); continue; }
          const medida = medir(m);
          const juizo = julgar(c.arma, medida);
          resultados.push({ ...linha, chave: m.chave, vmFov: m.vmFov, medida, ...juizo });
          const ruins = juizo.clausulas.filter((x) => !x.ok).map((x) => `${x.id} ${x.msg}`);
          console.log(`… ${aspecto} ${rota} ${c.arma} [${m.chave}] ${juizo.estado}${ruins.length ? ` — ${ruins.join('; ')}` : ''}`);
        }
        if (erros.length) console.log(`erros de página (${aspecto}/${rota}): ${erros.slice(0, 3).join(' | ')}`);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    srv.kill();
  }

  // Pintada × referência sem pintura no mesmo aspecto (o mutante só mexe na célula pintada).
  for (const r of resultados) {
    if (r.rota !== 'pintura' || !r.clausulas) continue;
    const ref = resultados.find((x) => x.rota === 'padrao' && x.aspecto === r.aspecto && x.arma === REFERENCIA_DA_PINTURA[r.arma]);
    const pares = comparar(r.medida, ref?.medida);
    r.clausulas.push(...pares);
    if (pares.some((x) => !x.ok)) {
      r.estado = 'VERMELHO';
      console.log(`… ${r.aspecto} pintura ${r.arma} × padrão ${REFERENCIA_DA_PINTURA[r.arma]}: ${pares.filter((x) => !x.ok).map((x) => `${x.id} ${x.msg}`).join('; ')}`);
    }
  }
  let falhou = false;
  if (MUT) {
    const alvo = resultados.filter((r) => r.arma === MUT.arma && r.rota === MUT.rota);
    const mordeu = alvo.length === aspectos.length && alvo.every((r) => r.estado === 'VERMELHO');
    console.log(`MUTANTE ${MUT_NOME} ${mordeu ? 'MORDEU' : 'NÃO MORDEU'}: ${alvo.map((r) => `${r.aspecto}=${r.estado}`).join(' ')}`);
    falhou = !mordeu;
  } else {
    const ruins = resultados.filter((r) => r.estado !== 'VERDE');
    for (const r of ruins) console.log(`FALHA ${r.aspecto}/${r.rota}/${r.arma} ${r.estado} ${r.msg || r.clausulas.filter((x) => !x.ok).map((x) => `${x.id} ${x.msg}`).join('; ')}`);
    falhou = ruins.length > 0;
    console.log(`${falhou ? '✗' : '✓'} VM-ENQUADRAMENTO-IDLE: ${resultados.length - ruins.length}/${resultados.length} células verdes (${aspectos.join(', ')})`);
    if (flag('assar')) {
      if (filtro || rotas.length !== 2 || aspectos.length !== Object.keys(ASPECTOS).length) throw new Error('--assar mede tudo: sem --armas/--rotas/--aspectos');
      const placar = {
        o_que_e: 'Placar do FP parado (idle) medido no navegador por tools/eval/vm-enquadramento-idle-check.mjs --assar; o CI confere com eval:vm-enquadramento-placar.',
        hash: hashDasEntradas(), entradas: ENTRADAS, limiares: LIMIARES, medido: new Date().toISOString().slice(0, 10),
        celulas: resultados.map(({ aspecto, rota, arma, pintura, chave, vmFov, medida, estado, msg }) => ({ aspecto, rota, arma, pintura, chave, vmFov, medida, estado, ...(msg ? { msg } : {}) })),
      };
      // Uma célula por linha: o placar inteiro cabe num diff legível.
      const { celulas, ...cabeca } = placar;
      const corpo = JSON.stringify(cabeca, null, 1).replace(/\n}$/, '');
      fs.writeFileSync(path.join(ROOT, PLACAR_ARQ), `${corpo},\n "celulas": [\n${celulas.map((c) => `  ${JSON.stringify(c)}`).join(',\n')}\n ]\n}\n`);
      console.log(`placar gravado em ${PLACAR_ARQ} (hash ${placar.hash})`);
    }
  }
  process.exit(falhou ? 1 : 0);
}
