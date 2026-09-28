/* testes da lib compartilhada: persona, formatação e o dry-run do gh. */
import { carregarPersona, cabecalho, instrucaoDeTom, assinatura, mensagem } from '../persona.mjs';
import { tabela, codigo, citacao, detalhes, chaveValor, haQuanto, alerta, barra, grafoMermaid, checklist } from '../formatacao.mjs';
import { criarCliente } from '../gh.mjs';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export async function testar(t) {
  /* ── persona ── */
  const dirFake = join(tmpdir(), `bot-lib-teste-${Date.now()}`);
  mkdirSync(join(dirFake), { recursive: true });
  writeFileSync(join(dirFake, 'persona.json'), JSON.stringify({
    personagem: 'palhacomal', nome: 'Palhaço Mal', papel: 'revisor da casa',
    avatar_url: 'https://exemplo/palhacomal.webp',
    tom: 'palhaço malvado que se diverte achando defeito',
    bordoes: ['risada final', 'circo armado'], emoji: '🤡',
  }));
  const p = carregarPersona(dirFake);
  t.contem(cabecalho(p), '<img src="https://exemplo/palhacomal.webp" width="48"', 'cabecalho tem img 48px com avatar');
  t.contem(cabecalho(p), '**Palhaço Mal**', 'cabecalho tem nome em negrito');
  t.contem(cabecalho(p), '*revisor da casa*', 'cabecalho tem papel em itálico');
  t.contem(instrucaoDeTom(p), 'tempero, não prato', 'instrucaoDeTom traz a regra dura');
  t.contem(instrucaoDeTom(p), 'arquivo:linha', 'instrucaoDeTom exige evidência técnica');
  t.contem(assinatura(p, { seed: 0 }), 'risada final', 'assinatura com bordão determinístico');
  const corpo = mensagem(p, 'miolo técnico');
  t.contem(corpo, 'miolo técnico', 'mensagem preserva o miolo técnico');
  t.ok(corpo.startsWith('<img'), 'mensagem abre com o avatar');
  t.contem(corpo, '\n---\n', 'mensagem fecha com régua horizontal antes da assinatura');

  /* ── formatação ── */
  const tab = tabela({ colunas: ['a', 'b'], linhas: [[1, 2], ['x|y', 'okkkkk']] });
  t.contem(tab, '| :--- | :----- |', 'tabela tem separador alinhado');
  t.contem(tab, '| x\\|y | okkkkk |', 'tabela alinha colunas e escapa pipe');
  t.contem(codigo('const a=1', 'js'), '```js', 'código marca a linguagem');
  t.contem(citacao('linha1\nlinha2'), '> linha1\n> linha2', 'citação prefixa cada linha');
  t.contem(detalhes('ver', 'corpo'), '<details>', 'detalhes monta o details');
  t.contem(chaveValor([['k', 'v']]), '- **k:** v', 'chaveValor formata lista com negrito');
  t.igual(haQuanto(new Date(Date.now() - 3 * 86400_000).toISOString()), 'há 3 dias', 'haQuanto em dias');

  /* ── alertas, barra, mermaid, checklist ── */
  t.contem(alerta('perigo', 'linha 1\nlinha 2'), '> [!CAUTION]\n> linha 1\n> linha 2', 'alerta vira caixa do GitHub com todas as linhas prefixadas');
  t.contem(alerta('dica', 'x'), '[!TIP]', 'tipo dica mapeia em TIP');
  t.contem(alerta('atencao', 'x'), '[!WARNING]', 'tipo atencao mapeia em WARNING');
  t.contem(alerta('tipo inventado', 'x'), '[!NOTE]', 'tipo desconhecido cai em NOTE sem quebrar');
  t.igual(barra(6.5), '▓▓▓▓▓▓▓░░░', 'barra arredonda pra 10 casas');
  t.igual(barra(0), '░░░░░░░░░░', 'barra zero');
  t.igual(barra(99), '▓▓▓▓▓▓▓▓▓▓', 'barra satura no total');
  t.contem(grafoMermaid([{ de: 'main.js', para: 'game.js' }]), '```mermaid\ngraph RL\n  main_js["main.js"] --> game_js["game.js"]\n```', 'grafo mermaid com id sem ponto e rótulo com ponto');
  t.contem(checklist([{ feito: true, texto: 'a' }, { feito: false, texto: 'b' }]), '- [x] a\n- [ ] b', 'checklist marca feito/pendente');

  /* ── gh dry-run: mutante NÃO sai da máquina, leitura passa ── */
  const estadoDir = join(dirFake, 'estado');
  process.env.GH_DRY_RUN = '1';
  const cli = criarCliente({ patEnv: 'GH_PAT_FALA', estadoDir, repo: 'a/b' });
  const r = cli.api('repos/a/b/issues/1/comments', 'POST', { body: 'oi' });
  t.ok(r.dry_run, 'api POST em dry-run não envia e avisa');
  const dryDir = join(estadoDir, 'dry-run');
  const salvos = existsSync(dryDir) ? (await import('node:fs')).readdirSync(dryDir) : [];
  t.ok(salvos.length >= 1, 'payload do dry-run foi salvo em estado/dry-run/');
  const salvo = JSON.parse(readFileSync(join(dryDir, salvos[0]), 'utf8'));
  t.contem(JSON.stringify(salvo.body), 'oi', 'payload salvo com o corpo inteiro');
  delete process.env.GH_DRY_RUN;
  rmSync(dirFake, { recursive: true, force: true });
}
