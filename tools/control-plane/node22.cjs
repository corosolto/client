#!/usr/bin/env node
'use strict';

const { existsSync } = require('fs');
const { spawnSync } = require('child_process');

const [, , target, ...args] = process.argv;
if (!target) {
  console.error('uso: node node22.cjs <script> [...args]');
  process.exit(2);
}

function valid(candidate) {
  if (!candidate || !existsSync(candidate)) return false;
  const result = spawnSync(candidate, ['-e', "process.exit(+process.versions.node.split('.')[0] >= 22 ? 0 : 1)"], { timeout: 3000 });
  return result.status === 0;
}

const runtime = [process.env.CSBR_CONTROL_NODE, '/opt/homebrew/bin/node', process.execPath].find(valid);
if (!runtime) {
  console.error('control plane exige Node >=22; defina CSBR_CONTROL_NODE');
  process.exit(2);
}
const result = spawnSync(runtime, [target, ...args], { stdio: 'inherit', env: process.env });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.signal) process.kill(process.pid, result.signal);
process.exit(result.status ?? 1);
