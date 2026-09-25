import { extname } from 'node:path';

export const FINAL_ARTIFACT_TYPE = Object.freeze({
  GLTF_BINARY: 'model/gltf-binary',
  IMAGE_WEBP: 'image/webp',
});

const EXTENSION_BY_TYPE = Object.freeze({
  [FINAL_ARTIFACT_TYPE.GLTF_BINARY]: '.glb',
  [FINAL_ARTIFACT_TYPE.IMAGE_WEBP]: '.webp',
});

// Contrato compartilhado: integridade confere todo artefato final; Khronos pede só GLB.
// Falta de tipo e extensão divergente são erro de registro, nunca filtro silencioso.
export function finalArtifacts(registry, { type = null } = {}) {
  const entries = Object.entries(registry.assets || registry)
    .filter(([, asset]) => asset.processing?.finalSha256)
    .map(([id, asset]) => {
      const artifactType = asset.artifactType;
      const file = asset.files?.[0];
      const expectedExtension = EXTENSION_BY_TYPE[artifactType];
      if (!expectedExtension) {
        throw new Error(`${id}: artifactType ausente ou desconhecido (${artifactType || 'ausente'})`);
      }
      if (!file || extname(file).toLowerCase() !== expectedExtension) {
        throw new Error(`${id}: artifactType ${artifactType} exige files[0] ${expectedExtension}, recebeu ${file || 'ausente'}`);
      }
      return { id, asset, file, artifactType };
    });
  return type ? entries.filter((entry) => entry.artifactType === type) : entries;
}
