# Contrato do viewmodel profissional de 1ª pessoa

Este documento é o portão canônico para voltar a oferecer a câmera de 1ª pessoa como
padrão. Enquanto este contrato não estiver aprovado visualmente, a câmera de 3ª pessoa
do jogador é a apresentação segura.

## O que não é um molde profissional

- Um braço genérico reposicionado por IK no navegador.
- Uma animação doadora com a arma própria encaixada depois por PCA, escala ou offset.
- Um rig que passa porque a palma está perto de um socket, mas deforma punho, dedos ou
  cotovelo.
- Uma câmera recriada no JavaScript com valores aproximados do Blender.
- Uma skin aplicada sobre geometria ou animação de outro jogo.

O estado reprovado de 24/08/2026 combina exatamente esses problemas. O rig atual tem
dedos e ações, mas isso só prova estrutura. Não prova anatomia, contato, perspectiva ou
qualidade de movimento.

## A unidade mínima de produção

Cada viewmodel aprovado é um conjunto inseparável:

1. **braços e mãos próprios do Coro Solto**;
2. **uma arma própria já existente no jogo**;
3. **peças mecânicas separadas** quando a arma exigir carregador, ferrolho, slide, bomba,
   tambor, gatilho ou culatra;
4. **rig dedicado de primeira pessoa**;
5. **ações autoradas com aquela geometria presente**;
6. **câmera de referência e projeção exportadas junto do asset**;
7. **sockets nomeados** para boca do cano, ejeção, mão forte, mão de apoio, carregador e
   mira.

Trocar a textura continua permitido. Trocar a geometria da arma sem revisar contatos e
ações não é permitido, porque proporção de coronha, empunhadura, guarda-mão e carregador
muda o movimento necessário.

## Molde anatômico

O braço-base será desenhado para primeira pessoa, e não recortado de um corpo completo.
Ele precisa ter:

- topologia contínua e loops de deformação em cotovelo, punho, polegar e cada articulação
  dos dedos;
- volume de palma, eminência do polegar, nós dos dedos e antebraço legíveis em close;
- ossos de torção no antebraço para não transformar pronação em um tubo retorcido;
- três segmentos por dedo, cadeia própria do polegar e controles de abertura/curvatura;
- peso revisado nas poses extremas, com Corrective Smooth apenas como acabamento, nunca
  como substituto de topologia e weight paint corretos;
- materiais próprios de pele, tatuagem, luva e manga do personagem, sem textura doadora.

O rig de animação pode ter controles IK e auxiliares no `.blend`. O GLB recebe somente os
ossos e ações necessários ao jogo.

## Contrato da arma

Toda arma entra no Blender em escala real coerente e com transformações aplicadas. Os
nomes abaixo são estáveis; ausência de um socket necessário reprova o asset:

- `weapon_root`
- `grip_r`
- `support_l`
- `muzzle`
- `shell_eject`
- `sight`
- `magazine` e `magazine_insert`
- `bolt`, `slide`, `pump`, `cylinder` ou equivalente, conforme a mecânica

A mão forte segura a empunhadura durante toda ação, exceto quando a ação foi desenhada
explicitamente para soltá-la. A mão de apoio visita a peça real: carregador, bomba,
ferrolho ou culatra. Nenhuma recarga pode ser simulada escondendo ou apenas abaixando a
arma.

## Câmera: uma fonte única

A câmera que aprova o asset no Blender precisa ser a câmera que o navegador usa. Ela será
exportada no GLB, ou seus parâmetros serão exportados como metadados gerados pelo mesmo
arquivo `.blend`. Não haverá uma segunda composição escrita à mão no JavaScript.

O erro atual é reproduzível:

- `tools/blender/viewmodels/build_ak_hires_pilot.py` compõe o AK com `angle_y = 58°`;
- o export usa `use_selection=True` e seleciona rig + meshes, portanto omite a câmera;
- `public/js/authoredvm.js` recria a projeção pela regra HFOV 90;
- em 3:2 essa regra resulta em VFOV **67,38°**, diferente do Blender.

Assim, um contato visualmente correto no render offline não garante o mesmo resultado no
jogo. O novo pipeline compara a matriz de projeção e a transformação de câmera exportadas;
divergência reprova antes da captura.

## Biblioteca de movimento

As referências externas servem para estudar ritmo, arco e divisão mecânica; sua malha,
textura e identidade visual não entram no jogo. A biblioteca será organizada por mecânica:

- rifle com carregador;
- pistola com slide;
- faca;
- sniper de ferrolho;
- escopeta de bomba.

Cada família precisa de `idle`, `equip`, `fire`, `reload_tactical`, `reload_empty` quando
aplicável e `inspect`. Faca precisa de `equip`, `idle`, `slash` e `stab`. As curvas podem
ser reaproveitadas entre armas da mesma família somente depois de corrigir, no Blender, os
contatos da geometria concreta.

## Pilotos obrigatórios

Não se produz o arsenal inteiro de uma vez. O portão é sequencial:

1. AK própria: prova empunhadura em duas mãos, carregador e ferrolho.
2. Pistola própria: prova dedos, gatilho, apoio e slide.
3. Faca própria: prova silhueta, mão forte, mão livre, golpe e estocada.
4. Sniper própria: prova arma longa, luneta, ferrolho e enquadramento.
5. Escopeta própria: prova bomba e transferência da mão de apoio.

Cada piloto é corrigido até passar antes de abrir o seguinte. Somente depois dos cinco
passarem o molde é escalado para as demais armas.

## Portão visual obrigatório

Para cada piloto, a evidência precisa mostrar o jogo real em 3:2 e 16:9, nunca apenas o
viewer do Blender:

- quadro parado de `idle` e `equip`;
- sequência completa de disparo;
- sequência completa de recarga ou golpes;
- quadro crítico de contato com empunhadura, apoio e peça mecânica;
- comparação lado a lado entre Blender e navegador no mesmo frame e aspecto;
- gravação sem cortes que troca de arma, dispara e recarrega.

Reprova imediatamente se houver punho quebrado, braço tubular, mão atravessando a arma,
dedos flutuando, arma cobrindo a mira sem intenção, peça mecânica ausente, arma que some,
mudança de lente, corte inesperado no antebraço ou silhueta diferente entre Blender e jogo.

O construtor não dá a nota final. A liberação exige revisão visual adversarial e aprovação
do dono nas cinco famílias. Build, sintaxe, contagem de ossos e distância até socket são
checagens auxiliares; nenhuma delas significa “pronto”.

## Estratégia de entrega

- A 3ª pessoa do PR #405 permanece o caminho seguro durante a produção.
- O carregamento de 1ª pessoa é lazy por arma para não pré-carregar o arsenal.
- A primeira entrega é um pacote de evidência da AK, não uma promessa de 26 armas.
- Depois da aprovação da AK, repetimos o mesmo pacote para pistola, faca, sniper e
  escopeta.
- O parâmetro de 1ª pessoa só volta a ser padrão após a aprovação dos cinco pilotos e a
  conferência do arsenal completo.

