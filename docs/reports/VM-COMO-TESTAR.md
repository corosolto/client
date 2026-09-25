# Como testar os viewmodels depois de reiniciar a máquina

Roteiro de partida fria. Nada aqui depende de servidor que tenha ficado de pé.

## 0. Onde

O repositório é o mesmo por dois caminhos — `~/csbrasil` é symlink para
`/Volumes/Zenith/Projects/game/corosolto/csbrasil`. Para trabalho normal tanto faz.

## 1. Ver com os próprios olhos

```bash
cd ~/csbrasil/client
node tools/eval/serve.mjs 8167
```

No Chrome, e **jogando normal**:

```
http://127.0.0.1:8167/?vmready=ak,ar,mp5,smg,p90,g3,marksman,svd,sniper,bolt,deagle,pistol,revolver,shotgun,lmg
```

O `vmready` é o que liga o viewmodel autorado; **sem ele você vê o caminho legado**, que é o
que está no ar hoje (nenhuma família tem `ready: true` em `public/js/data/vmconfig.js`). O
rótulo `vm: AUTORADO (familia)` no canto inferior esquerdo confirma o caminho na tela.

Para pular direto numa arma: `&debug=1&vmweapon=carbine` (o `debug=1` é obrigatório para
esse parâmetro). O A/B mais útil é abrir a mesma URL **sem** `vmready` e comparar.

## 2. Portões

```bash
npm run check:vm                 # grupo de viewmodel inteiro
npm run eval:vm-attach           # arma sem malha própria não pode virar luva vazia
npm run eval:vm-attach-legado    # nem pode virar a AWP no lugar de outra
```

Os três sobem o próprio servidor. `INCONCLUSIVO` no `-legado` não é reprovação do jogo: é a
régua dizendo que não conseguiu criar a condição de teste.

## 3. Medir e julgar por número

```bash
node tools/viewmodels/prep/vm-arsenal-frames.mjs --porta=8167 --aspecto=32 \
  --mapa=piscina_treta --modo=autorado --armas=akm,carbine,m92 --tag=meu

node tools/eval/vm-arsenal-check.mjs artifacts/viewmodels/arsenal/meu-autorado-32/frames.json
```

`--aspecto=169` para 16:9 (o dono joga em 3:2, que é o `32`). `--modo=legado` para o caminho
de hoje. Saída: `frames.json` + um PNG por captura em
`artifacts/viewmodels/arsenal/<tag>-<modo>-<aspecto>/`.

## 4. Como ler os números

| campo | o que é | referência medida |
|---|---|---|
| `contato_3d_cm` | vão entre mão e arma, em cm, em 3D | `ak` aprovada = 0,2; teto do portão = 1,0 |
| `arma_diam3d_cm` × `len_declarado_cm` | tamanho renderizado × declarado em `weapons.js` | 21 das 25 batem dentro de 2% |
| `razao_arma_mao` | escala com denominador comum (a luva é o mesmo asset da família) | `ak` = 1,12 |
| `maoEmQuadro` / `maoAmostra` | quanto da mão está no quadro | quebrada mede 0 |
| `fonte` | `mint` (malha própria) ou `pack` (fallback) | `pack` = o GLB Mint não chegou |
| `assentou` | se o viewmodel parou de se mover antes da captura | `false` = capturou em voo |

## 5. Duas armadilhas já pagas

- **Um browser por vez.** Duas capturas headless em paralelo derrubam o boot e falsificam a
  medida.
- **Confira a carga da máquina antes** (`uptime`). Com load alto o `page.goto` estoura e a
  captura sai zero — parece defeito e não é. Já aconteceu nesta frente com load 200.

## 6. O que está aberto

- Vão mão↔arma só na RECARGA: `svd` 1,8–2,0 cm, `lmg` 1,9, `mosin` 1,3 (teto 1,0). É caminho
  de animação, não de encaixe.
- Nenhuma família tem clipe de saque; 13 das 16 não têm clipe de disparo.
- Nada está `ready: true` — o jogador ainda não vê nada disso.
- 11 GLBs candidatos das lanes seguem sem integrar (ver `VM-MAPA-DAS-LANES.md`).
