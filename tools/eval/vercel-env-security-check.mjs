import { spawnSync } from 'node:child_process';

const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
let saida;
if (mutante === 'segredo-preview') {
  saida = 'SUPABASE_SERVICE_ROLE_KEY Hidden Sensitive Preview, Production';
} else {
  const resultado = spawnSync('vercel', ['env', 'ls', 'preview'], { encoding: 'utf8' });
  if (resultado.status !== 0) {
    console.error(resultado.stderr || 'não foi possível consultar as envs da Vercel');
    process.exit(2);
  }
  saida = `${resultado.stdout}\n${resultado.stderr}`;
}

const proibidos = [
  'SUPABASE_SERVICE_ROLE_KEY', 'CF_API_TOKEN', 'GH_DISPATCH_TOKEN',
  'GCP_SERVICE_ACCOUNT', 'GOOGLE_APPLICATION_CREDENTIALS', 'MP_TICKET_SECRET', 'MP_METRICS_TOKEN',
];
const expostos = proibidos.filter((nome) => new RegExp(`^\\s*${nome}\\s+.*\\bPreview\\b`, 'mi').test(saida));
if (expostos.length) {
  console.error(`REPROVADO — Preview contém segredo(s) privilegiado(s): ${expostos.join(', ')}`);
  process.exit(1);
}
console.log('APROVADO — Preview contém apenas variáveis publicáveis; nenhum segredo privilegiado');
