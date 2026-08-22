# Migração segura: trilha, menu e efeitos de arma

Este é o contrato para substituir a música comercial e os sons de arma sem
apagar o lote anterior, sem editar `manifest.json` à mão e sem publicar um
arquivo sem origem verificável.

## O que entra em cada pasta

| Lote | Pasta final | Registro obrigatório | Regra especial |
| --- | --- | --- | --- |
| Trilha gerada/adquirida | `public/audio/soundtrack/` | `soundtrack/SOURCES.md` | MP3, kebab-case, −16 LUFS, hash e direito comercial por faixa |
| Menu derivado | `public/audio/menu-music/` | `menu-music/TRACKS.txt` | `mNN.mp3 <- soundtrack/faixa.mp3`; trim ~105 s a 22%, fade 1,5/5 s, −16 LUFS |
| SFX de arma | `public/audio/weapons/` | `weapons/SOURCES.md` | Som original/licenciado; nunca CS/Valve, rip ou extração |

O ledger de cada fonte tem um bloco JSON delimitado. O campo `accountPlan` é
obrigatório para geração porque o direito comercial pode depender do plano
vigente. O hash é do MP3 final, depois de qualquer normalização/transcodificação.

## Roteiro sem perda

1. Salve as novas faixas numa pasta de preparação fora de `public/audio/`, com
   subpastas `soundtrack/`, `menu-music/` e, se houver, `weapons/`. Copie os
   respectivos `SOURCES.md` e `TRACKS.txt` junto com o lote.
2. Preencha o ledger e rode, ainda nessa pasta:

   ```bash
   npm run audio:provenance -- --root /caminho/lote-audio --strict
   ```

   Para SFX de arma, acrescente `--require-weapons`. Esse comando só lê; ele não
   chama gerador, não gasta créditos e não escreve arquivos.
3. Faça backup recuperável das pastas atuais **fora** de `public/audio/` e
   registre o hash/total do backup. Não apague as originais nesta etapa.
4. Copie as faixas aprovadas para as pastas finais. Antes de remover qualquer
   arquivo antigo, rode `npm run audio` e guarde o relatório de órfãos que ele
   imprime. Órfão é sinal de que o manifest não alcança o arquivo no disco.
5. Só com o relatório revisado, remova o lote antigo. Rode novamente:

   ```bash
   npm run audio
   npm run audio:check
   npm run audio:provenance -- --strict
   ```

   `npm run audio` é o único escritor de `public/audio/manifest.json`: a pasta
   é a verdade. Para armas, revise a curadoria em separado; o gerador preserva
   `cs`, `weapons`, `general` e `weaponSamples` de propósito.
6. Escute em navegador menu, fim de round e uma partida. Depois monte o pacote
   de produção e rode `npm run eval:audio-pack-character-voice` para garantir
   que as legendas de personagem viajam com as chaves opacas.

## Comandos de auditoria

```bash
npm run audio:provenance                 # relatório, não altera nada
npm run audio:preflight                  # falha se trilha/menu instalados não têm contrato
npm run eval:audio-provenance             # testa a própria trava e mutações
```

O pré-voo não substitui conselho jurídico: ele impede a ausência de evidência,
mas cabe ao responsável conferir os termos do provedor e do plano antes de uma
distribuição monetizada.
