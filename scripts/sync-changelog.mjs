#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const path = 'CHANGELOG.md';
const current = readFileSync(path, 'utf8');
if (current.includes(`## [${version}]`)) process.exit(0);

const body = execFileSync('git', ['log', '-1', '--format=%B'], { encoding: 'utf8' });
const lines = body.split('\n').map(line => line.trim()).filter(Boolean);
const summary = lines.find(line => !/^Merge pull request /i.test(line) && !/^Signed-off-by:/i.test(line))
  || lines[0]
  || `Publicação ${version}`;
const safeSummary = summary.replace(/[<>]/g, '').replace(/\s+/g, ' ');
const date = new Date().toISOString().slice(0, 10);
const first = current.indexOf('\n## [');
if (first < 0) throw new Error('CHANGELOG.md não contém nenhuma seção de versão');

const section = `\n## [${version}] — ${date}\n\n### Mudado\n- ${safeSummary}\n- [Notas completas do release](https://github.com/rubenmarcus/csbrasil/releases/tag/v${version}).\n`;
writeFileSync(path, current.slice(0, first) + section + current.slice(first));
