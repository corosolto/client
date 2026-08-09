// Allowlist de URLs de avatar + fetch com trava de SSRF.
//
// O FURO QUE ISSO FECHA
// `src/pages/api/badge/[...path].png.ts` renderiza a badge PNG de um jogador e,
// pra isso, embute o avatar. O avatar vinha de duas fontes CONTROLADAS PELO
// USUÁRIO e ambas caíam num `fetch(url)` cru:
//
//   players.avatar_url - gravado por POST /api/register (campo `avatarUrl` do
//                         corpo, aceito com um `.slice(0,300)` e mais nada)
//   socialAvatar(social_link) - derivado do link social, também do usuário
//
// Como /api/badge/<id>.png é público e sem auth, qualquer pessoa podia:
//   1. registrar um nick com avatarUrl = http://169.254.169.254/latest/meta-data/
//      (metadata da cloud), ou http://127.0.0.1:PORT/ , ou 10.x/172.16-31/192.168.x
//   2. pedir a badge, e usar a diferença entre "renderizou", "404" e "timeout"
//      como oráculo de varredura da rede interna do runtime.
// A resposta ainda passa por `sharp`, então também dá pra exfiltrar qualquer
// coisa que o alvo interno devolva como imagem.
//
// A CORREÇÃO
//  - só https (nada de http:, file:, data:, gopher:, blob:)
//  - host tem que estar na allowlist (os provedores de avatar que o produto de
//    fato usa) - allowlist, não blocklist: DNS rebinding e encoding exótico
//    derrotam blocklist, não derrotam allowlist
//  - sem user:senha embutido na URL
//  - redirect manual, com o destino de cada salto revalidado (github.com/<u>.png
//    redireciona pra avatars.githubusercontent.com - legítimo, e checado)
//  - teto de bytes e timeout, pra não virar vetor de custo
//
// NOTA: com allowlist de host não é preciso resolver DNS e comparar faixas
// privadas - nenhum dos hosts abaixo aponta pra rede interna, e um atacante não
// controla o DNS deles. Se um dia entrar host de terceiro arbitrário aqui, aí
// sim vira obrigatório checar o IP resolvido.

const AVATAR_HOSTS = new Set([
  'avatars.githubusercontent.com',
  'github.com',
  'unavatar.io',
  'pbs.twimg.com',
  'abs.twimg.com',
  'lh3.googleusercontent.com',
  'cdn.discordapp.com',
  'secure.gravatar.com',
]);

// O bucket de avatares é o próprio Supabase do projeto; o host sai da env, não
// é escrito à mão, então staging e produção funcionam sem editar esta lista.
function supabaseHost(): string | null {
  try { return new URL(import.meta.env.SUPABASE_URL || '').hostname || null; }
  catch { return null; }
}

/** true se a URL é segura pra ser buscada pelo servidor como avatar. */
export function isAllowedAvatarUrl(raw?: string | null): boolean {
  if (!raw || typeof raw !== 'string' || raw.length > 300) return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  const sb = supabaseHost();
  return AVATAR_HOSTS.has(host) || (!!sb && host === sb.toLowerCase());
}

const MAX_BYTES = 2_000_000;   // avatar decente não passa de ~2 MB
const MAX_HOPS = 3;

/**
 * Busca um avatar com as travas acima. Devolve null (nunca lança) em qualquer
 * recusa - quem chama já tem cascata de fallback (personagem do jogo → inicial).
 */
export async function fetchAvatar(raw?: string | null): Promise<Buffer | null> {
  let url = raw || '';
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!isAllowedAvatarUrl(url)) return null;
    let r: Response;
    try {
      r = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(4000),
        headers: { accept: 'image/*' },
      });
    } catch { return null; }

    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      if (!loc) return null;
      // resolve relativo contra a URL atual e volta pro topo do laço,
      // onde o destino é revalidado contra a allowlist
      try { url = new URL(loc, url).toString(); } catch { return null; }
      continue;
    }
    if (!r.ok) return null;

    const declared = Number(r.headers.get('content-length') || '0');
    if (declared > MAX_BYTES) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.byteLength > MAX_BYTES ? null : buf;
  }
  return null;   // redirect demais
}
