/* RÉGUA DO ORÇAMENTO DE QUALIDADE — o tamanho da sombra mora num lugar só.

   O mesmo `2048` estava escrito à mão em 10 arquivos de mapa e mais uma vez dentro do
   pós-processamento. Consequências medidas, as duas reais:

   1. Quem escolhia "baixa" no atacadão, upa, posto, parque, piscina, obras, penitenciária,
      velho oeste, ferro velho ou no carregador de mapa por JSON pagava sombra de 2048 —
      quatro vezes os texels de quem jogava o mesmo "baixa" na Havan ou na quebrada, que
      respeitam o nível. O ferro velho é o caso que mais ensina: tem 15 ramificações por
      LOWQ e mesmo assim cravava a sombra.
   2. `focusSunShadow` (bloom.js) SUBIA de volta qualquer sombra abaixo de 2048. Enquanto o
      valor era fixo isso era inofensivo; no minuto em que a qualidade adaptativa quiser
      baixar a sombra durante a partida, o pós desfaria a redução sem avisar ninguém.

   Uso: node tools/eval/quality-mapas-check.mjs
        node tools/eval/quality-mapas-check.mjs --mutar=literal   # devolve um 2048 cravado
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.resolve(HERE, '../../public/js');
const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

/* ISENTOS, com o motivo — telas que não são partida e não competem por quadro com o jogo.
   Lista declarada aqui de propósito: isenção que não se escreve vira isenção que ninguém revisa. */
const ISENTOS = new Map([
  ['map_preview.js', 'cartão de mapa no menu, não é partida'],
  ['map_preview_assets.js', 'idem'],
  ['sertao_map_preview.js', 'idem'],
  ['amazonia_map_preview.js', 'idem'],
  ['escadao_preview.js', 'idem'],
  ['loading3d.js', 'tela de carregamento'],
  ['site-bg.js', 'fundo do site'],
  ['map_piscinao_ramos.js', 'fora do registro de mapas (maps.js:59); serve de fixture da movimento-golden'],
]);

const arquivos = fs.readdirSync(JS).filter((f) => f.endsWith('.js'));
const fonte = new Map(arquivos.map((f) => [f, fs.readFileSync(path.join(JS, f), 'utf8')]));

if (MUTAR === 'literal') {
  // devolve o estado anterior num arquivo só: basta um para a régua morder
  fonte.set('map_upa.js', fonte.get('map_upa.js').replace('aplicaSombraSol(sun);', 'sun.shadow.mapSize.set(2048, 2048);'));
  console.log('\n  [MUTANTE: literal] — a régua TEM que reprovar');
}

console.log('\n· tamanho de sombra: um lugar só');

// QMAP1 · nenhum `shadow.mapSize.set(...)` solto no código de partida
const soltos = [];
for (const [f, s] of fonte) {
  if (f === 'mapquality.js' || f === 'bloom.js' || ISENTOS.has(f)) continue;   // o piso do pós é QMAP2
  const linhas = s.split('\n');
  linhas.forEach((l, i) => { if (/\.shadow\.mapSize\.set\(/.test(l)) soltos.push(`${f}:${i + 1}`); });
}
cobra(soltos.length === 0,
  `QMAP1 · nenhum shadow.mapSize.set fora do orçamento${soltos.length ? ` — ${soltos.slice(0, 6).join(', ')}${soltos.length > 6 ? ` (+${soltos.length - 6})` : ''}` : ''}`);

// QMAP2 · o pós não força um piso literal por cima do orçamento
const bloom = fonte.get('bloom.js') || '';
const pisoCravado = /mapSize\.width\s*<\s*\d{3,}/.test(bloom);
cobra(!pisoCravado && /orcamentoSombra\(/.test(bloom),
  'QMAP2 · focusSunShadow usa o orçamento como piso, não um número cravado');

// QMAP3 · todo mapa jogável alcança o orçamento (importa o módulo OU delega para quem importa)
const registro = fonte.get('maps.js') || '';
const idsDeArquivo = [...registro.matchAll(/from\s+'\.\/(map_[a-z0-9_]+)\.js'/g)].map((m) => `${m[1]}.js`);
const semOrcamento = [...new Set(idsDeArquivo)].filter((f) => {
  const s = fonte.get(f);
  if (!s) return false;
  if (!/\.shadow\.(mapSize|camera)/.test(s)) return false;       // mapa sem sol próprio não precisa
  return !/mapquality\.js/.test(s);
});
cobra(semOrcamento.length === 0,
  `QMAP3 · todo mapa com sol próprio passa pelo orçamento${semOrcamento.length ? ` — falta em ${semOrcamento.join(', ')}` : ''}`);

// QMAP4 · a leitura da preferência não volta a ser copiada em cada mapa
const copias = [];
for (const [f, s] of fonte) {
  if (f === 'mapquality.js' || f === 'main.js' || f === 'game.js') continue;
  if (/awpbr_settings/.test(s) && /quality/.test(s)) copias.push(f);
}
/* CATRACA, não meta: 14 arquivos ainda leem a preferência do storage por conta própria. Baixar
   isso é outra frente; o que esta régua impede é o número CRESCER — foi copiando essa leitura
   que o tamanho de sombra se espalhou por 11 lugares. Medido em 12/09/2026. */
const CATRACA_COPIAS = 14;
cobra(copias.length <= CATRACA_COPIAS,
  `QMAP4 · a leitura de qualidade não se espalhou (${copias.length} arquivos, catraca ${CATRACA_COPIAS})`);

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
