/* Liga a evidencia persistente da UI ao fonte e aos pixels atuais.

   Mutante: --mutante=sha-divergente altera o SHA consumido do primeiro frame e
   precisa reprovar. Sem essa mordida, um manifest velho poderia continuar verde.
*/
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const DIR = new URL('./asset-evidence/ui-cinematic/', import.meta.url);
const manifestPath = new URL('manifest.json', DIR);
const mutateSha = process.argv.includes('--mutante=sha-divergente');
const mutateHtml = process.argv.includes('--mutante=html-cru');
const sha = (data) => createHash('sha256').update(data).digest('hex');
const failures = [];

if (!existsSync(manifestPath)) {
  console.error('CINEMATIC-UI-EVIDENCE FALHA: manifest ausente');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const version = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8')).version;
if (manifest.version !== version) failures.push(`versao ${manifest.version}, fonte ${version}`);
const server = mutateHtml
  ? { ...(manifest.server || {}), dom: { teamCards: 0, rawAstroTokens: true } }
  : manifest.server;
if (server?.kind !== 'astro-ssr' || new URL(server?.origin || 'http://invalid').port !== '4321') {
  failures.push('captura nao veio do Astro SSR :4321');
}
if (server?.dom?.rawAstroTokens !== false || server?.dom?.teamCards !== 10) {
  failures.push(`HTML cru ou faccoes ausentes: raw=${server?.dom?.rawAstroTokens} cards=${server?.dom?.teamCards}`);
}
if (manifest.viewport?.width !== 1536 || manifest.viewport?.height !== 1024 || manifest.viewport?.aspect !== '3:2') {
  failures.push('viewport nao e 1536x1024 (3:2)');
}

const required = ['01-menu', '02-setup', '03-faccao', '04-personagem', '05-mapa', '06-configuracoes'];
if (manifest.frames?.length !== required.length) failures.push(`frames ${manifest.frames?.length || 0}/${required.length}`);
for (const id of required) if (!manifest.frames?.some((frame) => frame.id === id)) failures.push(`${id}: ausente`);

for (const [file, expected] of Object.entries(manifest.sources || {})) {
  const path = new URL(file, ROOT);
  if (!existsSync(path)) failures.push(`${file}: fonte ausente`);
  else if (sha(readFileSync(path)) !== expected) failures.push(`${file}: SHA do fonte divergiu`);
}

for (const [index, frame] of (manifest.frames || []).entries()) {
  if (!existsSync(frame.file)) { failures.push(`${frame.id}: PNG ausente`); continue; }
  const expected = mutateSha && index === 0 ? `${frame.sha256.slice(0, -1)}0` : frame.sha256;
  if (sha(readFileSync(frame.file)) !== expected) failures.push(`${frame.id}: SHA do PNG divergiu`);
  if (frame.width !== 1536 || frame.height !== 1024) failures.push(`${frame.id}: dimensao declarada divergiu`);
}

const contact = manifest.contactSheet;
if (!contact || !existsSync(contact.file)) failures.push('contact sheet ausente');
else if (sha(readFileSync(contact.file)) !== contact.sha256) failures.push('contact sheet: SHA divergiu');

if (failures.length) {
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}
console.log(`CINEMATIC-UI-EVIDENCE OK: ${required.length} telas · 1536x1024 · ${version} · fonte/PNG/contact SHA`);
