# Paridade da CI visual, 31/10/2026

Parte da missão integral registrada em `VISUAL-RELEASE-CONTINUATION-20261031.md`: mapas, personagens, skins, movimento, revisões, merges elegíveis e release. Operação Flávio excluída; UI de fluxos/redes é fase posterior. Não equivale a aceite artístico/mobile/MP.

Lane própria `codex/visual-ci-parity-20261031`, base QA88fc36b3d. Root é o único writer de combate. Agent CI possui download do pack no workflow em outra WT; economia/AUD1C já têm fontes a66e2b4dc/a49553570, integradas na QA como cb2c97c2d/51923630a.

## Medido antes do reparo

- `node tools/eval/pickup-check.mjs all`: exit1,944pickups,53 fora do vão aceito. Piscina12,Posto11,UPA10,Obras10,Atacadão10; todos fonte mapa. Exemplos AK/M4/MP5 na Piscina: base−0,12/−0,08/−0,09m, chão0. A palavra histórica "flutuando" inclui enterrados. Armários continuam assentados. Alcance e nível zero falhas. Evidência externa PICKUP-PARITY-RED-R1.json/log.
- Seleção: kernel real com GLB reais e texturas stub reproduz teto0,689/28,6, em vez do congelado0,675/23,6. Ablação do clamp de apoio restitui o teto; hipótese medida: clamp usa punho, CCD usa palma. Nenhum limite/dívida alterado. Mesmo protótipo com palma ainda expõe14 bloqueadores de personagens, a investigar antes de aceitar.

## Próximo passo

Corrigir assentamento inicial sem remover pickups e provar VM14/mutação + navegador real; depois corrigir IK de apoio com régua causal e inspecionar a seleção inteira. Regenerar docs/arch após produto estável, revisar e integrar seletivamente na QA. Nenhum push/merge/release novo certificado por este ledger. Audit externo `audits/2026-10-31-visual-consistency/` na raiz agregadora; browser rootSpace39, nenhum agente paralelo opera browser.

## Assentamento local aceito, GLM R1

Loop no fim do constructor aplica helper existente. VM14 all passou944/944, zero alcance/nível/vão; reversão somente do loop devolveu53 falhas, restauração byte-exact voltou ao verde. Match-pickup-mode nominal e mutante reintroduz passaram, mantendo economia e drop de abate. Relatório externo PICKUP-GLM-FIX-R1.md; comentário longo foi reduzido ao orçamento. Crítico RO da proposta sem blocker, com ressalva: todos os Y são normalizados, inclusive pickups já aceitos; não afirmar só53 transforms.

Ego real QA ainda pré-fix, economia0, confirmou22pickups na Piscina e12 enterrados até−0,12m, PNG BEFORE-R3 em1320×880 visto: carregador corta o piso. R1 estava coberta pelo menu e R2 fora de3:2, rejeitadas como figura de aceite. Outro defeito confirmado: sete famílias reais já estão em cache, mas todos placeholders do mapa continuam caixas. O constructor perdeu a troca de modelos pré-carregados no stack1171/1179. Próximo microfix restaura uso do cache sem baixar catálogo novo nem mudar spawn/colisores; depois capturar assentamento/modelo final na mesma câmera.

QA aceitou o primeiro fix como2f0ba7008. Ego22/22 com vão0,01m, contagem/XZ/quaternion/escala/origem idênticos, todos22Y normalizados; PNG SETTLED-R2 visto em3:2, carregador inteiro acima do piso. SETTLED-R1 foi rejeitada por framebuffer não limpo na captura. O pack público já foi baixado na QA,352arquivos; o graffiti adicional entre as figuras impede chamá-las A/B pixel-a-pixel do mapa todo.

Cache inicial R2: GLM deixou patch/gate úteis mas encerrou por deadline sem relatório/provas. Root mede: mutante sem-refresh exit1 em exatamente PIM2/PIM4;22fontes ausentes/roll antigo, chão GREEN. Nominal/autoteste GREEN,22fontes corretas e sete geometrias reais distintas; economia0pickups. Teto de vão corrigido no instrumento antes do aceite, comparando base−chão, sem descontar folga0,01. Detalhes em PICKUP-CACHE.md. Próximo integrar/capturar malha real na QA e corrigir as regressões de seleção já isoladas, sem mudar dívida/tetos.
