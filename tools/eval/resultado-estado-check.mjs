import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

let fonte = readFileSync(new URL('../../public/js/tp/resultado.js', import.meta.url), 'utf8');
if (process.argv.includes('--mutante=sem-empate')) fonte = fonte.replace(" || fim.classList.contains('draw')", '');
const trecho = fonte.match(/new MutationObserver\(\(\) => \{([\s\S]*?)\}\)\.observe\(fim,/);
assert.ok(trecho, 'observador real do fim da partida encontrado');
for (const [classes, esperado] of [['win', true], ['lose', true], ['draw', true], ['hidden draw', false], ['', false]]) {
  let pintou = false, encerrou = false;
  const raiz = { hidden: false }, fim = { dataset: {}, classList: { contains: (v) => classes.split(' ').includes(v) } };
  runInNewContext(trecho[1], { fim, raiz, pintar: () => { pintou = true; }, encerrar: () => { encerrou = true; } });
  assert.equal(pintou, esperado, `resultado ${classes || 'sem resultado'}: renderização`);
  assert.equal(encerrou, !esperado, `resultado ${classes || 'sem resultado'}: encerramento`);
  assert.equal(raiz.hidden, !esperado, `resultado ${classes || 'sem resultado'}: visibilidade`);
}
console.log('Resultado: vitória, derrota e empate renderizam; tela oculta encerra.');
const partilha = fonte.match(/const texto = (tr\([^;]+);/);
assert.ok(partilha, 'mensagem real de compartilhamento encontrada');
const textoEmpate = runInNewContext(partilha[1], { tr: (s) => s, fim: { classList: { contains: (v) => v === 'draw' } } });
assert.match(textoEmpate, /Empate/, 'compartilhar empate não anuncia derrota');
