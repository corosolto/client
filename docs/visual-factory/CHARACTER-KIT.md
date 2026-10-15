# Kit de personagens, roupas e acessórios — contrato draft v1

## Estado verificável

Implementado: `tools/character-kit/` contém CLI offline, contrato estrito,
inspetor básico GLB, gerador de exemplo sintético e testes adversariais. Nenhuma
integração runtime, migração, auto-rig, exportador Blender, skin real ou aprovação
visual foi entregue por esta etapa. `TRETA_ITEMS_ENABLED` permanece `false` em
`public/js/treta-features.js`.

A ferramenta prova integridade e coerência **declarada** do pacote. Um autor pode
declarar um family/fit/rig incorreto e ainda passar; o teste não prova geometria,
bind pose, direitos de uso nem ausência de clipping. `restPoseSha256` é uma
atestação declarada de revisão de rig; nesta versão compara-se a identidade,
sem recalcular o digest de bind matrices. Antes de produção, precisamos de um
exportador que produza uma representação canônica de hierarquia, transforms e
inverse bind matrices, e de verificação independente desse digest. Não basta
renomear ossos ou copiar o mesmo identificador.

## O que reutilizar do jogo

- `public/js/glbchars.js`: clone de skeleton por instância, cache de skins,
  clipes por personagem, `rigCompatibleWith` e fallback quando a skin precisa
  de animações próprias. Materiais também precisam de isolamento por instância.
- `public/js/eyewear.js`: exigência de aprovação de item **e** perfil, mount no
  `Head`, transformação para espaço de bind, e kill switch anterior ao preload.
  Sua heurística por bounds de cabeça não vira ajuste universal de roupas.
- `tools/retarget-glb.mjs` e `tools/retarget-mixamo.mjs`: bake por personagem;
  nomes iguais não significam mesmos comprimentos, eixos ou pose de repouso.
  Retarget de movimento não faz skinning nem corrige topologia.

Os arquivos atuais continuam donos do comportamento em produção. O kit não
substitui seus manifestos nem pode promover `approved: true` automaticamente.

## Contrato de contribuição

`schemaVersion = cs-character-kit/1` versiona a API offline. `rig.id` +
`rig.revision` versionam a família de esqueleto; `restPoseSha256` identifica a
revisão declarada do repouso. `status` só aceita `draft`. O gerador de exemplo é
a referência executável de todas as chaves obrigatórias; campos extras falham,
inclusive `owned`/`approved`/preço adicionados pelo contribuidor.

| Parte | Contrato v1 |
|---|---|
| Coordenadas de destino | Metros, +Y para cima, +Z para frente; importadores legados precisam de adaptação explícita. |
| Papéis mínimos de rig | Hips, spine, head, mãos esquerda/direita, pés esquerdo/direito, mapeados para nomes de joints reais. É identificação mínima, não rig completo de animação. |
| Body family | Proporções/topologia compatíveis, por exemplo uma família humana base; corpos caricatos com silhuetas distintas podem exigir famílias próprias. |
| Fit profile | Variante exata dentro da família; mudanças de peito, ombro, quadril, cabeça ou calçado podem pedir novo fit. v1 aceita um corpo/perfil por pacote. |
| Socket | `face`/`head`: osso mapeado, posição em metros, quaternion XYZW normalizado e escala positiva no espaço local do osso. |
| Asset | Caminho GLB relativo, SHA-256 real dos bytes, autor, origem, licença declarada e arquivo local de evidência. |
| Catálogo | `catalogId` identifica a proposta visual; não prova compra, estoque, disponibilidade, moderação ou direito de equipar. |

O arquivo de procedência deve registrar URL/origem, autoria, termos de uso,
data, fontes de texturas e derivação. O CLI só exige registro não vazio e arquivo
existente: a revisão de licença continua humana. Nunca usar modelos extraídos
sem autorização dos jogos de referência como assets da loja.

## Duas formas de montagem

