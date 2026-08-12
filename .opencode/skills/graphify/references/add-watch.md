# graphify reference: add a URL and watch a folder

Load this when the user ran `/graphify add <url>` or passed `--watch`. Neither is part of the default build.

## For /graphify add

Fetch a URL and add it to the corpus, then update the graph.

Use a non-shell file-writing tool to create `graphify-out/.graphify_add_args.json`:

```json
{"url":"exact user URL","author":"optional author","contributor":"optional contributor"}
```

Do not paste any of these values into command or Python source.

```bash
$(cat graphify-out/.graphify_python) -c "
import json, sys
from graphify.ingest import ingest
from pathlib import Path

try:
    args = json.loads(Path('graphify-out/.graphify_add_args.json').read_text(encoding='utf-8'))
    out = ingest(args['url'], Path('./raw'), author=args.get('author'), contributor=args.get('contributor'))
    print(f'Saved to {out}')
except ValueError as e:
    print(f'error: {e}', file=sys.stderr)
    sys.exit(1)
except RuntimeError as e:
    print(f'error: {e}', file=sys.stderr)
    sys.exit(1)
"
```

If the command exits with an error, tell the user what went wrong - do not silently continue. After a successful save, automatically run the `--update` pipeline on `./raw` to merge the new file into the existing graph.

Supported URL types (auto-detected):
- YouTube / any video URL → audio downloaded via yt-dlp, transcribed to `.txt` on next run (requires `pip install 'graphifyy[video]'`)
- Twitter/X → fetched via oEmbed, saved as `.md` with tweet text and author
- arXiv → abstract + metadata saved as `.md`
- PDF → downloaded as `.pdf`
- Images (.png/.jpg/.webp) → downloaded, Claude vision extracts on next run
- Any webpage → converted to markdown via html2text

---

## For --watch

Start a background watcher that monitors a folder and auto-updates the graph when files change.

```bash
$(cat graphify-out/.graphify_python) -m graphify.watch "$(cat graphify-out/.graphify_root)" --debounce 3
```

Run Step 1 with the folder to watch so `.graphify_root` contains its resolved path. Behavior depends on what changed:

- **Code files only (.py, .ts, .go, etc.):** re-runs AST extraction + rebuild + cluster immediately, no LLM needed. `graph.json` and `GRAPH_REPORT.md` are updated automatically.
- **Docs, papers, or images:** writes a `graphify-out/needs_update` flag and prints a notification to run `/graphify --update` (LLM semantic re-extraction required).

Debounce (default 3s): waits until file activity stops before triggering, so a wave of parallel agent writes doesn't trigger a rebuild per file.

Press Ctrl+C to stop.

For agentic workflows: run `--watch` in a background terminal. Code changes from agent waves are picked up automatically between waves. If agents are also writing docs or notes, you'll need a manual `/graphify --update` after those waves.
