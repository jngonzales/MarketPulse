# MarketPulse Pro - Discord Bot Dockerfile
# Using Debian slim for node-canvas system deps compatibility

FROM node:20-bullseye-slim AS builder

# Install system dependencies required by node-canvas
RUN apt-get update && apt-get install -y \
  python3 \
  build-essential \
  g++ \
  make \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Runtime image
FROM node:20-bullseye-slim AS runner

# Install runtime libs for node-canvas
RUN apt-get update && apt-get install -y \
  libcairo2 \
  libpango-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Start the bot
CMD ["node", "dist/index.js"]
