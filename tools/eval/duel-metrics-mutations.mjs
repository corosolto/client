import { sonda, pula } from './sonda-filho.mjs';
for (const mutant of [null, 'gap', 'protegido', 'fatal', 'cura']) {
  const result = sonda([new URL('duel-metrics-check.mjs', import.meta.url).pathname,
    ...(mutant ? [`--mutante=${mutant}`] : [])], { maxBuffer: 2 ** 20 });
  /* Mutante não medido não é mutante morto (issue #1133). */
  if (!result.mediu) pula(result.causa, `duelo ${mutant || 'normal'}`);
  const ok = mutant ? result.status === 1 && /^FALHA /m.test(result.stdout) && !result.stderr.includes('Error:') : result.status === 0;
  console.log(`${ok ? 'OK' : 'FALHA'} duelo ${mutant || 'normal'}`);
  if (!ok) { process.stdout.write(result.stdout); process.stderr.write(result.stderr); process.exit(1); }
}
