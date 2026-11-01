# Arma e luva no corpo TP

R276 reproduziu no Game real o bot de pistola/MP5 trocando de lado com modelo AWP;
R280 reproduziu o nascimento do corpo GLB antes da luva. A correção encaminha os
campos existentes ao builder e inclui o preload próprio na barreira existente.
R522 também reproduziu a perda após troca de personagem com pacote pendente ou
nunca solicitado. O corpo próprio agora registra a seleção/prontidão tentadas,
pede a família quando o GLB base está disponível e compartilha pedidos em voo.
Ao mudar somente a luva, substitui suas partes no corpo existente: conserva
controlador, mixer, pose e arma. Não muda rig, geometria ou cosméticos de outros atores.

`npm run eval:tp-identity` mede objetos reais com GLTFLoader e os GLBs publicados.
Texturas são substituídas por DataTexture CPU1×1. Não é uma régua de raster,
persistência, compra/equipagem da loja, multiplayer ou aceite artístico.
A seleção atual do Game governa o corpo, inclusive mudança de estilo e retirada.
Isso não acrescenta um fluxo de equipagem na UI.

Cada fixture roda em processo fresco. W mede arma solicitada, porte de uma/duas
mãos, ownership, cena, cache e ausência de rebuild numa única sincronização.
O mede todas as geometrias publicadas da luva, uma vez cada, com estilo e vínculo
aos ossos do corpo por identidade; cache estável;
nenhuma luva sem seleção mesmo com pacote quente; bot Barbudo compatível distinto
sem herdar luva, no swap e rebuild. O controle incompatível clona somente o esqueleto da segunda parte, deixando a
primeira válida. O pacote inteiro deve ser recusado, preservando o corpo GLB.
Tentativa incompatível pronta não pode provocar reconstrução por frame.
R307 mediu os dois primitivos Barbudo publicados (384/379 triângulos); identidade
de geometria impede que duplicar a mão esquerda finja cobertura da direita.

C executa o recorte real de preload e nascimento de main, usando o construtor
real e aguardarPreloads. Um latch segura a conclusão do parse da luva antes do
cache. As outras cargas terminam antes da observação; tempo não é prova da
barreira. O primeiro corpo é registrado no nascimento, antes de liberar o latch.
Outra carga rejeitada não pode antecipar esse nascimento. Sem seleção e navOnly
não pedem luva; navOnly não é prova de corpo GLB carregado.

S usa o pacote real do Capitão: segura sua conclusão, mantém Games distintos
para A→B, A→B→A, arma trocada, seleção alterada, saída e morte/retorno. Depois
de liberar, exige as duas geometrias da mesma instância publicada, estilo,
parent e ossos do corpo; chamadas repetidas devem conservar identidade. O
cadáver já em queda só recebe o novo pacote após o retorno. S10 a S13 ativam
emote, recarga, disparo e reação a dano reais antes de liberar a carga; exigem
que seus estados e tempos continuem iguais após anexar a luva. S14 troca o
estilo com a máscara TP já ativa: conserva corpo e máscara, substitui o registro
de selfMeshes e descarta os materiais antigos sem descartar geometria compartilhada.
Esse caso mede a máscara como componente, não o boom físico nem recursos da GPU.
N começa sem pedido
externo: sem seleção válida não carrega, demanda própria pede e monta depois.
T controla manifesto sem variante e falha do GLB; respostas terminais não geram
novo I/O ou reconstrução. Não usa tempo decorrido como prova de prontidão.

O carregador conserva cache negativo e deduplica por família. Game limita pedidos
por família e não recebe callback de conclusão: o próximo ensure lê o estado
atual. Completude do pacote é medida por geometria e bones, não pelo número do
cache ou pelo snapshot de tentativa. Corpo vindo somente de cosmético aprovado,
sem GLB base no cache, ainda exige prova própria de demanda e compatibilidade;
esta régua não cobre esse caso. A→B→A e quit não podem aplicar seleção
capturada; bots/remotos não recebem a luva própria. A prova CPU não mede cadência
real de MP, GPU, materiais/pixels ou custo por frame.

| Mutante na fonte real | Cláusulas vermelhas exigidas |
|---|---|
| swap-weapon: remove a arma do bot no swap | W1, W2, W3 |
| own-glove: remove a seleção no builder e na atualização própria | O1, C4, S1, S3, S4, S5, S7, S10, S11, S12, S13, S14, N2 |
| glove-preload: remove a entrada na barreira | C1, C2, C3, C4, C6 |
| boot-await: remove o await da barreira | C2, C3, C4, C6 |
| glove-first-part: conserva só a primeira parte no cache | O1, O4, C4, S1, S3, S4, S5, S7, S10, S11, S12, S13, S14, N2 |
| glove-partial-bind: anexa partes válidas de pacote incompatível | O4 |
| glove-ready-upgrade: ignora seleção/prontidão no retorno | S1, S4, S5, S7, S10, S11, S12, S13, S14, N2 |
| glove-lazy-load: remove pedido próprio | N1, N2, T2 |
| glove-request-join: remove join de pedido pendente | S8 |
| glove-selection: ignora identidade do estilo | S5, S14 |
| glove-corpse: remonta luva durante queda iniciada | S7 |
| glove-rebuild: reconstrói o corpo em vez de trocar suas luvas | S10, S11, S12, S13, S14 |
| glove-visibility: deixa luvas novas visíveis com máscara ativa | S14 |
| glove-material-leak: conserva materiais próprios removidos | S14 |

Nominal verde vem antes de cada mutante. A cópia mutada vive em diretório único
gitignored, removido no finally; produto no disco não é alterado. Falha de âncora,
asset, processo, recibo ou fonte divergente é infra3, sem crédito de detecção.
glove-first-part, glove-partial-bind, glove-request-join e glove-material-leak
usam glbchars real em cópia única: preload e Game importam o mesmo URL/cache
mutado. Game, main e glbchars são vinculados antes e depois.
O pai exige versão, fixture, mutante, hashes, IDs únicos na ordem, booleanos e
coerência entre exit e cláusulas. RED de filho não pode sumir no agregador.
Ambiente herdado de worker sem marcador interno explícito é recusado; opções
públicas não podem virar execução parcial de fixture. CLI inválida sai2; falha semântica sai1; nominal verde/mutante detectado sai0.
`--json=/caminho/absoluto` conserva o recibo completo; stdout traz só o resumo.

Ego é a aceitação separada de imagem/interação, registrada no handoff da frente.
O resultado CPU não aprova dedos, acabamento do personagem, animação ou mapa.
