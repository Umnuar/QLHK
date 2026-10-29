# Implementation Plan: Fix Policy Calculation Year Dynamic Projection (`fix-policy-calculation-year-dynamic-projection`)

- **Task Name (`<TASK_NAME>`)**: `fix-policy-calculation-year-dynamic-projection`
- **Task Type**: `Bugfix`
- **Source Input**: `User Request`
- **Target Branch (for `roadmap`)**: `fix/policy-calculation-year-dynamic-projection`
- **Full Test Command**: `node QLHK/QLHK-Client/node_modules/vitest/vitest.mjs run --environment jsdom QLHK/QLHK-Client/src/features/qlcs/components/dashboard/__tests__/ProfileRow.test.tsx`
- **Typecheck / Lint Command**: `node QLHK/QLHK-Client/node_modules/typescript/bin/tsc --project QLHK/QLHK-Client/tsconfig.json --noEmit && cmd /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo check --manifest-path "C:\Users\umnuar\Documents\Projects\QLHK\QLHK-Backend-Rust\Cargo.toml" --target-dir "C:\Users\umnuar\AppData\Local\Temp\cargo_target"'`
- **Total Implementation Steps**: 3 (plus Final Verification Gate)

---

## 1. Context & Goal
When switching calculation years in the Policy module (QLCS/Chuc Tho & HTXH), switching to 2027 calculates ages, but switching back to 2026 returns 0 records, and returning to 2027 also loses data. The root cause is that the backend and database treat "Calculation Year" as a destructive static in-place database tag (`UPDATE calculation_year` and SQL `WHERE p.calculation_year = $1`), rather than a pure dynamic projection (view) based on citizen date of birth (`dob`) and selected target year (`tuổi = năm_chọn - năm_sinh`). The goal is to transform the calculation year into a non-destructive dynamic projection where all senior citizens remain intact in the database, milestones and ages are computed on-the-fly for any selected year, and switching years (2026 -> 2027 -> 2026 -> 2028) never loses data.

## 2. Assumptions
- `ASM-01`: Senior citizen identities and dates of birth (`dob`) in `qlhk.chuctho_profiles`, `qlhk.htxh_profiles`, and `qlhk.citizens` are persistent records representing the commune population; switching calculation years should never alter or delete these records.
- `ASM-02`: Age milestones for Chúc Thọ (60, 65, 70, 75, 80, 85, 90, 95, 100, >100) and HTXH (age75plus, age70to74poor) can be projected deterministically from `dob` and `target_year` without requiring database mutations.
- `ASM-03`: `calculation_year` query parameter represents the requested projection year for viewing and calculating statistics, defaulting to the current calendar year if omitted.

