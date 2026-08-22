# Procedência da trilha

Este arquivo acompanha as faixas de `soundtrack/`; ele não entra no pacote de
produção. Registre uma linha por **arquivo final** antes de a faixa chegar em
`public/audio/`. `commercialUse: true` registra a afirmação feita na data; não
substitui conferir os termos do provedor antes de publicar.

O validador lê somente o bloco abaixo. Não guarde chaves, prompts privados ou
dados de pagamento aqui.

<!-- AUDIO-PROVENANCE:BEGIN -->
```json
{
  "schema": 1,
  "assets": []
}
```
<!-- AUDIO-PROVENANCE:END -->

## Formatos aceitos

Gerado por IA:

```json
{
  "path": "soundtrack/sertanejo-no-asfalto.mp3",
  "kind": "generated",
  "provider": "Suno",
  "model": "modelo usado na geração",
  "accountPlan": "nome do plano ativo na data",
  "generatedAt": "2026-08-22",
  "generationId": "id público/interno sem segredo",
  "termsUrl": "https://exemplo.com/termos",
  "commercialUse": true,
  "rightsBasis": "plano pago com uso comercial confirmado em 2026-08-22",
  "sha256": "hash SHA-256 do mp3 final"
}
```

Faixa adquirida:

```json
{
  "path": "soundtrack/batida-autoral.mp3",
  "kind": "procured",
  "provider": "biblioteca ou autor",
  "sourceUrl": "https://fonte.example/faixa",
  "license": "nome da licença ou contrato",
  "acquiredAt": "2026-08-22",
  "licenseEvidence": "URL ou identificador do recibo/contrato fora do Git",
  "commercialUse": true,
  "rightsBasis": "licença conferida para anúncios e distribuição",
  "sha256": "hash SHA-256 do mp3 final"
}
```
