# Implementation Plan: Remediate Backend Audit Findings (`remediate-backend-audit-findings`)

- **Task Name (`remediate-backend-audit-findings`)**: `remediate-backend-audit-findings`
- **Task Type**: `Audit Remediation`
- **Source Input**: `audit/report.md`
- **Target Branch (for `roadmap`)**: `roadmap/remediate-backend-audit-findings`
- **Full Test Command**: `cd QLHK-Backend && npm test`
- **Typecheck / Lint Command**: `cd QLHK-Backend && npx tsc --noEmit`
- **Total Implementation Steps**: 2 (plus Final Verification Gate)

---

## 1. Context & Goal
The comprehensive static and runtime audit of `QLHK-Backend` confirmed three functional defects: `BUG-001` (silent omission of 4 demographic fields during Excel import), `BUG-002` (unvalidated encryption of placeholder CCCD strings in Excel import), and `BUG-003` (failure to match full 9/12-digit CCCD numbers in citizen search). These bugs cause demographic data loss on bulk import, corrupt CCCD indices with values like `"a có"`, and prevent officials from looking up citizens by full identity numbers. The goal is to apply surgical, non-breaking fixes aligned with existing codebase conventions, migrate the reproduction tests into permanent integration tests, and verify zero regressions against the 115 baseline tests.

## 2. Assumptions
- `ASM-01`: Database schema in `QLHK-Backend/prisma/schema.prisma` already defines `education`, `military_status`, `occupation`, and `native_place` columns on `citizens` table.
- `ASM-02`: Household controller (`src/controllers/households.controller.ts:371-379` and `223-229`) provides the canonical reference implementation for CCCD sanitization regex `/^\d{9,12}$/` and CCCD search hash generation.
- `ASM-03`: PostgreSQL database and test environment are accessible via `DATABASE_URL` and all 115 existing tests pass cleanly before modification.

