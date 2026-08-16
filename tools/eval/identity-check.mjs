import { existsSync, readFileSync } from 'node:fs';

const mutant = (process.argv.find(arg => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const read = path => existsSync(path) ? readFileSync(path, 'utf8') : '';

let main = read('public/js/main.js');
let register = read('src/pages/api/register.ts');
let submit = read('src/pages/api/submit-match.ts');
let heartbeat = read('src/pages/api/heartbeat.ts');
let avatar = read('src/pages/api/avatar.ts');
let identity = read('src/lib/player-identity.ts');

if (mutant === 'semuid-client') main = main.replaceAll('uid: getAnonId()', 'uid: null');
else if (mutant === 'nick-auth') identity = identity.replace(".eq('uid', uid)", ".eq('nick', nick)");
else if (mutant === 'semcanonical') main = main.replace('registeredNick = reg.nick', 'registeredNick = nick');
else if (mutant) throw new Error(`mutante desconhecido: ${mutant}`);

const failures = [];
const uidPayloads = (main.match(/uid:\s*getAnonId\(\)/g) || []).length;
if (uidPayloads < 5 || !/api\('\/api\/register',[\s\S]{0,180}uid:\s*getAnonId\(\)/.test(main))
  failures.push('ID1 cliente não envia UID em register, submit, heartbeat e avatar');

if (!register.includes("rpc('register_player_uid'") || !register.includes('p_uid: uid'))
  failures.push('ID2 registro não usa o RPC idempotente por UID');
if (!/JSON\.stringify\(\{\s*ok:\s*true,\s*nick:/.test(register))
  failures.push('ID2 registro não devolve o nick canônico do UID');

if (!identity.includes(".eq('uid', uid)") || !identity.includes(".eq('token', token)"))
  failures.push('ID3 resolução não autentica por UID + token');
if (!identity.includes('isIdentitySchemaMissing') || !identity.includes(".eq('nick', nick)"))
  failures.push('ID3 compatibilidade temporária para banco/cliente antigo ausente');
if (!identity.includes('if (!result.error && result.data)'))
  failures.push('ID3 UID ainda não associado não alcança o fallback legado válido');

for (const [name, source] of [['submit', submit], ['heartbeat', heartbeat], ['avatar', avatar]]) {
  if (!source.includes('resolvePlayerIdentity')) failures.push(`ID4 ${name} não resolve identidade pelo helper comum`);
  if (/\.eq\('nick',[\s\S]{0,100}\.eq\('token'/.test(source)) failures.push(`ID4 ${name} ainda autentica diretamente por nick`);
}

if (!main.includes('registeredNick = reg.nick'))
  failures.push('ID5 cliente não adota o nick canônico retornado pelo UID');
if (/outro navegador|troca o nick no PERFIL/.test(main))
  failures.push('ID5 cliente ainda orienta trocar nick em vez de recuperar pelo UID');

for (const failure of failures) console.log(`  \x1b[31m✗\x1b[0m ${failure}`);
if (mutant && !failures.length) failures.push(`mutação ${mutant} não foi detectada`);

if (failures.length) {
  console.log(`\x1b[31mIDENTITY ${failures.length} VERMELHA(S)\x1b[0m${mutant ? ` (mutante=${mutant})` : ''}`);
  process.exitCode = 1;
} else {
  console.log('\x1b[32mIDENTITY verde — UID seleciona, token autentica e nick é atributo\x1b[0m');
}
