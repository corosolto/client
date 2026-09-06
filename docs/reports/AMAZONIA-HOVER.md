# Amazônia — thumbnail real com vídeo no hover

Pedido retomado em 06/09/2026: manter thumbnail real e mostrar vídeo do mapa ao
passar o mouse. Implementado somente para Amazônia na branch isolada
`codex/amazonia-visual`, partindo de 7ac7b2c7, sem merge/push/deploy. Implementação em c6431e5e;
inventários em 9f1d70df.

## Entrega

- JPEG é o primeiro frame de um clipe real do Game, 960×640, 6 segundos a 24 fps.
- Vídeo H.264 silencioso de 475.537 bytes na regravação da rodada de fauna/água. Câmera em órbita discreta sobre o canal,
  mesma direção visual da captura anterior, sem HUD/arma. Não usa geração de vídeo.
- Componente reaproveitado da frente Sertão (b917cce1), com registro somente para
  Amazônia. Carrega ao hover/foco por teclado; sai para o poster ao retirar o mouse,
  perder foco, trocar tela ou ocultar a aba. Uma prévia ativa por vez.
- Movimento reduzido e economia de dados mantêm o poster. Falha de mídia conserva
  a imagem. Vídeo acompanha o retângulo/recorte da imagem em resize.
- Integração mínima em `main.js` e CSS carregado por `index.astro`. O snapshot 8157
  usa sua própria main, com esse mesmo delta aplicado por
  `tools/amazonia-preview-menu.mjs`. Não recebe o main.js antigo da branch.

Fonte e recibo atual: `public/img/map-previews/FONTE.md` e
`public/img/map-previews/amazonia.capture.json`. O recibo anterior
`AMAZONIA-THUMBNAIL.json` documenta a imagem da rodada anterior, substituída nesta.
Na entrega inicial do hover, a fonte era SHA256
6435500ab916414271c3f531fa21462680a4895cfebd666cdde14cb412cfb74f e a geometria não mudou.
A regravação atual inclui fauna, canoas e ajuste da água documentados em
`AMAZONIA-FAUNA-AGUA.md`, fonte SHA256
7e144533e7f23d22838bf50812afc1f1801adb2933df09792d7db7f667e720fa.

## Verificação

Régua `tools/eval/amazonia-hover-check.mjs`: baseline 8157 falha HOV3 (sem vídeo),
poster e página válidos. Entrega passa HOV1/2/3/4/5/6/7/9/10: bytes/captura real,
nenhum download antes do hover, tempo de vídeo avançando, saída pausada, movimento
reduzido, resize sem diferença no retângulo, troca de tela, zero erros JS e foco por teclado.
`tools/eval/amazonia-hover-race-check.mjs` passa e seus dois mutantes matam a
preservação da reprodução nova nas resoluções/rejeições tardias de play().

Build Astro passou, assim como contratos medianet, screenquery, preload,
docs:check e arch:check. As
pendências anteriores de audio:check, mapa-novo e aceite exclusivo de FPS seguem
no relatório da rodada de feedback; esta alteração não as resolve nem reabre.
Evidência local em `artifacts/amazonia-visual/hover-*`.

## Testar

Abra <http://127.0.0.1:8157/?tela=maps&map=amazonia&lang=pt&perfilauto=0> e use
Cmd+Shift+R. Passe o mouse no card Treta na Amazônia. O fluxo normal continua em
<http://127.0.0.1:8157/?map=amazonia&perfilauto=0&lang=pt>.

Contraprovas: remover pointerleave reprova somente HOV4; mídia 404 mantém poster
(HOV8). A branch 8156 também passou reprodução/saída/resize/reduced-motion/tela.
Na primeira medição de resize da branch, a grade deslocava o card para fora do
ponteiro e pausava corretamente. A régua foi ajustada para recolocar o ponteiro
sobre o card antes de medir o vídeo visível; não houve mudança de limiar.
Crítica independente sem bloqueantes de enquadramento/card; apontou o losango de
seleção oculto pelo vídeo, corrigido com camada CSS para preservar o indicador.
