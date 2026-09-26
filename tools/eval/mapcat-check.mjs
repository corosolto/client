/* mapcat-check.mjs — O CATÁLOGO DE MAPA NÃO PODE MENTIR NA VITRINE.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   A classificação de mapa saiu do processo em TRÊS lugares: a ficha da tela de mapas
   (`#ms-cat`), o subtítulo do cartão (`catsDe(id).join('·')`) e as rotações de sala do
   multiplayer (`ehComunidade`). Ela é dado em `public/js/mapcat.js` — e dado sem régua
   apodrece calado, que foi o que o plans/26 (MA4) achou no planejamento:

     · `corrego` NASCEU sem entrada em MAP_CATS e caiu no fallback `catsDe = ['ARENA']`:
       a ficha dizia "ARENA" para um mapa chamado "Córrego (FAVELA DE SP)". Ninguém
       percebeu porque o fallback é silencioso por construção — o mesmo padrão de
       `resolveMapId` que o mapa-id-check fecha para id.
     · `amazonia` era `['FAVELA']` (pedido literal do dono: "amazonia nao é
       favela/comunidade"). Palafita de ribeirinho vendida como laje.

   O QUE ELA MEDE
     C1 · todo id do registro MAPS tem entrada PRÓPRIA em MAP_CATS — o fallback
          `['ARENA']` é para id desconhecido, não para mapa do catálogo.
     C2 · toda categoria usada existe em CAT_DESC — cat fantasma é badge sem tradução
          e aba quebrada; a tela escreve `CAT_DESC[cat]` e `tr(cat)`.
     C3 · todo id do registro tem MAP_AUTOR e MAP_DATA — a ficha e o servidor leem os
          dois, e autor vazio muda o mapa de aba (OFICIAIS × COMUNIDADE) sem aviso.
     C4 · eixo TEMA é mutuamente exclusivo (FAVELA × AMAZONIA × CIDADES): mapa com dois
          temas é classificação mentirosa — o bug que o dono apontou, generalizado.

   ONDE ELA NÃO OLHA, E POR QUÊ
     O registro MAPS é lido do FONTE de maps.js (mesma decisão do mapa-id-check):
     importar maps.js em node puxa os 20 builders e o three vendorizado. A leitura por
     regex cobre só a chave de topo do registro, que é contrato estável.

   AS MUTAÇÕES QUE PROVAM
     --mutante=sem-cats       remove a entrada de um mapa em memória (o bug do córrego)
     --mutante=cat-fantasma   injeta categoria sem CAT_DESC
     --mutante=sem-autoria    apaga MAP_AUTOR de um mapa
     --mutante=dois-temas     põe FAVELA+AMAZONIA no mesmo mapa
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { MAP_CATS, MAP_AUTOR, MAP_DATA, CAT_DESC } from '../../public/js/mapcat.js';

const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10);
const MUTANTES = ['sem-cats', 'cat-fantasma', 'sem-autoria', 'dois-temas'];
if (mutante && !MUTANTES.includes(mutante)) {
  console.error(`mutante desconhecido: ${mutante} (use ${MUTANTES.join(' · ')})`);
  process.exit(2);
}

/* ids do registro: chave de topo entre `export const MAPS = {` e o `};` que fecha. */
const fonte = readFileSync('public/js/maps.js', 'utf8');
const corpo = fonte.slice(fonte.indexOf('export const MAPS = {'));
const registro = corpo.slice(0, corpo.indexOf('\n};'));
const IDS_REGISTRO = [...registro.matchAll(/^  ([a-z_0-9]+): \{/gm)].map((m) => m[1]);
if (!IDS_REGISTRO.length) {
  console.error('✗ leitura do registro MAPS não achou nenhum id — a regex do check envelheceu');
  process.exit(2);
}

const cats = structuredClone(MAP_CATS);
const autor = { ...MAP_AUTOR };
const desc = { ...CAT_DESC };

if (mutante === 'sem-cats') delete cats[IDS_REGISTRO.find((id) => cats[id])];
if (mutante === 'cat-fantasma') cats[IDS_REGISTRO[0]] = [...cats[IDS_REGISTRO[0]], 'INEXISTENTE'];
if (mutante === 'sem-autoria') delete autor[IDS_REGISTRO.find((id) => autor[id])];
if (mutante === 'dois-temas') cats.quebrada = ['FAVELA', 'AMAZONIA'];

const TEMAS = ['FAVELA', 'AMAZONIA', 'CIDADES'];
const falhas = [];

/* C1 — cobertura: nenhum mapa do catálogo vive do fallback ['ARENA']. */
for (const id of IDS_REGISTRO) {
  if (!cats[id]) falhas.push(`C1 ${id}: sem entrada em MAP_CATS — a ficha mostra o fallback ARENA calado (o bug do córrego).`);
}
/* C2 — categoria usada existe em CAT_DESC (badge, aba e tradução leem daqui). */
for (const [id, lista] of Object.entries(cats)) {
  for (const c of lista) {
    if (!(c in desc)) falhas.push(`C2 ${id}: categoria '${c}' não tem CAT_DESC — badge sem texto e sem tradução.`);
  }
}
/* C3 — autoria e data cobrem o registro inteiro. */
for (const id of IDS_REGISTRO) {
  if (!autor[id]) falhas.push(`C3 ${id}: sem MAP_AUTOR — a ficha herda o autor da casa e o mapa muda de aba sem aviso.`);
  if (!MAP_DATA[id]) falhas.push(`C3 ${id}: sem MAP_DATA — a ficha e o servidor leem a data de lançamento.`);
}
/* C4 — um mapa, um tema. */
for (const [id, lista] of Object.entries(cats)) {
  const temas = lista.filter((c) => TEMAS.includes(c));
  if (temas.length > 1) falhas.push(`C4 ${id}: dois temas (${temas.join(' + ')}) — classificação mentirosa, o mapa não é os dois.`);
}

if (falhas.length) {
  falhas.forEach((f) => console.error(`✗ ${f}`));
  console.error(`\nMAPCAT-CHECK REPROVOU: ${falhas.length} falha(s) em ${IDS_REGISTRO.length} mapas do registro.`);
  process.exit(1);
}
console.log(`MAPCAT-CHECK ✓ ${IDS_REGISTRO.length} mapas do registro: cats próprias, conhecidas, com autoria/data e um tema cada.`);
