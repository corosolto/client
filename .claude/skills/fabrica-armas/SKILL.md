---
name: fabrica-armas
description: Cria ou troca um viewmodel da fábrica do CS BRASIL, da ficha ao crítico cego. Use ao escolher chassi, montar variante, calibrar enquadramento, reconstruir recarga ou revisar um produto antes de propor ready.
---

# Fábrica de armas

Esta skill é o roteiro operacional. O contrato e a história medida vivem em
`docs/reports/VM-FABRICA.md` (em `../progress`). Leia também
[`docs/LICOES.md`](../../../docs/LICOES.md) (lições 1–5, 11, 12 e 14) antes de
alterar asset ou régua. O estado de integração está em
`docs/reports/VM-FABRICA-INTEGRADA.md` (em `../progress`).

## 1. Comece pela zona de contato

Escolha o chassi pelo punho, posição da mão de apoio, poço e pente, ferrolho e
movimento de recarga. Mantenha **braços, arma do pack e animações do mesmo
chassi** nessa zona. Nunca apague nem substitua vértice de osso móvel ou dentro
das caixas de contato protegidas pelo montador. A malha própria, quando
necessária, ocupa a zona livre: cano, coronha, casca, miras e acessórios. A
identidade também pode vir de material e skin, preservando materiais por peça
para futuras skins.

Se o pack não tem a geometria de contato pedida, reautorize a recarga e o
contato como um conjunto. FAMAS e Tavor são os exemplos em
`VM-FABRICA.md` §7: uma arma bullpup não nasce movendo apenas o pente para
trás do punho.

O pack KINEMATION e os produtos Mint são privados. Não inclua FBX, GLB,
`.unitypackage`, blend, token ou cópia da overlay no Git. O manifesto guarda
hashes e procedência; o jogo recebe os GLBs pela overlay privada.

## 2. Ficha → build → enquadramento

1. Confira branch, worktree e diff. Leia `tools/fabrica/fichas/<id>.json` e
   `tools/fabrica/chassis/<CHASSI>.json`. Para chassi novo, rode
   `node tools/fabrica/chassi.mjs <CHASSI>` e confira os FBX de arma, pose e
   clipes escolhidos.
2. Crie ou altere a ficha a partir do chassi de contato mais próximo. Para
   variante, use `tools/fabrica/blender/sobrepor.py` para alinhar a malha inteira
   ao pack antes de recortar peças; confirme as caixas de contato no relatório.
3. Rode `node tools/fabrica/build.mjs tools/fabrica/fichas/<id>.json`.
   Confira o manifesto de insumos e o GLB na overlay privada.
4. Rode `node tools/fabrica/enquadrar.mjs <id> --aplicar`. Ele dá a posição
   inicial contra a AK aprovada. Aceite o enquadramento só depois de medir o
   **quadro renderizado do jogo** em 3:2 e 16:9; vértices e câmera do Blender
   não substituem o raster.

Se mudar arma, mão, animação, ADS, mira ou HUD, mantenha a edição sequencial
na mesma lane. Não vire `ready` ou `VM_LAUNCH`; essas são decisões do dono.

## 3. Plano B da recarga com segundo pente

Para um chassi sem a recarga exigida, use a ficha `malhaPropria` e o
`animador/<id>.json` como nos bullpups. `Mag2` é um pente reserva num osso irmão,
coincidente com o original no repouso. Na recarga, o reserva nasce fora da
tela, acompanha a mão, empurra o velho, encaixa e o velho sai do quadro. Não
troque o pai do pente em tempo de execução. A régua do laço mede, por quadro,
palmas, IK, os dois pentes, aparição e desaparecimento na câmera real. Faça os
mutantes de reserva solta e reserva sumida reprovar antes de aceitar a animação.
O passo a passo e as exceções estão em `VM-FABRICA.md` §7.

## 4. QA e crítica cega

Rode `node tools/fabrica/qa.mjs <id> --lote=<lote>` com o servidor de revisão
disponível. O resumo e os logs ficam em `artifacts/<lote>/qa/`. O QA reúne:

| Medida | O que confirma |
|---|---|
| `tools/fabrica/reguas.mjs` (FB1–FB4 + mutantes) | bytes, rig, clipes, câmera, sockets, orientação e contato da mão |
| `eval:vm-manga-oca` e `eval:vm-manga-tela` | boca da manga e extensão visível em todos os clipes |
| `vm-reguas-check.mjs` em 3:2 e 16:9 | mira, cobertura, referência de pistola, mãos e carregador no jogo real |
| `eval:vm-carregador-repete` | amostragem estável do pente |
| capturas e vídeo | idle, ADS, tiro, saque e sequência inteira de recarga |
| regressão do `qa.mjs` | cache, launch, rig, orientação, manga e placar das armas anteriores |

Uma dívida de produto antigo em `vm-reguas-divida.json` não aprova produto
novo. Não afrouxe teto para pintar a régua de verde. As réguas de imagem e o
crítico compartilham a fonte de limiares
[`tools/eval/lib/vm-limiares.mjs`](../../../tools/eval/lib/vm-limiares.mjs):
se um teto parecer errado, meça na referência, corrija a fonte única e prove
com mutação. Os números não são copiados para esta skill.

Abra todas as figuras do pacote `artifacts/<lote>/critico/<id>/`. Aplique a
skill [`vm-critico-visual`](../vm-critico-visual/SKILL.md): entregue ao crítico
cego **somente as figuras e as referências aprovadas**, sem explicar sua
intenção ou o conserto. Registre APROVADA, RESSALVA ou REPROVADA e o defeito
visível por quadro. Uma nota verde da régua não substitui o crítico nem a
revisão do dono no jogo.

## 5. Armadilhas conhecidas do pack

- FBX de braço ASCII precisa do caminho Assimp; a raiz importada deve bater
  com a pose do pack. Arma soldada no osso errado ou raiz FBX inventada pode
  inverter o cano.
- Ossos de arma importados pelo Blender variam de orientação; rebases locais
  ingênuos deslocam pente e ferrolho. Confira a deformação no espaço da fonte.
- Clipes de arma do pack misturam 30 e 60 fps. Preserve o tempo de cada
  arquivo, sem esticar a arma para caber no clipe de braço.
- Material não se resolve só pelo nome do FBX: confira GUID no `.meta` e slots
  do prefab antes de aceitar um produto cinza.
- O `vmsleeve` pode esconder uma boca oca e criar um tubo diante da câmera.
  Meça a extensão no raster; a Uzi tem uma ressalva documentada em
  `VM-FABRICA.md` §7.3, que não autoriza elevar o teto.
- O frame do pack, a câmera do Blender e o quadro servido pelo jogo podem
  divergir. É a captura do jogo em 3:2 que decide; 16:9 protege a outra tela.

Ao terminar, registre fonte/sha de cada insumo, comandos, logs, capturas,
mutantes, veredito cego, dívidas e próximo passo no relatório da arma. Faça um
checkpoint Git só dos fontes públicos e da documentação, nunca da overlay.
