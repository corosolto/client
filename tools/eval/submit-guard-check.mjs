/* SUBMIT-GUARD-CHECK — a trava anti-fraude não pode recusar partida que o jogo produz.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO QUE COMPROU ESTA RÉGUA (issue #87, reportada pelo maurodesouza)

   Palavras dele: *"Durante uma partida no modo Captura de Bandeira, recebi a mensagem
   `stats não enviados: partida rápida demais pra ser verdade`. A partida foi totalmente
   legítima. Eu estava jogando no mapa Quebrada (8x8) e fiquei de AWP cobrindo a viela."*

   A guarda é uma linha de SQL:

     if p_rounds > 0 and p_seconds > 0 and p_seconds < p_rounds * 80 then
       perform public._flag(p_nick);                       -- <<< e ISTO é o pior
       raise exception 'partida rápida demais pra ser verdade';

   Ela assume que **toda rodada dura pelo menos 80 s**. Essa premissa nasceu do modo
   ABATE, onde a rodada É uma janela de tempo (`ROUND_TIME = 99`, `game.js:77`). No modo
   CAPTURA a rodada NÃO TEM JANELA DE TEMPO NENHUMA: ela fecha por alvo de bandeiras ou
   por dominação (`_ctfWin`, `game.js:4150`), e `CTF_ROUNDS_TO_WIN` é 2 (`game.js:114`).
   Uma partida de captura decidida rápido é o modo funcionando, e a regra chama de fraude.

   ── A PARTE QUE A ISSUE NÃO VIU, E É A GRAVE ────────────────────────────────────
   Antes do `raise`, a cláusula chama `_flag(p_nick)`, que faz `flagged_count + 1` e, em
   `flagged_count >= 3`, `hidden = true`. **Três partidas rápidas legítimas escondem o
   jogador do ranking.** Regra com falso-positivo comprovado não pode alimentar contador
   de shadowban — é disso que trata a cláusula SG4.

   O QUE ESTA RÉGUA MEDE

     SG1 · FÍSICA (rápida, sem simulação — é a que mora no portão)
           O piso da regra tem que ser MENOR que o tempo mínimo FÍSICO de uma rodada de
           captura. O mínimo físico é um limite inferior honesto: caminho ótimo em LINHA
           RETA do spawn passando por todas as bandeiras (força bruta sobre as
           permutações — nada de heurística, que superestimaria), a PLAYER_SPEED, mais o
           tempo de permanência no anel com esquadrão cheio (CAP_NEUTRAL/2 por bandeira,
           `game.js:4099-4112`). Ignora parede, obstáculo, combate e desvio — tudo que a
           realidade cobra a mais. Nenhum humano bate esse número.

     SG2 · AMOSTRA (só com --amostra: sobe o motor e joga partidas inteiras)
           5 mapas × N sementes de CAPTURA até `state === 'matchEnd'`, e o predicado SQL
           literal aplicado no payload que `_endMatch` REALMENTE envia (`game.js:2508`).

     SG3 · ABANDONO (só com --amostra)
           `partialPayload()` (`main.js:1294`) dispara no `beforeunload` e manda
           `rounds` + `seconds` de partida interrompida — é a fonte mais curta que existe.
           Vencer a 1ª rodada por dominação e fechar a aba é trivial e tem que passar.

     SG4 · SEM STRIKE (rápida — leitura do SQL)
           A cláusula de tempo não chama `_flag` / `fn_f9c`.

     SG5 · DEFAULT BRANDO (rápida — leitura do SQL)
           O ramo DEFAULT do piso é o BAIXO. Cliente com JS em cache manda payload sem
           `mode` por dias (é o mesmo laço do `?v=`), e um default duro devolve o #87 pra
           ele enquanto a régua fica verde pelo cliente novo.

     O SQL NÃO MORA NESTE REPOSITÓRIO (`.gitignore:145-148`, decisão do dono de 06/08:
     *"não quero revelar nossa db tão fácil"* — fonte da verdade em `~/db-privado/`).
     SG4 e SG5 saem PULADAS quando o insumo não está na máquina, e DIZEM que saíram.

   MEDIDO ANTES DO CONSERTO (07/08, `--amostra --sementes=4242,7,99,1234,555,8080,31337,2026,64,777`)

     recusadas pela regra vigente (80 s/rodada) : 6 de 50 partidas de captura (12 %)
     menor s/rodada de partida inteira          : 48,0 s   (praca_poderes, semente 64)
     MENOR RODADA INDIVIDUAL                    : 31,1 s   (piscina_treta, semente 99)
     mapas atingidos                            : praca_poderes 3/10, ferro_velho 2/10,
                                                  quebrada 1/10

   E o simulador é o caso LENTO: o jogador dele é passivo. O Mauro estava de AWP limpando
   a viela — jogo humano bom produz rodada mais curta que qualquer linha desta tabela.

   O PALPITE ÓBVIO, MEDIDO E MORTO (lei 4 da bug-hunt)
     *"é só baixar 80 para 40"* — rode `--piso=40 --amostra` e olhe: ainda recusa. O
     número não vem de palpite, vem do SG1.

   ATENÇÃO AO INSTRUMENTO (armadilha #7 da skill bug-hunt)
     As simulações compartilham o cursor do `Math.random` entre mapas por causa do cache
     preguiçoso de textura. Célula a célula NÃO é comparável entre execuções; só vale a
     SEQUÊNCIA INTEIRA, com a mesma lista de mapas e a mesma lista de sementes.

   AS MUTAÇÕES QUE A DEIXAM VERMELHA (todas executadas)
     --mutante=piso80       devolve o piso único de 80 s -> SG1 nos 5 mapas
                            (e SG2/SG3 com --amostra)
     --mutante=comflag      devolve a chamada de _flag na cláusula de tempo -> SG4 nos 3
     --mutante=defaultduro  inverte o `case` para `when p_mode='ctf' then 6 else 80`.
                            Mesma conta pro cliente NOVO — e o cliente velho volta ao #87.
                            -> SG5 nos 3. É a mutação mais fina das três: sem ela, dava
                            pra "consertar" o #87 deixando metade dos jogadores no defeito.

   USO
     node tools/eval/submit-guard-check.mjs                    # SG1/SG4/SG5, segundos
     node tools/eval/submit-guard-check.mjs --amostra          # + SG2/SG3 (lento: ~10 min)
     node tools/eval/submit-guard-check.mjs --mutante=piso80
     node tools/eval/submit-guard-check.mjs --piso=40 --amostra
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, MAPS, initTextures, renderer, sfx, PCHAR, seedRandom } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');

const args = process.argv.slice(2);
const val = (k, d) => { const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1]; return v === undefined ? d : v; };
const MUT = val('mutante', '');
const AMOSTRA = args.includes('--amostra');
const SEMENTES = val('sementes', '4242,7,99,1234,555,8080,31337,2026,64,777').split(',').map(Number);

const falhas = [];

/* ─── O PISO SOB TESTE SAI DO SQL, NÃO DE UMA CÓPIA AQUI ─────────────────────────
   A primeira versão desta régua declarava `PISO_ABATE = 80` e `PISO_CAPTURA = 6` em JS,
   "espelhando" o SQL. Isso é o defeito do limiar duplicado que esta base já pagou: a
   passada de grafite aceitava 20 % de buraco e a auditoria reprovava acima de 13 %, peça
   nascia aprovada de um lado e reprovada do outro, e dois consertos seguidos não moveram
   o número (451 → 445 → 445). Alinhar os limiares levou de 688 para 272.

   Aqui o modo de falha seria pior e mais silencioso: alguém mexe no piso do SQL, a régua
   continua validando o número ANTIGO, e ela fica VERDE atestando um banco que recusa
   jogador. Então o piso é LIDO da fonte que roda em produção.

   Consequência aceita, e é a resposta à pergunta 4 da skill: sem o SQL na máquina esta
   régua NÃO SABE MEDIR, e não saber custa o mesmo que estar errado — ela fica VERMELHA.
   Por isso ela mora fora do `check` (que roda em CI sem o banco), junto do `eval:boot` e
   do `eval:ctrlw`, como passo de pré-deploy. */
