---
id: botbrain
title: BotBrain
sidebar_label: BotBrain
sidebar_position: 5
description: Como testar, treinar e validar o controlador neural experimental dos bots.
---

# BotBrain

BotBrain é um controlador neural experimental atrás de `?botbrain=1`. Sem essa flag, o
jogo continua usando a IA roteirizada. O modelo publicado aprende pares de estado e ação,
mas só pode substituir pesos depois de passar a régua funcional e uma revisão manual.

## Testar o modelo

```bash
npm run dev
# abra http://localhost:4321/?botbrain=1
npm run bot:brain:check
```

No modo CAPTURA, o controlador neural assume combate quando existe alvo; sem alvo, o bot
volta à navegação roteirizada para capturar e defender os pontos.

## Coleta e privacidade

A coleta começa **desligada**. O jogador precisa autorizá-la em
**Configurações > Privacidade > Ajudar a treinar os bots**. Em produção:

- UID + token autenticam a origem do lote;
- o IP participa apenas do rate limit e não é armazenado no corpus;
- há limites por IP, por jogador e para o total armazenado;
- o importador limita a contribuição de cada jogador;
- nenhum dado remoto publica um modelo automaticamente.

## Treinar localmente

```bash
npm i -D @tensorflow/tfjs-node
npm run bot:record 60 all
npm run bot:train -- --epochs=40
npm run bot:brain:check
```

O guia operacional completo, inclusive Docker e sink local, está em
[`docs/BOTBRAIN-LOCAL.md`](https://github.com/corosolto/client/blob/main/docs/BOTBRAIN-LOCAL.md).
O Docker publica o jogo apenas no loopback; o sink local rejeita origens externas, limita
taxa, corpo e metadados, e interrompe a coleta ao atingir 50 MiB.

## Gates

`npm run eval:botbrain` verifica identidade UID, consentimento, objetivo de CTF, cache bust,
sink local, execução não-root no contêiner e balanceamento do corpus. `npm run bot:brain:check` executa
partidas bot contra bot e confirma que a rede se move, atira e consegue abates.
