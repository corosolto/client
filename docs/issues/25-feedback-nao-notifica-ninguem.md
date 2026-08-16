# O formulário de feedback não notifica ninguém

**Dificuldade:** média · **Área:** backend / DX · **Tempo:** ~2 h

## Contexto

`src/pages/api/feedback.ts` recebe o feedback do menu e faz **uma coisa só**:

```ts
const { error } = await supabaseAdmin.rpc('submit_feedback', { … });
```

Insere na tabela `feedback` (ver `supabase/migrations/013_feedback.sql`) e acabou.
**Não existe envio de email em nenhum ponto do caminho.** O `email` que o jogador digita é
o *dele* — semente da lista de newsletter, com consentimento em coluna própria — não um
destinatário.

Efeito medido em 07/08: o dono enviou um feedback pelo jogo e não recebeu nada, porque
não havia nada para receber. O dado está no banco; ninguém é avisado. Feedback que só
existe numa tabela que ninguém abre é feedback perdido.

## O que fazer

1. Notificar por email a cada envio, com **destino em variável de ambiente**
   (`FEEDBACK_TO`), nunca escrito no código — o endereço do dono não é constante de
   repositório público.
2. Escolher o provedor e **escrever a escolha no comentário** (o repo já usa Vercel;
   Resend e SMTP são os candidatos óbvios). Chave em segredo, seguindo o padrão das outras
   (`src/lib/supabase.ts` é o gabarito de "não configurado ≠ quebrado").
3. **O envio não pode derrubar a resposta.** Se o email falhar, o feedback já está no
   banco e o jogador tem que ver "ok" do mesmo jeito: `try/catch`, log, e segue. O
   contrário troca uma perda (notificação) por uma pior (o dado).
4. Sem `FEEDBACK_TO` configurado, a rota se comporta exatamente como hoje e avisa uma vez
   no log — o projeto é aberto, e quem clona não deve receber erro por não ter o segredo
   do dono.
5. O corpo do email leva mensagem, mapa, versão e se marcou newsletter. **Não** leve o IP.

## Critério de aceite

- [ ] Com `FEEDBACK_TO` configurado, um envio chega no destino
- [ ] Sem `FEEDBACK_TO`, a rota responde `{ok:true}` igual hoje e não quebra
- [ ] Provedor fora do ar: o feedback continua entrando no banco e a resposta é `{ok:true}`
- [ ] O endereço não aparece em nenhum arquivo versionado

## Arquivos

`src/pages/api/feedback.ts` · `src/lib/` (helper de email, novo) · documentação de env vars
