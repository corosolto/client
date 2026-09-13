/* RÉGUA DA ESCOLHA DE NÓ — o segundo nó de uma região só serve se a tela mandar gente nele.
   ═══════════════════════════════════════════════════════════════════════════════════
   O painel de multiplayer diz que o nó `br` atende 275 dos 327 jogadores numa e2-small só:
   é o problema de capacidade e o de raio de dano na mesma linha. A resposta acordada com o
   dono é um segundo nó em São Paulo (`br2`), e preparar isso é mais do que criar a VM.

   Duas coisas quebrariam CALADAS se ninguém cobrasse:

   1. **A lista ordenava só por ping.** Dois nós no mesmo datacentre respondem no mesmo ping,
      e `Array.sort` é estável: todo mundo continuaria caindo no `br`, o `br2` nasceria vazio,
      e o dono pagaria US$ 26/mês por uma máquina ociosa enquanto a outra segue lotada.
   2. **O id de nó era `[a-z]{2}` em nove lugares**, e em dois deles a recusa é silenciosa:
      `api/match.ts` e `api/perf.ts` gravam `p_node: null` quando o id não casa. O `br2`
      entregaria telemetria anônima e o painel continuaria dizendo que o `br` tem 84% dos
      jogadores — porque metade deles viraria `null`.

   USO
     node tools/eval/no-escolha-check.mjs
     node tools/eval/no-escolha-check.mjs --mutar=so-ping     # volta a ordenar só por ping
     node tools/eval/no-escolha-check.mjs --mutar=id-curto    # volta o id de duas letras
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ordenarNos, parseConvite, NOS, NO_RE, FAIXA_PING_MS } from '../../public/js/nos.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

// o mutante troca a função pela versão antiga, sem tocar no arquivo em disco
const soPing = (lista) => [...lista].sort((a, b) => (a.ping == null ? 1e9 : a.ping) - (b.ping == null ? 1e9 : b.ping));
const ordena = MUTAR === 'so-ping' ? soPing : ordenarNos;
const forma = MUTAR === 'id-curto' ? /^[a-z]{2}$/ : NO_RE;
if (MUTAR) console.log(`\n  [MUTANTE: ${MUTAR}] — a régua TEM que reprovar`);

console.log('\n· a lista de servidores manda o jogador para o nó certo');

/* NE1 · MESMO DATACENTRE, O MENOS CHEIO PRIMEIRO. É a cláusula que faz o segundo nó existir
   de fato: sem ela, subir `br2` é comprar uma VM para ficar olhando. */
const doisBr = [
  { id: 'br', ping: 28, jogadores: 275, online: true },
  { id: 'br2', ping: 29, jogadores: 12, online: true },
];
cobra(ordena(doisBr)[0].id === 'br2',
  `NE1 · com o mesmo ping, o nó mais vazio vem primeiro (${ordena(doisBr).map((n) => `${n.id}:${n.jogadores}`).join(' ')})`);

/* NE2 · MAS NÃO A QUALQUER PREÇO. Nó vazio do outro lado do mundo não é oferta, é armadilha:
   acima da faixa de ping quem manda é o ping, e o dono desta regra é o jogador do Brasil que
   não pode ser empurrado para a Europa porque lá está vazio. */
const longe = [
  { id: 'br', ping: 28, jogadores: 275, online: true },
  { id: 'eu', ping: 178, jogadores: 0, online: true },
];
cobra(ordena(longe)[0].id === 'br',
  `NE2 · ping fora da faixa de ${FAIXA_PING_MS} ms manda mais que lotação (${ordena(longe)[0].id} primeiro)`);

// NE3 · nó fora do ar continua na lista (sumir esconde queda) mas vai para o fim
const caido = [
  { id: 'us', ping: null, jogadores: 0, online: false },
  { id: 'br', ping: 28, jogadores: 275, online: true },
];
cobra(ordena(caido)[0].id === 'br' && ordena(caido).length === 2,
  'NE3 · nó fora do ar fica na lista, mas por último');

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
