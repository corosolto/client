# Como FPS profissional monta viewmodel — e onde o nosso diverge

Levantado em 18/09/2026 para responder uma pergunta do dono: por que AK, faca e
pistola ficaram certas e as outras 23 não, mesmo depois de três semanas de
consertos. A resposta não está em nenhuma arma: está no processo.

## 1. As seis regras que os FPS profissionais seguem

### R1. FOV do viewmodel é separado do FOV do mundo

No Source/CS a câmera do mundo roda em ~90° e o viewmodel tem o seu próprio
`viewmodel_fov`, ajustável de **54 a 68**, padrão **60** no CS2. Valor baixo deixa
a arma maior e mais perto; valor alto encolhe e abre tela. Em Unreal a prática
equivalente é renderizar a malha de primeira pessoa num passe separado com FOV
próprio.

Fontes: [Liquipedia — Viewmodel](https://liquipedia.net/counterstrike/Viewmodel),
[CS2 FOV and Viewmodel Commands](https://bo3.gg/articles/all-counter-strike-2-fov-and-viewmodel-commands-explained),
[Render First-Person Meshes with a Separate FOV](https://sahildhanju.com/posts/render-first-person-fov/).

### R2. A pose é DADO, não câmera assada no asset

O modelo mental padrão: **a raiz do viewmodel segue a câmera todo frame**, e a
pose de segurar (`hip`, `ads`, `ads_holo`…) vem de dados autorados — posição mais
rotação em Euler —, com blend `pose = lerp(hip, ads, ads_factor)`. Ninguém assa
uma câmera dentro do modelo da arma.

E os limites que o CS expõe ao jogador são pequenos de propósito: offset de
**−2,5 a 2,5** em X e **−2 a 2** em Y e Z. A arma não é reposicionada arma a arma
em metros; ela nasce num lugar comum e recebe um ajuste fino.

Fonte: [Aim Offset / Weapon Viewmodel Debugger](https://github.com/initialvisuals/aim-offset-weapon-viewmodel-debugger),
[CS2 Viewmodel Guide](https://cs2configs.com/viewmodel-guide/).

### R3. Um esqueleto de braços para o arsenal inteiro

O fluxo padrão: exporta-se a malha de braços **uma vez** com todos os ossos,
inclusive os ossos de arma, e daí em diante **toda arma é skinada usando apenas
os ossos que já existem nesse esqueleto**. A arma pendura num socket da mão
dominante; o osso raiz da arma fica **onde a mão forte pega**, e um osso filho
marca a boca do cano.

Fontes: [Complete FPS Arms Rig and Animation Tutorial](https://80.lv/articles/complete-fps-arms-rig-and-animation-tutorial-from-3ds-max-to-ue4),
[UDK — Setting Up Weapons](https://docs.unrealengine.com/udk/Three/SettingUpWeapons.html).

### R4. Mão de apoio é IK contra um socket da arma, não pose decorada

A mão forte vem da animação; a **mão de apoio é resolvida por IK** cujo alvo é um
socket nomeado na malha da arma, com a raiz da cadeia no ombro. Como o socket tem
o mesmo nome em todas as armas, o mesmo grafo serve o arsenal inteiro. E o texto
é explícito sobre o sintoma quando isso falha: *desalinhamento entre o socket de
IK e a arma é a causa mais comum de "mão flutuando"* em shooter.

Fontes: [UE4 — The Right Way to Do Left-Hand Weapon IK](https://zaggoth.wordpress.com/2019/01/26/ue4-tutorial-the-right-way-to-do-left-hand-weapon-ik/),
[Shooter Animation Pack guide](https://mocaponline.com/blogs/mocap-news/shooter-animation-pack).

### R5. Animação é camada, não clipe inteiro por arma

Locomoção na camada base; braço esquerdo e direito em camadas com máscara por
osso. Recarga é **aditiva** sobre a locomoção, porque o jogador precisa andar
recarregando. Mira usa **aim offset** — blend space 2D aditivo de pitch e yaw.
Recuo é **aditivo**, guardando só o delta em relação à pose de referência, nunca
um clipe que substitui o corpo. No hip a camada é aditiva para preservar a pose
base; no ADS ela **substitui** por valores fixos que centram a arma na tela.

Fontes: [Animation Layers guide](https://mocaponline.com/blogs/mocap-news/animation-layers-guide),
[First-Person Animation guide](https://mocaponline.com/blogs/mocap-news/first-person-animation-guide),
[Procedural Weapon Animations Condensed](https://www.devunallocated.com/projects/project-killhouse/procedural-weapon-animations-condensed).

### R6. Mira, boca do cano e trajetória contam a mesma história

A regra mais dura da lista, e a que o jogador sente sem saber nomear: a câmera
mira num lugar, a alça de mira diz outro, e o tracer sai de um terceiro. Um FPS
saudável escolhe uma política explícita — normalmente hitscan da câmera, com o
viewmodel ajustado para a alça cair sobre esse raio no ADS — **documenta** essa
política e então ajusta a pose para que a arma visível não minta sobre ela.

E a ordem importa: *sway, bob e recuo são camadas EM CIMA da pose ajustada; não
asse ruído dentro dos números que você entrega*.

Fonte: [Aim Offset / Weapon Viewmodel Debugger](https://github.com/initialvisuals/aim-offset-weapon-viewmodel-debugger).

## 2. Onde o nosso arsenal diverge — medido, não achado

Censo dos 24 produtos assados servidos hoje:

| Regra | Padrão | Nosso estado |
|---|---|---|
| R1 fov próprio | um fov de viewmodel para o jogo | **fov por família**: 84 em quase tudo, 55 na pistola, e a AK usa o fov embutido dela (58) |
| R2 pose é dado | raiz segue a câmera; pose autorada em dados | **câmera assada dentro dos 24 GLB**, descartada no load e substituída por um frame de família |
| R2 faixa de ajuste | −2,5..2,5 e −2..2 (unidades de jogo) | offsets por família em metros, de `z −0,11` a `z −0,60`; a calibração pedia variação de até 1,2 m |
| R3 um esqueleto | um rig de braços para todas | **dois rigs**: `*_metarig` em akm, m92, g3, awp, m400 e UE/KINEMATION nas outras 19 — **zero ossos em comum** (77 vs 67) |
| R3 socket de pega | osso raiz da arma na pega da mão forte | **socket de pega em 10 de 24** |
| R4 IK da mão de apoio | IK contra socket nomeado, igual em todas | **não existe IK em runtime**; contato é assado por arma em três pipelines diferentes |
| R5 camadas | locomoção base, recarga e recuo aditivos | **quatro gramáticas incompatíveis**: `frozenIdle`, rotação rígida do root, movimento rígido no `RIG_FP_ARMS`, ações originais do pacote |
| R5 catálogo de ações | mesmo conjunto por arma | **de 3 a 8 clipes** por arma (g3sg1 tem 3; mosin e sks têm 8) |
| R6 mira/cano/tiro | alinhados e validados | sockets `SOCKET_MINT_MUZZLE` e `SOCKET_MINT_SIGHT` existem em **24 de 24** — e **nenhuma régua os usa** |

### O que isso explica

**Por que AK, faca e pistola acertaram.** São as três que não passam por
composição: artefato único, com o rig e a câmera com que foram autoradas, e a AK
ainda escapa do tint de mãos por ser `golden`. Elas obedecem R2 por acidente — a
pose é a que o autor viu.

**Por que cada conserto gera bug novo.** Com dois rigs, quatro gramáticas, fov por
família e enquadramento por família, cada arma é um ponto isolado num espaço de
combinações. Consertar uma não move nenhuma outra, e mexer no que é comum
(família, atlas, tint) move 6 ou 19 de uma vez, em direções diferentes.

**Por que a AWP aparece com meio campo de visão de cano.** Ela é `sniper`, divide
o frame da família com a m400, e a régua de escala não existia até ontem. Medida
agora: **2,83× a escala angular do arsenal** e só **42% da arma dentro do quadro**.

**Por que o crítico é ruim.** Ele nunca mediu nada de R1 a R6. Media distância
entre origens de nós — que não é pegada, não é escala e não é enquadramento.

## 3. O crítico que segue deste levantamento

Cada régua abaixo sai direto de uma regra, e não de gosto:

| Gate | Regra | O que mede | Estado |
|---|---|---|---|
| `escala angular por metro` | R1/R2 | diagonal aparente ÷ comprimento declarado, contra a AK aprovada | **existe** (`eval:vm-frame`), 13 armas ainda reprovam |
| `fração no quadro` | R1/R2 | % dos vértices da arma dentro de 3:2 e 16:9 | **existe**, mesmo gate |
| `fração de quadro do braço` | R2 | % de tela ocupada por mão e manga, junto com a arma | **falta** — é o furo que quebrou 6 armas na minha calibração |
| `contrato de mira` | **R6** | ângulo entre o eixo câmera→alça e o eixo alça→boca do cano no ADS | **falta**, e os sockets já existem nas 24 |
| `boca do cano visível` | R6 | a boca está dentro do quadro e não atravessa a mão | **falta** |
| `socket de pega` | R3 | existe socket de pega e a mão forte está sobre ele | **falta**, e só 10 de 24 têm o socket |
| `um rig` | R3 | todo produto usa o mesmo conjunto de ossos de braço | **falta** — reprovaria 5 hoje |
| `catálogo de ações` | R5 | mesmo conjunto de clipes obrigatórios por arma | **falta** — reprovaria as de 3 e as de 8 |
| penetração por vértice | R4 | mão dentro da arma | existe **só para mosin, svd, sks** |

Nenhuma delas é opinião. Todas reprovam um estado que já foi visto na imagem.

## 4. A decisão que o levantamento força

R3 e R5 não são ajuste: são arquitetura. Enquanto existirem dois rigs de braço e
quatro gramáticas de animação, **nenhuma régua vai produzir consistência** — ela
só vai medir melhor a inconsistência. O padrão da indústria é um esqueleto, um
catálogo de ações e pose como dado.

O caminho mínimo que respeita isso, usando o que já temos aprovado:

1. congelar **um** rig de braços — o KINEMATION, que já serve 19 das 24;
2. congelar **um** catálogo de ações obrigatórias, e reprovar quem não tiver;
3. mover o enquadramento de família para **pose por arma como dado**, validada
   pelo contrato de mira (R6) e pela fração de quadro de arma **e** braço;
4. reautorar as 5 da linhagem metarig sobre o rig congelado — é o único trabalho
   de asset realmente obrigatório;
5. mão de apoio por IK contra socket de pega, um grafo para todas, em vez de
   contato assado em três pipelines.

O que **não** está no caminho: continuar consertando arma por arma. Três semanas
de evidência dizem que isso não converge.
