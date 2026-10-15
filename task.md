# Task Progress Tracker

- **Project**: QLHK - Docker Prisma Client Synchronization
- **Plan Reference**: `[MANDATORY SYSTEM DIRECTIVE - DOCKER PRISMA SYNC]`
- **Baseline Git Checkpoint**: `5d34cb7`
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped - Cleanly Rolled Back)

## Execution Checklist

- [x] Step 1: Đồng bộ CSDL & Generate Prisma Client trên Host
  - Target: `QLHK-Backend/prisma/schema.prisma`
  - Assigned Role: `.agents/database-architect.md`
  - Commands: `npx prisma db push`, `npx prisma generate`
  - Diff Budget: 0 LOC (Schema already up to date, sync & generate only)
  - Tests: Prisma Client generated on Host
- [x] Step 2: Đồng bộ Prisma Client vào Container Docker đang chạy
  - Target: Docker container `dakha-qlhk-backend`
  - Assigned Role: `.agents/deployment-engineer.md`
  - Commands: `docker exec dakha-qlhk-backend npx prisma generate`, `docker restart dakha-qlhk-backend`
  - Tests: Container restarts cleanly
- [x] Step 3: Kiểm định sức khỏe Container & Xác thực 0 lỗi PrismaClientValidationError
  - Target: Endpoint `http://localhost:5002/api/health` & Citizen mutation
  - Assigned Role: `.agents/test-engineer.md`
  - Commands: `docker logs --tail 30 dakha-qlhk-backend`, `curl http://localhost:5002/api/health`, citizen update test
  - Tests: HTTP 200 ok, 0 PrismaClientValidationError

## Project Gotchas & Learned Invariants
- [Docker Prisma Gotcha]: Code máy host được mount vào /app trong container, nhưng /app/node_modules là Docker Volume cô lập. Sửa schema trên host thì /app/schema.prisma cập nhật ngay, nhưng Prisma Client trong container (/app/node_modules/.prisma/client) không tự cập nhật nếu không chạy `docker exec dakha-qlhk-backend npx prisma generate` và restart container.
