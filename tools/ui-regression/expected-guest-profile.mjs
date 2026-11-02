const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseProfileErrorJson(text) {
  if (typeof text !== 'string' || text.length === 0) return { jsonValid: false, errorCode: '' };
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { jsonValid: false, errorCode: '' }; }
  if (!isPlainObject(parsed) || Object.keys(parsed).length !== 1 || !Object.hasOwn(parsed, 'error') || typeof parsed.error !== 'string') return { jsonValid: false, errorCode: '' };
  return { jsonValid: true, errorCode: parsed.error };
}

export function parseGuestAuthJson(text) {
  const fail = { authenticated: false, profileAbsent: false, jsonValid: false };
  if (typeof text !== 'string' || text.length === 0) return fail;
  let parsed;
  try { parsed = JSON.parse(text); } catch { return fail; }
  if (!isPlainObject(parsed) || typeof parsed.authenticated !== 'boolean') return fail;
  return { authenticated: parsed.authenticated, profileAbsent: parsed.profile === null || parsed.profile === undefined, jsonValid: true };
}

export function isExpectedGuestProfile404(entry, authState) {
  if (!isPlainObject(entry) || !isPlainObject(authState)) return false;
  if (entry.sameOrigin !== true) return false;
  if (entry.method !== 'GET') return false;
  if (entry.pathname !== '/api/social') return false;
  if (entry.action !== 'profile') return false;
  if (entry.status !== 404) return false;
  if (entry.errorCode !== 'not_found') return false;
  if (entry.jsonValid !== true) return false;
  if (entry.ownGuestId !== true) return false;
  if (entry.explicitProfile !== false) return false;
  if (authState.pending !== 0) return false;
  if (!Array.isArray(authState.observations) || authState.observations.length === 0) return false;
  return authState.observations.every((observation) => isPlainObject(observation)
    && observation.status === 200
    && observation.authenticated === false
    && observation.profileAbsent === true
    && observation.jsonValid === true);
}

export function classifyProfile404s(records, assets404, authState) {
  const remaining = Array.isArray(assets404) ? [...assets404] : [];
  const expected = [];
  if (!Array.isArray(records)) return { expected, assets404: remaining };
  for (const record of records) {
    if (!isPlainObject(record) || !isPlainObject(record.entry)) continue;
    const pathname = typeof record.pathname === 'string' ? record.pathname : record.entry.pathname;
    if (pathname !== record.entry.pathname || !isExpectedGuestProfile404(record.entry, authState)) continue;
    const index = remaining.indexOf(pathname);
    if (index < 0) continue;
    remaining.splice(index, 1);
    const entry = record.entry;
    expected.push({ pathname: entry.pathname, method: entry.method, action: entry.action, status: entry.status, errorCode: entry.errorCode, reason: 'own_guest_profile_absent' });
  }
  return { expected, assets404: remaining };
}
