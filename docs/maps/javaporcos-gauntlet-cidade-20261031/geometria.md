# Cidade: torre, casas e armas

Pedido do dono em 31/10: concentrar o modo na Cidade Invadida; tornar a torre
acessível por escada, permitir uso das casas/janelas, melhorar a superfície dos
acessos laterais e distribuir mais armas. Esta frente não altera IA, interface,
servidor, placar ou áudio.

## Régua antes do conserto

`node tools/eval/javaporcos-cidade-acessivel-check.mjs` no HEAD ef8d4ab75
reprovou quatro cláusulas: torre sem escada/piso, somente dois sobrados abertos,
12 armas apenas no anel externo e concreto genérico esticado nos refúgios.
Log: `/tmp/jav-cidade-acessivel-red.log`.

## Implementação

- Torre da caixa d'água na praça: plataforma a 6,20 m acima da praça, dois lances
  com 18 degraus cada, patamar intermediário, guarda e vão de chegada. O tanque
  mantém a altura original. Pés, degraus, teto e guarda compartilham as mesmas
  cotas; o tanque tem colisor girado junto à malha. A escada não exige salto.
- A torre foi excluída da navegação terrestre da horda, como os quatro refúgios.
  Os dois lances entram no contrato `world.stairs` da varredura geral de mapa.
- Casas acessíveis em OS-oo, LS-oo, OS-oi e LS-io. Entrada térrea e janelas
  superiores na frente, fundo e lado direito; o lado esquerdo protege a escada.
  Os dois novos lotes seguem a reorganização já adotada nos abrigos anteriores:
  um sobrado no centro, sem vizinha ou muro bloqueando a fachada.
- Refúgios laterais usam a madeira existente com UV por metro nas lajes e
  degraus. Nenhum material ou textura novo foi criado. A revisão visual ainda
  precisa conferir a leitura das tábuas em jogo.
- As 12 armas existentes do anel foram preservadas; outras 12 ficam nas ruas
  e vielas dos quatro quadrantes. A régua cobra acesso a arma em até 14 m de
  seis posições urbanas escolhidas e dos quatro refúgios. Não altera a regra
  global que impede recarregar a mesma arma pegando outro pickup igual.

O sorteio de telhado e os sorteios de extras de casas omitidas continuam
consumidos; a chamada de giro da caixa d'água também permanece no mesmo ponto.
Não foram adicionadas luzes ou materiais. Geometria nova usa os lotes existentes.

## Rodadas e resultados

1. Escada inicial subia, mas um suporte do reservatório batia na cabeça no
   segundo lance. Rejeitado; suportes foram para as bordas da plataforma.
2. A subida passou. A cláusula irmã de descida revelou um poste existente diante
   do primeiro degrau. Rejeitado; ambos os lances foram recuados 0,76 m, com o
   patamar e vão correspondentes, preservando o poste e a rua.
3. Régua final: quatro cláusulas verdes. Jogador real sobe e desce sem pulo,
   36 raios conferem degrau físico/visual e três raios da plataforma chegam a
   lados distintos da cidade. Quatro casas têm linhas de tiro vazadas e 24 armas
   cobrem as dez zonas de consulta. Logs:
   `/tmp/jav-cidade-acessivel-final-baseline.log` e
   `/tmp/jav-cidade-acessivel-final-{torre-sem-piso,janela-fechada,armas-centrais,rampa-lisa}.log`.
4. Os quatro mutantes foram detectados, cada um derrubando somente a cláusula
   correspondente. Todos retornaram zero no modo de autoteste de mutação.
5. Regressões dirigidas dos interiores e quatro refúgios estão registradas em
   `/tmp/jav-interiores-city-loop-final.log` e
   `/tmp/jav-refugios-city-loop-final.log`.

## Limites e próximo passo

Node não carrega os GLBs reais. Os raios das três vistas comprovam a geometria
procedural e não substituem capturas 3:2 no navegador com a cidade carregada.
Falta a revisão adversarial de integração, orçamento WebGL e a varredura ampla
`map-check.mjs invasao_javaporcos` no estado final consolidado. Seu JSON precisa
ser preservado/mesclado para não apagar os demais mapas. Nenhum aceite visual foi
dado nesta frente; nenhuma publicação ou commit foi feito pelo builder.

