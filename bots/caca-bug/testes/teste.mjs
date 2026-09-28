/* Teste offline do caca-bug: parser, transições, rename, KNOWN-BUGS e persona. */
import { parseRodada, comparar, aplicarNoKnownBugs, corpoIssue, corpoResolucao, entradaKnownBugs } from '../fiscal.mjs';
import { carregarPersona } from '../../lib/persona.mjs';

const RODADA_OK = `
=============== INVARIANTES — CORO SOLTO ===============

✓ PASSA   VM1  viewmodel encaixa no frame
✗ FALHA   VM9  pitch da arma acompanha a mira
✓ PASSA   TEX1 superfícies claras sem albedo
≈ DÍVIDA   CHR1 personagens com sombra
·· PULADO  MAP9 spawn dentro de geometria

--------------------------------------------------------
CRÍTICAS: 39/52 passam  ← VM9 VERMELHAS
DÍVIDAS:  CHR1 (KNOWN-RED.json)
AVISOS:   nenhum
PULADAS:  1 (exigem browser ou arnês ausente)
`;

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);

  /* ── parser ── */
  const rodada = parseRodada(RODADA_OK);
  t.igual(rodada.resultados.length, 5, 'parser conta os 5 resultados');
  t.igual(rodada.resultados.find((r) => r.id === 'CHR1')?.estado, 'divida', 'DÍVIDA reconhecida');
  t.igual(rodada.resultados.find((r) => r.id === 'MAP9')?.estado, 'pulado', 'PULADO reconhecido');
  t.contem(rodada.resumo, 'CRÍTICAS', 'resumo capturado');
  let ruidosa = false;
  try { parseRodada('formato que mudou completamente\nsem nada conhecido'); } catch { ruidosa = true; }
  t.ok(ruidosa, 'formato desconhecido → falha ruidosa (não escreve nada)');

  /* ── transições ── */
  const antes = parseRodada(RODADA_OK);
  const depois = parseRodada(RODADA_OK
    .replace('✓ PASSA   VM1  viewmodel encaixa no frame', '✗ FALHA   VM1  viewmodel encaixa no frame')
    .replace('✗ FALHA   VM9  pitch da arma acompanha a mira', '✓ PASSA   VM9  pitch da arma acompanha a mira')
    .replace('✓ PASSA   TEX1 superfícies claras sem albedo', '✗ FALHA   TEX1 superfícies claras sem albedo'));
  const diff = comparar(antes, depois);
  t.igual(diff.vermelhasNovas.length, 2, 'duas vermelhas novas (VM1, TEX1)');
  t.ok(diff.vermelhasNovas.some((v) => v.id === 'VM1') && diff.vermelhasNovas.some((v) => v.id === 'TEX1'), 'ids das vermelhas novas');
  t.igual(diff.resolvidas.length, 1, 'VM9 resolvida');
  t.igual(diff.resolvidas[0].id, 'VM9', 'id da resolvida');

  /* ── rename por descrição parecida (VM5→VM9 da vida real) ── */
  const rAntes = parseRodada('✓ PASSA   VM5  coice do viewmodel dentro do teto\nCRÍTICAS: 1/1 passam');
  const rDepois = parseRodada('✓ PASSA   VM9  coice do viewmodel dentro do teto\nCRÍTICAS: 1/1 passam');
  const ren = comparar(rAntes, rDepois);
  t.igual(ren.renames.length, 1, 'rename detectado');
  t.ok(ren.renames[0]?.de === 'VM5' && ren.renames[0]?.para === 'VM9', 'VM5→VM9 mapeados');
  const renVermelho = parseRodada('✗ FALHA   VM9  coice do viewmodel dentro do teto\nCRÍTICAS: 0/1 passam');
  const diffRen = comparar(rAntes, renVermelho);
  t.igual(diffRen.vermelhasNovas.length, 1, 'rename COM piora de estado é vermelha nova (não se silencia)');
  const renIgual = parseRodada('≈ DÍVIDA   VM5  coice do viewmodel dentro do teto\nCRÍTICAS: 1/1 passam');
  const renIgual2 = parseRodada('≈ DÍVIDA   VM9  coice do viewmodel dentro do teto\nCRÍTICAS: 1/1 passam');
  t.igual(comparar(renIgual, renIgual2).vermelhasNovas.length, 0, 'rename com MESMO estado não vira vermelha nova');

  /* ── KNOWN-BUGS: entrada seca, riscado de resolvida ── */
  const kb = `# KNOWN-BUGS\n\n## P1 — o jogador vê\n\n### BUG-77 · outra coisa\n\n**Sintoma:** x.\n\n## Relatados, ainda não reproduzidos\n\n### INVAR-VM9 · pitch da arma acompanha a mira\n\n**Sintoma (régua):** vermelha.\n`;
  const kb2 = aplicarNoKnownBugs(kb, { vermelhasNovas: diff.vermelhasNovas, resolvidas: diff.resolvidas, renomesPara: new Map() });
  t.contem(kb2, '### INVAR-VM1 ·', 'entrada nova para VM1 no gabarito');
  t.contem(kb2, '### INVAR-TEX1 ·', 'entrada nova para TEX1');
  t.ok(/~~### INVAR-VM9[^#]*~~ · RESOLVIDO|### ~~INVAR-VM9/.test(kb2) || /RESOLVIDO[^\n]*\n/.test(kb2.split('INVAR-VM9')[1] || ''), 'VM9 riscada como RESOLVIDA');
  t.ok(!kb2.includes('Proerd') && !kb2.includes(persona.nome), 'entrada do KNOWN-BUGS SEM persona');

  /* ── issue/comentário COM persona ── */
  const issue = corpoIssue({ id: 'VM1', desc: 'viewmodel encaixa no frame', estado: 'vermelha', era: 'verde' }, 'CRÍTICAS: 1/2');
  t.contem(issue, `**${persona.nome}**`, 'issue abre com cartão da persona');
  t.ok(/^\| invariante\s*\|\s*antes\s*\|\s*agora\s*\|$/m.test(issue), 'issue traz tabela da transição (pad alinhado)');
  t.ok(/^\| VM1\s*\|\s*VERDE\s*\|\s*VERMELHA\s*\|$/m.test(issue), 'linha da transição na tabela');
  t.ok(persona.bordoes.some((b) => issue.includes(`— *${b}`)), 'issue fecha com bordão do elenco');
  const resol = corpoResolucao({ id: 'VM9', desc: 'pitch' });
  t.contem(resol, '**Proerd**', 'comentário de resolução com persona');
  t.contem(resol, 'VM9', 'comentário cita a invariante');
  t.contem(resol, 'Fecho automático continua humano', 'nunca fecha issue sozinho');

  /* ── entrada seca segue o gabarito ── */
  const entrada = entradaKnownBugs({ id: 'MAP2', desc: 'rota única', estado: 'vermelha' }, 'MAP2 rota única\nCRÍTICAS');
  t.contem(entrada, '**Régua: `tools/eval/invariants.mjs`**', 'entrada cita a régua');
  t.contem(entrada, 'a investigar', 'causa raiz marcada como a investigar (não inventa)');
}
