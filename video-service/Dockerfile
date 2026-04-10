# Stage 1: Install deps + build TypeScript
FROM node:22-alpine AS build
# Patch known CVEs in base OS packages
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install --include=dev --no-audit --no-fund
COPY tsconfig.json ./
COPY video-service ./video-service
RUN npm run video:build

# Stage 2: Runtime image
FROM node:22-alpine AS runner
# Patch known CVEs in base OS packages
RUN apk upgrade --no-cache
WORKDIR /app

ENV NODE_ENV=production
# Railway sets PORT dynamically; default to 8090
ENV PORT=8090

# ffmpeg for clip concat/thumbnail, ca-certs for HTTPS
RUN apk add --no-cache ffmpeg ca-certificates

# Install runtime deps only
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy compiled video-service
COPY --from=build /app/video-service/dist ./video-service/dist

EXPOSE ${PORT}

# Run DB migrations then start video service
CMD ["sh", "-c", "npx prisma migrate deploy && node video-service/dist/server.js"]