## Revisão adversarial: porta e escada das quatro casas

O crítico identificou que a cláusula inicial de casas só contava os abrigos e
conferia raios nas janelas. Ela não provava chegada pela rua. Foi acrescentada
uma quinta cláusula com `_moveEntity`: partir do lado de fora, atravessar a porta,
subir a escada, chegar à janela superior, sustentar os pés no andar durante um
segundo e refazer o caminho pela escada até sair à rua, nas quatro casas.

O novo baseline ficou vermelho na LS-oo: a caçamba em x27.6,z33.2 ocupava a
abordagem frontal da porta e impedia o retorno ao ponto da rua. Esse defeito era
invisível no teste antigo, que começava dentro da casa. A caçamba foi deslocada
para x31.2,z33.2, mantendo ID, conteúdo, material e função. O teste também anda
do nó de navegação até a área efetiva de saque da caçamba, comprovando que ela
continua alcançável após a mudança.

Resultado final: cinco cláusulas verdes; quatro percursos completos, pés em
0.06 m no térreo e 3 m no andar, sustentação de um segundo, retorno ao chão real
da rua. Mutante `casa-porta-bloqueada` injeta um colisor no vão e derruba somente
a cláusula de percurso. Os quatro mutantes anteriores permanecem detectados
isoladamente. Interiores dirigidos: sete cláusulas verdes após o deslocamento.
Logs: `/tmp/jav-cidade-rotas-baseline-final.log`,
`/tmp/jav-cidade-rotas-porta-fix.log`,
`/tmp/jav-cidade-rotas-final-{torre-sem-piso,janela-fechada,armas-centrais,rampa-lisa}.log`
e `/tmp/jav-interiores-porta-fix.log`.

## MAP6: saída do segundo lance e patamar superior

A varredura ampla da integração encontrou duas transições de 6,20 m na saída do
último degrau, em [-17.5,-9.25] e [-17.25,-9.25]. Corpo em sólido continuava zero,
e os seis lances declarados passavam na medição física. A nova cláusula focada
reproduziu exatamente a queda informada antes do ajuste, no log
`/tmp/jav-torre-bordas-red.log`.

A plataforma física existia após a saída, mas o chão padrão sem `yRef` ignorava a
laje. Fechar essa saída com uma guarda atravessaria o caminho da escada. O ajuste
foi declarar os pisos superiores para consultas sem referência de corpo e abrir
um vão sobre cada lance, evitando que a medição da escada inferior passasse a
medir a laje acima. Os dois vãos receberam guardas; a abertura do lance inferior
é fechada também na face da frente. A chegada do segundo lance continua livre.

A plataforma agora tem 6 m de largura, com corredores laterais e faixa frontal
contínua. Colunas, tanque, altura e luzes foram preservados. O helper
`pisosElevados` reconhece `pisoDeclarado` apenas quando não há `yRef`; um corpo
informado abaixo da laje continua recebendo o solo inferior. Não houve mudança
na régua global ou nos limiares do MAP6.

A sexta cláusula mede as duas posições reportadas, quatro bordas de guarda,
preservação do solo inferior e uma varredura local em grade de 0,25 m ao redor
da torre. Ela usa os mesmos parâmetros físicos de `tools/eval/map-check.mjs`:
corpo de 0,38 m, transição de 2 m e deslocamento mínimo de 0,02 m. Essa varredura
local não substitui a verificação ampla do mapa pelo agente integrador.

Baseline final: seis cláusulas verdes, mantendo subida e descida sem pulo,
três linhas de tiro, percursos completos das quatro casas, armas e texturas.
Seis mutantes foram detectados isoladamente, incluindo `torre-sem-guarda`, que
remove somente os colisores de guarda identificados no módulo da torre.
A régua restaura alterações de chão e array de colisores entre cláusulas para
que um mutante não contamine a medição seguinte.
Logs: `/tmp/jav-torre-bordas-final-baseline.log` e
`/tmp/jav-torre-bordas-final-{torre-sem-guarda,torre-sem-piso,janela-fechada,casa-porta-bloqueada,armas-centrais,rampa-lisa}.log`.
O estado só poderá ser chamado de MAP6 amplo aprovado após o novo MAPCHECK do
integrador. Captura em navegador e orçamento visual continuam sendo gates
separados.
