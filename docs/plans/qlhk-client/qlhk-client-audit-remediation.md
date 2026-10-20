# Implementation Plan: Comprehensive Audit Findings Remediation (`qlhk-client-audit-remediation`)

- **Task Name (`<TASK_NAME>`)**: `qlhk-client-audit-remediation`
- **Task Type**: `Audit Remediation`
- **Source Input**: `audit/report.md`
- **Target Branch (for `roadmap`)**: `roadmap/qlhk-client-audit-remediation`
- **Full Test Command**: `cd QLHK-Client && npm test`
- **Typecheck / Lint Command**: `cd QLHK-Client && npx tsc --noEmit`
- **Total Implementation Steps**: `5` (plus Final Verification Gate)

---

## 1. Context & Goal

A comprehensive, read-only bug-hunting audit on the `QLHK-Client` subsystem verified 7 critical and high-severity defects across authentication, offline storage, Excel parsing, household state management, and analytics calculation. These defects lead to complete offline authentication bypass (`BUG-007`), unpurged credentials on logout in web mode (`BUG-006`), premature session termination via offline-token leaks (`BUG-002`), family merging on Excel import (`BUG-001`), orphaned household head references on member deletion (`BUG-004`), and demographic calculation drifts (`BUG-003`, `BUG-005`).

The goal of this implementation plan is to surgically remediate all 7 verified defects in bottom-up dependency order (`Auth/Storage -> Core Utils -> State & UI`), migrate all reproduction tests from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/` into the permanent test suite, and ensure 100% test pass rate with zero regressions.

---

## 2. Assumptions

- `ASM-01`: `QLHK-Client` operates in dual runtime modes (native Tauri desktop and web browser/PWA); `secureStorage.clear()` must purge all authentication and session keys across all storage engines (`localStorage` and native store).
- `ASM-02`: Offline login password verification can be achieved by storing a SHA-256 digest of the password during online login inside `SESSION_USER_STORE_KEY` (`qlhk_session_user`) using the standard Web Crypto API (`crypto.subtle.digest`).
- `ASM-03`: In `parseStandard11ColumnsFormat`, newly auto-generated household codes must never collide with explicit codes present in the sheet, and head-of-household detection must accept unaccented `"chu ho"` and `"ch"`.
- `ASM-04`: Dynamic calculation year is controlled via `AppContext.calculationYear` and persisted in `globalCalculationYear`; member age upon import must always be derived dynamically (`calculateAge(dob, calculationYear)`).
- `ASM-05`: Deleting a household head must automatically promote the first remaining member to head or clear head references if the household becomes empty, maintaining invariant `INV-02`.

---

## 3. Non-Goals (Out of Scope — YAGNI)

- No backend changes: No modification to `QLHK-Backend`, Prisma schema, or backend REST controllers.
- No new UI redesign: Do not alter the visual styling, Tailwind tokens, or column definitions of existing tables and modals.
- No changes to physical hardware tokens: Hardware smartcard/CCCD reader integrations remain out of scope for this client patch.
- No external cryptographic libraries: Use native Web Crypto API (`crypto.subtle`) without introducing external hashing dependencies.

---

## 4. Current State & Codebase Grounding (`file:start-end` Read)

| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK-Client/src/utils/secureStorage.ts` | `102-128` | `secureStorage.clear()` only removes `accessToken`, `refreshToken`, and `user`, leaking `qlhk_session_user` (`BUG-006`). |
| `QLHK-Client/src/api/client.ts` | `61-78` | Request interceptor attaches `Authorization: Bearer offline-token-*` without checking `offline-token-` prefix (`BUG-002`). |
| `QLHK-Client/src/api/authApi.ts` | `101-131` | `authApi.login()` returns stored session on network error without checking `credentials.password` (`BUG-007`). |
| `QLHK-Client/src/utils/excelParser.ts` | `384-393` | `parseStandard11ColumnsFormat()` does not sync `householdCounter` when explicit code is present, causing code collision (`BUG-001`). |
| `QLHK-Client/src/store/householdStore.ts` | `491-504` | `deleteMember()` filters members array without updating `h.head_name` or promoting next member when head is deleted (`BUG-004`). |
| `QLHK-Client/src/pages/HouseholdsPage.tsx` | `956-965` | `handleConfirmImport()` hardcodes `2026` in `calculateAge(dobFormatted, 2026)` instead of using `calculationYear` (`BUG-003`). |
| `QLHK-Client/src/pages/ExcelPage.tsx` | `138-146` | `processFile()` hardcodes `2026` in `calculateAge(dobFormatted, 2026)` instead of using `calculationYear` (`BUG-003`). |
| `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` | `423-455` | `ageStats` builder evaluates `youth` before `militaryAge` and `adult` before `workingAge`, overwriting dedicated stats (`BUG-005`). |