const DB = process.env.DB_PRIVADO || path.join(process.env.HOME || '', 'db-privado');
const FONTE = 'supabase/migrations/015_submit_guard_modo.sql';
const semComentario = (t) => t.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');

function lePisoDoSql() {
  const p = path.join(DB, FONTE);
  if (!fs.existsSync(p)) return null;
  const m = semComentario(fs.readFileSync(p, 'utf8'))
    .match(/case\s+when\s+p_mode\s*=\s*'([a-z]+)'\s*then\s*(\d+)\s*else\s*(\d+)\s*end/i);
  return m ? { quando: m[1], explicito: Number(m[2]), padrao: Number(m[3]) } : null;
}
const SQL = lePisoDoSql();
if (!SQL) {
  console.log('RÉGUA DA TRAVA DE SUBMISSÃO\n');
  console.log(`✗ SUBMIT-GUARD  NÃO SEI MEDIR — e não saber custa o mesmo que estar errado.`);
  console.log(`   O piso vem do SQL, e ${path.join(DB, FONTE)} não está aqui (ou o \`case\` mudou de forma).`);
  console.log('   O banco mora FORA deste repositório por decisão do dono (.gitignore:145-148,');
  console.log('   06/08: "não quero revelar nossa db tão fácil"). Fonte da verdade: ~/db-privado/.');
  console.log('   Conserto: rode na máquina do dono, ou aponte com DB_PRIVADO=/caminho/do/db-privado.');
  process.exit(1);
}
/* `--piso=N` troca só o ramo DEFAULT (é o experimento de refutação do palpite óbvio:
   `--piso=40 --amostra`). `--mutante=piso80` devolve o mundo único de antes do #87. */
