# P0 — VIEWMODEL CS 1.6: MÃOS, POSES E RECARGA REAL

> **Decisão vigente do dono (22/08/2026):** o viewmodel v2 não é mais “arma
> isolada”. Toda arma exibida em primeira pessoa precisa de dois braços/mãos
> definidos, uma pose própria e animações que executem a ação visível. O alvo
> de leitura é CS 1.6: arma natural no canto inferior direito, inclinada para a
> esquerda da tela, sem ocupar o centro da mira.

Esta decisão substitui a premissa de “só arma, sem braço nem luva” de
`plans/01-ARMAS-VIEWMODEL.md`. Os ajustes temporários de cor/offset da mão
genérica não são uma entrega e não devem entrar como padrão.

## Referência que manda

As referências de movimento são os dois vídeos enviados pelo Ruben em
22/08/2026 (WhatsApp, Emerson, Blender). Eles mostram especialmente a
sequência de pistola:

1. mão direita mantém a empunhadura e o dedo sai do gatilho durante a ação;
2. mão esquerda entra no quadro, pega o carregador separado, remove o antigo,
   insere o novo e volta;
3. a arma gira acompanhando a força das mãos, não “desce” inteira em linha reta;
4. mãos, pulsos e mangas continuam visíveis e coerentes durante toda a ação.

As capturas do jogo de 05:18–05:20 mostram o estado que deve ser reprovado:
mãos geométricas sem dedos, uma única pose para armas diferentes, pistolas e
faca fora de escala/perspectiva, e reload reduzido a abaixar o conjunto.

## Contrato visual

| Item | Obrigatório | Reprovado |
|---|---|---|
| Mãos | Duas mãos com cinco dedos e luvas táticas; mão direita segura a empunhadura, a esquerda apoia/manipula a arma | Blocos, luva solta, mão rosada ou mão que não toca a arma |
| Perspectiva | Modelo criado para a câmara FPS, visto do canto inferior direito; cano aponta para a esquerda/centro da tela | Modelo de chão reaproveitado, arma quase vertical ou coronha/cano cortados sem intenção |
| Pose | Uma pose base por família e uma correção por arma, aplicada no Blender | Um único offset global para todo o arsenal |
| Recarga | Mão de apoio se desprende, manipula carregador/ferrolho/bomba, e retorna; peças móveis são objetos separados | Apenas `translateY`/“dip” da arma |
| Movimento | Idle, caminhada, saque, tiro/recuo, recarga, troca/guardar | Uma arma estática com wobble procedural como única animação |

O modelo do personagem em terceira pessoa e o rig de braços atual **não** são
uma fonte válida de primeira pessoa: eles não trazem dedos nem poses de arma
suficientemente específicas.

## Arquitetura de asset

Cada família entrega um pacote Blender/GLB de primeira pessoa:

```
vm_<familia>.blend (fonte editável)
└── vm_<familia>.glb
    ├── armatura: vm_root, braços, pulsos, duas mãos e dedos
    ├── malha: mangas + luvas táticas + arma(s) da família
    ├── objetos móveis nomeados: carregador, ferrolho, cilindro, bomba etc.
    └── clips: idle, walk, draw, fire, reload_tactical, reload_empty, holster
```

O rig inclui cada falange dos cinco dedos de ambas as mãos. Restrições e IK
podem ser usados no Blender, mas devem ser assados nas chaves antes da
exportação. A exportação recebe `vm_root` na origem e nomes estáveis; o jogo
nunca escolhe uma peça por índice de uma lista.

No navegador, `AnimationMixer` toca os clips exportados. O código existente de
sway, bob e recoil fica apenas como camada aditiva pequena sobre `vm_root`; não
pode mover a mão para fora da empunhadura nem substituir a recarga.

## Molde de produção — não negociável

O contato não será resolvido por offsets globais ou IK aplicado por cima de uma
mão pronta. O arquivo Blender de cada família terá estes controladores, assados
nos clips antes de exportar:

```
vm_root
├── weapon_base                 (bob, caminhada e saque)
│   └── weapon_body             (coice, recarga e inspeção)
│       ├── socket_grip_R       (mão direita fixa)
│       ├── socket_support_L    (mão esquerda em idle/fire)
│       ├── socket_magazine_L   (mão esquerda durante troca de carregador)
│       └── socket_bolt_L       (mão esquerda ao armar)
├── arm.R / forearm.R / hand.R / 15 falanges R
└── arm.L / forearm.L / hand.L / 15 falanges L
```

A arma não é filha permanentemente da mão: `weapon_body` e a mão de apoio
trocam, por chave animada, entre `support`, `magazine` e `bolt`. Assim o
carregador, ferrolho, cilindro ou bomba são objetos separados e podem ser
manipulados dentro do enquadramento. Isto elimina a implementação antiga de
apenas esconder/baixar todo o conjunto durante `R`.

### Referência do Emerson, quadro a quadro

O vídeo `WhatsApp Video 2026-08-16 at 19.23.42.mp4`, enviado pelo Ruben, passa
a ser a régua inicial da pistola. A sequência observada é:

| Fase | O que tem de aparecer no clip |
|---|---|
| Idle | Pistola baixa à direita; mão direita fecha o grip; indicador acompanha o gatilho; a segunda mão não fica flutuando. |
| Aproximação | Mão esquerda entra por baixo e os dedos se abrem para o carregador, enquanto a direita mantém a orientação da arma. |
| Troca | Carregador antigo sai, o novo é visível e entra no poço; a pistola continua dentro do quadro. |
| Retorno | Mão esquerda puxa/solta o slide se vazio e volta; as duas mãos terminam no mesmo contato do idle. |

