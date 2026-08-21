---
id: botbrain
title: BotBrain
sidebar_label: BotBrain
sidebar_position: 5
description: How to test, train, and validate the bots' experimental neural controller.
---

{/* translated from docs/docs/botbrain.md on 20/08/2026 — auto sync: issue #54 */}

# BotBrain

BotBrain is an experimental neural controller behind `?botbrain=1`. Without that flag,
the game keeps using the scripted AI. The published model learns state-action pairs,
but weights can only be replaced after passing the functional gate on seeds outside the
bootstrap dataset and a manual review.

## Testing the model

```bash
npm run dev
# open http://localhost:4321/?botbrain=1
npm run bot:brain:check
```

In CAPTURE mode, the neural controller takes over combat when a target exists; with no
target, the bot falls back to scripted navigation to capture and defend the points.

## Collection and privacy

Collection starts **off**. The player must opt in under
**Settings > Privacy > Help train the bots**. In production:

- UID + token authenticate the batch's origin;
- the IP only takes part in rate limiting and is not stored in the corpus;
- there are per-IP, per-player, and total-storage limits;
- the importer caps each player's contribution;
- no remote data publishes a model automatically.

## Training locally

```bash
npm i -D @tensorflow/tfjs-node
npm run bot:record 60 all
npm run bot:train -- --epochs=40
npm run bot:brain:check
```

The full operational guide, including Docker and the local sink, is in
[`docs/BOTBRAIN-LOCAL.md`](https://github.com/corosolto/client/blob/main/docs/BOTBRAIN-LOCAL.md).
Docker exposes the game on loopback only; the local sink rejects external origins, caps
rate, body size, and metadata, and stops collecting once it reaches 50 MiB.

## Gates

`npm run eval:botbrain` checks UID identity, consent, the CTF objective, cache busting,
the local sink, non-root execution in the container, corpus balance, and separation between
training and evaluation seeds. `npm run bot:brain:check` runs bot-versus-bot matches on
holdout seeds and confirms the network moves, shoots, and gets kills.
