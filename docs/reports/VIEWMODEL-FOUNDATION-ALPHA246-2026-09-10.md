# Fundação authored de viewmodels sobre alpha.246

**Data:** 10/09/2026  
**Branch:** `codex/viewmodels-catalog-final`  
**Base:** `origin/main@2115d5e2c` (`v2.0.0-alpha.246`)  
**PR:** #572 (draft)

## Resultado desta fase

A fundação causal Fable → Astra → controles foi portada por símbolos, sem merge ou
cherry-pick das branches antigas. A integração preserva os 26 IDs do alpha.246 e fica
**desligada por padrão**. Sem `?vmauthored=1`, o `Game` não constrói os controladores,
não busca os GLBs authored e usa o caminho legado existente.

Entraram:

- catálogo declarativo para as 25 armas de fogo; faca usa controlador próprio;
- controlador de famílias, ações, recuo, mãos por facção, troca de arma e FOV por aspecto;
- controlador da faca com saque, estocada rápida e golpe pesado aprovados;
- AK golden e faca públicas, congeladas pelos hashes aprovados;
- 48 atlas públicos de mãos para E/B/C/F/U e perfil neutro;
- integração de saque, recarga, tiro, muzzle, ADS, troca de time, resize e dispose no `Game`;
- uma decisão de visibilidade: o fallback só some quando o controlador confirma uma malha;
- token de requisição: conclusão assíncrona antiga não pode trocar a arma ativa;
- gate `npm run eval:vm-foundation`.

Todos os `VM_FAMILY.ready` permanecem `false`. QA local explícito:

- faca: `?vmauthored=1`;
- AK golden: `?vmauthored=1&vmready=ak`;
- baseline/rollback: remover esses parâmetros.

Não combinar esta rodada com `?vmlab=1`; os dois modos são bancadas independentes.

## Controles e proveniência

| Controle | Arquivo | SHA-256 | Estado |
|---|---|---|---|
| AK | `public/models/viewmodels/coro/ak-hires.glb` | `3b6ca23d7ea26017803d81f476b9d7a835eeb9f679f169ad0f520db82333df29` | público, opt-in |
| Faca | `public/models/viewmodels/coro/melee/knife-hires.glb` | `3e04fbcb67480cec0638ca552d308379c5bff7c5689ae39c8aa88e566c992621` | público, opt-in |
| PT-38 | `public/private-assets/viewmodels/pistol/pistol-runtime.glb` na fonte | `edb77908eadffd90fa3c2152ac00386372bf3002d20fb2c4d324d15ddad17e05` | excluída, fail-closed |

A PT-38 aprovada não é redistribuível neste checkout: nenhum byte foi copiado e nenhuma
substituta foi criada. Se alguém usar `vmready=pistol` sem montar o armazenamento privado,
o carregamento falha e a pistola legada continua visível.

A receita e os limites de reconstrução estão em
`public/models/viewmodels/FONTE.md`. A AK traz builder Blender versionado; depende de recuperar
o doador CC0 pelo hash documentado. A faca é publicável como binário congelado, mas a promoção
fonte a fonte dos golpes depende de um candidato arquivado fora do Git; por isso não foi aberta
como padrão. O time Mítico usa o atlas neutro até existir uma direção visual aprovada.

## Gates executados

| Gate | Resultado |
|---|---|
| `npm run eval:vm-foundation` | 20/20 |
| `npm run syntax` | verde |
| `npm run arch:check` | verde; 7.518 linhas, 272 símbolos |
| `npm run eval:botfaca` | verde; 18 golpes, 9 abates, sem tracer/fogacho |
| `npm run eval:vmlabhud` | 6/6 |
| `npm run eval:vminspect` | verde |
| `npm run build` | verde; hashes dos dois GLBs preservados em `dist/client` |
| `npm run check:deploy` | 39/39 com Node 24.19.0; pre-push completo verde |
| `npm run eval:vm` | 26 armas auditadas; 89 dívidas visuais herdadas do baseline |

`eval:vm` não é gate de aceite authored nesta fase: mede o viewmodel legado e continua
registrando as dívidas do alpha.246. O relatório gerado não foi commitado só para mudar timestamp.

## O que falta para revisão visual

Ainda não há captura fresca sobre alpha.246. Antes de abrir qualquer `ready:true`, executar no
Game real, em canvas fixo:

1. 1440×960 (3:2) e 1440×810 (16:9), uma sessão por aspecto;
2. AK: idle, saque, tiro, início/contato/fim da recarga, troca para faca e volta, ADS e HUD;
3. faca: idle, saque, estocada rápida, preparação/pico/retorno do golpe pesado, troca de time;
4. fallback: 404 deliberado da rota authored, troca rápida AK → outra arma → AK, morte/respawn e dispose;
5. folha de contato e vídeo sem cortes, com hash do recurso servido e revisão humana.

Dívidas conhecidas que a captura deve tratar como falha real, não como detalhe:

- AK 16:9: a auditoria anterior registrou luva direita cortada e margem superior zero na recarga;
- PT-38 16:9: não há amostra suficiente de mão/pente e o asset continua privado;
- AK/PT-38: ADS anterior era apenas pull residual, sem socket de mira mensurável;
- Mítico: não existe atlas próprio aprovado, portanto aparece com perfil neutro nesta bancada;
- faca: reconstrução fonte a fonte do movimento ainda não é autônoma neste checkout.

Mosin, SVD e SKS não receberam assets, `baked:true`, ativação nem captura nesta fase. A sequência
deles continua em `VIEWMODEL-PRECISAO-INTEGRACAO-ALPHA246.md`, depois que esta fundação passar
nas duas proporções.

## Checkpoints

- `8ecb7ab05` — controles públicos aprovados, atlas, licença e builder da AK;
- `c8b75444f` — runtime authored integrado com opt-in, fallback e token;
- `a6ec3b49c` — gate técnico e índice de arquitetura;
- `c6d138ce5` — evidência, receita de teste e lacunas visuais;
- `7d6770ec2` — gate executável também em Node sem `import.meta.dirname`;
- `0ef681a2e` — blocos gerados de arquitetura e documentação atualizados.

Branch publicada em `origin/codex/viewmodels-catalog-final`; PR draft `#572`. O checkpoint
de implementação e documentação gerada é `0ef681a2e6286c5eb728c386ae9389d3378ed72b`.