---

## 5. Chosen Design & Blast Radius

- **Chosen Approach**:
  1. **Storage & Interceptor Hardening (`BUG-006`, `BUG-002`)**: Extend `secureStorage.clear()` to scan and purge all `qlhk_*` keys (including `qlhk_session_user` and `qlhk_cached_users`). Guard `apiClient.interceptors.request` to never attach tokens starting with `"offline-token-"` to outgoing HTTP requests.
  2. **Offline Authentication Verification (`BUG-007`)**: On online login, compute `SHA-256` of entered password and persist inside `StoredSessionUser.passwordHash`. On offline network fallback, hash the entered password and compare against `passwordHash`; reject with 401 message if mismatched.
  3. **Excel Parser Synchronization (`BUG-001`)**: Track all allocated/encountered codes in a `Set<string>`. Auto-increment `householdCounter` to always produce unique, non-colliding `HK-XXXX` codes, and extend `isHead` check to support `"chu ho"` and `"ch"`.
  4. **State Store Invariant Defense (`BUG-004`)**: In `householdStore.deleteMember`, detect when deleted member was `is_head`. Promote the first remaining member to `is_head = true, relationship = "Chủ hộ"` and update `head_name` / `head_cccd`. Set to `"Chưa xác định"` if no members remain.
  5. **Demographic Calculation Alignment (`BUG-003`, `BUG-005`)**: Pass `calculationYear` into Excel import age calculations. Reorder `AnalyticsDashboard.tsx` age metric fallbacks so `militaryAge` and `workingAge` take precedence over broader `youth` and `adult` groups.

- **Caller / Contract Blast Radius**:
  - `secureStorage.clear()`: Called by `AppContext.logout()`, `DangerZoneCard.handleClearCache()`. Pure cleanup enhancement, zero breaking signature changes.
  - `apiClient.interceptors.request`: Protects all outbound REST calls (`householdApi`, `villageApi`, `analyticsApi`). Prevents remote 401s in offline mode.
  - `authApi.login()`: Contract remains identical `(credentials: LoginCredentials) => Promise<{ accessToken, refreshToken, user }>`.
  - `excelParser.parseExcelSheet()`: Output array structure remains `ParsedExcelRow[]`, with collision-free `code` values.
  - `householdStore.deleteMember()`: Signature remains `(householdId: string, memberId: string) => void`.

- **Rejected Alternatives (`<= 2`)**:
  1. *Plaintext password storage for offline auth*: Rejected because storing plaintext passwords in `localStorage` or `IndexedDB` introduces severe security exposure (`CWE-312`). Using `crypto.subtle` SHA-256 digest is secure and zero-dependency.
  2. *Refactoring whole Excel parser into web worker*: Rejected because `parseExcelSheet` is already synchronous, fast (< 50ms for 1000 rows), and well-tested; rewriting into workers exceeds the 200 LOC budget and adds unnecessary postMessage orchestration.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Secure Storage Logout Wipe & Offline Token Header Leak Guard (Step 1)
- **Finding IDs**: `BUG-006`, `BUG-002`
- **Target Files**:
  - `QLHK-Client/src/utils/secureStorage.ts`
  - `QLHK-Client/src/api/client.ts`
  - `QLHK-Client/src/utils/__tests__/secureStorage.test.ts`
- **Assigned Role**: `.agents/security-engineer.md`
- **Role Focus**: Ensure sensitive storage is thoroughly purged on logout and offline tokens never escape across network boundary.
- **Graph Check**: `git grep -n "secureStorage.clear" QLHK-Client/src/`
- **Estimated Gross Diff**: `~60 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  export const secureStorage = {
    async getItem(key: string): Promise<string | null>;
    async setItem(key: string, value: string): Promise<void>;
    async removeItem(key: string): Promise<void>;
    async clear(): Promise<void>;
  };
  ```
