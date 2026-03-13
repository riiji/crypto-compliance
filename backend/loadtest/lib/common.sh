#!/usr/bin/env bash

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    log "Missing required command: ${cmd}"
    exit 1
  fi
}

run_cmd() {
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    printf '[DRY_RUN] '
    printf '%q ' "$@"
    printf '\n'
    return 0
  fi

  "$@"
}

format_rps_label() {
  local rps="${1:-0}"
  if [[ -z "${rps}" || "${rps}" == "0" ]]; then
    printf 'unlimited'
    return 0
  fi

  printf '%s' "${rps}"
}

resolve_connections() {
  local concurrency="$1"
  local override="${2:-}"
  local max_connections="${MAX_CONNECTIONS_PER_STREAM:-}"

  if [[ -n "${override}" ]]; then
    printf '%s' "${override}"
    return 0
  fi

  if [[ -z "${max_connections}" ]]; then
    printf '%s' "${concurrency}"
    return 0
  fi

  if (( max_connections <= 0 || concurrency <= max_connections )); then
    printf '%s' "${concurrency}"
    return 0
  fi

  printf '%s' "${max_connections}"
}
