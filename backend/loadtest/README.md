# CheckAddressCompliance gRPC Stress Test

This harness measures current throughput for `compliance.ComplianceService.CheckAddressCompliance` and emits stage-by-stage reports.

Recommended use:

- Run `ghz` from a separate pod or machine, not from the backend host.
- Use capped `RPS` and a smaller connection pool so the client does not become the bottleneck first.

## What it runs

- Connectivity check with `grpcurl` (`list`)
- Warm-up hot cache stage
- Mixed hot/cold stages in parallel (90/10 split by default), capped client RPS, durations: `10s 30s 60s`
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
ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64|amd64)
    GHZ_ASSET="ghz-linux-x86_64.tar.gz"
    GRPCURL_ASSET="grpcurl_1.9.3_linux_x86_64.tar.gz"
    ;;
  aarch64|arm64)
    GHZ_ASSET="ghz-linux-arm64.tar.gz"
    GRPCURL_ASSET="grpcurl_1.9.3_linux_arm64.tar.gz"
    ;;
  *)
    echo "Unsupported architecture: ${ARCH}" >&2
    exit 1
    ;;
esac
curl -fsSL -o "/tmp/loadtest-tools/${GHZ_ASSET}" "https://github.com/bojand/ghz/releases/download/v0.121.0/${GHZ_ASSET}"
curl -fsSL -o "/tmp/loadtest-tools/${GRPCURL_ASSET}" "https://github.com/fullstorydev/grpcurl/releases/download/v1.9.3/${GRPCURL_ASSET}"
tar -xzf "/tmp/loadtest-tools/${GHZ_ASSET}" -C /tmp/loadtest-tools ghz
tar -xzf "/tmp/loadtest-tools/${GRPCURL_ASSET}" -C /tmp/loadtest-tools grpcurl
install -m 0755 /tmp/loadtest-tools/ghz ~/.local/share/pnpm/ghz
install -m 0755 /tmp/loadtest-tools/grpcurl ~/.local/share/pnpm/grpcurl
ghz --version
grpcurl -version
```

## Recommended: run from a separate pod

`backend/terraform.dev` now exposes the backend over a dedicated gRPC Service.
The remote helper still discovers the backend pod IP and runs `ghz` from a
separate pod in the same namespace to avoid service-level routing noise.

From `backend/`:

```bash
pnpm run loadtest:grpc:remote
```

Important env vars for the remote helper:

```bash
NAMESPACE=default
BACKEND_POD_SELECTOR=app=crypto-compliance-backend-dev
GRPC_PORT=50051
RUNNER_IMAGE=node:24.14.0
KEEP_RUNNER=0
```

## Fallback: local port-forward smoke test

Use this only for quick checks. It shares CPU with the backend and `kubectl port-forward` is not a stable throughput path.

```bash
kubectl -n default port-forward svc/crypto-compliance-backend-dev-grpc-svc 50051:50051
```

Then run:

From `backend/`:

```bash
pnpm run loadtest:grpc
```

The local helper now defaults `TARGET` to `localhost:50051`, which matches the
port-forward workflow above.

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
TARGET=localhost:50051
STAGES="10 30 60"
TOTAL_CONCURRENCY=120
COOLDOWN_SECONDS=60
HOT_RATIO_PERCENT=90
WARMUP_DURATION_SECONDS=60
WARMUP_CONCURRENCY=30
WARMUP_RPS=150
STAGE_TOTAL_RPS=600
CONTENTION_RPS=300
MAX_CONNECTIONS_PER_STREAM=12
WARMUP_CONNECTIONS=12
HOT_CONNECTIONS=12
COLD_CONNECTIONS=12
CONTENTION_CONNECTIONS=12
CONTENTION_CONCURRENCY=300
CONTENTION_DURATION_SECONDS=60
```

Example:

```bash
TARGET=localhost:50051 STAGES="10 30 60" TOTAL_CONCURRENCY=180 STAGE_TOTAL_RPS=900 MAX_CONNECTIONS_PER_STREAM=16 pnpm run loadtest:grpc
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
DRY_RUN=1 pnpm run loadtest:grpc:remote
```

## Notes

- Hot and cold streams are run as separate concurrent ghz processes.
- Reported stage percentiles are conservative (`max(hot, cold)`), while achieved RPS and error rate are combined.
- The parser counts object-shaped `errorDistribution` payloads from ghz, so summaries now reflect transport failures correctly.
- The remote runner still targets backend pod IPs on purpose so the measurement
  stays focused on the backend process rather than kube-proxy/service hops.
