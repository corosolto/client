import {accountVerifiedBadge} from './account-verified.js';
import {careerRankBadge} from './career-rank.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function node(tag,text='',className='') {const n=document.createElement(tag);n.textContent=text;n.className=className;return n;}
function https(value) {
  try {const u=new URL(value);return u.protocol==='https:' && !u.username && !u.password ? u.href : null;}catch{return null;}
}
// Redes públicas do perfil: as redes que api/social.ts aceita e LinkedIn de perfil antigo, https limpo; OAuth vinculado é privado.
// Ícones simple-icons (CC0), os de src/lib/net-svg.ts mais Twitch.
export const PROFILE_SOCIAL_NETS={
  instagram:{label:"Instagram",path:"M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"},
  tiktok:{label:"TikTok",path:"M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"},
  x:{label:"X",path:"M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"},
  github:{label:"GitHub",path:"M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"},
  youtube:{label:"YouTube",path:"M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"},
  linkedin:{label:"LinkedIn",path:"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"},
  twitch:{label:"Twitch",path:"M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"}
};
const SOCIAL_HOSTS={'instagram.com':'instagram','tiktok.com':'tiktok','x.com':'x','twitter.com':'x','github.com':'github','youtube.com':'youtube','twitch.tv':'twitch','linkedin.com':'linkedin'};
export function profileSocialLinks(profile) {
  const list=Array.isArray(profile?.socials) && profile.socials.length?profile.socials:profile?.social_link?[{url:profile.social_link}]:[];
  const out=[],seen=new Set();
  for(const item of list) {
    if(out.length===5)break;
    const href=https(item?.url);if(!href)continue;
    const url=new URL(href),net=SOCIAL_HOSTS[url.hostname.replace(/^www\./,'')];
    if(url.port || !net || seen.has(href))continue;
    seen.add(href);out.push({net,label:PROFILE_SOCIAL_NETS[net].label,url:href,path:PROFILE_SOCIAL_NETS[net].path});
  }
  return out;
}
export function profileSocialLink(social) {
  const a=node('a','','profile-social');a.href=social.url;a.target='_blank';a.rel='noopener noreferrer nofollow';a.title=social.label;a.setAttribute('aria-label',`${social.label} (abre em nova aba)`);
  const icon=node('span','','profile-social-icon');icon.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${PROFILE_SOCIAL_NETS[social.net].path}"/></svg>`;
  a.append(icon,node('span',social.label));return a;
}
export function playerProfilePath(player) {
  if(!uuid.test(player.id || ''))return null;
  if(typeof player.url==='string' && /^\/u\/(?:[a-z][a-z0-9_]{2,23}|[0-9a-f-]{36})(?:\/|$)/i.test(player.url))return player.url;
  return /^[a-z][a-z0-9_]{2,23}$/.test(player.public_handle || player.handle || '') ? `/u/${player.public_handle || player.handle}` : `/u/${player.id}`;
}
export function rankingPlayerCell(player,{careerOnly=false}={}) {
  const cell=node('td'),identity=node('div','','ranking-player'),path=playerProfilePath(player);
  const avatar=node('span','','ranking-avatar');avatar.append(node('span',Array.from(player.nick || '?')[0].toUpperCase()));
  const human=uuid.test(player.id || '');
  const botArt=!human && typeof player.avatar_url==='string' && /^\/img\/chars-hero\/[a-z0-9_-]+\.webp(?:\?.*)?$/i.test(player.avatar_url)?player.avatar_url:null;
  const photo=human?`/api/social-avatar?id=${encodeURIComponent(player.id)}`:botArt;
  if(photo){const image=node('img');image.src=photo;image.alt=human?`Avatar de ${player.nick}`:`Personagem de ${player.nick}`;image.width=32;image.height=32;image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>{image.hidden=true;};avatar.append(image);}
  const details=node('div'),name=node(path?'a':'span',player.nick);if(path)name.href=path;details.append(name);
  const badge=accountVerifiedBadge(player.account_verified);if(badge)details.append(badge);
  const rank=careerRankBadge(Object.prototype.hasOwnProperty.call(player, 'career_points')?player.career_points:careerOnly?null:player.points);if(rank)details.append(rank);
  const socials=Array.isArray(player.socials)?player.socials:[];
  const links=socials.length?socials:player.social_link?[{net:'Perfil',url:player.social_link}]:[];
  if(links.length){const row=node('div','','ranking-socials');for(const s of links.slice(0,5)){const href=https(s.url);if(!href)continue;const a=node('a',`${s.net || 'Perfil'} ↗`);a.href=href;a.target='_blank';a.rel='noopener noreferrer nofollow';row.append(a);}details.append(row);}
  identity.append(avatar,details);cell.append(identity);return cell;
}
export function rankingTable(players,{teams=false,offset=0,nick='',careerOnly=false}={}) {
  const table=node('table','','social-table'),head=node('thead'),header=node('tr');
  for(const label of ['POS.','JOGADOR','PONTOS','ABATES','K/D',...(teams?['TIME E','TIME B']:[])])header.append(node('th',label));
  head.append(header);table.append(head);const body=node('tbody');
  for(const [i,p] of players.entries()){const row=node('tr');if(p.nick===nick)row.className='me';row.append(node('td',`#${p.position ?? offset+i+1}`),rankingPlayerCell(p,{careerOnly}),node('td',String(p.points ?? '—')),node('td',String(p.kills ?? '—')),node('td',String(p.kd ?? '—')));if(teams)row.append(node('td',String(p.left_points ?? 0)),node('td',String(p.right_points ?? 0)));body.append(row);}
  table.append(body);return table;
}