const PISO_OVERRIDE = args.some((a) => a.startsWith('--piso=')) ? Number(val('piso', 0)) : null;
function pisoDe(modo) {
  if (MUT === 'piso80') return 80;
  if (modo === SQL.quando) return SQL.explicito;
  return PISO_OVERRIDE ?? SQL.padrao;
}
const recusa = (rounds, seconds, modo) =>
  rounds > 0 && seconds > 0 && seconds < rounds * pisoDe(modo);
console.log(`RÉGUA DA TRAVA DE SUBMISSÃO${MUT ? `   [MUTAÇÃO: ${MUT}]` : ''}`);
console.log(`piso LIDO de ${FONTE}: abate ${pisoDe('rounds')} s/rodada · captura ${pisoDe('ctf')} s/rodada`);
if (PISO_OVERRIDE !== null) console.log(`(--piso=${PISO_OVERRIDE} sobrepõe o ramo default — experimento, não o estado real)`);
console.log('');

/* ═══ SG1 · FÍSICA ═══════════════════════════════════════════════════════════════
   Limite inferior do tempo de uma rodada de captura. Tudo que a régua ignora (parede,
   desvio, combate, morrer no caminho) só faz o número real SUBIR — por isso ele serve
   como piso: se a regra recusa abaixo dele, ela recusa o impossível, e só. */
const CAP_NEUTRAL = 2.2;      // game.js:4099
const CREW_MAX = 2;           // game.js:4111 — esquadrão cheio dobra a velocidade de captura
const PLAYER_SPEED = 5.35;    // game.js:268

