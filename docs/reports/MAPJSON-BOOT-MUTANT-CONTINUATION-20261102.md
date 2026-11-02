# Continuidade: mutante causal do relevo JSON

A critica independente R1879 identificou que o controle de relevo antigo alterava o valor esperado para zero. Ele contrastava o oraculo, sem quebrar a funcao de altura carregada pelo Game. A mesma CLI aceitava mutante desconhecido como nominal; RED real R1901 confirmou exit0 para `--mutante=desconhecido`.

O controle agora substitui `world.groundHeightAt` pela funcao plana no builder real registrado em MAPS, antes de o Game usar o mundo. O oraculo mantem as alturas declaradas:0,0.6,1.188,1.2, tolerancia0.08, e o limiar de navegacao continua20m em20s. O recibo vincula fonte do checker/map_json/Game, hashes diferentes das funcoes antes/depois e amostra real da plataforma1.2 para0.

O alias executa primeiro o nominal com17 clausulas e depois o mutante com exit1 e failset exato B2-1/B2-2/B2-3. Timeout, sinal, stderr inesperado, TypeError/ReferenceError/SyntaxError, veredito ausente/duplicado, fonte alterada, denominador ou falha adicional sao recusados. A CLI desconhecida deve encerrar2 sem veredito nominal. O CI ja chama esse alias explicitamente.

Node22: R1902 nominal e mutante real PASS8.146s; R1903 syntax4.732s e eval:mapjson5.739s PASS, sem mudanca de fontes durante as execucoes. Artefatos em `audits/2026-10-31-visual-consistency/MAPJSONBOOT-*R190*.{json,log}` no volume do projeto. Nenhum produto de mapa ou teto foi alterado.

Proximo: critica do delta atual, build/boot/publicacao normal e CI remoto. Aceite visual, Ego, mobile, MP, anatomia, skins e release continuam pendentes da missao completa.
