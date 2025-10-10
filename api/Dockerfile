FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests explicitly to fail fast if lockfile is missing
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the API source
COPY . .

# Build the NestJS project
RUN npm run build

# Runtime image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Copy built assets and environment example
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env.example

EXPOSE 3000
CMD ["node", "dist/src/main.js"]
