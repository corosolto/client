# Identidade editorial do grafite — alias curado tag-larga → tag-fina

**Defeito real (audit 2026-10-31).** `tag-fina.png` e `tag-larga.png` são a MESMA arte
com recorte diferente (evidência: `audits/2026-10-31-visual-consistency/pool52-art-contactsheet-R1.jpg`,
pares visualmente idênticos; pixels/SHA dos arquivos diferem por causa do recorte RGBA).
O gate de curadoria contava identidade por **arquivo**, então o par passava GREEN
apesar de repetir a mesma arte — falso verde.

**Decisão.** Alias **explícito e curado** em um único lugar, `public/js/graffiti_art_id.js`:

```js
identidadeArteGrafite('/img/decals/tag-larga.png') === '/img/decals/tag-fina.png'
```

- **Sem fuzzy/similaridade em runtime.** Só o alias declarado; nenhum hash de pixels,
  nenhuma heurística automática.
- **Helper puro**, sem dependências: normaliza o caminho (URL decode + pathname) e aplica
  só aliases conhecidos. Ignora qualquer string que não seja caminho de decal/poster
  (`canvas:1`, `__proto__`, produtores) — sem lookup herdado de prototype.
- **Produtor:** `chaveArte` (`public/js/graffiti_pass.js`) usa o helper em **todos** os
  retornos de caminho (`image.src`, `texture.userData.decalArquivo`, fallback `poster:`
  e fallback de arquivo). Canvas (WeakMap) e regras de poster **intactos**.
- **Medidor:** `tools/eval/graffiti-curation-measure.mjs` importa o helper DENTRO da
  função (source serializado exige import interno) e conta `pieces.file` e chaves
  `unclassified` **normalizadas pela identidade** antes da contagem de duplicatas.
  `pieces.file` continua carregando o **caminho real** para auditoria; `duplicates`
  reporta o alias canônico com a contagem real — nada de contador forjado.
- Dedup do produtor (runtime/fresh-bake) já passava por `chaveArte` e herda o alias.
  O layout assado já foi refeito no bake pós-alias descrito abaixo.

**Portão.** `node tools/eval/graffiti-art-identity-check.mjs` (node puro, sem browser):
extrai a `chaveArte` **real** do fonte, injeta o helper **real** e prova:

1. alias conservado nas 4 vias (src absoluto/relativo/query/URL-encoded, userData, fallback);
2. recusa de colapsos: outros decals, posters, chaves canvas, `__proto__`/`constructor`;
3. contraprova: sem a entrada de alias a identidade racha (gate RED);
4. contraprova por via: remover UM uso do helper derruba a asserção correspondente.

Regressões intocadas: unique/unknown/outside/predicado/META da régua de curadoria seguem
iguais — só a chave de contagem muda de "arquivo" para "identidade editorial".

A identidade integra `impressao().pass` e `inputSources` do gerador: alterar o alias
invalida o layout e o checkpoint. Crítica independente R1 sem P1/P2 executou produtor
e medidor reais: fina/larga/xl produz 2 peças; a cena com as três reporta duplicata
canônica. Remover só o alias volta a produzir 3 e reproduz falso GREEN. Demais
202 decals + 22 posters mantidos em 874 variantes. Cabeçalho P3 reduzido a 2 linhas.

Bake ALL14 R1 real concluiu 437 peças, fingerprint `161c4394b4a2247a`;
`graffiti-layout-check.mjs --duplo` confirmou freshness e determinismo da impressão
(não é uma segunda execução física). O nominal runtime após o alias/bake foi medido
no Ego14 R21: 14 mapas, 458 peças e cinco contadores zero, com preferências restauradas.
O crítico `CRITICO-CURATION-EGO14-R21-COERENCIA-R1.md` conferiu 597 relações e a coerência
com os nominais CI identity R6; raw e pins vivem em
`audits/2026-10-31-visual-consistency/critico-curation-ego14-r21/coherence.json`.
Os seis pins de fonte e os 14 hashes raw conferem com `8ee224e48` nesta revisão
(`review-r71-fixes-r73/preflight-r21-pins.json`). O log R21 só retém GREEN, sem envelope
bruto ou hashes dos JS servidos naquela navegação; não há certificação retrospectiva
desses bytes nem aprovação artística geral, de produção, mobile, MP ou FPS.
SURVEY6 e os GREEN R6/R4 anteriores ao alias são históricos e não aprovam identidade.
A segunda passada física foi interrompida durante a crise do host; não
conta como determinismo comprovado. Arte singular editorial é válida para este par
conhecido; revisão visual continua necessária para descobrir novos aliases.
