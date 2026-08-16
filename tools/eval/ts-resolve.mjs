// Hook de resolução pra rodar os .ts do src/ em node puro.
// O projeto importa sem extensão ("../data/jogo"), que o Vite resolve e o Node
// não. Sem isto, qualquer arnês que importe de src/ morre em ERR_MODULE_NOT_FOUND.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('.') && !/\.[a-z]+$/i.test(spec)) {
      const base = ctx.parentURL ? new URL(spec, ctx.parentURL) : null;
      if (base) {
        for (const ext of ['.ts', '.mts', '.js', '.mjs']) {
          const cand = new URL(base.href + ext);
          if (existsSync(fileURLToPath(cand))) return next(spec + ext, ctx);
        }
      }
    }
    return next(spec, ctx);
  },
});
