# Direção de voz — Funkeiros

## Base cultural e editorial

O Time F não é uma coleção de sotaques. O funk carioca é tratado como prática cultural,
linguagem e identidade urbana, não como sinônimo de criminalidade ou caricatura. Esta escolha
vem de duas referências usadas na escrita do lote:

- [Fundação Biblioteca Nacional — O endereço dos bailes](https://www.gov.br/bn/pt-br/atuacao/pesquisa-e-editoracao/programa-nacional-de-apoio-a-pesquisa/pnap-2011/o-endereco-dos-bailes-o-funk-como-representacao-cultural-carioca): reconhecimento do funk como expressão cultural e a disputa contra sua marginalização.
- [UFMG — A favela tem nome próprio](https://periodicos.ufmg.br/index.php/rbla/article/view/27245): linguagem situada, identidade e território nomeado, em vez de uma favela genérica.

As falas são curtas, úteis em combate e variam por intenção: seleção apresenta a persona,
kill comemora sem humilhar, rádio informa uma posição. Gíria entra só quando é legível e
coerente com a persona; não há imitação de artista, político, personagem ou voz real.

## Matriz do lote inicial

| Personagem | Registro | Limite |
| --- | --- | --- |
| Mandrake | confiante, breve, urbano | não forçar sotaque regional |
| Raul da Franja | vaidoso, leve, paulista | ironia sem deboche pessoal |
| Oakley | baixo, tático, direto | sem postura de policial ou milícia |
| Cria RJ | quente, rápido, competitivo | sem associar território a crime |
| Chave SP | sereno, econômico, articulado | informação primeiro, gíria depois |
| Funk Raiz | festivo e rítmico, sem cantar | não citar ou imitar MC real |
| Trap Funk | grave e contido | não transformar toda linha em ad-lib |
| Fluxo | sociável e ágil | sem bordão repetido em todas as falas |
| Ostentação | elegante, bem-humorado | sátira de visual, não de classe social |

## Protocolo técnico

- Provedor: OpenRouter TTS; `noVoiceCloning: true` no manifesto.
- Cada MP3 aponta para texto, voz sintética, hash, recibo e custo em
  `content/voice-lines.json`.
- A fala por personagem é priorizada na seleção, kill e rádio; se faltar arquivo, o runtime
  cai no pool da facção sem interromper a partida.
- `npm run eval:character-voice -- --generated` confere arquivo, hash, duração, recibo e
  legenda servida no manifesto. O estado `generated` ainda exige escuta humana antes de virar
  `approved` para um release.
