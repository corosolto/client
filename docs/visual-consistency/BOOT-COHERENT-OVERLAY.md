# Boot: grafo coerente e bytes reais de rede

O checker mede o jogo real com HTML e assets públicos de `--base`, servido por uma origem HTTP efêmera em `127.0.0.1`. Não serve uma página de fixture. O HTML e seu import map mantêm os mesmos corpos; a opção pública `api` aponta para esse proxy. Todos os módulos de `public/js` vêm de um único snapshot bruto do checkout. Nominal, referência e mutantes derivam dos mesmos bytes; mudança, inclusão ou remoção de módulo durante a rodada causa INFRA3. Um módulo local ausente nunca recorre ao JS publicado.

O transporte usa HTTP real, sem `route.fulfill`. JS local é entregue com gzip, Content-Encoding e Content-Length reais. O proxy preserva o wire gzip/br dos binários upstream e compara o corpo decodificado; texto pode ser recomprimido por gzip sem mudar seu conteúdo. Redirects não são seguidos. O registro de cada resposta existe antes da escrita e contém ID único, path+query, status, tamanho efetivamente servido e SHA256 do corpo decodificado. A chave mantém query; requests repetidos são separados por Request/ID.

Cada corpo da janela deve ser recebido integralmente pelo Chromium e coincidir com seu registro por tamanho e SHA256. Módulos também são comparados ao texto local. Um observador `Response.clone().arrayBuffer()` consome uma cópia de cada fetch medido, mantendo o Response original entregue ao consumidor; não substitui corpos nem transforma failed em sucesso. Corpo ausente, truncado, divergente ou pendente, timeout, HTTP>=400 e pageerror impedem veredito. Quando Playwright não expõe a resposta (favicon observado), a leitura usa `Network.getResponseBody` do mesmo requestId CDP, nunca uma segunda requisição.

## Janela e custo

O portão é o carimbo imediatamente após a remoção real de `hidden` do botão `splash-enter` em `_splashSetReady`, instrumentado somente na cópia de main.js entregue pelo checker. READY exige causa `assets`; failsafe continua reprovado. Não há fallback para polling: ausência, duplicação, schema inválido, DOM ainda hidden, clock não finito ou timeOrigin de outro documento são INFRA3. O carimbo não declara primeiro paint nem tempo de interação humana.

O instante é `performance.timeOrigin + carimbo.time`. O início de cada request usa `Network.requestWillBeSent.wallTime`; o fim acrescenta o delta monotônico CDP ao mesmo início. Nenhum `Date.now()-t0` é comparado com `performance.now()`. O polling antigo atrasou43,6ms numa contraprova no mesmo RUN e incluiu460.479B concluídos além do corte correto; corrigir a observação preserva o critério semântico original, os tetos e a tolerância.

Depois de aguardar o fim da tolerância histórica de 50ms no relógio do navegador e uma barreira CDP, a régua congela os objetos dos requests que **concluíram até esse limite**. Esse é o contrato original, calibrado por fim de download. Request ainda pendente ou que terminar depois permanece registrado fora da conta; seu corpo não integra a barreira financeira. Não há exceção por endpoint ou tipo de asset. Conclusão tardia cujo timestamp pertença à janela, mas cujo evento só apareça depois do congelamento, causa INFRA3. O fechamento da observação CDP precede o veredito. Cada RUN/PASS recebe identificador e diretório de evidência exclusivos.

Os tetos continuam **8.200.000 bytes e 340 requests**. A procedência histórica é a série fria do origin/main de 28/10: 6,32–7,38MiB e 302–314 requests, conforme comentário anterior do checker. A proposta adicional de cobrar todo request iniciado antes do portão foi rejeitada como mudança do contrato; não se aplica nem se altera o teto para acomodá-la. Este transporte e esta origem de medição não provam tempo de carregamento ou FPS em produção.

