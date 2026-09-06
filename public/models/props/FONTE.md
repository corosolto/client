# Props de cenário

## Sertão — lote existente, registro documental de 05/09/2026

Procedência dos GLBs existentes: [mint-assets.json](../../../mint-assets.json), entradas listadas abaixo. O registro declara geração Mint text-to-3D a partir de prompt próprio do projeto, sem referência de terceiro; o texto integral do prompt não está arquivado no manifesto. `source.notes` registra o propósito e o pipeline, `source.chatUrl`/`source.assetId` identificam a geração, e `processing.finalSha256` identifica o arquivo final. Não reconstruir o prompt de memória.

**Atualização contratual de 06/09/2026:** os [termos oficiais Mint](https://docs.mint.gg/terms-of-service), atualizados em07/05/2026, foram consultados. A seção4 atribui ao usuário os direitos que Mint tiver no output criado para ele, sujeitos aos termos e direitos de terceiros; não há licença individual separada por GLB nem obrigação específica de atribuição. A procedência destes arquivos permanece a declaração histórica de geração própria no manifesto, com chats/IDs/hashes; não foram reconstituídos os prompts integrais nem reconfirmada a conta dos chats antigos. Não declarar CC0, autoria humana ou exclusividade. Essa consulta substitui a antiga pendência de localizar a fonte contratual.

Hashes abaixo são snapshot extraído do manifesto e conferido contra os arquivos em 05/09/2026. O manifesto permanece a fonte canônica; método de reprodução e inventário técnico em [SERTAO-REFERENCIAS.md](../../../docs/reports/SERTAO-REFERENCIAS.md).

| Arquivo / registro | Chat de geração / assetId | SHA-256 final conferido |
|---|---|---|
| [`sertao_macambira.glb`](sertao_macambira.glb) / `sertao-macambira` | [chat](https://mint.gg/chat/ph77kaaqh5ecv3mwaw421gabgx8d52yk) / `ks7e9pqet1sbvcwayfddb0x0318d5mw8` | `9522205f3b3f2e2a997f53f828a58b2ae4a8fc6202b71f27c47f0d1d4ca6486e` |
| [`sertao_juazeiro.glb`](sertao_juazeiro.glb) / `sertao-juazeiro` | [chat](https://mint.gg/chat/ph72w8yaxsgj6y271nvqjaxr2d8d4rr2) / `ks759j8fhf1yezybjze0qf8vg98d54bf` | `70579e4e2d8e85ffb07a0adfed0e496d99649321eadaccd6dbc033f2a441dbc9` |
| [`sertao_xique_xique.glb`](sertao_xique_xique.glb) / `sertao-xique-xique` | [chat](https://mint.gg/chat/ph7djxxjydj383me4g5t43r3ps8d5sgc) / `ks73za0ws181wynvwqsn3dap4s8d5nmv` | `1881c4c579f8fb5e93256ecbb33626ed8dc6f1643c6e8e8feb842566646e29b0` |
| [`sertao_poco_roda.glb`](sertao_poco_roda.glb) / `sertao-poco-roda` | [chat](https://mint.gg/chat/ph78jzf7pmyqqwffg89w8s664h8d41cs) / `ks74qcvmcfs2ta4ceajggjhq798d542a` | `28b3427934987e7cfeddb990decd38f9f5455f2c412bd9621ccdcc79a69ac449` |
| [`sertao_capelinha.glb`](sertao_capelinha.glb) / `sertao-capelinha` | [chat](https://mint.gg/chat/ph7e200kx20sn17p6cfmn2sc958d4c8h) / `ks735ddr0k5a30npwhwb8td67h8d5bwh` | `ee11deecc0da61f3e6559b2be67d5d02c43f700d63ad19b68228f22cdcadb07b` |
| [`igrejinha.glb`](igrejinha.glb) / `igrejinha-sertao` | [chat](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) / `ks7d2mgq7myde6mrjmtha7t1yx8d70bw` | `6e26688b5fa406f8b336fada2d263d6dbc90536b67e50c774d4a4f0857722fe5` |
| [`caminhao_antigo.glb`](caminhao_antigo.glb) / `caminhao-antigo` | [chat](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) / `ks7fc2f1c7kyeqyrydgf6p33hd8d7rdx` | `e01ea2fe9ddf50f29ad2ddafae110ec28a2a2ddfc580231ddd82bda11d663b6d` |
| [`casa_pedra.glb`](casa_pedra.glb) / `casa-pedra` | [chat](https://mint.gg/chat/ph7ck5kbnh4syt5gsbnan3m4ah8d6qsy) / `ks7e1dx5vzctmbe1qesp5fmhad8d63eg` | `b1ad7443257c9e608050dd40057937a5554d3e19c5b5776eb3f04142d913a578` |
| [`casa_geminada.glb`](casa_geminada.glb) / `casa-geminada` | [chat](https://mint.gg/chat/ph7ck5kbnh4syt5gsbnan3m4ah8d6qsy) / `ks72vcqrhyehnsm5mky7ppe5198d7pp6` | `bc7a2b9149b4139e9f446b9c5ce44807a64b4a304f28da68808542752e3f4673` |

As fotografias de Maranguape e da capela da Fazenda Colônia foram apenas referências de observação do agente principal no Chrome; não foram incorporadas aos GLBs nem copiadas como textura nesta revisão. Créditos, observações atribuídas e limites em [SERTAO-REFERENCIAS.md](../../../docs/reports/SERTAO-REFERENCIAS.md).

## Sertão — geometria procedural desta revisão

Registro: [sertao-procedural.json](sertao-procedural.json). Casario sólido, acabamentos, folhas, mandacarus e entorno são construídos em JavaScript/Three.js pelos módulos ali enumerados. Contribuição assistida por agentes, identificada nos commits desta frente e trailers `Agent:`; não se presume autor humano individual, ID Mint nem geração externa. O código acompanha o [LICENSE](../../../LICENSE) do repositório. Este registro não atribui uma licença nova aos GLBs ou às texturas herdadas.

Referências visuais são documentais, não incorporadas como imagens ou texturas. Ver [pesquisa](../../../docs/reports/SERTAO-REFERENCIAS.md) e [flora](../../../docs/reports/SERTAO-FLORA.md). Os GLBs antigos de mandacaru, palhoça, pau-a-pique e platibanda saíram do preload deste mapa porque os corpos agora são autorais; os arquivos do acervo foram preservados. Licença/autoria específica dos GLBs retidos e procedência incompleta de texturas legadas continuam pendências, não foram regularizadas por esta alteração.

## Sertão — aves distantes e horizonte, revisão06/09/2026

`map_sertao_distant_birds.js`: geometria autoral assistida por agente, quatro
aves distantes (uma em low), sem textura ou asset externo. Referências naturais
e decisões em docs/reports/SERTAO-AVES-DISTANTES.md; autoria rastreada pelo
trailer Agent dos commits, sem atribuição humana inventada.

`map_sertao_horizon.js`: composição de Caatinga fora da arena. O juazeiro
`sertao_juazeiro.glb` já existente conserva sua origem e lacunas documentadas;
a composição não lhe atribui licença nova. Módulo e evidências registrados em
sertao-procedural.json e docs/reports/SERTAO-HORIZONTE.md. Nenhum modelo novo
downloadado para esta camada. Aves e vegetação não integram colisores/oclusores.
