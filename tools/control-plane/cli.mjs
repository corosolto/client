#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { openDb, snapshot, transition, applyHumanDecision, startRun, finishRun, recordCheck, addBlocker, event, statePaths } from './state.mjs';
import { refreshAll } from './inventory.mjs';

const [command = 'help', ...rest] = process.argv.slice(2);
const flag = (name, fallback = '') => (rest.find((a) => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=') || fallback;
const positional = rest.filter((a) => !a.startsWith('--'));
const hasFlag = (name) => rest.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const rejectFlags = (...names) => {
  const used = names.filter(hasFlag);
  if (used.length) throw new Error(`flag(s) proibida(s): ${used.map((n) => `--${n}`).join(', ')}`);
};
const db = openDb();

try {
  if (command === 'init' || command === 'tick') {
    refreshAll(db);
    if (command === 'tick') event(db, 'watchdog', 'tick.completed', { state: statePaths().dbPath });
    console.log(JSON.stringify({ ok: true, command, ...statePaths() }));
  } else if (command === 'snapshot') {
    console.log(JSON.stringify(snapshot(db)));
  } else if (command === 'transition') {
    const [id, target] = positional;
    rejectFlags('actor');
    if (!id || !target) throw new Error('uso: transition <item> <status> --note=...');
    console.log(JSON.stringify(transition(db, id, target, { source: 'agent', note: flag('note') })));
  } else if (command === 'approve') {
    const [id, target] = positional;
    rejectFlags('actor');
    if (!id || !target) throw new Error('uso: approve <item> <ready|done> --note=...');
    const item = db.prepare('SELECT title,status FROM roadmap_items WHERE id=?').get(id);
    if (!item) throw new Error(`roadmap item inexistente: ${id}`);
    const script = 'display dialog (item 1 of argv) with title "CSBR Control Plane" buttons {"Cancelar", "Aprovar"} default button "Aprovar" cancel button "Cancelar" with icon caution';
    const prompt = `${id}: ${item.title}\n${item.status} → ${target}\n\nEsta ação exige clique humano local.`;
    const confirmation = spawnSync('/usr/bin/osascript', ['-e', script, prompt], { encoding: 'utf8', timeout: 120000 });
    if (confirmation.status !== 0 || !confirmation.stdout.includes('button returned:Aprovar')) throw new Error('aprovação humana cancelada ou indisponível');
    console.log(JSON.stringify(applyHumanDecision(db, id, target, flag('note'))));
  } else if (command === 'run-start') {
    const [itemId] = positional;
    rejectFlags('provider', 'role', 'worktree', 'branch', 'base', 'actor');
    if (!itemId) throw new Error('uso: run-start <item> [--thread=id]');
    const id = startRun(db, itemId, { thread: flag('thread') || null });
    console.log(JSON.stringify({ ok: true, runId: id }));
  } else if (command === 'heartbeat') {
    const [runId] = positional;
    const r = db.prepare('UPDATE agent_runs SET heartbeat_at=? WHERE id=?').run(new Date().toISOString(), runId);
    if (!r.changes) throw new Error(`run inexistente: ${runId}`);
    console.log(JSON.stringify({ ok: true, runId }));
  } else if (command === 'run-finish') {
    const [runId, status] = positional;
    rejectFlags('actor');
    finishRun(db, runId, status, { head: flag('head'), summary: flag('summary') });
    console.log(JSON.stringify({ ok: true, runId, status }));
  } else if (command === 'check') {
    const [runId, name, status] = positional;
    const id = recordCheck(db, runId === '-' ? null : runId, name, status, {
      sha: flag('sha'), duration: flag('duration'), summary: flag('summary'), evidence: flag('evidence'),
    });
    console.log(JSON.stringify({ ok: true, checkId: id }));
  } else if (command === 'block') {
    const [itemId] = positional;
    const id = addBlocker(db, itemId, {
      category: flag('category'), message: flag('message'), next: flag('next'),
      requiresUser: flag('requires-user') === '1',
    });
    console.log(JSON.stringify({ ok: true, blockerId: id }));
  } else if (command === 'help') {
    console.log('comandos: init | tick | snapshot | transition | approve | run-start | heartbeat | run-finish | check | block');
  } else throw new Error(`comando desconhecido: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
