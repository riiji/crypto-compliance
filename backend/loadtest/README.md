# CheckAddressCompliance gRPC Stress Test

This harness measures current throughput for `compliance.ComplianceService.CheckAddressCompliance` and emits stage-by-stage reports.

## What it runs

- Connectivity check with `grpcurl` (`list`)
- Warm-up hot cache stage
- Mixed hot/cold stages in parallel (90/10 split by default), unlimited client RPS, durations: `10s 30s 60s`
- Lock contention burst on a single uncached address
- Summary generation with throughput/latency/error metrics

## Prerequisites

- `ghz`
- `grpcurl`
- `kubectl`
- `node`
- Backend pod running
- Valid backend env (`COMPLIANCE_API_KEY`, Postgres, Valkey)

### Install tools (native, no Docker)

```bash
mkdir -p /tmp/loadtest-tools ~/.local/share/pnpm
curl -fsSL -o /tmp/loadtest-tools/ghz-linux-arm64.tar.gz https://github.com/bojand/ghz/releases/download/v0.121.0/ghz-linux-arm64.tar.gz
curl -fsSL -o /tmp/loadtest-tools/grpcurl_1.9.3_linux_arm64.tar.gz https://github.com/fullstorydev/grpcurl/releases/download/v1.9.3/grpcurl_1.9.3_linux_arm64.tar.gz
tar -xzf /tmp/loadtest-tools/ghz-linux-arm64.tar.gz -C /tmp/loadtest-tools ghz
tar -xzf /tmp/loadtest-tools/grpcurl_1.9.3_linux_arm64.tar.gz -C /tmp/loadtest-tools grpcurl
install -m 0755 /tmp/loadtest-tools/ghz ~/.local/share/pnpm/ghz
install -m 0755 /tmp/loadtest-tools/grpcurl ~/.local/share/pnpm/grpcurl
ghz --version
grpcurl -version
```

## Port-forward gRPC

Current `backend/terraform.dev` service exposes port `3000`; for gRPC stress tests use pod port-forward to `5000`.

```bash
POD=$(kubectl -n default get pods -l app=crypto-compliance-backend-dev -o jsonpath='{.items[0].metadata.name}')
kubectl -n default port-forward "$POD" 5000:5000 3000:3000
```

## Run

From `backend/`:

```bash
pnpm run loadtest:grpc
```

Output is written to:

- `loadtest/results/<UTC_TIMESTAMP>/`
- `loadtest/results/latest` (symlink)

Important files:

- Raw ghz JSON files: `stage-*-hot.json`, `stage-*-cold.json`, `warmup-hot.json`, `contention-burst.json`
- Markdown summary: `summary.md`
- Machine-readable summary: `summary.json`

## Tune run parameters

You can override any of these env vars:

```bash
TARGET=localhost:5000
STAGES="10 30 60"
UNLIMITED_TOTAL_CONCURRENCY=120
COOLDOWN_SECONDS=60
HOT_RATIO_PERCENT=90
WARMUP_DURATION_SECONDS=60
WARMUP_CONCURRENCY=30
CONTENTION_CONCURRENCY=300
CONTENTION_DURATION_SECONDS=60
```

Example:

```bash
TARGET=localhost:5000 STAGES="10 30 60" UNLIMITED_TOTAL_CONCURRENCY=180 pnpm run loadtest:grpc
```

## Re-render summary

```bash
pnpm run loadtest:report
```

To inspect a specific run directory:

```bash
node ./loadtest/parse-ghz-report.mjs --results-dir ./loadtest/results/<RUN_ID>
```

## Dry run (command preview)

```bash
DRY_RUN=1 pnpm run loadtest:grpc
```

## Notes

- Hot and cold streams are run as separate concurrent ghz processes.
- Reported stage percentiles are conservative (`max(hot, cold)`), while achieved RPS and error rate are combined.
- Optional infra follow-up: expose explicit gRPC service port in `backend/terraform.dev` if you want service-level port-forwarding instead of pod-level port-forwarding.
