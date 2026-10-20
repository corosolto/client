# `mobile-config.json` — a única alavanca do app de loja sobre um deploy ruim

O app da loja (repo `corosolto/mobile`) é uma **WebView** apontada para `https://www.csbrasil.online/`.
O conteúdo do jogo chega por deploy web — vários por dia — e **não passa por revisão de loja**:
o jogador da loja recebe tudo na hora, o bom e o ruim. Não existe rollback de app para desfazer
um deploy web.

`public/mobile-config.json` é servido na raiz (`https://www.csbrasil.online/mobile-config.json`)
e é o que o app lê, com prazo de 2,5 s, **antes de abrir a WebView**. É com ele que dá para avisar
manutenção, mandar o aparelho para outro caminho do mesmo host ou exigir um shell mínimo —
sem publicar app novo.

Estado normal (o que está versionado):

```json
{ "status": "ok" }
```

## Campos — exatamente como `src/remote-config.ts` lê

O leitor é `interpretarConfig()` no repo `corosolto/mobile`. **Entrada hostil é esperada**: rede
fora, JSON quebrado, campo estranho ou tipo errado caem no padrão `jogar`. Uma régua que derruba
o jogo por causa de um arquivo de configuração é pior que o incidente que ela tentava evitar.

| Campo | Tipo aceito | O que o app faz | O que acontece se vier errado |
|---|---|---|---|
| `status` | `"ok"` ou `"manutencao"` | `"manutencao"` troca a WebView pela tela de manutenção. Qualquer outro valor (inclusive ausente) é `jogar`. | ignorado → `jogar` |
| `mensagem` | string, **até 240 caracteres** | Texto mostrado na tela de manutenção/atualização. Espaços são colapsados e o excesso é cortado em 240. | não-string → `null` (tela sem texto) |
| `url` | string **https**, **mesmo host** (`www.csbrasil.online` ou `csbrasil.online`), até 500 caracteres | Troca o endereço que a WebView abre: serve para apontar canal alternativo ou canário (caminho e query mudam à vontade). | host fora da allowlist, `http:`, URL inválida ou longa demais → volta para `https://www.csbrasil.online/` |
| `shellMinimo` | inteiro ≥ 0 | Shell (versão nativa do app) **menor** que este número cai na tela "atualizar", que vence a manutenção — trocar de canal não conserta app sem a tela nova. | não-inteiro ou negativo → ignorado |

O host **nunca** vem da rede por decisão fechada: host novo entregue pelo config seria sequestro
de sessão com o jogador logado dentro. A allowlist mora no app, não aqui.

## Como usar num incidente

1. **Avisar manutenção** (jogo no ar está quebrado, o conserto está saindo):

   ```json
   { "status": "manutencao", "mensagem": "Estamos consertando o jogo. Volta em alguns minutos." }
   ```

2. **Mandar para outro canal do mesmo host** (o deploy atual está ruim e existe um caminho bom):

   ```json
   { "url": "https://www.csbrasil.online/?canal=estavel" }
   ```

3. **Exigir shell novo** (a correção depende de código nativo, não de web):

   ```json
   { "shellMinimo": 7, "mensagem": "Atualize o CORO SOLTO na loja para continuar jogando." }
   ```

Voltar ao normal é devolver o arquivo para `{ "status": "ok" }` e publicar. O app não guarda
cache do config (`cache: 'no-store'`), então a volta vale na próxima abertura.

## O que este arquivo NÃO é

Não é feature flag de jogo, não liga nem desliga modo, mapa ou loja, e não carrega nada que o
cliente web leia. O cliente web ignora `mobile-config.json` por completo — quem lê é o shell
nativo, antes da WebView existir.
