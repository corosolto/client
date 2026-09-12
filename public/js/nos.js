/* NÓS DE MULTIPLAYER — um por região. Fonte única: o jogo importa daqui e a página de convite
   do site também. Duas listas fariam um link cair num nó que a outra não conhece. */

/* Só entram nós que EXISTEM. Servidor que nunca respondeu não é informação, é ruído — e é
   diferente de "caiu agora", que a lista de servidores mostra. */
export const NOS = [
  { id: 'br', nome: 'Brasil · São Paulo', url: 'wss://br.corosolto.com.br/ws' },
  { id: 'us', nome: 'EUA · Carolina do Sul', url: 'wss://us.corosolto.com.br/ws' },
  { id: 'eu', nome: 'Europa · Madri', url: 'wss://eu.corosolto.com.br/ws' },
];

/* Um convite é `<REGIAO>-<CODIGO>` (ex.: BR-7K3M, BR2-7K3M). A região não é enfeite: ela diz em
   qual nó a sala vive, e sem ela o cliente sondaria todas as regiões para achar a sala. */
export const NO_RE = /^[a-z]{2}[0-9]?$/;   // igual a api/_lib/no.mjs do backend
export function parseConvite(txt) {
  const s = String(txt || '').trim().toUpperCase();
  // id mais LONGO primeiro: com a lista em ordem qualquer, "BR2-7K3M" seria lido como nó BR
  for (const no of [...NOS].sort((a, b) => b.id.length - a.id.length)) {
    const id = no.id.toUpperCase();
    const m = s.match(new RegExp(`^${id}[-\\s]?([A-Z0-9]{3,8})$`));
    if (m) return { no, codigo: m[1], convite: `${id}-${m[1]}` };
  }
  return null;
}

/* A URL que se compartilha. Fica no SITE, e não no servidor de jogo: o link tem de abrir o
   jogo, e o servidor fala JSON e WebSocket, não HTML. */
export const linkDeConvite = (convite, origem) =>
  `${origem || (typeof location !== 'undefined' ? location.origin : '')}/sala/${convite}`;

/* http do lobby a partir da url ws do nó — o mesmo host, outro esquema. */
export const httpDoNo = (no) => String(no.url).replace(/^ws/, 'http').replace(/\/ws.*$/, '');

// Ping primeiro e, dentro da mesma faixa, o menos cheio: dois nós no mesmo datacentre empatam
// no ping, e sem o desempate o segundo nasceria vazio. Acima da faixa, manda o ping.
export const FAIXA_PING_MS = 15;
export function ordenarNos(lista) {
  const faixa = (n) => Math.floor((n.ping == null ? 1e9 : n.ping) / FAIXA_PING_MS);
  return [...lista].sort((a, b) => faixa(a) - faixa(b)
    || (a.jogadores | 0) - (b.jogadores | 0)
    || (a.ping == null ? 1e9 : a.ping) - (b.ping == null ? 1e9 : b.ping));
}
