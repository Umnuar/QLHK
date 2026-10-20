`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a rigorous, read-only performance and efficiency audit on:
- Project: QLHK-Backend
- Target Optimization Scope (space-separated pathspec): src/controllers/ src/services/ src/middlewares/ src/utils/

SUBSYSTEM BOUNDARY & PERMISSION LOCK (BACKEND ONLY):
- You are strictly assigned to QLHK-Backend. All your operations, terminal commands, and analyses MUST execute inside `C:\Users\umnuar\Documents\Projects\QLHK\QLHK-Backend`.
- YOU MUST NEVER TOUCH, READ, MODIFY, CREATE, OR EXECUTE ANYTHING in `QLHK-Client/` or any directory outside `QLHK-Backend/`.
- STRICT READ-ONLY SOURCE TREE: You MUST NEVER modify, format, or delete any tracked repository file or create any file outside `optimize/` in `QLHK-Backend/`. All state, baseline metrics, findings, build outputs, and benchmarks MUST reside strictly inside `optimize/` and `optimize/bench/`.

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (PowerShell or Git Bash on Windows).

STRICT INVARIANTS (ANTI-LAZINESS & ANTI-SPECULATION GUARDS):
1. STRICT READ-ONLY SOURCE TREE & GIT EXCLUDE:
   - You MUST NEVER modify, format, or delete any tracked repository file or create any file outside `optimize/`.
   - All optimization state, baseline metrics, findings, build outputs, and benchmarks MUST reside strictly inside `optimize/` and `optimize/bench/`.
   - Before every session handoff and before Phase 5, compare working tree status against the Phase 0 baseline snapshot:
     `git status --porcelain | diff -u optimize/.baseline-status.txt -` (must exit 0).
   - If you modified any tracked source file, revert only that file via `git checkout -- path/to/file`.
2. ZERO COMMENTS IN CODE INVARIANT:
   - Any benchmark or code written in `optimize/bench/` MUST strictly contain ZERO comments (`//`, `/* */`, JSDoc, `#`).
   - Code must be completely self-describing through explicit naming.
3. MEASUREMENT GATE, AMDAHL CHECK & MINIMUM SIGNIFICANCE THRESHOLD (ZERO SPECULATION):
   - Every reported finding in `optimize/findings.md` MUST follow the exact Finding Template, Impact/Risk Rubric, and Confidence Level Definitions below, including a sequential ID (`OPT-001`, `OPT-002`, ...) assigned ONLY after verification succeeds, exact `file:start-end` line span, `Hot-Path Share`, verbatim code excerpt (`<= 10 lines`), bottleneck evidence, proposed change, behavior-preservation check, and `Before`/`After` verification.
   - Any candidate lacking `file:line`, a verbatim code excerpt, or failing the Minimum Significance Gate MUST be discarded and logged in `optimize/state.md` `Result / Notes` as `Discarded: <OC-ID> @ <file:line> (<delta>)`.
   - Never fabricate benchmark numbers or profiler output. Enforce the Confidence Level Definitions (`MEASURED`, `ESTIMATED`, `SPECULATIVE`) strictly.
4. BEHAVIOR-PRESERVATION GATE (ZERO SEMANTIC DRIFT):
   - An optimization that alters observable outputs, return ordering, error types, or side effects is a BUG, not an optimization.
   - Every benchmark in `optimize/bench/` MUST assert output equivalence (`Before === After`) across representative and edge-case inputs before timing.
5. ANTI-SKIMMING, FILE BUDGET (`3 + 4`) & UNIQUE LINE BUDGET (`<= 800 LINES`):
   - A Module is defined as either a single source file or a small cohesive group of `<= 3` source files.
   - In Phase 3, analyze ONE module x ONE optimization class per pass. Narrow first with `grep -n` or graft, then read targeted line spans (`<= 150 lines` per read).
   - Per-Module File & Unique-Span Budget:
     a) Module Files: `<= 3` distinct files.
     b) Context Files: `<= 2` distinct context files per candidate, and `<= 4` total across the module.
     c) Unique Span Ceiling: `<= 12` unique span reads or `<= 800` unique lines read across the module.
   - Circuit Breaker: If reading would exceed the budget, STOP reading immediately, mark `[~]` in `optimize/state.md`, and log under `### Unmeasured Candidates (Budget Exceeded)`.
6. SANDBOXED, ANTI-NOISE BENCHMARK PROTOCOL:
   - Write micro-benchmarks strictly at `optimize/bench/bench_opt_{NNN}.test.ts` and execute via `cd QLHK/QLHK-Backend && npx vitest run optimize/bench/bench_opt_{NNN}.test.ts`.
   - The `Before` benchmark MUST import the real production function or copy verbatim with `file:start-end` cited.
   - Anti-Noise: Warmup phase (`>= 10` iterations) followed by `>= 30` measured iterations across at least 2 independent trials, reporting both `mean` and `p95`. Valid ONLY if delta exceeds 2x inter-trial variance.
   - DB Query Plan: Local/ephemeral tests only. Wrap in `BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;` or classify as `ESTIMATED` with query-count math. Never mutate production DB.
