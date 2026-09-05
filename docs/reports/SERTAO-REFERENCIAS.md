# Sertão — referências e triagem de acervo

Pesquisa em 05/09/2026, branch `codex/sertao-astra`. Escopo: orientar a revisão visual do PR #445, preservando layout, CTF, spawns, colisores e desempenho. Nenhum modelo ou imagem foi baixado; nenhum runtime foi editado. Esta ficha não aprova o resultado visual do mapa.

## Decisão e limites da evidência

Priorizar o kit local. Há casas de pau a pique, pedra, platibanda e geminadas, igreja, capela, caminhão genérico, poço, flora e répteis registrados em `mint-assets.json`. O problema não exige inicialmente ampliar o acervo. Os arquivos locais abaixo foram lidos como GLB e seus hashes comparados com o manifesto; não foram renderizados nesta subtarefa.

**Correção de identidade prioritária:** `sertao-juazeiro` é descrito no manifesto como árvore seca sem folhas. A [Embrapa — Juazeiro](https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/tematicas/bioma-caatinga/flora/forrageiras/juazeiro) descreve copa verde que pode permanecer mesmo na seca. O esqueleto local pode representar uma árvore morta, mas não deve ser apresentado como a aparência típica do juazeiro. Revisar isso antes de multiplicá-lo.

As buscas deste pesquisador devolveram links e descrições indexadas, sem pixels inspecionáveis; uma abertura falhou por timeout. Depois, o **agente principal (`/root`) abriu fotografias reais no Chrome e comunicou as observações abaixo**. Este pesquisador registra essa inspeção atribuída, sem alegar tê-la executado. Não houve medição de paleta, amostragem de cores ou cópia das fotografias como textura. A inspeção 3:2 do jogo permanece com o agente responsável pelo browser.

### Inspeção de fotografias realizada pelo agente principal

