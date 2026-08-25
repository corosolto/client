# ARCH.generated.md — referência gerada

Este arquivo é **gerado automaticamente**. Não edite à mão.

Números atuais das zonas, do quality gate e do `package.json`:

<!-- BEGIN:GERADO:zonas — não edite à mão, rode `npm run docs` -->

| Zona | O que é | Tamanho medido | Regra |
|---|---|---|---|
| `public/` | o **jogo** | 59 arquivos `.js`, 41.148 linhas · Three.js `r160` vendorizado | ES modules servidos crus, **zero build**, sem dependência de runtime |
| `src/` | o **site** | 18 páginas `.astro`, 21 rotas `/api` · Astro `^7.1.1` | framework é bem-vindo; `service_role` só no servidor |
| `tools/` | o **arnês** | 302 scripts em `tools/eval/`, 77 em `tools/` | node puro: sobe o jogo real sem browser |

**Não existe `public/index.html`.** O HTML do jogo é `src/pages/index.astro`, servido na rota `/`. Servir `public/` estaticamente entrega os arnêses visuais, **não o jogo** — é a pegadinha que custa a primeira hora de todo mundo.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `git ls-files 'src/pages/**/*.astro' 'src/pages/api/*.ts' public/index.html`

<!-- END:GERADO:zonas -->

---

Comandos e scripts atuais do quality gate:

<!-- BEGIN:GERADO:scripts — não edite à mão, rode `npm run docs` -->

```bash
npm run check:fast   # node tools/eval/runner.mjs syntax eval:release eval:telemetry eval:identity eval:error-console eval:error-origin eval:webgl eval:webglguard eval:maprotate eval:shaderlog eval:shaderbudget eval:botbrain eval:prune eval:vminspect eval:faccao eval:mapid eval:mapjson eval:mapcontrato eval:ambience-registry eval:parquewheel eval:redesign eval:matchoptions eval:charvoice eval:screenquery docs:check arch:check audio:check feet:check eval:vmlabhud eval:ctfhud eval:pause eval:ctfround eval:ctfwin eval:spawn eval:regen eval:pegada eval:dmgdir eval:ctflabels anims:check anims:merge:check walls:check media:check menuwalls:check travessao:check eval:medianet eval:posters eval:grafitelayout eval:simclock eval:backendhints changelog:check eval:velhooeste eval:penitenciaria eval:piscina-bsp eval:charhard eval:charpbr eval:motoca-visual eval:camera-grip eval:pilot-system eval:pilot-grip eval:char-thumbnail eval:asset-integrity eval:gltf-validator eval:props-acervo eval:propsuv1 eval:character-voice eval:audio-pack-character-voice eval:cinematic-ui eval:grafite-editorial eval:map-source eval:map-new eval:campo-contract eval:lajes-rooftop eval:lajes-visual eval:lajes-authored eval:lajes-spatial eval:lajes-gap eval:lajes-circuito eval:lajes-antitrap eval:mansao-water eval:mansao-garden eval:corrego-contract eval:corrego-water eval:look eval:mansao-ocean eval:wind eval:softparticles eval:escala-favela eval:escadao-contract eval:slice-abilities eval:faction-registry eval:mapview eval:devport spec:check skills:check eval:pickuparma eval:mutcega eval:autofix eval:deploygate eval:portaointeiro eval:wfsecret eval:comentario eval:fixture eval:preload eval:docsautoria eval:replaycam
```

`package.json` tem **187 scripts**; o motivo de cada um mora em `SCRIPTS.md` (migrado das chaves `//nome` em 18/08/2026) — é onde está o porquê.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `node -p "Object.keys(require('./package.json').scripts)"`

<!-- END:GERADO:scripts -->
