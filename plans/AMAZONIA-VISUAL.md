<!-- spec:mapa -->
# Treta na Amazônia — revisão visual do mapa existente

## Local real

Comunidade fictícia em margem de canal da Amazônia oriental, referenciada em várzea
marajoara na vazante. Não é reprodução geográfica de uma aldeia nem floresta intocada.
Terra firme não alaga sazonalmente; várzea recebe água branca/sedimentos; igapó associa-se
às águas negras/claras. Não misturar os três como sinônimos. Nesta composição, clareiras
habitadas e madeira elevada convivem com uma borda de floresta inundável em água baixa.
Paleta: folhas verde-oliva, troncos castanhos/cinzentos, lodo marrom e madeira envelhecida.
Manter céu úmido existente; não aumentar neblina para esconder geometria ruim.

## Layout

Preservar travessias z=-24,0,24, passarela alta, estações de palafita, arsenal e objetivos.
Canal raso vadeável: água abaixo das pontes e terreno com malha correspondente à rampa
física. Dossel denso na borda, troncos estreitos e espaço de combate limpo no interior.

## Cobertura (cover)

Troncos caídos, madeira e volumes das casas continuam como cover físico. Folhas não
viram paredes: colisor de tronco só ocupa tronco. Abertura de clareiras não remove armas.
Substituir skyline de cubos demonstrado nas capturas por árvores instanciadas; avaliar
qualquer alteração de cobertura e navegação nos mesmos gates.

## Linhas de visão

Preservar proteção entre spawns e acesso às três bandeiras. Verificar no Game real com
GLBs carregados: raízes que invadem corpo sem colidir são defeito, não cobertura.
Manter valores de inimigos legíveis em fundo limpo; crítica humana/independente decide.

## Referências

Pesquisa com procedência e imagem inspecionada: docs/reports/AMAZONIA-REFERENCIAS.md.
Foto Dayse Ferreira (várzea de Marajó, CC BY-SA4) e estudo Haugaasen/Peres, INPA.
Acervo local primeiro: arvore_mata, palmeira_babacu e palafita_pro, já versionados.
Os nomes dos GLBs não comprovam identidade botânica; não afirmar espécies sem validação.
Sem pessoa real, fauna exótica nova, caricatura indígena ou conteúdo sem licença.

## Régua de aceite

AMV1 ponte acima da água; AMV2 raycast da margem igual ao chão físico; AMV3 ausência
dos cubos altos do baseline, com AMZ6 protegendo floresta; AMV4 seção real de tronco
GLB na altura do corpo dentro do colisor. Cada conserto exige mutante real aplicado.
Rodar eval:amazonia, mapa/água/flora/look/assets/ambience, build/checks relevantes.
Capturas 1536×1024 FOV70 med e low, mesmas câmeras, movimento e soma de passes.
Crítica independente e janela GPU exclusiva; pendências não contam como aprovação.
