---
name: vm-critico-visual
description: Rodada de crítica visual do viewmodel do arsenal — gera as figuras no jogo real, chama o crítico cego e devolve o veredito por arma. Use ao reconstruir qualquer arma, antes de dizer que está pronta.
---

# Rodada de crítica visual do viewmodel

## Por que existe

O dono revisou o arsenal duas vezes no olho e achou, das duas, defeitos que
nenhuma régua tinha pegado: arma invertida, recarga arrancando o cano, mão por
cima do cano, metade do pente ficando presa. As réguas contavam vértice e
ficavam verdes.

O motivo é sempre o mesmo e está na `gauntlet-fps`: **quem constrói nunca dá a
nota**. Quem constrói conhece a intenção e lê o frame pela intenção.

Esta skill fecha esse buraco: gera a figura, entrega a um crítico que só vê
pixel, e devolve o veredito no vocabulário do dono.

## Antes de rodar

1. O caminho autorado precisa estar VIVO, ou você vai criticar o viewmodel
   legado sem saber (foi o BUG-156, e custou um dia):

   ```bash
   npm run eval:vm-autorado-vivo
   ```

   Verde = as armas `golden` montam o GLB novo com mão visível. Vermelho = pare
   aqui, não adianta criticar.

2. Um servidor de pé, e **só um navegador headless por vez** — duas sessões
   derrubam o boot e falsificam a medição.

   ```bash
   node tools/eval/serve.mjs 4361
   pkill -f "chrome-mac|chromium"
   ```

## Passo 1 — as figuras, no jogo real

```bash
node tools/viewmodels/prep/vm-arsenal-frames.mjs --porta=4361 --aspecto=32 \
  --modo=autorado --armas=<lista> --saida=/tmp/critica-r1
```

`--aspecto=32` porque **o dono joga em 3:2**. Validar só em 16:9 já custou uma
rodada inteira.

Gera `<arma>-<estado>.png` em idle, ads, fire e quadros da recarga. A recarga é
uma sequência: um frame só não decide.

Complemente com a bancada, que mostra as 15 lado a lado e **pinta de vermelho a
peça que a recarga arranca** — é a figura que decide "fica parte do pente":

```bash
node tools/eval/vm-bancada-check.mjs --porta=4361 --clipe=Reload \
  --maos=1 --figura=/tmp/critica-r1/bancada-reload.png
```

## Passo 2 — o crítico cego

Chame o agente `critico-visual-vm` passando **só o diretório de figuras**.

> **Não mande junto o que você consertou, por que consertou, nem o que espera
> que ele veja.** Se ele souber a intenção, ele lê o frame pela intenção, e aí
> você tem um segundo construtor em vez de um crítico.

Prompt que funciona:

```
Julgue o viewmodel das armas nas figuras de /tmp/critica-r1.
A AK é a referência aprovada. Devolva o veredito por arma no formato da sua
definição. Leia TODAS as imagens antes de escrever.
```

## Passo 3 — o que fazer com o veredito

- **Regressão vem primeiro.** Arma que piorou não dorme.
- Agrupe por causa, não por arma. Dois vereditos seguidos mostraram que seis
  armas diferentes eram um defeito só no construtor.
- Uma arma `REPROVADA` **não fecha** porque a régua de contagem está verde.
  Quando o dono diz que está errado e o portão está verde, o defeito é do
  portão (`bug-hunt`, lei 1).

## Passo 4 — a segunda rodada

Reconstrua, gere `/tmp/critica-r2` e chame o crítico **com as duas pastas**,
pedindo explicitamente o que piorou. Contexto limpo: não reaproveite a sessão
do crítico anterior, ou ele defende o veredito antigo.

**Detector de giro:** duas rodadas sem mover nenhuma arma de REPROVADA para
RESSALVA/APROVADA significa que o loop está girando. Troque de frente ou pare e
reporte o platô medido — rodada que não move número é custo.

## O que esta skill não faz

Não julga o que não está na imagem: contagem de vértice, nome de osso, config.
Para isso existem as réguas (`eval:vm-*`), e elas são cegas ao que o crítico vê.
São instrumentos diferentes e **nenhum dos dois substitui o dono jogando**.
