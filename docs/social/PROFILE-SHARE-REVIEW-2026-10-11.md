# Revisão independente — ID público e cartão de perfil

Revisão adversarial em 2026-10-11, sobre a extensão de perfil da branch `feat/social-community`. Bases verificadas: client `e024d7a060261af20b43dfe98bb2201f5ec35248`; backend `8d44d1a6318e39a75ce3af5bb422abda70aa504c`. As correções ocorreram durante a revisão; os achados abaixo distinguem o defeito reproduzido do candidato posterior.

Escopo: ID único escolhido pelo jogador, projeção pública, URLs UUID/handle, autorização, concorrência, privacidade, catálogo, imagem OG, fonte e telemetria do último personagem. Consultei AGENTS.md, os contratos e ledgers sociais, implementações de sessão/proxy, migrations e RoundTracker reais. Não alterei produto, banco persistente, credenciais, remotos ou navegador. Ensaios próprios usaram Node23, fontes reais e módulos executados em memória; imagens temporárias ficaram fora do Git. Integração Auth/Postgres principal ficou sob responsabilidade do implementador para evitar fixtures concorrentes.

## Achados reproduzidos e revalidados

| Prioridade original | Defeito observado | Correção e evidência independente posterior |
|---|---|---|
| P1 | `<image>` recebia WebP embutido, que o renderer nativo ignorava. PNG válido e textos presentes escondiam a ausência do personagem. | Conversão dos assets conhecidos para PNG no build e SVG restrito a `data:image/png`. Comparação da região do retrato, mantendo exatamente o mesmo personagem e textos: Canarinho mudou 103659 pixels, Julia/Marina 103660, Lobisomem 90300 e Lampião 100010. |
| P2 | Filtro de arquivos excluía `julia-zanatta` e `marina-silva`; ambos tinham retratos existentes. O catálogo antigo `src/data/jogo.ts` também omitia nove personagens realmente jogáveis. | Extração do roster atual `CHARACTERS`, IDs com hífen e fontes locais alternativas. Inventário independente encontrou 63 IDs do jogo, 63 entradas e nenhuma fonte de retrato ausente. Os oito PNGs novos derivam dos vídeos já existentes; Lobisomem reutiliza `chars-hero`. |
| P2 | `/u/<key>` de perfil privado/amigos virava 404 e perdia o destino no botão para o jogo. O próprio dono privado e amigos autenticados não conseguiam abrir o alvo por esse link externo. | A página mantém 404 e metadata genérica sem imagem, preservando somente a key já fornecida na URL para o painel do jogo. Executei o frontmatter real: handle e UUID válidos conservaram `perfil`; formato inválido permaneceu na central genérica. A autorização continua na API do painel. |
| P2 | Ordenação por `last_seen_at` confundia permanência como espectador com última participação jogada. | Novo `lastPlayedAt` acompanha slot vivo durante `live`, sem avançar em espectador/menu. RoundTracker real: aba A jogou MST e permaneceu como espectador; aba B da mesma conta jogou Canarinho e saiu. Antes selecionava MST; depois selecionou Canarinho. Mutante que grava timestamp de espectador foi rejeitado. |

A falha do raster foi provada antes da correção: mesmo personagem, WebP real de Canarinho versus portrait nulo produziram PNGs **e buffers de pixels idênticos**, SHA256 `d42780a99d2f42b4dd494e4df11ccc9ef08c7c05bf96c63b2f319cb64e207477`. Converter essa mesma imagem para PNG alterou os pixels. Comparar compartilhamento ligado/desligado sem isolar o texto seria insuficiente, pois o nome e legenda também mudam.

Abri e olhei o PNG inicial: coluna direita vazia, nome do personagem visível embaixo. Abri e olhei os finais Canarinho e Lampião: nickname, ID e seis células legíveis; Canarinho aparece inteiro à direita; Lampião aparece em busto com fundo preto herdado do vídeo. Essas observações certificam os artefatos locais do renderer, sem substituir aprovação visual humana ou preview de uma plataforma social.

## Segurança e contratos executados

- Executei os handlers reais de `api/social.ts` com dependências isoladas. `target` e `auth` forjados no JSON não chegaram ao claim: argumentos RPC usaram exclusivamente ator e Auth da sessão. Mutante que trocava esses argumentos pelos campos do corpo ficou RED na comparação dos argumentos efetivamente usados. Origin estrangeiro recebeu 403.
- Executei `publicProfile` com o proxy real e fetch observado. Cookies e Authorization fornecidos ao SSR foram descartados; IP forjado no header não substituiu o endereço do chamador. A projeção pública exige `visibility=public` e `source=server_verified`.
- Fonte real decodificada: TTF de 705684 bytes, assinatura `00010000`. Com `fontFiles`, `loadSystemFonts:false` e a fonte escrita em diretório temporário próprio, o renderer converteu os textos em paths. Não depende de fontes do sistema. `fontBuffers` não faz parte do contrato nativo instalado; a rota final usa `fontFiles`.
- Ensaios do SVG escaparam `<script>`, aspas e `&`; portrait HTTPS externo foi omitido; perfil privado foi recusado antes do render. Assets vêm de caminhos construídos exclusivamente a partir do catálogo versionado, sem avatar remoto ou entrada arbitrária de URL.
- O claim SQL normaliza lowercase/trim, confere ator e Auth, recusa conta hidden, trava a linha do dono e usa índice único para a disputa entre donos. Escolha repetida do mesmo handle é idempotente; mudança é recusada. RPCs de perfil/claim ficam restritos a `service_role`. Essas propriedades foram inspecionadas no SQL; a prova de concorrência Postgres real pertence à integração principal, não a estes mocks.
- Preferência pública do personagem começa desligada. A projeção de perfil e `player_points` aplicam a preferência; presença, histórico, favoritos e Auth não são embutidos no cartão. HTML/PNG usam `no-store` e a mesma leitura anônima, inclusive quando o navegador fornece cookie.

