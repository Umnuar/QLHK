# Task Progress Tracker

- **Project**: QLHK-Backend
- **Base Branch**: `feat/qlhk-merge-qlcs`
- **Branch**: `roadmap/qlhk-backend-merge-qlcs`
- **Plan Reference**: `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.roadmap.md`
- **Baseline Checkpoint**: `45fd6fb` (52 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Implementation Steps

- [x] `Step 0`: Setup isolated branch `roadmap/qlhk-backend-merge-qlcs`, baseline verification & task tracker
- [x] `Step 1`: Prisma Schema Integration & DDL Extension
- [ ] `Step 2`: Policy DTO Types & Shared Age Calculation Engine
- [ ] `Step 3`: Database ETL & CCCD Re-encryption Migration Script
- [ ] `Step 4`: Backend Chúc Thọ Policy Controller & Service
- [ ] `Step 5`: Backend Hỗ Trợ Xã Hội (HTXH) Policy Controller & Service
- [ ] `Step 6`: Backend Policy Analytics & Excel Export/Import Controllers
- [ ] `Step 7`: Backend Policy Routes & RBAC Middleware Integration
- [ ] `Step 8`: Final Verification Gate (Full test suite, static typecheck & clean tree)

## Project Gotchas & Learned Invariants
- P0: Zero Comments in Code.
- Model names: `chuctho_profiles`, `htxh_profiles`, `profile_audit_log`.
- All policy endpoints mounted under `/api/policies/*` with `authenticateToken` and `authorizeVillage`.
- Worktree Isolation: Used `QLHK-Backend-Worktree` to avoid concurrency stomping with client merge agent.
