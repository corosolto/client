# Lajes V4 — térreo como ponto de partida

Direção explícita de Ruben após jogar a entrega b3afbcb1: melhorar ambiência,
simplificar caminhos, nascer embaixo e corrigir a escala dos barracos. Esta
revisão substitui o requisito anterior de respawn alto; não é ajuste de limite
para esconder regressão. O checkpoint V3 permanece no Git e nas nove imagens.

## Planta proposta

- Dois conjuntos residenciais, oeste e leste, enquadram a praça e a rua central.
- Três travessias no térreo: praça, beco oeste e beco leste. Um cruzamento central
  conecta as três. Sem ramais de serviço com retorno escondido.
- Quatro plataformas de laje: duas por lado, cada uma sobre casas de um pavimento.
  Duas pontes retas atravessam a travessa central; eliminam-se os saltos entre
  segmentos pequenos. Quatro escadas retas nas extremidades dão acesso e retorno.
- Os dois times nascem no chão, com cobertura contra tiro direto, saídas visíveis
  para as três travessias e armas disponíveis. CTF mantém quatro objetivos.
- Altura da laje em torno de3,1m, portas2,05m, janelas com peitoril. Largura das
  unidades definida pelo uso de residência, não por normalização cega do bbox GLB.
  São dimensões autoradas de projeto, sujeitas a prova visual; não nota estética.
- Ambiência concentrada: comércio e convivência na praça; varais, tanques, antenas
  e plantas junto às casas; fauna e som em trajetos livres. Reutilizar acervo com
  licença confirmada. Evitar saturar todas as paredes ou bloquear inimigos.

## Contratos e validação

Preservar corpo/oclusão coincidentes, respawn seguro, acesso aos12 pickups e quatro
CTF, diferenciação de camadas, guarda/queda/retorno, praça central e três opções.
Substituir explicitamente testes que fixam y5,2, spawn alto, antigas coordenadas
e quantidade de pontes/escadas. O relatório de migração registra cada caso.

Régua vermelha contra V3 antes de ativar V4; mutantes reais depois. Provas no
navegador em1536×1024, incluindo nascimento real, travessias por inputs, subida,
retorno, colisão e revisão adversarial limpa. Custo somado por todos os passes;
performance sem aprovação na ausência de janela exclusiva.

Trabalhar na mesma worktree/branch isolada. Sem push, merge ou deploy. Geometria
anterior recuperável em b3afbcb1. Não alterar checkouts vizinhos ou runtime comum
para compensar um desenho ruim deste mapa.

## Cláusulas visuais migradas explicitamente

O V4 remove pneus e árvores das coordenadas do V3; LVA3/LVA4 passam a medir portas reais (0,85–1,10m ×2–2,30m) e coincidência do tiro com portas/pisos. A verificação de quatro fachadas em x=7,47 é aposentada com a implantação antiga, substituída por doze portas medidas e crítica independente. LVA1 mantém registro ativo; LVA2 mantém quatro setas horizontais; LVA5 mantém as16 visadas entre spawns bloqueadas. Mutantes reais: eixo da seta, escala vertical das portas, remoção dos oclusores e registro do builder antigo. Essas medidas não aprovam estética.

## Segunda rodada visual

Crítica inicial V4 reprovou repetição, painéis centrais e massa excessiva de concreto. Correção: aberturas comerciais largas com balcão, janelas espelhadas/venezianas/marquise, corrimãos sobre mureta baixa, fachadas de fundo com alturas variadas, painel lateral e spawn orientado para sua saída. Doze portas e quatro pisos coincidem com bala;16/16 visadas bloqueadas, medidos em `v4/visual-second.json`. Próximo marco: browser físico e nova crítica independente.
