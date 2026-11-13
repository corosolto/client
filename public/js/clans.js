import { origemCompartilhamento } from './compartilhar.js';
const $ = id => document.getElementById(id);
const app = $('clans-app');
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
// guest = uid+token do jogo; conta Auth vai pelo cookie cs_social e dispensa os dois.
let guest = null, mine = null, pendingInvite = '';
const inviteKey = `cs_clan_invite:${app.dataset.clanId || ''}`;
try {
  const uid = localStorage.getItem('cs_anon'), token = localStorage.getItem('awpbr_token');
  if (uuid(uid) && uuid(token)) guest = { uid, token };
  pendingInvite = new URLSearchParams(location.hash.slice(1)).get('invite') || sessionStorage.getItem(inviteKey) || '';
  if (/^[A-Za-z0-9_-]{43}$/.test(pendingInvite)) sessionStorage.setItem(inviteKey, pendingInvite);
  else pendingInvite = '';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
} catch { /* A página pública funciona mesmo sem armazenamento local. */ }

function status(message, retry = false) {
  $('clan-status').textContent = message;
  $('clan-retry').hidden = !retry;
}
async function api(body, query = '') {
  const response = await fetch(`/api/clans${query}`, body ? {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  } : undefined);
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Não foi possível carregar os clãs.'), { code: data.error });
  return data;
}
function element(tag, text, parent) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (parent) parent.append(el);
  return el;
}
function card(parent, clan, members = null) {
  parent.replaceChildren();
  element('h2', `[${clan.tag}] ${clan.name}`, parent);
  if (clan.description) element('p', clan.description, parent);
  element('p', `${clan.member_count} membro${clan.member_count === 1 ? '' : 's'}`, parent);
  const actions = element('div', '', parent); actions.className = 'clan-actions';
  const link = element('a', 'Página do clã ↗', actions);
  link.href = `/clans/${encodeURIComponent(clan.id)}`;
  const share = element('button', 'COMPARTILHAR CLÃ', actions);
  share.type = 'button';
  share.onclick = async () => {
    const { compartilhar, linkCompartilhavel } = await import('./compartilhar.js');
    const r = await compartilhar({ titulo: `[${clan.tag}] ${clan.name}`, texto: `Cola no clã [${clan.tag}] ${clan.name} no CORO SOLTO.`, url: linkCompartilhavel(`/clans/${encodeURIComponent(clan.id)}`, 'cla') });
    if (r === 'copiado') status('Link do clã copiado.');
  };
  if (members) {
    const list = element('ul', '', parent);
    for (const member of members) {
      const item = element('li', '', list);
      if (member.hidden) { item.textContent = member.nick; continue; }
      const profile = element('a', `${member.nick}${member.is_leader ? ' · líder' : ''}`, item);
      profile.href = `/u/${encodeURIComponent(member.player_id)}/${encodeURIComponent(member.nick)}`;
    }
  }
}
function button(parent, id, text, action) {
  const el = element('button', text, parent); el.id = id; el.type = 'button'; el.onclick = action;
}
function renderMine() {
  $('clan-controls').hidden = !mine;
  $('clan-guest').hidden = !!mine;
  const clan = mine?.clan;
  $('clan-create-panel').hidden = !mine || !!clan;
  $('clan-join-panel').hidden = !mine || !!clan || !pendingInvite;
  $('clan-mine').hidden = !clan;
  if (!clan) return;
  const panel = $('clan-mine');
  card(panel, clan, mine.members);
  if (clan.leader_id === mine.playerId) {
    button(panel, 'clan-invite', 'Gerar novo convite', () => mutate('invite'));
    const others = mine.members.filter(m => m.player_id !== mine.playerId);
    if (others.length) {
      const label = element('label', 'Transferir liderança para', panel);
      const select = element('select', '', label); select.id = 'clan-successor';
      for (const member of others) {
        const option = element('option', member.nick, select); option.value = member.player_id;
      }
      button(panel, 'clan-transfer', 'Transferir liderança', () => {
        if (confirm('Transferir a liderança para este membro? Seus convites atuais serão revogados.'))
          mutate('transfer', { target: select.value });
      });
    }
  }
  button(panel, 'clan-leave', clan.member_count === 1 ? 'Sair e encerrar clã' : 'Sair do clã', () => {
    if (confirm(clan.member_count === 1 ? 'Sair e encerrar este clã?' : 'Sair deste clã?')) mutate('leave');
  });
}
function showInvite(invite, id) {
  $('clan-invite-link').value = `${origemCompartilhamento()}/clans/${id}#invite=${invite}`;
  $('clan-invite-panel').hidden = false;
}
async function refreshMine() {
  mine = null;
  try { mine = await api({ ...(guest || {}), action: 'me' }); }
  catch (error) { if (error.code !== 'invalid_identity') throw error; }
  renderMine();
}
async function load() {
  $('clan-controls').disabled = true; $('clan-retry').disabled = true;
  $('clan-register').querySelector('button').disabled = true;
  status('Carregando clãs…');
  try {
    await refreshMine();
    if (app.dataset.clanId) {
      const result = await api(null, `?id=${encodeURIComponent(app.dataset.clanId)}`);
      card($('clan-public'), result.clan, result.members); $('clan-public').hidden = false;
    }
    const directory = await api();
    $('clan-list').replaceChildren();
    if (!directory.clans.length) element('p', 'Os primeiros clãs começam aqui. Monte sua turma!', $('clan-list'));
    for (const clan of directory.clans) {
      const entry = element('article', '', $('clan-list')); entry.className = 'clan-card'; card(entry, clan);
    }
    status(mine ? 'Seu perfil está pronto para participar.' : 'Entre na sua conta ou salve seu perfil para criar um clã ou aceitar um convite.');
    return true;
  } catch (error) { renderMine(); status(error.message, true); return false; }
  finally {
    $('clan-controls').disabled = false; $('clan-retry').disabled = false;
    $('clan-register').querySelector('button').disabled = false;
  }
}
async function mutate(action, values = {}) {
  $('clan-controls').disabled = true;
  status('Salvando…');
  let saved = false;
  try {
    const result = await api({ ...(guest || {}), action, ...values }); saved = true;
    if (action === 'join') { pendingInvite = ''; sessionStorage.removeItem(inviteKey); }
    if (action === 'leave' || action === 'transfer') $('clan-invite-panel').hidden = true;
    if (result.invite) showInvite(result.invite, result.clanId);
    if (action === 'leave' && app.dataset.clanId && app.dataset.clanId === mine?.clan?.id) {
      location.assign('/clans'); return;
    }
    if (!(await load())) throw new Error('refresh_failed');
    status(action === 'leave' ? 'Você saiu do clã.' : action === 'transfer' ? 'Liderança transferida.' : action === 'invite' ? 'Novo convite pronto. O anterior foi revogado.' : 'Pronto! Seu clã está atualizado.');
  } catch (error) { status(saved ? 'Alteração salva. Tente novamente para atualizar a tela.' : error.message, saved); }
  finally { $('clan-controls').disabled = false; }
}
$('clan-create').onsubmit = event => {
  event.preventDefault(); const data = new FormData(event.target);
  mutate('create', Object.fromEntries(data));
};
$('clan-join').onclick = () => mutate('join', { invite: pendingInvite, ...(uuid(app.dataset.clanId) ? { clanId: app.dataset.clanId } : {}) });
$('clan-retry').onclick = load;
$('clan-copy').onclick = async () => {
  try { await navigator.clipboard.writeText($('clan-invite-link').value); status('Link copiado.'); }
  catch { $('clan-invite-link').select(); status('Selecione e copie o link de convite.'); }
};
$('clan-register').onsubmit = async event => {
  event.preventDefault(); const submit = event.target.querySelector('button'); submit.disabled = true;
  try {
    const credentials = {
      uid: localStorage.getItem('cs_anon') || crypto.randomUUID(),
      token: localStorage.getItem('awpbr_token') || crypto.randomUUID(),
    };
    const response = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...credentials, nick: new FormData(event.target).get('nick') }) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || 'Não foi possível salvar o perfil.');
    localStorage.setItem('cs_anon', credentials.uid); localStorage.setItem('awpbr_token', credentials.token);
    localStorage.setItem('awpbr_nick', data.nick); guest = credentials;
    await load();
  } catch (error) { status(error.message, true); }
  finally { submit.disabled = false; }
};
load();
