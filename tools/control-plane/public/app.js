const $ = (id) => document.getElementById(id);
const esc = (v = '') => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const short = (v = '') => v ? String(v).slice(0, 8) : '—';
const ago = (iso) => {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  return `${Math.floor(seconds / 3600)}h`;
};
const badge = (status) => `<span class="badge ${esc(status)}">${esc(status.replaceAll('_', ' '))}</span>`;
const empty = (text) => `<div class="empty">${esc(text)}</div>`;

function render(data) {
  const installed = data.deploymentMode === 'installed';
  $('mode').textContent = installed ? 'INSTALADO · OBSERVAÇÃO ATIVA' : 'OBSERVER-ONLY · NÃO INSTALADO';
  $('mode').className = `mode-banner ${installed ? 'installed' : 'observer'}`;
  $('updated').textContent = `snapshot ${new Date(data.generatedAt).toLocaleTimeString('pt-BR')}`;
  const healthy = data.health.filter((h) => h.status === 'ok').length;
  $('live').textContent = `${healthy}/${data.health.length} serviços verdes`;
  $('live').className = healthy === data.health.length ? 'live ok' : 'live warn';

  $('health').innerHTML = data.health.map((h) => `<article class="health-card ${esc(h.status)}">
    <div class="health-top"><span class="dot"></span><strong>${esc(h.label)}</strong>${badge(h.status)}</div>
    <p>${esc(h.detail)}</p><small>${ago(h.updated_at)} atrás</small></article>`).join('');

  const statuses = ['running', 'verifying', 'review_ready', 'ready', 'needs_approval', 'blocked', 'done'];
  const counts = Object.fromEntries(statuses.map((s) => [s, data.roadmap.filter((i) => i.status === s).length]));
  $('metrics').innerHTML = `<span><b>${counts.running + counts.verifying}</b> em curso</span><span><b>${counts.ready}</b> prontas</span><span><b>${counts.needs_approval}</b> aprovações</span>`;
  $('roadmap').innerHTML = statuses.filter((status) => counts[status]).map((status) => `<div class="lane">
    <div class="lane-head"><span>${esc(status.replaceAll('_', ' '))}</span><b>${counts[status]}</b></div>
    ${data.roadmap.filter((i) => i.status === status).map((i) => {
      const open = data.blockers.filter((b) => b.roadmap_item_id === i.id);
      return `<article class="task ${esc(i.risk)}">
      <div class="task-top"><code>${esc(i.id)}</code><span>P${esc(i.priority)} · ${esc(i.risk)}</span></div>
      <h3>${esc(i.title)}</h3><p>${esc(i.objective)}</p>
      ${i.dependencies.length ? `<p class="dependency">depende de ${i.dependencies.map(esc).join(', ')}</p>` : ''}
      ${open.map((b) => `<p class="blocker" title="${esc(b.next_action)}">bloqueio: ${esc(b.message)}</p>`).join('')}
      <footer><span>${esc(i.provider)} / ${esc(i.role)}</span><span>${i.requires_approval ? 'aprovação humana' : 'autônoma'}</span></footer>
    </article>`; }).join('')}</div>`).join('');

  const approvals = data.roadmap.filter((i) => i.status === 'needs_approval');
  $('approvals').innerHTML = approvals.length ? approvals.map((i) => `<article class="row-card attention"><div><code>${esc(i.id)}</code><h3>${esc(i.title)}</h3><p>${esc(i.acceptance_criteria)}</p></div>${badge(i.status)}</article>`).join('') : empty('Nenhuma decisão humana pendente.');

  $('runs').innerHTML = data.runs.length ? data.runs.slice(0, 8).map((r) => `<article class="row-card"><div><code>${esc(r.roadmap_item_id)}</code><h3>${esc(r.provider)} · ${esc(r.role)}</h3><p>${esc(r.branch || r.worktree_path || 'sem lane')}</p></div>${badge(r.status)}</article>`).join('') : empty('Nenhum agente registrado ainda.');

  $('worktrees').innerHTML = data.worktrees.map((w) => `<tr class="${w.present ? '' : 'missing'}"><td><strong>${esc(w.path.split('/').pop())}</strong><small>${esc(w.path)}</small></td><td>${esc(w.branch || 'detached')}</td><td><code>${short(w.head_sha)}</code></td><td>${w.present ? (w.dirty ? badge('dirty') : badge('clean')) : badge('missing')}${w.ahead ? ` <span class="delta">+${w.ahead}</span>` : ''}${w.behind ? ` <span class="delta">−${w.behind}</span>` : ''}</td></tr>`).join('');

  $('checks').innerHTML = data.checks.length ? data.checks.slice(0, 10).map((c) => `<article class="row-card"><div><h3>${esc(c.name)}</h3><p><code>${short(c.tested_sha)}</code> ${esc(c.summary || '')}</p></div>${badge(c.status)}</article>`).join('') : empty('Os gates aparecerão aqui quando um run for registrado.');
  $('events').innerHTML = data.events.length ? data.events.slice(0, 10).map((e) => `<article class="event"><span>${ago(e.timestamp)}</span><strong>${esc(e.event_type)}</strong><code>${esc(e.source)}</code></article>`).join('') : empty('Sem eventos ainda.');
}

async function refresh() {
  $('refresh').disabled = true;
  try {
    const response = await fetch('/api/snapshot', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(await response.json());
  } catch (error) {
    $('live').textContent = `offline: ${error.message}`; $('live').className = 'live error';
  } finally { $('refresh').disabled = false; }
}
$('refresh').onclick = refresh;
refresh();
setInterval(refresh, 15000);
