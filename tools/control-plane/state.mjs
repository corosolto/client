import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const STATE_DIR = resolve(process.env.CSBR_CONTROL_STATE_DIR || join(homedir(), '.ai-infra/state'));
const DB_PATH = join(STATE_DIR, 'control-plane.sqlite');
const now = () => new Date().toISOString();
const SHA_RE = /^[0-9a-f]{40}$/i;
const ACTIVE = "('running','verifying','reviewing')";

const ROADMAP = [
  {
    id: 'CP-001', title: 'Control plane local e seguro', priority: 100, risk: 'medium', status: 'ready',
    role: 'orchestrator', provider: 'codex', requiresApproval: 1,
    objective: 'Manter roadmap, agentes, worktrees, gates e aprovações observáveis durante trabalho autônomo.',
    acceptance: 'Dashboard sobrevive a reinício, não duplica leases e não atravessa gates humanos.',
    gates: ['eval:controlplane', 'install:smoke'],
    dependencies: [], worktree: '/Users/ruben/csbrasil/worktrees/agent-control-plane', branch: 'codex/agent-control-plane',
  },
  {
    id: 'AUD-001', title: 'Escuta humana do pack Fab no jogo', priority: 90, risk: 'medium', status: 'needs_approval',
    role: 'audio_qa', provider: 'human', requiresApproval: 1,
    objective: 'Comparar no jogo real tiro, recarga, ferrolho e passos contra o synth.',
    acceptance: 'Decisões de escuta registradas por evento; nenhum WAV fonte publicado.',
    gates: ['audio:human-listen'],
    dependencies: [], worktree: '/Users/ruben/csbrasil/worktrees/audio-fab-pilot', branch: 'claude/audio-fab-pilot',
  },
  {
    id: 'ADM-001', title: 'Telemetria e retenção confiáveis', priority: 95, risk: 'medium', status: 'ready',
    role: 'analytics', provider: 'codex', requiresApproval: 0,
    objective: 'Consolidar DAU, sessões, multiplayer e retenção com definições únicas e dados auditáveis.',
    acceptance: 'Relatório reproduzível, discrepâncias explicadas e funil com fonte e janela explícitas.',
    gates: ['eval:analytics', 'db:smoke'],
    dependencies: [], worktree: '/private/tmp/csbrasil-client-player-analytics', branch: 'codex/player-analytics-instrumentation',
  },
  {
    id: 'VM-001', title: 'Pipeline AK + pistola antes do lote', priority: 80, risk: 'high', status: 'blocked',
    role: 'asset_qa', provider: 'claude', requiresApproval: 1,
    objective: 'Fechar uma técnica visual aprovada para AK e pistola antes de processar outras famílias.',
    acceptance: 'Blender, GLB, runtime, frames servidos e aprovação visual; viewmodel-blender preservado.',
    gates: ['eval:vm', 'visual:human'],
    dependencies: [], worktree: '/Users/ruben/csbrasil/worktrees/vm-fable51-pistol', branch: 'claude/vm-fable51-pistol',
  },
  {
    id: 'RET-001', title: 'Plano mensurável de retenção até 100 jogadores/dia', priority: 85, risk: 'low', status: 'blocked',
    role: 'product_analyst', provider: 'codex', requiresApproval: 0,
    objective: 'Priorizar correções e loops que elevem sessões válidas, multiplayer e retorno.',
    acceptance: 'Baseline confiável, metas por etapa, experimentos e critérios de parada.',
    gates: ['report:reproducible'],
    dependencies: ['ADM-001'], worktree: '/private/tmp/csbrasil-client-player-analytics', branch: 'codex/player-analytics-instrumentation',
  },
];

