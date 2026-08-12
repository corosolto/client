# Ambiente local do jogo e do treino BotBrain.
FROM node:22-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN chown -R node:node /app /home/node
USER node

EXPOSE 4321

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4321"]
