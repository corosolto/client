# Arte urbana por lugar

O pedido de 31/10 é manter os mapas limpos e permitir grafites e cartazes sem repetir a mesma arte. A seleção atribui cada arquivo a um único mapa, por contexto e composição. Campo do Morro conserva o mural do baile; Córrego conserva seu pixo; Lajes conserva sua homenagem. Artes de treino, alfabetos e excedentes ficam no acervo, sem colocação automática. Arquivos não são apagados.

`graffiti_ownership.js` declara a curadoria dos 14 mapas. A restrição atua antes de criar a geometria, acordar getters de cartazes ou registrar peças no lote e no layout exportado. Ela cobre arte manual, layout assado, pintura viva e murais. As APIs geométricas sem id continuam disponíveis para provas e outras cenas. A identidade inclui URLs absolutas, query, nomes codificados e o alias editorial tag-larga/tag-fina. As duas artes locais em img/textures também conservam sua identidade.

Arte local carregada de forma assíncrona declara seu arquivo no mesh antes do onLoad; a medição continua lendo a imagem efetivamente desenhada. Cartazes manuais passam pela mesma curadoria. Ao conferir sua parede, somente o cartaz avaliado é ignorado: outro cartaz, vidro ou obstáculo à frente continua invalidando o suporte.

A geometria de suporte e as zonas permitidas continuam obrigatórias: no Ferro Velho, somente a casa de respawn B; na Piscina, somente paredes brancas, inclusive cartazes. Alterar a curadoria invalida a impressão da passada e exige reassar os 14 mapas em cena real. A contagem não é uma meta de densidade: parede vazia é uma escolha de composição, e não se recicla arte para preencher vagas.

O aceite global lê `raw.nominal.pieces` da extração da geometria desenhada. Não consulta o catálogo de donos para dizer que a seleção foi cumprida. Exige cobertura exata dos 14 mapas, identidade conhecida, UV legível, suporte e zona válidos, nenhuma duplicação local ou entre mapas, nenhuma divergência de metadados e nenhum erro de runtime. Mapas vazios e resumos sem geometria reprovam. A agregação ocorre em toda execução completa do adaptador CI, com ou sem JSON e antes dos mutantes; execução de um mapa não declara aceite global.

As provas sintéticas exercitam as APIs reais e as fronteiras do avaliador. Elas não substituem as medições browser, as capturas 3:2, a crítica visual independente nem a avaliação humana/mobile. A curadoria continua candidata até essas evidências existirem. O objetivo maior inclui acabamento de superfícies, silhueta arquitetônica, personagens, mãos, armas, ADS e leitura das skins.
