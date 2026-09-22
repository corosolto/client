#!/usr/bin/env node
import {
  copyFileSync, cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dryRun = process.argv.includes('--dry-run');
const HOME_DIR = homedir();
const SOURCE = resolve(fileURLToPath(new URL('.', import.meta.url)));
const BASE = join(HOME_DIR, '.ai-infra');
const RUNTIME = join(BASE, 'runtime');
const STATE = join(BASE, 'state');
const LOGS = join(BASE, 'logs');
const BACKUPS = join(BASE, 'backups');
const AGENTS = join(HOME_DIR, 'Library/LaunchAgents');
const UID = process.getuid();
const DOMAIN = `gui/${UID}`;
const repo = process.env.CSBR_CONTROL_REPO_ROOT || '/Users/ruben/csbrasil/client';

function validNode(path) {
  if (!existsSync(path)) return false;
  const r = spawnSync(path, ['-e', "const m=+process.versions.node.split('.')[0];process.exit(m>=22?0:1)"], { timeout: 3000 });
  return r.status === 0;
}
const candidates = [process.env.CSBR_CONTROL_NODE, '/opt/homebrew/bin/node', process.execPath].filter(Boolean);
const NODE = candidates.find(validNode);
if (!NODE) { console.error('não achei Node >=22 para o control plane'); process.exit(2); }

const xml = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const array = (values) => `<array>${values.map((v) => `<string>${xml(v)}</string>`).join('')}</array>`;
function plist({ label, args, keepAlive = false, interval = 0, stdout, stderr }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key>${array(args)}
<key>WorkingDirectory</key><string>${RUNTIME}</string>
<key>EnvironmentVariables</key><dict>
  <key>PATH</key><string>${HOME_DIR}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  <key>CSBR_CONTROL_STATE_DIR</key><string>${STATE}</string>
  <key>CSBR_CONTROL_REPO_ROOT</key><string>${xml(repo)}</string>
  <key>CSBR_CONTROL_PORT</key><string>4180</string>
  <key>NODE_NO_WARNINGS</key><string>1</string>
</dict>
<key>RunAtLoad</key><true/>
${keepAlive ? '<key>KeepAlive</key><true/>' : `<key>StartInterval</key><integer>${interval}</integer>`}
<key>StandardOutPath</key><string>${stdout}</string>
<key>StandardErrorPath</key><string>${stderr}</string>
<key>ProcessType</key><string>Background</string>
<key>ThrottleInterval</key><integer>10</integer>
</dict></plist>\n`;
}

const specs = [
  {
    label: 'com.ruben.ai-infra-dashboard', args: [NODE, join(RUNTIME, 'server.mjs')], keepAlive: true,
    stdout: join(LOGS, 'dashboard.log'), stderr: join(LOGS, 'dashboard.error.log'),
  },
  {
    label: 'com.ruben.ai-infra-supervisor', args: [NODE, join(RUNTIME, 'cli.mjs'), 'tick'], interval: 300,
    stdout: join(LOGS, 'supervisor.log'), stderr: join(LOGS, 'supervisor.error.log'),
  },
];

if (dryRun) {
  console.log(JSON.stringify({ source: SOURCE, runtime: RUNTIME, state: STATE, node: NODE, repo, services: specs.map((s) => s.label) }, null, 2));
  process.exit(0);
}

for (const p of [BASE, STATE, LOGS, BACKUPS, AGENTS]) mkdirSync(p, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const next = `${RUNTIME}.next-${stamp}`;
rmSync(next, { recursive: true, force: true });
cpSync(SOURCE, next, { recursive: true, force: false });
if (existsSync(RUNTIME)) renameSync(RUNTIME, join(BACKUPS, `runtime-${stamp}`));
renameSync(next, RUNTIME);

for (const spec of specs) {
  const target = join(AGENTS, `${spec.label}.plist`);
  if (existsSync(target)) copyFileSync(target, join(BACKUPS, `${spec.label}-${stamp}.plist`));
  const temp = `${target}.tmp`;
  writeFileSync(temp, plist(spec));
  execFileSync('/usr/bin/plutil', ['-lint', temp], { stdio: 'pipe' });
  renameSync(temp, target);
  spawnSync('/bin/launchctl', ['bootout', `${DOMAIN}/${spec.label}`], { stdio: 'ignore' });
  execFileSync('/bin/launchctl', ['bootstrap', DOMAIN, target], { stdio: 'pipe' });
  execFileSync('/bin/launchctl', ['kickstart', '-k', `${DOMAIN}/${spec.label}`], { stdio: 'pipe' });
}

/* O runtime copiado precisa abrir a mesma DB que os serviços usam antes de
   declarar a instalação pronta. */
execFileSync(NODE, [join(RUNTIME, 'cli.mjs'), 'init'], {
  env: { ...process.env, CSBR_CONTROL_STATE_DIR: STATE, CSBR_CONTROL_REPO_ROOT: repo, NODE_NO_WARNINGS: '1' },
  stdio: 'pipe',
});
console.log(`control plane instalado em ${RUNTIME}`);
console.log('dashboard: http://127.0.0.1:4180/');
console.log(`backups preservados em ${BACKUPS}`);
