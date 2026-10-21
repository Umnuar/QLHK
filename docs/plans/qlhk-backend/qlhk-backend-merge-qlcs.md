# Implementation Plan: Sáp Nhập Phân Hệ Quản Lý Chính Sách Vào QLHK Backend (`qlhk-backend-merge-qlcs`)

- **Task Name (`<TASK_NAME>`)**: `qlhk-backend-merge-qlcs`
- **Task Type**: `Refactor`
- **Source Input**: `User Request`
- **Target Branch (for `roadmap`)**: `roadmap/qlhk-backend-merge-qlcs`
- **Full Test Command**: `cd QLHK/QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts`
- **Typecheck / Lint Command**: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- **Total Implementation Steps**: 7 (plus Final Verification Gate)

---

## 1. Context & Goal
Hiện tại, công tác quản lý an sinh xã hội (Chúc thọ & Hỗ trợ xã hội) của Xã Đăk Hà chạy trên backend QLCS độc lập cổng 5000 với CSDL `dakha_qlcs` riêng. Mục tiêu của phân hệ backend là tích hợp toàn bộ nghiệp vụ chính sách vào `QLHK-Backend` chạy tại cổng `5002` dùng chung CSDL `dakha_qlhk`. Backend mới mở rộng schema CSDL an toàn (additive DDL), cung cấp kịch bản ETL tái mã hóa CCCD bảo mật, triển khai các controllers phân hệ chính sách dưới namespace `/api/policies/*` và cưỡng chế kiểm soát phân quyền cấp thôn (RBAC) nghiêm ngặt với 0 lỗi kiểu dữ liệu và 0 comments trong code.

## 2. Assumptions
- `ASM-01`: Bảng `villages` và `users` của QLHK làm master authority cho toàn bộ địa bàn xã; các bản ghi chính sách liên kết khóa ngoại trực tiếp tới các bảng này.
- `ASM-02`: Bảng `settings` của QLHK giữ nguyên cấu trúc khóa chính UUID; các tham số của QLCS lưu dưới dạng các cặp key-value tương thích.
- `ASM-03`: Dữ liệu CCCD được giải mã trong RAM bằng key cũ của QLCS và tái mã hóa bằng `ENCRYPTION_KEY` kèm băm `cccd_hash` theo `CCCD_HASH_PEPPER` của QLHK.
- `ASM-04`: Phân quyền cấp thôn cưỡng chế qua middleware: Trưởng thôn (`role: "user"`) chỉ được truy vấn dữ liệu thuộc `village_id` của mình; Cán bộ Xã (`role: "admin"`) được truy cập toàn xã.
- `ASM-05`: Toàn bộ mã nguồn mới tuân thủ nghiêm ngặt quy tắc Zero Comments in Code, tự mô tả qua định danh rõ ràng.

## 3. Non-Goals (Out of Scope — YAGNI)
- Không chỉnh sửa cấu trúc các bảng hiện hữu `households`, `citizens`, `villages`, `users` ngoài việc thêm quan hệ mảng đảo chiều (reverse relation arrays).
- Không duy trì backend cổng 5000 sau khi hoàn tất chuyển giao sang cổng 5002.
- Không can thiệp vào mã nguồn frontend client trong phạm vi kế hoạch backend này.

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK/qlcs.md` | `1-184` | Bản thiết kế kiến trúc sáp nhập QLCS vào QLHK: model mapping, ETL, rủi ro xung đột. |
| `QLCS/QLCS-Backend/prisma/schema.prisma` | `53-177` | Định nghĩa schema nguồn QLCS: `profiles`, `htxh_profiles`, `profile_audit_log`. |
| `QLHK/QLHK-Backend/prisma/schema.prisma` | `14-126` | Schema đích QLHK: `villages`, `users`, `households`, `citizens`, `settings`. |
| `QLCS/QLCS-Backend/src/utils/age.ts` | `1-94` | Thuật toán bóc tách ngày sinh và tính mốc chúc thọ/HTXH. |
| `QLHK/QLHK-Backend/src/routes/index.ts` | `1-29` | Router trung tâm của QLHK-Backend, điểm gắn kết `/policies`. |

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. *Schema Extension*: Bổ sung 3 model `chuctho_profiles`, `htxh_profiles`, `profile_audit_log` vào `QLHK/QLHK-Backend/prisma/schema.prisma`.
  2. *ETL Script*: Script `scripts/migrate-qlcs-to-qlhk.ts` thực hiện map UUID thôn theo tên/mã chuẩn và tái mã hóa CCCD bằng secret key của QLHK.
  3. *Controllers & Services*: Chuyển giao các controllers chúc thọ, HTXH, analytics (cache 10s in-memory), excel import/export vào `src/controllers/`.
  4. *API Routing & Security*: Tập trung toàn bộ route chính sách dưới router `src/routes/policy.routes.ts` được gắn vào `/api/policies` với middleware `authenticateToken` và `authorizeVillage`.
- **Caller / Contract Blast Radius**:
  - `src/routes/index.ts`: Bổ sung `router.use("/policies", policyRouter);`. Các route hiện hữu giữ nguyên 100%.
  - CSDL `dakha_qlhk`: Hoàn toàn là thao tác bổ sung bảng mới (additive), không có rủi ro mất dữ liệu cũ.
- **Rejected Alternatives (`<= 2`)**:
  1. *Gộp bảng chính sách vào bảng citizens*: Bị loại bỏ vì làm ô nhiễm dữ liệu nhân tịch vĩnh viễn với các trạng thái nhận quà theo niên độ năm.
  2. *Chạy song song 2 tiến trình Node.js trên 2 cổng*: Bị loại bỏ vì vi phạm mục tiêu gom gọn hạ tầng về 1 backend duy nhất.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Prisma Schema Integration & DDL Extension (Step 1)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Backend/prisma/schema.prisma`
