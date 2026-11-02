# Mata: documentos alinhados ao construtor R1085

A revisãoJava5730483475 encontrou divergência entre ficha e layout, mas sugeriu
fechar a mata em54,6m. O construtor real fixa MATA_R54, V_ANDAVEL=MATA_R+9,
V_PAREDE0=V_ANDAVEL e V_PAREDE1=68; construirParede usa essas constantes e recorta
as seis trilhas. A ficha54–63m explorável estava correta. Árvores alcançáveis
continuam com colisor por tronco. Não se alterou mapa para seguir a sugestão do bot.

Três trechos do layout agora descrevem parede63–68 e9m exploráveis. A ficha
retira uma cláusula ambígua sobre toda a mata restante fechada. Os comentários
antigos no header do módulo e na sonda63.8 da régua também foram alinhados; a sonda
numérica, constantes, geometria, colliders, asserts e todo byte executável desses
dois módulos são iguais ao pai244e306. Comparação Native dos corpos confirmou.
Nenhum teste novo foi escrito para esta correção de texto.

O gerador oficial calcula SIM_HASH713a9105f2c02115 em160arquivos. O hash inclui
bytes de comentários public; por isso mudou de66220b mesmo sem mudança executável
neste microcommit. A mudança funcional deGame/netgame veio do merge1155 anterior.
VERSION135 e package/lock permanecem coerentes. Será necessário publicar este
cliente e parear backend antes de release; C2f45409/H46bf não é este alvo.

O segundo achado formal, spawns/waypoints no registroMAPS, é refutado: Game guarda
o resultado do builder emworld e consome world.spawns/waypoints. Os três builders
retornam esses campos. TriagemR1079 cobriu os dois itens e seis observações de
impacto; RootFULLreport/rebind41Git+surface/report0drift. Não houve runtime ou QA
visual nesta alteração textual. O próximo push normal executará seus hooks e o
head publicado receberá revisão atual e crítico independente integral.

Missão completa mapas/personagens/skins/movimento/ADS e PR/release permaneceativa;
Flávio1158 fora, UI/social depois. Game/Ego3:2, anatomia/contato, mobile e MP humano
não aprovados. Sem SQL persistente, API/runtime/frontend deploy ou release.

Agent: Codex; origem/assistência de outros agentes preservada nos commits.