7. FRESH-SESSION HANDOFF:
   - After transitioning 3 modules to `[x]` or `[~]` in the current session (unless zero `[ ]` modules remain), verify zero source drift, output the handoff block, and STOP.

---

## OPTIMIZATION CLASS CHECKLIST TO APPLY

### 1. Core Generic Optimization Classes
- `OC-01` Algorithmic Complexity & Data Structure Mismatch: Nested loops causing O(N^2) scans, repeated linear `.find()`/`.includes()` lookups inside loops instead of `Map`/`Set` (O(1)), or sorting inside hot loops.
- `OC-02` Redundant & Unbatched I/O: N+1 network/disk/IPC calls inside loops, sequential `await` calls on independent I/O that could run concurrently, repeated file `stat`/`readFile`.
- `OC-03` Caching Gaps, Broken Invalidation & Key Collisions: Expensive computations or read-heavy lookups recomputed on every request without caching, cache keys missing tenant/filter parameters, unbounded caches without TTL/LRU.
- `OC-04` Excessive Memory Allocation & Redundant Copying: Cloning large objects/arrays inside loops, building large strings/buffers via repeated concatenation in loops, materializing full collections in memory instead of streaming.
- `OC-05` Safe Concurrency & Parallelization Opportunities: Independent CPU-bound or I/O-bound tasks executed serially on hot paths where bounded concurrency (`Promise.all` with limit) reduces latency.
- `OC-06` Startup, Cold-Start & Build/Bundle Overhead: Eagerly importing/initializing heavy dependencies at module load time when only rare paths use them, synchronous boot-time I/O.
- `OC-07` Payload Size & Serialization Bottlenecks: Serializing/deserializing huge JSON payloads repeatedly, sending unused nested blobs, missing compression, recompiling regexes/schemas per call.
- `OC-08` Dead Code, Redundant Passes & Heavy Dependencies: Chaining multiple `.map().filter().reduce()` passes over large arrays, dead computation whose result is overwritten, pulling a massive library for a trivial utility.

### 2. Database, ORM & Web API Profile Extension (QLHK-Backend with Prisma / SQLite / PostgreSQL)
- `OC-10` Missing Indexes & Suboptimal Query Plans: Filtering (`WHERE`), joining (`JOIN`), or sorting (`ORDER BY`) large tables on unindexed columns, leading `LIKE '%foo'` scans, non-sargable expressions.
- `OC-11` Offset Pagination & Unbounded Table Scans: Deep `OFFSET / LIMIT` (`skip / take`) scanning and discarding thousands of rows instead of keyset/cursor pagination (`WHERE (created_at, id) < (?, ?)`).
- `OC-12` Connection Pool Starvation & Wide Transaction Scope: Holding database transactions open across slow external HTTP calls, file I/O, or heavy CPU loops, or instantiating new DB clients per request.
- `OC-13` Over-Fetching & Missing Projection (`SELECT *`): Fetching all columns (large JSON/text) or eagerly joining relation graphs (`include: { ... }`) when the caller only reads 2-3 fields or a `COUNT(*)`.
- `OC-14` Hot-Row Lock Contention & Chatty Writes: Updating a single counter/summary row per request inside a transaction, issuing N individual `INSERT`/`UPDATE` in a loop instead of bulk `createMany` / batch upserts.

### 3. Mandatory Hot-Path-to-Optimization-Class Mapping
| Hot-Path Category | Core Generic Classes | DB / Web Profile Classes |
| :--- | :--- | :--- |
| **Entry Points & Request Handlers** | `OC-02`, `OC-03`, `OC-05`, `OC-07` | `OC-11`, `OC-13` |
| **Hot Loops & Data Transforms** | `OC-01`, `OC-04`, `OC-08` | - |
| **Database & Storage I/O** | `OC-02`, `OC-03`, `OC-04` | `OC-10`, `OC-11`, `OC-12`, `OC-13`, `OC-14` |
| **Network, IPC & File I/O** | `OC-02`, `OC-04`, `OC-05`, `OC-07` | `OC-12` |
| **UI Render, Boot & Build/Bundle** | `OC-03`, `OC-06`, `OC-07`, `OC-08` | - |

### 4. Stack-Specific: JavaScript / TypeScript (`JS/TS`)
- `JS-OPT-01` Unnecessary React Re-Renders & Context Thrashing: (N/A for backend)
- `JS-OPT-02` Bundle Bloat & Broken Tree-Shaking: Eagerly importing massive unused packages.
- `JS-OPT-03` Event-Loop Blocking & Sync APIs: Running synchronous `fs.*Sync`, `crypto.pbkdf2Sync`, large `JSON.parse`/`JSON.stringify`, or complex regexes on the main Node.js event loop.
- `JS-OPT-04` Object Shape Megamorphism & Spread Copy Loops: Using `{ ...acc, [k]: v }` inside `.reduce()` (creating O(N^2) copies) instead of mutating `acc[k] = v`.

