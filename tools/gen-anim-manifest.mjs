/* GERA public/models/anims/index.json — quais personagens têm clipe RETARGETADO PRÓPRIO.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTE ARQUIVO EXISTE

   O dono reportou "vários erros no console". Medido: **88 requisições 404 por
   carregamento de partida**, todas em `models/anims/<id>/<clipe>.glb`. Causa: o
   `glbchars.js` pedia os 11 clipes de TODO personagem e engolia a falha (`catch` vazio,
   fallback para o pack compartilhado). 8 dos 44 personagens — os 8 palhaços — nunca
   tiveram pasta: 8 × 11 = 88 pedidos que só podiam falhar.

   Página estática não lista diretório pelo browser (mesmo raciocínio do BUG-08 e do
   `gen-audio-manifest.mjs`): quem sabe o que existe é o build. Este tool escreve o
   índice; o `glbchars.js` lê antes de pedir. Clipe novo na pasta = um comando.

   POR QUE NÃO GERAR OS 88 CLIPES QUE FALTAM (a outra saída, MEDIDA E DESCARTADA)
   `docs/historico/plans/02-BOTS-E-MODELS.md:285` prevê "B7: rodar retarget-glb.mjs para os Palhaços".
   Rodado. O retarget é um NO-OP para essa família:

     desvio angular do clipe retargetado × pack compartilhado (walk, por osso, máximo)
       palhacomal (rig doador mst)   0,13°   médio 0,03°
       raul       (rig doador mst)   0,13°   médio 0,03°
       mst        (o próprio doador) 0,13°   médio 0,03°
       doutora    (rig Meshy próprio)  170,89°  médio 37,42°   <- aqui o retarget PAGA
       ancap      (rig Meshy próprio)  168,01°  médio 40,76°

   E `pose-inflate.mjs palhacomal` dá **0,689 / 17,4 %** com pasta e **0,689 / 17,4 %**
   sem pasta — idêntico nas 3 casas. Os 8 palhaços foram auto-skinnados a partir do
   esqueleto do `mst` (tools/rig-from-donor.mjs), que é o mesmo contra o qual o pack
   compartilhado foi assado, então re-assar não move um vértice. Gerar 88 GLB (~3,6 MB)
   para não mudar nada é peso morto contra o teto de 250 MB da CrazyGames.
   O "palhaço esquisito" é a qualidade do auto-skin (BUG-10/BUG-25, exige rig novo),
   não a origem do clipe — e isso está medido lá, não aqui.

   uso: node tools/gen-anim-manifest.mjs [--check] [--mutante=<nome>]
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ANIMS = 'public/models/anims';
const SAIDA = path.join(ANIMS, 'index.json');
const GLBCHARS = 'public/js/glbchars.js';
const CHECK = process.argv.includes('--check');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';

// Os estados vêm do jogo, não de uma cópia: se alguém acrescentar um clipe ao STATES e
// esquecer do manifesto, o índice tem que acompanhar sozinho.
let fonte = fs.readFileSync(GLBCHARS, 'utf8');
// mutações que provam que a A3 morde: desfazem, na leitura, o conserto que ela guarda.
if (MUT === 'semguarda') fonte = fonte.replace(/\n\s*if \(disponiveis && !disponiveis\.includes\(s\)\) return;.*/, '');
if (MUT === 'semfetch') fonte = fonte.replace(/models\/anims\/index\.json/g, 'models/anims/NADA.json');
const listaDe = (nome) => {
  const m = fonte.match(new RegExp(`const ${nome} = \\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/'([a-z0-9]+)'/gi)].map((x) => x[1]) : [];
};
const STATES = listaDe('STATES');
const OPT_STATES = listaDe('OPT_STATES');
if (!STATES.length) { console.error('não achei STATES em', GLBCHARS); process.exit(1); }

const dirs = fs.readdirSync(ANIMS).filter((f) => fs.statSync(path.join(ANIMS, f)).isDirectory()).sort();
const clipes = {};
for (const d of dirs) {
  const tem = [...STATES, ...OPT_STATES].filter((s) => fs.existsSync(path.join(ANIMS, d, `${s}.glb`)));
  if (tem.length) clipes[d] = tem;
}
if (MUT === 'sobrando') clipes.palhacomal = [...STATES];        // manifesto promete o que o disco não tem
if (MUT === 'faltando') delete clipes[Object.keys(clipes)[0]];  // manifesto esconde o que o disco tem

const idx = { estados: STATES, opcionais: OPT_STATES, clipes };
const texto = JSON.stringify(idx, null, 1) + '\n';

/* ── CLÁUSULAS ────────────────────────────────────────────────────────────────────── */
const falhas = [];

// A1 — o manifesto no disco é o que este gerador produziria (não envelheceu).
if (CHECK) {
  const atual = fs.existsSync(SAIDA) ? fs.readFileSync(SAIDA, 'utf8') : '';
  if (atual !== texto) falhas.push(`A1 manifesto DEFASADO: ${SAIDA} != gerado. Rode \`npm run anims\`.`);
}

// A2 — tudo que o manifesto promete existe no disco.
for (const [id, sts] of Object.entries(clipes)) {
  for (const s of sts) {
    if (!fs.existsSync(path.join(ANIMS, id, `${s}.glb`))) falhas.push(`A2 ${id}/${s}.glb no manifesto e NÃO no disco`);
  }
}

/* A4 — o que o manifesto promete tem que estar VERSIONADO, não só existir nesta máquina.
   Achado medindo isto: 10 pastas (chave, criarj, fluxo, funkraiz, mandrake, oakley,
   ostentacao, pagodeiro, raul, trapfunk) tinham **1 de 11 clipes** no git — só o
   `idle1h.glb`. Num clone limpo ou no deploy, os outros 10 clipes de cada uma somam
   **100 novos 404** e os 10 personagens caem no pack compartilhado sem ninguém saber.
   Manifesto gerado do DISCO local promete o que a produção não tem: a A2 (existe no
   disco) passa verde e o jogador continua vendo o defeito. É a mesma armadilha do C3 do
   HANDOFF, agora com número. */
{
  let versionados = null;
  try {
    versionados = new Set(execSync('git ls-files public/models/anims', { encoding: 'utf8' }).split('\n').filter(Boolean));
  } catch { /* fora de um repo git: cláusula não se aplica */ }
  if (versionados && versionados.size) {
    const fora = [];
    for (const [id, sts] of Object.entries(clipes)) {
      for (const s of sts) if (!versionados.has(`${ANIMS}/${id}/${s}.glb`)) fora.push(`${id}/${s}`);
    }
    if (MUT === 'semgit') fora.push('mutante/forjado');
    if (fora.length) {
      const porChar = [...new Set(fora.map((f) => f.split('/')[0]))];
      falhas.push(`A4 ${fora.length} clipes do manifesto NÃO estão versionados (${porChar.length} personagens: ${porChar.join(', ')}) — ` +
        `existem nesta máquina e vão dar 404 no deploy. \`git add public/models/anims\`.`);
    }
  }
}

// A3 — o glbchars.js CONSULTA o manifesto antes de pedir o clipe por personagem.
//      Sem esta cláusula o manifesto poderia ficar perfeito e o jogo continuar
//      disparando os 88 404 — que é exatamente o defeito que ele veio matar.
{
  const bloco = fonte.slice(fonte.indexOf('preloadCharacterAssets'));
  const consulta = /animIndex\s*\(/.test(bloco) && /models\/anims\/index\.json/.test(fonte);
  // o pedido do clipe por personagem tem que estar DEPOIS de uma checagem de disponibilidade
  const pede = bloco.indexOf('models/anims/${id}/${s}.glb');
  const guarda = bloco.search(/if \(\s*(disp|disponiveis|temClipe)/);
  if (!consulta) falhas.push('A3 glbchars.js NÃO busca models/anims/index.json (o manifesto existe e ninguém lê)');
  else if (pede >= 0 && (guarda < 0 || guarda > pede)) falhas.push('A3 glbchars.js pede o clipe SEM guarda de disponibilidade antes');
}

/* ── SAÍDA ───────────────────────────────────────────────────────────────────────── */
const comClipe = Object.keys(clipes).length;
const semClipe = 44 - comClipe;   // informativo; o número exato de chars vem do characters.js
if (CHECK || MUT) {
  console.log(`ANIM-MANIFEST: ${comClipe} pastas com clipe próprio, ${STATES.length}+${OPT_STATES.length} estados`);
  if (falhas.length) { for (const f of falhas) console.error('  ✗', f); process.exit(1); }
  console.log('  ✓ manifesto em dia, tudo que promete existe, e o jogo o consulta antes de pedir');
} else {
  fs.writeFileSync(SAIDA, texto);
  console.log(`-> ${SAIDA} (${comClipe} personagens com clipe próprio)`);
  if (falhas.filter((f) => !f.startsWith('A1')).length) { for (const f of falhas) console.error('  ✗', f); process.exit(1); }
}
