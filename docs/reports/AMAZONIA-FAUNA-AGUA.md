# Amazônia — fauna e resposta na água

Rodada local de 06/09/2026 sobre 7153bed4, branch `codex/amazonia-visual`.
Objetivo: integrar galinha/pintinhos gerados pelo usuário, jacaré legível, peixes
saltando, corrigir canoas retangulares e retirar a lentidão de caminhar na água.
Preservar escadas, floresta, aves, menu da main e vídeo real no hover.

## Resultado implementado

Uma galinha com três pintinhos no quintal leste (19,12); jacaré do acervo na margem
(9,19); dois peixes com saltos alternados de 1,05s a cada 8s (um no baixo).
Galinha/pintinhos/jacaré são estáticos. Não há novo rig ou animação de caminhada.
Cinco caixas antigas foram substituídas pela canoa Mint de casco aberto, bancos
e motor, sem os antigos colisores cegos. São decoração, não embarcações pilotáveis.
A rabeta navegando fora do limite jogável continua ativa.

O freio antigo multiplicava a velocidade do jogador por 0,45 e dos bots por 0,5.
`slowAt` agora é falso por padrão; `amzwaterslow=1` restaura a comparação antiga.
`footstepSurfaceAt` separa áudio e lentidão. Em seco retorna `undefined`, preservando
o fallback próprio de cada runtime, inclusive a classificação de madeira da main.
O snapshot 8157 recebe somente esse hook em seu próprio Game; não recebe o Game
antigo da branch. Overlay e hashes verificados por `amazonia-preview-sync.mjs`.

## Assets e procedência

Mint: projeto `zd7d9mfmgv0b80ezp3xbykp1ns8dw47r`, chat
`ph7b9m9y8gfz5j83vkxqsrbvzs8dxgba`, pack `th78004y9j8g2kd0mkd45xq65x8dw112`.
Adult Hen e Baby Chick, Tripo P1, já gerados na conta do usuário. URLs GLB foram
observados no viewer, sem nova geração ou compra. Derivados exclusivos desta worktree:

| Asset | Triângulos | Bytes |
| --- | ---: | ---: |
| galinha_mint_amazonia.glb | 4.062 | 370.588 |
| pintinho_mint_amazonia.glb | 3.616 | 198.532 |

Khronos: zero erros e um aviso por GLB. Recibos com hashes de origem/final em
`artifacts/amazonia-visual/fauna-round2/assets.json` e `gltf.json`; origem registrada
em `mint-assets.json` e `public/models/props/FONTE.md`. Pedido autoriza uso local;
termos comerciais de publicação não foram verificados. Não atribuir CC0.

## Evidência

Diretório local: `artifacts/amazonia-visual/fauna-round2/`.

- `med/` e `low/`: 51/51 rotas reais por qualidade, zero linha direta entre spawns,
  zero troncos excedendo colisores. Aves GLB 4/4 e 2/2; rabeta fora da área jogável.
- `yard.json` e imagens: galinha+3 pintinhos, 5 canoas, jacaré e peixe acima da água;
  cinco instantes do salto registram subida, ápice, mergulho e ocultação submersa.
- AMZ1–7, AMV1–7, MAP1/MAP6 e MC1–3 passaram. Build Astro passou.
- AMW1–3 executam Game._updatePlayer real por 120 ticks a 1/120s: distância
  4,583535508m e velocidade final 4,708m/s, iguais ao controle sem freio. Antes:
  2,100352m e 2,1186m/s. Primeiro movimento no tick 1; zero frames imóveis e zero
  empurrão de colisão na rota medida. Passos capturados continuam `water`.
- Mutante que restaura freio falha AMW1; retirar hook de áudio falha AMW3.
  Mutante de lentidão indevida nas pontes falha somente AMV6 e restaura a fonte.

Esses resultados não medem latência de entrada do navegador, FPS ou multiplayer.
Pendências herdadas de audio:check, ORT1/ALT1/SUP1 e orçamento de FPS permanecem
nos relatórios anteriores. Artefatos volumosos ficam fora do Git. Sem push/merge/deploy.

Checkpoint de implementação: `61413c4b`. Crítico independente aprovou imagens e
código após apontar água dentro do casco. Ajuste de altura deixa quilha 2,5cm abaixo
da água e piso interno seco, conferido em `final-med/canoa-amarrada.png`.
`final-med/` valida novamente a fonte após esse ajuste visual; as 51 rotas med/low
anteriores continuam como evidência de navegação (colisores não mudaram no ajuste).
O crítico não executou browser nem ouviu áudio; cinco quadros do peixe não atestam
continuidade quadro a quadro de sua entrada e saída. Fonte final:
`7e144533e7f23d22838bf50812afc1f1801adb2933df09792d7db7f667e720fa`.

Thumbnail/vídeo regravados do Game com essa fonte: JPEG89.114bytes e H.264475.537bytes,
6s/24fps. Recibo `public/img/map-previews/amazonia.capture.json`, sem erros JS ou HTTP.
A primeira tentativa expirou no boot; a segunda entrou normalmente e capturou144frames.
Ferramenta agora reconhece a tela de falha e usa seu botão de tentar novamente,
sem aceitar uma captura de erro como mídia válida.

Hover revalidado na main8157: HOV1/2/3/4/5/6/7/9/10 passam, incluindo fonte/bytes,
carregamento sob demanda, reprodução, pausa, movimento reduzido, resize e teclado.
Inventários atualizados em `c0a6218a`; docs:check e arch:check passaram.
