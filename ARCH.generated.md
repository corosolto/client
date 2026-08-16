# ARCH.generated.md — referência gerada

Este arquivo é **gerado automaticamente**. Não edite à mão.

Números atuais das zonas, do quality gate e do `package.json`:

<!-- BEGIN:GERADO:zonas — não edite à mão, rode `npm run docs` -->

| Zona | O que é | Tamanho medido | Regra |
|---|---|---|---|
| `public/` | o **jogo** | 40 arquivos `.js`, 30.064 linhas · Three.js `r160` vendorizado | ES modules servidos crus, **zero build**, sem dependência de runtime |
| `src/` | o **site** | 18 páginas `.astro`, 19 rotas `/api` · Astro `^7.1.1` | framework é bem-vindo; `service_role` só no servidor |
| `tools/` | o **arnês** | 181 scripts em `tools/eval/`, 54 em `tools/` | node puro: sobe o jogo real sem browser |

**Não existe `public/index.html`.** O HTML do jogo é `src/pages/index.astro`, servido na rota `/`. Servir `public/` estaticamente entrega os arnêses visuais, **não o jogo** — é a pegadinha que custa a primeira hora de todo mundo.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `git ls-files 'src/pages/**/*.astro' 'src/pages/api/*.ts' public/index.html`

<!-- END:GERADO:zonas -->

---

Comandos e scripts atuais do quality gate:

<!-- BEGIN:GERADO:scripts — não edite à mão, rode `npm run docs` -->

```bash
npm run check        # npm run syntax && npm run audio:check && npm run eval:medianet && npm run eval:ctfhud && npm run eval:vm && npm run eval:invariants && npm run eval:kick && npm run eval:bots
npm run check:fast   # node tools/eval/runner.mjs syntax eval:release eval:telemetry eval:identity eval:error-console eval:error-origin eval:webgl eval:webglguard eval:maprotate eval:shaderlog eval:shaderbudget eval:botbrain eval:prune eval:vminspect eval:faccao eval:mapid eval:mapjson eval:mapcontrato eval:parquewheel eval:redesign eval:matchoptions eval:charvoice eval:screenquery docs:check arch:check audio:check feet:check eval:vmlabhud eval:ctfhud eval:pause eval:ctfround eval:ctfwin eval:spawn eval:regen eval:pegada eval:dmgdir eval:ctflabels anims:check anims:merge:check walls:check media:check menuwalls:check travessao:check eval:medianet eval:posters eval:grafitelayout eval:simclock eval:backendhints changelog:check
```

`package.json` tem **107 scripts**. Vários trazem uma chave `//nome` logo acima com o motivo de existirem — é onde mora o porquê.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `node -p "Object.keys(require('./package.json').scripts)"`

<!-- END:GERADO:scripts -->
