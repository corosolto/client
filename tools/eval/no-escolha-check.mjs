/* RÉGUA DA ESCOLHA DE NÓ — o jogo tem de mandar o jogador para onde tem GENTE.
   ═══════════════════════════════════════════════════════════════════════════════════
   Esta régua já existiu com a premissa invertida. Ela nasceu para um segundo nó em São Paulo,
   citando "275 dos 327 jogadores no br": esse número é o TOTAL DA JANELA do painel, não gente
   ao mesmo tempo. Medido em `mp_metrics_5m` (30 dias, 13/09/2026): pico de **12 simultâneos**
   no `br`, 4 no `eu`, 1 no `us`. O segundo nó foi criado e apagado no mesmo dia.

   Com 12 pessoas no mundo todo e três nós, o inimigo não é lotação, é DISPERSÃO. Medido nas
   mesmas 30 dias: **60% das sessões de multiplayer foram contra bot só** (275 de 459), e em
   apenas 1,2% das janelas de 5 minutos havia duas pessoas conectadas ao mesmo tempo.

   Duas regras, e as duas quebrariam CALADAS se ninguém cobrasse:

   1. **O desempate da lista.** Dentro da mesma faixa de ping, o nó MAIS CHEIO vem primeiro.
      A versão anterior fazia o contrário — ela servia à capacidade, e mandava cada pessoa
      para o nó mais vazio, que é literalmente entregar uma sala vazia.
   2. **Para onde o QUICK PLAY manda.** Ele lia as salas de UM nó, o de menor ping. Duas
      pessoas separadas por 12 ms de diferença nunca se encontravam. Agora ele procura gente
      e atravessa de nó, até o teto de 150 ms — acima disso a companhia não paga o atraso.

   USO
     node tools/eval/no-escolha-check.mjs
     node tools/eval/no-escolha-check.mjs --mutar=so-ping      # ordenar só por ping
     node tools/eval/no-escolha-check.mjs --mutar=mais-vazio   # o desempate ANTIGO (capacidade)
     node tools/eval/no-escolha-check.mjs --mutar=so-perto     # quick play volta a ignorar gente
     node tools/eval/no-escolha-check.mjs --mutar=id-curto     # volta o id de duas letras
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ordenarNos, melhorNoParaJogar, parseConvite, NOS, NO_RE, FAIXA_PING_MS, TETO_COMPANHIA_MS } from '../../public/js/nos.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

// o mutante troca a função pela versão antiga, sem tocar no arquivo em disco
const soPing = (lista) => [...lista].sort((a, b) => (a.ping == null ? 1e9 : a.ping) - (b.ping == null ? 1e9 : b.ping));
// o desempate ANTIGO, que existia para capacidade: dentro da faixa, o mais vazio primeiro
const maisVazio = (lista) => {
  const faixa = (n) => Math.floor((n.ping == null ? 1e9 : n.ping) / FAIXA_PING_MS);
  return [...lista].sort((a, b) => faixa(a) - faixa(b)
    || (a.jogadores | 0) - (b.jogadores | 0)
    || (a.ping == null ? 1e9 : a.ping) - (b.ping == null ? 1e9 : b.ping));
};
// o quick play ANTIGO: o nó de menor ping, sem olhar se há alguém nele
const soPerto = (lista) => [...lista.filter((n) => n.online)]
  .sort((a, b) => (a.ping == null ? 1e9 : a.ping) - (b.ping == null ? 1e9 : b.ping))[0] || null;
const ordena = MUTAR === 'so-ping' ? soPing : MUTAR === 'mais-vazio' ? maisVazio : ordenarNos;
const escolhe = MUTAR === 'so-perto' ? soPerto : melhorNoParaJogar;
const forma = MUTAR === 'id-curto' ? /^[a-z]{2}$/ : NO_RE;
if (MUTAR) console.log(`\n  [MUTANTE: ${MUTAR}] — a régua TEM que reprovar`);

console.log('\n· a lista de servidores manda o jogador para o nó certo');

/* NE1 · MESMA FAIXA, O MAIS CHEIO PRIMEIRO. É a cláusula que junta as pessoas: com 12
   simultâneos no mundo todo, o nó vazio mais perto é uma sala vazia.
   A fixture é de propósito o caso em que as três regras DISCORDAM — o nó com gente é o de
   ping MAIOR dentro da mesma faixa. Com o cheio também sendo o mais perto, ordenar só por
   ping dava a mesma resposta e o mutante `so-ping` passava sem a régua ver nada. */
const empatados = [
  { id: 'br', ping: 16, jogadores: 0, online: true },
  { id: 'us', ping: 29, jogadores: 4, online: true },
];
cobra(ordena(empatados)[0].id === 'us',
  `NE1 · com o mesmo ping, o nó com gente vem primeiro (${ordena(empatados).map((n) => `${n.id}:${n.jogadores}`).join(' ')})`);

/* NE2 · MAS NÃO A QUALQUER PREÇO. A LISTA é de quem escolhe, e quem escolhe quer ver o ping:
   acima da faixa quem manda é o ping, mesmo que a gente esteja toda do outro lado. Quem quer
   companhia a qualquer custo clica em QUICK PLAY, e é o `melhorNoParaJogar` que decide lá. */
