/* NÓS DE MULTIPLAYER — um por região. Fonte única: o jogo importa daqui e a página de convite
   do site também. Duas listas fariam um link cair num nó que a outra não conhece. */

/* Só entram nós que EXISTEM. Servidor que nunca respondeu não é informação, é ruído — e é
   diferente de "caiu agora", que a lista de servidores mostra. */
export const NOS = [
  { id: 'br', nome: 'Brasil · São Paulo', url: 'wss://br.corosolto.com.br/ws' },
];

/* Um convite é `<REGIAO>-<CODIGO>` (ex.: BR-7K3M). A região não é enfeite: ela diz em qual nó
   a sala vive, e sem ela o cliente teria de sondar todas as regiões para achar a sala. */
export function parseConvite(txt) {
  const m = String(txt || '').trim().toUpperCase().match(/^([A-Z]{2})[-\s]?([A-Z0-9]{3,8})$/);
  if (!m) return null;
  const no = NOS.find((n) => n.id.toUpperCase() === m[1]);
  return no ? { no, codigo: m[2], convite: `${m[1]}-${m[2]}` } : null;
}

/* A URL que se compartilha. Fica no SITE, e não no servidor de jogo: o link tem de abrir o
   jogo, e o servidor fala JSON e WebSocket, não HTML. */
export const linkDeConvite = (convite, origem) =>
  `${origem || (typeof location !== 'undefined' ? location.origin : '')}/sala/${convite}`;

/* http do lobby a partir da url ws do nó — o mesmo host, outro esquema. */
export const httpDoNo = (no) => String(no.url).replace(/^ws/, 'http').replace(/\/ws.*$/, '');
