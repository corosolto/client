#!/usr/bin/env node
/* ============================================================================
   vm-carregador-repete.mjs — A AMOSTRA DO eval:vm-carregador NÃO PODE DEPENDER
   DO RELÓGIO DE PAREDE (fila R1 da integração K)
   ----------------------------------------------------------------------------
   POR QUE EXISTE: na integração K (23/09) o eval:vm-carregador oscilou sem
   nenhuma mudança de produto — pistol vermelha na tática 57% em 1 de 3 medidas
   isoladas (0,88 palma), shotgun vermelha na vazia 23% "conforme a ordem da
   sessão". Os ossos saíam idênticos em toda repetição (relógio segurado, passos
   de 1/60 s); o que variava era a MEDIDA: SkinnedMesh.applyBoneTransform usa
   `bindMatrixInverse`, que o three r160 só recalcula no render
   (SkinnedMesh.updateMatrixWorld). Se o jogo desenhava entre o passo e a medida
   a amostra saía certa, se não saía a do passo anterior. Sob carga (load ~40)
   quase nunca desenhava. Medido aqui antes do conserto, pistol tática 57%:
   0,88 palma sem quadro × 0,17 com quadro.
   Conserto: vm-palco.mjs `__palcoPoseFresca` (updateMatrixWorld da cena antes
   de toda medida de vértice skinned). Nenhum teto mudou.

   A régua: mede o carregador DUAS vezes por arma — uma medindo logo depois do
   passo, outra esperando o jogo desenhar entre o passo e a medida — e exige a
   MESMA sequência de estados e as mesmas distâncias (tolerância 0,01 palma).
   Render não muda pose segurada; se mudar a medida, a medida lê estado velho.

   Uso:
     node tools/eval/vm-carregador-repete.mjs [--armas=pistol,shotgun] [--porta=8173]
     node tools/eval/vm-carregador-repete.mjs --mutantes   (pose-velha tem de REPROVAR)
   Padrão: as armas de malha skinned no carregador (pistol, shotgun, deagle, svd)
   + m4 como controle rígido.
   ============================================================================ */
import * as P from './lib/vm-palco.mjs';
import { coletar, JUIZ } from './lib/vm-reguas.mjs';

const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const MUTANTES = process.argv.includes('--mutantes');
const armas = (arg('armas') || 'pistol,shotgun,deagle,svd,m4').split(',');
const TOL = 0.01;

const srv = await P.subirServidor(arg('porta', '8173'));
const browser = await P.abrirNavegador();
const falhas = [];
try {
  const { page } = await P.abrirJogo(browser, srv.base, arg('aspecto', '3x2'));
  const rodar = async (arma, rotulo) => {
    const a = await coletar(page, arma, { reguas: ['carregador'] });
    const b = await coletar(page, arma, { reguas: ['carregador'], quadroEntre: true });
    const ka = a.carregador; const kb = b.carregador;
    if (!ka || !kb || ka.erro || kb.erro) return { ok: false, msg: `NÃO MEDE: ${ka?.erro || kb?.erro || 'sem coleta'}` };
    const va = JUIZ.carregador(a); const vb = JUIZ.carregador(b);
    const dif = [];
    let maxD = 0;
    ka.amostras.forEach((x, i) => {
      const y = kb.amostras[i];
      const pc = `${x.tipo} ${Math.round(x.f * 100)}%`;
      if (!y || x.estado !== y.estado) dif.push(`${pc}: ${x.estado} sem quadro × ${y?.estado} com quadro`);
      for (const k of ['dMao', 'dArma']) {
        if (!Number.isFinite(x[k]) || !Number.isFinite(y?.[k])) continue;
        const d = Math.abs(x[k] - y[k]);
        maxD = Math.max(maxD, d);
        if (d > TOL) dif.push(`${pc}: ${k} ${x[k].toFixed(2)} sem quadro × ${y[k].toFixed(2)} com quadro`);
      }
    });
    const txt = `${rotulo}: veredito ${va.estado}/${vb.estado}, maior diferença ${maxD.toFixed(3)} palma em ${ka.amostras.length} amostras`;
    return { ok: !dif.length && va.estado === vb.estado, msg: dif.length ? `${txt} — ${[...new Set(dif)].slice(0, 4).join('; ')}` : txt };
  };
  for (const arma of armas) {
    const r = await rodar(arma, arma);
    console.log(`${r.ok ? 'PASSA' : 'FALHA'} repete/${arma} ${r.msg}`);
    if (!r.ok) falhas.push(arma);
  }
  if (MUTANTES) {
    // pose-velha: devolve o estado de antes do conserto (só updateWorldMatrix, o
    // bindMatrixInverse fica o do último quadro). Tem de reprovar na pistol.
    await page.evaluate(() => { window.__palcoPoseVelha = true; });
    const r = await rodar('pistol', 'mutante pose-velha/pistol');
    await page.evaluate(() => { window.__palcoPoseVelha = false; });
    if (r.ok) { console.log(`MUTANTE pose-velha NÃO MORDEU — ${r.msg}`); falhas.push('mutante pose-velha'); }
    else console.log(`MUTANTE pose-velha MORDEU — ${r.msg}`);
  }
} finally {
  await browser.close();
  srv.kill();
}
console.log(`vm-carregador-repete: ${armas.length} arma(s) · ${falhas.length} falha(s)${falhas.length ? ` (${falhas.join(', ')}) — a amostra depende de o jogo ter desenhado; confira __palcoPoseFresca em vm-palco.mjs` : ''}`);
process.exit(falhas.length ? 1 : 0);
