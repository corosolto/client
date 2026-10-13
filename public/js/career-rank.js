export const CAREER_RANKS=Object.freeze([
  ['soldado','Soldado',1,'bronze',1,'chevron'],['cabo','Cabo',2,'bronze',2,'chevron'],
  ['sargento','Sargento',3,'bronze',3,'chevron'],['tenente','Tenente',5,'silver',1,'star'],
  ['capitao','Capitão',8,'silver',2,'star'],['major','Major',12,'silver',3,'star'],
  ['tenente-coronel','Tenente-coronel',18,'gold',1,'star'],['coronel','Coronel',25,'gold',2,'star'],
  ['general','General',40,'gold',3,'star'],
].map(([id,label,level,tier,marks,symbol])=>Object.freeze({id,label,minPoints:(level-1)*100,tier,marks,symbol})));
function validPoints(value) {
  if(typeof value==='string' && /^\d+$/.test(value))value=Number(value);
  return typeof value==='number' && Number.isSafeInteger(value) && value>=0?value:null;
}
export function careerRank(points) {
  const value=validPoints(points);if(value===null)return null;
  return CAREER_RANKS.findLast(rank=>value>=rank.minPoints);
}
export function careerRankTitle(points) {
  const rank=careerRank(points);if(!rank)return '';
  const next=CAREER_RANKS[CAREER_RANKS.indexOf(rank)+1],total=validPoints(points);
  return `Patente de carreira: ${rank.label} · ${total.toLocaleString('pt-BR')} pontos acumulados.${next?` Próxima: ${next.label}, faltam ${(next.minPoints-total).toLocaleString('pt-BR')} pontos.`:' Patente máxima.'}`;
}
export function careerRankBadge(points) {
  const rank=careerRank(points);if(!rank)return null;
  const badge=document.createElement('span');badge.className='career-rank';badge.dataset.tier=rank.tier;badge.title=careerRankTitle(points);
  const icon=document.createElement('span');icon.className='career-rank-icon';icon.dataset.symbol=rank.symbol;icon.setAttribute('aria-hidden','true');
  for(let i=0;i<rank.marks;i++){const mark=document.createElement('i');mark.textContent=rank.symbol==='star'?'★':'';icon.append(mark);}
  const name=document.createElement('span');name.textContent=rank.label;badge.append(icon,name);return badge;
}
