#!/usr/bin/env node
/** Fábrica de armas — ficha → GLB reprodutível do viewmodel.
 *
 *   node tools/fabrica/build.mjs tools/fabrica/fichas/ak.json [--sem-publicar]
 *
 * Etapas: (1) plano = ficha + chassi; (2) Blender monta braços + arma do pack +
 * idle + skins + zona livre + câmera do pack; (3) clipes do pack com os nomes do
 * jogo; (4) otimização (dedup/prune/resample, texturas webp ≤1024, sem meshopt:
 * o runtime não registra decodificador); (5) publica na overlay privada da
 * fábrica, grava manifesto (bytes, sha256, insumos) e regenera vmfabrica.js.
 * Como funciona e como acrescentar arma: docs/reports/VM-FABRICA.md.
 */
import fs from 'node:fs';
import path from 'node:path';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

import {
  ARQUIVO_PRODUTO, MANIFESTO, RAIZ_REPO, TRABALHO, URL_PRODUTO, foraDoRepo, gravarJson, lerJson, rodarBlender, sha256,
} from './lib/comum.mjs';
import { montarPlano } from './lib/plano.mjs';
import { PACK_RAIZ } from './lib/pack.mjs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const fichaArquivo = path.resolve(args.find((a) => !a.startsWith('--')) || '');
const publicar = !args.includes('--sem-publicar');
if (!fs.existsSync(fichaArquivo)) throw new Error('uso: node tools/fabrica/build.mjs <ficha.json>');

const t0 = Date.now();
const { ficha, plano, insumos } = montarPlano(fichaArquivo);
foraDoRepo(plano.saida.dir);
fs.mkdirSync(plano.saida.dir, { recursive: true });
const etapa = (nome) => console.log(`[fabrica ${ficha.id}] ${nome} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

// Normais do braço: 4096 no pack; 1024 basta no viewmodel e evita 30 MB no GLB.
const dirSkins = path.join(TRABALHO, 'skins');
fs.mkdirSync(dirSkins, { recursive: true });
for (const papel of ['manga', 'luva', 'pulso']) {
  const spec = plano.skinBraco[papel];
  if (!spec?.normal) continue;
  const res = plano.skinBraco.resolucaoNormal || 1024;
  const destino = path.join(dirSkins, `${spec.normal}-${res}.png`);
  if (!fs.existsSync(destino)) {
    await sharp(path.join(PACK_RAIZ, 'Character/Textures', `${spec.normal}.png`)).resize(res, res).png().toFile(destino);
  }
  spec.normalArquivo = destino;
}

const planoArquivo = path.join(plano.saida.dir, 'plano.json');
gravarJson(planoArquivo, plano);
etapa('plano');

rodarBlender(path.join(RAIZ_REPO, 'tools/fabrica/blender/montar.py'), [planoArquivo], { marcador: 'FABRICA_MONTAGEM=' });
etapa('montagem Blender');

const r = spawnSync(process.execPath, [path.join(RAIZ_REPO, 'tools/fabrica/clipes.mjs'), planoArquivo], {
  encoding: 'utf8', cwd: RAIZ_REPO, maxBuffer: 64 * 1024 * 1024,
});
if (r.status !== 0) throw new Error(`clipes falhou:\n${r.stdout.slice(-2000)}\n${r.stderr.slice(-2000)}`);
etapa('clipes');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({});
const doc = await io.read(path.join(plano.saida.dir, 'clipes.glb'));
doc.getRoot().getAsset().generator = `CoroSolto fabrica (${path.relative(RAIZ_REPO, fichaArquivo)})`;
await doc.transform(
  dedup(),
  resample({ tolerance: 1e-5 }),
  prune({ keepLeaves: true, keepAttributes: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 85 }),
);
const produtoTrabalho = path.join(plano.saida.dir, `${ficha.id}-fabrica.glb`);
await io.write(produtoTrabalho, doc);
etapa('otimização');

const bytes = fs.statSync(produtoTrabalho).size;
const sha = sha256(produtoTrabalho);
const montagem = lerJson(path.join(plano.saida.dir, 'montagem.json'));
const clipes = lerJson(path.join(plano.saida.dir, 'clipes.json'));
const relatorio = {
  schemaVersion: 1,
  id: ficha.id,
  arma: ficha.arma,
  chassi: ficha.chassi,
  variante: Boolean(ficha.zonaLivre?.length || ficha.removerZonaLivre?.length),
  url: URL_PRODUTO(ficha.id),
  bytes,
  sha256: sha,
  insumos,
  clipes: [{ nome: 'idle', braco: montagem.bracos.clipes.idle.fonte },
    ...clipes.clipes.map(({ nome, duracao, braco, arma }) => ({ nome, duracao: +duracao.toFixed(4), braco, arma }))],
  clipesRuntime: Object.fromEntries(Object.entries(plano.clipes).filter(([, c]) => c.tipo === 'procedural' || c.tipo === 'ausente')
    .map(([n, c]) => [n, c.tipo])),
  camera: montagem.camera,
  zonaLivre: montagem.zonaLivre,
  materiaisArma: montagem.arma.materiais,
  segundos: Math.round((Date.now() - t0) / 1000),
};
gravarJson(path.join(plano.saida.dir, 'build-report.json'), relatorio);

if (publicar) {
  const destino = foraDoRepo(ARQUIVO_PRODUTO(ficha.id));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(produtoTrabalho, destino);
  const manifesto = fs.existsSync(MANIFESTO) ? lerJson(MANIFESTO) : { schemaVersion: 1, candidates: {} };
  const { insumos: _i, zonaLivre: _z, materiaisArma: _m, ...resumo } = relatorio;
  manifesto.candidates[ficha.id] = {
    ...resumo,
    file: `viewmodels/fabrica/${ficha.id}-fabrica.glb`,
    ficha: path.relative(RAIZ_REPO, fichaArquivo),
    insumos: Object.fromEntries(Object.entries(insumos).map(([k, v]) => [k, v.sha256])),
    ready: false,
    rebuild: `node tools/fabrica/build.mjs ${path.relative(RAIZ_REPO, fichaArquivo)}`,
  };
  manifesto.candidates = Object.fromEntries(Object.entries(manifesto.candidates).sort(([a], [b]) => a.localeCompare(b)));
  gravarJson(MANIFESTO, manifesto);
  const corpo = `// GERADO por tools/fabrica/build.mjs — não editar à mão.
// Versão de URL por BYTES dos produtos da fábrica (tools/fabrica/fabrica-candidates.json).
export const VM_FABRICA_BYTES = Object.freeze({
${Object.entries(manifesto.candidates).map(([id, c]) => `  ${id}: '${c.sha256.slice(0, 10)}',`).join('\n')}
});
`;
  fs.writeFileSync(path.join(RAIZ_REPO, 'public/js/data/vmfabrica.js'), corpo);
  etapa(`publicado ${URL_PRODUTO(ficha.id)} (${(bytes / 1048576).toFixed(2)} MiB, ${sha.slice(0, 10)})`);
}
console.log(`FABRICA_BUILD=${JSON.stringify({ id: ficha.id, bytes, sha256: sha, clipes: relatorio.clipes.map((c) => c.nome) })}`);
