# Workers — X Bot only
FROM node:22-alpine AS deps
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install --include=dev --no-audit --no-fund

FROM node:22-alpine AS runner
RUN apk upgrade --no-cache
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8082

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

COPY tsconfig.json ./
COPY workers/x-bot.ts ./workers/x-bot.ts
COPY workers/x-bot-only.ts ./workers/x-bot-only.ts
COPY lib ./lib
COPY prompts ./prompts
COPY prisma ./prisma
COPY prisma.config.ts ./

EXPOSE ${PORT}

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx workers/x-bot-only.ts"]
