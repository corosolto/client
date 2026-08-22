# Lote Suno — candidatas para escuta

Gerado em 22/08/2026 no workspace do projeto. Nenhuma faixa desta lista entra em
`public/audio/` até dois passos humanos: escuta/aprovação e **Download** pelo canal oficial
do Suno. O termo atual diferencia stream de download permitido; copiar a URL de streaming não
é um substituto válido.

| Família | Faixa | Variação A | Variação B |
| --- | --- | --- | --- |
| Shoegaze | Faróis Apagados | [0:42](https://suno.com/song/6dfdf89e-80d7-4e0a-a8fd-614457f355e0) | [1:00](https://suno.com/song/29d40dbe-147b-451b-b936-caf447e2926a) |
| Dreamy alternative | Vidro Molhado | [0:38](https://suno.com/song/093dc1cc-a182-46cc-b4fa-1dabaf741e8e) | [0:33](https://suno.com/song/d2386185-ccf2-4dcb-925b-755fa6ccb03e) |
| Indie rock | Linha Amarela | [0:24](https://suno.com/song/44b35d69-f4ed-4b04-8791-b579067392f6) | [0:24](https://suno.com/song/eff30585-7379-4d13-b0a6-56d08671b6cd) |
| Post-punk | Pequenas Revoltas | [0:22](https://suno.com/song/6722b5f4-afab-49d3-9309-5df793f45b19) | [0:22](https://suno.com/song/1ded1941-85b6-446a-888b-c6c10012584b) |
| Afro house | Sol de Concreto | [3:10](https://suno.com/song/384363e8-e375-4cba-9308-43da5dde332c) | [2:42](https://suno.com/song/88a579fc-4ef9-4273-ad95-3e14b134a5e4) |
| Afro house | Ritual de Rua | [3:06](https://suno.com/song/c587f6b5-c23a-4ed3-a7b6-3916729da14e) | [3:55](https://suno.com/song/0bd1aaee-2fa5-4207-85b2-b723644ad688) |
| Black metal | Noite Sem Santo | [0:38](https://suno.com/song/708419b0-2fd7-465e-a0a5-925ee59b1629) | [0:47](https://suno.com/song/4381574e-fd03-400b-980a-de86cb2cb443) |
| Thrash metal | Alarme de Aço | [0:31](https://suno.com/song/6e74456e-d79e-4e18-9b4b-a18b10a6a212) | [0:35](https://suno.com/song/9976cf02-15c2-4216-b272-a9623aeb5234) |
| Death metal | Pátio Vazio | [1:34](https://suno.com/song/01510eff-bbd5-4c10-97d2-468f82b3bcba) | [0:54](https://suno.com/song/b3178690-b1d4-4dd0-a59a-5df56b93603b) |

## Integração, depois da escolha

1. Baixar a variação aprovada no botão **Download** do Suno, guardando o comprovante e o plano
   ativo na data.
2. Normalizar o MP3 a −16 LUFS, registrar hash e procedência em
   `public/audio/soundtrack/SOURCES.md`.
3. Derivar `menu-music/mNN.mp3` de cada música escolhida e atualizar `TRACKS.txt`.
4. Rodar `npm run audio`, `npm run audio:check` e `npm run audio:provenance -- --strict`.

Até esses passos, elas são material de seleção — não promessa de pacote Steam nem substituição
das faixas antigas.
