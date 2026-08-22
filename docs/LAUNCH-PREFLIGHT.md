# Pré-flight de portais web

`npm run launch:preflight` monta o site e mede **o diretório publicado**
(`dist/client`), sem apagar nem mover asset algum. A checagem é a camada local
para a distribuição web; ela não envia, assina ou publica em portal nenhum.

## O que ela prova

O contrato de lançamento em [`plans/06-LANCAMENTO.md`](../plans/06-LANCAMENTO.md)
registra para CrazyGames os limites de 250 MiB totais e 1.500 arquivos. O script
reprova o build quando qualquer um deles estoura e também reprova symlinks ou
entradas que não sejam arquivos regulares: uma pasta local não pode parecer
empacotável se o ZIP/host não a consegue entregar.

Ele lista tipos e os 15 maiores arquivos para orientar otimização. Os limites
podem ser repetidos para uma regra futura sem editar código:

```bash
CRAZYGAMES_MAX_TOTAL_MIB=250 CRAZYGAMES_MAX_FILES=1500 npm run eval:launchbudget
```

O relatório é somente observação. A única poda com prova existente é a lista
literal em [`scripts/prune-dist.mjs`](../scripts/prune-dist.mjs), que exclui
bancadas de desenvolvimento já atrás de flags. O auditor apenas confirma se
algum desses alvos ainda ficou no output; não adivinha nem remove outros
arquivos.

## O que ainda exige evidência de navegador

O limite de download inicial de 50 MiB do plano não é igual ao tamanho em disco:
imports dinâmicos, cache, compressão HTTP e assets pedidos em runtime mudam a
resposta. Por isso o script não inventa um número verde. Antes de subir para
CrazyGames, capture uma sessão limpa no Network/HAR e registre o total até a
partida ficar jogável. itch.io não tem um limite equivalente fixado neste
repositório; o mesmo build auditado é o pacote a conferir no upload.

Para guardar um relatório legível por ferramenta:

```bash
npm run eval:launchbudget -- --json > /tmp/coro-solto-launch-budget.json
```

O mutante de memória confirma que os dois tetos realmente mordem, sem alterar
o build:

```bash
npm run eval:launchbudget -- --mutante=size
npm run eval:launchbudget -- --mutante=files
```