- **Assigned Role**: `.agents/database-architect.md`
- **Role Focus**: Database schema design, non-breaking additive DDL extensions, relation integrity.
- **Graph Check**: `graft callers villages`
- **Estimated Gross Diff**: `~140 LOC` (`<= 200 gross LOC` ceiling, excluding migrations)
- **Target Signatures / Contract Changes**:
  ```prisma
  model chuctho_profiles {
    id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    stt             Int?
    name            String    @db.VarChar(255)
    dob             String?   @db.VarChar(20)
    gender          String?   @db.VarChar(10)
    village_id      String?   @db.Uuid
    received        Boolean?  @default(false)
    calculation_year Int?
    is_deleted      Boolean?  @default(false)
    version         Int?      @default(1)
    village         villages? @relation(fields: [village_id], references: [id])
    @@map("chuctho_profiles")
  }
  ```
- **Actions**:
  1. Khai báo model `chuctho_profiles` trong `schema.prisma` với đầy đủ các mốc tuổi (`age60`..`age_over_100`), chỉ mục GIN `name_unaccented`, và quan hệ với `villages`.
  2. Khai báo model `htxh_profiles` với 6 diện trợ cấp xã hội, các chỉ mục tìm kiếm và quan hệ với `villages`.
  3. Khai báo model `profile_audit_log` với quan hệ trỏ về `users.id`.
  4. Cập nhật quan hệ mảng trong `villages` (`chuctho_profiles[]`, `htxh_profiles[]`) và `users` (`profile_audit_log[]`).
  5. Chạy lệnh sinh Prisma client mới: `npx prisma generate`.
- **Scoped Test Command**: `cd QLHK/QLHK-Backend && npx prisma validate && npx tsc --noEmit`
- **Done Criteria**: Lệnh `npx prisma validate` thành công; `npx tsc --noEmit` không báo lỗi kiểu dữ liệu; staged diff `<= 200 LOC`.

---

### Section 2: Policy DTO Types & Shared Age Calculation Engine (Step 2)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Backend/src/types/policy.types.ts` `(new)`, `QLHK/QLHK-Backend/src/utils/age.ts` `(new)`, `QLHK/QLHK-Backend/tests/unit/age-milestones.test.ts` `(new)`
- **Assigned Role**: `.agents/backend-architect.md`
- **Role Focus**: Pure calculation utilities, type-safe DTOs, zero-allocation algorithms, zero comments.
- **Graph Check**: `None (greenfield utilities)`
- **Estimated Gross Diff**: `~170 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface ChucthoMilestones {
    age60: string; age65: string; age70: string; age75: string; age80: string;
    age85: string; age90: string; age95: string; age100: string; age_over_100: string;
  }
  export interface HtxhMilestones {
    age75plus: string; age70to74poor: string; bao_tro: string;
    huu_tri: string; huu_tuat_bao_hiem: string; nguoi_co_cong: string;
  }
  export function parseDobValue(raw: unknown): { dob: string; year: number } | null;
  export function computeChucthoMilestones(birthYear: number, calculationYear: number): ChucthoMilestones;
  export function computeHtxhMilestones(birthYear: number, calculationYear: number, record?: unknown): HtxhMilestones;
  ```