Para cada request, cobra-se `max(loadingFinished.encodedDataLength, payload de resposta realmente servido)`, mais o corpo de envio se houver. Os únicos corpos JS historicamente isentos continuam `main.js`, `client-id.js` e `textures.js`; seus requests continuam contados e seus corpos também são verificados. Não há desconto de compressão calculada sobre plaintext. O modelo não mede overhead TLS ou todos os bytes de cabeçalhos de envio.

`Response.encodedDataLength` é provisório; o final de `loadingFinished` deve ser finito e não negativo. Chunks também exigem valores válidos. Redirect/reuso de requestId são INFRA3 porque o checker não separa hops. A referência do protocolo é a [definição oficial do CDP](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/browser_protocol.json).

Somente os dois cancelamentos UI históricos aceitam prefixo: `/favicon.ico` e `/img/treta/coin-classic-saci.webp`, mesmo origin, Other/Image, `canceled:true`, erro exato `net::ERR_ABORTED`, sem bloqueio/CORS. Cobra-se Response+chunks recebidos, sem nova isenção. Todo outro loadingFailed continua INFRA3, inclusive props que tenham sido parcialmente recebidos ou resolvidos pelo loader.

## Escopo público e causalidade

O proxy não encaminha Cookie, Authorization ou credenciais de ambiente. Permite somente GETs públicos exatos necessários ao boot: geo-lang, online, map-plays, configuração providers, estado treta anônimo, ranking global no filtro fixo e avatar com UUID canônico. Outros API/auth e queries adicionais são recusados. A geo é a do servidor do proxy, não a do jogador; idioma e lobby permanecem fixos na medição.

Existe uma exceção de escrita explícita: o heartbeat anônimo normal do boot. Somente `POST /api/treta`, sem query, Content-TypeJSON, até 1KiB, JSON canônico com exatamente `action:'invite-health'` e `version` igual ao VERSION do snapshot. O corpo bruto é encaminhado inalterado com Origin do BASE público, sem sessão, e seus bytes são cobrados. O backend observado chama `admin_track_invite_health` com status heartbeat, versão e SERVER_SHA; a definição SQL não foi localizada nesta auditoria, portanto não se afirma tabela nem ausência de escrita interna. Qualquer outro POST é recusado. Nenhuma resposta é simulada e nenhum heartbeat é isentado.

Analytics permanece desativado e o lobby fixado em Praça dos Poderes. ORC2 exige menos cartazes que a referência com pool ansioso sobre o mesmo snapshot. ORC3 exige primeira fauna depois do último prop. Nominal e referência precisam completar antes de aplicar o mutante; nominal deve cumprir READY/ORC1/ORC2/ORC3 integralmente. O conjunto causal aceito é exatamente ORC3 ou ORC1+ORC3 para fauna, e ORC2 ou ORC1+ORC2 para cartazes. ORC3 é obrigatório no controle de fauna. A extensão foi autorizada com evidência causal R20: mover a mesma preloadAmbientLife antes de propsReady também conclui mais fauna e assets do rebuild antes da entrada (nominal8.053.189B para mutante9.725.831B; props/JS com custos iguais). Isso não muda ORC1 nominal nem aceita falha alheia. ORC1 isolado, ORC2+ORC3, READY+ORC3, infraestrutura, extras e nominalRED continuam recusados. INFRA e READY falso não contam como detecção.

```sh
node tools/eval/boot-overlay.mjs --self-test
node tools/eval/boot-orcamento-check.mjs
node tools/eval/boot-orcamento-check.mjs --mutante=cartaz-ansioso
node tools/eval/boot-orcamento-check.mjs --mutante=fauna-cedo
```

CLI inválida retorna2; infraestrutura3; violação semântica1; nominal aprovado ou mutante capturado exatamente0. As contraprovas HTTP/body/window/snapshot e o runtime real são evidências separadas. Este documento descreve o contrato, sem declarar aprovação estética ou release.
