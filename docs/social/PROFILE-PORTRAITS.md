# Personagens do cartão público

O cartão OG usa a arte vertical disponível do personagem realmente jogado,
quando o perfil público autoriza compartilhar essa informação. A versão de cada
personagem é vinculada ao ID do catálogo do jogo, sem sorteio ou substituição de identidade.

## Acervo reutilizado

Os 63 IDs atuais de `public/js/characters.js` possuem uma versão vertical em
`public/img/resultado/<id>-vitoria.webp`: 1024×1536, com transparência. A pose é
uma fonte de ilustração; não declara vitória, conquista ou resultado de partida.
Estatísticas e último personagem continuam vindo da projeção verificada do backend.

O acervo é misto. O commit `cf13fe604` identifica as dez artes de políticos como
renders dos GLBs e registra arte pintada pendente de saldo. A mídia dos míticos
também acompanha seus modelos no histórico. Sindicato e Punk mostram acabamento
flat na inspeção; o registro do lote não prova o provedor individual dessas artes.
`tools/gen-pose.mjs` documenta um pipeline de poses via OpenRouter, mas sua existência
não prova que todos os arquivos passaram por ele. Não chamar os63 arquivos de
OpenRouter, nem declarar acabamento equivalente ao Canarinho para todo o elenco.
Os arquivos já estavam versionados; modelo/data/recibo não são presumidos.
Os hashes atuais estão no
inventário local `artifacts/social/og-stylized/sources.json`, produzido na validação.

Os sprites GLB de 192px de outra lane e as artes promocionais geradas por imagegen
não são essas fontes. Os retratos pequenos de `chars`, `chars-hero` e os frames de
vídeo de `social-chars` permanecem disponíveis para seus usos anteriores.

## Composição e operação

- O build remove somente a margem transparente (trim com threshold1), preserva
  proporção e alpha e prepara PNG de altura630 para o renderer Resvg existente.
- No cartão1200×630, a imagem usa a coluna direita550×614, entre as duas faixas
  decorativas8px. O corpo inteiro cabe sem esticar nem cortar cabeça, mãos ou pés.
- As seis estatísticas ficam em duas colunas à esquerda; não há janela em torno
  do personagem. O nickname longo reduz a fonte; glifos extremos ainda podem
  exceder a largura nominal, conforme a revisão independente.
- Assets são embutidos no servidor no build. Nenhuma imagem de usuário ou URL
  remota é buscada, e a rota continua no-store, anônima e limitada a perfil público.
- Um novo ID no roster precisa do arquivo vertical correspondente. A ausência
  interrompe o build com o ID afetado em vez de publicar substituto silencioso.

Não é necessário aplicar migration ou configurar provedor de imagem em produção
para esta composição. O rollout social/API e as dependências gerais de release
continuam descritos em [OPERACAO.md](OPERACAO.md).

## Reprodução

`npm run eval:social-profile` verifica fontes, pixels, fonte de texto, XML,
privacidade e dimensões. `npm run eval:social-profile -- --gallery` também salva
os63 cartões completos e três galerias em `artifacts/social/og-stylized`.

O SVG produzido deve usar o quadro550×614 e preservar proporção nos63 IDs.
A prova de pixels de altura usa Canarinho; quatro fontes terminam em y619 sem
corte visual observado. Não declarar os63 rasterizados até y621.

Mutantes: `--mutant=square-source`, `--mutant=small-portrait`, `--mutant=other-character-small`,
`--mutant=no-portrait`, `--mutant=no-font`, `--mutant=unsafe-source`.
Galerias usam fixture declarada e não representam partidas reais.

## Versões com acabamento uniforme

`node tools/prepare-profile-art.mjs` prepara uma referência e um pedido por ID,
com o Canarinho como referência de acabamento e a arte do próprio personagem como
referência de identidade. Salva hashes, prompts e argumentos de `tools/gen-image.mjs`
em `artifacts/social/og-stylized/generation-plan.json`, sem API ou credenciais.
São62 candidatos e uma referência de estilo; não representam artes já geradas.
Os jobs fixam explicitamente o modelo futuro `google/gemini-3-pro-image`, sem
atribuir esse modelo às fontes antigas. `--raw-only` grava em `/tmp/gen-image`,
ignorando `--out`: após cada geração, copiar o master para o `archiveDirectory`
registrado no plano, guardar hash/modelo/recibo sanitizado no volume do projeto
e somente então revisar. O plano informa `rawOutput` e não executa essa cópia.
Os19 políticos/míticos e os casos flat/incertos precisam de atenção prioritária.

Em11/10, consulta autenticada de créditos retornou saldo inferior a US$1; uma
tentativa pelo gerador existente para Barbudo retornou HTTP402, mínimoUS$1 para
imagens. Evidências locais `og-openrouter-availability.json` e
`og-openrouter-generation-attempt.log`. Nenhuma imagem nova ou recarga foi feita.
Após saldo disponível: gerar cada candidato, preservar o master no volume do
projeto, conferir alpha/identidade/corpo inteiro, revisão independente e só então
integrar a versão aprovada. Não promover o lote automaticamente nem substituir
as fontes atuais por arquivos sem revisão.
