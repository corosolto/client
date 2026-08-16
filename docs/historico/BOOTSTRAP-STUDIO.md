# BOOTSTRAP — CS BRASIL Studio v0.1 (enxuto)

> Cole no Claude Code **depois** que o Blender estiver conectado (BlenderMCP respondendo) e o `gltf-transform` instalado. Não é pra construir a plataforma inteira — só o núcleo útil.

---

Você é o Arquiteto do **CS BRASIL Studio**. Sua missão é construir uma **infraestrutura mínima e local** que qualquer agente (Claude Code, Codex, Gemini) use pra validar, otimizar e integrar assets 3D no jogo CS BRASIL — **sem SaaS pago obrigatório**, tudo por linha de comando.

REGRAS
- **Não toque no jogo:** não altere gameplay, regras, narrativa, mapas ou personagens existentes. Você constrói só a ferramenta.
- **Construa incremental e pare pra eu testar** a cada etapa. Nunca pule etapas.
- **Enxuto:** NÃO crie ainda task-queue, workflow-engine YAML nem 10 agentes. Só o que está abaixo.
- Stack: **Python + Typer + Rich** (CLI) chamando ferramentas externas (Blender via BlenderMCP, gltf-transform, ffmpeg/imagemagick se preciso).
- Ferramentas devem ser **substituíveis** (cada uma atrás de um wrapper).

ESTRUTURA (crie numa pasta `studio/` na raiz, ou repo separado `cs-brasil-studio/` — pergunte qual eu prefiro)
```
studio/
  cli.py            # comando `studio`
  tools/            # wrappers (blender.py, gltf.py, img.py)
  docs/
    asset-format.md # o CONTRATO de asset (ver abaixo)
  agents/           # 2-3 prompts de papel
  outputs/
```

CONSTRUA NESTA ORDEM (uma por vez, testando):

1. **`studio doctor`** — verifica e reporta (✓/✗) o que está instalado/configurado: Blender, BlenderMCP (responde?), uv, Node, gltf-transform, git, ffmpeg/imagemagick. Diz o que falta e como instalar.

2. **`studio validate <arquivo.glb>`** — valida um GLB e reprova se estiver fora do padrão. Checa: GLB válido, nº de triângulos (< limite configurável), escala (bounding box em metros plausível), pivô na base/centro, presença de materiais, nomes sem espaço. Sai com código de erro se reprovar.

3. **`studio optimize <arquivo.glb>`** — roda gltf-transform: dedup, weld, draco/meshopt, resize de textura, e gera saída otimizada em `outputs/`. Reporta antes/depois (KB, tris).

4. **`studio import-character <glb> <id>`** e **`studio import-map <glb> <id>`** — valida → otimiza → copia pra `public/models/<tipo>/<id>.glb` → gera thumbnail (render via Blender/BlenderMCP) → atualiza um `registry.json`. Não mexe na lógica do jogo, só coloca o arquivo e registra.

5. **`docs/asset-format.md`** — escreva o **contrato**: como um personagem/arma/mapa deve vir (formato GLB, escala em metros, pivô, convenção de nomes, animações esperadas pra personagem [idle/walk/run/shoot/death], limite de tris, textura máx). É esse doc que permite um contribuidor externo criar asset compatível.

6. **`agents/`** — crie 2-3 prompts de papel curtos: `environment-artist.md` (só melhora cenário, usa Blender/CC0, nunca mexe em gameplay), `character-artist.md`, `qa-agent.md` (roda `studio validate`).

Ao terminar cada comando, mostre o uso real (`studio doctor`, depois `studio validate` num GLB de teste do Quaternius) e pare pra eu conferir antes do próximo.

---

## Do lado do jogo (quem faz: o outro Claude / Cowork)
O jogo vai **consumir** o `registry.json` + os GLB de `public/models/`. O loader (GLTFLoader + AnimationMixer) e o mapeamento por `id` são feitos no `game.js`/`characters.js`. O studio só **produz e valida**; o jogo **carrega**. Mantenha os dois lados falando pelo `asset-format.md`.
