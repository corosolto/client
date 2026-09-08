import { readFileSync } from 'node:fs';

const mutante = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && mutante !== 'pico-zero') throw new Error(`mutante desconhecido: ${mutante}`);

let fonte = readFileSync('public/js/audio.js', 'utf8');
if (mutante) {
  const antes = fonte;
  fonte = fonte.replace('Math.max(0.0001, peak)', 'peak');
  if (fonte === antes) throw new Error('mutante pico-zero não aplicou');
}

globalThis.location = { search: '' };
const { Sfx } = await import(`data:text/javascript,${encodeURIComponent(fonte)}`);
const alvos = [];
const gain = {
  setValueAtTime() {},
  exponentialRampToValueAtTime(valor) {
    if (!(valor > 0)) throw new RangeError(`AudioParam recusou alvo ${valor}`);
    alvos.push(valor);
  },
};

let falha = null;
try {
  new Sfx()._env({ gain }, 1, 0.005, 0, 0.1, 0);
} catch (erro) {
  falha = erro;
}

if (falha || alvos.length !== 2 || alvos.some((valor) => !(valor > 0))) {
  console.error(`AENV1 falhou: envelope com pico/fim zero ainda chega ao AudioParam (${falha?.message || alvos.join(', ')}).`);
  process.exit(1);
}
if (mutante) {
  console.error('AENV1 mutação pico-zero não foi detectada.');
  process.exit(1);
}
console.log('AENV1 verde: envelope com volume zero usa alvos exponenciais estritamente positivos.');
