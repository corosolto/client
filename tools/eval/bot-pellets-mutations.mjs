import { sonda, pula } from './sonda-filho.mjs';
for (const mutante of [null, 'mono', 'piso', 'peso', 'cabeca', 'teto', 'fx']) {
  const r = sonda([new URL('bot-pellets-check.mjs', import.meta.url).pathname,
    ...(mutante ? [`--mutante=${mutante}`] : [])], { maxBuffer: 2 ** 20 });
  /* Sem isto, um filho que morre por dependência ausente satisfaz "status !== 0"
     e o mutante é declarado MORTO sem nunca ter sido medido: falso-verde. */
  if (!r.mediu) pula(r.causa, `pellets ${mutante || 'normal'}`);
  const ok = mutante ? r.status === 1 && /^FALHA /m.test(r.stdout) && !r.stderr.includes('Error:') : r.status === 0;
  console.log(`${ok ? 'OK' : 'FALHA'} pellets ${mutante || 'normal'}`);
  if (!ok) { process.stdout.write(r.stdout); process.stderr.write(r.stderr); process.exit(1); }
}
