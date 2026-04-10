# Stage 1: Install dependencies
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# prisma/schema.prisma must be present before npm install so that
# the postinstall "prisma generate" step can find the schema.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install --include=dev --no-audit --no-fund

# Stage 2: Runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
# Railway sets PORT dynamically; default to 8080 for local dev
ENV PORT=8080

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy application code
COPY tsconfig.json ./
COPY workers ./workers
COPY lib ./lib
COPY prompts ./prompts

EXPOSE ${PORT}

CMD ["npx", "tsx", "workers/server.ts"]
