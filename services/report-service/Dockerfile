FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copy manifests
COPY package*.json ./

# 2. Install deps (includes dev deps for TS build)
RUN npm install

# 3. Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runner stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# 4. Install only production deps (NO build tools)
COPY package*.json ./
RUN npm install --omit=dev

# 5. Copy compiled output
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
