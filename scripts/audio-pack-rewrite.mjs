/* Reescreve todo caminho audio/* do manifest para o nome opaco do pacote.

   `characterVoiceText` é o caso que não pode usar apenas recursão em VALORES:
   seus caminhos são CHAVES. Se o MP3 vira audio/a/<hash>.mp3 e a chave continua
   `audio/characters/...`, a voz toca em produção mas a legenda some.
*/
export function rewriteAudioManifest(value, rewritePath, parents = []) {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === 'string' && item.startsWith('audio/')
      ? rewritePath(item)
      : rewriteAudioManifest(item, rewritePath, parents));
  }
  if (!value || typeof value !== 'object') return value;

  const output = {};
  const rewritesPathKeys = parents.at(-1) === 'characterVoiceText';
  for (const [originalKey, originalValue] of Object.entries(value)) {
    const key = rewritesPathKeys && originalKey.startsWith('audio/')
      ? rewritePath(originalKey)
      : originalKey;
    const next = typeof originalValue === 'string' && originalValue.startsWith('audio/')
      ? rewritePath(originalValue)
      : rewriteAudioManifest(originalValue, rewritePath, [...parents, originalKey]);
    if (Object.hasOwn(output, key) && output[key] !== next) {
      throw new Error(`colisão de legenda no pacote de áudio: ${key}`);
    }
    output[key] = next;
  }
  return output;
}
