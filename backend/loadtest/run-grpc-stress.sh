#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMMON_SH="${SCRIPT_DIR}/lib/common.sh"
PROTO_MOUNT="${BACKEND_DIR}/src"
HOT_DATA_FILE="${SCRIPT_DIR}/data/hot-requests.json"

# shellcheck source=./lib/common.sh
source "${COMMON_SH}"

RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RESULTS_ROOT="${RESULTS_ROOT:-${SCRIPT_DIR}/results}"
RESULTS_DIR="${RESULTS_DIR:-${RESULTS_ROOT}/${RUN_ID}}"
LATEST_LINK="${RESULTS_ROOT}/latest"

TARGET="${TARGET:-localhost:50051}"
CALL="${CALL:-compliance.ComplianceService.CheckAddressCompliance}"
PROTO_FILE="${PROTO_FILE:-compliance/compliance.proto}"

GHZ_BIN="${GHZ_BIN:-ghz}"
GRPCURL_BIN="${GRPCURL_BIN:-grpcurl}"

STAGES="${STAGES:-10 30 60}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-60}"

WARMUP_DURATION_SECONDS="${WARMUP_DURATION_SECONDS:-60}"
WARMUP_CONCURRENCY="${WARMUP_CONCURRENCY:-30}"

HOT_RATIO_PERCENT="${HOT_RATIO_PERCENT:-90}"
TOTAL_CONCURRENCY="${TOTAL_CONCURRENCY:-${UNLIMITED_TOTAL_CONCURRENCY:-120}}"
REQUEST_TIMEOUT="${REQUEST_TIMEOUT:-8s}"
WARMUP_RPS="${WARMUP_RPS:-150}"
STAGE_TOTAL_RPS="${STAGE_TOTAL_RPS:-600}"
CONTENTION_RPS="${CONTENTION_RPS:-300}"
MAX_CONNECTIONS_PER_STREAM="${MAX_CONNECTIONS_PER_STREAM:-12}"
WARMUP_CONNECTIONS="${WARMUP_CONNECTIONS:-}"
HOT_CONNECTIONS="${HOT_CONNECTIONS:-}"
COLD_CONNECTIONS="${COLD_CONNECTIONS:-}"
CONTENTION_CONNECTIONS="${CONTENTION_CONNECTIONS:-}"

CONTENTION_CONCURRENCY="${CONTENTION_CONCURRENCY:-300}"
CONTENTION_DURATION_SECONDS="${CONTENTION_DURATION_SECONDS:-60}"

DRY_RUN="${DRY_RUN:-0}"

run_ghz_data_file() {
  local name="$1"
  local concurrency="$2"
  local connections="$3"
  local duration_seconds="$4"
  local rps="$5"
  local data_file="$6"
  local output_file="$7"

  local cmd=(
    "${GHZ_BIN}"
    --insecure
    --proto "${PROTO_MOUNT}/${PROTO_FILE}"
    --call "${CALL}"
    --name "${name}"
    --concurrency "${concurrency}"
    --connections "${connections}"
    --duration "${duration_seconds}s"
    --total 0
    --timeout "${REQUEST_TIMEOUT}"
    --format json
    --output "${RESULTS_DIR}/${output_file}"
    --data-file "${data_file}"
    "${TARGET}"
  )

  if [[ -n "${rps}" && "${rps}" != "0" ]]; then
    cmd+=(--rps "${rps}")
  fi

  run_cmd "${cmd[@]}"
}

run_ghz_data_template() {
  local name="$1"
  local concurrency="$2"
  local connections="$3"
  local duration_seconds="$4"
  local rps="$5"
  local data_template="$6"
  local output_file="$7"

  local cmd=(
    "${GHZ_BIN}"
    --insecure
    --proto "${PROTO_MOUNT}/${PROTO_FILE}"
    --call "${CALL}"
    --name "${name}"
    --concurrency "${concurrency}"
    --connections "${connections}"
    --duration "${duration_seconds}s"
    --total 0
    --timeout "${REQUEST_TIMEOUT}"
    --format json
    --output "${RESULTS_DIR}/${output_file}"
    --data "${data_template}"
    "${TARGET}"
  )

  if [[ -n "${rps}" && "${rps}" != "0" ]]; then
    cmd+=(--rps "${rps}")
  fi

  run_cmd "${cmd[@]}"
}

