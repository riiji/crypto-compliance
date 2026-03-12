#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

KUBECTL_BIN="${KUBECTL_BIN:-kubectl}"
NAMESPACE="${NAMESPACE:-default}"
BACKEND_POD_SELECTOR="${BACKEND_POD_SELECTOR:-app=crypto-compliance-backend-dev}"
BACKEND_POD_NAME="${BACKEND_POD_NAME:-}"
GRPC_PORT="${GRPC_PORT:-50051}"
TARGET="${TARGET:-}"

RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUNNER_NAME="${RUNNER_NAME:-crypto-compliance-loadtest-${RUN_ID,,}}"
RUNNER_IMAGE="${RUNNER_IMAGE:-node:24.14.0}"
POD_READY_TIMEOUT="${POD_READY_TIMEOUT:-120s}"
KEEP_RUNNER="${KEEP_RUNNER:-0}"
DRY_RUN="${DRY_RUN:-0}"

GHZ_VERSION="${GHZ_VERSION:-v0.121.0}"
GRPCURL_VERSION="${GRPCURL_VERSION:-1.9.3}"

REMOTE_WORKDIR="${REMOTE_WORKDIR:-/work}"
REMOTE_RESULTS_ROOT="${REMOTE_RESULTS_ROOT:-/results}"
LOCAL_RESULTS_ROOT="${LOCAL_RESULTS_ROOT:-${SCRIPT_DIR}/results}"

runner_created=0

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

run_cmd() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    printf '[DRY_RUN] '
    printf '%q ' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

cleanup() {
  if (( runner_created == 0 )) || [[ "${KEEP_RUNNER}" == "1" ]] || [[ "${DRY_RUN}" == "1" ]]; then
    return 0
  fi

  "${KUBECTL_BIN}" -n "${NAMESPACE}" delete pod "${RUNNER_NAME}" --ignore-not-found >/dev/null 2>&1 || true
}

trap cleanup EXIT

discover_target() {
  if [[ -n "${TARGET}" ]]; then
    return 0
  fi

  if [[ "${DRY_RUN}" == "1" ]]; then
    TARGET="BACKEND_POD_IP:${GRPC_PORT}"
    return 0
  fi

  if [[ -z "${BACKEND_POD_NAME}" ]]; then
    BACKEND_POD_NAME="$("${KUBECTL_BIN}" -n "${NAMESPACE}" get pods -l "${BACKEND_POD_SELECTOR}" --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')"
  fi

  if [[ -z "${BACKEND_POD_NAME}" ]]; then
    log "Unable to find a running backend pod with selector ${BACKEND_POD_SELECTOR}"
    exit 1
  fi

  local backend_pod_ip
  backend_pod_ip="$("${KUBECTL_BIN}" -n "${NAMESPACE}" get pod "${BACKEND_POD_NAME}" -o jsonpath='{.status.podIP}')"
  if [[ -z "${backend_pod_ip}" ]]; then
    log "Backend pod ${BACKEND_POD_NAME} does not have a pod IP yet"
    exit 1
  fi

  TARGET="${backend_pod_ip}:${GRPC_PORT}"
}

create_runner_pod() {
  log "Creating remote loadtest pod ${RUNNER_NAME} in namespace ${NAMESPACE}"

  run_cmd \
    "${KUBECTL_BIN}" -n "${NAMESPACE}" run "${RUNNER_NAME}" \
    --restart=Never \
    --image="${RUNNER_IMAGE}" \
    --labels="app.kubernetes.io/name=crypto-compliance-loadtest,app.kubernetes.io/component=loadtest" \
    --command -- /bin/bash -lc "trap 'exit 0' TERM INT; while true; do sleep 3600; done"

  runner_created=1

  run_cmd \
    "${KUBECTL_BIN}" -n "${NAMESPACE}" wait \
    --for=condition=Ready \
    "pod/${RUNNER_NAME}" \
    --timeout="${POD_READY_TIMEOUT}"
}

copy_test_inputs() {
  log "Copying loadtest scripts and protobuf into ${RUNNER_NAME}"

  run_cmd \
    "${KUBECTL_BIN}" -n "${NAMESPACE}" exec "${RUNNER_NAME}" -- \
    mkdir -p \
    "${REMOTE_WORKDIR}/loadtest/data" \
    "${REMOTE_WORKDIR}/src/compliance" \
    "${REMOTE_RESULTS_ROOT}"

  run_cmd \
    "${KUBECTL_BIN}" -n "${NAMESPACE}" cp \
    "${SCRIPT_DIR}/run-grpc-stress.sh" \
    "${NAMESPACE}/${RUNNER_NAME}:${REMOTE_WORKDIR}/loadtest/run-grpc-stress.sh"

  run_cmd \
    "${KUBECTL_BIN}" -n "${NAMESPACE}" cp \
    "${SCRIPT_DIR}/parse-ghz-report.mjs" \
    "${NAMESPACE}/${RUNNER_NAME}:${REMOTE_WORKDIR}/loadtest/parse-ghz-report.mjs"

  run_cmd \
    "${KUBECTL_BIN}" -n "${NAMESPACE}" cp \
    "${SCRIPT_DIR}/data/hot-requests.json" \
    "${NAMESPACE}/${RUNNER_NAME}:${REMOTE_WORKDIR}/loadtest/data/hot-requests.json"

  run_cmd \
    "${KUBECTL_BIN}" -n "${NAMESPACE}" cp \
    "${BACKEND_DIR}/src/compliance/compliance.proto" \
    "${NAMESPACE}/${RUNNER_NAME}:${REMOTE_WORKDIR}/src/compliance/compliance.proto"
}