---

## FINDING TEMPLATE, IMPACT/RISK RUBRIC & CONFIDENCE RULES

### Finding Schema (Append to `optimize/findings.md`):
````markdown
### [OPT-{NNN}] {Concise Optimization Title}
- **Impact**: `{HIGH | MEDIUM | LOW}`
- **Risk**: `{LOW | MEDIUM | HIGH}`
- **Confidence**: `{MEASURED | ESTIMATED}`
- **Optimization Class**: `{OC-XX / STACK-OPT-XX}`
- **Location**: `{path/to/file.ext:startLine-endLine}`
- **Hot-Path Entry Point**: `{path/to/entry.ext:line}`
- **Hot-Path Share (Amdahl Check)**: `{e.g., 42% of endpoint CPU self-time -> ~40.7% end-to-end gain | Primary DB query on route}`
- **Code Excerpt** (`<= 10 lines verbatim`):
  ```{lang}
  {exact lines copied from Location}
  ```
- **Bottleneck Evidence**: {Exact profiler sample %, query `EXPLAIN` cost/row scan count, or concrete cardinality math with realistic dataset size N}
- **Proposed Change** (`Read-Only Description — Do NOT edit source`): {Target algorithm, batching, caching, index, or query rewrite}
- **Behavior-Preservation Check**: {Existing tests (`file:line`), return invariants (`INV-XX`), and edge cases verified identical between Before and After}
- **Benchmark / Quantitative Verification (`Before` vs. `After`)**:
  - *Bench File*: `optimize/bench/bench_opt_{NNN}.test.ts | None (ESTIMATED — reason)`
  - *Command*: `{exact shell command run | N/A}`
  - *Before Metric*: `{e.g., 38.42 ms/op (p95: 41.10 ms) | 1,201 queries (N=1,200)}`
  - *After Metric*: `{e.g., 1.14 ms/op (p95: 1.29 ms, -97.0%, 33.7x) | 2 queries (-99.8%)}`
  - *Observed Output / Quantitative Proof*:
    ```text
    {Verbatim terminal output from 2-trial benchmark (mean + p95) and passing equivalence assertions, OR quantitative formula at realistic N}
    ```
````

### Minimum Significance Gate:
Must satisfy at least one:
a) `>= 10%` relative improvement on target hot component, OR
b) Absolute floor: `>= 50%` reduction in DB/network calls (and `>= 5` fewer round-trips), or eliminating O(N^2) loop where N >= 1,000 (or N >= 100 saving >= 1 ms/call).

---

## EXECUTION PHASES

### PHASE 0: SETUP & BASELINE SNAPSHOT
1. Run in `QLHK/QLHK-Backend`:
   `mkdir -p optimize/bench`
2. Baseline test: `npm test` -> Record result as `<BASELINE_TEST_STATUS>`.
3. Profile Command: N/A. Note in `optimize/baseline-metrics.md`.
4. Snapshot: `git status --porcelain > optimize/.baseline-status.txt`
5. Initialize `optimize/findings.md` with header `# Verified Optimization Findings (QLHK-Backend)`.
6. Initialize `optimize/state.md` with `Phase 1: Map`.

### PHASE 1: MAP HOT PATHS & BEHAVIORAL CONTRACTS
1. Scan `src/controllers/`, `src/services/`, `src/middlewares/`, `src/utils/` for:
   - Entry points & request handlers (`router.get`, `router.post`)
   - Hot loops & data transforms (Excel parser, CCCD decryption, aggregations)
   - Database & storage I/O (`prisma.*.findMany`, `transaction`, queries)
   - Network / IPC / File I/O
2. Extract Behavioral Contracts (`INV-01`, `INV-02`, ...) from existing tests, schema, and API contracts.
3. Update `optimize/state.md`.

### PHASE 2: TOOL-DRIVEN TRIAGE
1. Partition into modules (`<= 3` files per module).
2. Rank top 15-20 highest-impact modules using signals (churn, loop/query density, callers).
3. Pre-populate `Planned Optimization Classes` using the hot-path mapping table.

### PHASE 3: DEEP DIVE (1 MODULE x 1 OC)
1. Iterate through modules and planned OCs one by one.
2. Read targeted line ranges (`<= 150 lines` per read). Respect `<= 3` module files, `<= 4` context files, `<= 800` unique lines budget.

### PHASE 4: SANDBOXED BENCHMARK / QUANTITATIVE VERIFICATION
1. Verify bottleneck candidate with hot-path share, cardinality, and behavior check.
2. Write sandboxed micro-benchmark in `optimize/bench/bench_opt_{NNN}.test.ts`. Run `npx vitest run optimize/bench/bench_opt_{NNN}.test.ts`.
3. Assert equivalence `Before === After`.
4. If verified, append `OPT-{NNN}` to `optimize/findings.md`.

### PHASE 5: FINAL REPORT
When all queued modules are checked:
Write `optimize/report.md` with Executive Summary, Verified Findings Table, Unmeasured Candidates, and Verified Roadmap Input Block.
`````