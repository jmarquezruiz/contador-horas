# -------------------------
# Stage 1: Dependencies
# -------------------------
FROM node:20-alpine AS deps

WORKDIR /app


COPY package.json package-lock.json ./

RUN npm install

# -------------------------
# Stage 2: Builder
# -------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN npm build

# -------------------------
# Stage 3: Runner
# -------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Next standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