**Rígido:** óculos e boné são filhos de um socket. Não precisam acompanhar cada
vértice da pele, mas exigem offset específico do fit, ensaio com cabelo/cabeça e
checagem de visibilidade da câmera. O CLI recusa skin em item rígido.

**Skinned:** luvas, camiseta, jaqueta, calça e tênis precisam de pesos e bind pose
compatíveis com o corpo. O CLI exige malha skinned e papéis mínimos de ossos; não
verifica valores dos pesos, costuras ou transferências. Uma jaqueta não pode
ser anexada ao peito como se fosse um acessório rígido. Transferência de pesos
pode acelerar o trabalho no Blender, seguida de correção e revisão artística;
nenhum algoritmo de proximidade vira auto-rig universal.

| Slot | Tipo / socket | Ordem de camada | Regiões do corpo que pode propor ocultar |
|---|---|---:|---|
| eyewear | rigid / face | 10 | nenhuma |
| headwear | rigid / head | 20 | scalp |
| gloves | skinned | 10 | hands |
| shirt | skinned | 10 | torso, arms |
| jacket | skinned | 20 | torso, arms |
| pants | skinned | 10 | legs |
| shoes | skinned | 10 | feet |

Os números são ordinais de composição, não distâncias nem métricas de qualidade.
Uma peça por slot; `excludes` resolve conflitos específicos e é verificado nos
dois sentidos. Camiseta e jaqueta podem coexistir, mas a camada maior **não** prova
que a jaqueta cabe sobre a camiseta. `hideBodyRegions` só propõe máscara do corpo;
não oculta automaticamente a roupa interna nem resolve clipping. A versão de
produção precisará de regiões realmente separáveis no mesh e combinações
explicitamente revisadas. Unsupported slots exigem revisão do contrato.

## Fábrica futura e fronteiras

### Empunhadura como requisito de entrega

A investigação separada de 15/10 encontrou Curl_L/R ponderados em sertanejo e
mst e tracks de identidade que apagavam o fechamento a cada frame. Um experimento
na branch `codex/visual-factory-20261014` preserva esses atuadores em cópias de
clipes e usa gates próprios de deformação/eventos. Esses ajustes de runtime e
seus gates ainda não fazem parte desta camada de ferramentas. O ensaio visual
continuou abaixo do aceite e a política de canais precisa preservar animações
autorais de futuras skins antes de promoção.

Um pacote de skin precisa declarar quem controla os dedos e evitar disputa entre
clipes e pose de empunhadura. O perfil de cada arma/rig deve incluir encaixe do
cabo, orientação de punho, apoio no guarda-mão e poses de mira, tiro e recarga.
Medir a âncora do mount ou atingir um alvo de IK não prova contato com a superfície
da arma. Exigir vistas dos dois lados das mãos e revisão de polegar, índice,
dedos de apoio e clipping durante as transições antes de promover o pacote.

O primeiro A/B da investigação separada teve melhora parcial de 3 para 4/10 pelo crítico independente:
dedos direitos mais curvos, mas apoio da AK e mão esquerda do revólver continuam
ruins. Nenhum perfil artístico final ou sistema de sockets por arma foi entregue.

1. Artista prepara corpo padrão, pose de repouso e sockets em arquivo Blender
   versionado. Entrega envelope de proporções e conjunto de poses de teste.
2. Nova skin escolhe família existente ou abre família nova. Fazer rig/weights,
   bake das animações e ajuste de contatos antes da exportação.
3. Roupas seguem a mesma base e têm variante de fit quando necessário. Exportador
   registra hashes, revisão do rig e relatório; validador glTF completa o CLI.
4. Preview em Three.js usa o loader vendorizado e mesmo montador do produto.
   Rodar caminhada, strafe, giro, agachamento, salto/queda, mira, tiro e recarga;
   observar pescoço, axilas, punhos, cintura e tornozelos durante movimento.
