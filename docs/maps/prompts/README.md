# Prompts mapa por mapa — GLM + Claude + Mint.gg

18 mapas: os 17 registrados nesta lane após recuperar Campinho, mais Mansão do Joá (#533). Snapshot de PRs em 07/09/2026; revalidar ao iniciar. Cada arquivo contém prompt de execução e prompt de crítica independente, prontos para copiar. A divisão GLM/Claude abaixo é sugestão de responsabilidade; ambos podem usar Mint.gg. Não despacha agentes nem autoriza duas pessoas a editar o mesmo mapa.

**Ponto de partida:** branch `codex/mapas-polish-integral`, checkpoint de código integrado `883a7efa` (inclui todos os checkpoints de recuperação anteriores); estado e evidências no [handoff](../POLISH-CATALOGO-CONTINUIDADE.md). Use a ponta documentada desta branch para incluir também estes prompts. Leia o handoff antes de criar a worktree. Não partir cegamente de main e perder de novo trabalho recuperado dos PRs. Nenhum Mint foi chamado para produzir estes prompts.

| Ordem | Mapa | Builder sugerido | Prompt |
|---|---|---|---|
| 1 | Campinho do Morro | GLM | [Abrir](01-campomorro.md) |
| 2 | Parque da Treta / Madureira | Claude | [Abrir](02-parque_treta.md) |
| 3 | Penitenciária / Carandiru | GLM | [Abrir](03-penitenciaria.md) |
| 4 | Mansão do Joá | Claude | [Abrir](04-mansao.md) |
| 5 | Posto da Treta | GLM | [Abrir](05-posto_treta.md) |
| 6 | UPA 24h da Treta | Claude | [Abrir](06-upa_24h.md) |
| 7 | Obras da Prefeitura | GLM | [Abrir](07-obras_prefeitura.md) |
| 8 | Atacadão da Treta | Claude | [Abrir](08-atacadao_treta.md) |
| 9 | Sertão da Treta | GLM | [Abrir](09-velho_oeste.md) |
| 10 | Quebrada / Rua do Baile | Claude | [Abrir](10-quebrada.md) |
| 11 | Escadão / Morro | GLM | [Abrir](11-escadao.md) |
| 12 | Lajes / Comunidade | Claude | [Abrir](12-lajes.md) |
| 13 | Córrego / Favela de SP | GLM | [Abrir](13-corrego.md) |
| 14 | Treta na Amazônia | Claude | [Abrir](14-amazonia.md) |
| 15 | Praça dos Três Poderes | GLM | [Abrir](15-praca_poderes.md) |
| 16 | Piscina da Treta | Claude | [Abrir](16-piscina_treta.md) |
| 17 | Loja H / Estacionamento | GLM | [Abrir](17-loja_h.md) |
| 18 | Ferro Velho do Zé | Claude | [Abrir](18-ferro_velho.md) |

Começar por Campinho, Parque e Penitenciária; recuperar Joá pelo #533; depois os quatro mapas Emerson, Sertão e consistência do restante. O outro modelo faz a crítica com contexto limpo. Uma pessoa integra arquivos compartilhados e controla a fila do browser. Geração Mint pode ocorrer em paralelo para assets de mapas diferentes, com inventário de posse por asset e sem duplicar créditos.

**Atenção ao histórico:** #437/#440/#441/#457/#458/#459 foram fechados, não necessariamente incorporados. #530 trata campo dentro da Quebrada e não o mapa Campinho. Também existem candidatos históricos Treta no Gelo (#442/#372) e Treta no Vietnã (#375), fora do catálogo deste handoff; não apagar, substituir por outro mapa ou afirmar que nunca existiram. Sua recuperação requer primeiro inventário próprio de base/PR/asset.

Operação atual encerrada por limite de créditos. Os prompts orientam a retomada; nenhuma nova lane, merge ou release foi executada para esta entrega.