run_remote_loadtest() {
  local env_assignments=(
    "RUN_ID=${RUN_ID}"
    "RESULTS_ROOT=${REMOTE_RESULTS_ROOT}"
    "TARGET=${TARGET}"
    "GHZ_BIN=/usr/local/bin/ghz"
    "GRPCURL_BIN=/usr/local/bin/grpcurl"
  )
  local passthrough_vars=(
    CALL
    PROTO_FILE
    STAGES
    COOLDOWN_SECONDS
    WARMUP_DURATION_SECONDS
    WARMUP_CONCURRENCY
    HOT_RATIO_PERCENT
    TOTAL_CONCURRENCY
    UNLIMITED_TOTAL_CONCURRENCY
    REQUEST_TIMEOUT
    WARMUP_RPS
    STAGE_TOTAL_RPS
    CONTENTION_RPS
    MAX_CONNECTIONS_PER_STREAM
    WARMUP_CONNECTIONS
    HOT_CONNECTIONS
    COLD_CONNECTIONS
    CONTENTION_CONNECTIONS
    CONTENTION_CONCURRENCY
    CONTENTION_DURATION_SECONDS
  )
  local env_key
  for env_key in "${passthrough_vars[@]}"; do
    if [[ -n "${!env_key-}" ]]; then
      env_assignments+=("${env_key}=${!env_key}")
    fi
  done

  local quoted_env=""
  local assignment
  for assignment in "${env_assignments[@]}"; do
    printf -v quoted_env '%s%q ' "${quoted_env}" "${assignment}"
  done

  local remote_cmd
  remote_cmd="$(cat <<EOF
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y curl ca-certificates
fi

mkdir -p /tmp/loadtest-tools

arch="\$(uname -m)"
case "\${arch}" in
  x86_64|amd64)
    ghz_asset="ghz-linux-x86_64.tar.gz"
    grpcurl_asset="grpcurl_${GRPCURL_VERSION}_linux_x86_64.tar.gz"
    ;;
  aarch64|arm64)
    ghz_asset="ghz-linux-arm64.tar.gz"
    grpcurl_asset="grpcurl_${GRPCURL_VERSION}_linux_arm64.tar.gz"
    ;;
  *)
    echo "Unsupported architecture: \${arch}" >&2
    exit 1
    ;;
esac

curl -fsSL -o "/tmp/loadtest-tools/\${ghz_asset}" "https://github.com/bojand/ghz/releases/download/${GHZ_VERSION}/\${ghz_asset}"
curl -fsSL -o "/tmp/loadtest-tools/\${grpcurl_asset}" "https://github.com/fullstorydev/grpcurl/releases/download/v${GRPCURL_VERSION}/\${grpcurl_asset}"

tar -xzf "/tmp/loadtest-tools/\${ghz_asset}" -C /tmp/loadtest-tools ghz
tar -xzf "/tmp/loadtest-tools/\${grpcurl_asset}" -C /tmp/loadtest-tools grpcurl

install -m 0755 /tmp/loadtest-tools/ghz /usr/local/bin/ghz
install -m 0755 /tmp/loadtest-tools/grpcurl /usr/local/bin/grpcurl
chmod +x "${REMOTE_WORKDIR}/loadtest/run-grpc-stress.sh"

cd "${REMOTE_WORKDIR}"
${quoted_env}bash "${REMOTE_WORKDIR}/loadtest/run-grpc-stress.sh"
EOF
)"

  log "Running ghz remotely against ${TARGET}"
  run_cmd "${KUBECTL_BIN}" -n "${NAMESPACE}" exec "${RUNNER_NAME}" -- /bin/bash -lc "${remote_cmd}"
}

copy_results_if_present() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    run_cmd \
      "${KUBECTL_BIN}" -n "${NAMESPACE}" cp \
      "${NAMESPACE}/${RUNNER_NAME}:${REMOTE_RESULTS_ROOT}/${RUN_ID}" \
      "${LOCAL_RESULTS_ROOT}/"
    return 0
  fi

  if ! "${KUBECTL_BIN}" -n "${NAMESPACE}" exec "${RUNNER_NAME}" -- test -d "${REMOTE_RESULTS_ROOT}/${RUN_ID}" >/dev/null 2>&1; then
    return 0
  fi

  mkdir -p "${LOCAL_RESULTS_ROOT}"

  log "Copying results back to ${LOCAL_RESULTS_ROOT}/${RUN_ID}"
  "${KUBECTL_BIN}" -n "${NAMESPACE}" cp \
    "${NAMESPACE}/${RUNNER_NAME}:${REMOTE_RESULTS_ROOT}/${RUN_ID}" \
    "${LOCAL_RESULTS_ROOT}/"

  ln -sfn "${LOCAL_RESULTS_ROOT}/${RUN_ID}" "${LOCAL_RESULTS_ROOT}/latest"
}

main() {
  discover_target
  log "Target: ${TARGET}"
  create_runner_pod
  copy_test_inputs

  local remote_status=0
  run_remote_loadtest || remote_status=$?

  copy_results_if_present

  if (( remote_status != 0 )); then
    log "Remote loadtest failed with exit code ${remote_status}"
    if [[ "${KEEP_RUNNER}" != "1" ]]; then
      log "Set KEEP_RUNNER=1 to inspect the runner pod after failures"
    fi
    exit "${remote_status}"
  fi

  log "Remote loadtest completed"
}

main "$@"
