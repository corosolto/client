# Vendorizar o Leaflet e tirar o unpkg da CSP

**Dificuldade:** média · **Área:** segurança / performance · **Tempo:** ~1 h

## Contexto

`src/pages/mapa.astro` carrega Leaflet 1.9.4 de `https://unpkg.com` — CSS e JS.
Duas consequências:

1. A CSP em `vercel.json` precisa listar `https://unpkg.com` em `script-src` e
   `style-src`. É a única exceção da política inteira, e ela vale pro site todo,
   não só pro `/mapa`.
2. Se o unpkg cair ou for comprometido, `/mapa` cai ou executa código de
   terceiro com acesso total à página.

Todo o resto do projeto já é vendorizado — o Three.js mora em `public/vendor/`
exatamente por esse motivo.

## O que fazer

1. Baixar `leaflet.js` e `leaflet.css` 1.9.4 (+ os PNGs de marcador, se usados)
   para `public/vendor/leaflet/`.
2. Trocar as duas tags em `mapa.astro` pelos caminhos locais.
3. **Remover `https://unpkg.com`** de `script-src` e `style-src` no
   `vercel.json`.
4. Anotar a versão e a origem num comentário, como o Three.js já faz.

## Critério de aceite

- [ ] `/mapa` funciona com a rede de terceiros bloqueada
- [ ] A CSP não tem mais nenhum host externo em `script-src`
- [ ] Console sem violação de CSP em `/mapa`

## Arquivos

`public/vendor/leaflet/` (novo) · `src/pages/mapa.astro` · `vercel.json` ·
`docs/seguranca.md` (§5, tirar a menção ao unpkg)
