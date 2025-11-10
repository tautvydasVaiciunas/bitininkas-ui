# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Builder'io metu priverstinai įjungiame dev režimą, kad gautume devDependencies (Nest CLI)
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false

# Manifestai + locko patikra
COPY package.json package-lock.json ./
RUN test -s package-lock.json || (echo "ERROR: api/package-lock.json missing or empty" && exit 1)
RUN node -v && npm -v

# Įdiegiame priklausomybes su devDeps ir buildinam
RUN npm ci --no-audit --no-fund
COPY . .
# Aiškiai kviečiam lokalią Nest CLI
RUN ./node_modules/.bin/nest build && node ./scripts/copy-public.js

# ---------- RUNTIME STAGE ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NPM_CONFIG_PRODUCTION=true

# Į runtime nevilkime builder'io node_modules (kad būtų švarus prod install)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
RUN npm ci --omit=dev --no-audit --no-fund

# Build artefaktai
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example

# Entrypoint (kopijuojam, sutvarkom CRLF ir suteikiam teisę vykdyti)
COPY entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh && chmod +x ./entrypoint.sh

EXPOSE 3000
CMD ["sh", "-lc", "./entrypoint.sh"]
