import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'acorn';

for (const file of ['main.js', 'site-links.js']) {
  test(`${file} parses on the pre-top-level-await module baseline`, async () => {
    const source = await readFile(new URL(`../public/js/${file}`, import.meta.url), 'utf8');
    parse(source, { ecmaVersion: 2021, sourceType: 'module' });
  });
}