const textures = initTextures();
const IDS = Object.keys(MAPS);
console.log('SG1 · o piso da captura é menor que o tempo FÍSICO mínimo de rodada');
console.log('   mapa                bandeiras  caminho(m)  corrida(s)  anel(s)  MÍNIMO(s)  piso  veredito');
let minFisicoGlobal = Infinity;
for (const id of IDS) {
  seedRandom(4242);
  const g = new Game({
    renderer, textures, sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'SIM', mapId: id, ctf: true, testMode: true, onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  g.start ? g.start() : g._startRound();

  const pts = (g.ctfPts || []).map((p) => ({ x: p.x, z: p.z }));
  const sp = (g.world.spawns.E || [])[0] || { x: 0, z: 0 };
  const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  /* Caminho ÓTIMO por força bruta (≤ 4 bandeiras = ≤ 24 permutações). Heurística do
     vizinho mais próximo daria um caminho MAIOR que o ótimo, e um caminho maior daria um
     mínimo maior — ou seja, um piso mais frouxo. Aqui não dá pra economizar. */
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
  let melhor = Infinity;
  for (const ordem of perms(pts)) {
    let soma = d(sp, ordem[0]);
    for (let i = 1; i < ordem.length; i++) soma += d(ordem[i - 1], ordem[i]);
    melhor = Math.min(melhor, soma);
  }
  const corrida = melhor / PLAYER_SPEED;
  const anel = pts.length * (CAP_NEUTRAL / CREW_MAX);
  const minimo = corrida + anel;
  minFisicoGlobal = Math.min(minFisicoGlobal, minimo);

  const piso = pisoDe('ctf');
  const ok = piso < minimo;
  if (!ok) falhas.push(`SG1 ${id}: piso de ${piso} s/rodada é MAIOR que o mínimo físico de ${minimo.toFixed(1)} s — a regra recusa rodada que o mapa permite`);
  console.log(`   ${id.padEnd(18)} ${String(pts.length).padStart(9)} ${melhor.toFixed(1).padStart(11)} ${corrida.toFixed(1).padStart(11)} ${anel.toFixed(1).padStart(8)} ${minimo.toFixed(1).padStart(10)} ${String(piso).padStart(5)}  ${ok ? 'ok' : 'RECUSA O POSSÍVEL'}`);
}
console.log(`   mínimo físico entre os mapas: ${minFisicoGlobal.toFixed(1)} s/rodada\n`);

/* ═══ SG4 · A CLÁUSULA DE TEMPO NÃO DÁ STRIKE ════════════════════════════════════
   Lê os DOIS arquivos que carregam o corpo da função: a migration viva e o espelho
   ofuscado (que é cópia byte-a-byte com nomes trocados — se ele ficar pra trás, aplicar
   a ofuscação um dia REINTRODUZ o defeito). */
console.log('SG4 · a cláusula de tempo recusa sem marcar o jogador (sem _flag / fn_f9c)');
/* TRÊS arquivos, e o terceiro é o que salva o conserto de morrer sozinho: o
   `opcional/012` é cópia byte-a-byte do `submit_match` com os nomes trocados. Se ele
   ficar para trás, aplicar a ofuscação um dia REINTRODUZ o #87 — e ninguém ligaria uma
   coisa na outra seis meses depois. */
const ALVOS = [
  { arq: 'supabase/schema.sql', flag: '_flag' },
  { arq: FONTE, flag: '_flag' },
  { arq: 'supabase/opcional/012_ofuscacao_schema.sql', flag: 'fn_f9c' },
];
let sg4Mediu = 0;
for (const { arq, flag } of ALVOS) {
  const p = path.join(DB, arq);
  if (!fs.existsSync(p)) { falhas.push(`SG4 ${arq}: arquivo não existe em ${DB} — a cláusula não tem onde ser lida`); console.log(`   ${arq.padEnd(48)} AUSENTE`); continue; }
  /* COMENTÁRIO FORA ANTES DE PROCURAR — e isto é conserto de INSTRUMENTO, não zelo.
     Na primeira corrida o SG4 reprovou o próprio 015: o cabeçalho dele cita o código
     ANTIGO (`p_seconds < p_rounds * 80` e `_flag(p_nick)`) para explicar o defeito, e a
     régua leu a explicação como se fosse a cláusula viva. Régua que não distingue código
     de comentário mede prosa. (Limite conhecido: tira `--` em qualquer posição; nenhum
     literal destes arquivos contém `--`, e se algum passar a conter, isto aqui é o
     primeiro lugar a olhar.) */
  const txt = semComentario(fs.readFileSync(p, 'utf8'));
  /* Recorta o bloco da cláusula de tempo: do `if` que fala de p_seconds até o `end if`.
     Ler o arquivo inteiro daria falso positivo — as OUTRAS cláusulas mantêm o strike de
     propósito, e é certo que mantenham. */
  const i = txt.search(/if\s+p_rounds\s*>\s*0[\s\S]{0,200}?p_seconds/);
  if (i < 0) { falhas.push(`SG4 ${arq}: não achei a cláusula de tempo — ela foi renomeada ou sumiu`); console.log(`   ${arq.padEnd(48)} CLÁUSULA NÃO ENCONTRADA`); continue; }
  const fim = txt.indexOf('end if;', i);
  let bloco = txt.slice(i, fim < 0 ? i + 400 : fim);
  if (MUT === 'comflag') bloco += `\n    perform public.${flag}(p_nick);`;   // devolve o strike
  const temFlag = new RegExp(`\\b${flag}\\s*\\(`).test(bloco);
  if (temFlag) falhas.push(`SG4 ${arq}: a cláusula de tempo ainda chama ${flag}() — regra com falso-positivo alimentando shadowban`);
  sg4Mediu++;
  console.log(`   ${arq.padEnd(48)} ${temFlag ? `CHAMA ${flag}()` : 'sem strike'}`);
}
console.log(`   arquivos medidos: ${sg4Mediu}/${ALVOS.length}\n`);

/* ═══ SG5 · MODO DESCONHECIDO CAI NO PISO BAIXO ══════════════════════════════════
   Quem tem JS em cache continua mandando payload SEM `mode` por dias — é o mesmo laço
   do `?v=` (lei 8 da bug-hunt: "40 commits não chegavam ao navegador"). Se o ramo
   DEFAULT do `case` for o piso alto, esse jogador continua sendo recusado exatamente
   como no #87, e a régua ficaria verde porque o cliente NOVO passa. Então a cláusula não
   pergunta "o piso está certo?", pergunta "qual ramo é o default?".

   A forma tem que ser  `case when p_mode = 'rounds' then 80 else <baixo> end`
   e NÃO                `case when p_mode = 'ctf' then 6 else 80 end`
   As duas dão o mesmo número para cliente novo. Só a primeira protege o cliente velho. */
console.log('SG5 · no SQL, o ramo DEFAULT do piso (modo desconhecido) é o piso BAIXO');
for (const { arq } of ALVOS) {
  const p = path.join(DB, arq);
  if (!fs.existsSync(p)) continue;
  const txt = semComentario(fs.readFileSync(p, 'utf8'));
  let m = txt.match(/case\s+when\s+p_mode\s*=\s*'([a-z]+)'\s*then\s*(\d+)\s*else\s*(\d+)\s*end/i);
  /* devolve o mundo em que o default é o alto: mesma conta pro cliente novo, cliente
     velho de volta ao #87 */
  if (m && MUT === 'defaultduro') m = [m[0], 'ctf', m[3], m[2]];
  if (!m) { falhas.push(`SG5 ${arq}: não achei o \`case\` do piso por modo — foi reescrito de outra forma`); console.log(`   ${arq.padEnd(48)} CASE NÃO ENCONTRADO`); continue; }
  const [, quando, alto, def] = m;
  const ok = quando === 'rounds' && Number(def) < Number(alto);
  if (!ok) falhas.push(`SG5 ${arq}: o default do piso é ${def} s (ramo explícito: ${quando}=${alto}) — cliente com JS em cache manda \`mode\` nulo e volta a ser recusado`);
  console.log(`   ${arq.padEnd(48)} when ${quando}=${alto} · default ${def}  ${ok ? 'ok' : 'DEFAULT DURO'}`);
}
console.log('');

/* ═══ SG6 · O TETO DE KILLS NÃO RECUSA O QUE O CAPTURA PRODUZ (issue #116) ═══════
   Palavras de quem reportou: *"stats não enviados: kills além do fisicamente
   possível. No final da partida eu estava com 95 kills e 6 mortes."* No CAPTURA a
   partida inteira são 2 rodadas (CTF_ROUNDS_TO_WIN), então o teto `45 * rounds`
   dava 90 — o modo fechar em 2 rodadas virou acusação de trainer. Mesma premissa
   errada do #87: a régua de kills nasceu do ABATE, onde rodada É uma janela.
   No CAPTURA o limitante físico é o RESPAWN_DELAY: ninguém mata mais que 1 por
   respawn, então o teto honesto é SEGUNDOS / respawn, não rounds × 45. */
console.log('SG6 · o teto de kills aceita partida de captura que o jogo produz');
const GAME = path.join(RAIZ, 'public/js/game.js');
const RESP = Number((fs.readFileSync(GAME, 'utf8').match(/RESPAWN_DELAY = ([\d.]+)/) || [])[1]);
if (!RESP) { falhas.push('SG6: não li RESPAWN_DELAY do game.js — a física do teto não tem fonte'); }
const ALVOS_KILLS = [
  { arq: 'supabase/schema.sql', flag: '_flag' },
  { arq: 'supabase/migrations/024_submit_guard_kills.sql', flag: '_flag' },
  { arq: 'supabase/opcional/012_ofuscacao_schema.sql', flag: 'fn_f9c' },
];
const CASO_116 = { kills: 95, rounds: 2, seconds: 480 };   // 95 kills · 2 rodadas · meia partida de 960 s
const IMPOSSIVEL = { kills: 150, rounds: 2, seconds: 30 }; // trainer: 5 kills/s sustentados
for (const { arq, flag } of ALVOS_KILLS) {
  const p = path.join(DB, arq);
  if (!fs.existsSync(p)) { console.log(`   ${arq.padEnd(48)} AUSENTE`); continue; }
  const txt = semComentario(fs.readFileSync(p, 'utf8'));
  const i = txt.search(/if\s+p_kills\s*>[\s\S]{0,400}?fisicamente/i);
  if (i < 0) { falhas.push(`SG6 ${arq}: não achei a cláusula do teto de kills — foi renomeada ou sumiu`); console.log(`   ${arq.padEnd(48)} CLÁUSULA NÃO ENCONTRADA`); continue; }
  const fim = txt.indexOf('end if;', i);
  let bloco = txt.slice(i, fim < 0 ? i + 400 : fim);
  if (new RegExp(`\\b${flag}\\s*\\(`).test(bloco)) falhas.push(`SG6 ${arq}: o teto de kills ainda chama ${flag}() — falso-positivo comprovado (#116) alimentando shadowban`);
  /* O teto sob teste: mutação devolve o mundo de `45 * rounds` puro. */
  const novo = bloco.match(/p_kills\s*>\s*greatest\(\s*45\s*\*\s*greatest\(p_rounds,\s*1\)\s*,\s*floor\(p_seconds\s*\/\s*([\d.]+)\s*\)\s*\)/);
  const velho = bloco.match(/p_kills\s*>\s*(\d+)\s*\*\s*greatest\(p_rounds,\s*1\)/);
  const teto = (c) => MUT === 'kills45'
    ? 45 * Math.max(c.rounds, 1)
    : (novo ? Math.max(45 * Math.max(c.rounds, 1), Math.floor(c.seconds / Number(novo[1]))) : Number(velho?.[1] ?? 0) * Math.max(c.rounds, 1));
  const recusaKills = (c) => c.kills > teto(c);
  if (novo && RESP && Number(novo[1]) < RESP) falhas.push(`SG6 ${arq}: divisor ${novo[1]} s/kill é MAIS APERTADO que o RESPAWN_DELAY ${RESP} s do jogo — o teto nega a física que ele dizia medir`);
  if (!novo && !velho) { falhas.push(`SG6 ${arq}: o teto de kills não está em nenhuma forma conhecida`); continue; }
  if (recusaKills(CASO_116)) falhas.push(`SG6 ${arq}: a partida REPORTADA na #116 (${CASO_116.kills} kills, ${CASO_116.rounds} rodadas de captura) é recusada — teto ${teto(CASO_116)}`);
  if (!recusaKills(IMPOSSIVEL)) falhas.push(`SG6 ${arq}: trainer de ${IMPOSSIVEL.kills} kills em ${IMPOSSIVEL.seconds} s PASSA — o teto não morde nada`);
  console.log(`   ${arq.padEnd(48)} ${novo ? `seconds/${novo[1]}` : `ANTIGO ${velho?.[1]}×rounds`} · caso #116 ${recusaKills(CASO_116) ? 'RECUSADO' : 'ok'} · impossível ${recusaKills(IMPOSSIVEL) ? 'recusado' : 'PASSA'}`);
}
console.log('');

/* ═══ SG2 / SG3 · A AMOSTRA ══════════════════════════════════════════════════════
   Cara (~10 min). Fica atrás de --amostra para o portão continuar sendo segundos; o
   número dela vive na entrada do KNOWN-BUGS.md com o comando que reproduz. */
function relogioVirtual() {
  /* `_endRound` → `_startRound` e as vinhetas passam por setTimeout. Sem relógio virtual
     a partida nunca troca de rodada no headless e a medição mede o nada. Mesmo padrão do
     `ui-check.mjs`. */
  const fila = []; let t = 0;
  const st0 = globalThis.setTimeout, ct0 = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms = 0) => { const h = { t: t + ms / 1000, fn }; fila.push(h); return h; };
  globalThis.clearTimeout = (h) => { const i = fila.indexOf(h); if (i >= 0) fila.splice(i, 1); };
  return {
    avanca(dt) { t += dt; for (let i = fila.length - 1; i >= 0; i--) if (fila[i].t <= t) { const h = fila.splice(i, 1)[0]; try { h.fn(); } catch {} } },
    solta() { globalThis.setTimeout = st0; globalThis.clearTimeout = ct0; },
  };
}

if (AMOSTRA) {
  const DT = 1 / 60, TETO = 700;
  const linhas = [];
  for (const id of IDS) {
    for (const seed of SEMENTES) {
      const relogio = relogioVirtual();
      seedRandom(seed);
      const g = new Game({
        renderer, textures, sfx, settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
        playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
        nickname: 'SIM', mapId: id, ctf: true, testMode: true, onQuit() {}, onMatchEnd() {},
      });
      g._ensureDolly = () => {};
      /* O PAYLOAD DE PRODUÇÃO, não uma reimplementação: pendura o mesmo `onMatchEnd` que o
         `main.js` pendura e usa o objeto que `game.js:2508` monta. Se o campo mudar de nome
         lá, esta régua para de medir e o portão avisa — que é o comportamento certo. */
      let payload = null;
      g.onMatchEnd = (s) => { payload = s; };
      g.start ? g.start() : g._startRound();
      /* SG3: o instante do PRIMEIRO fecho de rodada é o payload de abandono mais curto que
         o jogo consegue produzir — vencer a rodada e fechar a aba. */
      let abandono = null;
      const w0 = g._ctfWin.bind(g); g._ctfWin = (t) => { const r = w0(t); if (!abandono) abandono = { rounds: g.roundsWon.E + g.roundsWon.B, seconds: Math.round(g.time) }; return r; };
      const e0 = g._endRound.bind(g); g._endRound = () => { const r = e0(); if (!abandono) abandono = { rounds: g.roundsWon.E + g.roundsWon.B, seconds: Math.round(g.time) }; return r; };

      for (let i = 0; i < Math.round(TETO / DT); i++) {
        g.update(DT); relogio.avanca(DT);
        if (g.state === 'matchEnd') break;
      }
      relogio.solta();
      const rounds = payload ? payload.roundsP + payload.roundsB : g.roundsWon.E + g.roundsWon.B;
      const seconds = payload ? payload.seconds : null;
      linhas.push({ id, seed, rounds, seconds, abandono });
    }
  }

  const modo = 'ctf';
  console.log(`SG2 · nenhuma partida de captura jogada até o fim é recusada  (modo enviado: ${modo})`);
  console.log('   mapa                semente  rounds  seconds  s/round  veredito');
  const recusadas = [];
  for (const l of linhas) {
    if (l.seconds === null) { console.log(`   ${l.id.padEnd(18)} ${String(l.seed).padStart(7)}       —        —        —  não fechou no teto`); continue; }
    const r = recusa(l.rounds, l.seconds, modo);
    if (r) recusadas.push(l);
    console.log(`   ${l.id.padEnd(18)} ${String(l.seed).padStart(7)} ${String(l.rounds).padStart(7)} ${String(l.seconds).padStart(8)} ${(l.seconds / l.rounds).toFixed(1).padStart(8)}  ${r ? 'RECUSADA' : 'ok'}`);
  }
  const fechadas = linhas.filter((l) => l.seconds !== null);
  if (recusadas.length) falhas.push(`SG2: ${recusadas.length} de ${fechadas.length} partidas de captura LEGÍTIMAS foram recusadas`);
  console.log(`   recusadas: ${recusadas.length}/${fechadas.length}\n`);

  console.log('SG3 · o payload de ABANDONO (vencer a rodada e fechar a aba) não é recusado');
  const abandonos = linhas.map((l) => l.abandono).filter(Boolean);
  const abRec = abandonos.filter((a) => recusa(a.rounds, a.seconds, modo));
  const menor = abandonos.reduce((m, a) => (a.seconds / a.rounds < m.seconds / m.rounds ? a : m), abandonos[0] || { rounds: 1, seconds: 1e9 });
  console.log(`   ${abandonos.length} abandonos possíveis · o mais curto: rounds ${menor.rounds}, seconds ${menor.seconds} (${(menor.seconds / menor.rounds).toFixed(1)} s/rodada)`);
  if (abRec.length) falhas.push(`SG3: ${abRec.length} de ${abandonos.length} abandonos legítimos foram recusados`);
  console.log(`   recusados: ${abRec.length}/${abandonos.length}\n`);
} else {
  console.log('SG2/SG3 · PULADAS (rodam com --amostra, ~10 min). Os números da última corrida\n            estão no KNOWN-BUGS.md, com o comando que reproduz.\n');
}

if (falhas.length) {
  console.log(`✗ SUBMIT-GUARD  ${falhas.length} reprovação(ões):`);
  for (const f of falhas) console.log(`   ${f}`);
  process.exit(1);
}
console.log('✓ SUBMIT-GUARD  a trava recusa só o impossível, e recusa sem marcar ninguém');
process.exit(0);
