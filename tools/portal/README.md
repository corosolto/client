# Wrappers de portal

Cada pasta é o pacote que sobe num portal de jogos: um `index.html` que embeda
`https://www.corosolto.com.br/` em iframe. O jogo, o multiplayer e as contas
continuam no site; o portal só serve o HTML (itch.io: `html-classic.itch.zone`).
Por isso cada host de portal entra em `frame-ancestors` no `vercel.json`
(ver `docs/seguranca.md`) e `eval:portalembed` amarra as duas pontas.

| portal | pacote | envio |
|---|---|---|
| itch.io | `python3 tools/distribution-web/package.py build --portal itch` → `dist/portal/itch-wrapper/corosolto-itch.zip` | New project → Kind: HTML → upload `corosolto-itch.zip` → Embed: "Click to launch in fullscreen", Mobile friendly. O envio é do dono. |

O empacotador (`docs/docs/distribuicao-web.md`) gera ZIP determinístico com `LICENSE` e
`SOURCE.txt`, manifesto de hashes, orçamento do portal e o teto de 250 MB (#1110).

Links de saída e texto da página ficam no portal (descrição), não no wrapper.
