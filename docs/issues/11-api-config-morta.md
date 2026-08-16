# Decidir o destino de `GET /api/config`

**Dificuldade:** fácil · **Área:** limpeza / segurança · **Tempo:** ~30 min

## Contexto

`src/pages/api/config.ts` entrega `SUPABASE_URL` + `SUPABASE_ANON_KEY` ao
browser "pro client ligar OAuth/storage". A auditoria de 2026-08-03 procurou
consumidores em `public/js/` e `src/` e **não achou nenhum**: a rota emite a
chave e ninguém a usa.

É uma rota pública que expõe credencial sem nenhum uso conhecido. Não é um furo
(a anon key é pública por design e a migration 011 fechou o que ela alcançava),
mas é superfície de graça.

## O que fazer

Confirme primeiro, não confie na auditoria:

```bash
grep -rn "api/config" public/ src/ tools/
```

Depois, uma das duas:

- **Se ninguém usa:** apague a rota. Se OAuth voltar à mesa, ela volta em 5
  minutos.
- **Se alguém usa:** documente **quem**, num comentário no topo do arquivo, e
  adicione `rateLimit()` (`src/lib/ratelimit.ts`) — hoje ela não tem limite.

## Critério de aceite

- [ ] O PR diz explicitamente qual dos dois caminhos foi tomado e por quê
- [ ] Se apagada: nada quebra em `npm run build`, e o jogo abre e registra nick
- [ ] Se mantida: tem comentário dizendo o consumidor, e tem rate limit

## Arquivos

`src/pages/api/config.ts`
