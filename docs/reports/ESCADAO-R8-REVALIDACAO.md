# Escadão R8 — revalidação contra `main`

Data: 22/09/2026. PR: #567. Branch: `codex/escadao-r6-stack`.
Base integrada: `60ad7501323ef076263f645bfca341e2454fce6b` (`v2.0.0-alpha.262`).
Correção map-local: `38541cecfd1a9215076ab0caf0d3d34fe15a83f1`.

## Resultado e escopo

O Escadão voltou a ficar tecnicamente apto para playtest humano. O delta desta rodada é
restrito a `public/js/map_escadao.js`: o spawn superior recua 1,5 m e o objetivo CTF
`RUA` sai do corredor protegido para o bolsão oeste aberto. Paredes, janelas, interiores,
materiais compartilhados e runtime não mudaram.

O A/B causal removeu os dois vermelhos marginais do `botsim` sem abrir linha de visão
para spawn. Os contratos de casa central, casas do mirante, janelas opostas, escadas,
rotas e CTF continuam verdes. O PR deve permanecer draft até o aceite visual/jogável.

## Espaço jogável preservado

- Casa central: piso contínuo em 60 células, janela para a escada, janela oposta para a
  rua/respawn, tiro e revide reais, entrada e retorno físicos e rota de bot com 24 nós.
- Casa frontal: janelas opostas e rota de bot com 23 nós; todas as posições internas
  testadas bloqueiam linha direta aos slots de nascimento.
- Mirante/respawn superior: duas entradas independentes no abrigo central, acesso pelos
  dois flancos, casas laterais alcançáveis, janelas de contrajogo e retorno ao time alto.
- Escadas e conflito: 10/10 lances levam a destino; 669/669 nós conectados; oito rotas
  para a Deagle; zero LOS spawn×spawn/flanco e zero LOS alto→spawn.
- CTF: quatro anéis visíveis, raio de captura 4,5 m, folga vertical 0,084–0,156 m e
  largura aproximada de 0,073 m. O ponto `RUA` continua conectado às três rotas.

## Bots 5×5 e 8×8: A/B causal

Protocolo: código real do jogo em Node, 60 segundos, nove sementes fixas por célula.
Teto do projeto: `stuck ≤ 4%`.

| modo | time | antes stuck | depois stuck | spinRoam depois | eficiência depois | estado |
|---|---:|---:|---:|---:|---:|---|
| DM | 5×5 | 2,533% | 1,944% | 0,059 | 0,168 | verde |
| DM | 8×8 | **4,011%** | 1,089% | 0,040 | 0,140 | verde |
| CTF | 5×5 | **4,378%** | 3,467% | 0,067 | 0,242 | verde |
| CTF | 8×8 | 2,622% | 3,511% | 0,043 | 0,171 | verde |

Recibos locais ignorados pelo Git: `artifacts/escadao-r8-alpha262/bots/`.

## Gates, mutantes e contraprovas

Baselines verdes: `escadao-contract`, `rota`, `facade`, `graph`, `home`,
`conflict-home`, `casa-central`, `casas-conflito`, `mirante-abrigo`, `structure`,
`descent`, `details`, `mapcontrato` e `webgl-compat`.

Os 26 mutantes específicos do Escadão foram detectados, incluindo janelas vedadas,
piso reaberto, acesso removido, saídas do mirante seladas, escada morta, abrigo removido,
grafo impossível, guarda ausente, massa removida e snap removido. O mutante genérico de
`quality-mapas` não pode ser atribuído nesta branch: baseline e mutante já reprovam em
`public/js/map_penitenciaria.js:335` por QMAP1/QMAP3, exatamente como `origin/main`
alpha.262; nenhum arquivo dessa frente toca a Penitenciária.

No Chrome/WebGL real:

- EV0–EV7: 8/8 verdes; 144/144 séries finitas, 12/12 subidas/retornos, 134/134 visitas
  com retorno, zero colisões de cabeça, zero amostras sem piso e 21 contatos normais.
- Mutantes `varal-na-rota`, `escada-bloqueada` e `sem-abrigo`: 3/3 mordidos.
- Mutantes dos anéis `anel-plano`, `anel-enterrado` e `anel-colapsado`: 3/3 mordidos.
- Fonte local e servida em 8148: SHA-256
  `d984d2e5fc5dcdd609a9aecf44907d20b852abc38db67ed83e2ef4fb3062e1aa`.

## Evidência visual e orçamento

As 21 câmeras foram recapturadas em cada aspecto. Elas mostram a casa central, as duas
janelas, os dois interiores do mirante, acessos laterais, becos, escadas, patamares e
retornos. A revisão automatizada confirma geometria e enquadramento; aprovação estética
continua humana.

- 3:2: `artifacts/escadao-r8-alpha262/browser/escadao-alpha262-3x2-contact.jpg`,
  SHA-256 `c66339f22f80ef935254e5b6c81404427398e5fe4c28dfca21ba40a41e9e2a34`.
- 16:9: `artifacts/escadao-r8-alpha262/browser/escadao-alpha262-16x9-contact.jpg`,
  SHA-256 `827522c9b5058ad9b0e7881ac8a2fc434030e221228dccb153842e728a24a23c`.
- Runtime EV0–EV7: SHA-256
  `c916721a5dde612abf9bc0e2feb7491f78a70e425de8514a68a47ab4c568dbd5`.
- Anéis CTF: SHA-256
  `c33ba99635a9a1f36bb860082e8a9373854ab64a785d2512aef3f21fb3f50920`.

`CENA` mediu o Escadão após 30 s: 380/460 draw calls e 809.447/930.000 triângulos,
com CENA1–CENA4 verdes. A sonda de agendamento em CTF 8×8 registrou p95 16,3 ms em
3:2 e 10,1 ms em 16:9, sem `pageerror`, mas encontrou zero bots em movimento no instante
da amostra e renderer genérico. Ela prova boot/render e orçamento de cena, não FPS/GPU
de uma sessão humana.

## Inventário de assets ausentes

O replay real reproduziu **45 requisições 404**, correspondentes a **44 caminhos únicos**:
32 PNGs de decalque, 10 MP3 e dois manifestos JSON. `audio/manifest.json` foi solicitado
duas vezes. O recibo completo é
`artifacts/escadao-r8-alpha262/assets/inventory.json`, SHA-256
`c24127ea49e1dc90cb9cdb3e5363653652c3d5d6199eb9deded7d7934210c638`.

Essa dívida já existe em `origin/main`; a branch não removeu, copiou nem adicionou asset
privado/Mint. Por isso as capturas terminam com o inventário de 404 explícito, embora as
21 poses, GLBs, movimento, janela de tiro e geometria sejam produzidos antes da asserção.

## Teste humano pedido

Servidor: `http://127.0.0.1:8148/?debug=1&map=escadao&auto=B,sertanejo&ctf=1`

1. Nascer no alto e confirmar saída fluida nos quatro slots, sem exposição direta.
2. Entrar nas duas casas do mirante pelas laterais e usar as janelas para contrajogo.
3. Entrar na casa central, verificar a janela da escada e a janela oposta para a rua.
4. Disputar o objetivo `RUA` no bolsão oeste em CTF 5×5 e 8×8.
5. Repetir DM 8×8 procurando bots parados e decidir se arquitetura, leitura das rotas
   e pontos de conflito estão visual e competitivamente aprovados.

Até esse aceite, o estado correto é **GO técnico para continuar draft**, não promoção.
