# Lajes V6 — becos estreitos

O pedido desta rodada foi corrigir a largura ainda excessiva nas imagens V5:
ruas e respawns muito estreitos, com abertura grande apenas no campo central.
A V5 permanece preservada como resultado rejeitado pelo dono.

## Mudança

Casas ocupam os antigos pátios dos respawns e a rua central fora do campo.
As travessas nas pontas ficam em z±27; os nascimentos no chão ficam recuados
nessas travessas, com esquina bloqueando a visada entre equipes. Os becos
laterais e a passagem sob as pontes também estreitaram. A praça mantém
x±5,1 e z±7,5; as quatro escadas e as quatro lajes continuam acessíveis.

Portas mantêm 0,90×2,05 m; os pavimentos não foram miniaturizados. Construções
novas têm malha e colisão; o grafo inclui amostras dos eixos estreitos, sempre
verificando apoio e espaço para o corpo. Pipas, helicóptero, casario distante e
materiais da V5 continuam presentes. Não há novos assets externos nesta rodada.

## Testar localmente

Servidor deste worktree:

http://127.0.0.1:8147/?debug=1&auto=P,mst&map=lajes&perfilauto=0&ctf=1

Recarregar com Cmd+Shift+R se o jogo já estava aberto. Se precisar iniciar o
servidor novamente e a porta estiver livre:

```sh
cd /Users/ruben/csbrasil/worktrees/lajes-visual
PATH=/opt/homebrew/bin:$PATH node tools/eval/serve.mjs 8147
```

O servidor de avaliação serve o Game real, mas não as APIs de produção.

## Evidência já validada

- Baseline LRU1 vermelho: 2.738/4.795 amostras largas fora do campo; raio livre
  máximo5,510 m. V6: 1.148 amostras, zero acima do limite, raio máximo1,087 m.
- Becos laterais medidos entre sólidos2,05–2,10 m; seção visual1,8425–2,10 m.
  LID1 foi apertada de1,8–2,8 para1,8–2,2 m, sem reduzir mínimo.
- 2.264 cortes direcionais físico/visual, zero divergências; três rotas com
  1.194 amostras livres. Três mutantes aplicados derrubam suas cláusulas.
- Browser inicial: 13 vistas e dois horizontes; cinco percursos completos pelo
  `_updatePlayer`,9.094 chamadas `_collide`, sem salto obrigatório ou mantle.
- Navegação:612/612 nós conectados,0 ocupados,0/3.728 arestas obstruídas.
- Geometria visual:48/48 portas e4/4 lajes com oclusão coincidente,4/4 setas
  planas;16/16 visadas entre spawns bloqueadas.

A régua e os mutantes estão explicados em `LAJES-V6-REGUA.md`. Limites métricos
são escolhas de jogabilidade, não dimensões atribuídas a fotografias.

## Verificações complementares

Map-check Lajes exit0: MAP1 sem jogadores dentro de sólidos/submersos; quatro
escadas com passada0,300 m, espelho0,1722 m, Blondel0,644 m e largura2,35 m;
MAP4 zero/341 oclusores sem malha; MAP6 sem bordas superiores desprotegidas;
CTF2 conserva pelo menos duas rotas separadas nos oito pares spawn→objetivo.
MAP5 agora mede0,42× em props e0,41× em waypoints, acima do indicador0,35×.

**MAP2B é indicador abaixo do alvo genérico:** folga1,05 m (referência1,2) e
área contígua mínima16,1 m² (referência40). Isso reflete a travessa de spawn
estreita pedida nesta rodada. Não afrouxei esses limiares nem chamo o exit0
uma aprovação desses dois indicadores. Oito spawns têm corpo livre e16/16
visadas entre equipes bloqueadas.

Bots: LB1/LB2 verdes. Sem combate:62,2% no chão,9,06% em escadas,21/21 chegaram
ao térreo e12/21 à praça. Com combate:88,8% no chão e2,80% em escadas. São
medidas da simulação, não aprovação comportamental. Tempo Node100,247 s;
map-check229,618 s. Não são FPS nem comparação controlada com a V5.

