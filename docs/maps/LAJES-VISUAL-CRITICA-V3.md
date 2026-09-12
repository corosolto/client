# Lajes — crítica visual independente V3

Data: 06/09/2026. Branch observada: `codex/lajes-visual`.

**Veredito do conjunto: REPROVADO para a direção visual solicitada.** Há correções
visíveis em relação à V2: as faixas brancas largas deixaram de atravessar pisos e
coroamentos; o material das paredes se diferencia melhor do chão; as escadas
ficaram mais claras; os spawns receberam cores e remates distintos. A repetição
dos grandes painéis diante das casas e a ausência de função doméstica perceptível
na laje-oeste continuam. A mudança de materiais melhora o resultado, mas não
resolve a composição arquitetônica dominante.

## Método

Revisão conforme a skill `asset-review` já lida nesta tarefa, o pedido original e
os critérios da crítica V2. As nove PNG de `artifacts/lajes-visual/visual-v3/`
foram abertas individualmente com `view_image`, em 1536×1024. Não foram lidos
código, ledger, resultados de gates ou justificativas do integrador. A comparação
usa as nove V2 já inspecionadas nesta mesma tarefa; não houve navegador, GPU,
benchmark, edição de asset ou commit.

Coordenadas são aproximações para localizar evidências, não métricas de qualidade.
Avatares, arma e HUD ficam fora do julgamento. Personagens em outra posição e a
mensagem de início de rodada limitam a comparação de áreas encobertas. Não trato
isso como defeito de modelagem do mapa. Ausência de um elemento nesta vista não
prova sua ausência em todo o mapa.

## Resultado por vista

### `spawn-norte.png` — REPROVADO

**Resolvido/parcial:** o painel agora tem acabamento verde-azulado, base e remate
superior reconhecíveis (x365–1170, y388–788). Isso o diferencia do sul e dá mais
contexto construtivo que a chapa bege da V2. O piso frontal tem material claro
menos parecido com o da parede. O conjunto denso de riscas inferiores diminuiu.

**Persiste:** a composição ainda desemboca numa face quase inteiramente cega,
ocupando o centro, com o contexto doméstico restrito ao fundo lateral. Duas linhas
horizontais finas continuam perto de y708, x545–1025; a imagem não revela função
para elas. Não afirmo que sejam z-fighting. A cor isolada não torna essa face
uma parte convincente de uma moradia.

**Reparo mínimo:** conferir e eliminar as linhas sem função; completar a relação
do painel com uma unidade construtiva lateral ou um único detalhe doméstico
coerente. Preservar a barreira necessária e evitar porta falsa. A mensagem de
rodada cobre parte do remate, portanto não serve para reprovar a região oculta.

### `spawn-sul.png` — REPROVADO

**Resolvido/parcial:** a cor terracota com base/remate distingue o sul do norte;
o defeito de spawns cromaticamente intercambiáveis está resolvido nesta dupla.

**Persiste:** a mesma composição de painel vazio domina x375–1160, y410–715.
Duas riscas permanecem junto à base da face (x510–990, y708). O piso frontal
apresenta faixas horizontais muito densas (x370–1020, y800–1024); podem representar
chapa ondulada, mas a aparência observada continua estriada e compete com a
leitura das bordas. Não é possível declarar defeito temporal por uma PNG.

**Reparo mínimo:** resolver as riscas da parede e revisar escala/leitura da chapa
do piso na câmera real; integrar o painel a uma função doméstica localizada,
sem duplicar o mesmo detalhe do norte nem mudar o bloqueio de visão.

### `praca-do-chao-norte.png` — REPROVADO

**Resolvido/parcial:** a parede atrás do gol (x685–955, y418–603) deixou de repetir
as rachaduras do chão e passa a parecer uma superfície vertical de concreto. Os
degraus altos à direita são mais perceptíveis. A praça segue legível como espaço
comum, com gol e marcações claros; esse aspecto está **APROVADO**.

