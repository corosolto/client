/* paleta.js — A COR DE FACÇÃO, NUM LUGAR SÓ.
   ═══════════════════════════════════════════════════════════════════════════════════
   O DEFEITO QUE COMPROU ESTE MÓDULO (07/08)

   O dono, jogando: *"o time é quando captura bandeira não pinta de vermelho e nem põe o
   brasão."* O rename Time E (06/08) trocou `P` por `E` no `BRASAO` de `brasoes.js` e no
   arquivo (`img/brasoes/p.png` -> `e.png`) e ESQUECEU a linha de cima, `COR_TIME`. Com
   `COR_TIME['E']` indefinido, `bandeiraTextura('E')` saía por `!cor` na primeira linha e
   devolvia `null`: bandeira sem cor E sem brasão, os dois sintomas de uma causa só.

   E não era um lugar. O mesmo rename passou batido em mais dois espelhos, com sintoma
   diferente cada um, e NENHUM dos três dá erro no console:

     characters.js  TEAM_RIM        sem `E` -> contorno BRANCO (`|| 0xffffff`)
     characters.js  faixa do peito  sem `E` -> cai no último ramo do ternário e sai AZUL

   ── POR QUE UM MÓDULO, E NÃO MAIS UMA RÉGUA ─────────────────────────────────────
   Já havia DUAS réguas guardando o espelho — o F1/F2 do `faccao-paleta-check.mjs` e o C3
   do `brasao-check.mjs`. Duas réguas para um fato duplicado é o preço da duplicação, não
   a cura dela: elas conseguem acusar a divergência DEPOIS que alguém a escreve, e é isso
   que aconteceu — o defeito chegou em produção e o dono achou antes do portão.

   O comentário antigo de `brasoes.js:41-46` justificava o espelho assim: *"o original é
   MÉTODO DE INSTÂNCIA da classe `Game` (depende de `_mirror`/`_factionOf`, que são estado
   de partida), então não há o que importar."* A observação estava certa e a conclusão não.
   O que depende de estado de partida é **qual facção está de cada lado** — isso continua
   no `Game`. A cor DE uma facção não depende de partida nenhuma, e é só isso que mora
   aqui.

   ── POR QUE ESTE ARQUIVO NÃO IMPORTA NADA ───────────────────────────────────────
   De propósito. Ele é importado por `game.js`, `brasoes.js` e `characters.js`; qualquer
   import aqui vira aresta a mais no grafo de módulos e abre risco de ciclo justo no
   caminho de boot. Cores são strings — `three` não é necessário. Quem quer número
   (`0xff5555`) chama `num()`.
   ═══════════════════════════════════════════════════════════════════════════════════ */

/* As facções que têm cor própria, na ordem em que o elenco as declara.
   Facção fora desta lista cai no NEUTRO, nunca em `undefined` — foi o `undefined` que
   apagou a bandeira em 07/08. */
export const FACCOES = ['E', 'B', 'U', 'C', 'F'];

/* Três tons por facção, e cada um existe por um motivo medido:

     base    · cor cheia — anel/bandeira/HUD/radar/killfeed, e o rim do personagem.
     escura  · pano da bandeira e faixa do peito: o mesmo matiz com menos luz, para o
               brasão claro por cima continuar legível.
     palida  · SÓ para TEXTO sobre chip tingido (killfeed). O chip é a própria cor a 18%
               (`background:${cor}2e`); a cor cheia por cima dava 3,85:1 na linha "VOCÊ
               morreu" — abaixo dos 4,5:1 da WCAG 1.4.3, medido em `ui-check.mjs` (UI1).
               A versão pálida passa a 5,9-9,1:1 e mantém a leitura "vermelho = time-e".

   Os valores são exatamente os que já estavam espalhados: nenhum pixel muda ao unificar. */
export const PALETA = {
  E: { base: '#ff5555', escura: '#e03232', palida: '#ff9a9a' },   // Time E vermelho
  B: { base: '#55dd66', escura: '#1faa4d', palida: '#a9f0b6' },   // Time B verde
  U: { base: '#4aa3ff', escura: '#2f7fe0', palida: '#a8cdff' },   // Tribos azul
  C: { base: '#ff6ec7', escura: '#c23a86', palida: '#ffb3e0' },   // Palhaços rosa-circo
  F: { base: '#ffc233', escura: '#c79a12', palida: '#ffd98a' },   // Funkeiros ouro
};

/* ESPELHO — inimigo da MESMA facção do jogador. Não é cor de facção: é o roxo que existe
   para os dois lados não ficarem da mesma cor quando a partida é facção contra ela mesma.
   Fica aqui porque quem escolhe a cor do lado precisa dos dois no mesmo lugar. */
export const ESPELHO = { base: '#a05cff', escura: '#6a2fb5', palida: '#cbaaff' };

/* NEUTRO — facção desconhecida. O `escura` ser mais CLARO que o `base` está invertido em
   relação às cinco facções; é assim desde sempre no `_teamColor` e está preservado ao pé
   da letra porque unificar paleta não é hora de mudar pixel. Se for defeito, é conserto
   com régua própria. */
export const NEUTRO = { base: '#999999', escura: '#aaaaaa', palida: '#d6d6d6' };

/** Tons de uma facção. Facção desconhecida (ou ausente) devolve NEUTRO, nunca undefined. */
export function tons(faccao) { return PALETA[faccao] || NEUTRO; }

/** '#ff5555' -> 0xff5555, para quem fala com o three (`new THREE.Color`, rim, faixa). */
export function num(hex) { return parseInt(String(hex).slice(1), 16); }

/** Mapa `{ facção: base }` — o formato que `COR_TIME`/`CORES_BANDEIRA` sempre teve. */
export const BASE_POR_FACCAO = Object.fromEntries(FACCOES.map((f) => [f, PALETA[f].base]));
