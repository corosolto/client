#!/usr/bin/env node
/* ============================================================================
   vm-recarga-probe.mjs — O OSSO DO PENTE ANDA NA RECARGA? MEDIDO EM CENTÍMETROS.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Em 11/09 esta frente concluiu, do vídeo, que "a AK golden não anima a recarga".
   A conclusão estava ERRADA, e o erro é instrutivo: o RMS entre quadros do vídeo
   dava 0,03 no fim, e isso foi lido como imagem congelada. Mas o SwiftShader roda
   este jogo a **~0,3 FPS** enquanto o Playwright grava a 30 — o mesmo quadro do
   jogo se repete dezenas de vezes no arquivo. A série medida tinha a assinatura
   clássica disso: trechos longos achatados com saltos ocasionais (0,1 · 0,5 · 0,2
   · **15,7** · 6,0 · 0,1). Contar pixel de vídeo mede a taxa do renderizador, não
   o movimento da peça.

   É a lei 7 da `bug-hunt` — *"cuidado com o arnês: o defeito pode ser da
   medição"* — cobrada de quem a tinha acabado de citar.

   O DOMÍNIO CERTO
   A pergunta é física: *o osso do carregador se desloca enquanto a recarga toca?*
   Isso se responde em **espaço de mundo, em centímetros**, amostrando o bone pelo
   próprio Three.js da página — não em pixels, que dependem de quanto a arma ocupa
   a tela e da taxa de quadros do software rasterizer. Mesmo princípio já pago em
   `vm-arsenal-frames.mjs:119`.

   O QUE ELA NÃO MEDE, DE PROPÓSITO
   Não julga se a coreografia é adequada à arma (uma UZI com o arco da AK passa
   aqui e está errada — ver `docs/VIEWMODELS.md`), não julga anatomia, não julga
   enquadramento. Ela responde UMA pergunta: a peça anda, e quanto.

   USO
     node tools/eval/vm-recarga-probe.mjs --arma=ak --porta=4361
     node tools/eval/vm-recarga-probe.mjs --armas=ak,m4,uzi --porta=4361 --json
   ========================================================================== */

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;
const PORTA = arg('porta', '4361');
const BASE = `http://127.0.0.1:${PORTA}`;
const ARMAS = (arg('armas') || arg('arma', 'ak')).split(',').filter(Boolean);
const JSON_OUT = process.argv.includes('--json');
const MUTANTE = arg('mutante');

/* Piso: a AK aprovada tem 71,7 cm de curso no `Mag_metarig` dentro do clipe
   `Reload` (medido no GLB em 11/09). Uma peça que anda menos de 5 cm na tela não
   lê como carregador saindo — é ruído de pose. */
const PISO_CM = 5;

/* MUTANTES (lei 2: régua que não pode falhar não mede nada)

   `semtecla`  — não aperta R. Se continuar verde, ela está medindo balanço de
                 idle e não a recarga.
   `semgasto`  — não gasta munição antes. É o defeito REAL que esta sonda teve
                 na primeira execução de 11/09: o jogo recusa recarregar pente
                 cheio, o estado fica `idle` e a medida vira 0 cm. O mutante
                 existe para que ninguém "conserte" a sonda removendo os tiros.

     node tools/eval/vm-recarga-probe.mjs --arma=ak --mutante=semtecla   # espera VERMELHO
     node tools/eval/vm-recarga-probe.mjs --arma=ak --mutante=semgasto   # espera VERMELHO */

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'],
});

const resultados = [];

for (const arma of ARMAS) {
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  try {
    await page.goto(`${BASE}/?debug=1&auto=E&vmweapon=${arma}&map=brasilia&armaslazy=0`,
      { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForFunction((w) => Boolean(window.__authoredVm?.entry?.(w)?.scene), arma, { timeout: 120000 });

    const medido = await page.evaluate(async ([nome, mutante]) => {
      const vm = window.__authoredVm;
      const entry = vm.entry(nome);
      const ossos = [];
      entry.scene.traverse((o) => { if (/^mag/i.test(o.name || '')) ossos.push(o); });
      if (!ossos.length) return { erro: 'nenhum osso de pente no GLB servido' };

      const amostra = () => ossos.map((o) => {
        const v = new (o.position.constructor)();
        o.getWorldPosition(v);
        return { nome: o.name, x: v.x, y: v.y, z: v.z };
      });

      const clipes = [...entry.clips.keys()];

      // Gasta munição ANTES: o jogo recusa recarregar pente cheio, e sem isto a
      // sonda mede a recusa em vez da recarga (medido em 11/09: estado ficou idle).
      const municao = () => window.__game?.player?.ammo?.mag ?? null;
      const municaoInicial = municao();
      for (let i = 0; i < (mutante === 'semgasto' ? 0 : 4); i += 1) {
        document.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
        await new Promise((r) => setTimeout(r, 60));
        document.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
        await new Promise((r) => setTimeout(r, 260));
      }
      const municaoPosTiro = municao();

      const antes = amostra();
      const serie = [];

      // Dispara pelo caminho do JOGADOR, não chamando reload() direto: o defeito
      // pode estar entre a tecla e o viewmodel, e chamar direto o esconderia.
      if (mutante !== 'semtecla') {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR', bubbles: true }));
      }

      const t0 = performance.now();
      while (performance.now() - t0 < 4000) {
        await new Promise((r) => setTimeout(r, 40));
        serie.push({ t: +(performance.now() - t0).toFixed(0), pos: amostra(), estado: entry.state });
      }

      let maxCm = 0;
      let quemMax = '';
      for (const passo of serie) {
        passo.pos.forEach((p, i) => {
          const a = antes[i];
          const d = Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z) * 100;
          if (d > maxCm) { maxCm = d; quemMax = p.nome; }
        });
      }
      return {
        ossos: ossos.map((o) => o.name),
        clipes,
        estados: [...new Set(serie.map((s) => s.estado))],
        amostras: serie.length,
        maxCm: +maxCm.toFixed(2),
        quemMax,
        acaoTocando: entry.action?.getClip?.()?.name || null,
        municaoInicial, municaoPosTiro, municaoFinal: municao(),
      };
    }, [arma, MUTANTE]);

    resultados.push({ arma, ...medido });
  } catch (e) {
    resultados.push({ arma, erro: String(e).slice(0, 120) });
  } finally {
    await page.close();
  }
}

await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify({ piso_cm: PISO_CM, resultados }, null, 2));
} else {
  console.log(`\n  CURSO DO OSSO DO PENTE NA RECARGA (piso ${PISO_CM} cm)${MUTANTE ? ` · MUTANTE ${MUTANTE}` : ''}\n`);
  for (const r of resultados) {
    if (r.erro) { console.log(`  ✗ ${r.arma.padEnd(10)} ${r.erro}`); continue; }
    const ok = r.maxCm >= PISO_CM;
    console.log(`  ${ok ? '✓' : '✗'} ${r.arma.padEnd(10)} ${String(r.maxCm).padStart(7)} cm  ${(r.quemMax || '').padEnd(18)} estados: ${r.estados.join('→')}`);
    console.log(`    clipes: ${r.clipes.join(', ')} · ação: ${r.acaoTocando || '(nenhuma)'} · munição ${r.municaoInicial}→${r.municaoPosTiro}→${r.municaoFinal} · ${r.amostras} amostras`);
  }
  console.log('');
}

const falhas = resultados.filter((r) => r.erro || (r.maxCm ?? 0) < PISO_CM);
process.exit(falhas.length ? 1 : 0);
