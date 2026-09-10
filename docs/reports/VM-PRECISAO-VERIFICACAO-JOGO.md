# Verificação no jogo real das três snipers da lane `codex/vm-prep-precisao` (08/09)

A lane declarou `pronto:true` com julgamento visual sobre **renders offline** — limitação
que ela própria declarou. Isto aqui é a medida no jogo, feita **antes** de qualquer
`ready:true`, em raiz isolada: nenhuma raiz compartilhada foi tocada.

## Como foi montado

Raiz de staging em `/private/tmp/.../stage-precisao`, com `public/js`, `models`, `audio`,
`vendor` por symlink do checkout e `js/data/vmconfig.js` como cópia real com
`mosin: W('bolt', { baked: true })`, `svd: W('svd', { baked: true })`,
`sks: W('marksman', { baked: true })`. Os três `*-baked-runtime.glb` copiados de
`A/final/` da lane. Servidor em 8168.

**Armadilha paga aqui:** deixar o `bolt-runtime.glb`/`svd-runtime.glb`/
`marksman-runtime.glb` antigos ao lado do baked faz a família carregar as duas coisas — a
Mosin apareceu como um objeto compacto com as mãos fora do quadro. Removidos os runtimes
antigos da raiz isolada, o sintoma sumiu. **Era o staging, não o asset.**

## Medida (jogo real, `piscina_treta`, 3:2 e 16:9)

Estado estável (idle e recargas), com o instrumento corrigido:

| arma | mão em quadro | arma em quadro | contato |
|---|---|---|---|
| `mosin` | 260–284 / 307 | 243–270 / 306 | 0–1 px |
| `svd` | 216–282 / 307 | 236–248 / 308 | 0–1 px |
| `sks` | 202–273 / 307 | 236–262 / 304 | 0–1 px |

As três carregam pelo caminho baked, desenham a arma própria com as duas mãos e contato
de 0–1 px. O pente procedural da Mosin e da SKS (`GEO_PROC_CartridgeClip0..4`, materiais
`CoroSolto_precisao_steel`/`_brass`) aparece em quadro durante a recarga.

## O que a medida no jogo pegou e o render offline não pegava

**`svd/reload-f015`: viewmodel inteiro fora do quadro, de forma INTERMITENTE.** As malhas
estão visíveis (amostra 308) e **zero** em quadro; a tela fica sem arma e sem mãos com o
HUD marcando `SVD "VODKA" · RECARREGANDO`. Reproduzido em 2 de 4 rodadas; nas outras o
mesmo instante mede 238/308. Figura:
`artifacts/viewmodels/arsenal/precg32-autorado-32/svd-reload-f015.png`.

O estado aparece na saída da luneta. A AWP existente (família `sniper`, fora desta lane)
NÃO reproduz — mediu 234–260 de 307 em todas as capturas, inclusive mirando. Ou seja: é
específico das entradas baked desta lane ou da interação delas com o `_scope`, e não do
caminho de luneta em geral.

## Veredito

As três armas medem bem no estado estável, nos dois aspectos. **Não recomendo `ready:true`
enquanto o `svd/reload-f015` não for entendido**: é exatamente o defeito que o dono
reprovou em 07/09 — arma sem mãos e sem arma na tela — só que intermitente, que é a forma
mais cara de deixar passar.

Pendências da lane que continuam com o integrador: cópia para `private-assets`,
`optimize_paid_family.mjs` por família, `baked:true`/`ready:true` no vmconfig com bump de
`CATALOG_VERSION`, e re-rodar os gates dela sobre os otimizados.

## O que esta verificação NÃO fez

- Não rodou o otimizador de texturas: os GLBs medidos têm ~24,3 MB cada, não os ~5,2 MB
  previstos depois da otimização. Escala e enquadramento não devem mudar; material pode.
- Não mediu `inspect` nem `equip` (o driver cobre idle, ADS, fire e 4 instantes da recarga).
- Não julgou o pente procedural da Mosin/SKS além de "aparece em quadro".
