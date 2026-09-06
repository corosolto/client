# Sertão — aves distantes

## Objetivo e estado

Subfrente de `plans/16-SERTAO.md`: acrescentar vida discreta ao horizonte, preservando
as aves existentes e todas as rotas jogáveis. Branch `codex/sertao-astra`.
Módulo autoral em `public/js/map_sertao_distant_birds.js`; régua independente em
`tools/eval/sertao-distant-birds-check.mjs`. Nenhum arquivo de mapa, fauna existente,
package ou asset externo foi alterado por esta subfrente.

Código e régua prontos. Integração, capturas reais 1536×1024 e crítica independente
cabem ao agente integrador. Não há aprovação visual deste módulo ainda. O próximo
passo é integrar a API ao mundo, capturar atrás da igreja e nos dois flancos,
confirmar visibilidade e pouca distração no combate, e repetir o orçamento da cena.
Não concluir qualidade visual a partir do placar abaixo.

## Procedência e desenho

- [Cornell Lab, identificação de Black Vulture](https://www.allaboutbirds.org/guide/black_vulture/id):
  cabeça pequena, asas largas, cauda curta e manchas claras nas pontas das asas.
- [Cornell Lab, visão geral](https://www.allaboutbirds.org/guide/Black_Vulture/overview):
  silhueta compacta e planeio. A animação representa um trecho de planeio com ajuste
  sutil de asas, não uma simulação completa de comportamento ou batimento real.
- [ICMBio, guia de aves do Parque Nacional de Brasília](https://www.gov.br/icmbio/pt-br/centrais-de-conteudo/publicacoes/guias-de-aves/guia-aves-pnb-completo.pdf):
  referência de envergadura aproximada de 1,43 m do urubu-de-cabeça-preta.
- [ICMBio, guia de aves da Estação Ecológica do Seridó](https://www.gov.br/icmbio/pt-br/centrais-de-conteudo/publicacoes/guias-de-aves/dcom_guia_de_aves_da_estacao_ecologica_do_serido.pdf):
  lista `Coragyps atratus`; presença regional consultada pelo índice público.
  O PDF integral não foi baixado nesta subfrente.

Consultas em 2026-09-06. A referência é biológica, sem copiar imagem, malha ou
textura. Geometria e cores por vértice são próprias; não há download, geração paga,
pessoa real, marca ou gore. Não se afirma exclusividade da espécie ao Nordeste.

Corpo de aproximadamente 0,62 m, cabeça menor que o torso, cauda curta aberta e
envergadura geométrica de aproximadamente 1,46 m. Cada asa tem contorno largo,
extremidades recortadas e espessura de 18 mm; não é um único triângulo plano.
Manchas claras nas duas faces mantêm legibilidade das instâncias espelhadas por
rotação. Essa simplificação de aparência é destinada à distância, não a close
ornitológico. O material tem iluminação e neblina normais, sem emissão ou sprites.

## Contrato e envelopes

`createSertaoDistantBirds(root, { low })` retorna
`{ group, birds, update(dt), reset, dispose, report }`.
`update` recebe segundos, ignora valores negativos/não finitos e atualiza as
matrizes desenhadas. `reset` restaura a pose inicial; `dispose` é idempotente e
libera instâncias, geometrias e material. Não chama browser, colisão ou áudio.

Quatro trajetórias fixas, com uma no perfil leve, em torno dos centros
`(-24,88)`, `(24,-82)`, `(-74,26)` e `(74,-26)` no plano XZ.
A igreja está em Z positivo (`map_velho_oeste.js`, capelinha em Z=22,5).
As duas primeiras ficam além dela; as demais ocupam os flancos. Alturas-base
24/25,5/22/20,5 m, oscilação de 0,45 m. Nenhuma órbita cruza a arena de
meias-extensões X=34/Z=46. Movimento orbital contínuo a 0,045 rad/s, abaixo de
1 m/s, com inclinação moderada e asas ajustadas em ciclo lento.

Os limites de quatro/uma aves, dois desenhos, menos de 800 triângulos, zero texturas
e altitude 18–27 m foram dados na tarefa. A margem horizontal da régua
`abs(x)>=54 || abs(z)>=66` é um envelope de colocação desta composição, não uma medida
de referência fotográfica. A régua anatômica verifica dimensões e cores efetivas
das malhas; isso impede formas degeneradas, mas não substitui crítica por imagem.

## Validação reproduzível

Antes da implementação: `node tools/eval/sertao-distant-birds-check.mjs` falhou em
SDB0 porque o módulo não existia. Depois: SDB1–SDB8 passaram.

Medição desta rodada: médio 4 aves/2 desenhos/768 triângulos/0 texturas;
low 1 ave/2 desenhos/192 triângulos. Sem sombras, transparência, colisores ou novas
dependências. Velocidade máxima desenhada 0,903 m/s arredondada para cima.
Foram amostrados 21.600 passos a 60 Hz, cobrindo 360 segundos e mais de duas voltas.
Delta das matrizes com 60 Hz versus 20 Hz menor que 1e-6; reset exato; descarte
dispara uma vez por recurso e ignora atualizações posteriores.

| Régua | Mede no resultado | Mutação que deve reprovar |
|---|---|---|
| SDB1 | Instâncias e visibilidade | `sem-aves` |
| SDB2 | Volume corporal, asa larga/espessa, manchas claras | `triangulos` |
| SDB3 | Custo, materiais e ausência de sombras/colisão | `sombra-cara` |
| SDB4 | Todas as asas mudam em coordenadas locais do corpo | `asas-paradas` |
| SDB5 | Altura e afastamento em todas as amostras | `dentro-arena`, `voo-baixo` |
| SDB6 | Deslocamento contínuo e velocidade limitada | `voo-rapido` |
| SDB7 | Redução real das instâncias em low | `low-cheio` |
| SDB8 | Tempo, reset, entrada inválida e descarte | `por-frame` |

Rode cada variante com `--mutante=NOME`. A mutação altera o módulo em memória;
nenhum arquivo de produção é modificado. O processo retorna sucesso somente se a
cláusula esperada ficar vermelha, sem outras falhas. A versão não mutada deve
retornar sucesso com todas verdes.

## Integração e pendências

- Atualização/reset/descarte integrados uma vez no ciclo do mundo, preservando fauna atual.
- Silhuetas vistas em3:2 e aprovadas pelo crítico independente para revisão humana;
  evidência life-polish-r4/aves.png e SERTAO-CRITICA-FAUNA2.md.
- Verificar a cena completa contra seu teto existente, sem aumentar o orçamento.
- Atualizar preview/recibo somente após a composição final e crítica independente.
- Agente integrador faz o checkpoint junto ao ledger geral; esta subfrente não
  comita alterações concorrentes nem dá aprovação de publicação.

Após integração, aves originais ficaram escondidas pelo casario em captura de
jogador. Rotas aproximadas para70–100m e repartidas entre norte/sul/flancos.
O envelope atual preserva20m além dos limites34×46m da arena e altura18–27m,
em vez de congelar coordenadas de uma composição que não aparecia. Mutantes
foram adaptados à fonte real e repetidos. Captura life-polish-r4/aves.png mostra
silhueta pequena, separada dos telhados; custo permanece2draws/768tris.
