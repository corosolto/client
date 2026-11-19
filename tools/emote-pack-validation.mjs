export const EMOTE_QA_RIGS = Object.freeze(['mst', 'capitao-caveira']);

export function validarFonteEmote(nome, meta, chaveEsperada) {
  if (meta.key !== chaveEsperada || meta.keyStatus !== 'emote')
    throw new Error(`${nome}: catálogo ${meta.id} declara key=${meta.key}/${meta.keyStatus}`);
  const qa = meta.qa || {};
  const rigsAprovados = EMOTE_QA_RIGS.every((rig) => qa[rig]?.verdict === 'pass');
  if (!rigsAprovados || Object.values(qa).some((value) => value.verdict !== 'pass'))
    throw new Error(`${nome}: QA de conversão não aprovada nos rigs ${EMOTE_QA_RIGS.join(', ')} (${JSON.stringify(meta.qa)})`);
}
