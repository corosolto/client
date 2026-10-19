// Rotas fixas do hub: tabela única do jogo e do build. Por que perfil= fica na query
// (iframe de /u e régua do backend): docs/adr/0008-rotas-fixas.md.

const GUIAS = ['sobre', 'como-jogar', 'personagens', 'armas', 'mapas', 'mapa', 'changelog', 'apoie',
  'privacidade', 'termos', 'excluir-dados', 'regras-de-uso', 'clans'];
const ABAS_SOCIAIS = { profile: '', friends: 'amigos', ranking: 'ranking', notifications: 'notificacoes', feed: 'feed', settings: 'configuracoes' };
const MODAIS_JOGAR = ['perfil', 'mapas', 'personagens', 'confirmar'];
/* Abas da página pública /u/<perfil>/<aba>. Outro segundo segmento é o nick da forma antiga. */
export const ABAS_PERFIL = { conquistas: 'Conquistas', partidas: 'Partidas', privacidade: 'Privacidade' };
const PERFIL = /^\/u\/([a-z][a-z0-9_]{2,23}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/([^/]*))?\/?$/i;
/* Chaves de tela na query antiga. Saem da URL quando a tela vira caminho. */
export const CHAVES_DE_TELA = ['secao', 'partida', 'servidor', 'janela', 'social', 'guia', 'loja'];
/* Abas da loja: valor do estado → data-treta-view do TretaStore. */
export const ABAS_LOJA = { armas: 'weapons', itens: 'items', packs: 'packs', quests: 'quests' };

const DESC_APP = 'Jogo de tiro grátis no navegador: Time E contra Time B. Sem download.';

/* indexavel: entra no sitemap, robots index. Senão noindex, follow.
   canonical: quando a tela mostra uma página de conteúdo que já tem URL própria. */
export const ROTAS_HUB = [
  { caminho: '/jogar/multiplayer', estado: { secao: 'jogar', partida: 'multiplayer', servidor: 'publico' }, titulo: 'Multiplayer: servidores públicos' },
  { caminho: '/jogar/multiplayer/privado', estado: { secao: 'jogar', partida: 'multiplayer', servidor: 'privado' }, titulo: 'Multiplayer: sala privada' },
  ...MODAIS_JOGAR.map((janela) => ({
    caminho: `/jogar/${janela}`,
    estado: { secao: 'jogar', partida: 'singleplayer', janela },
    titulo: { perfil: 'Seu perfil de jogo', mapas: 'Escolher mapa', personagens: 'Escolher personagem', confirmar: 'Confirmar partida' }[janela],
  })),
  { caminho: '/configuracoes', estado: { janela: 'configuracoes' }, titulo: 'Configurações' },
  { caminho: '/loja', estado: { secao: 'loja' }, titulo: 'Loja de skins', indexavel: true,
    descricao: 'Skins de personagem da CORO SOLTO. Ganhe TRETA$ jogando e vista sua próxima treta. Skin não dá vantagem na partida.' },
  { caminho: '/loja/armas', estado: { secao: 'loja', loja: 'armas' }, titulo: 'Armas da loja' },
  { caminho: '/loja/itens', estado: { secao: 'loja', loja: 'itens' }, titulo: 'Itens da loja' },
  { caminho: '/loja/packs', estado: { secao: 'loja', loja: 'packs' }, titulo: 'Packs da loja' },
  { caminho: '/loja/quests', estado: { secao: 'loja', loja: 'quests' }, titulo: 'Quests: ganhe TRETA$' },
  /* /ranking indexável só com o ranking ligado: o build troca `indexavel` por RANKING_ON. */
  { caminho: '/ranking', estado: { secao: 'ranking' }, titulo: 'Ranking', indexavel: true, dependeDoRanking: true,
    descricao: 'Placar da rua da CORO SOLTO: cada abate soma um ponto. Veja quem lidera a treta e onde você está.' },
  ...Object.entries(ABAS_SOCIAIS).map(([social, slug]) => ({
    caminho: slug ? `/comunidade/${slug}` : '/comunidade',
    estado: { secao: 'comunidade', social },
    titulo: { profile: 'Comunidade', friends: 'Amigos e convites', ranking: 'Ranking da comunidade', notifications: 'Notificações', feed: 'Atividade dos amigos', settings: 'Configurações do perfil' }[social],
    indexavel: social === 'profile',
    descricao: social === 'profile' ? 'Perfis, amigos, clãs e ranking da CORO SOLTO. Encontre sua turma e combine a próxima treta.' : undefined,
  })),
  { caminho: '/guia', estado: { secao: 'sobre' }, titulo: 'Guia do jogo', canonical: '/sobre' },
  ...GUIAS.map((guia) => ({ caminho: `/guia/${guia}`, estado: { secao: 'sobre', guia }, titulo: 'Guia do jogo', canonical: `/${guia}` })),
  { caminho: '/feedback', estado: { secao: 'feedback' }, titulo: 'Mandar feedback' },
  { caminho: '/apoiar', estado: { secao: 'apoie' }, titulo: 'Apoiar o jogo', canonical: '/apoie' },
].map((rota) => ({ indexavel: false, descricao: DESC_APP, ...rota, descricao: rota.descricao || DESC_APP }));