## 3. Non-Goals (Out of Scope — YAGNI)
- Do not redesign or alter the PostgreSQL table schemas or add multi-year clone rows per citizen.
- Do not modify household registration or citizen PII encryption logic.
- Do not install external date-calculation libraries; use native Rust `chrono` and existing TypeScript date utilities.

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs` | `47-150` | `get_chuctho_profiles`: queries profiles with rigid `WHERE p.calculation_year = $cy` and destructive auto-sync. |
| `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs` | `712-815` | `get_htxh_profiles`: queries HTXH profiles with rigid `WHERE p.calculation_year = $cy`. |
| `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs` | `1943-2070` | `recalculate_policies`: updates all records in-place with `SET calculation_year = $target_year`. |
| `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs` | `2120-2210` | `get_policy_analytics`: filters analytics strictly by `calculation_year = $1`. |
| `QLHK/QLHK-Client/src/hooks/useProfiles.ts` | `180-240` | `useProfiles`: caches profiles by `yearTag` in IndexedDB, which can cache empty results when year changes. |
| `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx` | `75-90` | `handleGlobalYearChange`: triggers recalculate and loadPage sequentially. |

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. Remove the restrictive `WHERE p.calculation_year = $cy` SQL filter from `get_chuctho_profiles`, `get_htxh_profiles`, and `get_policy_analytics`. Query all non-deleted profiles in scope.
  2. In memory / projection layer, evaluate each profile's age and milestone flags for the requested `target_year = params.calculation_year.unwrap_or(current_year)` using `dob`. Return the projected `calculation_year`, `age60..age_over_100`, and `age75plus`/`age70to74poor` in the HTTP response.
  3. When an age milestone filter is requested (e.g. `milestone = "age70"` or `category = "age75plus"`), evaluate the filter against the dynamically projected milestone for that target year.
  4. Make `recalculate_policies` an additive sync: sync any new citizens turning 60+ in that year from `qlhk.citizens` without overwriting or invalidating other records.
  5. In `useProfiles.ts`, invalidate or bypass stale cache on year change so switching between 2026, 2027, 2028 always fetches fresh projected data.
- **Caller / Contract Blast Radius**: Affects `GET /policies/chuctho`, `GET /policies/htxh`, `GET /policies/analytics`, and `POST /policies/recalculate`. Client response DTO schema remains 100% unchanged (`ChucthoProfileResponse`, `HtxhProfileResponse`).
- **Rejected Alternatives (`<= 2`)**:
  1. *Duplicate database rows for each year (e.g., clone every person for 2026, 2027, 2028)*: Rejected because it duplicates thousands of records, violates data normalization, and complicates updates.
  2. *Execute full table UPDATE on every year switch*: Rejected because it mutates production data on view actions, causes race conditions when switching years quickly, and wipes previous year states.
- **UI/UX & Design Heuristics**:
  - *Hierarchy & Layout*: Retain exact table structure and year badge in filter bar. Seamless transition when selecting 2026, 2027, 2028 with zero delay and zero data loss.
  - *Systemic Consistency*: Harmonize with existing `ProfileRow` dynamic age and milestone pill badges.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Backend Rust - Dynamic Policy Projection in Profile Handlers (Step 1)
- **Target Files**: `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Rust Axum handler logic, non-destructive SQL querying, dynamic milestone projection
- **Graph Check**: `graft callers get_chuctho_profiles`
- **Estimated Gross Diff**: `~120 LOC`
- **Target Signatures / Contract Changes**:
  ```rust
  pub async fn get_chuctho_profiles(
      State(state): State<AppState>,
      Extension(claims): Extension<Claims>,
      Query(params): Query<PolicyQueryParams>,
  ) -> Response;

  pub async fn get_htxh_profiles(
      State(state): State<AppState>,
      Extension(claims): Extension<Claims>,
      Query(params): Query<PolicyQueryParams>,
  ) -> Response;
  ```
- **Actions**:
  1. In `get_chuctho_profiles`, remove the restrictive `WHERE p.calculation_year = cy` SQL filter and the destructive `existing_count == 0` sync block. Query all active profiles matching village and common filters.
  2. After fetching rows, project each row's `calculation_year` to `target_year` and compute milestones (`age60` through `age_over_100`) dynamically using `calculate_exact_age(&row.dob, 31/12/target_year)` and `compute_chuctho_milestones(age)`.
  3. If a milestone filter was provided (`params.milestone` or `params.age_group`), apply the filter against the projected milestone in memory before pagination.
  4. In `get_htxh_profiles`, similarly remove the rigid `calculation_year` SQL filter and project `age75plus` and `age70to74poor` dynamically based on `target_year` and `dob`.
- **Scoped Test Command**: `cmd /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo check --manifest-path "C:\Users\umnuar\Documents\Projects\QLHK\QLHK-Backend-Rust\Cargo.toml" --target-dir "C:\Users\umnuar\AppData\Local\Temp\cargo_target"'`
- **Done Criteria**: `cargo check` exits with code 0; SQL queries no longer filter out profiles by static `calculation_year`.

---

### Section 2: Backend Rust - Non-Destructive Analytics & Recalculate (Step 2)
- **Target Files**: `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Policy analytics projection, additive citizen sync without overwriting
- **Graph Check**: `graft callers get_policy_analytics`
- **Estimated Gross Diff**: `~90 LOC`
- **Target Signatures / Contract Changes**:
  ```rust
  pub async fn get_policy_analytics(
      State(state): State<AppState>,
      Extension(claims): Extension<Claims>,
      Query(params): Query<PolicyQueryParams>,
  ) -> Response;

  pub async fn recalculate_policies(
      State(state): State<AppState>,
      Extension(claims): Extension<Claims>,
      body: Option<Json<RecalculatePolicyDto>>,
  ) -> Response;
  ```
- **Actions**:
  1. In `get_policy_analytics`, remove `WHERE calculation_year = $1` from the queries. Fetch active rows with `dob` and village, and compute milestone statistics dynamically for `calc_year`.
  2. In `recalculate_policies`, run `sync_all_citizens_to_policies` additively to ensure any citizens newly turning 60+ in `target_year` are inserted into `chuctho_profiles`, while leaving existing records intact.
  3. Return a success JSON payload `{ "success": true, "year": target_year, "message": "..." }`.
- **Scoped Test Command**: `cmd /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo check --manifest-path "C:\Users\umnuar\Documents\Projects\QLHK\QLHK-Backend-Rust\Cargo.toml" --target-dir "C:\Users\umnuar\AppData\Local\Temp\cargo_target"'`
- **Done Criteria**: `cargo check` exits with code 0; policy analytics calculate dynamically for any year without 0-count drops.

