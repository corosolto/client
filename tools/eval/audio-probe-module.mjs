export function importAudioProbe(source, tag = 'normal') {
  const origin = new URL('../../public/js/audio.js', import.meta.url);
  const absolute = source.replace(/^(import\s+.+?\s+from\s+)(['"])(\.[^'"]+)\2;?$/gm,
    (_, prefix, quote, specifier) => `${prefix}${quote}${new URL(specifier, origin).href}${quote};`);
  return import(`data:text/javascript;base64,${Buffer.from(absolute).toString('base64')}#${tag}`);
}
