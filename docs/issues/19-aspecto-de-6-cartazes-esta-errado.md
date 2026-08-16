# O aspecto declarado de 6 cartazes está errado (arte esticada na parede)

**Dificuldade:** fácil · **Área:** arte / arnês · **Tempo:** ~1 h

## Contexto

`public/js/textures.js` declara, na lista `POSTER_FILES`, a proporção largura/altura de
cada cartaz **à mão**:

```js
['51edbafcf2eebbb2dc157f66bb1a2d66.jpg', 0.72],
```

Esse número decide o tamanho do quad na parede. Se ele não bater com o arquivo, a arte
sai **esticada ou achatada** — e ninguém percebe olhando o código, porque 0.72 parece tão
plausível quanto 1.02.

Medido em 07/08 (26 cartazes conferidos, 6 fora por mais de 6%):

| arquivo | declarado | real | erro |
|---|---|---|---|
| `6f2bbbe03a6c5a16af15fe12ebea0d6c.jpg` | 0,72 | 1,338 | **−46%** |
| `51edbafcf2eebbb2dc157f66bb1a2d66.jpg` | 0,72 | 1,019 | −29% |
| `images.png` | 0,90 | 0,695 | +29% |
| `574381edb80801aaff5e9a1cdd88bc4b.jpg` | 0,72 | 0,844 | −15% |
| `8445c0ca193d22b4d6a9af66409b0dda.jpg` | 0,72 | 0,851 | −15% |
| `dc58fe69ac56037026f1bf6181b7f71c.jpg` | 0,72 | 0,667 | +8% |

O padrão denuncia a origem: cinco deles são exatamente `0.72`, o valor que alguém repetiu
ao colar a linha.

## O que fazer

1. Escrever `tools/eval/poster-aspect-check.mjs`: lê as dimensões reais de cada arquivo de
   `public/posters/` e compara com o declarado. Falha acima de 6% (o limite é escolha —
   documente por que 6 e não 2: JPEG de acervo tem borda irregular).
2. Corrigir os 6 números no `textures.js`.
3. Entrar no `npm run check`.

**Cuidado:** `T.posterAspects` também é usado pela passada de grafite
(`graffiti_pass.js`, banda `fonte: 'poster'`). Depois de corrigir, **regere o layout**
com `npm run grafite`, senão as peças de cartaz ficam com o tamanho antigo assado.

## Critério de aceite

- [ ] `node tools/eval/poster-aspect-check.mjs` passa depois da correção
- [ ] Estragar um número de propósito faz o comando sair 1, dizendo arquivo, declarado e real
- [ ] `npm run grafite` regerado e commitado
- [ ] Roda no `npm run check`

## Arquivos

`tools/eval/poster-aspect-check.mjs` (novo) · `public/js/textures.js` ·
`public/js/graffiti_layout.js` (regerado) · `package.json`