## Artefatos dos ensaios próprios

Diretório temporário desta revisão: `/var/folders/rr/stx39dfx00j13zv9z459g3b80000gr/T/profile-independent-jtCSy3/`.

| Arquivo | Evidência |
|---|---|
| `real.png` | Baseline visual sem retrato, 48104 bytes; SHA256 `aa5bdef3ba5b161c0a75e07e639dff6bca8939c83e616e80322897832a5bdbc8` |
| `final-canarinho.png` | Renderer final com retrato, 116128 bytes |
| `final-julia-zanatta.png` | Retrato antes excluído pelo hífen, 86588 bytes |
| `final-marina-silva.png` | Retrato antes excluído pelo hífen, 83900 bytes |
| `final-lobisomem.png` | Catálogo atual e fonte `chars-hero`, 109203 bytes |
| `final-lampiao.png` | Frame derivado de vídeo existente, 110339 bytes |

São fixtures explícitas do renderer; nickname e números dos ensaios não comprovam partida humana ou estatísticas de produção. Os números de pixels acima comparam buffers RGBA somente no retângulo x=840..1139, y=140..504, mantendo textos iguais para que a régua detecte a imagem realmente desenhada.

## Limites e verificações ainda necessárias

Não restou P0/P1/P2 confirmado nos quatro achados revalidados acima. Isso não equivale a aprovação da publicação.

- A garantia de replay pelo caminho completo foi fechada no banco local pelo adendo abaixo. O contrato correspondente do ambiente remoto ainda depende da reconciliação de infraestrutura.
- O pacote Vercel observado ainda era de build em andamento/estado anterior às correções. Encontrei rota registrada e pacote nativo local Darwin, mas não certifiquei o resultado final da cópia, a resolução do handler ou o binário Linux no ambiente de deploy. Fontes/portraits embutidos eliminam leituras de `public/` durante requisição; o renderer nativo ainda precisa ser corretamente empacotado.
- Migrations, SQL real, concorrência Auth/Postgres, testes HTTP completos após a mudança de timestamp e o build final devem ser vinculados ao checkpoint pelo implementador. Não os apresentei como ensaios próprios executados nesta revisão.
- Browser permanece reservado à mídia. Não validei nova navegação visual/mobile, preview externo de OG, cache das plataformas sociais, migração remota ou produção. `no-store` controla as respostas do servidor, sem garantir retirada de previews já guardados por serviços externos.
- Rodadas legadas sem `last_played_at` não têm personagem recente confiável na projeção nova; não inventar timestamp a partir da intenção ou promover `last_seen_at` a prova de participação.

Próximo passo: concluir o build/pacote e a integração principal, anexar as evidências ao ledger/checkpoint e manter os gates de release já documentados, incluindo contrato legado remoto.

## Adendo — replay dos dois RPCs no banco local

Li independentemente o corpo real local de `track_mp_rounds`, obtido pelo implementador com `pg_get_functiondef` somente leitura e salvo no backend em `artifacts/track-rounds-definition.sql`. O INSERT/UPSERT de participantes escreve identidade de sessão, nickname/time, espectador e intervalos de presença; não escreve `character_id`, `faction_id` ou `last_played_at`. Assim, esse primeiro RPC não desfaz a proteção de timestamp do segundo no contrato local observado.

Li a versão atual de `test/social-public-character.sql`: a fixture já possui Canarinho com timestamp de participação mais recente; monta replay MST mais antigo para **a mesma rodada e sessão**, chama sequencialmente `track_mp_rounds(replay)` e `social_track_verified_rounds(replay)`, e lança exceção se o perfil deixar de selecionar Canarinho. O restante do bloco confere opt-in e privacidade. O log `artifacts/character-sql.log` contém `BEGIN`, inserts, `DO` concluído e `ROLLBACK`; o implementador executou com `ON_ERROR_STOP` e saída 0. Não reexecutei SQL nem escrevi no banco nesta revisão.

Esses três artefatos fecham a dúvida sobre interferência do upsert legado e replay antigo nesse banco local. Não provam o corpo remoto, replay em concorrência real ou empacotamento/deploy.

Hashes SHA256 dos artefatos lidos:

- Definição local: `62a023c1bc5ed3da6c563f7c3f4c0860ed57cfdd361412c3945e834df7b1a71b`.
- Teste dos dois RPCs: `f322cd8341806bba955b92a40dded574fe94be529a48e2aefd234d8acf4f9293`.
- Log SQL: `709c506b929f3cbf466b826fda587291e35a14e8d4ee258ed59f7fa1c8fcc58f`.
