# Biblioteca de capturas

Os botões vermelhos no HUD e no cabeçalho da home/loja gravam **somente após o jogador clicar e escolher a aba do CORO SOLTO no navegador**. A opção de áudio da aba deve estar ligada no seletor do navegador. Cada take tem até dois minutos; o original é baixado no dispositivo. O painel de gravação some após quatro segundos para não cobrir o combate; clique novamente no ponto vermelho do HUD ou da home para encerrar. O navegador pode não oferecer captura de aba em todos os sistemas.

O envio à biblioteca privada é uma ação separada: conferir a prévia, entrar na conta, marcar autorização e clicar em **ENVIAR TAKE PARA REVISÃO**. Nenhum vídeo é publicado automaticamente. A rota `/api/gameplay-upload` aceita até três pedidos de upload por perfil em 24 horas e só emite URL assinada para o bucket privado `gameplay-submissions`. O limite de 300 MB deve estar no próprio bucket, pois o navegador envia direto ao Storage. Não habilitar bucket público.

Provisionamento com credenciais já configuradas **fora do Git**:

```sh
node tools/film/library-storage.mjs setup
```

Sincronização para a biblioteca local:

```sh
node tools/film/library-storage.mjs sync
```

Originais autorizados recebidos por outros meios entram com:

```sh
node tools/film/library-import.mjs --source /caminho/video.mov --rights self --kind gameplay --opponents players --map loja_h --creator nome
node tools/film/library-review.mjs
```

O índice fica em `launch-media/2026-10-24-growth-pipeline/capture-library/index.jsonl`, fora do Git. `index.html` abre miniaturas e originais para revisão. O campo `review` começa em `pending`; resolução, FPS e áudio medidos não significam que o lance está aprovado. Antes de cortar e postar, verificar ação legível, personagem, mapa, trilha/voz, direitos, enquadramento e fluidez real do vídeo.

O teste automatizado do gravador usa uma aba sintética com `MediaRecorder`. Ainda faltam um teste manual do seletor de aba com áudio em uma partida real e um upload autenticado para o bucket privado. Captura remota invisível de tela não é oferecida pela API do navegador: cada jogador precisa escolher compartilhar a própria aba a cada gravação. Para sessões longas, usar OBS/gravador do criador e importar o arquivo autorizado.
