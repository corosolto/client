// Mesmo hook de superfície no runtime da branch e no snapshot da main, preservando o fallback de cada um.
export function patchWaterRuntime(source) {
  const hook = 'this.world.footstepSurfaceAt?.(p.pos.x, p.pos.z) ?? ';
  if (source.includes(`this.sfx.step(${hook}`)) return source;
  const fallbacks = [
    "this.world.slowAt && this.world.slowAt(p.pos.x, p.pos.z) ? 'water' : 'concrete'",
    'this._footstepSurface(p.pos)',
  ];
  const matches = fallbacks.filter(expr => source.includes(`this.sfx.step(${expr})`));
  if (matches.length !== 1) throw Error('runtime sem ponto único de passos para o overlay da Amazônia');
  const old = `this.sfx.step(${matches[0]})`;
  if (source.split(old).length !== 2) throw Error('runtime com mais de um ponto de passos para o overlay da Amazônia');
  return source.replace(old, `this.sfx.step(${hook}(${matches[0]}))`);
}
