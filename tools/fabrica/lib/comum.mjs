// Caminhos e utilitários da fábrica. Produto licenciado nunca entra no repositório.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const BLENDER = process.env.BLENDER || '/Applications/Blender.app/Contents/MacOS/Blender';
export const PRIVADO = process.env.FABRICA_PRIVADO
  || path.join(process.env.HOME, 'csbrasil-private-assets/generated/viewmodels-fabrica');
export const OVERLAY = path.join(PRIVADO, 'overlay/viewmodels');
export const TRABALHO = path.join(PRIVADO, 'trabalho');
// URL servida: overlay/viewmodels/fabrica/<id>-fabrica.glb ↔ /private-assets/viewmodels/fabrica/…
export const URL_PRODUTO = (id) => `/private-assets/viewmodels/fabrica/${id}-fabrica.glb`;
export const ARQUIVO_PRODUTO = (id) => path.join(OVERLAY, 'fabrica', `${id}-fabrica.glb`);
export const MANIFESTO = path.join(RAIZ_REPO, 'tools/fabrica/fabrica-candidates.json');

export function foraDoRepo(alvo) {
  const rel = path.relative(RAIZ_REPO, path.resolve(alvo));
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    throw new Error(`recusado: binário licenciado dentro do repositório público (${alvo})`);
  }
  return alvo;
}

export const sha256 = (arquivo) => crypto.createHash('sha256').update(fs.readFileSync(arquivo)).digest('hex');

export function rodarBlender(script, args, { marcador } = {}) {
  const r = spawnSync(BLENDER, ['-b', '--python-exit-code', '1', '--python', script, '--', ...args], {
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  });
  if (r.status !== 0 || (marcador && !r.stdout.includes(marcador))) {
    throw new Error(`Blender falhou (${path.basename(script)}):\n${r.stdout.slice(-3000)}\n${r.stderr.slice(-1500)}`);
  }
  return r.stdout;
}

export const lerJson = (arquivo) => JSON.parse(fs.readFileSync(arquivo, 'utf8'));
export const gravarJson = (arquivo, dado) => {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, `${JSON.stringify(dado, null, 2)}\n`);
};
