/*
  GRAFFITI-EDITORIAL — arte assada dos mapas novos respeita os vetos editoriais.

  Procedência da régua: AGENTS.md, "Vetos do dono": nenhum asset com copyright e
  nenhuma pessoa real. A revisão adversarial de 11/08/2026 encontrou dois caminhos
  que os gates geométricos não mediam: `poster:DOLLYNHO.png` em Escadão/Lajes/
  Córrego e `homenagem-*` de artistas reais no Córrego.

  Mede os dois lados do contrato:
    1. `graffiti_layout.js`, que é o que o jogo realmente desenha;
    2. `textures.js`, pool-fonte que recriaria o defeito na próxima assada.

  Mutantes (provam que a régua morde sem editar o repositório):
    --mutante=dollynho   injeta o mascote no layout
    --mutante=pessoa     injeta uma homenagem real no layout
    --mutante=rick       injeta o decal que leu como personagem protegido em Lajes
    --mutante=carros     injeta os IDs de três carros protegidos na Mansão
    --mutante=morte      injeta o pixo MORTE no layout assado da Mansão
    --mutante=semcidade  injeta decal do pack pixo SEM o metadado cidade
    --mutante=cidadefora injeta decal do pack com cidade fora de SP|RJ
    --mutante=writer     injeta decal cujo nome é assinatura de writer real

  Cláusulas da frente F (v2.1, plans/13): todo decal do pack novo (`or-pixo-*`)
  declara `cidade` ('SP'|'RJ') como 5º campo do DECAL_FILES — a distinção de
  estilo vem da pesquisa em references/graffiti/PIXACAO-SP-RJ.md. E nenhum decal
  do pool nomeia writer/grife real: estilo, nunca assinatura (linha editorial).
*/
import { readFileSync } from 'node:fs';
import { GRAFITE } from '../../public/js/graffiti_layout.js';

const NOVOS = ['escadao', 'campomorro', 'lajes', 'corrego', 'mansao'];
const MUT = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1];
const layouts = JSON.parse(JSON.stringify(GRAFITE));
let lajesFonte = readFileSync('public/js/map_lajes.js', 'utf8');
const corregoFonte = readFileSync('public/js/map_corrego.js', 'utf8');
const substituicoesLajes = ['folha-person-01.png','personagens-graffiti-01.png','folha-person-02.png'];
const substituiRick = substituicoesLajes.every((id) => lajesFonte.includes(`'${id}': 'or-mitico-mural.png'`));
if (substituiRick) layouts.lajes.arquivos = layouts.lajes.arquivos
  .map((nome) => substituicoesLajes.includes(nome) ? 'or-mitico-mural.png' : nome);
const substituicoesCorrego = new Map([
  ['folha-person-02.png','or-mitico-mural.png'],
  ['personagens-graffiti-01.png','or-mitico-mural.png'],
  ['poster:despisque-leao.jpg','poster:or-quebrada-vive.jpg'],
  ['poster:ashtar-meme.jpg','poster:or-quebrada-vive.jpg'],
  ['poster:ashtar.png','poster:or-quebrada-vive.jpg'],
  ['personagens-graffiti-02.png','or-graf-treta.png'],
  ['personagens-graffiti-03.png','or-graf-treta.png'],
]);
const substituiCorrego = [...substituicoesCorrego].every(([a,b]) => corregoFonte.includes(`'${a}': '${b}'`));
if (substituiCorrego) layouts.corrego.arquivos = layouts.corrego.arquivos
  .map((nome) => substituicoesCorrego.get(nome) || nome);

if (MUT === 'dollynho') layouts.campomorro.arquivos.push('poster:DOLLYNHO.png');
if (MUT === 'pessoa') layouts.mansao.murais.push(['homenagem-pessoa-real', 0, 2, 0, 0, 5.4, 2.8]);
if (MUT === 'morte') layouts.mansao.arquivos.push('folha-pixaca-01.png');
if (MUT === 'rick') layouts.lajes.arquivos.push('folha-person-01.png');
if (MUT === 'popeye') layouts.lajes.arquivos.push('personagens-graffiti-01.png');
if (MUT === 'religioso-vulgar') layouts.corrego.arquivos.push('poster:despisque-leao.jpg');
if (MUT === 'putin') layouts.corrego.arquivos.push('poster:ashtar-meme.jpg');
if (MUT === 'rostos-carecas') layouts.corrego.arquivos.push('personagens-graffiti-02.png');

