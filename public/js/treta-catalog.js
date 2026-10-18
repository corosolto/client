import {WEAPON_SKINS} from './data/weapon-skin-definitions.js';

export const TRETA_SYMBOL = 'T$';
export const TRETA_COIN_ART = {model:'/models/treta/coin-classic-saci-82ad26210cf8.glb',poster:'/img/treta/coin-classic-saci.webp'};
export const TRETA_COINS = [
  {value:1,character:'saci',poster:'/img/treta/coin-classic-saci.webp',name:'Saci'},
  {value:5,character:'curupira',poster:'/img/treta/coin-classic-curupira.webp',name:'Curupira'},
  {value:10,character:'caipora',poster:'/img/treta/coin-classic-caipora.webp',name:'Caipora'},
  {value:50,character:'lobisomem',poster:'/img/treta/coin-classic-lobisomem.webp',name:'Lobisomem'},
  {value:100,character:'gotinha',poster:'/img/treta/coin-classic-gotinha.webp',name:'Zé da Gotinha'},
  {value:200,character:'canarinho',poster:'/img/treta/coin-classic-canarinho.webp',name:'Canarinho Pistola'},
  {value:1000,character:'zumbi',poster:'/img/treta/coin-classic-zumbi.webp',name:'Zumbi dos Palmares'},
];
export const TRETA_SKINS = [
  {id:'lula-drip',name:'Barbudo do Drip',character:'barbudo',color:'#e44465',series:'DRIP DO PLANALTO',description:'Streetwear vinho, tranças, grillz e anéis de ouro. O drip chegou ao Planalto.',price:800,ready:false},
  {id:'bolsonaro-drip',name:'Capitão do Drip',character:'capitao',color:'#43c69b',series:'DRIP DO PLANALTO',description:'Jaqueta varsity verde e azul, cargo bege e correntes de ouro. Outra combinação, a mesma ostentação.',price:800,ready:false},
  {id:'senador-drip',name:'Senador do Drip',character:'senador',color:'#ae80ff',series:'DRIP DO PLANALTO',description:'O Senador de preto e violeta, correntes pesadas e tênis branco. Estilo próprio no plenário.',price:800,ready:false},
  {id:'janja',name:'Janjoca',character:'dama',color:'#e77f95',series:'PRIMEIRAS-DAMAS',description:'Óculos, cabelo castanho e um visual urbano vinho e creme.',price:800,ready:false},
  {id:'michelle-bolsonaro',name:'Mixelle',character:'julia-zanatta',color:'#77baff',series:'PRIMEIRAS-DAMAS',description:'Um visual urbano azul e verde, com detalhes dourados.',price:800,ready:false},
  {id:'lula-na-regua',name:'Barbudo na Régua',character:'barbudo',color:'#718bba',series:'NA RÉGUA',description:'Degradê grisalho, barba alinhada e terno azul. O corte está em dia.',price:800,ready:false},
  {id:'lula-cyborg',name:'Barbudo Cyborg',character:'barbudo',color:'#ec645d',series:'PLANALTO 2500',description:'Armadura cromada, olho mecânico vermelho e faixa verde e amarela.',price:800,ready:false},
  {id:'bolsonaro-cyborg',name:'Capitão Cyborg',character:'capitao',color:'#50cba6',series:'PLANALTO 2500',description:'Armadura azul e prata, energia verde e olho mecânico vermelho.',price:800,ready:false},
  {id:'aljuiz-toga-mandrake',name:'Juiz da Toga Mandrake',character:'juiz',color:'#b993ef',series:'MANDRAKE',description:'Toga aberta, conjunto grafitado, óculos dourados e tênis roxo.',price:800,ready:false},
  {id:'lula-mandrake',name:'Barbudo Mandrake',character:'barbudo',color:'#e55769',series:'MANDRAKE',description:'Boné virado, bermuda vermelha, óculos espelhados e correntes douradas.',price:800,ready:false},
  {id:'bolsonaro-mandrake',name:'Capitão Mandrake',character:'capitao',color:'#80b9e8',series:'MANDRAKE',description:'Boné branco, conjunto azul claro estampado e correntes de ouro.',price:800,ready:false},
  {id:'michelle-mandrake',name:'Mixelle Mandrake',character:'julia-zanatta',color:'#e96c81',series:'MANDRAKE',description:'Óculos vermelhos, camiseta bordada com rosas e correntes prateadas.',price:800,ready:false},
  {id:'zero-um-mandrake',name:'Senador Mandrake',character:'senador',color:'#d7ac51',series:'MANDRAKE',description:'Conjunto preto e dourado, boné virado e três correntes pesadas.',price:800,ready:false},
];
export const TRETA_WEAPON_SKINS = Object.freeze(Object.values(WEAPON_SKINS)
  .filter((skin)=>skin.storeEnabled && skin.runtimeEnabled && skin.approved && skin.certified)
  .map((skin)=>Object.freeze({
    id:skin.id,
    name:skin.name,
    weapon:skin.storeWeapon,
    slot:'weapon',
    color:skin.storeColor,
    series:skin.storeSeries,
    description:skin.storeDescription,
    price:skin.storePrice,
    poster:skin.storePoster,
    model:`/models/weapons/${skin.storeWeapon}.glb`,
    ready:true,
  })));
export const TRETA_DEFAULT_REWARDS = {email_reward:200,referral_reward:100,sp_reward:10,mp_reward:25,daily_match_cap:250,referral_cap:10,starts_at:null,ends_at:null};

export function tretaChange(amount) {
  if(!Number.isSafeInteger(amount) || amount<0)throw new RangeError('invalid_treta_amount');
  const coins=[];
  for(const coin of [...TRETA_COINS].reverse()) {
    const count=Math.floor(amount/coin.value);
    if(count)coins.push({...coin,count});
    amount%=coin.value;
  }
  return coins;
}

export const TRETA_EYEWEAR = [
  {id:'metal-de-rua',name:'Metal de Rua',description:'Armação de metal prata com lentes espelhadas verdes.',color:'#6cad94'},
  {id:'ouro-de-quebrada',name:'Ouro de Quebrada',description:'Armação dourada larga e lentes em tons de ouro.',color:'#d5ae50'},
  {id:'oval-90',name:'Oval 90',description:'Armação preta com lentes ovais vermelhas.',color:'#e27964'},
  {id:'visor-de-pista',name:'Visor de Pista',description:'Visor azul contínuo, armação branca e detalhes verdes.',color:'#58becb'},
  {id:'rebite-roxo',name:'Rebite Roxo',description:'Aros redondos com rebites e lentes roxas.',color:'#aa79d5'},
  {id:'arco-orbital',name:'Arco Orbital',description:'Arco sobre a cabeça, aros redondos e lentes escuras.',color:'#a2b2c8'},
].map(item=>({...item,slot:'eyewear',series:'ÓCULOS DA TRETA',price:200}));
