FROM node:22-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy all files from the repository
COPY . .

# Install all dependencies (npm install automatically triggers nuxt prepare via postinstall)
RUN npm install

# Compile the application for production
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Expose internal port
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

# Start production server
CMD ["node", ".output/server/index.mjs"]
