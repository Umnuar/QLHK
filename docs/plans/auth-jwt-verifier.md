# Implementation Plan: Auth JWT Verifier Reinforcement and Test Suite (`auth-jwt-verifier`)

- **Task Name (`<TASK_NAME>`)**: `auth-jwt-verifier`
- **Task Type**: `Refactor`
- **Source Input**: `User Request`
- **Target Branch (for `roadmap`)**: `feat/qlhk-pane1`
- **Total Implementation Steps**: `3`

## 1. Context & Goal

Reinforce and verify JWT authentication, expiry check, secret key validation, and token error handling in `src/middlewares/auth.rs` of `QLHK-Backend-Rust`.
Ensure zero comments in touched code, preserve existing public function signatures and business logic, introduce no new dependencies or DB migrations, and verify complete test suite pass with `cargo test --lib middlewares::auth::tests` and `cargo check`.

## 2. Assumptions

- `auth_middleware`, `Claims`, `require_admin_middleware`, and `require_village_scope_middleware` public signatures remain unchanged.
- `JWT_SECRET` has a minimum safe length of 32 characters; if unset or shorter, it safely defaults to `qlhk-dakha-jwt-access-secret-32-chars-min`.
- Dev-tokens (`test-admin`, `dev-token`) remain supported for local testing.
- No new external crates are added to `Cargo.toml`.
- Absolutely no comments (`//`, `/* ... */`, docstrings) in touched or new code.

## 3. Non-Goals

- Do not change database schemas or migrations.
- Do not alter business authorization rules for villages or roles.
- Do not touch other handlers or API routes outside `src/middlewares/auth.rs`.
- Do not run or start background development servers.
- Do not execute destructive git commands or switch branches.

## 4. Current State

In `src/middlewares/auth.rs`:
- Lines 115-151 extract `Authorization` header with basic `Bearer ` and `bearer ` checks, but lack unified handling for case variants.
- Line 166 reads `JWT_SECRET` from environment without length or whitespace validation.
- Lines 172-209 perform decoding and claim checks inline inside `auth_middleware`.
- Lines 248-381 contain 4 unit tests covering claims and basic expiration, but missing tests for tampered signatures, wrong secret keys, malformed claims, empty tokens, and secret validation.

## 5. Chosen Design & Blast Radius

- Introduce `validate_jwt_secret`, `get_jwt_secret`, `extract_token_from_header`, and `decode_and_validate_jwt` as clean, pure helpers in `src/middlewares/auth.rs`.
- Call these helpers inside `auth_middleware` without modifying its external signature or behavior.
- Blast radius is strictly confined to `src/middlewares/auth.rs`. Callers (`src/main.rs`, `src/handlers/auth.rs`) remain 100% compatible.
- Alternative rejected: Adding external JWT crates or custom middleware macros, which would violate the zero-dependency-change constraint.

## 6. Atomic Step Breakdown

### Section 1: Reinforce JWT Secret and Bearer Extraction (Step 1)

- **Target Files**: `src/middlewares/auth.rs:111-155`
- **Assigned Role**: `backend-architect`
- **Role Focus**: Secret validation and header token extraction
- **Target Signatures / Contract Changes**:
```rust
pub const MIN_JWT_SECRET_LENGTH: usize = 32;
pub const DEFAULT_JWT_SECRET: &str = "qlhk-dakha-jwt-access-secret-32-chars-min";

pub fn validate_jwt_secret(secret: &str) -> bool;
pub fn get_jwt_secret() -> String;
pub fn extract_token_from_header(auth_header: Option<&str>) -> Result<&str, (StatusCode, &'static str)>;
```
- **Actions**:
  1. Add `MIN_JWT_SECRET_LENGTH` and `DEFAULT_JWT_SECRET` constants.
  2. Implement `validate_jwt_secret` checking non-empty and minimum 32 chars.
  3. Implement `get_jwt_secret` retrieving from env or falling back safely.
  4. Implement `extract_token_from_header` supporting case-insensitive bearer prefix.
- **Scoped Test Command**: `cargo test --manifest-path C:\Users\umnuar\Documents\Projects\worktrees\qlhk-pane1\QLHK-Backend-Rust\Cargo.toml --lib middlewares::auth::tests`
- **Done Criteria**: `cargo check` passes with 0 warnings/errors and secret/extraction helpers are ready.

