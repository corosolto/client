# Troca determinística no teste dos ícones de toque

TQ1 exigia que a imagem inicial fosse diferente de AK, mas não preparava a arma
inicial. Uma partida válida já com AK reprovava essa condição mesmo com os três
renders corretos e carregados. A mensagem ainda dizia que a troca tinha ocorrido.

A fixture agora sincroniza M4 antes de medir e troca para AK. A cláusula exige os
dois caminhos exatos, os três renders e todas as imagens carregadas. A mensagem
imprime as duas imagens e quantas carregaram. Os nove critérios, os doze mutantes,
a comparação exata das falhas causais e a espera das imagens foram mantidos.
Não há alteração do código do jogo.

## Evidência e limites

Recibos no diretório agregado `audits/2026-10-31-visual-consistency`:

- R1325: os blocos reais de TQ1 e `Game._syncTouchWeps`, extraídos sem alteração,
  reprovaram o estado válido já com AK e três imagens carregadas em uma fixture DOM.
- R1333: começando com AK ou M4, a nova sequência passa. Remover sua preparação
  faz TQ1 reprovar novamente. O controle do validador com uma imagem marcada como
  não carregada também reprova e agora informa `2/3`. Sintaxe e diff passaram.
- R1316 e R1334: tentativas no navegador técnico expiraram na navegação antes de
  executar os critérios. R1334 preservou os hashes das seis fontes consumidas;
  interrompeu a sequência após o nominal e não rodou os doze mutantes.

A reprodução em DOM prova a falha determinística da fixture. Ela não determina
que esse foi o motivo do TQ1 adicional em R1297: essa atribuição continua pendente.
O gate de navegador completo permanece pendente, assim como Ego, mobile físico
e inspeção humana. Este checkpoint não aprova UI nem libera merge ou release.
