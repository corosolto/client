# Correção obrigatória — entregar armas finais, com mãos e tudo

Ruben corrigiu explicitamente o escopo: **não entregar apenas preparação ou
candidato offline**. Esta instrução posterior substitui qualquer frase dos prompts
anteriores que limite a tarefa a relatório, diagnóstico, `ready:false` permanente
ou GLB sem integração.

Cada lane deve entregar uma implementação final e completa das armas que possui,
dentro de sua própria branch/worktree:

- arma própria e mãos/braços completos, com a identidade visual vigente de todos
  os times suportados pelo produto;
- idle, equip/saque, disparo/recuo, recarga tática, recarga vazia, inspeção e
  retorno contínuo, além do mecanismo específico da arma;
- contato correto de dedos/palma, manga fechada, sem pele indevida, interseção,
  bind pose, sumiço, salto ou deformação;
- ADS/mira/luneta, câmera e enquadramento próprios em 3:2 e 16:9, com centro útil
  livre e escala coerente com Pistola/Faca/AK aprovadas;
- sincronização com tempos e eventos reais do Game, sem mudar balanceamento;
- GLB final otimizada, bindings/configuração da família e integração runtime local
  da própria arma, com fallback seguro;
- réguas com mutantes, reimportação da GLB, folhas/vídeo offline, testes da família,
  build e evidência reproduzível;
- commit, push e PR próprio, claramente pronto para o integrador e para a revisão
  visual humana. O PR não deve ser só documental.

É permitido editar runtime e configuração **necessários às armas da própria lane**.
Mantenha essas mudanças pequenas e separadas por família para o integrador resolver
conflitos. Não redesenhe atlas ou materiais centrais: consuma o sistema de mãos por
time já aprovado, criando apenas o binding/adaptação da família. Não altere armas
de outra lane, mapas, áudio, personagens, combate ou balanceamento.

As lanes podem produzir em paralelo porque estão em worktrees separadas. Promoção
para a branch de release, revisão no Game e merge continuam sequenciais. Não use
“aguarda a integradora” como motivo para deixar a arma incompleta: a integradora
deve receber uma família funcional, animada e com mãos, faltando somente resolver
integração entre branches e obter o aceite humano final.

Preserve a proibição de abrir navegador nas tarefas que a receberam. Use Blender
headless, Node e evidência offline; o teste visual no Game será executado pela
integradora em uma única sessão depois dos PRs. Não faça merge ou release.

