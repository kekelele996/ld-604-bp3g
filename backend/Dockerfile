# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Prisma 需要 openssl
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 运行启动需要 prisma CLI 执行 migrate deploy，因此安装完整依赖
COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

COPY --from=build /app/dist ./dist

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
