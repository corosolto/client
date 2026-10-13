const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const number=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v).toLocaleString('pt-BR'):'—';
export function profileCardSvg(p,character=null,portrait=null){
 if(!['server_verified','historical_plus_server_verified'].includes(p?.source) || p.visibility!=='public')throw Error('Public ranking profile required');
 const cells=[['PONTOS',number(p.points)],['POSIÇÃO',p.position?'#'+number(p.position):'—'],['ABATES',number(p.kills)],['MORTES',number(p.deaths)],['K/D',number(p.kd)],['HORAS ATIVAS',number(Math.round(Number(p.verified_play_seconds ?? p.play_seconds)/36)/100)]];
 const image=character&&portrait&&/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(portrait)?`<image href="${portrait}" x="650" y="8" width="550" height="614" preserveAspectRatio="xMidYMid meet"/>`:'';
 const nick=String(p.nick).slice(0,24),nickSize=Math.min(58,540/Math.max(1,nick.length));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
 <rect width="1200" height="630" fill="#0c0e11"/>
 <path d="M820 0H1200V630H650Z" fill="#ffd23f" opacity=".06"/>
 ${image}<rect width="1200" height="8" fill="#e03232"/><rect y="622" width="1200" height="8" fill="#1faa4d"/>
 <g font-family="DejaVu Sans"><text x="60" y="75" font-size="27" font-weight="bold" letter-spacing="5" fill="#ffd23f">CORO SOLTO</text>
 <text x="60" y="168" font-size="${nickSize}" font-weight="bold" fill="#f2ead8">${esc(nick)}</text>
 <text x="60" y="212" font-size="23" fill="#b8d94a">${p.handle?'@'+esc(p.handle):'Na resenha'} · Nível ${number(p.level)}</text>
 <text x="60" y="252" font-size="19" fill="#8a8064">${p.source==='historical_plus_server_verified'?'HISTÓRICO + PARTIDAS CONFIRMADAS':'ESTATÍSTICAS CONFIRMADAS NA ARENA'}</text>
 ${cells.map(([label,value],i)=>{const x=60+i%2*277,y=274+Math.floor(i/2)*86;return `<rect x="${x}" y="${y}" width="258" height="76" fill="#12160e" stroke="#3a3325"/><text x="${x+16}" y="${y+35}" font-size="32" font-weight="bold" fill="#ffd23f">${esc(value)}</text><text x="${x+16}" y="${y+62}" font-size="15" fill="#d8cfae">${label}</text>`;}).join('')}
 <text x="60" y="559" font-size="18" fill="#f2ead8">${character?(image?'ÚLTIMO PERSONAGEM: ':'RETRATO INDISPONÍVEL: ')+esc(character.nome):'PERSONAGEM NÃO COMPARTILHADO'}</text>
 <text x="60" y="591" font-size="20" fill="#8a8064">www.corosolto.com.br</text></g></svg>`;
}
