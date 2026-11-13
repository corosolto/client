#!/usr/bin/env node
// Aceite global usa peças extraídas da geometria desenhada, nunca o catálogo editorial.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregarDoEgo, validarResumo } from './graffiti-current-accept.mjs';
import { identidadeArteGrafite } from '../../public/js/graffiti_art_id.js';

const { MAPAS } = carregarDoEgo();
const CLAUSULAS = ['duplicates', 'outside', 'unsupported', 'unknown', 'divergent'];
export function avaliarGrafiteGlobal(registros) {
  const violacoes = [], vistos = new Set(), ocorrencias = new Map();
  let pecas = 0;
  if (!Array.isArray(registros)) return { verde: false, violacoes: ['registros ausentes'], repetidas: [], mapas: 0, pecas: 0, artes: 0 };
  if (registros.length !== MAPAS.length) violacoes.push(`cobertura: esperado ${MAPAS.length}, recebido ${registros.length}`);
  for (const registro of registros) {
    const c = registro?.curation, raw = registro?.raw?.nominal;
    const id = c?.id;
    if (!MAPAS.includes(id) || vistos.has(id)) { violacoes.push(`mapa inesperado/repetido: ${id}`); continue; }
    vistos.add(id);
    violacoes.push(...validarResumo(c, { pedidos: MAPAS, mutante: '' }));
    if (!raw || raw.id !== id || !Array.isArray(raw.pieces)) { violacoes.push(`${id}: geometria nominal ausente`); continue; }
    if (c.invalidado !== false || c.silencioOk !== true || c.nominalVerde !== true || c.erros?.length) violacoes.push(`${id}: medição invalidada`);
    if (!raw.pieces.length) violacoes.push(`${id}: mapa vazio`);
    if (raw.overlayPieces !== raw.pieces.length || raw.total !== raw.pieces.length || c.overlayPieces !== raw.pieces.length) violacoes.push(`${id}: contagem diverge da geometria`);
    if (raw.unclassifiedOccurrences !== 0 || c.unclassifiedOccurrences !== 0) violacoes.push(`${id}: arte não classificada`);
    for (const key of CLAUSULAS) if (!Array.isArray(raw[key]) || raw[key].length || c[key] !== 0) violacoes.push(`${id}: ${key} fora do contrato`);
    const locais = new Set();
    for (const p of raw.pieces) {
      const arquivo = identidadeArteGrafite(p?.file);
      if (typeof arquivo !== 'string' || !/^\/(?:img\/(?:decals|textures)|posters)\/.+\.(?:png|jpe?g|webp)$/i.test(arquivo)) { violacoes.push(`${id}: identidade desconhecida`); continue; }
      if (!['x','y','z','ry','w','h'].every(k => Number.isFinite(p[k])) || p.w <= 0 || p.h <= 0 || p.uvValido !== true || p.uvLegivel !== true || p.uvDobra !== false) violacoes.push(`${id}: peça inválida ${arquivo}`);
      if (locais.has(arquivo)) violacoes.push(`${id}: arte repetida localmente ${arquivo}`);
      locais.add(arquivo);
      if (!ocorrencias.has(arquivo)) ocorrencias.set(arquivo, []);
      ocorrencias.get(arquivo).push(id); pecas++;
    }
    if (raw.unique !== locais.size || c.unique !== locais.size) violacoes.push(`${id}: identidades divergem da geometria`);
  }
  for (const id of MAPAS) if (!vistos.has(id)) violacoes.push(`mapa ausente: ${id}`);
  const repetidas = [...ocorrencias].filter(([, ids]) => new Set(ids).size > 1).map(([arquivo, ids]) => ({ arquivo, mapas: [...new Set(ids)].sort(), ocorrencias: ids.length }));
  for (const r of repetidas) violacoes.push(`arte em mais de um mapa: ${r.arquivo} (${r.mapas.join(', ')})`);
  return { verde: violacoes.length === 0, violacoes, repetidas, mapas: vistos.size, pecas, artes: ocorrencias.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !/^--json=.+$/.test(args[0])) { console.error('uso: node tools/eval/graffiti-global-accept.mjs --json=DIR (14 medições nominais reais)'); process.exit(2); }
  try {
    const dir = path.resolve(args[0].slice(7));
    const resultado = avaliarGrafiteGlobal(MAPAS.map(id => JSON.parse(readFileSync(path.join(dir, id + '.json'), 'utf8'))));
    console.log(JSON.stringify(resultado)); process.exitCode = resultado.verde ? 0 : 1;
  } catch (e) { console.error('INFRA: ' + e.message); process.exitCode = 3; }
}
