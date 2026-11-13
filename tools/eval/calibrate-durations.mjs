#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { criarManifestoDuracoes } from './lib/duration-shards.mjs';

let input = 'tools/eval/out/timing-artifacts';
let output = 'tools/eval/out/durations.json';
let geradoEm = new Date();
try {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--input=')) input = arg.slice('--input='.length);
    else if (arg.startsWith('--output=')) output = arg.slice('--output='.length);
    else if (arg.startsWith('--generated-at=')) geradoEm = arg.slice('--generated-at='.length);
    else throw new Error(`argumento desconhecido: ${arg}; use --input= --output= [--generated-at=]`);
  }
  if (!input || !output) throw new Error('--input e --output exigem caminhos');

  const arquivos = [];
  const visitar = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name);
      if (entrada.isDirectory()) visitar(caminho);
      else if (entrada.isFile() && entrada.name.endsWith('.json')) arquivos.push(caminho);
    }
  };
  visitar(input);
  arquivos.sort();
  const entradas = arquivos.map((caminho) => ({
    fonte: relative(input, caminho).split(sep).join('/'),
    relatorio: JSON.parse(readFileSync(caminho, 'utf8')),
  }));
  const manifesto = criarManifestoDuracoes(entradas, { geradoEm });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifesto, null, 2)}\n`);
  console.log(`durações: ${Object.keys(manifesto.duracoes).length} passos, ${manifesto.fontes.length} relatórios -> ${output}`);
} catch (erro) {
  console.error(`calibrate-durations: ${erro.message}`);
  process.exit(2);
}
