import { classifyCrash, crashFamily, crashFamilyKey } from '../src/lib/error-provenance.mjs';

const message = process.env.MSG || '';
const classification = classifyCrash({
  message,
  source: process.env.SRC || '',
  stack: process.env.STK || '',
}, process.env.ORIGIN || 'https://www.corosolto.com.br');

// A família agrupa a issue: a mesma falha em outra língua ou engine comenta a issue aberta.
process.stdout.write(`classe=${classification}\nfamilia=${crashFamily(message).replace(/[\r\n]/g, ' ')}\nchave=${crashFamilyKey(message)}\n`);