Cada cena de revisão deve render esses quatro quadros, lado a lado com a
referência. Se não houver dedos legíveis, peça móvel e contato físico em todos
eles, o clip é reprovado antes de chegar ao navegador.

## Cobertura obrigatória: 26/26 armas jogáveis

O lançamento só fecha quando estes 26 IDs de `WEAPON_IDS` tiverem entrada
explícita no manifesto. Não existe “herdar a mão genérica”, nem arma que fique
no viewmodel antigo:

| Família | IDs que devem ser entregues | Mão de apoio | Ação de recarga |
|---|---|---|---|
| rifle / SMG | `ak`, `m4`, `mp5`, `m92`, `akm`, `g3`, `md97`, `carbine`, `lmg`, `scar`, `tavor`, `famas`, `uzi`, `p90` | guarda-mão/foregrip, ajustado à geometria | tira e insere carregador; aciona ferrolho quando vazio |
| precisão | `awp`, `m400`, `mosin`, `rem700`, `svd`, `g3sg1`, `sks` | guarda-mão mais distante | carregador/ferrolho coerentes com cada arma |
| escopeta | `shotgun` | guarda-mão/bomba | ciclo da bomba e carregamento compatível com o tipo |
| pistola | `deagle`, `pistol`, `revolver38` | entra somente quando a ação exige | magazine swap + slide; cilindro para revólver |
| faca | `knife` | mão secundária participa da guarda/golpe | sem reload; draw, idle, ataque primário e secundário próprios |

Todas usam o mesmo molde-base de braços e luvas para manter unidade visual,
mas **cada ID recebe**: âncoras das duas mãos, orientação, escala, arma/peças
móveis e uma tabela de clips. Nenhum ID pode apontar para uma configuração
"default".

## Famílias e exceções

“Família” evita duplicar o rig, não permite copiar uma pose cegamente: cada
arma tem, no Blender, seus próprios encaixes de mão, orientação, escala,
carregador e componentes móveis. Pistola, faca, bullpup e armas compactas são
casos de validação prioritários, porque eram os piores no estado anterior.

## Sequências mínimas

### Rifle / SMG

`reload_tactical` — mão esquerda deixa o guarda-mão → remove o carregador →
novo carregador entra e trava → mão retorna ao guarda-mão.

`reload_empty` — mesma sequência, seguida de puxar/soltar ferrolho ou usar o
comando real da arma. O carregador antigo e o novo precisam ser visíveis como
objetos animados separados.

### Pistola

`reload_tactical` — direita mantém a pistola, esquerda entra por baixo → remove
o carregador → insere outro → esquerda retorna. A arma não pode desaparecer
para fora da tela.

`reload_empty` — após o carregador, a mão esquerda puxa e solta o slide; o
slide percorre sua própria trajetória.

### Faca

`draw`, `idle`, `walk`, `attack_primary`, `attack_secondary`, `holster`.
As duas mãos têm silhueta e intenção de movimento; uma faca parada numa mão
genérica não é aceita.

## Produção em etapas — sem fabricar o arsenal às cegas

1. **Prova de rig:** um par de braços/mãos com dedos, luvas e mangas, em
   Blender, mais uma pistola. Validar silhouette, punho, dedo no gatilho e
   reload vazio inteiro.
2. **Extremos de cada família:** AK/M4 e uma compacta/bullpup, uma sniper, a
   escopeta, as três armas curtas e a faca recebem pose e clips reais. Isto
   aprova o molde, mas não substitui a cobertura dos outros IDs.
3. **Teste no navegador:** comparar, em 3:2 e 16:9, a pose parada, caminhada,
   tiro e todos os quadros de reload contra a referência do Emerson. Corrigir o
   molde/rig, não offsets do jogo.
4. **Cobertura 26/26:** só após os extremos serem aprovados, encaixar todos os
   IDs restantes na família apropriada e criar as exceções necessárias. A régua
   reprova a entrega se a contagem for diferente de 26.
5. **Polimento:** inspect opcional, sons sincronizados e variações de saque.

Nenhuma etapa salta da prova de rig para “todas as armas”. O asset fonte em
`.blend`, a exportação `.glb`, a ficha de cada arma e o render de revisão são
versionados juntos.

## Régua antes da integração

Antes de trocar o viewmodel no jogo, criar uma régua que lê o manifesto de
assets e falha se qualquer arma jogável não declarar:

- família, GLB e clips obrigatórios;
- encaixe de mão direita e de mão esquerda;
- partes móveis exigidas para sua recarga;
- orientação/escala específicas, por *slug* da arma.

A régua deve ter mutantes que removem um clip de reload, removem a mão esquerda
ou fazem duas armas compartilharem indevidamente a mesma configuração. Depois
da integração, a auditoria visual precisa capturar 3:2 e 16:9, idle e um quadro
intermediário de reload; ela falha se não encontrar mãos e arma no enquadramento
esperado. Os limites de pixels só serão escritos após medição nesses renders de
referência — não serão inventados aqui.

## Critério de aceite do Ruben

Uma família só está pronta quando, em navegador:

1. parece um viewmodel de FPS de autoria, não um modelo 3D colado no canto;
2. as duas mãos são legíveis e fazem contato físico crível com a arma;
3. a orientação é natural para aquela arma, inclusive pistolas, faca e compactas;
4. o reload mostra a ação correta quadro a quadro, sem o antigo “abaixa a arma”;
5. o mesmo resultado é aprovado por captura em 3:2 e 16:9.

Um portão verde sem essas imagens não fecha a tarefa: as capturas do estado
anterior são prova de que a régua existente não media a qualidade que importa.
