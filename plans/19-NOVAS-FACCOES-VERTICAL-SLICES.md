<!-- spec:time -->
# 19 — Novas facções: vertical slices

> Recorte executável da ficha ampla em
> [`specs/0002-novas-faccoes/spec.md`](../specs/0002-novas-faccoes/spec.md).
> A expansão dos outros integrantes só começa depois de estes quatro passarem juntos
> modelo, rig, animação, arma, thumbnail, hitbox, voz por personagem e revisão externa.

## 1. Câmera Roxa — linha de frente da TV

- **Visual:** robô humanoide alto, lente única formando a cabeça, carcaça roxa, módulos compactos de estúdio, tally e brasão CRT original no peito.
- **Papel:** primeiro representante jogável da facção TV; valida o pipeline robótico sem depender das três mecânicas especiais abaixo.
- **Arma:** M4.
- **Mecânica:** loadout e regras comuns; a fatia prova modelo, skin humanoide, onze clipes, pegada e integração na seleção.
- **Procedência:** conceito original derivado da direção visual aprovada da própria facção, com prompt e hashes no `mint-assets.json`; sem emissora, marca ou personagem protegido.

## 2. Programador Virado — suporte de informação

- **Visual:** moletom gasto, olheiras, pijama xadrez, teclado bege de lan house dos anos 2000 preso à mochila, mouse de bolinha cabeado e caneca metálica cilíndrica.
- **Papel:** suporte móvel que sinaliza por pouco tempo a direção do inimigo que o atingiu para aliados próximos.
- **Arma:** M4.
- **Mecânica:** `stack trace`: ao sobreviver a dano, revela somente a direção aproximada do agressor por 1,2 s; não atravessa parede nem marca posição exata.
- **Procedência:** direção visual baseada no registro histórico de lan houses brasileiras citado na [ficha canônica](../specs/0002-novas-faccoes/spec.md#5-facção-nerdolas); nenhum aparelho ou logo é copiado.

## 3. Motoca Cachorro Loko — batedor de entrega

- **Visual:** capacete integral preto fosco com viseira levantada, jaqueta amarela refletiva, bag térmica genérica e telefone sem marca em suporte de peito.
- **Papel:** batedor de rota curta, capaz de informar rapidamente uma passagem recém-percorrida.
- **Arma:** M4.
- **Mecânica:** `rota confirmada`: depois de correr continuamente por 3 s, o próximo ping de rota dura 1 s a mais para o time; não altera velocidade nem dano.
- **Procedência:** equipamento genérico de motofrete, sem marca de aplicativo, conforme a fonte brasileira reunida na [ficha canônica](../specs/0002-novas-faccoes/spec.md#6-facção-profissionais-do-corre).

## 4. Doidinho do Bairro — improvisador de utilidade

- **Visual:** boné torto, roupas coloridas incompatíveis, remendos, mochila com fios e chuveiro elétrico genérico reaproveitado como gambiarra.
- **Papel:** improvisador que recupera utilidade de campo sem depender de caricatura médica, química ou de pobreza.
- **Arma:** P90.
- **Mecânica:** `tem uma peça pra isso`: uma vez por round, reduz em 20% o tempo da próxima interação com objetivo; não recupera vida, munição ou dano.
- **Procedência:** marcador visual original de gambiarra brasileira; a restrição editorial e o elenco ficam na [ficha canônica](../specs/0002-novas-faccoes/spec.md#7-facção-noias).

## Vetos editoriais — conferidos antes da geração

- [x] Nenhuma pessoa real contemporânea ou rosto reconhecível.
- [x] Nenhuma marca, personagem, uniforme protegido ou outro material com copyright copiado.
- [x] Nenhum gore.
- [x] Nenhuma doença mental, dependência química, miséria ou pessoa em situação de rua usada como punchline.

## Evidência obrigatória por personagem

- Vista frontal, traseira e lateral do GLB final.
- Captura com a arma canônica e folhas finais de walk/crouch.
- Captura dentro da partida real em curta e média distância, viewport 3:2.
- Medição geométrica de pele e pegada, com mutantes vermelhos.
- Duas falas de seleção, três de kill e três de rádio, com licença/hash e fallback de facção.
- `node tools/eval/character-voice-contract-check.mjs --release` verde depois da escuta:
  cobra voice ID licenciado, `status: approved`, arquivo, duração, SHA e presença no
  manifest que alimenta o `audio-pack.zip` de produção.
- Revisão adversarial feita por agente que não construiu o asset.
