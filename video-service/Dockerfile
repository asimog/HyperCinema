# Stage 1: Install dependencies
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --include=dev --no-audit --no-fund

# Stage 2: Build TypeScript
FROM deps AS build
WORKDIR /app
COPY tsconfig.json ./
COPY video-service ./video-service
RUN npm run video:build

# Stage 3: Runner — clone OpenMontage, install system deps, run server
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
# Railway sets PORT dynamically; default to 8090 for local dev
ENV PORT=8090

# Install system dependencies: ffmpeg, git, ca-certificates
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates git curl \
  && rm -rf /var/lib/apt/lists/*

# Clone OpenMontage at build time
RUN git clone https://github.com/calesthio/OpenMontage.git /app/openmontage

# Install OpenMontage dependencies
WORKDIR /app/openmontage
RUN if [ -f "package.json" ]; then npm install --omit=dev --no-audit --no-fund; fi

# Back to app root, install video-service runtime deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy built video-service
COPY --from=build /app/video-service/dist ./video-service/dist

# Ensure OpenMontage output directory exists
RUN mkdir -p /app/openmontage/output

EXPOSE ${PORT}

CMD ["node", "video-service/dist/server.js"]