**Persiste:** grandes placas de tijolo/reboco continuam enquadrando casas menores
e mais detalhadas; a fachada esquerda (x275–670, y320–620) parece sobreposição de
escalas arquitetônicas, e não unidades individualizadas. A escada direita
(x1055–1170, y330–510) tem parte visível, mas a sequência acesso/pouso/saída não
fica completa nesta aproximação.

**Reparo mínimo:** consolidar material e remates de uma unidade frontal com a
casa correspondente; tornar explícita a continuidade da escada até a saída por
um detalhe de borda fixado à construção. Não adicionar objetos à quadra para
encobrir a repetição das fachadas.

### `praca-do-chao-sul.png` — REPROVADO

**Resolvido/parcial:** o lance direito está sensivelmente mais claro; as faces
dos degraus e a parede lateral se distinguem (x1055–1245, y445–654). A parede do
gol também perdeu o aspecto de piso rachado. A leitura visual da praça permanece
**APROVADA**.

**Persiste:** topo e pouso da escada continuam escondidos pela massa superior;
clarear o material resolveu parte da sombra, não demonstrou o destino. A
cadência de painéis altos, portas escuras e apêndices verticais iguais persiste
na lateral esquerda (x0–545, y210–675).

**Reparo mínimo:** indicar a continuidade até o pouso por um remate/corrimão
coerente; variar o acabamento de unidades vizinhas mantendo portas, janelas e
estrutura pertencentes à mesma casa. Preservar a boa leitura desimpedida da praça.

### `praca-da-laje-leste.png` — REPROVADO

**Resolvido/parcial:** coroamentos agora têm continuidade de concreto, sem a
mancha branca alongada da V2. A parede lateral da praça parece material vertical,
e os degraus inferiores x575–690, y575–670 se separam melhor da sombra.

**Persiste:** o mesmo grande retângulo de tijolo sobre reboco é replicado entre
fachadas ao longo de x0–1450, y335–675. As casas detalhadas continuam parecendo
inserções atrás desse conjunto. A escada ainda não comunica sua chegada do
ângulo fornecido. A relação visual entre os dois níveis está clara, porém não
prova que o térreo tenha cobertura suficiente ou escolhas úteis.

**Reparo mínimo:** unificar painel e casa de duas unidades dominantes antes de
acrescentar novos props; diferenciar essas unidades com acabamento coerente e
fazer a borda do acesso conduzir até sua saída.

### `praca-da-laje-oeste.png` — REPROVADO

**Resolvido/parcial:** a mancha branca no coroamento direito desapareceu; os
remates acompanham a arquitetura. Batentes claros tornam portas mais definidas
(x530–755, y505–605). O material da parede junto ao gol melhorou.

**Persiste:** a repetição de portas escuras com o mesmo batente e dos grandes
planos branco/tijolo continua dominante. O vão central x755–815, y430–600 pouco
se distingue dos demais recortes escuros e não informa bem a continuidade da rota.

**Reparo mínimo:** individualizar o acabamento de casas adjacentes e dar ao vão
de circulação continuidade inequívoca de piso/batente. Batentes em todas as
portas melhoram a definição, mas não resolvem por si a repetição serial.

### `descida-norte.png` — APROVADO no recorte visível da descida

**Resolvido:** as faixas brancas largas do primeiro plano e da borda oposta
desapareceram. No primeiro plano esquerdo/inferior agora se distinguem degraus,
parede lateral e superfície de chegada (x415–940, y790–1024); a leitura local de
descida é substancialmente mais clara. O painel verde tem base e coroamento.

**Limite:** um personagem ocupa boa parte da direita (aproximadamente x1130–1536),
portanto essa região não pode ser comparada honestamente. A imagem mostra o
começo da descida, não seu percurso completo até o térreo e retorno. A aprovação
é da resolução dos defeitos visuais locais verificáveis; não aprova o circuito,
colisão, segurança da queda, contraste nem o conjunto arquitetônico do mapa.

