# Revisão da aplicação e do pipeline - 2026-08-11

Base revisada: `main` em `2.0.0-alpha.69`. A análise combinou grafo de dependências,
leitura dos módulos centrais, APIs Astro, workflows, scripts de release, quality gates,
builds PT/EN e auditoria das dependências. O relatório separa defeito comprovado de
melhoria arquitetural; não transforma toda dívida em urgência.

## Resumo

A base tem instrumentação e gates acima da média para um jogo WebGL em alpha: regras
críticas possuem testes direcionados, várias possuem mutantes, ações de terceiros estão
fixadas por SHA, DCO é obrigatório e segredos do Supabase ficam no servidor. O maior risco
não é falta de checks, mas a diferença entre o que os checks headless enxergam e o que o
navegador/GLB realmente executa.

Os quatro itens que mais mudam a confiabilidade do produto são:

1. corrigir a rejeição de partidas legítimas (#116);
2. consertar a matriz dos occluders no arnês (#51);
3. tornar os gates de navegador seletivos e obrigatórios (#82/#83);
4. reduzir gradualmente a concentração de regras em `game.js` e `main.js`.

## O que está bom

### Segurança e backend

- `supabaseAdmin` existe apenas no runtime servidor; sem configuração, as rotas degradam
  para 503 em vez de expor chave ou simular sucesso.
- As rotas de escrita usam rate limit durável no Postgres, não memória efêmera da lambda.
- `register` restringe nick, URLs de avatar e tamanho; o processamento de imagem limita
  pixels antes do resize.
- Os erros de `register` e `submit-match` são sanitizados para o cliente e mantêm o detalhe
  no log interno. O UUID anônimo acompanha o diagnóstico sem publicar o nick.
- A telemetria rica usa `eventId`, `sessionId` e RPCs atômicas; falha de analytics não
  interrompe o fim da partida.
- A coleta de erro preserva o console, limita eventos por sessão e separa ruído de extensão.

### Qualidade e CI

- Actions externas estão fixadas por SHA e há um self-test da fronteira de confiança dos
  workflows.
- DCO tem job próprio e o release automático também usa `Signed-off-by`.
- O gate não para no primeiro teste; o runner mostra todas as regressões encontradas.
- Há checks específicos para CTF, spawn, regeneração, HUD, viewmodel, assets, poda,
  telemetria, SEO e rotas públicas.
- Mutation testing e ratchet de dívidas reduzem o risco de “verde que não mede nada”.
- Produção tem health/coherence watch separado do CI de repositório.

### Documentação e release

- Números derivados do código são gerados e `docs:check` detecta drift.
- `ARCH.md` é gerado com regiões de conflito, útil para trabalho concorrente.
- Com esta atualização, a versão atual do changelog também é um contrato do release, e a
  geração automática impede nova versão sem seção correspondente.
- Os dois caminhos de release agora assinam via DCO, reconstroem `public/docs` e falham se
  o site documental não puder ser versionado; o caminho local restaura a árvore se uma
  etapa falhar antes do commit.
- A documentação pública PT/EN foi reconstruída a partir das fontes atuais.

## O que precisa melhorar

### P0/P1 - correção e confiança

#### 1. A validação antifraude rejeita dado legítimo

#116 é o defeito aberto mais urgente. O placar humano 95/6 foi descartado e BOT8 indica o
mesmo tipo de falso positivo nos bots. A correção precisa usar duração, modo e população
da partida; aumentar um número global apenas desloca o falso positivo.

#### 2. O arnês de bots pode medir o mundo na origem

#51 documenta 92/92 occluders com `matrixWorld` desatualizada em um mapa headless. Isso
contamina linha de visão e qualquer baseline derivado dela. Corrigir o arnês vem antes de
otimizar navegação com base nesses números. Além disso, `botsim all` lista quatro mapas
manualmente e omite `fy_quebrada`, embora o workflow descreva cobertura dos cinco mapas.
O conjunto deve ser derivado do catálogo canônico e os baselines recalibrados depois da
correção das matrizes.

#### 3. O navegador real não está coberto nos pontos mais frágeis

`smoke-web.yml` valida rotas e assets, mas `eval:grafite`, `eval:grafite:ar` e
`eval:select` continuam fora do gate. O resultado é uma cobertura forte de regras em Node
e uma lacuna exatamente em GLB, raycast visual e pose final. O gate deve rodar somente
quando mapas, personagens, texturas ou o gerador mudarem, para não impor quatro minutos a
todo PR.

#### 4. As fontes Docusaurus e o site estático podem divergir

O CI de PR valida os blocos numéricos das fontes, mas ainda não reconstrói `public/docs`
nem compara o resultado commitado. Esta atualização corrige os dois caminhos de release e
fez a reconstrução atual; ainda convém um job por paths em PRs de documentação, executando
`npm ci` em `docs/`, `npm run build:site` e falhando se houver diff.

### Arquitetura e manutenção

#### 5. `Game` é o principal gargalo de mudança

O Graphify mostra `Game` com 151 conexões. `public/js/game.js` tem 6.289 linhas e mistura
loop, regras de modo, bots, colisão, HUD, áudio e viewmodel; `main.js` tem 1.949 linhas e
`index.astro`, 1.059. Isso aumenta conflito de merge e torna mudanças locais difíceis de
provar. A extração deve seguir fronteiras já testáveis: estado/resultado de partida,
controle de bots, HUD e submissão/telemetria. Uma reescrita total seria mais arriscada.

#### 6. A identidade ainda é `nick + token`

O `uid` enviado por `register`/`submit-match` hoje serve ao log interno; autenticação e
consultas ainda localizam o jogador por `nick + token`. Se o contrato desejado é UID, isso
exige migração explícita: UID estável e único em `players`, RPCs por UID, compatibilidade
temporária para clientes antigos e teste de replay/migração. Alterar apenas o nome do campo
no cliente não resolve a identidade.

#### 7. `/mapa` ainda usa leituras potencialmente truncadas

Os totais legados fazem `select` de todas as linhas de `stats` e `city_daily`. O limite
padrão do PostgREST pode truncar a resposta quando a base crescer, produzindo total público
errado sem erro. Contagens e somas devem vir de view/RPC agregada; os cinco counts de
`match_events` adicionados nesta atualização já usam `head + count: exact` e não têm esse
problema.

#### 8. Upload de avatar ignora falhas de persistência

`avatar.ts` não verifica o erro do upload nem o erro do update em `players`; pode devolver
`ok` e uma URL que não foi persistida. A rota deve distinguir falha de transformação,
storage e banco, registrar o detalhe interno e devolver erro sanitizado.

#### 9. Comentários de produção acumulam histórico

O comentário da revisão é válido. Cronologia extensa dentro do template duplica docs e
fica desatualizada. Nesta atualização, os blocos tocados em `index.astro` e `/mapa` foram
reduzidos a invariantes/compatibilidade. A limpeza restante deve ser incremental, sempre
que o arquivo for alterado, sem um PR mecânico gigante.

### Dependências e ambiente

#### 10. Há 32 alertas de dependência e o ambiente local não é fixado no pacote raiz

- app: 10 alertas (8 high, 2 moderate);
- docs: 22 alertas (11 high, 11 moderate);
- nenhum crítico.

O teste de atualização do Docusaurus 3.6.3 para 3.10.2 piorou o resultado para 24 alertas,
apesar de `npm audit` sugerir essa versão como correção; a tentativa foi revertida. No app,
parte da cadeia passa pelo adaptador Vercel e o audit sugere um downgrade major incoerente.
É necessário acompanhar releases upstream e revisar exposição real, não executar
`npm audit fix --force`.

O CI usa Node 22, mas o `package.json` raiz não declara `engines` e a máquina local caiu em
Node 16 durante uma instalação. Fixar Node 22 em `engines` e `.nvmrc` evita builds locais
com runtime incompatível.

#### 11. O pipeline é forte, mas caro e duplicado

`ci.yml`, `check:fast`, `check`, deploy e Vercel repetem subconjuntos diferentes. Isso é
compreensível pelo custo dos assets, porém a matriz não está representada em uma fonte
única. Um catálogo declarativo de gates por risco/path reduziria drift entre CI, deploy,
staging e pré-release.

## Sequência recomendada

1. #116 e #51, com mutantes e baselines renovados.
2. Gate seletivo de navegador e frescor de `public/docs`/grafite.
3. Consolidar/fechar backlog conforme a auditoria de issues.
4. RPC/view agregada para `/mapa` e tratamento transacional do avatar.
5. Migração planejada de identidade para UID.
6. Extrair módulos de `Game` somente ao tocar nas respectivas regras.
7. Atualizar dependências quando upstream publicar uma cadeia que realmente reduza o audit.

## Verificação executada

- build Astro/Vercel: verde;
- build Docusaurus PT e EN em `public/docs`: verde;
- smoke público: 13/13 rotas e todos os JSON-LD verdes;
- boot em Chrome: B1-B7 verdes, incluindo console, modal, relatório e ausência de falso watchdog;
- telemetria TL1-TL10: verde; o mutante que remove as cinco facções deixa TL10 vermelho;
- viewmodels, invariantes, recoil e bots: nenhuma falha crítica nova; 40/53 críticas
  verdes e as 13 dívidas existentes permanecem no ratchet. A execução de bots cobriu os
  quatro mapas hoje enumerados pelo script e revelou a omissão de `fy_quebrada`;
- `check:fast`: 23/24 passos verdes nesta worktree. `audio:check` não pôde validar
  porque os arquivos de áudio são ignorados pelo Git e não estão no checkout isolado;
- `docs:check`, `arch:check` e `git diff --check`: verdes;
- auditoria de dependências: 10 alertas no app e 22 nas docs, sem crítico.