const longe = [
  { id: 'br', ping: 28, jogadores: 0, online: true },
  { id: 'eu', ping: 178, jogadores: 8, online: true },
];
cobra(ordena(longe)[0].id === 'br',
  `NE2 · na LISTA, ping fora da faixa de ${FAIXA_PING_MS} ms manda mais que lotação (${ordena(longe)[0].id} primeiro)`);

// NE3 · nó fora do ar continua na lista (sumir esconde queda) mas vai para o fim
const caido = [
  { id: 'us', ping: null, jogadores: 0, online: false },
  { id: 'br', ping: 28, jogadores: 3, online: true },
];
cobra(ordena(caido)[0].id === 'br' && ordena(caido).length === 2,
  'NE3 · nó fora do ar fica na lista, mas por último');

console.log('\n· o QUICK PLAY procura gente, não o menor ping');

/* NE7 · A CLÁUSULA QUE VALE. 60% das sessões medidas foram contra bot; a causa é esta escolha.
   Jogador no Brasil, duas pessoas na Europa dentro do teto: o Quick Play atravessa. */
const genteLonge = [
  { id: 'br', ping: 28, jogadores: 0, online: true },
  { id: 'us', ping: 120, jogadores: 0, online: true },
  { id: 'eu', ping: 40, jogadores: 2, online: true },
];
cobra(escolhe(genteLonge)?.id === 'eu',
  `NE7 · com gente só no eu, o quick play vai no eu (${escolhe(genteLonge)?.id})`);

/* NE8 · O TETO. Companhia não paga qualquer atraso: acima de ${TETO_COMPANHIA_MS} ms o jogo
   prefere o vazio perto. Sem esta cláusula, NE7 sozinha mandaria todo mundo para o outro
   hemisfério atrás de uma pessoa. */
const genteLongeDemais = [
  { id: 'br', ping: 28, jogadores: 0, online: true },
  { id: 'us', ping: 210, jogadores: 4, online: true },
];
cobra(escolhe(genteLongeDemais)?.id === 'br',
  `NE8 · gente acima de ${TETO_COMPANHIA_MS} ms não puxa o jogador (${escolhe(genteLongeDemais)?.id})`);

// NE9 · ninguém em lugar nenhum: aí o ping é o único critério que sobra, e é o certo
const todosVazios = [
  { id: 'br', ping: 28, jogadores: 0, online: true },
  { id: 'eu', ping: 40, jogadores: 0, online: true },
];
cobra(escolhe(todosVazios)?.id === 'br',
  `NE9 · com tudo vazio, o quick play volta a ser o menor ping (${escolhe(todosVazios)?.id})`);

// NE10 · nó fora do ar não recebe ninguém, nem se o número de jogadores dele for alto
const cheioEcaido = [
  { id: 'us', ping: 30, jogadores: 9, online: false },
  { id: 'br', ping: 28, jogadores: 1, online: true },
];
cobra(escolhe(cheioEcaido)?.id === 'br',
  `NE10 · nó fora do ar não recebe ninguém (${escolhe(cheioEcaido)?.id})`);

// NE11 · e sem nó nenhum de pé, devolve null em vez de inventar destino
cobra(escolhe([{ id: 'br', ping: null, jogadores: 0, online: false }]) === null,
  'NE11 · sem nó de pé, o quick play não inventa destino');

console.log('\n· o convite do nó novo abre no nó novo');

/* NE4 · `BR2-7K3M` não pode virar sala do `BR`. O parser antigo casava exatamente duas letras;
   o novo tenta o id mais LONGO primeiro, senão o prefixo do nó novo é engolido pelo do velho. */
const comBr2 = [...NOS, { id: 'br2', nome: 'Brasil · São Paulo 2', url: 'wss://br2.corosolto.com.br/ws' }];
const original = NOS.slice();
NOS.length = 0; NOS.push(...comBr2);
const c1 = parseConvite('BR2-7K3M'), c2 = parseConvite('BR-7K3M');
NOS.length = 0; NOS.push(...original);
cobra(c1 && c1.no.id === 'br2' && c1.codigo === '7K3M', `NE4 · BR2-7K3M abre no br2 (${c1 ? c1.no.id : 'null'})`);
cobra(c2 && c2.no.id === 'br', `NE4b · e o convite antigo continua abrindo no br (${c2 ? c2.no.id : 'null'})`);

// NE5 · a forma do id aceita o nó novo e continua recusando lixo
cobra(forma.test('br2') && forma.test('br') && !forma.test('b') && !forma.test('br22') && !forma.test('BR2'),
  `NE5 · a forma do id aceita br2 e recusa o resto (${forma})`);

/* NE6 · e ela é a MESMA nos dois repositórios. Esta régua vive no cliente; o backend tem a
   cópia em `api/_lib/no.mjs`. Duas formas diferentes fariam o nó nascer e a telemetria dele
   morrer na porta — que é exatamente o defeito que esta rodada consertou no bloco `ops`. */
const nosJs = fs.readFileSync(path.join(RAIZ, 'public/js/nos.js'), 'utf8');
cobra(/NO_RE = \/\^\[a-z\]\{2\}\[0-9\]\?\$\//.test(nosJs) && /api\/_lib\/no\.mjs/.test(nosJs),
  'NE6 · a forma do id aponta para a cópia do backend, para as duas não divergirem');

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
