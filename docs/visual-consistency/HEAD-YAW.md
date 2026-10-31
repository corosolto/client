# Recentro da cabeça sem realimentação

Finding #1188, inline `4432950826`, revisão Estraga `5724445885`, base
`21f264c519aac547148ea1bab3c5c64d847e8290`.

O produto mede yaw com o sinal inverso ao ângulo da cabeça: corpo apontando +Z e
cabeça girada +θ produzem `curYaw=-θ`. O sinal anterior recentra corretamente;
invertê-lo aumentaria o erro. A causa reproduzida é outra: a correção persiste no
osso quando o mixer não reescreve sua rotação. Isso também ocorre com track de
quaternion constante, pois `PropertyMixer` evita aplicar o mesmo valor novamente.

A reprodução inicial usou `CharController`, `AnimationMixer` e Three reais, sem
reimplementar o controlador. Com yaw inicial +0,5 rad, o track constante chegou a
+0,6505 rad e cruzou o centro antes de se estabilizar perto de zero. O resultado
esperado pela receita anterior é +0,1 rad: reduzir 80%, preservando o offset autoral.
Os dados RED ficam em `HEAD-YAW-RED-R1.json` no audit externo da missão31/10.

O controlador remove o inverso do delta local anterior **antes** do mixer e aplica
a correção uma única vez depois dos overlays, antes da sincronização do proxy.
Assim não depende de o mixer escrever um valor diferente. O eixo segue vertical
em mundo, convertido pelo quaternion do pai, inclusive em rigs escalados. A pose
final de emote conserva seu gesto; morto, LOD distante e locomoção não acumulam
correção residual. Ao sair do porte parado, a memória escalar é zerada. O delta
também sai antes de ativar ações ou reiniciar o mixer em `revive()`, impedindo que
a pose restaurada receba um undo antigo.

## Régua reproduzível

`node tools/eval/head-yaw-check.mjs` cria rigs sintéticos e importa o controlador
real em módulo temporário, acrescentando apenas seu export. Um segundo controlador
real com o bloco de yaw removido fornece a pose natural independente. O oráculo
aplica sobre ela o contrato preservado da base: ganho0,8, teto0,5rad, suavização6/s
e deadzone0,0001rad. A tolerância1e-6rad é numérica, sem aprovação estética implícita.

Cobre osso sem track, track constante, track animado e ação pausada, duas cadeias
com yaw/pitch/escala diferentes, mira vertical variando no retorno ao idle,
frames alternados30/60/120Hz, dt zero e hitch, troca de track ausente para
track animado e transições entre
idle, crouch, idle1h, movimento, morte, LOD e emote, seguidas de retorno ao idle. Inclui `revive()` durante o porte e morte/respawn
sem uma atualização intermediária; esse caso foi RED antes do helper de transição.
Também compara o proxy à posição final do osso a cada atualização. Probes
separados leem a cabeça logo após cada método de transição, antes de `update()`,
e o ponto fixo do porte é conferido diretamente em +0,1/-0,1rad para offset de
+0,5/-0,5rad, sem depender do oráculo dinâmico.

`node tools/eval/head-yaw-check.mjs --autoteste` executa todos os mutantes e
reprova se qualquer um sobreviver ou não produzir a resposta RED esperada.
Cada `--mutante=<nome>` modifica somente a cópia temporária e deve imprimir RED
com exit0 (mutante morto). Nominal RED ou mutante não detectado sai1; argumento
inválido sai2; incapacidade de medir sai3. Variantes: `sem-undo`, `undo-tardio`,
`sinal-invertido`, `sem-clamp`, `sem-yaw`, `yaw-emote`, `estado-persistente`, `revive-pendente`, `undo-to-ausente`, `undo-shoot-ausente`,
`undo-emote-ausente`, `undo-die-ausente`, `revive-sem-reset`.
O teste recusa substituição que não aplique uma única vez.

A régua não mede os pixels, os GLB de todo elenco, compra/skins ou mobile físico.
A validação visual no jogo real e a revisão adversarial da integração seguem com
o integrador. O problema semelhante do pitch não foi alterado nesta correção.
