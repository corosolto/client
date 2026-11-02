import { parseMeshPartsJSON } from '../mesh-parts.mjs';
import { EXPLICIT_SELECTION_SCHEMA, MESH_PARTS_SCHEMA } from './core.mjs';

export const COSMETIC_SELECTIONS_SCHEMA = 'cs-glove-cosmetic-selections/1';
const must = (condition, message) => { if (!condition) throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = (value, names, label) => must(object(value)
  && Object.keys(value).sort().join(',') === [...names].sort().join(','), `${label} fields mismatch`);
const id = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function parseCosmeticSelections(bytes) {
  must(Buffer.isBuffer(bytes) || typeof bytes === 'string', 'cosmetic selections JSON bytes required');
  const document = parseMeshPartsJSON(Buffer.isBuffer(bytes) ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : bytes);
  fields(document, ['schema', 'entries'], 'cosmetic selections');
  must(document.schema === COSMETIC_SELECTIONS_SCHEMA && Array.isArray(document.entries), 'cosmetic selections schema mismatch');
  const origins = new Set();
  document.entries.forEach((record, index) => {
    fields(record, ['id', 'characterId', 'skinId', 'source', 'review', 'selection'], 'cosmetic record');
    must(id(record.id) && record.id === record.skinId && id(record.characterId), 'cosmetic identity mismatch');
    must(index === 0 || record.id > document.entries[index - 1].id, 'cosmetic IDs must be sorted/unique');
    fields(record.source, ['path', 'sha256', 'skeletonFamilySha256'], 'cosmetic source');
    must(/^public\/models\/skins\/[a-z0-9-]+\.glb$/.test(record.source.path)
      && hash(record.source.sha256) && hash(record.source.skeletonFamilySha256), 'cosmetic source identity invalid');
    const origin = JSON.stringify([record.characterId, record.source.path, record.source.sha256]);
    must(!origins.has(origin), 'duplicate cosmetic source'); origins.add(origin);
    fields(record.review, ['recordSha256', 'scope'], 'cosmetic review');
    must(hash(record.review.recordSha256) && record.review.scope === 'candidate', 'cosmetic review provenance invalid');
    fields(record.selection, ['schema', 'meshPartsSchema', 'sourceSha256', 'entries'], 'explicit selection');
    must(record.selection.schema === EXPLICIT_SELECTION_SCHEMA && record.selection.meshPartsSchema === MESH_PARTS_SCHEMA
      && record.selection.sourceSha256 === record.source.sha256, 'cosmetic selection identity mismatch');
    must(Array.isArray(record.selection.entries) && record.selection.entries.length === 1, 'one explicit mesh-parts entry required');
  });
  return document;
}