LC6 antigo partia de seis coordenadas fixas agora dentro de casas. A nova sonda
parte da componente livre do circuito, cobre oito aproximações e mantém corpo
0,38/margem0,18 m. Verde8/8; remoção real de34 colisores derruba LC6 nas
oito aproximações, mantendo LC1–5 verdes; restauração6/6 cláusulas verde.

A sequência Node registra22 execuções verdes, um mutante vermelho esperado e
a primeira LC6 inválida preservada. Somam-se LRU/LID e três mutantes próprios,
mais o comando npm da nova régua. Build e contratos selecionados passaram; não
executei todo `check:fast`. Antiaprisionamento:3.251/3.251 células com retorno.

## Comparação e revisão final

Comparação local: `artifacts/lajes-visual/v6/comparacao-v5-v6.html`. Quinze PNGs
finais em `browser-final/`, com hashes em `image-manifest.json`; primeira rodada
e cinco trajetórias em `browser-first/`. O HTML preserva a V5 e não a sobrescreve.

Captura final med:91 GLBs HTTP200, zero erros JS; low:93 GLBs HTTP200,
zero erros JS. Em ambas,48 portas/4 pisos/4 setas/16 visadas de spawn e céu real
passaram. Quatro empenas do campo receberam janelas e acabamento. A crítica
independente reabriu os pixels finais e encerrou essas pendências: estreiteza9/10,
conjunto8/10. É julgamento do crítico, não aceite estético do dono.

Das nove poses comparadas, cinco são idênticas. Spawns mudaram para x±3,z±27
com direção pela travessa; beco oeste x−14→−13,8; a câmera de fachada foi para
x−1,7,z−4,5 no campo, pois o ponto anterior está dentro de casa. Essas mudanças
estão explícitas no HTML. Quatro vistas extras cobrem rua central, outro beco,
travessa sob a ponte e esquina; duas cobrem o horizonte. Câmeras finais têm
checagem de corpo livre. Bots são ocultados na imagem final; estados de armas e
CTF variam, portanto as fotos não são um benchmark controlado.

Treze medições de passes completos:832–1.365 chamadas e885.288–1.186.501
triângulos. Valores observados em cenas dinâmicas, sem aprovação de FPS/GPU ou
alegação de ganho frente à V5. A repetição modular continua como polimento
opcional apontado pela crítica.

Documentação e ARCH regenerados; a checagem final é registrada em
`v6/gates/docs-check.log` e `arch-check.log`.

## Limites e isolamento

Não há aceite estético do dono nem aprovação de FPS/GPU, sem janela exclusiva.
Bots continuam predominando no chão em combate; o teste não possui cláusula de
aceite comportamental para a proporção de circulação elevada. A repetição das
fachadas segue sujeita à revisão visual. Dívidas de áudio/SSR/API do servidor de
avaliação permanecem separadas: HTTP404 herdados não são um teste de backend.

Worktree `/Users/ruben/csbrasil/worktrees/lajes-visual`, branch `codex/lajes-visual`.
Base da rodada `1621a6d8`. Checkpoints locais: `5bc91913` geometria/navegação;
`227b3017` instrumentos/mutantes; `71637e1c` sonda LC6. Sem push, merge, deploy ou alteração de outro
checkout. Continuidade em `LAJES-VISUAL-CONTINUIDADE.md`.

## Arquivos desta rodada

25 arquivos; artefatos volumosos permanecem ignorados.

- `ARCH.generated.md`
- `README.md`
- `STATUS.md`
- `docs/docs/arquitetura.md`
- `docs/docs/colaborar.md`
- `docs/docs/comecando.md`
- `docs/docs/quality-gates.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md`
- `docs/maps/LAJES-V6-CRITICA.md`
- `docs/maps/LAJES-V6-DIRECAO.md`
- `docs/maps/LAJES-V6-ENTREGA.md`
- `docs/maps/LAJES-V6-REGUA.md`
- `docs/maps/LAJES-VISUAL-CONTINUIDADE.md`
- `package.json`
- `public/js/lajes_houses.js`
- `public/js/lajes_navigation.js`
- `public/js/map_lajes_authored.js`
- `tools/eval/lajes-browser-check.mjs`
- `tools/eval/lajes-circuito-check.mjs`
- `tools/eval/lajes-identidade-check.mjs`
- `tools/eval/lajes-ruas-check.mjs`
- `tools/eval/lajes-visual-measure.mjs`
