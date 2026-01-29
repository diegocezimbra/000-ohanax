# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install build tools for native dependencies (bcrypt)
RUN apk add --no-cache python3 make g++

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Reinstall production dependencies to ensure native modules are compiled for this architecture
RUN npm ci --only=production && npm rebuild bcrypt --build-from-source

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app

USER nestjs

# Force IPv4 DNS resolution to avoid IPv6 connectivity issues with some cloud providers
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

EXPOSE 3005

CMD ["node", "dist/main"]
