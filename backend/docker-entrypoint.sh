#!/bin/sh
set -e

# 等待 MySQL 就绪（compose 已通过 healthcheck gate，这里做二次兜底）
echo "[grid-repair] ensuring schema with prisma migrate deploy..."
npx prisma migrate deploy

echo "[grid-repair] starting backend..."
exec node dist/main.js
