FROM node:22-bookworm

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    CHROME_BIN=/usr/local/bin/coro-solto-chromium

WORKDIR /tmp/coro-solto-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY scripts/install-git-hooks.mjs scripts/

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/* \
 && PNPM_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1]")" \
 && npm install --global --no-audit --no-fund "pnpm@${PNPM_VERSION}" \
 && pnpm install --frozen-lockfile \
 && pnpm exec playwright install --with-deps chromium \
 && BIN="$(node -e "console.log(require('playwright').chromium.executablePath())")" \
 && test -x "$BIN" \
 && chown -R node:node /opt/pw-browsers \
 && ln -sf "$BIN" "$CHROME_BIN" \
 && rm -rf /tmp/coro-solto-deps

WORKDIR /home/node
