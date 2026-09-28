---
nome: audit-cve
quando: diaria
ativo: true
---
`npm audit --package-lock-only --audit-level=high` com CVE alta → issue com a
lista. O jogo roda no browser sem deps de runtime, mas o arnês/devDeps da
máquina de build também é máquina da categoria.