export function openDb() {
  mkdirSync(STATE_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS roadmap_items (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, objective TEXT NOT NULL,
      acceptance_criteria TEXT NOT NULL, priority INTEGER NOT NULL, risk TEXT NOT NULL,
      status TEXT NOT NULL, role TEXT NOT NULL, provider TEXT NOT NULL,
      worktree_path TEXT, branch TEXT, dependencies_json TEXT NOT NULL DEFAULT '[]',
      required_gates_json TEXT NOT NULL DEFAULT '[]',
      requires_approval INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY, roadmap_item_id TEXT NOT NULL REFERENCES roadmap_items(id),
      provider TEXT NOT NULL, role TEXT NOT NULL, thread_id TEXT, worktree_path TEXT,
      branch TEXT, base_sha TEXT, head_sha TEXT, status TEXT NOT NULL,
      heartbeat_at TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, summary TEXT
    );
    CREATE TABLE IF NOT EXISTS checks (
      id TEXT PRIMARY KEY, run_id TEXT REFERENCES agent_runs(id), name TEXT NOT NULL,
      status TEXT NOT NULL, tested_sha TEXT, duration_ms INTEGER, summary TEXT,
      evidence_path TEXT, executed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blockers (
      id TEXT PRIMARY KEY, roadmap_item_id TEXT NOT NULL REFERENCES roadmap_items(id),
      category TEXT NOT NULL, message TEXT NOT NULL, requires_user INTEGER NOT NULL DEFAULT 0,
      next_action TEXT, opened_at TEXT NOT NULL, resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS worktrees (
      path TEXT PRIMARY KEY, branch TEXT, head_sha TEXT, dirty INTEGER NOT NULL DEFAULT 0,
      ahead INTEGER NOT NULL DEFAULT 0, behind INTEGER NOT NULL DEFAULT 0,
      present INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS health (
      key TEXT PRIMARY KEY, label TEXT NOT NULL, status TEXT NOT NULL,
      detail TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL,
      source TEXT NOT NULL, run_id TEXT, event_type TEXT NOT NULL, payload_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_roadmap_status_priority ON roadmap_items(status, priority DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_status_heartbeat ON agent_runs(status, heartbeat_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_active_item ON agent_runs(roadmap_item_id)
      WHERE status IN ('running','verifying','reviewing');
    CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_active_worktree ON agent_runs(worktree_path)
      WHERE worktree_path IS NOT NULL AND status IN ('running','verifying','reviewing');
    CREATE INDEX IF NOT EXISTS idx_checks_run_time ON checks(run_id, executed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_blockers_open ON blockers(roadmap_item_id) WHERE resolved_at IS NULL;
  `);
  const columns = new Set(db.prepare('PRAGMA table_info(roadmap_items)').all().map((c) => c.name));
  if (!columns.has('required_gates_json')) db.exec("ALTER TABLE roadmap_items ADD COLUMN required_gates_json TEXT NOT NULL DEFAULT '[]'");
  db.prepare("INSERT INTO schema_meta(key,value) VALUES('version','2') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();
  db.exec('PRAGMA optimize;');
  seed(db);
  return db;
}

function seed(db) {
  const insert = db.prepare(`INSERT INTO roadmap_items
    (id,title,objective,acceptance_criteria,priority,risk,status,role,provider,worktree_path,branch,dependencies_json,required_gates_json,requires_approval,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,objective=excluded.objective,
      acceptance_criteria=excluded.acceptance_criteria,priority=excluded.priority,risk=excluded.risk,
      role=excluded.role,provider=excluded.provider,worktree_path=excluded.worktree_path,
      branch=excluded.branch,dependencies_json=excluded.dependencies_json,
      required_gates_json=excluded.required_gates_json,
      requires_approval=excluded.requires_approval`);
  for (const item of ROADMAP) insert.run(
    item.id, item.title, item.objective, item.acceptance, item.priority, item.risk, item.status,
    item.role, item.provider, item.worktree, item.branch, JSON.stringify(item.dependencies), JSON.stringify(item.gates), item.requiresApproval, now(),
  );
}

export function event(db, source, type, payload = {}, runId = null) {
  db.prepare('INSERT INTO events(timestamp,source,run_id,event_type,payload_json) VALUES(?,?,?,?,?)')
    .run(now(), source, runId, type, JSON.stringify(payload));
}

function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function dependenciesReady(db, item) {
  const ids = JSON.parse(item.dependencies_json || '[]');
  const pending = ids.filter((id) => db.prepare('SELECT status FROM roadmap_items WHERE id=?').get(id)?.status !== 'done');
  if (pending.length) throw new Error(`${item.id} depende de item não concluído: ${pending.join(', ')}`);
}

function assertAutonomousStart(db, item) {
  dependenciesReady(db, item);
  if (item.risk === 'high') {
    const approved = db.prepare(`SELECT 1 FROM events WHERE source='macos-human-confirmation'
      AND event_type='roadmap.human_decision' AND json_extract(payload_json,'$.id')=?
      AND json_extract(payload_json,'$.to')='ready' ORDER BY sequence DESC LIMIT 1`).get(item.id);
    if (!approved) throw new Error(`${item.id} é high-risk e exige liberação humana explícita`);
  }
}

const ALLOWED = {
  backlog: ['ready', 'blocked'], ready: ['running', 'blocked'],
  running: ['verifying', 'needs_approval', 'blocked', 'ready'],
  verifying: ['review_ready', 'running', 'blocked'],
  review_ready: ['needs_approval', 'done', 'blocked'],
  needs_approval: ['ready', 'done', 'blocked'], blocked: ['ready'], done: [], rejected: ['ready'],
};

export function transition(db, id, target, { source = 'agent', note = '' } = {}) {
  const item = db.prepare('SELECT * FROM roadmap_items WHERE id=?').get(id);
  if (!item) throw new Error(`roadmap item inexistente: ${id}`);
  if (!(ALLOWED[item.status] || []).includes(target)) throw new Error(`transição inválida: ${item.status} -> ${target}`);
  if (target === 'running') throw new Error('use run-start para adquirir lease antes de running');
  const bypass = process.env.CSBR_CONTROL_MUTANTE === 'sem-aprovacao';
  if (!bypass && target === 'done' && item.requires_approval) {
    throw new Error(`${id} exige aprovação humana antes de done`);
  }
  if (!bypass && item.status === 'blocked' && target === 'ready') {
    dependenciesReady(db, item);
    if (item.risk === 'high' || item.requires_approval) throw new Error(`${id} exige liberação humana explícita`);
  }
  return transaction(db, () => {
    db.prepare('UPDATE roadmap_items SET status=?,updated_at=? WHERE id=?').run(target, now(), id);
    event(db, source, 'roadmap.transition', { id, from: item.status, to: target, note });
    return { id, from: item.status, to: target };
  });
}

/* Só deve ser chamado pelo comando `approve`, depois de uma confirmação nativa
   visível no macOS. Não existe flag `actor=human` como credencial. */
export function applyHumanDecision(db, id, target, note = '') {
  if (!['ready', 'done'].includes(target)) throw new Error(`decisão humana inválida: ${target}`);
  const item = db.prepare('SELECT * FROM roadmap_items WHERE id=?').get(id);
  if (!item) throw new Error(`roadmap item inexistente: ${id}`);
  if (!(ALLOWED[item.status] || []).includes(target)) throw new Error(`transição inválida: ${item.status} -> ${target}`);
  if (target === 'ready') dependenciesReady(db, item);
  return transaction(db, () => {
    db.prepare('UPDATE roadmap_items SET status=?,updated_at=? WHERE id=?').run(target, now(), id);
    event(db, 'macos-human-confirmation', 'roadmap.human_decision', { id, from: item.status, to: target, note });
    return { id, from: item.status, to: target };
  });
}

export function startRun(db, itemId, { thread = null } = {}) {
  return transaction(db, () => {
    const item = db.prepare('SELECT * FROM roadmap_items WHERE id=?').get(itemId);
    if (!item) throw new Error(`roadmap item inexistente: ${itemId}`);
    if (item.status !== 'ready') throw new Error(`${itemId} não está ready: ${item.status}`);
    assertAutonomousStart(db, item);
    if (item.provider === 'human') throw new Error(`${itemId} é uma tarefa humana e não pode iniciar agente`);
    for (const key of ['zenith', 'git', item.provider]) {
      const h = db.prepare('SELECT status,detail FROM health WHERE key=?').get(key);
      if (!h || h.status !== 'ok') throw new Error(`preflight ${key} não está verde: ${h?.detail || 'sem medição'}`);
    }
    const worktree = item.worktree_path;
    const wt = worktree && db.prepare('SELECT * FROM worktrees WHERE path=?').get(worktree);
    if (!wt || !wt.present) throw new Error(`worktree ausente ou ilegível: ${worktree || '(vazia)'}`);
    if (wt.dirty) throw new Error(`worktree possui ${wt.dirty} alteração(ões): ${worktree}`);
    if (!SHA_RE.test(wt.head_sha || '')) throw new Error(`HEAD inventariado inválido: ${wt.head_sha || '(vazio)'}`);
    const repoRoot = resolve(process.env.CSBR_CONTROL_REPO_ROOT || '/Users/ruben/csbrasil/client');
    if (resolve(worktree) === repoRoot) throw new Error(`checkout raiz é protegido: ${worktree}`);
    if (/^(main|master|primary)$/i.test(item.branch || '')) throw new Error(`branch protegida: ${item.branch}`);
    if (wt.branch !== item.branch) throw new Error(`branch inventariada diverge do roadmap: ${wt.branch} != ${item.branch}`);
    const active = db.prepare(`SELECT id FROM agent_runs WHERE roadmap_item_id=? AND status IN ${ACTIVE}`).get(itemId);
    if (active) throw new Error(`${itemId} já tem run ativa: ${active.id}`);
    const owner = db.prepare(`SELECT id,roadmap_item_id FROM agent_runs WHERE worktree_path=? AND status IN ${ACTIVE}`).get(worktree);
    if (owner) throw new Error(`${worktree} já tem lease ativa de ${owner.roadmap_item_id}`);
    const role = item.role;
    const reviewer = role === 'reviewer';
    const count = db.prepare(`SELECT COUNT(*) AS n FROM agent_runs WHERE status IN ${ACTIVE}
      AND CASE WHEN ? THEN role='reviewer' ELSE role!='reviewer' END`).get(reviewer ? 1 : 0).n;
    const limit = reviewer ? 1 : 2;
    if (count >= limit) throw new Error(`teto de concorrência atingido: ${limit} ${reviewer ? 'reviewer' : 'workers'}`);
    const id = randomUUID(), at = now();
    db.prepare('UPDATE roadmap_items SET status=?,updated_at=? WHERE id=?').run('running', at, itemId);
    event(db, 'orchestrator', 'roadmap.transition', { id: itemId, from: item.status, to: 'running', note: 'run iniciada' });
    db.prepare(`INSERT INTO agent_runs
      (id,roadmap_item_id,provider,role,thread_id,worktree_path,branch,base_sha,status,heartbeat_at,started_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, itemId, item.provider, role, thread,
      worktree, item.branch, wt.head_sha || null, 'running', at, at,
    );
    event(db, 'orchestrator', 'run.started', { itemId, provider: item.provider, worktree, branch: item.branch }, id);
    return id;
  });
}

export function finishRun(db, id, status, fields = {}) {
  if (!['technically_green', 'needs_runtime_validation', 'needs_approval', 'blocked', 'rejected'].includes(status)) {
    throw new Error(`status final inválido: ${status}`);
  }
  const run = db.prepare('SELECT * FROM agent_runs WHERE id=?').get(id);
  if (!run) throw new Error(`run inexistente: ${id}`);
  const item = db.prepare('SELECT * FROM roadmap_items WHERE id=?').get(run.roadmap_item_id);
  const head = fields.head || '';
  if (status === 'technically_green') {
    if (!SHA_RE.test(head)) throw new Error('technically_green exige HEAD Git completo de 40 hex');
    const wt = db.prepare('SELECT head_sha,dirty,present FROM worktrees WHERE path=?').get(run.worktree_path);
    if (!wt?.present || wt.dirty || String(wt.head_sha).toLowerCase() !== head.toLowerCase()) {
      throw new Error(`HEAD ${head} não coincide com worktree limpa inventariada`);
    }
    const required = JSON.parse(item.required_gates_json || '[]');
    const missing = required.filter((name) => !db.prepare(
      "SELECT 1 FROM checks WHERE run_id=? AND name=? AND status='passed' AND lower(tested_sha)=lower(?) LIMIT 1",
    ).get(id, name, head));
    if (missing.length) throw new Error(`gates ausentes para ${head}: ${missing.join(', ')}`);
  }
  const itemStatus = {
    technically_green: 'review_ready', needs_runtime_validation: 'verifying',
    needs_approval: 'needs_approval', blocked: 'blocked', rejected: 'rejected',
  }[status];
  transaction(db, () => {
    const at = now();
    db.prepare('UPDATE agent_runs SET status=?,head_sha=?,summary=?,heartbeat_at=?,finished_at=? WHERE id=?')
      .run(status, head || null, fields.summary || '', at, at, id);
    db.prepare('UPDATE roadmap_items SET status=?,updated_at=? WHERE id=?').run(itemStatus, at, run.roadmap_item_id);
    event(db, 'orchestrator', 'run.finished', { status, head: head || null }, id);
  });
}

export function recordCheck(db, runId, name, status, fields = {}) {
  if (!['passed', 'failed', 'blocked', 'not_run'].includes(status)) throw new Error(`check inválido: ${status}`);
  if (!name) throw new Error('check exige nome');
  if (status === 'passed' && !SHA_RE.test(fields.sha || '')) throw new Error('check passed exige SHA Git completo de 40 hex');
  if (runId && !db.prepare('SELECT id FROM agent_runs WHERE id=?').get(runId)) throw new Error(`run inexistente: ${runId}`);
  const id = randomUUID();
  return transaction(db, () => {
    db.prepare(`INSERT INTO checks(id,run_id,name,status,tested_sha,duration_ms,summary,evidence_path,executed_at)
      VALUES(?,?,?,?,?,?,?,?,?)`).run(id, runId || null, name, status, fields.sha || null,
      fields.duration ? Number(fields.duration) : null, fields.summary || '', fields.evidence || null, now());
    event(db, 'gate-runner', 'check.recorded', { name, status, sha: fields.sha || null }, runId || null);
    return id;
  });
}

export function addBlocker(db, itemId, fields = {}) {
  if (!db.prepare('SELECT id FROM roadmap_items WHERE id=?').get(itemId)) throw new Error(`roadmap item inexistente: ${itemId}`);
  const id = randomUUID();
  return transaction(db, () => {
    db.prepare(`INSERT INTO blockers(id,roadmap_item_id,category,message,requires_user,next_action,opened_at)
      VALUES(?,?,?,?,?,?,?)`).run(id, itemId, fields.category || 'unknown', fields.message || 'sem detalhe',
      fields.requiresUser ? 1 : 0, fields.next || '', now());
    event(db, 'agent', 'blocker.opened', { itemId, category: fields.category || 'unknown' });
    return id;
  });
}

export function snapshot(db) {
  const parseDeps = (row) => ({
    ...row,
    dependencies: JSON.parse(row.dependencies_json || '[]'),
    required_gates: JSON.parse(row.required_gates_json || '[]'),
  });
  return {
    generatedAt: now(),
    deploymentMode: process.env.CSBR_CONTROL_INSTALLATION === 'installed' ? 'installed' : 'observer-only',
    roadmap: db.prepare('SELECT * FROM roadmap_items ORDER BY priority DESC,id').all().map(parseDeps),
    runs: db.prepare('SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 100').all(),
    checks: db.prepare('SELECT * FROM checks ORDER BY executed_at DESC LIMIT 200').all(),
    blockers: db.prepare('SELECT * FROM blockers WHERE resolved_at IS NULL ORDER BY opened_at DESC').all(),
    worktrees: db.prepare('SELECT * FROM worktrees ORDER BY dirty DESC,present DESC,path').all(),
    health: db.prepare('SELECT * FROM health ORDER BY key').all(),
    events: db.prepare('SELECT * FROM events ORDER BY sequence DESC LIMIT 100').all().map((r) => ({ ...r, payload: JSON.parse(r.payload_json) })),
  };
}

export function statePaths() { return { stateDir: STATE_DIR, dbPath: DB_PATH }; }