sleep_if_needed() {
  local seconds="$1"
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN enabled, skipping sleep ${seconds}s"
    return 0
  fi

  sleep "${seconds}"
}

validate_inputs() {
  require_command node
  require_command "${GHZ_BIN}"
  require_command "${GRPCURL_BIN}"

  if [[ ! -f "${HOT_DATA_FILE}" ]]; then
    log "Hot data file not found: ${HOT_DATA_FILE}"
    exit 1
  fi

  mkdir -p "${RESULTS_DIR}"
  mkdir -p "${RESULTS_ROOT}"
  ln -sfn "${RESULTS_DIR}" "${LATEST_LINK}"

  cat > "${RESULTS_DIR}/run-config.env" <<CONFIG
RUN_ID=${RUN_ID}
TARGET=${TARGET}
CALL=${CALL}
PROTO_FILE=${PROTO_FILE}
STAGES=${STAGES}
COOLDOWN_SECONDS=${COOLDOWN_SECONDS}
WARMUP_DURATION_SECONDS=${WARMUP_DURATION_SECONDS}
WARMUP_CONCURRENCY=${WARMUP_CONCURRENCY}
HOT_RATIO_PERCENT=${HOT_RATIO_PERCENT}
TOTAL_CONCURRENCY=${TOTAL_CONCURRENCY}
WARMUP_RPS=${WARMUP_RPS}
STAGE_TOTAL_RPS=${STAGE_TOTAL_RPS}
CONTENTION_RPS=${CONTENTION_RPS}
MAX_CONNECTIONS_PER_STREAM=${MAX_CONNECTIONS_PER_STREAM}
WARMUP_CONNECTIONS=${WARMUP_CONNECTIONS}
HOT_CONNECTIONS=${HOT_CONNECTIONS}
COLD_CONNECTIONS=${COLD_CONNECTIONS}
CONTENTION_CONNECTIONS=${CONTENTION_CONNECTIONS}
CONTENTION_CONCURRENCY=${CONTENTION_CONCURRENCY}
CONTENTION_DURATION_SECONDS=${CONTENTION_DURATION_SECONDS}
GHZ_BIN=${GHZ_BIN}
GRPCURL_BIN=${GRPCURL_BIN}
CONFIG
}

check_connectivity() {
  log "Checking gRPC connectivity to ${TARGET}"

  if [[ "${DRY_RUN}" == "1" ]]; then
    run_cmd "${GRPCURL_BIN}" \
      -plaintext \
      -import-path "${PROTO_MOUNT}" \
      -proto "${PROTO_FILE}" \
      "${TARGET}" list
    return 0
  fi

  local list_output
  list_output="$("${GRPCURL_BIN}" \
    -plaintext \
    -import-path "${PROTO_MOUNT}" \
    -proto "${PROTO_FILE}" \
    "${TARGET}" list)"

  printf '%s\n' "${list_output}" > "${RESULTS_DIR}/grpcurl-list.txt"

  if ! grep -q '^compliance\.ComplianceService$' "${RESULTS_DIR}/grpcurl-list.txt"; then
    log "ComplianceService not found in grpcurl list output"
    exit 1
  fi

  log "Connectivity check passed"
}

run_warmup() {
  local warmup_connections
  warmup_connections="$(resolve_connections "${WARMUP_CONCURRENCY}" "${WARMUP_CONNECTIONS}")"

  log "Warm-up: ${WARMUP_DURATION_SECONDS}s using hot dataset (concurrency=${WARMUP_CONCURRENCY}, connections=${warmup_connections}, rps=$(format_rps_label "${WARMUP_RPS}"))"

  run_ghz_data_file \
    "warmup-hot" \
    "${WARMUP_CONCURRENCY}" \
    "${warmup_connections}" \
    "${WARMUP_DURATION_SECONDS}" \
    "${WARMUP_RPS}" \
    "${HOT_DATA_FILE}" \
    "warmup-hot.json"
}

