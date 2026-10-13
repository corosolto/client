import {PROFILE_CHARACTERS} from './profile-character-catalog.js';
export function profileCharacterCard(id) {
  const character=typeof id==='string' && Object.hasOwn(PROFILE_CHARACTERS,id)?PROFILE_CHARACTERS[id]:null;
  if(!character)return null;
  const card=document.createElement('figure');card.className='profile-character';
  const image=document.createElement('img');image.src=character.portrait;image.alt=character.nome;image.width=180;image.height=220;image.loading='lazy';image.decoding='async';
  const caption=document.createElement('figcaption'),label=document.createElement('span'),name=document.createElement('strong');
  label.textContent='Último personagem';name.textContent=character.nome;caption.append(label,name);card.append(image,caption);
  image.onerror=()=>{image.hidden=true;};
  return card;
}
