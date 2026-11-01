# Mantle: contrato da régua

A revisão mede pouso apoiado e finito no motor real, conserva território e separa exceção de falha semântica.

O cabeçalho anterior da régua registra a origem e os mutantes, preservado abaixo para consulta:

```text
/* ============================================================================
   mantle-check.mjs — A RÉGUA DE SUBIR EM BEIRADA (MANTLING).
   ----------------------------------------------------------------------------
   POR QUE EXISTE: o dono jogou o Córrego reconstruído e disse — "uma vez q o cara cai
   no corrego e dificil sair porque ele nao pula em cima dos objetos". O corpo só sobe
   DEGRAU de 0,55 m (`STEP_H`); o canal tem paredes de 1,75 m (13 cm acima da linha do
   olho de 1,62 m: de dentro NÃO SE VÊ a rampa). Régua escrita ANTES do conserto,
   VERMELHA no `corrego` antes dele. Histórico e medições completas: relatório privado
   do audit 2026-10-31 e `tools/eval/BAR-CONSISTENCIA.md`.

     MNT1  SAIR DE ONDE SE CAI: toda QUEDA DE MÃO ÚNICA de escala humana ((STEP_H,
           LEDGE_MAX]) tem volta a pé custando <= T_MAX; sem volta é reprovação dura.
           Queda maior que LEDGE_MAX é mudança de andar, decisão do jogador (lajes).
     MNT2  SUBIR O QUE DEVE SUBIR: toda beirada de (STEP_H, LEDGE_MAX] com APOIO no
           topo e topo alcançável a pé é escalável — ANDANDO O MOTOR (`_updatePlayer`
           com W e Espaço), nunca simulando por fora. Pouso finito: mantle encerrado,
           grounded, avanço XZ >= 0,25 m, chão coerente e finito sob os pés.
     MNT3  NÃO SUBIR O QUE NÃO DEVE: cota máxima alcançável não sobe E o mantle não
           abre NENHUMA célula nova — mantle é atalho, nunca chave de território
           (o A* dos bots não tem camada de mantle; jogador e bot no MESMO mapa).

   INSTRUMENTO: o motor de verdade (`groundHeightAt`, `_collide`, `Game._mantleTarget`
   de produção — sem o método, o mantle está ausente e a régua mede esse estado).

   Uso:  node tools/eval/mantle-check.mjs [mapId|all] [--json] [--detalhe]
         SIM_QS='?mantle=0' node tools/eval/mantle-check.mjs all   (o A/B do conserto)

   MUTANTES — o teste do teste, todos verificados vermelhos:
     --mutante=beirada-baixa      teto 0,60 m DENTRO do motor -> MNT1 e MNT2 vermelhas.
     --mutante=beirada-alta       desliga trava de território + ilha sintética -> MNT3.
     --mutante=travessia-congelada Y sobe, XZ congela no `_stepMantle` -> MNT2 vermelha.
     --mutante=pouso-nan          mantle real + pose NaN no pouso -> MNT2 reprova (a
                                  finitude do pouso tem que rejeitar, sem virar ARNÊS).
     --mutante=canal-fechado      apaga as rampas do canal: com SIM_QS='?mantle=0' MNT1
                                  vermelha; com mantle LIGADO VERDE (o conserto medido).
   ============================================================================ */
```

Revisão independente R3: nenhum P1/P2. Wrapper Root: 11/11, incluindo NaN no pouso e erro de motor classificado como arnês. Isso não aprova a aparência da travessia.
