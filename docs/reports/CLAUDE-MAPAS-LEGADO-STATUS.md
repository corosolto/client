# Claude lane - mapas legados

## Escopo

Inventario factual e proposta inicial para os mapas legados fora das lanes prioritarias.
Esta lane nao altera runtime compartilhado nem compete com Miticos, Sertao, Campo do Morro,
Joa ou viewmodels.

## Estado atual

- Branch: `claude/mapas-legado-qualidade`
- HEAD: `48df17b4`
- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/mapas-legado-claude`
- Claude CLI: presente em `/opt/homebrew/bin/claude`
- Modelo solicitado: `claude-opus-5`

## Inventario factual

| Mapa | Id | Modo | Arquivo | Estado historico | Assets / procedencia | Risco principal | Esforco inicial |
|---|---|---|---|---|---|---|---|
| Piscina da Treta | `piscina_treta` | rodadas | `public/js/map_piscina.js` | mapa ativo no registro, alto uso, maior foco de leitura rapida | geometria procedural do mapa atual; sem dependencia de marca | legibilidade do salao, spawn/CTF, custo de cena | baixo a medio |
| Penitenciaria da Treta | `penitenciaria` | captura | `public/js/map_penitenciaria.js` | entra em `main` pelo PR #335 | precisa direcao responsavel tipo Carandiru com referencias licenciadas | nao usar pessoa real, gore, marca protegida ou asset sem licenca | medio a alto |
| Parque da Treta | `parque_treta` | captura | `public/js/map_parque.js` | entra em `main` pelo PR #333 | base procedural atual; falta pesquisa de parque brasileiro escolhido | mapa pode virar decoracao sem pontos de combate/orientacao | medio |
| Posto da Treta | `posto_treta` | captura | `public/js/map_posto.js` | base em `main` pelo PR #250; PRs visuais #457/#458/#459 como referencia seletiva | historico de `bombas_combustivel.glb` e `loja_conveniencia.glb` do pack Mint `posto_obras_r3` | risco de marca no GLB tipo Ipiranga; precisa identidade ficticia | medio |
| Obras da Prefeitura | `obras_prefeitura` | captura | `public/js/map_obras.js` | base em `main` pelo PR #338; referencia visual do lote Emerson | geometria procedural atual | leitura de canteiro e fluxo em terreno ondulado | medio |
| Atacadao da Treta | `atacadao_treta` | captura | `public/js/map_atacadao.js` | base em `main` pelo PR #271; referencia visual do lote Emerson | geometria procedural atual | galpao pode ficar generico se nao houver historia visual forte | medio |

## Priorizacao

1. `piscina_treta`
2. `penitenciaria`
3. `parque_treta`
4. `posto_treta`
5. `obras_prefeitura`
6. `atacadao_treta`

Razao:

- Piscina tem mais uso e maior custo de regredir leitura/spawn.
- Penitenciaria e o caso com maior carga historica e legal; precisa direcao antes de implementar.
- Parque exige escolha de referencia para nao virar preenchimento generico.
- Posto ja tem trilha de assets, mas pede filtro de marca e recuperacao de proveniencia.
- Obras e Atacadao podem entrar depois porque dependem mais de refinamento de linguagem que de pesquisa critica.

## Receita do primeiro mapa

### Mapa escolhido

`piscina_treta`

### Passos

1. Levantar a leitura atual do mapa em 3:2 com captura real e anotar pontos de spawn, rotas e area central.
2. Medir custo de cena e identificar o que hoje pesa mais em legibilidade ou performance.
3. Definir uma lista curta de mutacoes reversiveis para a primeira intervencao: luz, contraste, props, landmark e spawn.
4. Validar a proposta com captura comparativa antes de mexer em mapas seguintes.
5. Registrar o resultado como novo checkpoint revisavel antes de qualquer expansao de escopo.

### Gate minimo

- captura humana em 3:2
- leitura de spawn/rotas
- custo de cena comparado com baseline
- assets com procedencia documentada
- nada que toque runtime compartilhado

## Proximo passo

Abrir a primeira intervencao em `piscina_treta` e manter o restante dos mapas apenas como inventario/proposta ate haver aprovacao visual.
