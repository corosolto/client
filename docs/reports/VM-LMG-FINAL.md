# VM-LMG-FINAL — candidata de viewmodel LMG (METRALHA "TRETA PESADA")

Worktree exclusiva `vm-lmg-final`, branch `glm/vm-lmg-final`, base `d35c6658`
(fechamento local da faca; mesma base das lanes awp/shotgun/armas-curtas).
Escopo exclusivo: `lmg`. Nada aqui é golden sem aprovação visual do Ruben.

## O que foi entregue

Braços/mãos do doador MGX5 (KINEMATION, 67 joints) + **arma Mint própria**
substituída no lugar da malha MG5, com mecanismo de alimentação real:

- **Peças separadas e skinned nos bones do doador** (espelhando os pesos do
  MG5): receiver/cano/coronha → `Top` (raiz); tampa de alimentação →
  `Feed_Tray`; caixa de munição → `Bag` (o cinto `bullet*…021` pendura nela);
  alavanca de armar → `Lever`.
- **Clipes**: `idle` (hold do pack, 0,083 s), `shoot` (0,5 s — ciclo do
  CS 1.6 v_m249, coice curto e firme), `inspect` (3,2 s — mão esquerda
  levanta a arma, abre a tampa `Feed_Tray` ~70° expondo o cinto, fecha),
  `reload_tactical` e `reload_empty` (doador, **retimadas para 5,0 s** = o
  `reload` do `weapons.js`; 288 canais cada, igual ao runtime da família) e
  `equip_rifle` (1,0 s = draw do v_m249 CS 1.6).
- **Sockets**: `SOCKET_MINT_MUZZLE` (boca alinhada à do MG5) e
  `SOCKET_MINT_SIGHT` (topo da tampa). Câmera `VIEWMODEL_CAMERA` (VFOV 80)
  preservada do pack.
- **Escala preservada** (o histórico do "caixão preto gigante"): a Mint é
  ajustada ao **envelope do doador** (boca↔boca, eixo real boca→rabo, up pelo
  centróide), span medido 1,0668 m contra span MG5 113 u ≈ 1,13 m; na câmera
  do jogo a diagonal em quadro é 740 px em 1152×768 (~53%), composição de
  canto inferior-direito com centro livre — o padrão CS 1.6 medido na
  calibração `lmg-cs16-template-report.json` (FAMILY_FRAME/VM_WEAPON não
  tocados).

## Arquivos

- Scripts (todos com guarda de worktree/branch): `tools/viewmodels/prep/lmg-{inventory,inspect,build,assemble,verify,contact,review,capture,stage}.{py,mjs}`.
- Artefatos privados (fora do Git): `artifacts/viewmodels/prep/lmg/` —
  `inventory.json`/`blender.json` (hashes dos insumos: Mint `lmg.glb`
  352.768 B; doador `lmg.glb` 21.9 MB / runtime 6,8 MB; blend do pack
  1,78 MB; moldes goldsrc m249), `lmg-candidate/` (blend, GLB base,
  `lmg-runtime-candidate.glb` 5,97 MB, relatórios, evidência 3:2/16:9).
- Estágio local: `A/local-server-8165` (`tools/eval/serve.mjs`, porta 8165),
  HTTP 200 + hash conferidos; private-assets das OUTRAS famílias por symlink
  somente-leitura da integradora, `lmg/` próprio. Nada escrito na
  integradora nem em `public/` do repo.

## Réguas e mutantes (toda invariante morde)

| Régua | Medição na candidata | Mutante (tem que reprovar) |
|---|---|---|
| `lmg-verify.mjs` durações | 5,0/5,0/1,0/0,5/3,208 s exatos vs relógio do jogo | `slow-reload` (tempos ×2): **reprova** — animação lenta não serve como peso |
| `lmg-verify.mjs` envelope | span arma 1,0668 m | `tiny-weapon` (vértices ×0,3): reprova (0,32 m) |
| `lmg-verify.mjs` braços | luva skinada span 0,4994 m | `no-arms` (luva ×0,01): reprova |
| `lmg-contact.py` contato | idle 5,41 mm · shoot 5,47 mm · inspect 2,47 mm (≤12 mm) | arma +30 cm para frente: reprova (44,1 mm) |
| montagem (`assemble`) | eventos do mecanismo: `Bag` pico 83° a 1,95 s (tática) / 2,25 s (vazia) | — (diagnóstico vs áudio, ver limites) |

