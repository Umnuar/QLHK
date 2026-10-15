#!/bin/sh
set -e
echo "[Docker] Generating Prisma Client (Schema qlhk)..."
npx prisma generate
echo "[Docker] Starting QLHK Backend..."
exec npx tsx watch --clear-screen=false src/index.ts
