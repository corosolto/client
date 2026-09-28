/* Teste offline do podador: classificação morto/arnês, asset sem citação,
   relatório com prova e contrato de nunca-apagar. */
import { varreReferencias, classificarModulos, assetsMortos, entradasDeHtml, corpoRelatorio, promptDeep } from '../poda.mjs';
import { carregarPersona } from '../../lib/persona.mjs';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);

  /* ── classificação com grafo sintético ── */
  const grafo = new Map([
    ['a.js', ['main.js']],
    ['b.js', ['a.js']],
    ['d.js', ['tools/eval/harness.mjs']],
  ]);
  const refs = new Set(['d.js', 'vivo.png']);
  const { mortos, arnes } = classificarModulos({
    modulos: ['main.js', 'a.js', 'b.js', 'c.js', 'd.js'],
    grafo, entradas: ['main.js'], refs,
  });
  t.igual(mortos.length, 1, 'um módulo morto');
  t.igual(mortos[0], 'c.js', 'c.js inalcançável e sem citação = morto');
  t.igual(arnes.length, 1, 'um módulo só-arnês');
  t.igual(arnes[0], 'd.js', 'd.js citado por tools fica em classe separada (não morto)');
  t.ok(!mortos.includes('b.js') && !arnes.includes('b.js'), 'b.js alcançável via main→a não aparece');

  /* ── referências reais da árvore: main.js e o avatar são citados ── */
  const refsReais = varreReferencias(join(dir, '..', '..'));
  t.ok(refsReais.has('main.js'), 'varreReferencias acha main.js citado na árvore real');
  t.ok(refsReais.has('palhacomal.webp'), 'referência a asset do elenco aparece (GLB/webp citado em código)');

  /* ── assets: morto só quem não tem citação NENHUMA ── */
  const tmp = mkdtempSync(join(tmpdir(), 'podador-teste-'));
  mkdirSync(join(tmp, 'public', 'img', 'aviso'), { recursive: true });
  writeFileSync(join(tmp, 'public', 'img', 'aviso', 'vivo.png'), 'x');
  writeFileSync(join(tmp, 'public', 'img', 'aviso', 'morto.png'), 'x');
  const am = assetsMortos(tmp, new Set(['vivo.png']), { teto: 10 });
  t.igual(am.length, 1, 'um asset sem citação');
  t.ok(am[0].endsWith('img/aviso/morto.png'), 'o sem citação é o listado');

  /* ── entradas de HTML ── */
  const ent = entradasDeHtml(join(dir, '..', '..'));
  t.ok(ent.length >= 2, `imports do mapview.html viram entrada (${ent.length})`);
  t.ok(ent.includes('textures.js'), 'textures.js é entrada do mapview');

  /* ── prompt deep com o contraponto declarado ── */
  const p = promptDeep('game.js', { linhas: 9000, cabecalho: '// Core game', importadores: ['main.js'] });
  t.contem(p, 'tamanho não', 'prompt deep avisa que tamanho não é defeito (game.js é o contraexemplo)');

  /* ── relatório ── */
  const corpo = corpoRelatorio({
    mortos: ['c.js'], arnes: ['d.js'], assets: ['public/img/x.png'],
    deep: [{ modulo: 'y.js', linhas: 800, motivo: 'camada que só repassa', acao: 'colar direto no chamador' }],
  }, { semana: '2026-08-16' });
  t.contem(corpo, '<!-- podador: ronda-semanal -->', 'relatório com marcador de dedupe');
  t.contem(corpo, `**${persona.nome}**`, 'relatório abre com cartão da persona');
  t.ok(/^\| c\.js\s+/m.test(corpo), 'morto com a prova na tabela');
  t.contem(corpo, 'só o arnês usa', 'classe arnês separada e explícita');
  t.contem(corpo, 'estado inchado', 'seção de superengenharia quando há achado');
  t.contem(corpo, 'nunca apaga', 'contrato de nunca-apagar no corpo');
  t.ok(persona.bordoes.some((b) => corpo.includes(`— *${b}`)), 'assinatura com bordão');
  const vazio = corpoRelatorio({ mortos: [], arnes: [], assets: [], deep: [] }, { semana: 'x' });
  t.contem(vazio, 'Nada na lista', 'semana limpa declarada');
}