- **Actions**:
  1. In `QLHK-Client/src/utils/secureStorage.ts:116-127`, update `clear()` to iterate `localStorage` keys and remove all keys starting with `qlhk_` (or explicitly remove `SESSION_USER_STORE_KEY`, `USERS_CACHE_STORE_KEY`, `accessToken`, `refreshToken`, `user`).
  2. In `QLHK-Client/src/api/client.ts:61-78`, modify request interceptor to verify:
     `if (token && !token.startsWith("offline-token-") && config.headers) { config.headers.Authorization = "Bearer " + token; }`.
  3. Migrate reproduction test `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_006.test.ts` and `repro_bug_002.test.ts` into permanent test file `QLHK-Client/src/utils/__tests__/secureStorage.test.ts`.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/utils/__tests__/secureStorage.test.ts`
- **Done Criteria**: `src/utils/__tests__/secureStorage.test.ts` exits 0 with all storage wipe and token header guard tests passing; staged gross diff `<= 200 LOC`.

---

### Section 2: Offline Login Password Verification & Credential Integrity (Step 2)
- **Finding IDs**: `BUG-007`
- **Target Files**:
  - `QLHK-Client/src/api/authApi.ts`
  - `QLHK-Client/src/api/__tests__/authApi.test.ts`
- **Assigned Role**: `.agents/security-engineer.md`
- **Role Focus**: Guarantee offline authentication strictly enforces password verification via cryptographic digest.
- **Graph Check**: `git grep -n "getStoredSessionUser" QLHK-Client/src/`
- **Estimated Gross Diff**: `~75 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  export interface StoredSessionUser {
    user: User;
    accessToken: string;
    refreshToken: string;
    savedAt: string;
    passwordHash?: string;
  }
  ```
- **Actions**:
  1. Add helper `async function hashPassword(password: string): Promise<string>` using `crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))` formatted as hex.
  2. In `authApi.login()`, when online login succeeds, compute `passwordHash` and persist it via `saveStoredSessionUser({ ...session, passwordHash })`.
  3. In `authApi.login()` catch block, when network error occurs and `storedSession` matches `inputUser`, hash `credentials.password` and compare against `storedSession.passwordHash`. If mismatched or missing, throw `Error("Tên đăng nhập hoặc mật khẩu không chính xác.")`.
  4. Migrate reproduction test from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_007.test.ts` into `QLHK-Client/src/api/__tests__/authApi.test.ts`.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/api/__tests__/authApi.test.ts`
- **Done Criteria**: `src/api/__tests__/authApi.test.ts` exits 0 with offline password validation assertions passing; staged gross diff `<= 200 LOC`.

---

### Section 3: Standard 11-Column Excel Household Code Collision & Normalization (Step 3)
- **Finding IDs**: `BUG-001`
- **Target Files**:
  - `QLHK-Client/src/utils/excelParser.ts`
  - `QLHK-Client/src/utils/__tests__/excelParser.test.ts`
- **Assigned Role**: `.agents/refactoring-specialist.md`
- **Role Focus**: Ensure Excel parser allocates distinct, collision-free household codes regardless of row code omissions.
- **Graph Check**: `git grep -n "parseStandard11ColumnsFormat" QLHK-Client/src/`
- **Estimated Gross Diff**: `~65 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  export function parseExcelSheet(
    rawRows: any[][],
    options?: { defaultVillageName?: string }
  ): ParsedExcelRow[];
  ```
- **Actions**:
  1. In `QLHK-Client/src/utils/excelParser.ts:337-438` (`parseStandard11ColumnsFormat`):
     - Maintain `const allocatedCodes = new Set<string>()`.
     - Whenever explicit `code` is present on a row, add it to `allocatedCodes`.
     - When generating auto-code `HK-XXXX`, increment `householdCounter` in a loop until `code` is not in `allocatedCodes`, then add to `allocatedCodes`.
     - Update `isHead` check to include unaccented text:
       `const isHead = relLower.includes("chủ hộ") || relLower === "chu ho" || relLower === "ch";`
  2. Migrate reproduction test from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_001.test.ts` into permanent test file `QLHK-Client/src/utils/__tests__/excelParser.test.ts`.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/utils/__tests__/excelParser.test.ts`
- **Done Criteria**: `src/utils/__tests__/excelParser.test.ts` exits 0 with all parser collision and format tests passing; staged gross diff `<= 200 LOC`.

---

### Section 4: Household Head State Integrity on Member Deletion (Step 4)
- **Finding IDs**: `BUG-004`
- **Target Files**:
  - `QLHK-Client/src/store/householdStore.ts`
  - `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Defend invariant INV-02 so households never hold orphaned head names or 0 head members upon deletion.
- **Graph Check**: `git grep -n "deleteMember" QLHK-Client/src/`
- **Estimated Gross Diff**: `~55 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  const deleteMember: (householdId: string, memberId: string) => void;
  ```
