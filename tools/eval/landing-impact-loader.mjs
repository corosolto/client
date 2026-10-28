export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (!url.endsWith('/public/js/game.js') || loaded.source == null) return loaded;
  const before = String(loaded.source);
  const source = before.replace(
    'if (landImpact > 0) this._landingFx(p.pos, landImpact);',
    'void landImpact;',
  );
  if (source === before) throw new Error('mutante sem-impacto não encontrou o dispatch de produção');
  return { ...loaded, source };
}
