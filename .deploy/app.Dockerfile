# -------------------------
# Stage 1: Dependencies
# -------------------------
FROM node:20-alpine AS deps

WORKDIR /app

RUN npm install -g pnpm@10.11.1

COPY package.json pnpm-lock.yaml ./

# Forzar instalación de todas las dependencias, 
RUN NODE_ENV=development pnpm install --frozen-lockfile

# -------------------------
# Stage 2: Builder
# -------------------------
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.11.1

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN pnpm build

# -------------------------
# Stage 3: Runner
# -------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Next standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
