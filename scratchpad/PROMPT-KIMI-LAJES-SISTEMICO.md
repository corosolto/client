# PROMPT PARA KIMI — terminar Lajes e corrigir occluders em todos os mapas

Trabalhe em `/Users/ruben/game`, branch `feat/times-e-mapas-completo`.

O repositório está muito sujo e todo o trabalho está não commitado. Preserve alterações
existentes, não reverta arquivos alheios e não faça commit sem autorização explícita do
Ruben. Use `apply_patch` para editar. Um único browser por vez.

Antes de agir, leia completamente e nesta ordem:

1. `AGENTS.md`
2. `docs/LICOES.md`
3. `scratchpad/PROMPT-HANDOFF-VISUAL.md`
4. `scratchpad/PROMPT-pipeline2.md`
5. `KNOWN-BUGS.md`, principalmente BUG-54
6. `plans/10-LAJES.md`
7. `.agents/skills/bug-hunt/SKILL.md`
8. `.agents/skills/regua/SKILL.md`
9. `.agents/skills/gauntlet-fps/SKILL.md`
10. `.agents/skills/csbrasil/SKILL.md`, `game-3d-assets`, `asset-review` e as skills
    Three.js necessárias.

Rode `npm run arch` antes de consultar `tools/eval/ARCH.md`. Como existe
`graphify-out/graph.json`, consulte o grafo antes de mudanças amplas.

## Veredito vigente do dono

O visual de Lajes finalmente foi aprovado:

> "visualmente o mapa está incrivel. esta muito proximo do que queriamos"

Preserve fachadas, materiais, fiação, varais, pipas, pombos, ratos, densidade e atmosfera.
Não reconstrua o mapa como blockout e não gaste a rodada recalibrando renderer, exposição,
LUT, SSAO ou HDRI. O problema agora é a divergência entre o que se vê e o que se joga.

## Escopo obrigatório desta rodada

A rodada só termina quando TODOS os blocos A, B e C estiverem resolvidos. Caixas d'água,
bordas, empilhamento e cachorro não são “polimento futuro”.

### A. Resolver o padrão sistêmico de tiros em caixas invisíveis — todos os mapas

O relato do dono em Lajes foi: *"eu atiro pra frente e bate tiros no ar"*. A causa direta
mais forte é:

- `public/js/map_lajes_authored.js:addBox()` coloca `MAT.proxy` invisível em
  `world.occluders`;
- `public/js/game.js:_fireHitscan()` raycasta `world.occluders`;
- portas, janelas e recortes visíveis dos GLB continuam fechados para tiro e LOS.

Isso é uma dívida global. Faça um censo em TODOS os mapas registrados procurando:

- material invisível ou objeto fora da cena usado em `occluders`;
- proxy AABB/OBB maior que a superfície visível correspondente;
- `Group` em occluder, que não recebe raycast;
- GLB visível sobre proxy que continua sólido em portas, janelas, rodas e vazios;
- divergência entre `colliders` de corpo e `occluders` de bala/LOS.

Compare com os mapas do Emerson em `https://github.com/EmersonGarrido/csbrasil-private`
se a autenticação local permitir. Inspecione a solução dele e extraia o contrato útil;
não copie ou mescle o repositório inteiro. O Ruben percebeu que os mapas dele já reduzem
parte desse problema.

RÉGUA ANTES DO CONSERTO: crie um gate global, executado no navegador porque os GLB precisam
estar realmente carregados. Ele deve comparar, em raios amostrados a alturas de joelho,
peito e cabeça, o primeiro hit usado por bala/LOS com a primeira superfície VISÍVEL.
Proxy que bloqueia sem superfície visível próxima reprova. Falha de asset/captura também
reprova; não degrade para node silenciosamente.

O estado atual precisa ficar vermelho primeiro, com número e lista por mapa. Inclua
mutantes que realmente apliquem e fiquem vermelhos, no mínimo:

- `occluder-invisivel`
- `proxy-inflado`
- `grupo-sem-raycast`
- `vao-fechado`

Depois implemente um contrato único. `colliders` podem continuar simples e invisíveis para
movimento, mas bala e LOS não podem bater numa forma que o jogador não vê. Prefira malha
visual/occluder autorado ou decomposição por paredes reais. Não “resolva” tornando a caixa
visível, removendo toda colisão ou fazendo tiros atravessarem paredes verdadeiras.

Integre o gate ao `package.json` com comentário `//` explicando a origem. Se exigir browser,
não o coloque escondido depois de um passo já vermelho no `check:fast`; siga a regra da
skill `regua` para gates de navegador.

### B. Finalizar a jogabilidade de Lajes

