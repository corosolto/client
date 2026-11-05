# Preparação para Steam

O workflow manual `steam-preflight.yml` prepara manifesto de hashes e VDF Preview a partir de um artefato desktop já produzido. Não gera executável, não autentica na Steam e não envia conteúdo.

## Entrada

- Run de build bem-sucedida deste repositório, SHA completo e nome exato do artefato.
- Executável nativo Windows, Linux ou macOS e path relativo dentro do artefato.
- AppID e DepotID reais informados pelo operador. A ferramenta valida formato; não verifica propriedade ou acesso à conta.

O run é conferido pela API GitHub contra o SHA fornecido. Cada arquivo do conteúdo recebe SHA-256 no manifesto. Um cabeçalho ELF/PE/Mach-O é somente um filtro de formato; não prova execução, assinatura ou notarização. Arquivos web não são build desktop.

## Estado atual e limite

A lane Unreal existente está suja e sem remoto. Este workflow não altera essa árvore nem cria uma build Windows. Nenhum produtor de artefato desktop está conectado a este repositório: até existir uma build identificada, o workflow fica preparado, sem run de distribuição aprovado.

Uploads de artefatos do GitHub podem perder permissões Unix. O preflight recusa executável macOS/Linux sem bit de execução. O produtor precisa preservar os modos num pacote próprio, com extração revisada, antes desta integração ser considerada operacional. Não aplique chmod genérico como prova de integridade.

## Verificação local

```sh
python3 -m unittest discover -s tools/distribution-steam -v
python3 tools/distribution-steam/prepare.py \
  --content /caminho/build-desktop --output /caminho/steam-prepared \
  --launch Game.exe --platform windows --app-id APP_ID --depot-id DEPOT_ID
```

A saída guarda `uploaded=false`, `live=false`, `native_runtime_tested=false`. O VDF fixa `Preview=1` e omite `SetLive`. Os paths do VDF refletem a máquina que preparou a saída, portanto o arquivo exportado é plano revisável, não configuração portátil pronta para executar em outra máquina.

Antes de um upload futuro: testar o binário no SO alvo; definir launch option, depot e branch; conferir conta e direitos; revisar manifesto/bytes/alvo; gerar recibo do upload. Publicar a branch exige etapa separada. O filtro de nomes privados não substitui revisão completa de conteúdo/licenças/secrets.

Fonte: [Steamworks: Uploading to Steam](https://partner.steamgames.com/doc/sdk/uploading). Consultada em 25/10/2026.
