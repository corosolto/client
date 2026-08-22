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
      "path": "soundtrack/pilot-boombap-menor.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:49:36.562Z",
      "generationId": "gen-1787363359-neNiMbFThVOsHTgb3oUA",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "713289d35626c5117c943e164905586db1a18490e5404a46b8c9228f107716d8"
    },
    {
      "path": "soundtrack/pilot-hardcore-industrial.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:50:10.987Z",
      "generationId": "gen-1787363392-ZNGXMtBr78wM2zUHMbug",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "0dbdb24751e3aec624948c0992958115cc382a7a78aad3e2ba213c7caeb46637"
    },
    {
      "path": "soundtrack/pilot-reggae-rock-frigio.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:50:28.400Z",
      "generationId": "gen-1787363411-AG8Tal64DdEIUaKzg0zg",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "67d7fa378b69b4608c1f2f4ea28741ba160e6a10082c8880892f6eac4bc8878c"
    },
    {
      "path": "soundtrack/pilot-mandelao-escuro.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:52:14.836Z",
      "generationId": "gen-1787363516-4WCo2ZiPpvpiBLGqNTWq",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "bbf5ccb69318181b84c372c8fb76fbf87f461e365c8713f4b56c94cec5f7dc10"
    },
    {
      "path": "soundtrack/pilot-forro-rua.mp3",
      "kind": "generated",
      "provider": "OpenRouter",
      "model": "google/lyria-3-clip-preview",
      "accountPlan": "pending confirmation",
      "generatedAt": "2026-08-22T01:52:34.022Z",
      "generationId": "gen-1787363536-T6zo89AEJhPnEpcxqo1j",
      "termsUrl": "https://openrouter.ai/terms",
      "commercialUse": false,
      "rightsBasis": "Piloto gerado; plano da conta e direito comercial pendentes de confirmação humana antes de distribuição.",
      "sha256": "c9e69f250e186ed6fe98ee84efe326dc17b8987bc100fce0cdaf24d0f9321477"
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
