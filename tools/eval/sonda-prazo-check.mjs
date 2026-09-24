/* ============================================================================
   sonda-prazo-check.mjs — O PRAZO DA SONDA NÃO PODE CONTAR TEMPO CONGELADO
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   A tela de multiplayer mostrou "SERVIDORES FORA DO AR" com os quatro nós de pé e
   respondendo em 24 ms (BUG-169). A causa não era rede: `setTimeout` mede relógio de
   parede, e um `fetch` só resolve quando a thread principal atende. O boot do jogo
   (WebGL, GLB, texturas) trava a thread por segundos — o prazo de 2,5 s vencia sozinho
   e abortava TODAS as sondas. Por isso "TENTAR DE NOVO" consertava: na segunda vez o
   jogo já tinha carregado.

   Medido no navegador, em produção, antes do conserto:
     thread livre     → br:220ms br2:216ms us:119ms eu:24ms
     thread travada 3s → br:FORA br2:FORA us:FORA eu:FORA

   O QUE ELA MEDE: que uma thread travada NÃO consome o prazo, e que a sonda continua
   dizendo "online" para um servidor que respondeu — que é a frase que o jogador lê.

   Mutante: `--mutante=relogio-de-parede` devolve o `setTimeout` cru. Deve acender.

   Uso: node tools/eval/sonda-prazo-check.mjs [--mutante=relogio-de-parede]
   ============================================================================ */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mut && mut !== 'relogio-de-parede') throw new Error(`mutante desconhecido: ${mut}`);

/* O mutante reescreve o MÓDULO, não uma variável desta régua. A primeira versão trocava só
   um `const` local, e a cláusula que importa (SP3, que passa pelo `sondarNos`) continuava
   chamando o prazo verdadeiro: ela ficava VERDE contra o mutante, medindo nada. */
const ORIGEM = new URL('../../public/js/net.js', import.meta.url);
const COPIA = new URL('../../public/js/net.__mutante__.js', import.meta.url);
let alvo = ORIGEM;
if (mut === 'relogio-de-parede') {
  const src = readFileSync(ORIGEM, 'utf8');
  const cru = 'export function prazoAcordado(ms, aoEstourar) { const t = setTimeout(aoEstourar, ms); return () => clearTimeout(t); }';
  const trocado = src.replace(/export function prazoAcordado\(ms, aoEstourar\) \{[\s\S]*?\n\}/, cru);
  if (trocado === src) throw new Error('mutante não achou prazoAcordado — a régua perderia o alvo em silêncio');
  writeFileSync(COPIA, trocado);
  alvo = COPIA;
}
process.on('exit', () => { if (alvo === COPIA) { try { unlinkSync(COPIA); } catch {} } });

const { prazoAcordado: prazo, sondarNos } = await import(alvo.href);

const trava = (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { /* congela a thread */ } };
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

const falhas = [];
const ok = [];
const cobra = (nome, cond, detalhe) => (cond ? ok : falhas).push(`${nome} ${detalhe}`);

/* SP1 — thread travada por 3 s não pode consumir um prazo de 2,5 s. */
{
  let estourou = false;
  const cancela = prazo(2500, () => { estourou = true; });
  trava(3000);
  await dorme(250);          // dá a vez ao laço de eventos, para o prazo poder disparar
  cancela();
  cobra('SP1', !estourou, `prazo de 2500ms contra 3000ms de thread travada → ${estourou ? 'ESTOUROU' : 'sobreviveu'}`);
}

/* SP2 — mas o prazo TEM de estourar quando o tempo passa com a thread acordada.
   Sem esta cláusula, "nunca estoura" passaria em SP1 e a sonda nunca desistiria. */
{
  let estourou = false;
  const cancela = prazo(400, () => { estourou = true; });
  await dorme(1200);
  cancela();
  cobra('SP2', estourou, `prazo de 400ms com 1200ms de thread acordada → ${estourou ? 'estourou' : 'NÃO ESTOUROU'}`);
}

/* SP3 — a frase que o jogador lê: servidor que respondeu aparece ONLINE mesmo que a
   thread tenha congelado logo depois de disparar a sonda. */
{
  const srv = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: true, regiao: 'br', players: 3, rooms: 1 }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const porta = srv.address().port;
  const no = { id: 'br', nome: 'teste', url: `ws://127.0.0.1:${porta}/ws` };

  const p = sondarNos([no], 2500, 2);
  trava(3000);
  const [r] = await p;
  srv.close();
  cobra('SP3', r.online === true, `nó que respondeu, com 3000ms de thread travada → online=${r.online}, ping=${r.ping}`);
}

for (const l of ok) console.log(`  ✓ ${l}`);
for (const l of falhas) console.error(`  ✗ ${l}`);
if (falhas.length) {
  console.error('\n✗ SONDA o prazo da sonda está contando tempo em que a thread não pôde atender.');
  console.error('  É a tela "SERVIDORES FORA DO AR" com os servidores de pé.');
  process.exit(1);
}
console.log(`\n✓ SONDA ${ok.length} cláusulas — prazo só conta tempo acordado`);
