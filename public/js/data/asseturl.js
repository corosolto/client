/* URL dos binários pesados de /models e /audio, revisada por conteúdo.
   Motivo, contrato e o porquê do fallback: tools/gen-asset-rev.mjs (régua: eval:assetrev). */
import { VERSION } from '../version.js';
import { revDe } from './assetver.js';

/* Núcleo puro: a régua simula dois releases e dois mapas com ele. */
export const urlComRev = (caminho, rev, versao) => `${caminho}?v=${encodeURIComponent(rev || versao)}`;

// Sem revisão conhecida cai na VERSION: asset novo tem que continuar carregando.
export const assetUrl = (caminho) => urlComRev(caminho, revDe(caminho), VERSION);
