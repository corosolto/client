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

Reversão mínima #1179, GLM R4: glbchars.js devolveu os quatro algoritmos novos (clampAlcanceIK 95%, yaw forçado 80% + _undoHeadYaw, teto TP_FRONT_MAX_CHAR + warmup 60f, curl do zumbi à curva legada .5/.35–.80), preservando TP_FRONT_MIN, AIM_CORR_CLAMP/pitch, syncHeadFinal e handik.js intocado. Kernel combinatório = 0 bloqueios/63 com teto/dívida/assets originais; 22 débitos históricos permanecem. tp-world-contract produto VERDE (WP×8+PS1×5, mutante nan pego), falha declarada é head-yaw-check legado esperando o bloco removido — infra obsoleta até o gate de pose autorada do agente nativo de yaw. tplocalshot/syntax ok; tpanim3p bloqueado por infra (worktree sem node_modules/astro). Relatório e snapshot em audits/2026-10-31-visual-consistency/SELECT-MINIMUM-GLM-FIX-R4.md; seleção dos 63 fica com root/QA pós-integração.


## AN7 causal, 31/10 20:08 UTC

QA6a5b12b42 expôs agachado-estatua sobrevivente: o instrumento confundia crossfade jump→crouch, após AN11, com recuo. GLM deixou patch parcial sem teste concluído; Root completou o par de builds reais, com AWP real pré-carregada, controladores/mixers/actions/ossos independentes, relógios/pose inicial iguais e finitude. Os clones não pertencem ao Game/RAF; a janela de medição é síncrona. Só A recebe shoot, e o delta A−B desconta animação natural. Limiar de 0,5 cm preservado. AN1 ocorre antes do tiro e não é expectativa causal deste mutante; agachado-estatua agora exige exatamente AN7.

BASE4374 servindo QA6a: nominal R3 exit0/11 cláusulas, zumbi/AWP t=1,133, recuo causal2,09cm e controle0,05cm. Mutante R3 exit0 como detector, única falha AN7:0,00cm causal, controle0,06cm; demais10 verdes. R2 anterior também distinguiu1,98cm de0,00cm. Evidências externas TP-CROUCH-{NOMINAL,MUTANT}-R{2,3}.log e TP-CROUCH-GLM-FIX-R1.md corrigido por Root; revisão RO focal sem blocker por fonte, sem equivalência a review integral do PR.

Próximo passo: integrar este checkpoint seletivo na QA e o main457481cc2/#1187, preservando mobile/boot/skins e fila final de FX, então executar os três mutantes 3P restantes e gates pertinentes ao merge. Nenhum push/hosted/release deste head ainda certificado. O JSON de pickup gerado e os logs locais ficam fora do commit.


## Preview RED após integração mobile, 20:14 UTC

QA b10e2df41 integrou #1187, mas bateria ampliada detectou fixtures F4cd/launchrace desatualizadas e preview Canarinho/deagle RED em FRENTE-CONTRATO/FASE/FRENTE-Z (fase16,12graus). Push normal abortado antes de transmissão; remoto continua21f264. A presença literal do frontmax humano rejeitado continua exigida pelo gate antigo e é contrato obsoleto; a instabilidade de fase precisa de investigação independente, sem reintroduzir deformações nem relaxar tetos para verde.

Root autoriza GLM somente ablação temporária em glbchars.js desta lane para medir assentamento do preview separado do clamp, com GLBs/clipes reais, e restaurar fonte exata ao final. Nada adotado ou aprovado. QA e HEAD b10 ficam congelados no ensaio das26armas; primeira tentativa sem VM_PUBLIC_ASSETS não tinha private-assets local(404), agora R2 usa rede pública HTTPS com bytes/SHA do manifesto. Não confundir fallback desse setup com regressão confirmada em produção. Next: qualificar causa de fase e contrato morfológico, adjudicar antes de patch/gate novos.

## Preview-grip-phase R2 (GLM fix), 31/10 — FASE consertada, contrato de frente rejeitado como instrumento

Causa da FASE 16,12° era wiring, não fade: o settle inicial de 10 updates roda antes de `ctrl.torso`/`ctrl.corpo`; `_porte1hK=0` na captura da pegada (PV_PULSO). Patch mínimo no glbchars.js: dez updates de 1/30 condicionados ao preview do Canarinho, dentro do bloco PV_PULSO, antes de capturar. Medido 16,12°→0,26°, outros sete casos bit-idênticos, jogo intocado; sem 60 updates legados, frontmax ou yaw.

Contrato de frente antigo removido do verificador: FRENTE-CONTRATO (lexical) e teto FRENTE-Z 0,23 (coorte humana sem referência da asa; media Z local, não metros — escala Canarinho 1,0320). frenteZ vira diagnóstico sem teto com nomes/unidades corretos (`frenteZLocal`, `frenteZMundoM`); não-finito continua INVALIDA. Dívida ARTÍSTICA declarada (asa espalmada encobre arma; exige referência válida aceita) — correção de ferramenta, não waiver.

Contraprova `frente-sem-clamp` (alvo saiu do fonte) substituída por `arma-solta`: deslocamento físico de 0,12 m no gunObj real, só Canarinho/Deagle/preview; palma skinnada real não segue. `sem-settle` agora remove exatamente o settle novo (FASE apenas — LA1 não dispara, teto Canarinho 20°); `fase-inclinada` intacta. Alias `eval:preview-grip-phase` troca só o nome da 3ª contraprova.

Node26, nominal exit0 0/8; sem-settle/fase-inclinada/arma-solta exit0 conjuntos exatos (FASE; FASE; LA2+LA3); invalidCLI exit2×3; infra3 reproduzido exit3. Alias integral exit0 sob shell limpo. Hipótese GLM de ambiente trunca stdout8192B NÃO aceita como causa/isenção. Root refutou a saída forçada: controle stdout.write atrasado20ms no medidor real dá exit0/0bytes, JSON inválido; process.exitCode permite drenar antes de sair. Documentação oficial Node explicita risco do process.exit com I/O pendente. Evidências: audits/2026-10-31-visual-consistency/PREVIEW-PHASE-GLM-FIX-R2-*.{log,json}. Nenhum aceite artístico/browser/release.

Root pós-R2: comentário de produto reduzido ao orçamento da casa; projeção frontal usa eixo mundial real e registra escalaXYZ. Root não adotou a alegação GLM de que shelllimpo prova segurançaCI. Contraprova determinística do transporte em PREVIEW-PHASE-STDOUT-RED-R1.json (não é mutação da medida): exit0 com0bytes; reparo naturalexit+verificação posterior mantém código do veredito e JSON íntegro. Sem novo teto/art/asset.

Validação Root finalR3: aliases integrais eval:preview-grip-phase exit0 emNode26.12.1 e22.23.4 (PREVIEW-PHASE-ROOT-ALIAS-{,N22-}R3.log). Controle de stdout atrasado20ms nominal+3mutantes nos2runtimes8/8JSON íntegros,22443–22609bytes, exit0 e conjuntos causais exatos; PREVIEW-PHASE-STDOUT-GREEN-R3.json. O RED de transporte anterioreraexit0/0bytes. Node26 warning experimental de localStorage ficou sóstderr, nenhum prefixoJSON. Root ainda precisa cherry/Ego/ROindependente e CI/push normais.