- **Actions**:
  1. Tạo `src/types/policy.types.ts` định nghĩa DTOs cho hồ sơ chúc thọ, hồ sơ HTXH và bộ lọc truy vấn.
  2. Tạo `src/utils/age.ts` chuyển giao thuật toán bóc tách ngày sinh `parseDobValue`, tính toán mốc chúc thọ `computeChucthoMilestones` và mốc HTXH `computeHtxhMilestones` từ QLCS với quy tắc Zero Comments.
  3. Viết bộ unit test `tests/unit/age-milestones.test.ts` kiểm tra độ chính xác của các mốc tuổi 60, 65, 70, 75, 80, 85, 90, 95, 100, >100 và 6 diện HTXH.
- **Scoped Test Command**: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/age-milestones.test.ts`
- **Done Criteria**: Toàn bộ unit test tính mốc tuổi vượt qua 100%; `tsc --noEmit` thoát mã 0; staged diff `<= 200 LOC`.

---

### Section 3: Database ETL & CCCD Re-encryption Migration Script (Step 3)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Backend/scripts/migrate-qlcs-to-qlhk.ts` `(new)`, `QLHK/QLHK-Backend/tests/unit/migrate-qlcs.test.ts` `(new)`
- **Assigned Role**: `.agents/data-engineer.md`
- **Role Focus**: Data migration, UUID foreign key harmonization, cryptographic key translation, transaction safety.
- **Graph Check**: `graft callers encryptCCCD`
- **Estimated Gross Diff**: `~180 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface MigrationResult {
    chucthoMigrated: number;
    htxhMigrated: number;
    auditLogsMigrated: number;
    errors: string[];
  }
  export interface VillageMapping { [qlcsVillageId: string]: string; }
  export function buildVillageMapping(qlcsVillages: any[], qlhkVillages: any[]): VillageMapping;
  export function reEncryptCCCD(encryptedCCCD: string, oldKey: string, newKey: string, pepper: string): { cccd: string; cccd_hash: string; cccd_last4: string };
  export function migrateQlcsData(options: { dryRun?: boolean }): Promise<MigrationResult>;
  ```
- **Actions**:
  1. Xây dựng hàm `buildVillageMapping` đối chiếu danh mục thôn QLCS và QLHK theo tên không dấu hoặc mã thôn.
  2. Xây dựng hàm `reEncryptCCCD` giải mã CCCD từ AES key cũ của QLCS và tái mã hóa với `ENCRYPTION_KEY` kèm tạo `cccd_hash` với `CCCD_HASH_PEPPER` của QLHK.
  3. Xây dựng kịch bản ETL nạp theo lô 500 bản ghi có hỗ trợ chế độ `--dry-run` để kiểm tra toàn vẹn trước khi nạp thật.
  4. Viết unit test `tests/unit/migrate-qlcs.test.ts` kiểm chứng quy trình map thôn và tái mã hóa an toàn trong bộ nhớ.
- **Scoped Test Command**: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/migrate-qlcs.test.ts`
- **Done Criteria**: Kịch bản mapping và re-encrypt CCCD vượt qua kiểm thử; không rò rỉ dữ liệu nhạy cảm; staged diff `<= 200 LOC`.

---

### Section 4: Backend Chúc Thọ Policy Controller & Service (Step 4)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Backend/src/controllers/policyChuctho.controller.ts` `(new)`, `QLHK/QLHK-Backend/tests/unit/policy-chuctho.test.ts` `(new)`
- **Assigned Role**: `.agents/backend-architect.md`
- **Role Focus**: REST controller, pagination, stream NDJSON, optimistic concurrency control (OCC), soft-delete.
- **Graph Check**: `graft callers prisma`
- **Estimated Gross Diff**: `~190 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface ChucthoQueryFilters {
    page?: number; limit?: number; village_id?: string;
    milestone?: string; received?: boolean; calculation_year?: number; search?: string;
  }
  export const getChucthoProfiles: (req: Request, res: Response) => Promise<void>;
  export const getChucthoStream: (req: Request, res: Response) => Promise<void>;
  export const createChucthoProfile: (req: Request, res: Response) => Promise<void>;
  export const updateChucthoProfile: (req: Request, res: Response) => Promise<void>;
  export const markChucthoReceived: (req: Request, res: Response) => Promise<void>;
  export const deleteChucthoProfile: (req: Request, res: Response) => Promise<void>;
  ```