---

### Section 3: Frontend Client - Seamless Year Switch & Cache Integrity (Step 3)
- **Target Files**: `QLHK/QLHK-Client/src/hooks/useProfiles.ts`, `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx`, `QLHK/QLHK-Client/src/features/qlcs/components/dashboard/__tests__/ProfileRow.test.tsx`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: React state propagation, cache invalidation, unit test validation
- **Graph Check**: `graft callers useProfiles`
- **Estimated Gross Diff**: `~70 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export function useProfiles(
      villageId: string | undefined,
      isGlobal: boolean | undefined,
      _user: any,
      activeTab: TabType,
      filters: FilterParams,
      globalCalculationYear?: number,
  ): UseProfilesResult;
  ```
- **Actions**:
  1. In `useProfiles.ts`, ensure that when `globalCalculationYear` changes, stale empty cache is cleared and does not block loading fresh profiles.
  2. In `DashboardPage.tsx`, streamline `handleGlobalYearChange` to immediately update `setGlobalCalculationYear(year)` and trigger `loadProfiles()` without destructive API calls blocking UI state.
  3. In `ProfileRow.test.tsx`, add test cases verifying rapid back-and-forth year changes (2026 -> 2027 -> 2026 -> 2028) retain profile data and render updated ages accurately.
- **Scoped Test Command**: `node QLHK/QLHK-Client/node_modules/vitest/vitest.mjs run --environment jsdom QLHK/QLHK-Client/src/features/qlcs/components/dashboard/__tests__/ProfileRow.test.tsx`
- **Done Criteria**: Unit tests pass 100%; `tsc --noEmit` exits with 0 errors.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| Database rows missing `dob` cannot be projected dynamically | LOW / LOW | Fallback to stored `profile.age70` / `profile.age75plus` flags when `dob` is empty or unparseable | Keep stored milestone fields as fallback |
| In-memory pagination memory footprint | LOW / LOW | Xã Đăk Hà has ~400-600 senior citizens; in-memory projection takes < 1ms and < 500KB RAM | Standard pagination in memory |

## 8. Final Verification Gate (Step 4 in `roadmap`)
- **Full Test Suite Command**: `node QLHK/QLHK-Client/node_modules/vitest/vitest.mjs run --environment jsdom QLHK/QLHK-Client/src/features/qlcs/components/dashboard/__tests__/ProfileRow.test.tsx` (Must pass all tests)
- **Typecheck / Static Analysis Command**: `node QLHK/QLHK-Client/node_modules/typescript/bin/tsc --project QLHK/QLHK-Client/tsconfig.json --noEmit && cmd /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo check --manifest-path "C:\Users\umnuar\Documents\Projects\QLHK\QLHK-Backend-Rust\Cargo.toml" --target-dir "C:\Users\umnuar\AppData\Local\Temp\cargo_target"'` (Must exit 0 with 0 errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: QLHK/docs/plans/fix-policy-calculation-year-dynamic-projection.md
- Task Name (<TASK_NAME>): fix-policy-calculation-year-dynamic-projection
- Implementation Steps: 3 (Sections 1..3, plus Step 4 Final Verification Gate)
- Full Test Command: node QLHK/QLHK-Client/node_modules/vitest/vitest.mjs run --environment jsdom QLHK/QLHK-Client/src/features/qlcs/components/dashboard/__tests__/ProfileRow.test.tsx
- Typecheck Command: node QLHK/QLHK-Client/node_modules/typescript/bin/tsc --project QLHK/QLHK-Client/tsconfig.json --noEmit && cmd /c 'call "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && cargo check --manifest-path "C:\Users\umnuar\Documents\Projects\QLHK\QLHK-Backend-Rust\Cargo.toml" --target-dir "C:\Users\umnuar\AppData\Local\Temp\cargo_target"'
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `QLHK/docs/plans/fix-policy-calculation-year-dynamic-projection.md` to execute the steps safely.
```
