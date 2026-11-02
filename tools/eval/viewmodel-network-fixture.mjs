import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// CI usa os mesmos bytes publicados, sem credenciais nem cópias dos assets no Git.
export async function installViewmodelAssets(page) {
  if (!process.env.VM_PUBLIC_ASSETS) return;
  const origin = new URL(process.env.VM_PUBLIC_ASSETS);
  if (origin.protocol !== 'https:') throw new Error('VM_PUBLIC_ASSETS exige HTTPS');
  const manifest = JSON.parse(readFileSync(new URL('../viewmodels/vm-assets.manifest.json', import.meta.url)));
  const files = new Map(manifest.files.map((entry) => [`${manifest.servedRoot}/${entry.path}`, entry]));
  await page.route('**/private-assets/viewmodels/**', async (route) => {
    const local = new URL(route.request().url());
    const entry = files.get(local.pathname);
    if (!entry) throw new Error(`asset fora do manifesto: ${local.pathname}`);
    const response = await fetch(new URL(local.pathname + local.search, origin), { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`viewmodel publicado: ${response.status} ${entry.path}`);
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length !== entry.bytes || createHash('sha256').update(body).digest('hex') !== entry.sha256) {
      throw new Error(`viewmodel publicado diverge do manifesto: ${entry.path}`);
    }
    await route.fulfill({ status: 200, contentType: entry.contentType, body });
  });
}