### Section 2: Reinforce JWT Decoding and Wire Middleware (Step 2)

- **Target Files**: `src/middlewares/auth.rs:156-212`
- **Assigned Role**: `backend-architect`
- **Role Focus**: Token decoding, expiry check, and claim validation
- **Target Signatures / Contract Changes**:
```rust
pub fn decode_and_validate_jwt(
    token: &str,
    secret: &str,
) -> Result<Claims, (StatusCode, &'static str)>;
```
- **Actions**:
  1. Implement `decode_and_validate_jwt` validating secret key, decoding token, validating exp, and checking non-empty id and role.
  2. Wire `extract_token_from_header` and `decode_and_validate_jwt` into `auth_middleware`.
  3. Preserve dev-token bypass (`test-admin`, `dev-token`) and existing public signatures.
  4. Ensure zero comments in modified code.
- **Scoped Test Command**: `cargo test --manifest-path C:\Users\umnuar\Documents\Projects\worktrees\qlhk-pane1\QLHK-Backend-Rust\Cargo.toml --lib middlewares::auth::tests`
- **Done Criteria**: `auth_middleware` integrates helpers seamlessly and compiles cleanly.

### Section 3: Add Comprehensive Unit Test Suite (Step 3)

- **Target Files**: `src/middlewares/auth.rs:248-381`
- **Assigned Role**: `backend-architect`
- **Role Focus**: Full unit test coverage for JWT authentication
- **Target Signatures / Contract Changes**:
```rust
#[cfg(test)]
mod tests {
    fn test_jwt_secret_validation();
    fn test_extract_token_from_header();
    fn test_decode_and_validate_jwt_tampered();
    fn test_decode_and_validate_jwt_wrong_secret();
}
```
- **Actions**:
  1. Add unit tests for secret key length and fallback behavior.
  2. Add unit tests for missing, empty, malformed, and case-variant Authorization headers.
  3. Add unit tests for valid token decoding.
  4. Add unit tests for expired token rejection.
  5. Add unit tests for tampered signature rejection.
  6. Add unit tests for wrong secret rejection.
  7. Add unit tests for empty/whitespace id and role rejection.
  8. Add unit tests for Claims UUID parsing and permission methods.
  9. Ensure zero comments anywhere in `src/middlewares/auth.rs`.
- **Scoped Test Command**: `cargo test --manifest-path C:\Users\umnuar\Documents\Projects\worktrees\qlhk-pane1\QLHK-Backend-Rust\Cargo.toml --lib middlewares::auth::tests`
- **Done Criteria**: All unit tests pass 100%, `cargo check` has 0 errors.

## 7. Risks & Rollback Plan

- Risk: Case-insensitive bearer extraction breaking custom token formats.
  Mitigation: Keep standard RFC 6750 whitespace delimiter and return explicit 401 status code with descriptive Vietnamese error messages.
- Rollback: Revert `src/middlewares/auth.rs` via `git checkout -- src/middlewares/auth.rs`.

## 8. Final Verification Gate

- Run `cargo test --manifest-path C:\Users\umnuar\Documents\Projects\worktrees\qlhk-pane1\QLHK-Backend-Rust\Cargo.toml --lib middlewares::auth::tests`
- Run `cargo check --manifest-path C:\Users\umnuar\Documents\Projects\worktrees\qlhk-pane1\QLHK-Backend-Rust\Cargo.toml`
- Verify zero comments in `src/middlewares/auth.rs`

## 9. Roadmap Handoff Block

```json
{
  "plan_file": "docs/plans/qlhk-backend/auth-jwt-verifier.md",
  "task_name": "auth-jwt-verifier",
  "total_steps": 3,
  "test_command": "cargo test --manifest-path C:\\Users\\umnuar\\Documents\\Projects\\worktrees\\qlhk-pane1\\QLHK-Backend-Rust\\Cargo.toml --lib middlewares::auth::tests",
  "typecheck_command": "cargo check --manifest-path C:\\Users\\umnuar\\Documents\\Projects\\worktrees\\qlhk-pane1\\QLHK-Backend-Rust\\Cargo.toml"
}
```
