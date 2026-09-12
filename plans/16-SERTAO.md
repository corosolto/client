<!-- spec:mapa -->
# 16 — Sertão da Treta: fauna e memória regional

## Local real

Vila ficcional inspirada no Sertão nordestino, com referência nominal a Canudos,
Bahia, e homenagem regional a Padre Cícero. Não reconstruir o arraial histórico,
nem apresentar a estátua como monumento localizado em Canudos. A referência
populacional da placa será explicitamente datada: 16.693 habitantes, IBGE2025.

## Layout

Preservar arena, três rotas oeste/centro/leste, oito spawns, dezesseis pickups e
três objetivos CTF. Fauna em pequenas áreas seguras: galinha acompanhada por
pintinhos e dois caprinos em caminhada lenta. Não mover casas nem abrir novas
linhas de tiro. Horizonte em três distâncias, além do limite jogável.

## Cobertura (cover)

Manter igreja, poço, praça, venda e abrigos existentes. Animais não são cobertura
nem oclusores de tiro. Homenagem em pedestal fora de passagem e objetivos, com
colisor correspondente se acessível. Vegetação distante sem sombra dinâmica.

## Linhas de visão

Evitar fauna no centro da mira e nas linhas entre spawns. Aves distantes pequenas,
ritmo lento, sem bandos densos. Juazeiros pontuais e arbustos secos com lacunas:
não fazer parede uniforme verde. Preservar contraste entre jogadores e fachadas.

## Referências

- IBGE, estimativas2025: https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2025/estimativa_dou_2025.pdf
- Embrapa, Caatinga: https://www.webambiente.cnptia.embrapa.br/webambiente/wiki/doku.php?id=webambiente%3Aff_fisionomias_caatinga_caatinga_herbacea
- Embrapa, caprinos: https://sistemasdeproducao.cnptia.embrapa.br/FontesHTML/AgriculturaFamiliar/RegiaoMeioNorteBrasil/Caprinos/alimentacao.htm
- Embrapa, galinha caipira: https://sistemasdeproducao.cnptia.embrapa.br/FontesHTML/AgriculturaFamiliar/RegiaoMeioNorteBrasil/GalinhaCaipira/instalacao.htm
- Governo do Ceará, Horto em Juazeiro do Norte: https://www.ce.gov.br/2022/03/28/teleferico-do-horto-e-inaugurado-e-vai-fomentar-ainda-mais-o-turismo-no-cariri/
- Mint animação: https://mint.gg/features/3d-animation (automação documentada para humanoides; quadrúpedes exigem validação própria).

Paleta: cal quente, terra ocre moderada, verdes oliva irregulares, pedra cinza
quente; animais com penas/pelagem naturais e leitura anatômica. Estátua original
em pedra clara, composição própria de padre idoso com batina, chapéu e cajado;
não copiar a escultura do Horto. Consultar acervo e FONTE antes de qualquer download.
Prompts e recibos em docs/reports/SERTAO-FAUNA2-ASSETS.md. Licença específica deve
ser verificável antes de integrar qualquer geração ou asset novo.

## Régua de aceite

- Capturas reais1536×1024 antes/depois, animais próximos e na escala de jogo;
  crítica independente após imagens. O dono aprovou cerca de90% da base anterior.
- Calango horizontal, quatro patas com contato plausível, sem corrida bípede;
  galinha com cabeça/pescoço/penas legíveis, pintinhos acompanhando, sem deslizar.
- Dois caprinos no máximo em médio, um em low; caminhada com membros alternados,
  pausas e sem penetrar casas/objetivos. Nenhuma sombra cara de microfauna.
- Horizonte em manchas, custo incremental alvo≤3calls/48miltriângulos,
  zero texturas novas. Cena continua no teto503calls e368208triângulos da régua
  atual; otimizar a integração se necessário, não aumentar teto para passar.
- Para cada regressão silenciosa, cláusula objetiva e mutação vermelha; preservar
  contratos espaciais, oclusão, fauna, assets, look e ambience. Repetir movimento.
- Recapturar thumbnail/vídeo do mapa final e atualizar recibo de fontes.
- Commits pequenos Agent, atualizar PR511 draft contra map2/velho-oeste;
  sem merge/deploy e com pendências de áudio/procedência explícitas.

Revisão06/09: a meta incremental15mil foi substituída após quatro versões
procedurais reprovadas visualmente. Seis juazeiros do acervo instanciados com
copa reduzida resolvem a silhueta artificial:46230tri/3calls/zero texturas novas.
Cena real337248tri/496calls, abaixo do mesmo teto; sobram30960tri para os
animais pendentes. Não afrouxar teto total. HZ5 aprovado visualmente pelo crítico
para revisão humana; não equivale a aprovação do mapa inteiro.
