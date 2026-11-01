# Leitura da luva em primeira pessoa

Parte da missão de consistência de mapas, personagens, skins, movimento, PRs e
release; UI/redes sociais depois e #1158 excluído. Root mantém a escrita sequencial
de arma/mão/animação/ADS/HUD e o navegador. Base `7d98ac9cdbb6ea293e006696601220d3c02b8d17`,
branch `codex/fp-glove-readability-r359-20261101`, após a correção das partes TP.
O estado integral fica na auditoria externa `2026-10-31-visual-consistency`.

R362 é um piloto externo, sem alteração do produto. Usou o leitor, campos UV e
pintor reais, com o GLB privado de pistola fixado por hash. Reproduziu os seis
atlases E publicados byte a byte. O candidato suprime somente estrelas repetidas
na cor da luva do layout `pistol`; mantém o emblema principal, paleta, manga,
pele, alturas, UV, rig e geometria. Apenas `glove-E.webp` difere; os outros
arquivos são byteexatos. O layout também serve outras armas: não é uma correção
exclusiva da pistola. Recibo e candidato: `FP-ATLAS-PILOT-R362.json` e diretório
homônimo na auditoria externa.

R360 recusou a preparação oficial por divergência do GLB mosin antes de montar
assets privados. R361 falhou ao resolver Sharp por caminho presumido; R362 usou
`createRequire` do pacote instalado. Falhas preservadas, sem crédito de validação.
Não se declara o catálogo privado validado nem se contorna o preflight oficial.

R373 comparou o mesmo Game iniciado pela UI de convidado, Esquerdomacho, pistola,
Piscina, com pausa normal, viewport 3:2, mesma pose/luz/tempo e normalMap nulo.
Após um warmup, três imagens A são byteexatas; B difere somente na região da luva,
e A restaurada é byteexata. Referências e overlays restaurados no finally, sem
avanço/escrita de mixer ou relógio. Root olhou os dois frames. Crítico independente
R375 aprovou B somente para limpeza/legibilidade; realismo, identidade, dedos e
pega não foram aprovados. R369 recusou dimensões presumidas; R371 recusou uma
primeira captura não neutra antes de renderizar B. Ambas preservadas sem promoção.
R383 saiu pela confirmação normal e restaurou exatamente as preferências de R363;
página em branco, emulação limpa e nenhum handle próprio restante.

R380 exercitou os campos UV reais dos rigs publicados, todos os estilos no papel
de luva pistol e E nos demais papéis/layouts. Só o albedo alvo mudou; alturas e
chamadas sem argumento layout preservaram os bytes legados. A classificação de
lado no UV compartilhado não prova as duas mãos separadamente.

A régua existente passou a medir o centro da face 2333 do material de luva K,
GLB de fonte fixado em R362. UV glTF médio (0.0965447823, 0.0676100651), convertido
para a convenção vertical dos landmarks, amostra o pixel (49,34). O peso distal
interpolado é 0.9753. O atlas antigo dá RGB (252,210,190), próximo ao acento; o
candidato dá (137,38,49), próximo à paleta da luva. A régua exige a cor da luva
mais próxima que o acento nesse ponto, usando a distância já existente, sem teto
novo. R382 ficou RED somente nesse ponto antes da alteração; R384 passou.

R385 executou o gerador real focal, com a fonte privada do rig ligada em processo
ao caminho e hash de R362. Os arquivos foram copiados/restaurados no finally;
nenhuma montagem nem aprovação do catálogo privado. Nominal reproduz os seis
arquivos esperados. Numa cópia temporária real do gerador, retirar o argumento
layout repinta o atlas antigo e a régua fica RED no mesmo landmark. Restauração
volta a GREEN. Isso verifica o caller, além da função de pintura isolada.

O patch adota somente o albedo validado, informa layout no gerador e muda somente
o query de cache desse albedo. HAND_ATLAS_VERSION e todos os mapas de altura
mantêm a versão anterior. R387 passou em sintaxe e sete de oito focais. O alias
assetrev passou no nominal e nos dois primeiros mutantes, mas o mutante
manifesto-cru não encontrou sua âncora após o fetch ganhar opções de abort.
R396 conferiu checker, consumidor e helper byteexatos à base 7d98; é uma dívida
herdada, mantida separada, e o alias inteiro não recebe crédito de GREEN.
R401 passou no build normal, sem alterar nenhum arquivo fora dos seis previstos.
R402 confirmou os dois controles antigos do atlas: punho descoberto e dedos
cobertos continuam RED, com 136 e 25 cláusulas vermelhas, respectivamente.

R403 reuniu somente os 63 arquivos exatos do manifesto de runtime, de cópias
locais existentes: 61 da árvore integrada e dois da árvore original. A ferramenta
oficial fetch-viewmodels instalou e conferiu 63/63 por SHA-256; a preparação
oficial com assert-clean aprovou o diretório regular, sem symlink. Isso valida o
pack de runtime desta worktree, sem mudar fontes privadas ou manifesto e sem
aprovar o catálogo de fontes que falhou em R360. O pack não integra o diff Git.

R408 iniciou pela UI normal da própria worktree: convidado, personagem E,
Piscina, pistola autorada, 1x1, vivo e pausado pelo botão de configurações.
Sete módulos HTTP conferem com disco. Os seis mapas dos três materiais estão
carregados; cada imagem decodificada em uso coincide com o corpo HTTP e seus
bytes coincidem com o arquivo esperado. Somente a cor da luva usa team-hands-11;
os cinco demais usam team-hands-10. A captura tem viewport CSS 1320x880, com
buffer adaptativo real 660x440 e pós-processamento existente preservado.
O bloco de desenho do Game foi chamado sem update, escrita de tempo/mixer/pose
ou troca de material; guardas de estado e ossos ficaram iguais. Apenas overlays
foram ocultados temporariamente e restaurados. Root olhou o PNG: limpeza focal
confirmada, mas dedos grosseiros e contato com a pistola continuam dívida.
Esta imagem não substitui o par causal estático R373 nem aprova arte completa.
R407 recusou a hipótese incorreta de buffer nativo 1320x880 e fica inconclusivo.
R409 saiu pela confirmação normal e restaurou exatamente as seis preferências
salvas antes do carregamento em R400; sem Game ou slot próprio, página em branco
e emulação limpa. Próximo passo: revisão inteira GLM e crítico independente dos
seis arquivos congelados, checkpoint e PR normal empilhado sobre #1198.

PR #1194 entrou por merge normal em staging. #1197 foi retargetado para staging;
#1198 contém a correção das partes TP, empilhado sobre #1197 após push normal.
Main/release134 e staging são estados
separados. CI atual, merges normais, release e convergência do backend continuam
pendentes de evidência. Dedos, pega, animação, MP e mobile físico não estão aprovados.
