# Wrappers de portal

Cada pasta é o pacote que sobe num portal de jogos: um `index.html` que embeda
`https://www.corosolto.com.br/` em iframe. O jogo, o multiplayer e as contas
continuam no site; o portal só serve o HTML (itch.io: `html-classic.itch.zone`).
Por isso cada host de portal entra em `frame-ancestors` no `vercel.json`
(ver `docs/seguranca.md`) e `eval:portalembed` amarra as duas pontas.

| portal | pacote | envio |
|---|---|---|
| itch.io | `cd tools/portal/itch && zip -j ../itch.zip index.html` | New project → Kind: HTML → upload `itch.zip` → Embed: "Click to launch in fullscreen", Mobile friendly. O envio é do dono. |

Links de saída e texto da página ficam no portal (descrição), não no wrapper.
