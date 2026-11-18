import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const TARGET = pathToFileURL(path.join(ROOT, 'tools/character-kit/gloves/repository.mjs')).href;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const must = (ok, message) => { if (!ok) throw Error('TP_DRIP_LOADER_INFRA: ' + message); };

// Hook síncrono no próprio thread: `module.register()` é DEP0205 no Node 26 e o
// aviso no stderr do filho invalidava o caso (o agregador exige stderr vazio).
function load(url, context, nextLoad) {
  const result = nextLoad(url, context);
  if (url !== TARGET) return result;
  const original = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(result.source));
  const expected = process.env.CSBR_TP_DRIP_REPOSITORY_SHA256;
  must(/^[a-f0-9]{64}$/.test(expected ?? '') && sha(original) === expected, 'repository pin drift');
  const call = '      const built = buildThirdPersonPackage(sourceBytes, selection);';
  const returned = '  return { manifest, artifacts, census, selections: expectedSelections };';
  must(original.split(call).length === 2 && original.split(returned).length === 2, 'anchors must apply once');
  let source = original.replace(call, '      const usedDripSelection = mutateDripSelection(selection, sourceBytes);\n      const built = buildThirdPersonPackage(sourceBytes, usedDripSelection);');
  source = source.replace(returned, '  return mutateDripReturn({ manifest, artifacts, census, selections: expectedSelections }, includeCosmetics);');
  const helper = new URL('./tp-drip-source-mutations.mjs', import.meta.url).href;
  source = 'import { mutateDripSelection, mutateDripReturn } from ' + JSON.stringify(helper) + ';\n' + source;
  const receipt = process.env.CSBR_TP_DRIP_LOADER_RECEIPT, mode = process.env.CSBR_TP_DRIP_CASE;
  const nonce = process.env.CSBR_TP_DRIP_NONCE;
  must(typeof nonce === 'string' && nonce.length > 0 && typeof receipt === 'string'
    && path.isAbsolute(receipt) && path.basename(receipt) === mode + '.loader.json', 'receipt identity');
  fs.writeFileSync(receipt, JSON.stringify({
    nonce, mode, repositoryUrl: url, originalSHA256: sha(original), transformedSHA256: sha(source),
    anchorCounts: { cosmeticCall: 1, return: 1 }, noWTWrite: true,
  }, null, 2) + '\n');
  return { ...result, source };
}

registerHooks({ load });
