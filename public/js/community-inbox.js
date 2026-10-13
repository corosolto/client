export function questList({auth,state}) {
  const own=auth?.authenticated===true && auth.profile?.id && state?.profile?.id===auth.profile.id;
  const profile=own?state.profile:null;
  const achievements=new Set((profile?.achievements || []).map(a=>a.key));
  return [
    {id:'profile',title:'Seu nome na resenha',detail:'Escolha seu ID único para ter um link de perfil.',complete:Boolean(profile?.handle),action:'settings'},
    {id:'first_friend',title:'Reúna sua turma',detail:'Adicione um amigo e confirme a amizade.',complete:Boolean(own && state.friends?.some(f=>f.state==='accepted')),action:'friends'},
    {id:'social_link',title:'Outra porta para sua conta',detail:'Se quiser, vincule uma rede para entrar na mesma conta.',complete:Boolean(own && auth.identities?.some(p=>['google','discord','twitter','linkedin_oidc'].includes(p))),action:'settings'},
    {id:'first_kill',title:'Primeiro abate confirmado',detail:'Faça seu primeiro abate em uma partida verificada.',complete:achievements.has('first_kill'),action:'play'},
    {id:'first_win',title:'Primeira vitória confirmada',detail:'Vença uma rodada em uma partida verificada.',complete:achievements.has('first_win'),action:'play'},
  ];
}
