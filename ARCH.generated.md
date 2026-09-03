# ARCH.generated.md — referência gerada

Este arquivo é **gerado automaticamente**. Não edite à mão.

Números atuais das zonas, do quality gate e do `package.json`:

<!-- BEGIN:GERADO:zonas — não edite à mão, rode `npm run docs` -->

| Zona | O que é | Tamanho medido | Regra |
|---|---|---|---|
| `public/` | o **jogo** | 57 arquivos `.js`, 36.929 linhas · Three.js `r160` vendorizado | ES modules servidos crus, **zero build**, sem dependência de runtime |
| `src/` | o **site** | 20 páginas `.astro`, 4 rotas `/api` · Astro `^7.1.1` | framework é bem-vindo; `service_role` só no servidor |
| `tools/` | o **arnês** | 221 scripts em `tools/eval/`, 58 em `tools/` | node puro: sobe o jogo real sem browser |

**Não existe `public/index.html`.** O HTML do jogo é `src/pages/index.astro`, servido na rota `/`. Servir `public/` estaticamente entrega os arnêses visuais, **não o jogo** — é a pegadinha que custa a primeira hora de todo mundo.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `git ls-files 'src/pages/**/*.astro' 'src/pages/api/*.ts' public/index.html`

<!-- END:GERADO:zonas -->

---

Comandos e scripts atuais do quality gate:

<!-- BEGIN:GERADO:scripts — não edite à mão, rode `npm run docs` -->

```bash
npm run check:fast   # node tools/eval/runner.mjs syntax eval:analytics eval:online eval:release eval:error-console eval:edgecache eval:webgl eval:webglguard eval:maprotate eval:shaderlog eval:shaderbudget eval:prune eval:vminspect eval:faccao eval:mapid eval:mapjson eval:mapcontrato eval:pickuparma eval:parquewheel eval:redesign eval:matchoptions eval:charvoice eval:screenquery docs:check arch:check audio:check feet:check eval:vmlabhud eval:ctfhud eval:pause eval:ctfround eval:ctfwin eval:spawn eval:regen eval:pegada eval:dmgdir eval:ctflabels anims:check anims:merge:check walls:check media:check menuwalls:check travessao:check eval:medianet eval:posters eval:grafitelayout eval:simclock eval:backendhints changelog:check eval:velhooeste eval:penitenciaria eval:mutcega eval:autofix eval:deploygate eval:portaointeiro eval:wfsecret eval:comentario eval:fixture eval:preload eval:docsautoria eval:netcode eval:netcodecbin eval:movimento eval:botsim-golden eval:replaycam eval:corrego-contract eval:corrego-water eval:corrego-superficie eval:skylife
```

`package.json` tem **137 scripts**; o motivo de cada um mora em `SCRIPTS.md` (migrado das chaves `//nome` em 18/08/2026) — é onde está o porquê.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `node -p "Object.keys(require('./package.json').scripts)"`

<!-- END:GERADO:scripts -->
