# Crypto Compliance Backend

NestJS backend for compliance checks and policy management.

## Current Scope

Implemented:
- gRPC endpoint: `ComplianceService.CheckAddressCompliance`.
- HTTP policy management:
  - `GET /compliance/policies/blacklist`
  - `GET /compliance/policies/whitelist`
  - `GET /compliance/policies/history?limit=...`
  - `POST|DELETE /compliance/policies/blacklist`
  - `POST|DELETE /compliance/policies/whitelist`
- Provider execution path through BullMQ queue (not direct in-request provider calls).
- Active Postgres persistence model:
  - `compliance_address_policies`
  - `compliance_check_history`
  - `compliance_policy_mutation_history`

Cleanup note:
- Migration history is intentionally preserved as-is.
- Legacy tables/entities (`compliance_check_records`, `compliance_check_signals`, `compliance_provider_responses`) may exist in DB schema history but are not used by runtime code.

## Requirements

- Node.js 20+
- pnpm 9+
- Postgres
- Valkey/Redis (used for cache, lock, idempotency, and BullMQ transport)

## Local Run

From repository root:

```bash
pnpm --dir backend install
pnpm --dir backend proto:gen
pnpm --dir backend db:migration:run
pnpm --dir backend start:dev
```

## Environment Variables

Core runtime:
- `COMPLIANCE_DB_HOST`, `COMPLIANCE_DB_PORT`, `COMPLIANCE_DB_USER`, `COMPLIANCE_DB_PASSWORD`, `COMPLIANCE_DB_NAME`
- `COMPLIANCE_VALKEY_HOST`, `COMPLIANCE_VALKEY_PORT` (or Bull-specific `COMPLIANCE_BULL_*`)
- `COMPLIANCE_API_KEY` (required when provider path is executed)
- `COMPLIANCE_POLICY_HMAC_SECRET` (required for secure policy mutation endpoints)

Optional overrides:
- `COMPLIANCE_API_URL`
- `COMPLIANCE_CACHE_TTL_SECONDS`
- `COMPLIANCE_POLICY_SIGNATURE_MAX_PAST_SECONDS`
- `COMPLIANCE_POLICY_SIGNATURE_MAX_FUTURE_SECONDS`
- `COMPLIANCE_IDEMPOTENCY_TTL_SECONDS`
- `PORT`

## Verification Commands

From repository root:

```bash
pnpm --dir backend test --runInBand
pnpm --dir backend lint
pnpm --dir backend build
pnpm --dir backend test:e2e
```

## Intentionally Out of Scope In This Cleanup Pass

- No public API contract changes (gRPC/HTTP remains unchanged).
- No new functionality added to close requirement gaps.
- No provider-raw-payload persistence reintroduction.
- No DB drop migrations for legacy tables.
