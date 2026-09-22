import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { openDb, event } from './state.mjs';

const REPO = process.env.CSBR_CONTROL_REPO_ROOT || '/Users/ruben/csbrasil/client';
const now = () => new Date().toISOString();
const run = (cmd, args, timeout = 5000) => spawnSync(cmd, args, { encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024 });

function health(db, key, label, status, detail) {
  db.prepare(`INSERT INTO health(key,label,status,detail,updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(key) DO UPDATE SET label=excluded.label,status=excluded.status,detail=excluded.detail,updated_at=excluded.updated_at`)
    .run(key, label, status, String(detail || '').slice(0, 500), now());
}

function version(db, key, label, command, args = ['--version']) {
  const r = run(command, args, 3000);
  const text = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n')[0].slice(0, 180);
  health(db, key, label, r.status === 0 ? 'ok' : 'error', text || (r.error?.message || `exit ${r.status}`));
}

function parseWorktrees(text) {
  const rows = []; let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('worktree ')) { if (current) rows.push(current); current = { path: line.slice(9) }; }
    else if (current && line.startsWith('HEAD ')) current.head = line.slice(5);
    else if (current && line.startsWith('branch ')) current.branch = line.slice(7).replace('refs/heads/', '');
  }
  if (current) rows.push(current);
  return rows;
}

function refreshWorktrees(db) {
  db.prepare('UPDATE worktrees SET present=0,updated_at=?').run(now());
  if (!existsSync(REPO)) { health(db, 'git', 'Git roots', 'error', `${REPO} indisponível`); return; }
  const listed = run('git', ['-C', REPO, 'worktree', 'list', '--porcelain']);
  if (listed.status !== 0) { health(db, 'git', 'Git roots', 'error', (listed.stderr || '').trim()); return; }
  const upsert = db.prepare(`INSERT INTO worktrees(path,branch,head_sha,dirty,ahead,behind,present,updated_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET branch=excluded.branch,head_sha=excluded.head_sha,
    dirty=excluded.dirty,ahead=excluded.ahead,behind=excluded.behind,present=excluded.present,updated_at=excluded.updated_at`);
  for (const w of parseWorktrees(listed.stdout)) {
    let dirty = -1, ahead = 0, behind = 0, present = 0;
    if (existsSync(w.path)) {
      const s = run('git', ['-C', w.path, 'status', '--porcelain=v1', '--branch'], 5000);
      if (s.status === 0) {
        present = 1;
        const lines = s.stdout.trim().split('\n').filter(Boolean);
        dirty = lines.filter((l) => !l.startsWith('##')).length;
        const header = lines.find((l) => l.startsWith('##')) || '';
        ahead = Number(header.match(/ahead (\d+)/)?.[1] || 0);
        behind = Number(header.match(/behind (\d+)/)?.[1] || 0);
      }
    }
    upsert.run(w.path, w.branch || '(detached)', w.head || '', dirty, ahead, behind, present, now());
  }
  const unreadable = db.prepare('SELECT COUNT(*) AS n FROM worktrees WHERE present=0').get().n;
  health(db, 'git', 'Git roots', 'ok',
    `${parseWorktrees(listed.stdout).length} worktrees inventariados; ${unreadable} ausentes ou ilegíveis`);
}

export function refreshAll(db = openDb()) {
  const disk = run('/usr/sbin/diskutil', ['info', '/Volumes/Zenith'], 3000);
  const mounted = disk.status === 0 && /^\s*Mounted:\s+Yes\s*$/mi.test(disk.stdout || '');
  const unlocked = disk.status === 0 && !/^\s*Locked:\s+Yes\s*$/mi.test(disk.stdout || '');
  const zenith = existsSync('/Volumes/Zenith') && mounted && unlocked;
  health(db, 'zenith', 'Zenith', zenith ? 'ok' : 'error', zenith ? 'montado e desbloqueado em /Volumes/Zenith' : 'desmontado, bloqueado ou ilegível');
  version(db, 'codex', 'Codex CLI', 'codex');
  version(db, 'claude', 'Claude CLI', 'claude');
  const orca = run('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '2', 'http://127.0.0.1:6768/']);
  const orcaCode = Number(orca.stdout);
  health(db, 'orca', 'Orca hooks', orca.status === 0 && orcaCode >= 200 && orcaCode < 400 ? 'ok' : 'error',
    orca.status === 0 ? `HTTP ${orca.stdout}` : (orca.stderr || 'sem resposta').trim());
  refreshWorktrees(db);
  const staleBefore = Date.now() - 60 * 60 * 1000;
  for (const row of db.prepare("SELECT id,roadmap_item_id,heartbeat_at FROM agent_runs WHERE status IN ('running','verifying','reviewing')").all()) {
    if (Date.parse(row.heartbeat_at) < staleBefore) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const at = now();
        db.prepare("UPDATE agent_runs SET status='stale',finished_at=? WHERE id=?").run(at, row.id);
        db.prepare("UPDATE roadmap_items SET status='blocked',updated_at=? WHERE id=?").run(at, row.roadmap_item_id);
        const open = db.prepare("SELECT id FROM blockers WHERE roadmap_item_id=? AND category='stale-run' AND resolved_at IS NULL").get(row.roadmap_item_id);
        if (!open) db.prepare(`INSERT INTO blockers(id,roadmap_item_id,category,message,requires_user,next_action,opened_at)
          VALUES(?,?,?,?,?,?,?)`).run(randomUUID(), row.roadmap_item_id, 'stale-run',
          `run ${row.id} sem heartbeat desde ${row.heartbeat_at}`, 0, 'inspecionar worktree e retomar com nova lease', at);
        event(db, 'watchdog', 'run.stale', { heartbeatAt: row.heartbeat_at, itemId: row.roadmap_item_id }, row.id);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  }
  return db;
}
