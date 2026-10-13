import './privacy-runtime.js';
export const analyticsAllowed=()=>window.__csPrivacy.allowed();
export const privacyChoice=()=>window.__csPrivacy.choice();
export const setPrivacyChoice=value=>window.__csPrivacy.set(value);
export function mountPrivacyChoice(container,{onChange=()=>{}}={}) {
  const label=document.createElement('label');label.className='account-consent';
  const check=document.createElement('input');check.type='checkbox';check.name='analytics';check.checked=analyticsAllowed();
  label.append(check,document.createTextNode('Permitir cookies/dados opcionais para medir uso e desempenho do jogo. Opcional; posso retirar a permissão a qualquer momento.'));
  const note=document.createElement('p');note.className='social-muted';note.textContent='Sessão, segurança, preferências e progresso usam armazenamento necessário para jogar e manter a conta.';
  check.onchange=async()=>{check.disabled=true;try{await onChange(check.checked);}catch{check.checked=analyticsAllowed();}finally{check.disabled=false;}};
  container.append(label,note);return check;
}
