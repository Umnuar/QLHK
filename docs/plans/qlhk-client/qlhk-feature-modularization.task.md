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
- [/] Step 5: Chúc Thọ StatsBar, FilterBar & Table High-Fidelity trong features/qlcs/chuctho
- [ ] Step 6: Chúc Thọ Drawer, Modal 14 trường & Page Integration
- [ ] Step 7: Hỗ Trợ Xã Hội StatsBar, FilterBar & Table High-Fidelity trong features/qlcs/htxh
- [ ] Step 8: Hỗ Trợ Xã Hội Drawer, Modal Checkbox, Page Integration & Legacy Cleanup
- [ ] Step 9: Final Verification Gate (Zero Regression, Full Suite, Build)

## Project Gotchas & Learned Invariants
- [Invariant]: Zero Comments in Code (P0). Absolutely no comments (//, /* */, #, JSDoc) in any new or modified code.
- [Invariant]: Diff Gate <= 200 gross LOC per commit.
- [Invariant]: Feature Slices architecture pattern with sub-components <= 150 LOC each.
- [Gotcha]: Windows CRLF line endings - normalize to LF or use Node.js UTF-8 reads/writes.
