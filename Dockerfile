# Stage 1: Build stage
FROM node:22-slim AS builder

# Set pnpm version to match package.json
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

# Install system dependencies
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy dependency configs
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN pnpm approve-builds --all
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm run postinstall && pnpm run build

# Stage 2: Production runner stage
FROM node:22-slim AS runner

WORKDIR /app

# Install native production runtime dependencies
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Set production env
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy Nitro production server bundle from builder
COPY --from=builder /app/.output ./.output

# Nuxt 3/4 runs on PORT 3000 internally
EXPOSE 3000

# Use a non-root security context
USER node

# Start Nuxt Nitro server
CMD ["node", ".output/server/index.mjs"]
