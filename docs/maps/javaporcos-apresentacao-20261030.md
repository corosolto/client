# Apresentação do modo Javaporcos

O modo horde chama o lado E de Defensores e o lado B de Javaporcos. Placar,
HUD, banners, loading e resultado usam esses nomes. Os demais modos mantêm
seus rótulos. A tecla B no indicador de câmera continua sendo um atalho.

A espera alterna três artes existentes a cada 20 segundos. A UI v3 usa um img
próprio: mudar somente --loading-wall não altera a imagem visível. A régua
`BASE=http://localhost:4321 npm run eval:javaporcosidentidade` mede currentSrc
carregado na tela, nomes e isolamento da Praça dos Poderes. Mutantes:
`--mutante=nomes-antigos` e `--mutante=wallpaper-fixo`.

A introdução precede a criação do Game e seu watchdog, portanto PREP não corre
enquanto se lê. Defender a cidade, Pular, Enter ou Escape iniciam o carregamento.
O limiar vem de DOMINIO.derrota. Automação debug pula a intro por padrão;
`hordeintro=1` força o caminho real na régua `eval:javaporcosintro`.
As três artes da espera também alternam na intro; movimento reduzido e aba
oculta suspendem a rotação. Não há geração nem download de imagens novas.

O texto factual é uma paráfrase curta destas fontes oficiais, consultadas em
30/10/2026, separada da ficção de defender lojas e setores:

- [Brasília Ambiental: características do javali e do javaporco](https://www.ibram.df.gov.br/caracteristicas-do-javali-sus-scrofa-scrofa-e-do-javaporco-sus-scrofa): hibridação com porco doméstico, reprodução alta e revolvimento do solo.
- [Ibama: manejo e controle do javali](https://www.gov.br/ibama/pt-br/assuntos/biodiversidade/especies-exoticas-invasoras/manejo-e-controle-do-javali): invasão no Brasil, agressividade, reprodução descontrolada e impactos agrícolas.

A régua da intro exige texto e 75%, ausência do Game durante 13 segundos,
saída pelo botão e teclado e criação posterior do Game. Mutantes sem-intro,
sem-pular e dominio-errado precisam ser detectados. Capturas desktop 3:2 e
celular ficam nos artefatos locais; aceite humano continua separado.
