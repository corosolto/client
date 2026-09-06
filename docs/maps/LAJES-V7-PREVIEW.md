# Lajes V7 — prévia do mapa

Pedido de 06/09/2026: o thumbnail deve mostrar o mapa real e tocar um vídeo no
hover. Esta frente preserva a UI atual da `main` e acrescenta o comportamento no
cartaz do setup e no card de Lajes da seleção de mapas.

## Contrato

- Poster: `public/img/map-previews/lajes.jpg`, captura real do runtime V7.
- Vídeo: `public/video/map-previews/lajes.webm`, captura real do mesmo mapa.
- O cartaz continua 16:9 e o card 4:3; os dois recortam a mídia com `object-fit: cover`.
- `pointerenter` e foco de teclado iniciam um loop mudo, inline e sem controles.
- Nenhum elemento de vídeo nem requisição de vídeo existe antes da interação.
- `pointerleave`, saída de foco, aba oculta, painel fechado e troca de mapa pausam
  e retornam ao poster. Voltar à aba não reinicia sozinho.
- `prefers-reduced-motion: reduce` ou economia de dados mantém só a imagem,
  inclusive se a preferência mudar durante a reprodução.
- Falha do arquivo ou rejeição de `play()` mantém a imagem e evita novas tentativas
  até trocar o mapa ou recriar o card. Outros mapas continuam com previews estáticos.
- Recriar cards descarta fonte, vídeo, observers e listeners antigos.
- Observers acompanham apenas o host e ancestrais; vídeo parado não mede layout nem
  reescreve classes em resposta a mutations, evitando realimentação e trabalho por frame.

`public/js/map_preview.js` concentra esse ciclo. `main.js` liga o módulo às duas
superfícies. O cartaz agora usa botão nativo, portanto Enter/Espaço continuam a
abrir a seleção e Tab oferece a mesma prévia disponível no mouse.

## Evidência automatizada

`node tools/eval/map-preview-check.mjs` executa o módulo real com superfícies DOM
controladas. São 11 cenários: criação lazy, foco/blur, visibilidade da aba, duas
preferências, mudança de preferência, rejeição de play, erro do arquivo, Promise
tardia, ocultação/remoção, painel fechado com retângulos preservados e troca de mapa.

O estado anterior falhou por módulo ausente (`ENOENT`, registro local em
`/tmp/lajes-preview-red.txt`). Após implementação, 11/11 cenários passaram.
`--mutante=aba-oculta` modifica o fonte carregado removendo a guarda `doc.hidden`;
a substituição precisa aplicar e MP3 deve reprovar: “Vídeo continua na aba oculta”.
O arquivo original não é alterado pela mutação.

`node --check public/js/main.js`, `node --check public/js/map_preview.js` e o
`redesign-check.mjs` existente também passaram nesta frente. O teste Node valida
eventos e descarte; não valida a decodificação do WebM nem o conteúdo dos pixels.
Uma repetição do redesign durante a integração falhou antes de executar contratos,
na importação nativa do Sharp (`TypeError: Cannot read properties of undefined
(reading 'endsWith')`); repetir após estabilizar as dependências da `main`.

## Verificação de navegador e mídia — responsável pela captura

1. Gerar poster e WebM do runtime V7, sem HUD, nome de jogador ou menus. Registrar
   duração, dimensões, tamanho e SHA-256 no relatório V7; confirmar que os dois
   mostram os becos estreitos e a ambiência atual. Evitar vídeo enorme para hover.
2. Abrir setup de Lajes, antes do hover confirmar zero requests `.webm` de mapas.
   Confirmar poster real em 16:9; hover deve produzir request HTTP 200 e um vídeo
   com `readyState >= 2`, `videoWidth > 0`, `paused === false`, `muted === true`.
3. Capturar poster e um frame durante o hover. Sair do cartaz: verificar
   `paused === true`, `currentTime === 0`, classe `map-preview-playing` removida.
4. Tab até o cartaz: vídeo inicia. Tab para o próximo botão: pausa. Enter no cartaz
   abre seleção. Repetir hover/foco no `.ms-thumb[data-id="lajes"]`; comparar crop 4:3.
5. Fechar setup por ESC/Voltar enquanto toca; trocar tela e esconder a aba. Todos
   devem pausar. Reabrir não deve tocar sem uma nova interação.
6. Emular reduced-motion e `navigator.connection.saveData`: hover/foco não cria
   elemento de vídeo nem dispara request. Testar rejeição/404 do WebM com cache
   desativado: o poster continua visível e o console não recebe Promise rejeitada.
7. Trocar Lajes por outro mapa e alternar filtros na seleção: nenhum vídeo antigo
   deve continuar tocando ou permanecer no DOM. Confirmar setas, seleção e texto
   de autoria/categoria intactos em 16:9 e 3:2.

Nesta frente não houve browser concorrente. A aprovação visual e a validade do
arquivo final dependem da captura centralizada do responsável pela integração.

## Fechamento da captura centralizada

Poster960×640 e vídeo WebM12s capturados no Game, recapturados após separar as
órbitas do 14-bis e helicóptero. `artifacts/lajes-visual/v7/preview/browser-check.json`
registra nove cenários reais verdes; os onze testes Node também passaram. O
redesign e medianet passaram na suíte final. Capturas e hashes ficam no manifesto
da entrega V7; o checklist acima é procedimento de reprodução, não pendência atual.
