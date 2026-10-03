# Censo de graffiti dos 11 mapas abertos (MA1 · 27/09/2026)

> Primeira medição completa depois da parada dos 7 mapas (`733916cee`). A régua
> (`npm run eval:grafite`, `tools/eval/graffiti-census.mjs`) saiu de 5 mapas para os
> 11 abertos e ganhou duas cláusulas: **peça órfã** (nada de parede atrás — o "no
> ar / em grama" do dono) e **densidade** (peças por placa — o "demais"). Este doc
> é a triagem que alimenta o regen do MA2 (frente MA1 do `plans/26`).

## A tabela (medido em 27/09, `graffiti_census.json`)

| mapa | cobertura | placas | peças | dens | órfãs (ar/chão) | bandas 1,6/3,2/5,0 m |
|---|---:|---:|---:|---:|---|---|
| praca_poderes | 36,8% | 1065 | 370 | 0,35 | 0/0 (+4 beirando) | 74,9 / 13,8 / 0 |
| piscina_treta | 76,8% | 910 | 569 | 0,63 | **13**/0 | 85,2 / 72,0 / 72,6 |
| loja_h | 49,5% | 578 | 296 | 0,51 | **4**/0 | 60,8 / 30,3 / 55,1 |
| ferro_velho | 47,0% | 1497 | 541 | 0,36 | 0/**3** (+2 beirando) | 65,8 / 33,3 / 0 |
| quebrada | 68,2% | 1554 | 921 | 0,59 | 0/**3** (+2 beirando) | 78,7 / 66,2 / 40,9 |
| amazonia | **0%** | 3395 | 0 | 0 | — | nunca recebeu passada |
| escadao | 18,5% | 1522 | 329 | 0,22 | **11**/0 | 29,6 / 16,3 / 0 |
| corrego | 25,5% | 2054 | 334 | 0,16 | **6**/0 (+3 beirando) | 41,3 / 28,0 / 0 |
| lajes | **0%** | 1821 | 0 | 0 | — | layout órfão do rename |
| posto_treta | 26,3% | 942 | 172 | 0,18 | **5**/0 | 47,6 / 26,8 / 0 |
| velho_oeste | **0%** | 998 | 0 | 0 | — | nunca recebeu passada |

**Total: 45 peças órfãs** (com NADA atrás) em 7 mapas — a reclamação "no ar, em
gramas" do dono, agora com coordenada por peça em `graffiti_census.json → orfas.amostra`.

## Os cinco achados

1. **A classe @0,0,0 — posters posicionados na origem do mundo.** As 13 órfãs da
   piscina, as 4 da loja H e as 5 do posto são TODAS `decal:poster:*` em x=0,y=0,z=0.
   Não é deriva de geometria: são entradas de layout que nunca receberam posição (ou
   a perderam num merge de layout). 22 das 45 órfãs são esse bug de uma linha.
   Conserto: remover as entradas com x=y=z=0 do layout assado (elas desenhavam um
   poster no meio do mapa, no chão da origem) — ou reposicionar se o poster valia.
2. **Lajes perdeu o graffiti inteiro no rename.** O layout existe — sob a chave
   `fy_lajes` (veio do ramo FP: "só os mapas que ela não tem vêm deste ramo") — mas
   o registro agora constrói `lajes` (`map_lajes_authored.js`), e o `GRAFITE` não
   tem chave `lajes`. 1821 placas peladas no mapa mais novo da casa. O `ALIAS_MAPA`
   resolve id de mapa em link/banco; nada resolve chave de layout. Conserto:
   re-chavear no regen do MA2 (e a lição vira cláusula: todo id do registro com
   `pecas>0` em alguma chave precisa ter a chave PRÓPRIA — candidato a gate do
   gen-graffiti-layout).
3. **Amazonia e velho_oeste nunca receberam passada** (0 peças, 4393 placas
   somadas). Não é bug — é ausência. Entra no MA2 como trabalho, com o cuidado de
   tema: palafita de ribeirinho não recebe a mesma pixação da Quebrada (o pool
   `or-*` cobre estilo; a curadoria é do MA2).
4. **A faixa de 5 m é 0% em 6 dos 8 mapas com arte.** A passada não sobe (praca
   0% · ferro 0% · escadão 0% · córrego 0% · posto 0%; só piscina 72,6% e quebrada
   40,9% pintam alto). É o mesmo padrão do ferro velho (65,8/33,3/0) que o dono
   apontou: tinta comprimida embaixo, parede alta pelada. O regen do MA2 mexe nas
   BANDAS da passada, não só nas peças.
5. **"Demais" não é onde parece.** Densidade medida: piscina 0,63 e quebrada 0,59
   peças/placa lideram (e são os mapas mais pintados — coerente com a meta de arte
   "degradada"); ferro velho tem 0,36, abaixo da média. O incômodo do ferro velho é
   o item 4 (distribuição) e as 3 em chão, não volume. O teto de densidade
   (medido ×1,35) fica de guarda contra regredir, não define estilo.

## Régua nova (já no `eval:grafite`)

- **C1 cobertura** — piso por mapa (5 originais mantêm a meta do dono de 07/08; os
  6 novos entram com piso anti-regressão: escadão 18 · córrego 25 · posto 26; os
  de cobertura 0 ficam em 0 até o MA2 definir meta de verdade);
- **C2 densidade** — teto = medido ×1,35 (morde "levar sem tirar");
- **C3 órfãs** — tolerância declarada = o medido de hoje (piscina 13 · escadão 11
  · córrego 6 · posto 5 · loja 4 · ferro 3 · quebrada 3). Mesmo espírito do GRAF1
  do `KNOWN-RED` ("272 com vão atrás" na régua vizinha `eval:grafite:ar`, que
  mede vão SOFT — a minha mede NADA atrás, mais dura). **MA2 quita zerando mapa a
  mapa; zerou, apaga a linha.**
- Mutantes: `--mutante=peca-no-ar` (empurra peça 2,5 m pra cima) · `--mutante=demais`
  (dobra a densidade do ferro) · `--mutante=sem-layout-piscina` (o original).

## Ordem de trabalho que esta triagem recomenda pro MA2

1. Zerar a classe @0,0,0 (18 órfãs, quase de graça — é dado, é regen de layout);
2. Re-chavear lajes e rodar a passada na amazonia/velho_oeste (os três 0%);
3. Bandas altas no regen (ferro velho primeiro — o pior ofensor declarado);
4. As 27 órfãs restantes de geometria (escadão/córrego/posto/loja) no regen por mapa.
