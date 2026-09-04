# Piloto de áudio Fab — handoff

Atualizado em 2026-09-04.

## Objetivo e definição de pronto

Substituir sons de procedência insegura por um primeiro conjunto licenciado e audivelmente
coerente, sem reabrir o arsenal inteiro nem distribuir o pacote fonte.

O piloto só fica pronto quando estes eventos estiverem aprovados no jogo real:

- AK em primeira pessoa: tiro, carregador sai, carregador entra e ferrolho;
- passos em concreto;
- morte corporal;
- impactos em concreto e metal.

O restante continua usando o fallback sintetizado até passar pelo mesmo processo.

## Branch e limites

- worktree: `/Users/ruben/csbrasil/worktrees/audio-fab-pilot`;
- branch: `claude/audio-fab-pilot`;
- base: `origin/main` em `dcd8858edc7ed5141d3f3227b74946b0f951166b`;
- não fazer push, merge, deploy ou release sem aprovação do dono;
- não tocar em `/Users/ruben/csbrasil/worktrees/viewmodel-blender`;
- não usar a lane divergente `feat/audio-voices-test` como base de merge.

## Fonte e licença

Fonte comprada pelo dono: [Action Game Sounds Pack](https://www.fab.com/listings/4950a0c3-ace9-4cce-86dc-ce551263b6ce),
de PlaceHolder Inc., sob Fab Standard License.

Os arquivos fonte devem ficar fora do Git público. Não publicar os WAVs nem um ZIP que
funcione como redistribuição standalone. A build pode receber apenas derivados selecionados,
convertidos, renomeados por conteúdo e incorporados ao projeto.

A listagem está marcada como `Allows usage with AI: No`. Claude pode trabalhar no contrato,
no código, nos testes e em metadados, mas não deve receber os WAVs brutos como entrada.

## Estado validado

- A compra aparece na biblioteca Fab da conta do dono.
- O produto oferece apenas formato Unreal Engine; o site encaminha para Epic Games Launcher
  ou para o plugin Fab do Unreal em vez de fornecer download direto.
- Não há Epic Games Launcher, Heroic, Legendary ou cliente Fab compatível instalado neste Mac.
- A alternativa comunitária `StarksLabs/epic-fab` foi auditada estaticamente no commit
  `d9721b9a178df161f42d876881ef0fe75444ec0b`: não há dependência de runtime, listener,
  subprocesso ou telemetria; o token é gravado com modo `0600`; downloads verificam SHA-1.
- A ferramenta comunitária é nova, pouco usada, sem testes funcionais, com commit não
  assinado e um pequeno erro de versão. Ela não deve ser executada sem aprovação explícita.

## Resultados aceitos e rejeitados

Aceito:

- começar por um piloto pequeno, comparável e reversível;
- manter fallback synth para todo evento ainda não aprovado;
- guardar fontes em staging privado fora do repositório;
- usar análise determinística local (`ffprobe`, waveform, loudness e duração), sem enviar os
  WAVs ao Claude.

Rejeitado:

- trocar todas as armas e eventos de uma vez;
- publicar os arquivos fonte ou o pacote bruto;
- reutilizar referências de Valve/CS, Sounddogs ou captura de YouTube;
- declarar sucesso só porque manifesto e testes passam, sem escuta no jogo real.

## Bloqueio atual

Falta autorização do dono para executar o código comunitário fixado do `epic-fab` e concluir
o OAuth da conta Epic. A execução proposta usa um `XDG_CONFIG_HOME` temporário, baixa somente
o asset comprado para staging privado e apaga o token local ao terminar.

## Próximo passo concreto

Depois da autorização:

1. executar o `epic-fab` fixado sem instalação global;
2. autenticar apenas nos endpoints oficiais da Epic/Fab;
3. baixar para `/Users/ruben/csbrasil/private-assets/audio/action-game-sounds-pack`;
4. inventariar extensão, duração, canais, sample rate, loudness, picos e nomes;
5. selecionar candidatos cegos para os eventos do piloto;
6. escrever primeiro os gates de procedência, alcance do manifesto e fallback;
7. integrar e comparar A/B no jogo real;
8. pedir aprovação auditiva do dono antes de expandir para outras armas/eventos.