const POR_CAMINHO = new Map(ROTAS_HUB.map((rota) => [rota.caminho, rota]));

const limpo = (caminho) => (caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho);

/** Rota do hub para um caminho, ou null se o caminho não é do hub. */
export function rotaDoCaminho(caminho) {
  return POR_CAMINHO.get(limpo(caminho)) || null;
}

/** Caminho de uma tela. null quando a tela ainda mora na query (ranking; perfil dentro do iframe de /u). */
export function caminhoDoEstado(estado = {}, { perfilNoCaminho = false } = {}) {
  const { secao, partida, servidor, janela, social, guia, perfil, loja, aba } = estado;
  if (janela === 'configuracoes') return '/configuracoes';
  if (!secao || secao === 'jogar') {
    if (partida === 'multiplayer') return servidor === 'privado' ? '/jogar/multiplayer/privado' : '/jogar/multiplayer';
    return MODAIS_JOGAR.includes(janela) ? `/jogar/${janela}` : '/';
  }
  if (secao === 'loja') return Object.prototype.hasOwnProperty.call(ABAS_LOJA, loja) ? `/loja/${loja}` : '/loja';
  if (secao === 'ranking') return '/ranking';
  if (secao === 'comunidade') {
    if (perfil) return perfilNoCaminho ? `/u/${encodeURIComponent(perfil)}${Object.prototype.hasOwnProperty.call(ABAS_PERFIL, aba || '') ? `/${aba}` : ''}` : null;
    const slug = ABAS_SOCIAIS[social || 'profile'];
    if (slug === undefined) return '/comunidade';
    return slug ? `/comunidade/${slug}` : '/comunidade';
  }
  if (secao === 'sobre') return GUIAS.includes(guia) ? `/guia/${guia}` : '/guia';
  if (secao === 'feedback') return '/feedback';
  if (secao === 'apoie') return '/apoiar';
  return null;
}

/** Estado da tela a partir da URL: o caminho novo vence, a query antiga vale na raiz. */
export function estadoDaUrl(url) {
  const u = new URL(url);
  const rota = rotaDoCaminho(u.pathname);
  const q = u.searchParams;
  if (rota) return { ...rota.estado, ...(q.get('origem') ? { origem: q.get('origem') } : {}) };
  const [, perfil, segundo] = PERFIL.exec(u.pathname) || [];
  /* /u/<perfil>/<aba> guarda a aba; outro segundo segmento é o nick da forma antiga. */
  if (perfil) return { secao: 'comunidade', social: 'profile', perfil, ...(Object.prototype.hasOwnProperty.call(ABAS_PERFIL, segundo || '') ? { aba: segundo } : {}) };
  if (u.pathname !== '/') return null;
  const estado = {};
  for (const chave of [...CHAVES_DE_TELA, 'origem', 'perfil']) if (q.get(chave)) estado[chave] = q.get(chave);
  return estado;
}

/** URL nova para um estado, mantendo os parâmetros que não são tela (sala, map, personagem...). */
export function urlDoEstado(estado, base, opcoes) {
  const atual = new URL(base);
  const caminho = caminhoDoEstado(estado, opcoes);
  const destino = new URL(atual.href);
  const telaNaQuery = caminho === null;
  destino.pathname = telaNaQuery ? '/' : caminho;
  for (const chave of [...CHAVES_DE_TELA, 'origem', 'perfil']) destino.searchParams.delete(chave);
  if (telaNaQuery) {
    for (const chave of [...CHAVES_DE_TELA, 'perfil']) if (estado[chave]) destino.searchParams.set(chave, estado[chave]);
  }
  if (estado.origem) destino.searchParams.set('origem', estado.origem);
  return destino;
}
