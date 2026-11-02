# Veredito de orientação do construtor

A missão continua cobrindo integração dos PRs elegíveis, release e consistência visual/motion/skins do jogo, excluindo Flávio. Esta frente corrige o instrumento de orientação do SDK1101, composto com Arena1138 e acabamento Campo. Não muda Game, editor, assets, física, animação ou teto visual.

## Defeito reproduzido

R1822 executou o fragmento real do alias `! node tools/eval/construtor-yaw-check.mjs --mutante=seta-invertida` com um preload externo que interceptava a leitura real do HTML. A leitura lançava antes da aplicação da mutação, mas o shell devolvia sucesso. O falso verde foi registrado com fonte intacta.

O checker agora distingue setup (exit2, sem veredito contratual) de falha semântica (exit1 com registro único). Mede os mesmos dez casos de câmera e bot, continua usando a função real de desenho e o Three vendorizado e exige âncoras únicas. O driver valida hashes completos das fontes e do trecho efetivamente mutado, inventário e cláusula própria. O mutante precisa inverter as dez setas e manter o contrato bot/câmera.

R1826 passa no alias mapjson completo (incluindo110 casos de props e cinco mutantes), boot JSON e mutante de relevo, workflows locais e timeout. O driver recusa quinze resultados malformados/infra e cinco falhas reais de preparação no checker. A contraprova externa de R1822 agora retorna1 em vez de0. O produto permanece byteidêntico.

GLM1823 foi consultor de autoria, uma chamada sem ferramentas, sem retry/fallback. Foram rejeitados o hash truncado sem binding, a seleção do último JSON e a contraprova de leitura em um programa alheio ao checker. Essas conclusões não são revisão independente.

## CI e continuação

O workflow explícito não chamava os aliases SDK. Foi acrescentado um passo que executa `eval:mapjson` e `eval:mapjsonboot`, sem ampliar o timeout. O pacote de revisão1818 e o runner1820 continuam inertes, sem chamadas, e devem ser refeitos para o head posterior a esta correção.

Lane própria `sdk-yaw-verdict-r1824-20261102`, base ad49e213. A composição L permaneceu congelada durante o push1816. Próximo: incorporar este checkpoint a L, geradores oficiais, build/boot e publicação por hooks normais, revisão formal completa do head e crítica integral. Backend pareado, release e QA real continuam pendentes; testes não concedem aprovação visual/mobile/humana.
