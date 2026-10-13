# Imagens dos e-mails

## Versão ativa

`coro-personagens-v2.jpg`: Canarinho Pistola + Zé da Gotinha, ambos segurando
armas. Zé da Gotinha pertence ao time E e Canarinho ao time B, conforme
`public/js/characters.js`. O logo permanece `coro-logo-v1.png`.
Direção do usuário em 13/10/2026: personagens sempre com armas nas mãos nas
artes desta frente. A versão anterior com punhos sem armas foi rejeitada;
permanece arquivada como v1, sem uso nos templates atuais.
Referências v2: `public/img/resultado/gotinha-vitoria.webp` e
`canarinho-vitoria.webp`; v1 usada como referência de composição/arena.
Geração GPT pelo tool built-in Codex `image_gen`, 13/10/2026. Original 2172×724
preservado no arquivo privado de arte; conversão sem recorte para JPEG
progressivo1200×400, qualidade82. Texto, logo e CTA separados em HTML.

## Histórico v1

- Logo: versão redimensionada do logo oficial existente em public/logo.png; identidade preservada.
- Personagens: arte gerada em 13/10/2026 com GPT pela ferramenta Codex image_gen, a pedido do usuário. Referências: public/img/resultado/canarinho-vitoria.webp e esquerdomacho-vitoria.webp. Canarinho e Esquerdomacho em confronto divertido, arena urbana brasileira, composição panorâmica, sem texto.
- Conversão: JPEG progressivo 1200 × 400, qualidade 82; logo PNG com transparência, largura 260. O original permanece no arquivo privado de arte do projeto.
- Uso: templates em HTML usam URLs HTTPS do próprio domínio, sem rastreamento; publicar estes arquivos antes de ativar os templates. Textos e ações permanecem em HTML.


## Prompt v2 (built-in image_gen)

```text
Use case: precise-object-edit / ads-marketing. Edit target: Image 1 is the current 3:1 email hero for CORO SOLTO, a fictional satirical Brazilian FPS video game. Supporting identity references: Image 2 is the game's Zé da Gotinha character; Image 3 is the game's Canarinho Pistola character. Keep the panoramic 3:1 composition, dark Brazilian urban arena background, detailed cinematic stylized 3D rendering, warm light, and the same yellow Canarinho identity (feathers, orange beak, angry eyes, pointed crest, yellow jersey with green trim, number 24). Replace the human Esquerdomacho entirely with Zé da Gotinha from Image 2: adult-sized fictional white droplet mascot, expressive large eyes, smiling face, white hat and white body matching the reference, recognizable rounded silhouette. TWO characters only. BOTH must visibly hold a firearm in their hands: Canarinho holds a compact black pistol with both feathered hands, Zé da Gotinha holds the black compact SMG from its reference with both white hands, in an energetic game character selection/key-art pose. Show each complete weapon clearly, with coherent grip, no floating gun, no extra hands, no closed-fist boxing poses. Frame both heads and both complete firearms comfortably inside the central 80% of the frame, allowing visible background around them; keep the crest/hat tips inside the image, not cropped. Arms, fingers, magazines and gun silhouettes must remain clear at 600px banner width. Preserve game character identities, not real people. No firing, muzzle flash, injured people, gore, or blood. No logo, new words, slogans, UI, or buttons embedded in this banner; official logo and email CTA remain separate HTML. Opaque background, high-quality wide horizontal email header, exact 3:1 aspect ratio.
```