**Próxima evidência mínima:** repetir essa câmera sem oclusão transitória à
direita e registrar o percurso; não propor nova mudança geométrica com base
apenas na área que a captura escondeu.

### `beco-varal.png` — REPROVADO

**Resolvido/parcial:** faces dos degraus ficaram mais distinguíveis
(x560–775, y580–732), e portas ganharam batentes visíveis. A escada perdeu parte
da mancha marrom indistinta observada na V2.

**Persiste:** o topo continua atrás da parede alta. O grande painel à esquerda
(x195–568, y65–740) permanece quase inalterado em composição e domina a vista.
Nenhum varal é legível como marco nesta aproximação; o beco continua um vão
estreito x815–900, y465–680. A copa ainda oculta a fachada direita.

**Reparo mínimo:** melhorar a indicação de continuidade da escada e do beco;
individualizar o painel como parte da casa, em vez de apenas aplicar batentes
iguais; orientar um detalhe doméstico existente para essa aproximação se for
necessário identificar o varal. Não cruzar a passagem com roupas.

### `laje-oeste.png` — REPROVADO

**Resolvido:** a faixa branca larga foi substituída por uma linha estreita que
acompanha a borda. O piso e os parapeitos agora têm aparência mais compatível com
concreto, e o limite entre piso e parede é mais claro. As manchas brancas
alongadas no fundo desapareceram.

**Persiste:** o grande primeiro plano x0–985, y540–1024 continua vazio e sem
função doméstica perceptível; é uma plataforma com paredes. A longa parede de
tijolo repetido domina x575–1536, y425–855. O material novo não resolve essa
ausência de uso habitado.

**Reparo mínimo:** compor uma única função doméstica junto à parede, com poucos
objetos coerentes e espaço de uso, preservando a passagem e as linhas de visão.
Não polvilhar detalhes sobre o piso inteiro nem modificar coberturas necessárias
sem validação de circulação.

## Fechamento dos critérios

| Critério | Parecer V3 |
|---|---|
| Praça reconhecível como espaço comum | **APROVADO visualmente** nos quatro enquadramentos da praça; centro não foi preenchido por decoração. |
| Diferenciação cromática dos spawns | **APROVADO**; verde-azulado no norte, terracota no sul, com remates. A integração doméstica dos painéis segue reprovada. |
| Faixas brancas largas sem contexto | **APROVADO quanto à correção visível**; deixaram de atravessar pisos/coroamentos nas vistas relevantes. Risquinhos junto à base dos spawns são outro problema ainda visível. |
| Identidade de comunidade brasileira habitada | **REPROVADO no conjunto**; caixas, varais e casario sustentam associação brasileira, mas as fachadas próximas repetem placas e a laje-oeste continua sem uso doméstico perceptível. |
| Repetição/vazio | **REPROVADO**; materiais melhoraram, composição principal persiste. |
| Clareza vertical | **REPROVADO no conjunto das aproximações**; degraus mais claros e descida local aprovada, mas destinos nas vistas da praça/beco seguem incompletos. |
| Vetos visuais no mapa | **APROVADO no recorte visto**; não identifiquei pessoa real contemporânea, gore ou obra/marca reconhecível no cenário. Não substitui procedência/licença. |

**Sem parecer técnico por pixels:** nenhuma dessas PNG comprova três rotas,
retorno, mantle, colisão, spawns sem visão direta, distribuição de cobertura ou
performance. Cabos ocupam majoritariamente o céu; copas ocultam partes de
fachadas. Os fundos das escadas estão mais claros, mas não houve sequência com
inimigo contra alvenaria e sombra para aprovar contraste. Personagens expostos
contra o céu e superfícies claras não bastam para isso.

O próximo trabalho visual deve se concentrar na arquitetura repetida de poucas
fachadas dominantes, na função da laje-oeste e na continuidade legível dos acessos.
Não há razão visual para desfazer as correções de materiais ou recolocar as faixas
largas. A entrega continua pendente de aprovação visual e de evidência técnica
fora do escopo desta crítica.
