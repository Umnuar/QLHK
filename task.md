# Task Progress Tracker

- **Project**: QLHK (Hệ thống Quản lý Hộ khẩu Đăk Hà)
- **Plan Reference**: User Roadmap Prompt /grill-me v1.5.0
- **Baseline Git Checkpoint**: `0bd7b00` (Clean working tree, Backend: 115/115 PASS, Client: 154/154 PASS)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped - Cleanly Rolled Back)

## Execution Checklist

- [x] Step 1: Backend Data Persistence - Bổ sung các trường nhân khẩu trong `households.controller.ts`
  - Target Files: `QLHK-Backend/src/controllers/households.controller.ts`
  - Assigned Role: `c:/Users/umnuar/Documents/Projects/.agents/backend-architect.md`
  - Graph Check: `graft ask "getHouseholds" --source`
  - Diff Budget: <= 50 LOC
  - Tests: Backend 115 tests PASS (100% green)

- [x] Step 2: Client Data Persistence & Unit Tests - Bổ sung mapping trong `householdApi.ts`
  - Target Files: `QLHK-Client/src/api/householdApi.ts`, `QLHK-Client/src/api/__tests__/householdApi.test.ts`
  - Assigned Role: `c:/Users/umnuar/Documents/Projects/.agents/frontend-developer.md`, `c:/Users/umnuar/Documents/Projects/.agents/test-engineer.md`
  - Diff Budget: <= 100 LOC
  - Tests: Client 155 tests PASS (100% green)

- [ ] Step 3: Compact Density & Donut Rebalance - Tinh gọn giao diện Analytics và Donut 136px
  - Target Files: `QLHK-Client/src/components/common/statStyles.tsx`, `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Assigned Role: `c:/Users/umnuar/Documents/Projects/.agents/ui-ux-designer.md`
  - Diff Budget: <= 150 LOC
  - Tests: Client Analytics & UI tests PASS

- [ ] Step 4: Final Quality Gates & Verification
  - Verification: `npm test` Backend (115 PASS), `npm test` Client (155+ PASS), `npx tsc --noEmit` Client (0 error)
  - Docker container health check

## Project Gotchas & Learned Invariants
- [Container Prisma Sync]: Docker volume `/app/node_modules` cô lập; nếu sửa schema cần `docker exec dakha-qlhk-backend npx prisma generate && docker restart dakha-qlhk-backend`.
- [Browser Form Autofill]: Luôn đặt `autoComplete="off"` và `spellCheck={false}` trên toàn bộ text inputs để ngăn Chromium/Edge popup autofill.
- [Data Mapping Invariant]: Mọi trường trong Prisma Schema (`education`, `military_status`, `occupation`, `native_place`, `notes`) phải được select tại Backend và map rõ ràng tại `normalizeHousehold` trong Client để tránh mất dữ liệu khi mở lại modal.
