// Registro editorial e visual unico das faccoes. Site, menu e jogo importam daqui.
// `ready:false` mantem uma faccao visivel no catalogo sem publicar fallback low-poly.
export const FACTION_PAGE_SIZE = 6;

export const FACTIONS = Object.freeze([
  { id:'E', slug:'time-e', name:'TIME E', tag:'TME', slogan:'A treta se faz na praca!',
    description:'Esquerdomacho · Lider do Sindicato · Lider do MST · Doutora do SUS · Jovem Mistico',
    color:'#ff5555', dark:'#e03232', ink:'#ff9a9a', rgb:'255,107,107', bg:'linear-gradient(165deg,#b52e2e 0%,#7a1a1a 52%,#3d0d0d 100%)', crest:'e', art:'time-e', ready:true },
  { id:'B', slug:'time-b', name:'TIME B', tag:'TMB', slogan:'A treta se faz na rodovia!',
    description:'Caminhoneiro · Influencer de Dubai · Cantor Sertanejo · Tia Zila · Coach Quantico',
    color:'#55dd66', dark:'#1faa4d', ink:'#a9f0b6', rgb:'125,224,143', bg:'linear-gradient(165deg,#1d8f45 0%,#2f7a2a 46%,#7a6412 100%)', crest:'b', art:'time-b', ready:true },
  { id:'U', slug:'tribos', name:'TRIBOS URBANAS', tag:'TRB', slogan:'A treta se faz na quebrada!',
    description:'Emo · Black Metal · Metaleiro · Punk · Skatista · Clubber · Rapper · Rasta · Pagodeiro',
    color:'#4aa3ff', dark:'#2f7fe0', ink:'#a8cdff', rgb:'199,155,255', bg:'linear-gradient(165deg,#5f22c2 0%,#8a1f9c 55%,#3d0f52 100%)', crest:'u', art:'tribos', ready:true },
  { id:'C', slug:'palhacos', name:'PALHACOS', tag:'PLH', slogan:'A treta se faz no picadeiro!',
    description:'Bonzo · Palhaco do Mal · Jozo · Adjim · Esbirro · Titica · Padati · Padata · Cadequinha',
    color:'#ff6ec7', dark:'#c23a86', ink:'#ffb3e0', rgb:'255,138,209', bg:'linear-gradient(165deg,#d81e8c 0%,#7a1fa0 52%,#e0761a 100%)', crest:'c', art:'palhacos', ready:true },
  { id:'F', slug:'funkeiros', name:'FUNKEIROS', tag:'FNK', slogan:'A treta se faz no bailao!',
    description:'Mandrake · Raul da Franja · Oakley · Cria RJ · Chave SP · Funk Raiz · Trap Funk · Fluxo · Ostentacao',
    color:'#ffc233', dark:'#c79a12', ink:'#ffd98a', rgb:'255,210,63', bg:'linear-gradient(165deg,#c78a12 0%,#8a5a0d 52%,#3d2a05 100%)', crest:'f', art:'funkeiros', ready:true },
  { id:'M', slug:'miticos', name:'MITICOS', tag:'MIT', slogan:'A treta atravessa os seculos!',
    description:'Maria Bonita · Saci-Perere · Lampiao · Lobisomem · Bandeirante · Boto Cor de Rosa · Zumbi dos Palmares · Cuca · Curupira',
    color:'#9d4edd', dark:'#5e35b1', ink:'#d0a3f0', rgb:'157,78,221', bg:'linear-gradient(165deg,#5e35b1 0%,#3d1b6e 52%,#1a0a3d 100%)', crest:'m', art:'mitico', ready:true },
]);

export const FACTION_BY_ID = Object.freeze(Object.fromEntries(FACTIONS.map((f) => [f.id, Object.freeze(f)])));
export const faction = (id) => FACTION_BY_ID[String(id || '').toUpperCase()] || null;
export const factionName = (id) => faction(id)?.name || String(id || '');
export const factionTag = (id) => faction(id)?.tag || String(id || '');
export const factionColor = (id, dark = false) => faction(id)?.[dark ? 'dark' : 'color'] || (dark ? '#aaaaaa' : '#999999');
export const factionInk = (id) => faction(id)?.ink || '#d6d6d6';
