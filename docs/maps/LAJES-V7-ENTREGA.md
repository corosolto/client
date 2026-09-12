# Lajes V7 — entrega e integração

Pedido: preservar a geometria estreita aceita na V6 e completar ambiência,
preview real e integração com main. O usuário autorizou explicitamente atualização
e merge da PR438 após conflitos e builds resolvidos. Continuidade e checkpoints:
[LAJES-VISUAL-CONTINUIDADE.md](LAJES-VISUAL-CONTINUIDADE.md).

## Resultado

Fachadas em tons de tijolo, terra e reboco; chão de terra reutilizando textura da
main; gramados no campo e pequenas faixas nos becos. Ratos e baratas percorrem o
chão sem criar colisores. Pipas adicionais, helicóptero preservado e 14-bis autorado
com piloto, hélice animada e órbita separada. A planta V6 permanece: só o campo é
amplo, spawns no térreo, rotas estreitas e escadas para as lajes.

Thumbnail e vídeo foram capturados no Game real, sem arma/HUD. Hover e foco iniciam
vídeo mudo; saída, fechamento de menu e aba oculta param reprodução. Preferências
de movimento reduzido/economia de dados preservam a imagem. Detalhes e testes em
[LAJES-V7-PREVIEW.md](LAJES-V7-PREVIEW.md).

Integração mantém a árvore moderna da main: orientação de spawn e navegação em
camadas são opt-in de Lajes; outros mapas preservam o comportamento anterior.
Recursos gráficos próprios são descartados sem liberar GLBs compartilhados.

## Evidência local

- `artifacts/lajes-visual/v7/comparacao-v6-v7.html`: imagens V6/V7, fauna, voo e preview.
- `browser-final/`: capturas 1536×1024 e cinco percursos físicos sem salto obrigatório.
- `browser-low-final/`: boot low com GLBs, PBR, pipas e avião; nenhum erro JS.
- `preview/browser-check.json`: nove cenários do hover real aprovados.
- `gates/integration-final-status.json`: oito gates de mapa aprovados, incluindo
  conectividade, largura física/visual, escadas, circulação e retorno sem armadilhas.
- `gates/ambiencia-final.json`: materiais reais, vegetação, fauna, pipas e descarte.
- `gates/mutantes-final.json`: mutações da ambiência reprovadas corretamente.
- `gates/airspace-green-final.log`: esferas conservadoras das duas aeronaves separadas
  em sete posições de câmera ao longo de uma órbita; mutante sobreposto vermelho.
- `gates/santos-final.log` e `santos-low-final.log`: escala, piloto/canard,
  deslocamento, pausa e descarte aprovados.
- `gates/build-final.log`: build Astro final aprovado; `site-smoke.log`: 14/14 rotas; `seo-final.log`: 6/6 casos.
- `image-manifest.json`: caminhos, tamanhos e hashes das imagens e vídeos de entrega.

A crítica independente está em [LAJES-V7-CRITICA.md](LAJES-V7-CRITICA.md).
A V6 teve aceite humano; V7 não é apresentada como já aprovada esteticamente pelo dono.

## Limites e gates gerais

O check:fast inicial teve 101/104 passos aprovados. Os dois defeitos adicionais de
execução foram resolvidos e repetidos: guarda de Promise do vídeo (medianet) e
blocos gerados previamente não commitados (docsautoria). O inventário local de áudio
continua vermelho por arquivos privados ausentes neste worktree; manifesto e
gerador são idênticos à main. Não é falha nova de Lajes nem suíte integral verde.
O gate de separação aérea foi acrescentado depois e passou com mutante vermelho.

Há repetição modular e fauna pequena de contraste discreto. As capturas demonstram
presença/movimento; não medem FPS em GPU exclusiva. Áudio não recebeu aprovação de
escuta nesta rodada. A PR só deve ser mergeada após os checks remotos do SHA final.

## Fechamento dos bloqueios de integração

A primeira tentativa de Vercel falhou porque o pacote privado cobria os mapas da
main, mas não Lajes. O instalador agora associa Lajes ausente à ambiência externa
de Quebrada já presente no pack; referências e procedência preservadas. O fluxo
real de instalação e o gate foram testados com fixtures: falha13/14, sucesso14/14,
e falha preservada para outro mapa ausente. Ver [áudio](LAJES-V7-AUDIO.md).

A medição global local excedeu o tempo da sonda de mapas e leu JSON anterior; seu
exit0 não foi tratado como validação fresca. A medição isolada de Lajes levou
336,95s e confirmou as cláusulas aplicáveis, exceto a obrigação de pátio MAP2B:
ela contradiz as travessas estreitas aceitas na V6. LSP1 passa a cobrar corpos
livres, slots separados e oito saídas físicas até o campo. O consumidor mantém
os limiares originais para todos os outros mapas e reprova Lajes se LSP1 falhar;
nenhuma dívida foi acrescentada a KNOWN-RED. Ver [respawn](LAJES-V7-SPAWN.md).

O usuário aprovou o vídeo do 14-bis e pediu arquivo para redes sociais. MP4 H.264
1536×1024 de aproximadamente8s, sem áudio, salvo em
`/Users/ruben/Downloads/Santos-Dumont-Lajes.mp4`. Não foi publicado em rede social.
