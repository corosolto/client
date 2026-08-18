#!/bin/sh
# Serializa comandos que sobem browser headless (AGENTS.md: um browser por vez,
# dois em paralelo derrubam o boot). Uso: with-browser-lock.sh <comando...>
LOCK=/tmp/csbr-browser.lock
i=0
while ! mkdir "$LOCK" 2>/dev/null; do
  i=$((i + 1))
  if [ $i -gt 144 ]; then echo "with-browser-lock: desisti após 12 min esperando $LOCK" >&2; exit 1; fi
  sleep 5
done
trap 'rmdir "$LOCK" 2>/dev/null' EXIT INT TERM
"$@"
exit $?
