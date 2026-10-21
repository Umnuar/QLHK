# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `roadmap/qlhk-client-port-qlcs-ui`
- **Branch**: `roadmap/qlhk-feature-modularization`
- **Plan Reference**: `docs/plans/qlhk-client/qlhk-feature-modularization.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-client/qlhk-feature-modularization.roadmap.md`
- **Baseline Checkpoint**: `1cb2897` (183 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None

## Step Checklist
- [x] Step 0: Branch Isolation, Pre-Flight Gate & Task Initialization
- [x] Step 1: Khởi tạo cấu trúc features/qlhk và di chuyển components Hộ tịch
- [x] Step 2: Di chuyển pages QLHK vào features/qlhk/pages và cập nhật router & tests
- [x] Step 3.a: MicroBar và PolicyDonutChart trong features/qlcs/analytics
- [x] Step 3.b: PolicyGenderBar và PolicyKpiRow trong features/qlcs/analytics
- [x] Step 4.a: PolicyVillageTable và PolicyDistributionCards trong features/qlcs/analytics
- [x] Step 4.b: PolicyAnalyticsPage trong features/qlcs/pages và bridge router
- [x] Step 5.a: ChucThoStatsBar và ChucThoFilterBar trong features/qlcs/chuctho
- [x] Step 5.b: ChucThoTable trong features/qlcs/chuctho
- [x] Step 6.a: ChucThoDrawer và ChucThoModal trong features/qlcs/chuctho
- [x] Step 6.b: ChucThoPage integration, bridge router và test verification
- [x] Step 7.a: HtxhStatsBar vA HtxhFilterBar trong features/qlcs/htxh
- [x] Step 7.b: HtxhTable trong features/qlcs/htxh
- [x] Step 8.a: HtxhDrawer vA HtxhModal trong features/qlcs/htxh
- [x] Step 8.b: HtxhPage integration vA bridge router
- [x] Step 8.c: Cleanup legacy chuctho drawer and filterbar
- [x] Step 8.d: Cleanup legacy chuctho table and htxh filterbar
- [x] Step 8.e: Cleanup legacy htxh drawer
- [x] Step 8.f: Cleanup legacy htxh table
- [x] Step 8.g: Cleanup legacy chuctho modal
- [x] Step 8: Htxh Drawer, Modal, Page Integration vA Legacy Cleanup
- [x] Step 9: Final Verification Gate (Zero Regression, Full Suite, Build)

## Project Gotchas & Learned Invariants
- [Invariant]: Zero Comments in Code (P0). Absolutely no comments (//, /* */, #, JSDoc) in any new or modified code.
- [Invariant]: Diff Gate <= 200 gross LOC per commit.
- [Invariant]: Feature Slices architecture pattern with sub-components <= 150 LOC each.
- [Gotcha]: Windows CRLF line endings - normalize to LF or use Node.js UTF-8 reads/writes.