O runtime vigente é `public/js/map_lajes_authored.js`, registrado por `public/js/maps.js`.
Não volte para `map_lajes.js` ou para a casca histórica.

Corrija e prove:

1. `groundHeightAt(x,z,yRef)` realmente multinível. Hoje Lajes ignora `yRef`, embora
   `_updatePlayer` o passe. Isso permite cair, voltar artificialmente para a laje e depois
   cair ao chão. A queda vinda de cima deve pousar na laje; quem já está abaixo deve ficar
   no térreo. Mutante `ignora-yref` obrigatório.
2. Dois estilos legíveis: rota principal de sniper pelas lajes e circuito inferior de
   ataque/flanco. Os dois times nascem nas lajes, mas conseguem descer e voltar por três
   acessos verticais claros.
3. O térreo precisa ser um loop contínuo, sem caixas independentes de segmentos fechando
   cotovelos/ramais. Caminhe com o `_collide` REAL, raio do jogador, e gere overlay de
   livre/bloqueado/componentes.
4. Limites visíveis. Hoje o casario visual continua além de `bounds`, mas `_collide`
   aplica clamp invisível. Toda aproximação ao limite deve terminar antes em fachada,
   portão de zinco, obra, desnível ou outra barreira que exista no pixel.
5. Direção clara sem depender do minimapa: do spawn se reconhecem as duas rotas superiores;
   no térreo, cada retorno vertical tem marco visual próprio.

Crie as réguas vermelhas antes de mudar a planta. Mutantes mínimos:
`ignora-yref`, `ramal-fechado`, `limite-invisivel` e `rota-inferior-partida`.

### C. Quatro entregáveis visuais obrigatórios em Lajes

1. **Caixas d'água:** substituir as formas facetadas/low-poly por assets convincentes,
   com tampa, frisos moldados, conexão/PVC e variação preta/azul. Use modelo com licença
   compatível existente ou gere via Mint/Tripo/Meshy seguindo `csbrasil` e
   `threejs-3d-generator`. Registre procedência e SHA. Não use cilindro de poucos lados.
2. **Bordas das lajes:** eliminar a leitura de retângulo perfeito. Criar fascia, viga,
   reboco quebrado, tijolo exposto, pequeno bevel e variação de espessura/silhueta. Isso é
   mudança de geometria, não só textura sobre caixa.
3. **Empilhamento térreo:** olhando de baixo, toda casa precisa ter apoio estrutural e
   continuidade até o chão. Remover volumes grandes suspensos, fachadas que começam no
   segundo pavimento e empilhamentos sem nexo. Use as referências reais já documentadas.
4. **Cachorro caramelo:** gerar/integrar um cachorro original, sem copyright, com idle e
   caminhada se o pipeline permitir. Ele vive no circuito inferior, percorre trecho seguro,
   reage/foge sem virar collider ou bloquear tiro. Incluir no sistema de ambiência, com
   asset-review independente e fallback seguro em qualidade baixa.

Cada asset precisa de screenshot no jogo, descrição do que foi visto e crítico independente.
Quem construiu não dá a nota.

## Evidência e aceite

Capture o jogo real em 3:2, não apenas mapview:

- spawn norte e sul mostrando as duas saídas;
- travessia completa das duas rotas de laje;
- três descidas e o loop inferior;
- quatro limites do mapa vistos pelo jogador;
- tiros através de portas/janelas/vãos que antes batiam no ar;
- caixas d'água novas e bordas de laje a curta distância;
- empilhamento visto do chão;
- cachorro caramelo no circuito inferior.

Antes de declarar pronto, rode os gates relevantes e todos os mutantes, além de:

```bash
node --check public/js/map_lajes_authored.js
npm run syntax
npm run eval:lajes-spatial
npm run eval:lajes-gap
npm run eval:lajes-authored
npm run eval:lajes-rooftop
node tools/eval/map-check.mjs lajes
npm run eval:mapcontrato
npm run eval:spawn
node tools/eval/botsim.mjs 30 lajes
npm run docs
npm run docs:check
npm run arch
npm run arch:check
graphify update .
```

Use `asset-review` com contexto limpo depois das capturas. O mapa só fecha depois do teste
do Ruben. Portão verde não substitui o olho dele.

## Relatório final obrigatório

Entregue:

- antes × depois numérico por cláusula;
- mutantes e respectivos exits vermelhos;
- screenshots 3:2 e o que você viu nelas;
- lista dos mapas corrigidos pelo contrato global de occluders;
- nota/veredito do crítico independente;
- custo de performance e tamanho dos assets novos;
- tudo que não foi verificado;
- arquivos alterados, sem esconder sujeira preexistente.

Não pare depois de escrever plano ou régua: continue até implementar, verificar e deixar o
build testável, salvo impedimento real documentado.
