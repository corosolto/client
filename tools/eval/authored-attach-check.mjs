import { auditAuthoredAttach } from './lib/authored-attach-audit.mjs';
import { readFile } from 'node:fs/promises';

const result = auditAuthoredAttach();
if (process.argv.includes('--mutantes')) {
  const url = new URL('../../public/js/vmweapon.js', import.meta.url);
  const source = await readFile(url, 'utf8');
  const namedBlock = source.slice(source.indexOf('  // Peças autoradas'), source.indexOf('  return wrap;'));
  const mutations = {
    'sem-skin': ['mesh.applyBoneTransform(i, point);', ''],
    'indice-linear': ['weights.fromBufferAttribute(attributes.skinWeight, i);',
      'weights.fromArray(attributes.skinWeight.array, i * 4);'],
    'pecas-no-centro': ['if (weight < 0.99) continue;', ''],
    'bind-antigo': ['entry.scene.updateWorldMatrix(true, false);\n  entry.scene.updateMatrixWorld(true);',
      'entry.scene.updateWorldMatrix(true, true);'],
    'base-camera': ['const basis = bodyBasis || autoBasis(entry, socket);', 'const basis = autoBasis(entry, socket);'],
    'escopo-global': ['weaponConfig.anchor ? bodyAnchor(entry, socket, weaponConfig.anchor) : null',
      "bodyAnchor(entry, socket, weaponConfig.anchor || 'neutral_bone')"],
    'peca-sem-joint': ['if (weaponConfig.namedParts && !wrap.userData.mintParts)', 'if (false)'],
    'peca-sem-inversa': ['bone.matrixWorld.clone().invert().multiply(part.matrixWorld)', 'part.matrixWorld.clone()'],
    'peca-antes-ancora': [source.slice(source.indexOf('  // O centro da referência'), source.indexOf('  return wrap;')),
      namedBlock + source.slice(source.indexOf('  // O centro da referência'), source.indexOf('  // Peças autoradas'))],
  };
  result.mutations = [];
  for (const [name, [before, after]] of Object.entries(mutations)) {
    if (source.split(before).length !== 2) throw new Error(`Mutação ambígua: ${name}`);
    const code = source.replace(before, after).replace(/from '([^']+)'/g, (_, specifier) =>
      `from '${specifier.startsWith('.') ? new URL(specifier, url).href : import.meta.resolve(specifier)}'`);
    const runtime = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    const mutated = auditAuthoredAttach(runtime.attachMintWeapon);
    result.mutations.push({ name, detected: !mutated.ok, failed: mutated.checks.filter((c) => !c.ok).map((c) => c.name) });
  }
  result.ok &&= result.mutations.every((m) => m.detected);
}
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
