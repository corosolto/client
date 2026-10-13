export function accountVerifiedBadge(verified) {
  if(verified!==true)return null;
  const badge=document.createElement('span');
  badge.className='account-verified';badge.textContent='✓ VERIFICADO';
  badge.title='Conta verificada: e-mail confirmado e rede social vinculada.';
  badge.setAttribute('role','img');
  badge.setAttribute('aria-label',badge.title);
  return badge;
}
