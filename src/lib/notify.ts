// Notificação por email via formsubmit.co - sem SDK, sem chave, um POST.
//
// POR QUE ISTO EXISTE (issue #85, achado do dono em 07/08): ele enviou um feedback
// pelo menu do jogo e não recebeu nada - porque não havia nada para receber. A rota
// `/api/feedback` só inseria na tabela `feedback` e acabava ali. O email que o
// jogador digita é o DELE (semente da newsletter, com consentimento em coluna
// própria), não um destinatário.
//
// PROVEDOR: formsubmit.co. Escolhido porque é POST direto - nenhuma dependência
// nova, nenhuma chave para guardar e girar, e o repositório é público. O endpoint
// `/ajax/` responde JSON; o normal responde HTML de redirect e não serve para rota.
//
// DESTINO EM ENV VAR (`FEEDBACK_TO`), nunca em arquivo versionado: o endereço do
// dono não é constante de repositório público.
//
// SEM A ENV VAR, NÃO É ERRO. É o mesmo padrão do `src/lib/supabase.ts` ("não
// configurado ≠ quebrado"): quem clona o repo não pode receber falha por não ter o
// segredo de outra pessoa. Avisa uma vez no log e segue.

const DESTINO = import.meta.env.FEEDBACK_TO;
let avisou = false;

export function notificacaoConfigurada(): boolean {
  return !!DESTINO;
}

/* Manda e **nunca** deixa a falha subir. Quem chama já gravou o dado no banco antes
 - se o provedor cair, o jogador continua vendo `{ok:true}` e o feedback está
   salvo. Trocar uma perda (a notificação) por outra pior (o dado) seria o oposto do
   que esta função serve. Por isso ela devolve boolean e não lança. */
export async function notificar(assunto: string, campos: Record<string, unknown>): Promise<boolean> {
  if (!DESTINO) {
    if (!avisou) {
      avisou = true;
      console.info('[notify] FEEDBACK_TO não configurado - feedback só vai para o banco.');
    }
    return false;
  }
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(DESTINO)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      // `_subject` e `_captcha` são campos do próprio formsubmit: sem desligar o
      // captcha ele responde uma página de desafio e o email nunca sai.
      body: JSON.stringify({ _subject: assunto, _captcha: 'false', ...campos }),
      // Timeout curto: isto roda no caminho de uma resposta ao jogador. Provedor
      // lento não pode virar rota lenta.
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) { console.warn('[notify] formsubmit respondeu', r.status); return false; }
    return true;
  } catch (e) {
    console.warn('[notify] falhou (o dado já está no banco):', e);
    return false;
  }
}