5. Crítico separado e Ruben avaliam imagens/vídeo e partida. Somente depois
   um processo de promoção autorizado gera manifestos aprovados de runtime.
6. Runtime resolve catálogo aprovado e o servidor valida entitlement/loadout;
   falha mantém o corpo padrão. O socket usa bone e bind reais, a roupa partilha
   a pose da instância e a ocultação aplica apenas máscaras aprovadas. Itens não
   mudam hitboxes, alcance, velocidade nem estatísticas por aparência.

Antes de abrir para outros devs: incluir arquivo Blender de referência licenciado,
exportador e validador canônico de bind, preview local, budgets medidos por tier,
regras de LOD/texturas/materiais e documentação de submissão. Não exigir que o
contribuidor tenha acesso a segredos ou ao backend. SKU, preço e entitlement
continuam fora do pacote artístico e são definidos no servidor/admin autorizado.

## Evidência deste marco

A fundação inicial tinha47testes de fixture válida e falhas de paths/symlink/proveniência,
symlinks pendentes no gerador de exemplo, NaN/infinito, slots/camadas/máscaras, famílias/fit/rig incompatíveis, conflito de
outfit e GLBs quebrados mesmo com SHA atualizado. Executar o comando do README
para reproduzir; aprovação visual permanece pendente.

Inspeção real, somente leitura: `client/public/models/dollynho_dance.glb`,
561400 bytes, SHA-256
`9b0f9642ab05e2de1abf4112460a798b16fc719fb23035172cb6a47944e6b88b`:
1 mesh skinned, 42 joints, material `palettemat`, animação `mixamo.com`, extensão
requerida `EXT_texture_webp`. Isso valida utilidade do inspetor sobre arquivo
existente; não valida compatibilidade desse personagem com o contrato draft.

A camada atual reúne148testes(104de pacote/sidecar e44do inspetor geométrico),
com revisão independente registrada. Piloto artístico real e exportador de bind
continuam pendentes. Commits, gates e publicação desta camada estão em
[STACK-CONTINUATION.md](STACK-CONTINUATION.md).

## Sidecar de empunhadura: marco15/10

O formato `cs-grip-profile/1` em `tools/character-kit/grip-profile.mjs` adiciona
contrato offline sem relaxar ou modificar o pacote legado. O exemplo reproduzível
e os comandos de validação estão no README da ferramenta. O marco do sidecar chegou a104testes,
incluindo47legados; revisão independente também verificou os casos adversariais.

Cada mão declara anatomia humana, pata ou mascote separadamente de fechamento
baked/weighted/none. Regiões pertencem ao hash do corpo/arma e declaram espaço,
normal e quaternion; atuadores e ownership são explícitos. Corpo, família, fit,
rig e rest-pose precisam concordar na composição. Essas declarações ainda não
provam a geometria: nenhum perfil real dos seis personagens foi aprovado.

O código rejeita política de apoio de duas mãos para arma declarada de uma mão,
ownership incompatível com fechamento assado, constrained IK ainda não implementado, hashes errados,
escape por symlink e JSON ambíguo/duplicado. A falta de cobertura de fases é
reportada; sucesso estrutural nunca habilita runtime nem aprova contato ou fit.

Próximo gate da fábrica: importar regiões semânticas reais por hash de topologia,
executar skinning e normalização no mesmo loader do jogo e medir contato contra
triângulos de arma em todas as fases. Depois validar luvas/roupas que cobrem mãos
e transições de recarga/soltura. Perfil por família não autoriza herança automática
entre armas ou proporções diferentes.


### Experimental attachment library

The separate [synthetic garment example](../../tools/character-kit/README.md#experimental-synthetic-garment-attachment)
is opt-in developer tooling, not an extension of package validation or catalog
activation. Its static record authenticates one synthetic byte pair; known-family
and fit are technical draft identities. No body mask is applied, and all approval
flags remain false. Gameplay, store, authored garments and cross-family fit remain
outside this API experiment.
