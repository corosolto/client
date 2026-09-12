import { readFileSync } from 'node:fs';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
let vercel = readFileSync('vercel.json', 'utf8');
const pacote = JSON.parse(readFileSync('package.json', 'utf8'));
if (mutante === 'gate-git') vercel = vercel.replace('npm run check:vercel', 'npm run check:deploy');

const falhas = [];
if (!vercel.includes('npm run check:vercel') || vercel.includes('npm run check:deploy'))
  falhas.push('Vercel executa gate que exige .git/origin/main dentro do sandbox');
const comando = pacote.scripts?.['check:vercel'] || '';
for (const passo of ['syntax', 'eval:assetfetch', 'eval:apis', 'eval:nosgemeos']) {
  if (!comando.includes(passo)) falhas.push(`check:vercel não inclui ${passo}`);
}
if (falhas.length) {
  falhas.forEach((falha) => console.error(`REPROVADO — ${falha}`));
  process.exit(1);
}
console.log('APROVADO — build da Vercel mede o artefato sem depender de metadados Git ausentes');
