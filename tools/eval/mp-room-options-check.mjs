/* MP-ROOM-OPTIONS-CHECK — o formulário de criar sala entrega o tamanho do time.
   ═══════════════════════════════════════════════════════════════════════════════════
   O QUE ESTA RÉGUA EXISTE PARA VIGIAR (relato do jogador, 21/09)

   "queria tirar x1 com meu amigo e não encontrei um jeito de tirar os bots no mata
   mata, ou escolher quantos bots queremos em cada time". O servidor passou a aceitar
   `teamSize` no POST /rooms (backend PR #29, clamp 1–8, padrão 5); esta régua cobra o
   LADO DO CLIENTE: o formulário de CRIAR sala tem o seletor, a opção X1 existe e é
   legível como "só gente", o padrão continua 5 (retrocompat), e o cfg do createRoom
   LEVA o valor escolhido. O JOGO RÁPIDO não leva (sala cheia de gente é o critério
   dele; o servidor default 5 vale).

   É régua de WIRING de fonte (mesma classe do screenquery-check): o semântico fim a
   fim — 1×1 com dois humanos e zero bots — é do smoke do backend, que sobe o processo
   de verdade.

   MUTANTES (todos têm que deixar isto vermelho):
     --mutante=sem-campo    tira o teamSize do cfg do createRoom
     --mutante=fixo         crava teamSize: 5 (o defeito original, disfarçado de opção)
     --mutante=sem-x1       remove a opção value="1" do seletor
     --mutante=p incentivada  muda o selected para 1 (muda o padrão sem decisão do dono)

   USO: npm run eval:mpRoomOptions
        node tools/eval/mp-room-options-check.mjs --mutante=sem-campo
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && !['sem-campo', 'fixo', 'sem-x1', 'padrao-1'].includes(MUT)) {
  console.error(`mutante desconhecido: ${MUT}`); process.exit(2);
}

let astro = readFileSync(join(ROOT, 'src/pages/index.astro'), 'utf8');
let main = readFileSync(join(ROOT, 'public/js/main.js'), 'utf8');

if (MUT === 'sem-x1') astro = astro.replace(/<option value="1">[^<]*<\/option>\n/, '');
if (MUT === 'padrao-1') astro = astro.replace('value="5" selected', 'value="1" selected');

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };

/* 1 · o seletor existe DENTRO do formulário de criar sala */
const formCriar = astro.slice(astro.indexOf('mp-criar'), astro.indexOf('mp-criar') + 4000);
cobra(/id="mp-teamsize"/.test(formCriar), 'MRO1 · o form de CRIAR sala tem o seletor #mp-teamsize');

/* 2 · a opção X1 existe e diz que é só gente (o relato pedia exatamente isso) */
cobra(/<option value="1">[^<]*SEM BOTS/i.test(formCriar), 'MRO2 · a opção 1 se apresenta como X1 SEM BOTS');

/* 3 · faixa completa 1–8 e padrão 5 (retrocompat: sala sem escolha segue 5×5 no servidor) */
for (const n of ['1', '2', '3', '4', '5', '6', '7', '8']) {
  cobra(new RegExp(`<option value="${n}"`).test(formCriar), `MRO3 · faixa 1–8 completa (faltou ${n})`);
}
cobra(/value="5"( selected| selected)?/.test(formCriar) && /value="5"\s*selected/.test(formCriar),
  'MRO3b · o padrão do seletor é 5 (o comportamento de antes)');

/* 4 · o cfg do createRoom LEVA o valor (é aqui que o wiring morria) */
if (MUT === 'sem-campo') main = main.replace(/teamSize: [^,\n]+,\n(\s*)\/\/ teamSize do criador[^\n]*\n/, '').replace(/,\s*teamSize: \+mpEl\('mp-teamsize'\)\.value \|\| 5/, ',');
if (MUT === 'fixo') main = main.replace("teamSize: +mpEl('mp-teamsize').value || 5", 'teamSize: 5');
const noCriar = main.slice(main.indexOf('mp-criar'));
cobra(/createRoom\(/.test(main) && /teamSize:\s*\+mpEl\('mp-teamsize'\)\.value/.test(main.slice(main.indexOf('const criar'), main.indexOf('const criar') + 3500)),
  'MRO4 · o cfg do createRoom envia teamSize lido do seletor');

/* 5 · o JOGO RÁPIDO não envia teamSize (não é ele quem decide tamanho) */
const quick = main.slice(main.indexOf("mp-quick'"), main.indexOf("mp-quick'") + 2200);
cobra(!/teamSize/.test(quick), 'MRO5 · o JOGO RÁPIDO segue sem teamSize (padrão do servidor)');

if (falhas.length) {
  console.error(`✗ MP-ROOM-OPTIONS — ${falhas.length} cláusula(s):`);
  for (const f of falhas) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('✓ MP-ROOM-OPTIONS: seletor de tamanho de time no criar-sala, X1 legível, padrão 5, cfg com teamSize, quick sem teamSize');