| Referência / procedência | Observado pelo agente principal no Chrome | Aplicação e limites |
|---|---|---|
| [Mud_house.JPG — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mud_house.JPG): Maranguape, Ceará, 13/08/2012; autor Eugenio Hansen, OFS; [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Autor/data/licença confirmados na página do arquivo, não inferidos da imagem. | Volume fechado de barro; trama exposta localizada; cobertura baixa de duas águas com telha cerâmica; arbustos cinza densos nos morros; chão bege pouco saturado e céu azul. | Referência de forma, material e distribuição de vegetação. Maranguape não serve para generalizar toda a Caatinga. Nomes de cor são observações qualitativas, não paleta medida. Fotografia não incorporada ao jogo. |
| [alexdsc_2264-1.jpg — TOK de História](https://tokdehistoria.com.br/wp-content/uploads/2010/12/alexdsc_2264-1.jpg), [contexto da Fazenda Colônia](https://tokdehistoria.com.br/tag/taquaritinga-do-norte/). Crédito indexado: Alex Gomes; licença de reutilização desconhecida. | Capela branca, frontão simples recortado, piso de pedra e degrau; arbustos verdes espaçados em terreno seco; céu azul. | Orienta a leitura da capela e seu entorno. Não autoriza redistribuir a foto nem copiá-la como textura. Não houve medição de cor ou proporção em pixels. |

Essas observações sustentam volume fechado com dano localizado, cobertura cerâmica baixa e vegetação com densidade variável. São referências de direção; o resultado procedural e os GLBs ainda precisam passar pela comparação real do jogo.

## Ficha de direção visual

| Tema | Evidência com procedência | Decisão proposta / validação necessária |
|---|---|---|
| Casas | [Casa e Jardim, depoimento de Marcelo Oséas sobre Vale do Catimbau](https://revistacasaejardim.globo.com/arquitetura/noticia/2025/01/casas-do-brasil-o-olhar-poetico-de-fotografos-sobre-o-morar-brasileiro.ghtml): telhas artesanais, pau a pique com barro do quintal, madeiras da Caatinga. | Priorizar volume térreo simples, telha cerâmica e reboco terroso/caiado com desgaste localizado. Isso é direção proposta; não copiar ornamentos autorais nem fotografia como textura. Corrigir material e escala sem deslocar footprint/colisor. |
| Técnica de parede | [Museu da Cidade de São Paulo — pau a pique](https://www.museudacidade.prefeitura.sp.gov.br/sobre-mcsp/sitio-morrinhos/taipa-de-pilao/) distingue trama de madeira preenchida com barro de taipa de pilão. Fonte construtiva, não amostra do Sertão. | Não chamar todo reboco terroso de adobe nem desenhar tijolos regulares como pau a pique. Trama exposta só em falhas localizadas, se confirmada em referência. |
| Igreja e largo | [Fotografia identificada da capela da Fazenda Colônia, em TOK de História](https://tokdehistoria.com.br/tag/taquaritinga-do-norte/), [imagem catalogada](https://tokdehistoria.com.br/wp-content/uploads/2010/12/alexdsc_2264-1.jpg). Crédito indexado: Alex Gomes; licença de reutilização desconhecida. Pixels vistos pelo agente principal, conforme registro acima. | Orientar fachada simples, frontão e relação com terreno pela observação atribuída. Preservar o marco do mapa; não substituir automaticamente por igreja medieval europeia de catálogo. |
| Água | [Codevasf — cisternas](https://www.gov.br/codevasf/pt-br/assuntos/infraestrutura-hidrica/cisternas) descreve captação do telhado por calhas/tubos; [estruturas localizadas](https://www.gov.br/codevasf/pt-br/assuntos/infraestrutura-hidrica/estruturas-localizadas) distingue poços que captam água do subsolo. | O poço local é aproveitável como marco já existente; uma roda d'água não fica justificada apenas por estar no semiárido. Conferir mecanismo real antes de reforçar esse detalhe. Cisterna é referência alternativa futura, sem alterar agora navegação ou cobertura. |
| Feira | [Prefeitura de Caruaru — Feira de Caruaru](https://www.conheca.caruaru.pe.gov.br/o-que-fazer/feira-de-caruaru) documenta barro, couro, madeira, alimentos e utensílios. Caruaru é referência cultural de feira do Agreste, não prova da paisagem de qualquer município sertanejo. | Se couber nos props existentes: cerâmica, sacos e caixotes sob cobertura simples, com cor concentrada em mercadorias e tecido. Evitar bazar magrebino como atalho visual. Densidade e posição dependem de LOS/CTF. |
| Flora | [Associação Caatinga — sobre a Caatinga](https://www.acaatinga.org.br/sobre-a-caatinga/) distingue formações e cita xique-xique, facheiro, macambira/croatá; [Embrapa — Juazeiro](https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/tematicas/bioma-caatinga/flora/forrageiras/juazeiro) descreve copa e folhas. | Compor alturas diferentes com os GLBs existentes, sem distribuir cactos como sinalização repetitiva. Aumentar variedade por rotação/material só depois de olhar silhuetas. Preservar verde vivo pontual, sobretudo juazeiro. |
| Répteis | [Ibama — Calango](https://www.ibama.gov.br/meio-ambiente/meio-ambiente/calango-4298), crédito Arquivo Ibama: pequenos lagartos que vivem no solo/pedreiras. | Usar `calango.glb`/`lagarto_sertao.glb` junto a rochas e bordas; não lagarto antropomórfico ou agama do Chipre. Movimento e contato com chão precisam de inspeção runtime. |
| Fauna doméstica | Galinha Quaternius CC0 já documentada em `public/models/ambient/FONTE.md`; a feira de Caruaru documenta cabras/bodes. | Galinha é primeira opção existente. Cabra externa fica opcional e pendente; aves só com espécie e animação verificadas, sem restituir o defeito histórico de ave congelada em voo. |
| Luz / solo | Fotografias de [Catimbau](https://revistacasaejardim.globo.com/arquitetura/noticia/2025/01/casas-do-brasil-o-olhar-poetico-de-fotografos-sobre-o-morar-brasileiro.ghtml) e [Fazenda Colônia](https://tokdehistoria.com.br/tag/ibitiranga/) são alvos localizados para comparação, sem medição de pixels nesta subtarefa. | Hipótese de arte: manter solo/rocha/parede separados por material e valor, com sombra que dê volume e preserve leitura de inimigos. Não impor filtro sépia geral, céu laranja ou teto numérico sem captura e medição. |

## Acervo local antes de buscar substitutos

`public/models/props/FONTE.md` e `public/models/ambient/FONTE.md` foram atualizados nesta frente: o lote Sertão agora aponta para seus registros, chats, assetIds e hashes finais conferidos, sem inventar termos contratuais. O manifesto declara prompts próprios Mint, sem referência de terceiros; o texto integral de cada prompt não está anexado ao manifesto. A documentação geral dos outros lotes declara uso Mint Pro. **Termos/licença específicos de cada geração Sertão e autor humano continuam pendentes de documentação individual**. Isso não transforma o lote em CC0 nem em asset Sketchfab.

Na tabela: autor/provedor dos modelos Mint = geração Mint do projeto, autor humano desconhecido; licença específica = pendente de registro documental; atribuição = manter chat/assetId/processamento/hash do manifesto. “Aceitar” significa priorizar o arquivo existente para revisão, não aprovação visual final. Formato e custo vêm do arquivo local, não da descrição de catálogo. Triângulos somam as primitivas dos meshes do arquivo uma vez, sem multiplicar instâncias do mapa.

| Arquivo / URL de procedência | Autor | Licença / atribuição | Formato | Bytes no disco | Tris locais | Decisão / integridade |
|---|---|---|---|---|---|---|
| [`sertao_mandacaru.glb`](../../public/models/props/sertao_mandacaru.glb) / [fonte](https://mint.gg/chat/ph7f0hkpjjh01qcf95zt46dddd8d43ct) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 302.692 | 4.885 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`sertao_macambira.glb`](../../public/models/props/sertao_macambira.glb) / [fonte](https://mint.gg/chat/ph77kaaqh5ecv3mwaw421gabgx8d52yk) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 481.608 | 4.478 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`sertao_juazeiro.glb`](../../public/models/props/sertao_juazeiro.glb) / [fonte](https://mint.gg/chat/ph72w8yaxsgj6y271nvqjaxr2d8d4rr2) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 535.344 | 5.023 | Pendente como juazeiro vivo; revisar copa; SHA confere |
| [`sertao_xique_xique.glb`](../../public/models/props/sertao_xique_xique.glb) / [fonte](https://mint.gg/chat/ph7djxxjydj383me4g5t43r3ps8d5sgc) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 564.232 | 5.007 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`sertao_poco_roda.glb`](../../public/models/props/sertao_poco_roda.glb) / [fonte](https://mint.gg/chat/ph78jzf7pmyqqwffg89w8s664h8d41cs) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 482.756 | 4.862 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`sertao_capelinha.glb`](../../public/models/props/sertao_capelinha.glb) / [fonte](https://mint.gg/chat/ph7e200kx20sn17p6cfmn2sc958d4c8h) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 410.520 | 4.549 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`sertao_palhoca_forro.glb`](../../public/models/props/sertao_palhoca_forro.glb) / [fonte](https://mint.gg/chat/ph7dscqp85wk184t4xqw6teq6h8d56bn) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 458.652 | 4.060 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`lagarto_sertao.glb`](../../public/models/ambient/lagarto_sertao.glb) / [fonte](https://mint.gg/chat/ph70g5cch8yt9tqm4aj55n2t9d8d59sj) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 316.744 | 5.003 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`casa_pau_a_pique.glb`](../../public/models/props/casa_pau_a_pique.glb) / [fonte](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 535.312 | 4.318 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`igrejinha.glb`](../../public/models/props/igrejinha.glb) / [fonte](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 374.368 | 4.542 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`caminhao_antigo.glb`](../../public/models/props/caminhao_antigo.glb) / [fonte](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 445.448 | 4.599 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`calango.glb`](../../public/models/ambient/calango.glb) / [fonte](https://mint.gg/chat/ph78ys61n792at10xms9e053ax8d7cdr) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 402.824 | 4.958 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`casa_pedra.glb`](../../public/models/props/casa_pedra.glb) / [fonte](https://mint.gg/chat/ph7ck5kbnh4syt5gsbnan3m4ah8d6qsy) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 526.336 | 4.385 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`casa_platibanda.glb`](../../public/models/props/casa_platibanda.glb) / [fonte](https://mint.gg/chat/ph7ck5kbnh4syt5gsbnan3m4ah8d6qsy) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 371.756 | 4.110 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |
| [`casa_geminada.glb`](../../public/models/props/casa_geminada.glb) / [fonte](https://mint.gg/chat/ph7ck5kbnh4syt5gsbnan3m4ah8d6qsy) | Mint / humano desconhecido | Termos individuais pendentes; preservar registro | GLB | 500.928 | 4.696 | Aceitar acervo para revisão; procedência individual pendente; SHA confere |

Outros existentes: `galinha_campo.glb` (Quaternius, [CC0](https://poly.pizza/m/ineV9pU5VL)), `pigeon_ground.glb` (kenchoo, [CC-BY 4.0](https://sketchfab.com/3d-models/pigeon-ddd5ef4a94eb4159937a9de25c45697c)), com atribuição no FONTE de fauna. `banco_jardim.glb` existe, mas não foi encontrada entrada de procedência específica nos FONTEs consultados: pendente, não presumir licença. Não foi localizado arquivo de cabra, carroça ou banca de feira pelos nomes pesquisados; ausência por nome não prova inexistência em todos os packs.

Tabela local é snapshot medido em 05/09/2026. Reproduzir da raiz deste worktree; a saída é a autoridade se o arquivo mudar:

```sh
python3 - <<'PY'
import json, pathlib, struct, hashlib
assets = json.load(open('mint-assets.json'))['assets']
extra = {'casa-pau-a-pique', 'casa-pedra', 'casa-platibanda', 'casa-geminada', 'caminhao-antigo'}
for key, asset in assets.items():
    if 'sertao' not in key and key not in extra: continue
    for name in asset.get('files', []):
        if not name.endswith('.glb'): continue
        blob = pathlib.Path(name).read_bytes()
        doc = json.loads(blob[20:20 + struct.unpack_from('<I', blob, 12)[0]])
        tris = 0
        for mesh in doc.get('meshes', []):
            for p in mesh.get('primitives', []):
                count = doc['accessors'][p.get('indices', p['attributes']['POSITION'])]['count']
                mode = p.get('mode', 4)
                tris += count // 3 if mode == 4 else max(0, count - 2) if mode in (5, 6) else 0
        print(key, len(blob), tris, hashlib.sha256(blob).hexdigest() == asset['processing']['finalSha256'])
PY
```

## Candidatos Sketchfab: registro, sem download

Consulta pública em 05/09/2026; metadados vêm das páginas de autores indexadas na busca. A abertura direta dos dois cactos retornou HTTP 403. “CC Attribution” é a etiqueta exibida; a versão exata precisa ser confirmada no link da licença antes de importação. Créditos de uso futuro: título + autor + URL do modelo + URL/versão da licença + alterações realizadas. **Nenhum candidato externo está aceito para integração agora.** Formato/tamanho desconhecidos não foram inferidos do suporte AR nem da conversão usual do Sketchfab.

| Candidato / URL | Autor | Licença / atribuição | Formato | Tamanho | Tris anunciados | Uso / decisão |
|---|---|---|---|---|---|---|
| [Cactus Cereus](https://sketchfab.com/3d-models/cactus-cereus-1a51f9da8f62466797b271648e652a3d) | netgis | Desconhecida; atribuição desconhecida | Desconhecido | Desconhecido | Desconhecido | Pendente; 403, espécie não comprova mandacaru. Priorizar local. |
| [Cereus peruvianus — Potted Cactus](https://sketchfab.com/3d-models/free-cereus-peruvianus-potted-cactus-4dfdf2971fca42a292de7ac6bf97a26b) | AllQuad | Desconhecida; atribuição desconhecida | Desconhecido | Desconhecido | Desconhecido | Rejeitar como mandacaru/xique-xique nativo: vaso de archviz, identificação diferente e licença não confirmada. |
| [Dry tree](https://sketchfab.com/3d-models/dry-tree-b9d907e2fb3e42e49c63db126a05ffb2) | PATH DEFORM | CC Attribution; crédito completo | Desconhecido | Desconhecido | 285k | Rejeitar integração direta: pesado e árvore genérica não resolve juazeiro. |
| [Low Poly Trees Grass and Rocks](https://sketchfab.com/3d-models/low-poly-trees-grass-and-rocks-4e0463f5df36420bb53079f9de35e81f) | olehlila | CC Attribution; crédito completo | FBX, OBJ, BLEND, MB anunciados | Desconhecido | 2,3k pack | Pendente: rochas/galho podem servir; não tratar plantas genéricas do pack como flora local. |
| [grass](https://sketchfab.com/3d-models/grass-674d42354f6348a7a85fc06a7f004db5) | Georgeous | Free Standard; termos/atribuição pendentes | Desconhecido | Desconhecido | 1,3k | Pendente: inclui versões secas, mas autor situa flora na Rússia/Europa Oriental. Sem download até revisar licença e aspecto. |
| [Brazil House — Low Poly](https://sketchfab.com/3d-models/brazil-house-low-poly-9738b9a091d84d30aa0d88a4243e5863) | Bohnen | CC Attribution; crédito completo | Desconhecido | Desconhecido | 715 | Pendente: nome “Brazil” não prova taipa/arquitetura sertaneja; kit local tem mais variações documentadas. |
| [Church — Low Poly](https://sketchfab.com/3d-models/church-low-poly-395420ca259b48c282378de11fd54333) | Pedram Ashoori | CC Attribution; crédito completo | Desconhecido | Desconhecido | 264 | Pendente: custo pequeno, adequação arquitetônica e aparência não verificadas. Priorizar igrejinha local. |
| [Stone well](https://sketchfab.com/3d-models/stone-well-885951c7fc0646f4bb5b136475ee2f6c) | Lyskilde | CC Attribution; crédito completo | Desconhecido | Desconhecido | 7,9k | Pendente: modelo rural genérico, mais tris que local; mecanismo precisa de referência. |
| [Wooden Cart 01](https://sketchfab.com/3d-models/wooden-cart-01-07a97f4ecf994f579ac4ec70d74c561c) | Nichgon; derivado de rubberduck | Descrição diz CC0; campo mostra Free Standard. Atribuição/termos conflitantes | Desconhecido | Desconhecido | 1,8k | Pendente; não baixar enquanto conflito persistir. |
| [Medieval Wooden Cart](https://sketchfab.com/3d-models/medieval-wooden-cart-b7b7ab6a72a84304ab07e474fd04d038) | _JooL_ | CC Attribution; crédito completo | Desconhecido | Desconhecido | 23,8k | Pendente; carroça precisa de adaptação cultural e otimização, benefício menor que corrigir o acervo. |
| [Old Truck](https://sketchfab.com/3d-models/old-truck-a9f888b7832d4bbf9ed18fe18f00bf89) | Renafox | CC BY-NC; NoAI | Desconhecido | Desconhecido | 2,9k | Rejeitar: NC. Caminhão genérico local já existe. |
| [Bench Wooden 01](https://sketchfab.com/3d-models/bench-wooden-01-1400c9340d5049589deb43601462ac55) | randombug | CC Attribution; crédito completo | Desconhecido | Desconhecido | 590 | Pendente: banco pequeno candidato futuro; comparar com banco existente após regularizar procedência. |
| [Stylized Market Stall — Tier I](https://sketchfab.com/3d-models/stylized-market-stall-tier-i-d8f9c0b14e2d4f43be21125b4fe7780c) | Mrigua Mohamed | CC Attribution; crédito completo | Desconhecido | Desconhecido | 1,5M | Rejeitar: descrição declara arquitetura magrebina e custo enorme; não é feira do Sertão. |
| [Model 59A — Sling Tailed Agama](https://sketchfab.com/3d-models/model-59a-sling-tailed-agama-22f56f22ae564cdc8ef0242c7b08456b) | DigitalLife3D; retopologia Jer Bot | CC BY-NC | Desconhecido | Desconhecido | 72,3k | Rejeitar: NC e exemplar do Chipre, não calango local. |
| [Chiken](https://sketchfab.com/3d-models/chiken-ee6e92078e76438f903044019bc44786) | 1_floki_1 | CC Attribution; crédito completo | OBJ, FBX, BLEND anunciados | Desconhecido | 5k | Pendente: redundante com galinha CC0 existente; animações não confirmadas. |
| [Low-poly Goat](https://sketchfab.com/3d-models/low-poly-goat-e08bb2e734004870b1ed4c21f111a854) | Zafflex | CC Attribution; crédito completo | Desconhecido | Desconhecido | 1,6k | Pendente: melhor lacuna externa encontrada; rig/clipes, textura e silhueta ainda desconhecidos. |
| [Goat — Low Poly](https://sketchfab.com/3d-models/goat-low-poly-e5f9d96f54dd4e358da2a7145b1d50b9) | JiggleSticks | CC BY-NC; NoAI | Desconhecido | Desconhecido | 762 | Rejeitar: NC, mesmo sendo leve. |
| [Low Poly Bird — Animated](https://sketchfab.com/3d-models/low-poly-bird-animated-82ada91f0ac64ab595fbc3dc994a3590) | Charlie Tinley | CC Attribution; crédito completo | Desconhecido; autor menciona Maya como ferramenta | Desconhecido | 1,1k | Pendente: há declaração de rig/animação, mas espécies e clipes efetivos não vistos. Não assumir voo funcional. |

Buscas direcionadas por `mandacaru`, `xique-xique`, `macambira` e `juazeiro` no Sketchfab não produziram nesta rodada candidato de espécie específica com licença verificável. Isso é resultado desta busca, não declaração de inexistência no serviço. Evitar agave ou cacto ornamental genérico como substituição botânica automática.

## Continuação e definição de pronto

Concluído nesta frente: fontes textuais primárias/institucionais, acervo local, triagem Sketchfab, registro da inspeção fotográfica do agente principal e regularização documental dos FONTEs de props/fauna; nenhum download, integração ou commit por este pesquisador. Branch de retomada: `codex/sertao-astra`; artefatos desta frente: este relatório e as seções Sertão dos FONTEs.

Próximo passo do responsável pela revisão: confrontar as fotografias já abertas com capturas reais 3:2 nos pontos existentes do mapa; separar defeitos de textura/material, escala, silhueta e implantação. Preservar o contrato espacial e medir FPS no mesmo percurso/condições do antes. Régua numérica sem pixel, captura ou método reproduzível não deve surgir desta ficha.

Pendências antes de considerar o mapa aprovado: diagnóstico e antes/depois 3:2, teste de CTF/spawns/colisores/FPS e crítica visual independente. A inspeção de pixels das duas fotografias acima foi realizada pelo agente principal; outras referências permanecem textuais até serem abertas. Para qualquer futuro asset externo: resolver licença, baixar arquivo autorizado, registrar SHA/tamanho/formato/tris/clipes reais e atribuição no FONTE/manifesto antes da integração.
