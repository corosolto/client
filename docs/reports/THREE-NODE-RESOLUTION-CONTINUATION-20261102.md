# Resolução do Three no arnês Node

Missão integral de PRs, release e consistência visual continua ativa. Esta frente
cobre a fronteira do instrumento Node; não aprova arte, Game, mobile ou MP.

O helper de `a555a255f` tratava a ausência de `node_modules/three/index.js` como
autorização para escrever um pacote-ponte. Um pacote npm válido pode usar outro
entrypoint. Na reprodução R1232, uma instalação fictícia válida perdeu seu
`package.json` e ganhou symlinks. Todas as escritas ficaram em fixture privada;
nenhuma instalação real foi alterada pela reprodução.

`three-node.mjs` agora usa o gancho nativo de resolução já empregado pelo gerador
da impressão da simulação. Redireciona o Three e seus addons ao vendorizado sem
alterar um pacote existente. A resolução continua pelo próximo gancho para o coletor do grafo
também observar os módulos efetivamente carregados.

Os instrumentos antigos com import antecipado ainda precisam de uma ponte em
disco. Se o destino não existe, o helper prepara um pacote privado e publica um
symlink de forma exclusiva. Um processo concorrente não substitui o vencedor.
A primeira proposta, somente com gancho, foi descartada antes de publicação:
não atenderia esses consumidores executados em outro processo.

`three-node-check.mjs`, encadeado em `eval:modgraph`, importa o helper real em
fixtures sem pacote e com um pacote válido diferente. Os processos concorrentes
precisam carregar o Three vendorizado e o loader. A fixture sem pacote permite
somente a ponte privada; a instalação existente precisa permanecer byte-exata.
Uma mutação aplicada ao helper escreve o `package.json`; o detector precisa
identificar exatamente esse arquivo, com os imports ainda funcionando. Erro de
inicialização não recebe crédito como mutação detectada.

Medição R1238: o alias completo passou em 4,75 s, com os nominais e a mutação
causal. A lista do gerador manteve exatamente os mesmos arquivos do grafo;
o hash foi recomputado independentemente. O nominal Javaporcos também passou.
O hash oficial foi regenerado e os checks de docs e ARCH passaram (R1242).

O caso R1245 também passou: depois dos processos que importam o helper, outro
processo carrega Three e GLTFLoader sem importar esse helper. Isso exercita a
ponte em disco usada pelos instrumentos antigos, sem o gancho mascarar falhas.
Esse acréscimo altera a cobertura do arnês; não muda o grafo da simulação.

Próximos: compor os outros achados e submeter o novo candidato aos reviews e
portões. Não publicar ou parear o backend usando o hash anterior.
