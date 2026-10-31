/* Teste offline do estraga-codigo: parser, grafo de importação e o corpo da
   revisão no formato nota/risco/impacto — grave/leve em português. */
import { extraiJson, corpoReview, decisaoPublicacao, fatiaDiff, acoesPara, grafoDeImports, importadoresDe, IGNORAR, reposDoConfig, chavePr, comandosPendentes } from '../canarinho.mjs';
import { carregarPersona, cabecalho } from '../../lib/persona.mjs';

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);

  /* ── parser tolerante: prosa + fence + dois blocos ── */
  const resp = 'olá eu sou o bot\n```json\n{"resumo":"x","descobertas":[{"arquivo":"a.js","titulo":"x","severidade":"major","corpo":"c"}]}\n```\nmais prosa {"descobertas":[]} depois';
  const d = extraiJson(resp);
  t.igual(d.descobertas.length, 1, 'extraiJson ignora prosa e pega o JSON do fence');
  t.ok(extraiJson('{"a":{"b":1}}').a.b === 1, 'extraiJson lê objeto balanceado aninhado');
  t.ok(extraiJson('sem json algum') === null, 'extraiJson devolve null sem inventar');

  /* ── fatia por arquivo, nunca no meio ── */
  const diff = 'diff --git a/x.js b/x.js\n+um\ndiff --git a/y.js b/y.js\n+dois';
  const fatias = fatiaDiff(diff, 10);
  t.igual(fatias.length, 2, 'fatiaDiff corta por arquivo');
  t.contem(fatias[0], 'a/x.js', 'fatia 0 é o x.js inteiro');

  /* ── grafo de importação: determinístico, do disco ── */
  const grafo = grafoDeImports();
  t.ok((grafo.get('game.js') || []).includes('main.js'), 'grafo sabe que main.js importa game.js');
  const impTex = importadoresDe(['public/js/textures.js'], grafo);
  t.ok(impTex.length === 1 && impTex[0].importadores.length >= 3, 'textures.js tem importadores no grafo');
  t.igual(importadoresDe(['README.md'], grafo).length, 0, 'arquivo fora de public/js não entra no grafo');

  /* ── corpo da revisão: nota/risco/impacto, grave/leve em PT ── */
  const achados = [
    { arquivo: 'public/js/game.js', linha: 42, severidade: 'major', confianca: 'alta', titulo: 'teto lê a declaração, não o uso', corpo: 'A invariante lê a constante e não o uso: portão de mentirinha.', conserto: 'troque a leitura da constante pela chamada do uso', patch: '- if (TETO Drops) {}\n+ if (usaDrops()) {}', mutacao: 'trocar uso por declaração', acao: 'leis-da-casa' },
    { arquivo: 'src/pages/api/x.ts', linha: null, severidade: 'minor', titulo: 'fetch sem timeout', corpo: 'Fetch para fora segura a serverless (o caso dos 504).', acao: 'backend-api' },
  ];
  const corpo = corpoReview(achados, { resumo: 'troca o teto do portão de drops', arquivos: ['public/js/game.js', 'src/pages/api/x.ts'], risco: 'médio', nota: 6.5 });
  t.contem(corpo, cabecalho(persona).split('\n')[2], 'revisão abre com o cartão da persona');
  t.contem(corpo, '**1 grave · 1 leve**', 'contagem grave/leve na abertura');
  t.contem(corpo, '> [!NOTE]\n> **o que faz:** troca o teto', 'resumo em caixa de nota');
  t.contem(corpo, '> [!WARNING]\n> **Risco MÉDIO** · nota 6.5/10 `▓▓▓▓▓▓▓░░░`', 'veredito em caixa amarela com barra');
  t.contem(corpo, '### 🔴 graves (1)', 'seção grave com cor');
  t.contem(corpo, '### 🟡 leves (1)', 'seção leve com cor');
  t.contem(corpo, '`public/js/game.js:42`', 'arquivo:linha em código clicável');
  t.contem(corpo, '> mutação sugerida: `trocar uso por declaração`', 'mutação em citação');
  t.contem(corpo, '💡 **conserto:** troque a leitura da constante pela chamada do uso', 'prompt de correção no achado');
  t.contem(corpo, '```diff\n- if (TETO Drops) {}\n+ if (usaDrops()) {}', 'patch do conserto em fence diff (render colorido)');
  t.ok(!corpo.includes('```diff\nnull'), 'sem fence diff vazio quando achado não tem patch');
  t.contem(corpo, '### impacto cruzado', 'seção de impacto cruzado quando há importadores');
  t.contem(corpo, '```mermaid\ngraph RL', 'impacto cruzado desenhado como grafo mermaid');
  t.contem(corpo, 'main_js["main.js"] --> game_js["game.js"]', 'aresta do grafo: main.js importa game.js');
  const corpoComLlm = corpoReview([achados[0]], { arquivos: [], impacto: ['agentes que buscam o contrato em main.js'] });
  t.contem(corpoComLlm, '- agentes que buscam o contrato em main.js', 'item de impacto do modelo ganha bullet');
  t.contem(corpo, 'portão de mentirinha', 'conteúdo técnico intacto');
  t.ok(!corpo.includes('major') && !corpo.includes('minor') && !corpo.includes('nojo'), 'nenhum rótulo em inglês nem piola antiga no corpo');
  t.ok(!/advisory/.test(corpo), 'sem "advisory": o contrato agora é dito em português');
  t.ok(persona.bordoes.some((b) => corpo.includes(`— *${b}`)), 'assinatura com bordão no fim, uma só');
  t.ok(corpo.indexOf(bordaoDo(corpo)) > corpo.indexOf('### 🔴 graves'), 'bordão vem DEPOIS da parte técnica');

  /* derivação honesta quando o modelo não devolve nota/risco */
  const derivado = corpoReview(achados, { arquivos: [] });
  t.contem(derivado, 'nota 7.5/10', 'nota derivada: 10 − 2×grave − 0,5×leve');
  t.contem(derivado, '> [!WARNING]\n> **Risco MÉDIO**', 'risco derivado: 1 grave = médio (caixa amarela)');
  const limpo = corpoReview([], { arquivos: ['public/js/textures.js'], risco: 'baixo', nota: 9 });
  t.contem(limpo, '> [!TIP]\n> **Risco BAIXO** · nota 9/10', 'revisão limpa em caixa verde');
  const alto = corpoReview([achados[0], { ...achados[0], titulo: 'y' }], { arquivos: [] });
  t.contem(alto, '> [!CAUTION]', '2+ graves sobem pra caixa vermelha');
  t.contem(limpo, 'fio não resolvido TRAVA o merge', 'contrato de bloqueio por fio explícito');

  const publica = decisaoPublicacao(achados);
  t.ok(publica.publicar && publica.achados.length === 1, 'só grave de confiança alta, linha exata e conserto é publicado');
  t.ok(!decisaoPublicacao([{ ...achados[0], confianca: 'média' }]).publicar, 'grave incerto fica apenas no registro local');
  t.ok(!decisaoPublicacao([{ ...achados[0], linha: null }]).publicar, 'grave sem linha exata não cria fio bloqueante');
  t.ok(!decisaoPublicacao([achados[1]]).publicar, 'leve não polui o PR');

  /* ── ações: glob casa com arquivo do PR ── */
  const ativas = acoesPara(['public/js/map_favela.js']);
  t.ok(ativas.some((a) => a.nome === 'mapas'), 'ação de mapa acorda para map_*.js');
  t.ok(ativas.some((a) => a.nome === 'leis-da-casa'), 'ação geral acorda para qualquer diff');
  const soBots = acoesPara(['bots/lib/gh.mjs']);
  t.ok(soBots.every((a) => a.nome === 'leis-da-casa'), 'ação de mapa NÃO acorda para bots/');
  t.ok(acoesPara(['game/server.js']).some((a) => a.nome === 'backend-api'), 'ação backend acorda para game/');
  t.ok(acoesPara(['server.js']).some((a) => a.nome === 'backend-api'), 'ação backend acorda para server.js');

  /* ── IGNORAR: artefato de build não é código — o falso grave do e-mail
   * de 18/08 (versão "lida" dentro de bundle minificado do Docusaurus) ── */
  t.ok(IGNORAR.test('public/docs/assets/js/1be81749.443fe28b.js'), 'bundle do Docusaurus é ignorado');
  t.ok(IGNORAR.test('public/docs/colaborar/index.html'), 'HTML gerado do Docusaurus é ignorado');
  t.ok(!IGNORAR.test('public/js/game.js'), 'código do jogo NÃO é ignorado');
  t.ok(!IGNORAR.test('docs/docs/colaborar.md'), 'fonte de docs NÃO é ignorado');

  /* ── multi-repo + comando explícito: comentário precisa disparar review real ── */
  t.igual(
    JSON.stringify(reposDoConfig({ repos: ['corosolto/client', 'corosolto/backend'] })),
    JSON.stringify(['corosolto/client', 'corosolto/backend']),
    'config exige e preserva os dois repos',
  );
  t.igual(chavePr('corosolto/client', 193), 'corosolto/client#193', 'estado client tem namespace');
  t.igual(chavePr('corosolto/backend', 193), 'corosolto/backend#193', 'estado backend não colide');
  const comentarios = [
    {
      id: 11,
      body: '@estraga-codigo full review\n\nO head mudou.',
      author_association: 'OWNER',
      issue_url: 'https://api.github.com/repos/corosolto/client/issues/1178',
    },
    {
      id: 12,
      body: 'texto sem comando',
      author_association: 'OWNER',
      issue_url: 'https://api.github.com/repos/corosolto/client/issues/1177',
    },
    {
      id: 13,
      body: '@estraga-codigo full review',
      author_association: 'NONE',
      issue_url: 'https://api.github.com/repos/corosolto/client/issues/1177',
    },
  ];
  const comandos = comandosPendentes('corosolto/client', comentarios, new Set());
  t.igual(comandos.length, 1, 'só comando autorizado entra na fila');
  t.igual(comandos[0].number, 1178, 'comando extrai o número do PR');
  t.igual(
    comandosPendentes('corosolto/client', comentarios, new Set(['corosolto/client#11'])).length,
    0,
    'comentário processado não dispara review duplicado',
  );
}

const bordaoDo = (corpo) => corpo.split('\n').find((l) => l.startsWith('— *')) || '';
