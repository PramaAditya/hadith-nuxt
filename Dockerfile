# Stage 1: Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy dependency configs
COPY package.json package-lock.json tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source files
COPY . .

# Run build with increased memory limit for Vite/Nitro compilation
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run postinstall && npm run build

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
