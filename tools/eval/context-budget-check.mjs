#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const numberFlag = (name, fallback) => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix));
  const value = raw ? Number(raw.slice(prefix.length)) : fallback;
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} precisa ser positivo`);
  return value;
};

const all = process.argv.includes('--all');
const strict = process.argv.includes('--strict');
const warnBytes = numberFlag('warn-mb', 250) * 1024 * 1024;
const failBytes = numberFlag('fail-mb', 500) * 1024 * 1024;
const activeHours = numberFlag('active-hours', 24);
const activeMs = activeHours * 60 * 60 * 1000;
const top = Math.floor(numberFlag('top', all ? 10 : 3));
const codexRoot = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const sessionsRoot = path.join(codexRoot, 'sessions');

const walk = (directory, output = []) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, output);
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      const stat = fs.statSync(target);
      output.push({ target, bytes: stat.size, mtimeMs: stat.mtimeMs });
    }
  }
  return output;
};

const human = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit >= 2 ? 1 : 0)} ${units[unit]}`;
};

const sessionId = (file) => path.basename(file, '.jsonl').match(
  /([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i,
)?.[1] || path.basename(file, '.jsonl');

if (!fs.existsSync(sessionsRoot)) {
  console.log(`Context budget: sem diretório de sessões em ${sessionsRoot}`);
  process.exit(0);
}

const cutoff = Date.now() - activeMs;
const sessions = walk(sessionsRoot)
  .filter((item) => all || item.mtimeMs >= cutoff)
  .sort((left, right) => right.bytes - left.bytes);
const failures = sessions.filter((item) => item.bytes >= failBytes);
const warnings = sessions.filter((item) => item.bytes >= warnBytes && item.bytes < failBytes);
const state = failures.length ? 'FAIL' : warnings.length ? 'WARN' : 'OK';

console.log(`Context budget: ${state} · ${sessions.length} sessão(ões) ${all ? 'no histórico' : `ativas nas últimas ${activeHours}h`}`);
for (const item of sessions.slice(0, top)) {
  console.log(`  ${sessionId(item.target)} · ${human(item.bytes)} · ${new Date(item.mtimeMs).toISOString()}`);
}
if (warnings.length || failures.length) {
  console.log(`  orçamento: aviso ${human(warnBytes)} · limite ${human(failBytes)}`);
  console.log('  ação: checkpoint em git + handoff curto + nova tarefa; não cole logs/renders no chat');
}
if (failures.length || (strict && warnings.length)) process.exitCode = 1;