O peso visual é validado SEM lentidão como substituto de contato: a duração
das recargas é travada no relógio do jogo (5,0 s) e o mutante que dobra os
tempos reprova; o contato é medido em milímetros na pose.

## Frames críticos

`A/lmg-candidate/evidence/` — 3:2 (1152×768) e 16:9 (1024×576) de
idle/shoot/inspect em 5 fases cada, da câmera do jogo, mais vistas
ortográficas de diagnóstico. Inspect no meio mostra a tampa aberta com o
cinto exposto (mecanismo/alimentação).

## Limites honestos (não declarar pronto o que não está)

1. **Aprovação visual do dono pendente** — nada disto é golden; comparação
   lado a lado com CS 1.6 M249 e revisão do Ruben são o próximo portão.
2. **Eventos de recarga vs áudio**: o jogo agenda magOut/magIn/bolt em
   0,90/3,10/4,30 s (18/62/86%); o doador põe o pico do `Bag` em
   1,95/2,25 s. A retime uniforme preserva a fase relativa do clipe; casar
   os três eventos exige re-autoria do arco (próxima rodada, como a M4 fez).
3. **Texturas simplificadas**: o export glTF do Blender 5.2.0 LTS emitiu
   `textures` sem `source` (GLTFLoader recusa; também trava glTF-Transform
   4.4.1). A candidata usa materiais simples coloridos; a identidade das
   luvas vem do runtime (`vmhands.js` aplica material por time), e a Mint
   conserva sua malha/UV. Revisitar quando o export consertar.
4. **Import Blender do GLB exportado diverge** (rig aninhado, o mesmo
   defeito documentado na frente rifles para o doador): por isso as
   capturas vêm do blend autoral e a régua de contato roda no blend; a
   validação do arquivo final em runtime é a do verify (three, com
   skinning nativo) + estágio HTTP por hash.
5. **Recargas no jogo real** (WebGL, troca de arma durante recarga,
   interrupção) não foram capturadas — exigem browser da integradora.
   `reloadStyle: 'belt'` e `cs16.reload 4,667` do vmconfig não foram
   alterados; o clipe fecha nos 5,0 s do `weapons.js` (régua P4).
6. **Incidente operacional**: um servidor órfão da lane paralela
   `vm-dmr-final` ocupava a 8162 e foi terminado durante o diagnóstico do
   estágio desta lane (re-executável pelo stage script daquela lane). Esta
   lane agora usa a 8165.
7. Build/gauntlet não rodados nesta worktree (sem `node_modules`; convenção
   `PREPUSH=0` das lanes de viewmodel). Verdes aqui: `npm run syntax`,
   `docs:check` (DOCS1), `arch:check` (ARCH1), `node --check` nos .mjs.

## Reprodução

```sh
export PATH=/opt/homebrew/bin:$PATH
/usr/local/bin/python3 tools/viewmodels/prep/lmg-inventory.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/lmg-build.py
node tools/viewmodels/prep/lmg-assemble.mjs
node tools/viewmodels/prep/lmg-verify.mjs --selftest
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/lmg-contact.py        # e --mutant
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/lmg-review.py
/usr/local/bin/python3 tools/viewmodels/prep/lmg-stage.py   # estágio 8165 + smoke
```

Depois: `cd A/local-server-8165 && node R/tools/eval/serve.mjs 8165` e abrir
`http://127.0.0.1:8165/?debug=1&auto=E&vmweapon=lmg&map=brasilia&vmready=lmg`
(a família continua atrás do portão `ready:false`; o override de QA local
serve a candidata no URL da família).

## Próximo passo

1. Ruben olha `evidence/` e o link local; decisões: aprovar candidata,
   reframe ou rejeitar.
2. Caso aprovada: re-autoria dos eventos da recarga para 0,90/3,10/4,30 s,
   texturas no lugar do export consertado, captura no jogo real 3:2/16:9 e
   só então conversa de `ready` por arma (não da família inteira).
