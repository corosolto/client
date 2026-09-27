#!/usr/bin/env node
/**
 * Compacta a malha da peça do carregador recortada da arma (svd, uzi).
 *
 * O recorte do pente (precisao-final-build / uzi-uma-mao) criou a peça como uma primitiva que
 * INDEXA ~110 vértices de um acessor POSITION de ~6,5 mil vértices, compartilhado com o corpo da
 * arma. Na tela só aparecem os triângulos indexados, mas tudo que lê os vértices da peça (skin no
 * runtime, `eval:vm-carregador`) enxerga a arma inteira: a régua mede "tira carregador fantasma: a
 * peça mede 100% da arma" (fila P3/P5). Aqui cada primitiva da peça ganha acessores próprios só
 * com os vértices usados (`compactPrimitive` do gltf-transform); geometria e UV idênticas.
 *
 * Uso: node tools/viewmodels/prep/compacta-peca.mjs --arma=svd|uzi --in=<glb> --out=<glb>
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive } from '@gltf-transform/functions';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
export const PECAS = { svd: ['GEO_MINT_SVD_PIECE'], uzi: ['MINT_WEAPON_MAG_UZI'] };

export async function aplicar({ arma, entrada, saida, nos = PECAS[arma] }) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(entrada);
  const relatorio = { arma, receita: 'compacta-peca', pecas: {} };
  for (const nome of nos) {
    const no = doc.getRoot().listNodes().find((n) => n.getName() === nome);
    if (!no?.getMesh()) throw new Error(`${arma}: malha ${nome} ausente`);
    relatorio.pecas[nome] = no.getMesh().listPrimitives().map((p) => {
      const antes = p.getAttribute('POSITION').getCount();
      compactPrimitive(p);
      return { verticesAntes: antes, verticesDepois: p.getAttribute('POSITION').getCount() };
    });
  }
  // Acessores que ficaram sem uso (nenhum: o corpo continua usando os originais) — confere.
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  relatorio.saida = { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  return relatorio;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arma = opt('arma');
  const saida = path.resolve(opt('out'));
  if (!path.relative(REPO, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  console.log(JSON.stringify(await aplicar({ arma, entrada: path.resolve(opt('in')), saida })));
}
