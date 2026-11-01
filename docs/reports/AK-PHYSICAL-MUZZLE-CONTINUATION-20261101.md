# AK: origem física do clarão e traçante

Objetivo: corrigir a origem física da AK golden, preservando a linha de mira e
o enquadramento. Esta é uma parte da missão de consistência visual, integração
dos PRs e release; personagens, mapas, skins e movimento continuam em andamento.
Flávio/#1158 fica excluído. UI e redes sociais vêm depois. Outros owners e assets
privados são preservados; não há geração ou compra nova de assets.

Base: `b808e1456db974bb8552ad86cfb804e96f7787bb`, mesmo product tree da main
`59580703c606a3489bea691b3bb4f609bb062131`. Branch
`codex/ak-physical-muzzle-r111-20261101`.

O diagnóstico normal no Ego (R106/R107/R110) encontrou 13 tiros ADS reais, sete a
~5,7m e seis a ~27,4m. O endpoint coincide com o impacto; a origem física usava
uma média de 58 vértices próximos da frente. Ela ficava atrás e acima da face
do cano. A distância ao centro dos bounds da face era ~4,000186 CSS px nas
matrizes capturadas. O valor anterior de 3,92451 px usava outro referencial,
o centroide de 14 vértices com duplicatas; os dois registros são preservados.

O ponto novo é o centro dos bounds dessa face, no espaço `Rifle_metarig`,
medido no GLB SHA256
`4094c0534f081ac96f1d6401d651c942b2b8d39dc777be30b15875706be0c48d`.
Não é um ajuste por pixels nem uma afirmação sobre um furo circular.
`attachGoldenBarrel` instala um filho desse osso apenas no rig/revisão conhecidos;
o consumidor existente prioriza `sockets.boca`. A configuração e os sockets de
ADS continuam separados. Uma nova revisão exige nova calibração. A origem dos
efeitos muda deliberadamente; a aprovação histórica do enquadramento não é
aprovação visual dos novos efeitos.

Validação R115: contrato de montagem e consumidor reais, dez verificações e
quatro mutantes detectados; repetição com geometria do GLB real, incluindo
Idle/Shoot/Reload/Equip, erro máximo de coordenadas zero. A versão de CI usa
fixture e é explícita sobre esse escopo. `--asset=...` carrega a geometria real;
texturas são substituídas somente nessa ferramenta CPU, sem aceite de imagem.
AUD1D usa a aceitação de subprocesso existente, que reprova exit não zero.

Evidência externa de projeto:
`audits/2026-10-31-visual-consistency/AK-PHYSICAL-{FIXTURE,ACTUAL}-CHECK-R115.json`,
`AK-RO-R106-GLM-BORE-R110/PROPOSTA-NATIVE.md` e os recibos R106/R107/R110.
GLM5.3 propôs a abordagem; a aplicação literal foi rejeitada por caminhos de
configuração e espaços de coordenadas incorretos. O patch foi feito pelo owner
da arma. A primeira tentativa CPU R114 falhou por ausência de Image no arnês;
R114B/R115 corrigiram o arnês, sem tratar essa falha como defeito do jogo.

O crítico independente R116 cobriu os sete arquivos e os consumidores, com
resultado CLEAN_SCOPED. Os cinco checks focais passaram. No Ego, R122 vinculou
os cinco módulos carregados ao disco e R123 comprou a AK pela loja normal,
capturando o corpo completo do GLB e o mesmo SHA256 acima.

R124 registrou cinco tiros em ADS completo a 5,58m. Os endpoints coincidem com
os impactos. Dois flashes e três sockets foram mensuráveis na mesma atualização
da face física, com diferença máxima de 1,14e-13 CSS px. As outras observações
dessas duas medidas são UNKNOWN. A captura usou SP normal, toque emulado,
qualidade low e buffer adaptativo 660×440 em viewport 1320×880.

R125C verificou tiro de quadril, clip Reload e reposição de 29 para 30 balas,
troca para faca e retorno com clip Equip. R126 saiu pelo menu normal e restaurou
exatamente as seis preferências locais pertencentes à tarefa. As falhas anteriores
R125A/B foram do instrumento e ficam preservadas. Recibos e PNGs estão na mesma
auditoria externa de projeto, pelos prefixos R122 a R126.

O primeiro push normal R121 terminou exit1 após 679s: CM1 recusou um comentário
de três linhas. A correção seguinte encurta esse comentário para duas linhas.
O push será repetido com hooks ativos. PR, revisão hospedada e merge continuam
pendentes. Mobile físico, MP e aprovação artística global não foram validados.
O merge #1188 usou bypass e esse erro permanece registrado; esta lane não autoriza
repetir bypass, alterar regras ou retirar reviews.

Próximo passo: conferir CM1 no novo commit e concluir o push normal antes de abrir
o PR. Resultado técnico verde não encerra a missão de consistência visual.
