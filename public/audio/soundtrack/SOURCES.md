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
  "assets": [
    {
      "path": "soundtrack/pilot-asfalto-e-viola.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:26:34.999Z",
      "generationId": "gen-1787361976-F8SszbK4ETp0WxeVSzwC",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "977244ff04ed233d3ff5cca62d7e216c31743f0e5bd975ed23f7996d0555fbcc"
    },
    {
      "path": "soundtrack/pilot-maracatu-noturno.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:26:55.039Z",
      "generationId": "gen-1787361995-z5jJ3jkqpO1vCXlv6LSM",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "ad5b2c1065b9f23ca14b055796952eac26fcca198f1b0532c7ab6952bf3ae20b"
    },
    {
      "path": "soundtrack/pilot-baile-subterraneo.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:27:11.924Z",
      "generationId": "gen-1787362015-hOuYf550sl2cVSpSpi6a",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "86f00192d15e39db21b9b92cd8166fc9fef1e3d0a95de407c21cd04c816dfc25"
    },
    {
      "path": "soundtrack/pilot-concreto-e-metais.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:27:38.610Z",
      "generationId": "gen-1787362038-94CUoNdN9mVc6RnaCuvX",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "8ac64401f61495cfc5d902d8000cb1fb46a9ba37d624d59984b139df88be70e3"
    },
    {
      "path": "soundtrack/pilot-floresta-eletrica.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:27:59.013Z",
      "generationId": "gen-1787362058-kvnMtfnM5VD1cZxGvOMH",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "5e3c867779ac0ac00cd6021a733afbb08ac7e4fb20e29f2af004a8ea187e885f"
    }
  ]
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
