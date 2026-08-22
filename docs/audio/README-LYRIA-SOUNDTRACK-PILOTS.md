# Pilotos de trilha Lyria

`tools/generate-lyria-soundtrack-pilots.mjs` gera cinco pilotos instrumentais
originais de escuta em `public/audio/soundtrack/`:

- `pilot-asfalto-e-viola.mp3` — viola caipira e breakbeat urbano;
- `pilot-maracatu-noturno.mp3` — percussão de maracatu e tensão noturna;
- `pilot-baile-subterraneo.mp3` — tamborzão seco e grave controlado;
- `pilot-concreto-e-metais.mp3` — marcha de rua, metais e guitarra;
- `pilot-floresta-eletrica.mp3` — percussão, textura amazônica e guitarra.

O modelo padrão é `google/lyria-3-clip-preview`, chamado exclusivamente via
OpenRouter. Cada saída é convertida para MP3 44,1 kHz/128 kbps e normalizada a
−16 LUFS. O script consulta o recibo de cada chamada, mede duração com
`ffprobe`, recusa hash repetido e escreve o registro técnico em
`tools/eval/asset-evidence/lyria-soundtrack-pilots.json`.

## Uso

```bash
node tools/generate-lyria-soundtrack-pilots.mjs --dry-run
node tools/generate-lyria-soundtrack-pilots.mjs --env /caminho/privado/.env --max-cost-usd 3
node tools/generate-lyria-soundtrack-pilots.mjs --env /caminho/privado/.env --resume
```

O script não executa `npm run audio`, não altera o manifest, não toca em
`menu-music/` e não remove ou substitui faixas existentes. Os cinco MP3s são
pilotos: `public/audio/soundtrack/SOURCES.md` os marca com plano e direitos
comerciais pendentes. Confirme os termos e o plano da conta antes de promover
qualquer piloto ao pacote de distribuição ou derivar a música de menu.

Se uma execução for interrompida depois de uma chamada, `--resume` reaproveita
somente os arquivos já registrados no recibo local e continua os demais; não
gera a faixa concluída outra vez.
