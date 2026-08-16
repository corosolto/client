# Verificar os hashes do `skills-lock.json`

**Dificuldade:** média · **Área:** supply chain · **Tempo:** ~2 h

## Contexto

`skills-lock.json` registra 31 skills de terceiros, cada uma com um
`computedHash` SHA-256. **Nenhum script valida esse hash contra nada.** Um lock
file que não é verificado é um arquivo de texto com números bonitos: ele não
detecta se o conteúdo de uma skill mudou depois de travada.

## O que fazer

1. Criar `tools/verify-skills.mjs` que, para cada entrada do lock, recalcula o
   SHA-256 do conteúdo correspondente e compara.
2. Definir **exatamente** o que entra no hash (lista ordenada de arquivos, com
   quebra de linha normalizada) e escrever essa definição num comentário no topo
   do script — hash sem algoritmo documentado não é reproduzível.
3. `npm run verify:skills` no `package.json`, e um passo no
   `.github/workflows/ci.yml`.
4. Saída útil na falha: qual skill, hash esperado × obtido.

**Contexto necessário:** `.agents/skills/` deixou de ser versionado nesta
release (as skills passam a ser instaladas a partir do lock). O script tem que
funcionar tanto com o diretório presente quanto ausente — quando ausente, PULA
com aviso, não falha.

## Critério de aceite

- [ ] `npm run verify:skills` passa com o lock atual
- [ ] Alterar 1 byte de uma skill faz o comando sair com código 1
- [ ] Sem `.agents/skills/`, o comando avisa e sai 0
- [ ] Roda no CI

## Arquivos

`tools/verify-skills.mjs` (novo) · `package.json` · `.github/workflows/ci.yml`
