/* Mescla clipes meshy-28 da biblioteca convertida num ÚNICO GLB compartilhado.
   Usado por tools/build-extras-pack.mjs e tools/build-emotes-mocap-pack.mjs: os dois
   packs têm o mesmo esqueleto de referência, então reaproveitam os nós por nome e só
   as animações sobrevivem. Nenhum FBX passa por aqui. */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { prune, mergeDocuments, unpartition } from '@gltf-transform/functions';

export function lerBiblioteca(argv, uso) {
  const arg = argv.find((a) => a.startsWith('--library='));
  if (!arg) {
    console.error(uso);
    process.exit(1);
  }
  const indexPath = path.resolve(arg.slice('--library='.length));
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  if (index.skeleton !== 'meshy-28' || !Array.isArray(index.clips)) throw new Error('biblioteca não é meshy-28 ou não tem clips[]');
  const clipsOutArg = argv.find((a) => a.startsWith('--clips-out='));
  const clipsOut = clipsOutArg ? path.resolve(clipsOutArg.slice('--clips-out='.length)) : null;
  if (clipsOut) fs.mkdirSync(clipsOut, { recursive: true });
  return { index, libraryDir: path.dirname(indexPath), clipsOut };
}

/* fontes: [[nomeNoPack, idDoCatalogo]]. `validar(nome, meta)` lança se o catálogo não
   bate; `ajustar(nome, animacao)` pode podar canais antes da mescla. Devolve o documento
   mesclado (já podado) e os metadados de catálogo na ordem das fontes. */
export async function montarPack({ index, libraryDir, clipsOut = null, fontes, validar = () => {}, ajustar = () => {} }) {
  const io = new NodeIO();
  let base = null;
  const metas = [];
  for (const [nome, id] of fontes) {
    const candidatos = index.clips.filter((c) => c.id === id);
    if (candidatos.length !== 1) throw new Error(`${nome}: catálogo ${id} aparece ${candidatos.length}×`);
    const meta = candidatos[0];
    validar(nome, meta);
    const doc = await io.read(path.join(libraryDir, meta.file));
    const animacoes = doc.getRoot().listAnimations();
    if (animacoes.length !== 1) throw new Error(`${nome}: ${meta.file} tem ${animacoes.length} animações`);
    animacoes[0].setName(nome);
    ajustar(nome, animacoes[0]);
    if (clipsOut) await io.write(path.join(clipsOut, `${nome}.glb`), doc);
    if (!base) {
      base = doc;
      const cena = base.getRoot().listScenes()[0];
      if (cena && cena.listChildren().length === 0) {
        const comPai = new Set();
        for (const n of base.getRoot().listNodes()) for (const c of n.listChildren()) comPai.add(c);
        for (const n of base.getRoot().listNodes()) if (!comPai.has(n)) cena.addChild(n);
      }
    } else {
      const root = base.getRoot();
      const antesAnim = new Set(root.listAnimations());
      const antesNos = new Set(root.listNodes());
      const porNome = new Map(root.listNodes().map((n) => [n.getName(), n]));
      mergeDocuments(base, doc);
      for (const anim of root.listAnimations()) {
        if (antesAnim.has(anim)) continue;
        for (const canal of anim.listChannels()) {
          const alvo = canal.getTargetNode() && porNome.get(canal.getTargetNode().getName());
          if (!alvo) throw new Error(`${nome}: osso ${canal.getTargetNode()?.getName()} ausente na referência`);
          canal.setTargetNode(alvo);
        }
      }
      for (const n of root.listNodes()) if (!antesNos.has(n)) n.dispose();
      for (const s of root.listScenes().slice(1)) s.dispose();
    }
    metas.push({ nome, id, meta });
  }
  if (!base) throw new Error('nenhum clipe selecionado');
  await base.transform(prune(), unpartition());
  return { doc: base, metas, io };
}

/* Escreve o GLB e confere que o pack contém exatamente os nomes pedidos. */
export async function gravarPack({ doc, io }, saida, esperados) {
  await io.write(saida, doc);
  const nomes = doc.getRoot().listAnimations().map((a) => a.getName()).sort();
  const alvo = [...esperados].sort();
  if (JSON.stringify(nomes) !== JSON.stringify(alvo)) throw new Error(`pacote divergente: ${nomes.join(', ')}`);
  return nomes;
}

export const LICENCAS = `## Licenças\n\n`
  + `- IDs \`mixamo/*\`: Adobe Mixamo, uso em jogos e mídia, inclusive comercial; a redistribuição dos FBX brutos não é permitida. https://helpx.adobe.com/mixamo/faq/mixamo-faq.html\n`
  + `- IDs \`ual/*\`: Quaternius Universal Animation Library, CC0 1.0 Universal. https://creativecommons.org/publicdomain/zero/1.0/\n\n`;
