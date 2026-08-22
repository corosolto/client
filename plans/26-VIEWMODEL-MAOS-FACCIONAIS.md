<!-- spec:asset -->
# 26 — View model: mãos faccionais e animação de arma

## Objetivo

Trocar a arma flutuante pelo conjunto de primeira pessoa que o jogador vê o tempo
todo: antebraços, mãos e arma formam uma única leitura. A primeira entrega é um
piloto das facções **E, B e U**, sobre um único rig compatível. As outras facções
entram depois que esse conjunto passar em jogo real, inclusive em 3:2.

Não é aceitável ligar o asset atual só porque ele possui dedos modelados: ele tem
24 juntas, nenhuma junta de dedo e não possui clipes próprios. O código deve
continuar com arma sem mãos por padrão até que o contrato abaixo seja satisfeito.

## Direção visual do piloto

| Facção | Leitura no pulso e manga | Limites editoriais |
| --- | --- | --- |
| E | luva tática vermelho-escura, manga de sarja grafite com pequena faixa vermelha lisa | sem emblema de partido, pessoa ou slogan |
| B | luva verde-musgo e preta, manga utilitária verde-oliva | sem bandeira, brasão, logotipo ou uniforme real |
| U | luva azul-petróleo com detalhes violeta, manga de tecido escuro com costura colorida | sem marca, arte indígena copiada ou estereótipo |

As três variantes compartilham exatamente a mesma silhueta, escala e esqueleto.
Cor e material são separados em `glove_*` e `sleeve_*`; nunca se tinge a pele
inteira da mesma malha, como o asset atual faz. A mão deve parecer humana adulta
genérica, sem rosto, tatuagem identificável, gore ou referência a pessoa real.

## Contrato do asset

- Arquivo candidato: `public/models/fparms/arms-v2.glb`; entrega servida em WebGL,
  sem Draco obrigatório, máximo 2 MiB, até 12 mil triângulos e texturas até 1024 px.
- Um único `Skin` com ombros, braços, antebraços, `LeftHand` e `RightHand`, mais
  **30 juntas de dedos**: polegar, indicador, médio, anelar e mínimo, três por dedo
  em cada mão. Os nomes precisam conter lado, dedo e ordem (por exemplo,
  `RightIndex1`).
- Mesmas juntas e mesma pose de repouso nas variantes E/B/U. Variar materiais não
  pode alterar o alcance do IK nem o ponto de pegada.
- Clipes no próprio GLB, em segundos e com estes nomes: `fp_idle`, `fp_fire`,
  `fp_reload_rifle`, `fp_reload_pistol`, `fp_reload_sniper`, `fp_draw` e
  `fp_inspect`. A camada de jogo sincroniza os clipes de reload com o tempo de
  cada arma; não haverá 26 animações copiadas.
- `fp_fire` fecha indicador direito e dá retorno curto ao pulso; cada reload mantém
  a mão de apoio em contato ou a leva ao carregador/ferrolho em uma trajetória
  visível. A arma continua ancorada ao `grip` do view model, sem teleportar.
- A primeira integração fica escondida atrás de `?hands=2`. Só depois de fotos e
  revisão independente aprovadas ela substitui o padrão atual. `?fpoff=1` mantém
  o fallback de depuração.

## Evidência e procedência

Antes de gerar, guardar em `references/viewmodel-maos/` (ignorado do Git):

1. prompt final, fornecedor, plano/conta e data;
2. recibo/ID da geração e SHA-256 do GLB baixado;
3. imagens frente, palma direita, palma esquerda e arma M4 em 16:9 e 3:2;
4. confirmação explícita de que o plano cobre uso comercial antes de distribuição.

O registro resumido e versionado fica em `public/models/fparms/SOURCES.md`. Sem
esse registro o candidato pode ser avaliado localmente, mas não integrado nem
empacotado para publicação.

## Prompt-base para o gerador 3D

> original first-person FPS upper-body arm rig, anonymous adult human hands with
> five clearly separated fingers on each hand, realistic knuckles and palms,
> forearms only, neutral weapon-ready pose, no weapon, no head, no logo, no text,
> no brand, no real person, no gore; game-ready PBR, clean topology, compatible
> left and right hand finger bones, reload and trigger-finger animation ready.

Cada variante acrescenta somente o bloco de material da tabela acima. O gerador
não define a verdade do rig: depois dele o GLB precisa ser rigado/animado e validado
localmente.

## Portões de aceitação

1. `npm run eval:fp-arms-contract` verde; a mutação que libera mãos sem o rig
   completo precisa ficar vermelha.
2. O validador de GLB confirma o esqueleto, as 30 juntas e os sete clipes.
3. Capturas reais com AK, Deagle e AWP, em 16:9 e 3:2: sem mão solta, clipping
   perceptível ou obstrução de alça/mira.
4. `npm run eval:vm` não pode piorar o enquadramento existente; as falhas atuais
   de arma são uma frente separada e devem ser corrigidas antes de tornar mãos padrão.
5. Revisão adversarial com a skill `asset-review`, por agente que não gerou o GLB.

## Fora do piloto

- Não alterar dano, balística, colisão, FOV ou a regra de ADS nesta frente.
- Não fingir animação com uma textura ou uma malha parada; se os clipes não existirem,
  o candidato não é uma entrega.
- Não criar 10 esqueletos diferentes: é isso que tornaria recarga, armas e futuras
  facções impossíveis de manter.