run_stage() {
  local stage_value="$1"
  local hot_concurrency="$(( TOTAL_CONCURRENCY * HOT_RATIO_PERCENT / 100 ))"
  if (( hot_concurrency < 1 )); then
    hot_concurrency=1
  fi

  local cold_concurrency="$(( TOTAL_CONCURRENCY - hot_concurrency ))"
  if (( cold_concurrency < 1 )); then
    cold_concurrency=1
  fi

  local hot_connections
  hot_connections="$(resolve_connections "${hot_concurrency}" "${HOT_CONNECTIONS}")"

  local cold_connections
  cold_connections="$(resolve_connections "${cold_concurrency}" "${COLD_CONNECTIONS}")"

  local hot_rps=0
  local cold_rps=0
  if (( STAGE_TOTAL_RPS > 0 )); then
    hot_rps="$(( STAGE_TOTAL_RPS * HOT_RATIO_PERCENT / 100 ))"
    if (( hot_rps < 1 )); then
      hot_rps=1
    fi

    cold_rps="$(( STAGE_TOTAL_RPS - hot_rps ))"
    if (( cold_rps < 1 )); then
      cold_rps=1
    fi
  fi

  local stage_label
  printf -v stage_label '%03d' "${stage_value}"

  local hot_file="stage-${stage_label}-hot.json"
  local cold_file="stage-${stage_label}-cold.json"

  local cold_template
  printf -v cold_template '{"address":"0x{{ printf `%%08x%%032x` %d .RequestNumber }}","network":"eip155:1"}' "${stage_value}"

  log "Stage ${stage_value}s: hot_concurrency=${hot_concurrency} hot_connections=${hot_connections} hot_rps=$(format_rps_label "${hot_rps}") cold_concurrency=${cold_concurrency} cold_connections=${cold_connections} cold_rps=$(format_rps_label "${cold_rps}")"

  run_ghz_data_file \
    "stage-${stage_label}-hot" \
    "${hot_concurrency}" \
    "${hot_connections}" \
    "${stage_value}" \
    "${hot_rps}" \
    "${HOT_DATA_FILE}" \
    "${hot_file}" &
  local hot_pid=$!

  run_ghz_data_template \
    "stage-${stage_label}-cold" \
    "${cold_concurrency}" \
    "${cold_connections}" \
    "${stage_value}" \
    "${cold_rps}" \
    "${cold_template}" \
    "${cold_file}" &
  local cold_pid=$!

  local hot_status=0
  local cold_status=0

  wait "${hot_pid}" || hot_status=$?
  wait "${cold_pid}" || cold_status=$?

  if (( hot_status != 0 || cold_status != 0 )); then
    log "Stage ${stage_value} failed (hot exit=${hot_status}, cold exit=${cold_status})"
    exit 1
  fi

  log "Stage ${stage_value} completed"
}

run_contention_burst() {
  local seed
  seed="$(date -u +%s)"

  local contention_address
  printf -v contention_address '0x%040x' "${seed}"

  local contention_data
  contention_data="{\"address\":\"${contention_address}\",\"network\":\"eip155:1\"}"

  local contention_connections
  contention_connections="$(resolve_connections "${CONTENTION_CONCURRENCY}" "${CONTENTION_CONNECTIONS}")"

  log "Running lock contention burst for address ${contention_address} (concurrency=${CONTENTION_CONCURRENCY}, connections=${contention_connections}, rps=$(format_rps_label "${CONTENTION_RPS}"))"

  run_ghz_data_template \
    "contention-burst" \
    "${CONTENTION_CONCURRENCY}" \
    "${contention_connections}" \
    "${CONTENTION_DURATION_SECONDS}" \
    "${CONTENTION_RPS}" \
    "${contention_data}" \
    "contention-burst.json"
}

render_summary() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "DRY_RUN enabled, skipping summary parser"
    return 0
  fi

  log "Rendering summary"
  node "${SCRIPT_DIR}/parse-ghz-report.mjs" \
    --results-dir "${RESULTS_DIR}" \
    | tee "${RESULTS_DIR}/summary.console.txt"
}

main() {
  validate_inputs

  log "Results directory: ${RESULTS_DIR}"
  check_connectivity

  run_warmup

  local index=0
  local total_stages=0
  for _ in ${STAGES}; do
    total_stages=$((total_stages + 1))
  done

  for stage in ${STAGES}; do
    index=$((index + 1))
    run_stage "${stage}"

    if (( index < total_stages )); then
      log "Cooling down for ${COOLDOWN_SECONDS}s"
      sleep_if_needed "${COOLDOWN_SECONDS}"
    fi
  done

  run_contention_burst
  render_summary

  log "Stress test run completed"
}

main "$@"
