# Procedência dos efeitos de arma

Esta pasta só aceita alternativas **originais ou licenciadas**. Sons extraídos,
capturados, recriados a partir de Counter-Strike/Valve ou de qualquer jogo de
terceiro não entram. O manifesto de armas continua curado manualmente; este
registro não altera `weapons`, `weaponSamples`, `cs` ou `general`.

<!-- AUDIO-PROVENANCE:BEGIN -->
```json
{
  "schema": 1,
  "assets": []
}
```
<!-- AUDIO-PROVENANCE:END -->

Cada arquivo futuro em `weapons/` precisa de um registro `generated` ou
`procured` igual ao contrato de `../soundtrack/SOURCES.md`, mais:

```json
{
  "sourceKind": "original-generation"
}
```

Valores permitidos para `sourceKind`: `original-generation`,
`recorded-in-house`, `licensed-library` e `cc0`. Antes de trocar uma entrada
curada, valide o lote com `npm run audio:provenance -- --strict
--require-weapons`; só depois regenere o manifesto pelo disco.
