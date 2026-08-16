import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('serves crawler-readable metadata and structured game content before WASM boots', async ({ request }) => {
  const response = await request.get('/');
  const html = await response.text();
  expect(html).toContain('<html lang="pt-BR">');
  expect(html).toContain('<meta name="description"');
  expect(html).toContain('<link rel="canonical" href="https://csbrasil.online/">');
  expect(html).toContain('property="og:title"');
  expect(html).toContain('name="twitter:card"');
  expect(html).toContain('"@type":"VideoGame"');
  expect(html).toContain('"@type":"FAQPage"');
  expect(html).toContain('<h1>CS BRASIL: Treta Suprema');
  expect(html).toContain('script src="index.js"');
});

test('packages SEO files and Vercel static headers with the Godot output', async ({ request }) => {
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/og-image.png']) {
    expect((await request.get(path)).ok()).toBe(true);
  }
  const config = JSON.parse(await readFile(new URL('../../vercel.godot-preview.json', import.meta.url), 'utf8'));
  expect(config.buildCommand).toBe('sh scripts/build-vercel.sh');
  expect(config.outputDirectory).toBe('build/web');
  expect(config.headers.some(rule => rule.source.includes('wasm|pck|js'))).toBe(true);
  expect(config.headers.some(rule => rule.source.includes('robots.txt'))).toBe(true);
  const productionConfig = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  expect(productionConfig.outputDirectory).toBe('.');
});
