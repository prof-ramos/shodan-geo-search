# Stage 1: Build React dashboard
FROM node:22-alpine AS builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server.js ./
COPY public/ ./public/
COPY --from=builder /app/public/dashboard ./public/dashboard
EXPOSE 3000
CMD ["node", "server.js"]
