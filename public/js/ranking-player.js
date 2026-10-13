import {accountVerifiedBadge} from './account-verified.js';
import {careerRankBadge} from './career-rank.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function node(tag,text='',className='') {const n=document.createElement(tag);n.textContent=text;n.className=className;return n;}
function https(value) {
  try {const u=new URL(value);return u.protocol==='https:' && !u.username && !u.password ? u.href : null;}catch{return null;}
}
export function playerProfilePath(player) {
  if(!uuid.test(player.id || ''))return null;
  return /^[a-z][a-z0-9_]{2,23}$/.test(player.public_handle || player.handle || '') ? `/u/${player.public_handle || player.handle}` : `/u/${player.id}`;
}
export function rankingPlayerCell(player,{careerOnly=false}={}) {
  const cell=node('td'),identity=node('div','','ranking-player'),path=playerProfilePath(player);
  const avatar=node('span','','ranking-avatar');avatar.append(node('span',Array.from(player.nick || '?')[0].toUpperCase()));
  const photo=player.avatar_url===`/api/social-avatar?id=${player.id}` && uuid.test(player.id) ? player.avatar_url : https(player.avatar_url);
  if(photo){const image=node('img');image.src=photo;image.alt=`Avatar de ${player.nick}`;image.width=32;image.height=32;image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>{image.hidden=true;};avatar.append(image);}
  const details=node('div'),name=node(path?'a':'span',player.nick);if(path)name.href=path;details.append(name);
  const badge=accountVerifiedBadge(player.account_verified);if(badge)details.append(badge);
  const rank=careerRankBadge(Object.hasOwn(player,'career_points')?player.career_points:careerOnly?null:player.points);if(rank)details.append(rank);
  const socials=Array.isArray(player.socials)?player.socials:[];
  const links=socials.length?socials:player.social_link?[{net:'Perfil',url:player.social_link}]:[];
  if(links.length){const row=node('div','','ranking-socials');for(const s of links.slice(0,5)){const href=https(s.url);if(!href)continue;const a=node('a',`${s.net || 'Perfil'} ↗`);a.href=href;a.target='_blank';a.rel='noopener noreferrer nofollow';row.append(a);}details.append(row);}
  identity.append(avatar,details);cell.append(identity);return cell;
}
export function rankingTable(players,{teams=false,offset=0,nick='',careerOnly=false}={}) {
  const table=node('table','','social-table'),head=node('thead'),header=node('tr');
  for(const label of ['POS.','JOGADOR','PONTOS','ABATES','K/D',...(teams?['ESQUERDA','DIREITA']:[])])header.append(node('th',label));
  head.append(header);table.append(head);const body=node('tbody');
  for(const [i,p] of players.entries()){const row=node('tr');if(p.nick===nick)row.className='me';row.append(node('td',`#${p.position ?? offset+i+1}`),rankingPlayerCell(p,{careerOnly}),node('td',String(p.points ?? '—')),node('td',String(p.kills ?? '—')),node('td',String(p.kd ?? '—')));if(teams)row.append(node('td',String(p.left_points ?? 0)),node('td',String(p.right_points ?? 0)));body.append(row);}
  table.append(body);return table;
}
