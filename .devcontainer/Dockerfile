FROM node:22-bookworm

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
    CHROME_BIN=/usr/local/bin/coro-solto-chromium

WORKDIR /tmp/coro-solto-deps
COPY package.json package-lock.json ./

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/* \
 && NPM_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1]")" \
 && npm install --global --no-audit --no-fund "npm@${NPM_VERSION}" \
 && PW_VERSION="$(node -p "require('./package-lock.json').packages['node_modules/playwright'].version")" \
 && npm install --global --no-audit --no-fund "playwright@${PW_VERSION}" \
 && playwright install --with-deps chromium \
 && BIN="$(node -e "const {execSync}=require('node:child_process');const root=execSync('npm root -g',{encoding:'utf8'}).trim();console.log(require(root + '/playwright').chromium.executablePath())")" \
 && test -x "$BIN" \
 && chown -R node:node /opt/pw-browsers \
 && ln -sf "$BIN" "$CHROME_BIN" \
 && rm -rf /tmp/coro-solto-deps

WORKDIR /home/node
