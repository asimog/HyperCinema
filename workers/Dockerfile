# Stage 1: Install all deps (including dev for ts compilation)
FROM node:22-alpine AS deps
# Patch known CVEs in base OS packages
RUN apk upgrade --no-cache
WORKDIR /app
# prisma generate runs postinstall — needs schema present
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install --include=dev --no-audit --no-fund

# Stage 2: Runtime image
FROM node:22-alpine AS runner
# Patch known CVEs in base OS packages
RUN apk upgrade --no-cache
WORKDIR /app

ENV NODE_ENV=production
# Railway sets PORT dynamically; default to 8080
ENV PORT=8080

# Copy deps and app code
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

COPY tsconfig.json ./
COPY workers ./workers
COPY lib ./lib
COPY prompts ./prompts
COPY prisma ./prisma
COPY prisma.config.ts ./

EXPOSE ${PORT}

# Run DB migrations then start worker
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx workers/server.ts"]