const falhas = [];
if (!substituiRick) falhas.push('map_lajes.js: substituição nominal do decal protegido ausente');
if (!substituiCorrego) falhas.push('map_corrego.js: substituições nominais dos decals vetados ausentes');
if (/const D_PERSO\s*=\s*decalIds\([^;]*folha-person-01\.png/s.test(lajesFonte))
  falhas.push('map_lajes.js: decal protegido permanece no pool vivo D_PERSO');
for (const id of ['personagens-graffiti-01.png', 'folha-person-02.png']) {
  if (lajesFonte.includes(`'${id}'`) && !lajesFonte.includes(`'${id}': 'or-mitico-mural.png'`))
    falhas.push(`map_lajes.js: decal ${id} ainda pode ler como marinheiro/personagem protegido`);
}
for (const id of ['folha-person-02.png', 'poster:despisque-leao.jpg', 'poster:ashtar-meme.jpg'])
  if (corregoFonte.includes(`'${id}'`) && !corregoFonte.includes(`'${id}': 'or-mitico-mural.png'`) && !corregoFonte.includes(`'${id}': 'poster:or-quebrada-vive.jpg'`))
    falhas.push(`map_corrego.js: decal editorial vetado ${id}`);
for (const id of NOVOS) {
  const layout = layouts[id];
  if (!layout) { falhas.push(`${id}: layout ausente`); continue; }
  const protegidos = (layout.arquivos || []).filter((nome) => /DOLLYNHO/i.test(nome));
  const pessoas = (layout.murais || []).filter((mural) => /^homenagem-/i.test(String(mural?.[0])));
  /* O veto do MORTE na Mansão vale para o ASSADO também: a fonte foi limpa em
     12/08 mas o layout fóssil seguiu com 18 peças do pixo até 14/08, porque o
     gerador preservava entrada de mapa sem passada. */
  const morteAssado = id === 'mansao'
    ? (layout.arquivos || []).filter((nome) => nome === 'folha-pixaca-01.png') : [];
  const personagensProtegidos = id === 'lajes'
    ? (layout.arquivos || []).filter((nome) => ['folha-person-01.png','personagens-graffiti-01.png','folha-person-02.png'].includes(nome)) : [];
  const religiososVulgares = id === 'corrego'
    ? (layout.arquivos || []).filter((nome) => nome === 'poster:despisque-leao.jpg') : [];
  const pessoasReais = id === 'corrego'
    ? (layout.arquivos || []).filter((nome) => ['poster:ashtar-meme.jpg','poster:ashtar.png'].includes(nome)) : [];
  const rostosHumanos = id === 'corrego'
    ? (layout.arquivos || []).filter((nome) => ['personagens-graffiti-02.png','personagens-graffiti-03.png'].includes(nome)) : [];
  if (protegidos.length) falhas.push(`${id}: ${protegidos.join(', ')}`);
  if (pessoas.length) falhas.push(`${id}: ${pessoas.map((m) => m[0]).join(', ')}`);
  if (morteAssado.length) falhas.push(`${id}: pixo MORTE assado no layout (folha-pixaca-01.png)`);
  if (personagensProtegidos.length) falhas.push(`${id}: ${personagensProtegidos.join(', ')} lê como personagem protegido`);
  if (religiososVulgares.length) falhas.push(`${id}: ${religiososVulgares.join(', ')} tem teor religioso/vulgar vetado`);
  if (pessoasReais.length) falhas.push(`${id}: ${pessoasReais.join(', ')} contém retrato reconhecível de pessoa real`);
  if (rostosHumanos.length) falhas.push(`${id}: ${rostosHumanos.join(', ')} repete rosto humano no skyline`);
}

const fonte = readFileSync('public/js/textures.js', 'utf8');
let fontePixo = fonte;
if (MUT === 'semcidade') fontePixo += "\n    ['or-pixo-sp-mutante.png', 1.2, 'tag', 0],";
if (MUT === 'cidadefora') fontePixo += "\n    ['or-pixo-rj-mutante.png', 1.2, 'tag', 0, 'MG'],";
if (MUT === 'writer') fontePixo += "\n    ['or-pixo-rj-vinga.png', 1.2, 'tag', 0, 'RJ'],";
/* Writers/grifes reais documentados na pesquisa SP×RJ — aparecem em
   references/graffiti/PIXACAO-SP-RJ.md como DOCUMENTAÇÃO, nunca como decal. */
const WRITERS_REAIS = ['vinga', 'tane', 'gemeos', 'osgemeos', 'kobra', 'cripta', 'djan', 'acme', 'taki'];
const pixoNovos = [];
for (const m of fontePixo.matchAll(/\['(or-pixo-[^']+)'\s*,\s*[\d.]+\s*,\s*'(\w+)'\s*,\s*[01]\s*(?:,\s*'([A-Z]{2})')?\s*\]/g)) {
  pixoNovos.push(m[1]);
  if (!m[3]) falhas.push(`textures.js: ${m[1]} do pack pixo sem metadado cidade (5º campo SP|RJ)`);
  else if (!['SP', 'RJ'].includes(m[3])) falhas.push(`textures.js: ${m[1]} com cidade '${m[3]}' — só SP ou RJ`);
}
for (const m of fontePixo.matchAll(/\['([^']+\.(?:png|jpe?g|webp))'\s*,/g)) {
  const slug = m[1].toLowerCase().replace(/\.\w+$/, '');
  for (const w of WRITERS_REAIS) {
    if (new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(slug))
      falhas.push(`textures.js: ${m[1]} nomeia writer real (${w}) — estilo, nunca assinatura`);
  }
}
let mansaoFonte = readFileSync('public/js/map_mansao.js', 'utf8');
if (MUT === 'carros') mansaoFonte += "\n'2020_bmw_m8_coupe' '1965_ford_mustang_coupe_289' '1981_dmc_delorean'\n";
if (MUT === 'vw') {
  lajesFonte += "\n'fusca' 'saveiro'\n";
}
if (/\['DOLLYNHO\.png'\s*,/.test(fonte)) falhas.push('textures.js: DOLLYNHO permanece no POSTER_FILES');
for (const id of ['ashtar-meme.jpg','ashtar.png']) if (fonte.includes(`['${id}',`)) falhas.push(`textures.js: ${id} com pessoa real permanece no POSTER_FILES`);
if (/const D_MURAL\s*=\s*decalIds\([^;]*personagens-graffiti-0[23]\.png/s.test(corregoFonte))
  falhas.push('map_corrego.js: rostos humanos permanecem no pool vivo D_MURAL');
const pessoasFonte = fonte.match(/const MURAIS_HOM\s*=\s*\[([^\]]*[a-z][^\]]*)\]/s);
if (pessoasFonte) falhas.push('textures.js: MURAIS_HOM ainda contém pessoas reais');
for (const id of ['2020_bmw_m8_coupe', '1965_ford_mustang_coupe_289', '1981_dmc_delorean'])
  if (mansaoFonte.includes(id)) falhas.push(`map_mansao.js: carro protegido ${id}`);
for (const id of ['fusca', 'saveiro']) if (lajesFonte.includes(`'${id}'`)) falhas.push(`map_lajes.js: veículo reconhecível ${id}`);
if (/folha-pixaca-01\.png/.test(mansaoFonte)) falhas.push('map_mansao.js: pixo MORTE permanece no pool vivo');

console.log('┌─ GRAFFITI-EDITORIAL — cinco mapas novos');
console.log(`├─ layout: ${NOVOS.length} mapas · pool-fonte: textures.js · pack pixo: ${pixoNovos.length} com metadado cidade`);
if (falhas.length) {
  for (const falha of falhas) console.error(`├─ ✗ ${falha}`);
  console.error(`└─ REPROVADO (${falhas.length})`);
  process.exit(1);
}
console.log('└─ APROVADO — sem mascote protegido, sem homenagem a pessoa real e pack pixo com cidade SP|RJ');
