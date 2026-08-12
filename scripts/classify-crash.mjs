import { classifyCrash } from '../src/lib/error-provenance.mjs';

const classification = classifyCrash({
  message: process.env.MSG || '',
  source: process.env.SRC || '',
  stack: process.env.STK || '',
}, process.env.ORIGIN || 'https://www.csbrasil.online');

process.stdout.write(`classe=${classification}\n`);
