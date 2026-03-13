# Crypto Compliance Gateway

NestJS HTTP gateway that exposes policy-management endpoints and forwards them
to the gRPC compliance backend.

## Current Scope

Implemented:
- HTTP policy endpoints for blacklist, whitelist, and mutation history
- Signed service mutation endpoints
- Trusted admin mutation endpoints
- gRPC client bridge to `backend/`
- `/healthz` for ingress health checks

## Requirements

- Node.js `>= 24.14.0` (baseline `24.14.0`)
- pnpm `>= 10.32.0` (baseline `10.32.0`)
- Reachability to the backend gRPC service

## Local Run

From repository root:

```bash
pnpm --dir gateway install
pnpm --dir gateway start:dev
```

## Environment Variables

- `PORT`
- `COMPLIANCE_BACKEND_GRPC_URL`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_TRACES_SAMPLE_RATE`
- `SENTRY_PROFILES_SAMPLE_RATE`

Defaults:
- `PORT=3001`
- `COMPLIANCE_BACKEND_GRPC_URL=127.0.0.1:50051`

## Verification Commands

From repository root:

```bash
pnpm --dir gateway test --runInBand
pnpm --dir gateway lint
pnpm --dir gateway build
```