- **Actions**:
  1. Hiện thực `getChucthoProfiles` hỗ trợ phân trang, tìm kiếm họ tên/CCCD, lọc theo mốc tuổi và năm tính.
  2. Hiện thực `getChucthoStream` xuất dữ liệu NDJSON có xử lý ngắt kết nối `req.on("close")` chống rò rỉ cursor CSDL.
  3. Hiện thực `createChucthoProfile`, `updateChucthoProfile` với kiểm soát xung đột phiên bản OCC (`version`), `markChucthoReceived` và xóa mềm `deleteChucthoProfile`.
  4. Viết unit test `tests/unit/policy-chuctho.test.ts` kiểm chứng tính đúng đắn của các hàm xử lý.
- **Scoped Test Command**: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-chuctho.test.ts`
- **Done Criteria**: Các hàm CRUD hồ sơ chúc thọ hoạt động chính xác; kiểm soát version OCC thành công; staged diff `<= 200 LOC`.

---

### Section 5: Backend Hỗ Trợ Xã Hội (HTXH) Policy Controller & Service (Step 5)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Backend/src/controllers/policyHtxh.controller.ts` `(new)`, `QLHK/QLHK-Backend/tests/unit/policy-htxh.test.ts` `(new)`
- **Assigned Role**: `.agents/backend-architect.md`
- **Role Focus**: REST controller for social assistance, 6 categories filter, NDJSON stream, OCC locking.
- **Graph Check**: `graft callers prisma`
- **Estimated Gross Diff**: `~190 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface HtxhQueryFilters {
    page?: number; limit?: number; village_id?: string;
    category?: string; received?: boolean; calculation_year?: number; search?: string;
  }
  export const getHtxhProfiles: (req: Request, res: Response) => Promise<void>;
  export const getHtxhStream: (req: Request, res: Response) => Promise<void>;
  export const createHtxhProfile: (req: Request, res: Response) => Promise<void>;
  export const updateHtxhProfile: (req: Request, res: Response) => Promise<void>;
  export const markHtxhReceived: (req: Request, res: Response) => Promise<void>;
  export const deleteHtxhProfile: (req: Request, res: Response) => Promise<void>;
  ```
- **Actions**:
  1. Hiện thực `getHtxhProfiles` lọc theo 6 diện trợ cấp xã hội, phân trang và tìm kiếm.
  2. Hiện thực `getHtxhStream` phục vụ tải dữ liệu lớn dạng NDJSON.
  3. Hiện thực các hàm tạo mới, cập nhật phiên bản, đánh dấu nhận trợ cấp và xóa mềm hồ sơ HTXH.
  4. Viết unit test `tests/unit/policy-htxh.test.ts` bảo đảm độ bao phủ logic.
- **Scoped Test Command**: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-htxh.test.ts`
- **Done Criteria**: Controller HTXH vượt qua toàn bộ unit test; bảo đảm tính toàn vẹn 6 diện chính sách; staged diff `<= 200 LOC`.

---

### Section 6: Backend Policy Analytics & Excel Export/Import Controllers (Step 6)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Backend/src/controllers/policyAnalytics.controller.ts` `(new)`, `QLHK/QLHK-Backend/src/controllers/policyExcel.controller.ts` `(new)`, `QLHK/QLHK-Backend/tests/unit/policy-analytics.test.ts` `(new)`
- **Assigned Role**: `.agents/performance-engineer.md`
- **Role Focus**: In-memory caching, aggregated SQL grouping, Excel Smart-Upsert with candidate lookup.
- **Graph Check**: `graft callers ExcelJS`
- **Estimated Gross Diff**: `~195 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface PolicyAnalyticsSummary {
    chuctho: { total: number; received: number; pending: number; byMilestone: Record<string, number> };
    htxh: { total: number; received: number; pending: number; byCategory: Record<string, number> };
    byVillage: Array<{ village_id: string; village_name: string; chucthoCount: number; htxhCount: number }>;
  }
  export const getPolicyAnalytics: (req: Request, res: Response) => Promise<void>;
  export const importPolicyExcel: (req: Request, res: Response) => Promise<void>;
  export const exportPolicyExcel: (req: Request, res: Response) => Promise<void>;
  ```