## 3. Non-Goals (Out of Scope — YAGNI)
- No database migrations or schema alterations (the database schema already supports all target attributes).
- No frontend UI adjustments or client-side changes (the fixes are strictly backend data integrity and query resolution).
- No premature abstraction or shared middleware extraction across controllers (keeping controller logic localized and transparent).

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK-Backend/src/controllers/excel.controller.ts` | `135-185` | `importExcel`: maps `h.members` to `citizensData` for `tx.citizens.createMany`, but omits `education`, `military_status`, `occupation`, `native_place`, and blindly encrypts non-digit placeholder strings (`"Chưa có"`). |
| `QLHK-Backend/src/controllers/citizens.controller.ts` | `1-25, 70-95` | `getCitizens`: builds Prisma `where.OR` clause for generic `?search`, only matching `name_unaccented`, `full_name`, and `cccd_last4: { contains: search }`, missing `cccd_hash`. |
| `QLHK-Backend/src/controllers/households.controller.ts` | `220-235, 370-410` | Canonical reference implementation: checks `isInvalidCccd` and `/^\d{9,12}$/` before `encryptCCCD`, stores demographic fields, and handles `cleanDigits.length === 9 || 12` with `hashCCCD`. |

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. In `excel.controller.ts`, sanitize `m.cccd` prior to encryption using the exact pattern from `households.controller.ts:371-379`, and append `education`, `military_status`, `occupation`, `native_place` to the `citizensData` return object.
  2. In `citizens.controller.ts`, parse digits from `search` query parameter; if 9 or 12 digits, append `{ cccd_hash: hashCCCD(cleanDigits) }` to `where.OR` matching `households.controller.ts:223-229`.
- **Caller / Contract Blast Radius**:
  - `POST /api/excel/import` (`excel.routes.ts:20`): HTTP response contract unchanged (`{ success: true, ... }`). Stored citizen records in PostgreSQL now retain demographic values and have `null` CCCD for placeholder text.
  - `GET /api/citizens` (`citizens.routes.ts:20`): HTTP response contract unchanged. Search results now include citizens when searched by their full 9-digit or 12-digit CCCD.
- **Rejected Alternatives (`<= 2`)**:
  1. *Reject Excel import requests containing invalid CCCDs with 400 Bad Request*: Rejected because commune spreadsheets frequently contain placeholder notes ("Chưa có", "—") for young children; rejecting imports causes operational stoppage.
  2. *Refactor search query builder into a generic shared utility*: Rejected because `citizens` and `households` have distinct Prisma relations; an abstraction touches multiple files, exceeds 200 LOC, and adds unnecessary complexity.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Fix Demographics Persistence and Placeholder CCCD Handling in Excel Import (Step 1)
- **Finding IDs**: `BUG-001`, `BUG-002`
- **Target Files**: `QLHK-Backend/src/controllers/excel.controller.ts`, `QLHK-Backend/tests/integration/excel-import-demographics.test.ts` `(new)`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Excel data ingestion, CCCD validation, and demographic persistence invariants
- **Graph Check**: `graft callers importExcel || grep -rn "importExcel" src/`
- **Estimated Gross Diff**: `~120 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  // QLHK-Backend/src/controllers/excel.controller.ts:147-175
  const rawCccd = typeof m.cccd === "string" ? m.cccd.trim() : "";
  const isInvalid = !rawCccd || rawCccd.toLowerCase().includes("chưa có") ||
    rawCccd.includes("a có") || rawCccd.includes("•") || rawCccd === "—" || rawCccd === "-" ||
    !/^\d{9,12}$/.test(rawCccd);
  const enc = !isInvalid ? encryptCCCD(rawCccd) : null;
  // citizensData mapped object addition:
  education: m.education ? String(m.education).trim() : null,
  military_status: m.military_status ? String(m.military_status).trim() : null,
  occupation: m.occupation ? String(m.occupation).trim() : null,
  native_place: m.native_place ? String(m.native_place).trim() : null,
  ```
- **Actions**:
  1. In `QLHK-Backend/src/controllers/excel.controller.ts`, update CCCD handling in `citizensData` map (around line 147) to check for placeholder strings and `/^\d{9,12}$/` regex before calling `encryptCCCD`. If invalid, leave `cccdCipher`, `cccdHash`, `cccdLast4` as `null`.
  2. In `QLHK-Backend/src/controllers/excel.controller.ts`, add the 4 demographic fields (`education`, `military_status`, `occupation`, `native_place`) to the citizen object returned by the map function (around line 170).
  3. Create permanent integration test `QLHK-Backend/tests/integration/excel-import-demographics.test.ts` migrating reproduction tests for BUG-001 and BUG-002:
     ```ts
     import { describe, it, expect } from 'vitest';
     import request from 'supertest';
     import app from '../../src/app';
     import { prisma } from '../../src/config/prisma';
     import { generateAccessToken } from '../../src/utils/jwt';

     describe('Integration: Excel Import Demographics & CCCD Sanitization', () => {
       it('preserves education, military_status, occupation, native_place on import (BUG-001)', async () => {
         let village = await prisma.villages.findFirst();
         if (!village) village = await prisma.villages.create({ data: { name: 'Thôn Test 1', code: 'T1' } });
         const token = generateAccessToken({ id: '00000000-0000-0000-0000-000000000001', username: 'admin', role: 'admin', village_id: null });
         const bookNumber = `HK-DEMO-${Date.now()}`;
         const res = await request(app).post('/api/excel/import').set('Authorization', `Bearer ${token}`).send({
           village_id: village.id,
           households: [{
             book_number: bookNumber, address: 'Thôn 1', status: 'Thường trú',
             members: [{
               stt: 1, is_head: true, relationship: 'Chủ hộ', full_name: 'Trần Văn Demo', dob: '01/01/1990', gender: 'Nam',
               cccd: '060090001234', ethnicity: 'Kinh', religion: 'Không', education: '12/12',
               military_status: 'Đã hoàn thành NVQS', occupation: 'Nông nghiệp', native_place: 'Đăk Hà, Kon Tum'
             }]
           }]
         });
         expect(res.status).toBe(200);
         const savedHh = await prisma.households.findFirst({ where: { book_number: bookNumber }, include: { citizens: true } });
         expect(savedHh?.citizens[0].education).toBe('12/12');
         expect(savedHh?.citizens[0].military_status).toBe('Đã hoàn thành NVQS');
         expect(savedHh?.citizens[0].occupation).toBe('Nông nghiệp');
         expect(savedHh?.citizens[0].native_place).toBe('Đăk Hà, Kon Tum');
       });

       it('treats placeholder CCCD as null instead of encrypting placeholder text (BUG-002)', async () => {
         let village = await prisma.villages.findFirst();
         if (!village) village = await prisma.villages.create({ data: { name: 'Thôn Test 2', code: 'T2' } });
         const token = generateAccessToken({ id: '00000000-0000-0000-0000-000000000001', username: 'admin', role: 'admin', village_id: null });
         const bookNumber = `HK-CCCD-${Date.now()}`;
         const res = await request(app).post('/api/excel/import').set('Authorization', `Bearer ${token}`).send({
           village_id: village.id,
           households: [{
             book_number: bookNumber, address: 'Thôn 2', status: 'Thường trú',
             members: [{ stt: 1, is_head: true, relationship: 'Chủ hộ', full_name: 'Nguyễn Văn Placeholder', dob: '01/01/1995', gender: 'Nam', cccd: 'Chưa có', ethnicity: 'Kinh', religion: 'Không' }]
           }]
         });
         expect(res.status).toBe(200);
         const savedHh = await prisma.households.findFirst({ where: { book_number: bookNumber }, include: { citizens: true } });
         expect(savedHh?.citizens[0].cccd).toBeNull();
         expect(savedHh?.citizens[0].cccd_last4).toBeNull();
       });
     });
     ```
  4. Run scoped test command to verify both tests pass.
- **Scoped Test Command**: `cd QLHK-Backend && npx vitest run tests/integration/excel-import-demographics.test.ts`
- **Done Criteria**: `excel-import-demographics.test.ts` exits with code 0; all assertions pass; staged gross diff `<= 200 LOC`.

---

### Section 2: Support Full 9/12-Digit CCCD Hash Matching in Citizens Search (Step 2)
- **Finding IDs**: `BUG-003`
- **Target Files**: `QLHK-Backend/src/controllers/citizens.controller.ts`, `QLHK-Backend/tests/integration/citizens-search-cccd.test.ts` `(new)`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Citizen query sanitization, exact CCCD hash lookup, and database index utilization
- **Graph Check**: `graft callers getCitizens || grep -rn "getCitizens" src/`
- **Estimated Gross Diff**: `~85 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  // QLHK-Backend/src/controllers/citizens.controller.ts:77-85
  const rawSearch = search.trim();
  const cleanDigits = rawSearch.replace(/\D/g, "");
  const orConditions: any[] = [
    { name_unaccented: { contains: cleanSearch } },
    { full_name: { contains: rawSearch } },
    { cccd_last4: { contains: rawSearch } },
  ];
  if (cleanDigits.length === 9 || cleanDigits.length === 12) {
    orConditions.push({ cccd_hash: hashCCCD(cleanDigits) });
  }
  where.OR = orConditions;
  ```
- **Actions**:
  1. In `QLHK-Backend/src/controllers/citizens.controller.ts`, update the `search` handling block (lines 77-84) to extract `cleanDigits` and append `{ cccd_hash: hashCCCD(cleanDigits) }` when `cleanDigits.length === 9 || cleanDigits.length === 12`.
  2. Create permanent integration test `QLHK-Backend/tests/integration/citizens-search-cccd.test.ts` migrating reproduction test for BUG-003:
     ```ts
     import { describe, it, expect } from 'vitest';
     import request from 'supertest';
     import app from '../../src/app';
     import { prisma } from '../../src/config/prisma';
     import { generateAccessToken } from '../../src/utils/jwt';
     import { encryptCCCD, removeAccents } from '../../src/utils/crypto';

     describe('Integration: Citizen Search by Full CCCD', () => {
       it('finds citizen when searching by full 12-digit CCCD in ?search parameter (BUG-003)', async () => {
         let village = await prisma.villages.findFirst();
         if (!village) village = await prisma.villages.create({ data: { name: 'Thôn Test 3', code: 'T3' } });
         const cccd12 = '060099887766';
         const enc = encryptCCCD(cccd12);
         await prisma.households.create({
           data: {
             village_id: village.id, book_number: `HK-SEARCH-${Date.now()}`, status: 'active', is_deleted: false,
             citizens: {
               create: {
                 full_name: 'Phạm Thị CCCD Search', name_unaccented: removeAccents('Phạm Thị CCCD Search'),
                 cccd: enc.encrypted, cccd_hash: enc.hash, cccd_last4: enc.last4, is_deleted: false
               }
             }
           }
         });
         const token = generateAccessToken({ id: '00000000-0000-0000-0000-000000000001', username: 'admin', role: 'admin', village_id: null });
         const res = await request(app).get(`/api/citizens?search=${cccd12}`).set('Authorization', `Bearer ${token}`);
         expect(res.status).toBe(200);
         expect(res.body.data.length).toBeGreaterThanOrEqual(1);
         expect(res.body.data.some((c: any) => c.full_name === 'Phạm Thị CCCD Search')).toBe(true);
       });
     });
     ```
  3. Run scoped test command to verify search test passes.
- **Scoped Test Command**: `cd QLHK-Backend && npx vitest run tests/integration/citizens-search-cccd.test.ts`
- **Done Criteria**: `citizens-search-cccd.test.ts` exits with code 0; full CCCD search succeeds; staged gross diff `<= 200 LOC`.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| Excel import citizen payload contains unexpected types for demographic fields | LOW / LOW | All fields wrapped with `String(val).trim()` matching existing controller conventions. | `git checkout HEAD~1 -- QLHK-Backend/src/controllers/excel.controller.ts` |
| Citizen search query contains non-digit formatting characters (e.g. spaces, dashes) | LOW / LOW | Digits extracted via `replace(/\D/g, "")` before checking length (9 or 12). | `git checkout HEAD~1 -- QLHK-Backend/src/controllers/citizens.controller.ts` |
| Test suite failure due to database state contamination | LOW / MED | Tests use unique `book_number` timestamps and existing village records without mutating global state. | Restart test database or run Prisma seed script if needed. |

## 8. Final Verification Gate (Step 3 in `roadmap`)
- **Full Test Suite Command**: `cd QLHK-Backend && npm test` (Must exit 0 with 0 failures across all test suites)
- **Typecheck / Static Analysis Command**: `cd QLHK-Backend && npx tsc --noEmit` (Must exit 0 with 0 compilation errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/remediate-backend-audit-findings.md
- Task Name (remediate-backend-audit-findings): remediate-backend-audit-findings
- Implementation Steps: 2 (Sections 1..2, plus Step 3 Final Verification Gate)
- Full Test Command: cd QLHK-Backend && npm test
- Typecheck Command: cd QLHK-Backend && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/remediate-backend-audit-findings.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
