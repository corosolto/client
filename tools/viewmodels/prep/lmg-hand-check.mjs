#!/usr/bin/env node
/* Gate LMG por mão: rejeita vacuidade e contato da mão errada no jogo real. */
import fs from 'node:fs';
import process from 'node:process';

const file = process.argv[2];
const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!file || !fs.existsSync(file)) throw new Error('uso: lmg-hand-check.mjs <frames.json> [--mutante=sem-apoio|sem-forte|desloca-apoio|desloca-forte]');
const frames = JSON.parse(fs.readFileSync(file, 'utf8')).frames || [];
if (!frames.length) throw new Error('coleta vazia');
const dados = JSON.parse(JSON.stringify(frames));
const alvo = dados[0];
if (mutant === 'sem-apoio') alvo.apoioEmQuadro = 0;
if (mutant === 'sem-forte') alvo.forteEmQuadro = 0;
if (mutant === 'desloca-apoio') alvo.apoioContato_px = 80;
if (mutant === 'desloca-forte') alvo.forteContato_px = 80;
if (mutant && !['sem-apoio', 'sem-forte', 'desloca-apoio', 'desloca-forte'].includes(mutant)) throw new Error(`mutante desconhecido: ${mutant}`);

const falhas = [];
for (const frame of dados) {
  const onde = `${frame.cenario}/${frame.detalhe || 'base'}`;
  for (const [lado, min, contato] of [
    ['apoio', frame.apoioEmQuadro, frame.apoioContato_px],
    ['forte', frame.forteEmQuadro, frame.forteContato_px],
  ]) {
    if (!Number.isFinite(min) || min < 100) falhas.push(`${onde}: mão ${lado} fora do quadro (${min} < 100)`);
    if (!Number.isFinite(contato) || contato > 12) falhas.push(`${onde}: mão ${lado} sem contato (${contato} px > 12)`);
  }
  if (!Number.isFinite(frame.weaponIn) || frame.weaponIn < 100) falhas.push(`${onde}: arma fora do quadro (${frame.weaponIn} < 100)`);
}
if (mutant) {
  if (!falhas.length) throw new Error(`RÉGUA CEGA: mutante ${mutant} passou`);
  console.log(`mutante ${mutant} reprovado: ${falhas[0]}`);
} else if (falhas.length) {
  console.error(`VERMELHO: ${falhas.join('; ')}`);
  process.exitCode = 1;
} else {
  console.log(`VERDE: ${dados.length} frames; mãos separadas em quadro e em contato`);
}
