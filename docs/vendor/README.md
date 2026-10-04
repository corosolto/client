# Correção local de `braces` para a documentação

O pacote publicado `braces@3.0.3` sofre estouro de pilha com padrões de chaves profundamente aninhados ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). Em 2026-10-04 não havia versão corrigida no npm. Este tarball contém o código do [PR upstream #72](https://github.com/micromatch/braces/pull/72), commit `28d440b5dd449dbf1fe6f3506cf94ecca4d02660`, com **apenas** a versão do `package.json` alterada de `3.0.3` para `3.0.4-csbrasil.0`. Essa é uma versão local, não um release oficial. A licença MIT está no tarball.

Reprodução com Node 23.6.0 e npm 11.6.0:

```sh
git clone https://github.com/FSDevelop/braces.git
cd braces
git checkout 28d440b5dd449dbf1fe6f3506cf94ecca4d02660
npm pkg set version=3.0.4-csbrasil.0
npm pack --silent
shasum -a 256 braces-3.0.4-csbrasil.0.tgz
```

SHA-256 esperado: `bf27d85726cdf54f9cce8892f8c7022584ef9b1a938c414cb9d1786535020bff`. O `npm pack` reproduziu exatamente esse hash duas vezes. No checkout upstream, 904 testes passaram. Na documentação, `npm ci`, `npm audit` (zero vulnerabilidades), `npm run build` (pt/en) e `npm run check:braces-patch` passaram. O teste de regressão usa um padrão abaixo do limite de 10.000 caracteres: `braces@3.0.3` lança `RangeError: Maximum call stack size exceeded`; este pacote rejeita a profundidade com `SyntaxError`.

O pacote é usado no processo de build da documentação estática. Substituir o tarball e a dependência local por um release oficial corrigido assim que existir, preservando o teste de regressão.