- **Actions**:
  1. Hiện thực `getPolicyAnalytics` tính toán tổng hợp số lượng chúc thọ theo mốc tuổi và HTXH theo diện, áp dụng bộ nhớ đệm In-Memory TTL 10 giây tránh nghẽn DB.
  2. Hiện thực `importPolicyExcel` áp dụng thuật toán Smart-Upsert nhận diện công dân theo CCCD hoặc Họ tên + Ngày sinh.
  3. Hiện thực `exportPolicyExcel` tạo file Excel chuẩn biểu mẫu của Sở/Phòng LĐ-TB&XH.
  4. Viết unit test `tests/unit/policy-analytics.test.ts` kiểm chứng tổng hợp số liệu và bóc tách dữ liệu Excel.
- **Scoped Test Command**: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-analytics.test.ts`
- **Done Criteria**: Tổng hợp thống kê chính xác; parse file Excel an toàn không làm crash tiến trình; staged diff `<= 200 LOC`.

---

### Section 7: Backend Policy Routes & RBAC Middleware Integration (Step 7)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Backend/src/routes/policy.routes.ts` `(new)`, `QLHK/QLHK-Backend/src/routes/index.ts`, `QLHK/QLHK-Backend/tests/security/policy-rbac.test.ts` `(new)`
- **Assigned Role**: `.agents/security-engineer.md`
- **Role Focus**: API routing, RBAC enforcement, village scoping boundary, 403 Forbidden on village mismatch.
- **Graph Check**: `graft callers authenticateToken`
- **Estimated Gross Diff**: `~150 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  import { Router } from "express";
  export const createPolicyRouter: () => Router;
  // Mounted at /api/policies:
  // /api/policies/chuctho -> chucthoRouter
  // /api/policies/htxh -> htxhRouter
  // /api/policies/analytics -> analyticsRouter
  // /api/policies/excel -> excelRouter
  // /api/policies/audit -> auditRouter
  ```
- **Actions**:
  1. Tạo `src/routes/policy.routes.ts` gom các phân hệ con của chính sách và áp dụng middleware `authenticateToken` cùng `authorizeVillage`.
  2. Gắn kết `router.use("/policies", policyRouter);` vào `src/routes/index.ts`.
  3. Viết test an ninh `tests/security/policy-rbac.test.ts` xác thực rằng tài khoản Trưởng thôn thôn A không thể đọc/ghi dữ liệu của thôn B (bắt buộc trả về HTTP 403).
- **Scoped Test Command**: `cd QLHK/QLHK-Backend && npx vitest run tests/security/policy-rbac.test.ts`
- **Done Criteria**: Router `/api/policies` hoạt động; middleware RBAC chặn 100% truy cập trái phép cấp thôn; staged diff `<= 200 LOC`.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| Không giải mã được CCCD cũ do sai lệch `ENCRYPTION_KEY` giữa QLCS và QLHK | `MED / HIGH` | Script ETL chạy kiểm tra thử giải mã mẫu 5 bản ghi và xác nhận khóa trước khi ghi; hỗ trợ `--dry-run`. | Dừng script ETL; khôi phục từ snapshot CSDL `dakha_qlhk` đã tạo trước khi chạy migration. |
| Vi phạm khóa ngoại `village_id` do UUID thôn ở QLCS khác QLHK | `HIGH / HIGH` | Hàm `buildVillageMapping` đối chiếu thôn bằng tên không dấu và mã thôn chuẩn của QLHK trước khi insert. | Không chèn dữ liệu mồ côi; ghi log cảnh báo các dòng không map được vào `migration-errors.log`. |
| Trưởng thôn xem trộm hồ sơ chính sách thôn khác | `LOW / HIGH` | Cưỡng chế 100% endpoint `/api/policies/*` đi qua middleware `authenticateToken` và `authorizeVillage`. | Sửa chữa ngay tại `src/routes/policy.routes.ts`, chạy test an ninh `policy-rbac.test.ts`. |

## 8. Final Verification Gate (Step 8 in `roadmap`)
- **Full Test Suite Command**: `cd QLHK/QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts` (Must exit 0 with zero regressions vs. baseline)
- **Typecheck / Static Analysis Command**: `cd QLHK/QLHK-Backend && npx tsc --noEmit` (Must exit 0 with 0 errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md
- Task Name (<TASK_NAME>): qlhk-backend-merge-qlcs
- Implementation Steps: 7 (Sections 1..7, plus Step 8 Final Verification Gate)
- Full Test Command: cd QLHK/QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts
- Typecheck Command: cd QLHK/QLHK-Backend && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
