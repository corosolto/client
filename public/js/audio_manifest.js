// Compatibilidade de entrada durante a migração do manifesto: só `jogo` é consumido.
// Preserva a curadoria e cada URL; um `jogo` explícito, inclusive vazio, prevalece.
export function temFamiliaLegadaAudio(manifest) {
  return !!manifest && typeof manifest === 'object' && !Array.isArray(manifest)
    && Object.prototype.hasOwnProperty.call(manifest, 'cs');
}

export function normalizarManifestAudio(manifest) {
  if (!temFamiliaLegadaAudio(manifest)) return manifest;
  const out = { ...manifest };
  if (!Object.prototype.hasOwnProperty.call(out, 'jogo')) out.jogo = out.cs;
  delete out.cs;
  return out;
}