- **Actions**:
  1. In `QLHK-Client/src/store/householdStore.ts:491-504` (`deleteMember`):
     - Identify if deleted member has `is_head === true` or matches `h.head_name` / `h.head_cccd`.
     - Filter out the member into `updatedMembers`.
     - If deleted member was head, promote the first remaining member (`updatedMembers[0]`):
       `updatedMembers[0] = { ...updatedMembers[0], is_head: true, relationship: "Chủ hộ" };`
       Update `head_name: updatedMembers[0].full_name, head_cccd: updatedMembers[0].cccd`.
     - If `updatedMembers.length === 0`, set `head_name: "Chưa xác định", head_cccd: ""`.
  2. Migrate reproduction test from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_004.test.ts` into `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/households/__tests__/HouseholdTable.test.tsx`
- **Done Criteria**: `src/components/households/__tests__/HouseholdTable.test.tsx` exits 0 with head reassignment assertions passing; staged gross diff `<= 200 LOC`.

---

### Section 5: Dynamic Calculation Year in Import Handlers & Analytics Metric Precedence (Step 5)
- **Finding IDs**: `BUG-003`, `BUG-005`
- **Target Files**:
  - `QLHK-Client/src/pages/HouseholdsPage.tsx`
  - `QLHK-Client/src/pages/ExcelPage.tsx`
  - `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Ensure dynamic calculation year is respected across import workflows and demographic metric keys are mapped in correct precedence.
- **Graph Check**: `git grep -n "calculateAge" QLHK-Client/src/`
- **Estimated Gross Diff**: `~70 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  // HouseholdsPage.tsx & ExcelPage.tsx import age calculation
  const targetYear = calculationYear || new Date().getFullYear();
  const age = dobFormatted ? calculateAge(dobFormatted, targetYear) : (targetYear - birthYear);
  ```
- **Actions**:
  1. In `QLHK-Client/src/pages/HouseholdsPage.tsx:956-965`, replace literal `2026` with `calculationYear`:
     `age = calculateAge(dobFormatted, calculationYear);`
     `birthYear = dobVal.birthYear ?? (calculationYear - 26);`
  2. In `QLHK-Client/src/pages/ExcelPage.tsx:138-146`, replace literal `2026` with dynamic `calculationYear` extracted from `useApp()`.
  3. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:432-445`, correct `ageStats` evaluation order so `militaryAge` and `workingAge` take priority:
     - `militaryAge: apiOverview.ageGroups?.militaryAge || (apiOverview.ageGroups as any)?.from6to17 || apiOverview.ageGroups?.youth || localCalculated.stats.ageStats.militaryAge`
     - `workingAge: apiOverview.ageGroups?.workingAge || (apiOverview.ageGroups as any)?.from18to60 || apiOverview.ageGroups?.adult || localCalculated.stats.ageStats.workingAge`
  4. Migrate reproduction tests from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_003.test.ts` and `repro_bug_005.test.ts` into `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
- **Done Criteria**: `src/components/analytics/__tests__/AnalyticsDashboard.test.tsx` exits 0 with metric precedence and dynamic year tests passing; staged gross diff `<= 200 LOC`.

---

## 7. Risks & Rollback Plan

| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| Web Crypto API (`crypto.subtle`) unavailable in non-secure HTTP contexts | `LOW / MED` | In `authApi.ts`, check `window.crypto?.subtle`; provide fallback hash algorithm if subtly is missing in older browsers. | Revert commit in `roadmap/qlhk-client-audit-remediation` via `git revert HEAD`. |
| Legacy offline sessions in `localStorage` lacking `passwordHash` | `LOW / LOW` | If `storedSession.passwordHash` is absent, prompt user to connect online once to refresh credentials. | Reset `SESSION_USER_STORE_KEY` via `secureStorage.removeItem()`. |
| Edge-case Excel files with non-standard relationship text | `LOW / LOW` | `parseStandard11ColumnsFormat` preserves original text while normalizing `isHead` check with `normalizeUnaccented`. | Revert Section 3 commit on the roadmap branch. |

---

## 8. Final Verification Gate (Step 6 in `roadmap`)

- **Full Test Suite Command**: `cd QLHK-Client && npm test` (Must pass all 17 test suites, 162+ tests with zero regressions)
- **Typecheck / Static Analysis Command**: `cd QLHK-Client && npx tsc --noEmit` (Must exit 0 with 0 compiler errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

---

## 9. Roadmap Handoff Block

```text
Plan verified, committed, and saved to: docs/plans/qlhk-client/qlhk-client-audit-remediation.md
- Task Name (<TASK_NAME>): qlhk-client-audit-remediation
- Implementation Steps: 5 (Sections 1..5, plus Step 6 Final Verification Gate)
- Full Test Command: cd QLHK-Client && npm test
- Typecheck Command: cd QLHK-Client && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/qlhk-client/qlhk-client-audit-remediation.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
