#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    resultsDir: path.resolve(process.cwd(), 'loadtest/results/latest'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const next = argv[i + 1];
    switch (token) {
      case '--results-dir':
        if (next) {
          args.resultsDir = path.resolve(process.cwd(), next);
          i += 1;
        }
        break;
      default:
        break;
    }
  }

  return args;
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseDurationMs(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // ghz tends to serialize duration as nanoseconds when numeric.
    return value / 1_000_000;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed) / 1_000_000;
  }

  const unitMs = {
    ns: 1 / 1_000_000,
    us: 1 / 1_000,
    'µs': 1 / 1_000,
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
  };

  let total = 0;
  let matchedAny = false;
  const regex = /(-?\d+(?:\.\d+)?)(ns|us|µs|ms|s|m|h)/g;
  let match;
  while ((match = regex.exec(trimmed)) !== null) {
    matchedAny = true;
    const amount = Number(match[1]);
    const unit = match[2];
    total += amount * unitMs[unit];
  }

  if (matchedAny) {
    return total;
  }

  return null;
}

function pickPercentile(report, percentile) {
  const distribution = Array.isArray(report.latencyDistribution)
    ? report.latencyDistribution
    : [];

  if (distribution.length === 0) {
    return null;
  }

  const normalized = distribution
    .map((item) => ({
      percentage: toNumber(item.percentage, Number.NaN),
      latencyMs: parseDurationMs(item.latency),
    }))
    .filter(
      (item) => Number.isFinite(item.percentage) && item.latencyMs !== null,
    )
    .sort((a, b) => a.percentage - b.percentage);

  if (normalized.length === 0) {
    return null;
  }

  const exact = normalized.find((item) => item.percentage === percentile);
  if (exact) {
    return exact.latencyMs;
  }

  const closestAbove = normalized.find((item) => item.percentage > percentile);
  if (closestAbove) {
    return closestAbove.latencyMs;
  }

  return normalized[normalized.length - 1].latencyMs;
}

function extractErrorMap(report) {
  const map = new Map();

  const add = (message, count) => {
    const key = String(message || 'unknown_error').trim() || 'unknown_error';
    const value = toNumber(count, 1);
    map.set(key, (map.get(key) ?? 0) + value);
  };

  if (Array.isArray(report.errorDistribution)) {
    for (const item of report.errorDistribution) {
      add(item.error ?? item.message ?? item.code ?? 'unknown_error', item.count);
    }
  }

  if (
    map.size === 0 &&
    report.errorDistribution &&
    typeof report.errorDistribution === 'object' &&
    !Array.isArray(report.errorDistribution)
  ) {
    for (const [message, count] of Object.entries(report.errorDistribution)) {
      add(message, count);
    }
  }

  if (
    map.size === 0 &&
    report.statusCodeDistribution &&
    typeof report.statusCodeDistribution === 'object' &&
    !Array.isArray(report.statusCodeDistribution)
  ) {
    for (const [statusCode, count] of Object.entries(report.statusCodeDistribution)) {
      if (statusCode === 'OK') {
        continue;
      }
      add(`grpc status: ${statusCode}`, count);
    }
  }

  if (map.size === 0 && Array.isArray(report.details)) {
    for (const detail of report.details) {
      if (!detail) {
        continue;
      }
      if (detail.error) {
        add(detail.error, 1);
      }
    }
  }

  return map;
}

async function readRunConfig(resultsDir) {
  const runConfigPath = path.join(resultsDir, 'run-config.env');

  try {
    const raw = await fs.readFile(runConfigPath, 'utf8');
    const config = {};

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, delimiterIndex).trim();
      const value = trimmed.slice(delimiterIndex + 1).trim();
      if (key) {
        config[key] = value;
      }
    }

    return config;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function describeRps(value) {
  const numericValue = toNumber(value, 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 'unlimited';
  }
  return `${numericValue} RPS`;
}

function describeLoadMode(runConfig) {
  if (!runConfig) {
    return 'client RPS mode unknown';
  }

  const warmupRps = toNumber(runConfig.WARMUP_RPS, 0);
  const stageTotalRps = toNumber(runConfig.STAGE_TOTAL_RPS, 0);
  const contentionRps = toNumber(runConfig.CONTENTION_RPS, 0);

  if (warmupRps <= 0 && stageTotalRps <= 0 && contentionRps <= 0) {
    return 'unlimited client RPS (no --rps cap)';
  }

  return `capped client RPS (warmup=${describeRps(runConfig.WARMUP_RPS)}, stage total=${describeRps(runConfig.STAGE_TOTAL_RPS)}, contention=${describeRps(runConfig.CONTENTION_RPS)})`;
}

function mergeErrorMaps(target, source) {
  for (const [key, value] of source.entries()) {
    target.set(key, (target.get(key) ?? 0) + value);
  }
}

function topErrors(errorMap, limit = 3) {
  return [...errorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([message, count]) => `${message} (${count})`);
}

function formatMs(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  if (value < 1) {
    return `${value.toFixed(3)}ms`;
  }
  if (value < 1000) {
    return `${value.toFixed(1)}ms`;
  }
  return `${(value / 1000).toFixed(2)}s`;
}

function formatPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return `${value.toFixed(2)}%`;
}

function formatRps(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(2);
}

async function parseReport(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const report = JSON.parse(raw);

  const count = toNumber(report.count, 0);
  const totalMs = parseDurationMs(report.total ?? report.duration);

  let achievedRps = null;
  if (typeof report.rps === 'number' && Number.isFinite(report.rps)) {
    achievedRps = report.rps;
  } else if (count > 0 && totalMs && totalMs > 0) {
    achievedRps = (count * 1000) / totalMs;
  }

  const p50Ms = pickPercentile(report, 50);
  const p95Ms = pickPercentile(report, 95);
  const p99Ms = pickPercentile(report, 99);

  const errorMap = extractErrorMap(report);
  let errorCount = 0;
  for (const countValue of errorMap.values()) {
    errorCount += countValue;
  }

  const errorRatePct = count > 0 ? (errorCount * 100) / count : 0;

  return {
    count,
    achievedRps,
    p50Ms,
    p95Ms,
    p99Ms,
    errorCount,
    errorRatePct,
    errorMap,
  };
}

function aggregateConcurrent(reports) {
  const errorMap = new Map();

  let totalCount = 0;
  let achievedRps = 0;
  let errorCount = 0;

  let p50Ms = null;
  let p95Ms = null;
  let p99Ms = null;

  for (const report of reports) {
    totalCount += report.count;
    achievedRps += report.achievedRps ?? 0;
    errorCount += report.errorCount ?? 0;
    mergeErrorMaps(errorMap, report.errorMap);

    if (report.p50Ms !== null) {
      p50Ms = p50Ms === null ? report.p50Ms : Math.max(p50Ms, report.p50Ms);
    }
    if (report.p95Ms !== null) {
      p95Ms = p95Ms === null ? report.p95Ms : Math.max(p95Ms, report.p95Ms);
    }
    if (report.p99Ms !== null) {
      p99Ms = p99Ms === null ? report.p99Ms : Math.max(p99Ms, report.p99Ms);
    }
  }

  const errorRatePct = totalCount > 0 ? (errorCount * 100) / totalCount : 0;

  return {
    achievedRps,
    errorRatePct,
    p50Ms,
    p95Ms,
    p99Ms,
    errorMap,
  };
}

function stageNumberFromFile(fileName) {
  const match = /^stage-(\d+)-(hot|cold)\.json$/.exec(fileName);
  if (!match) {
    return null;
  }

  return {
    stageDurationSeconds: Number(match[1]),
    stream: match[2],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const entries = await fs.readdir(args.resultsDir, { withFileTypes: true });
  const runConfig = await readRunConfig(args.resultsDir);

  const stageFiles = new Map();
  let warmupFile = null;
  let contentionFile = null;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const fileName = entry.name;
    if (!fileName.endsWith('.json')) {
      continue;
    }

    if (fileName === 'warmup-hot.json') {
      warmupFile = path.join(args.resultsDir, fileName);
      continue;
    }

    if (fileName === 'contention-burst.json') {
      contentionFile = path.join(args.resultsDir, fileName);
      continue;
    }

    const stageInfo = stageNumberFromFile(fileName);
    if (!stageInfo) {
      continue;
    }

    const record = stageFiles.get(stageInfo.stageDurationSeconds) ?? {};
    record[stageInfo.stream] = path.join(args.resultsDir, fileName);
    stageFiles.set(stageInfo.stageDurationSeconds, record);
  }

  const stageDurations = [...stageFiles.keys()].sort((a, b) => a - b);

  const stages = [];
  const skippedStages = [];

  for (const stageDurationSeconds of stageDurations) {
    const files = stageFiles.get(stageDurationSeconds);
    if (!files?.hot || !files?.cold) {
      const missing = [];
      if (!files?.hot) {
        missing.push('hot');
      }
      if (!files?.cold) {
        missing.push('cold');
      }

      skippedStages.push({
        stageDurationSeconds,
        missing,
      });
      continue;
    }

    const hot = await parseReport(files.hot);
    const cold = await parseReport(files.cold);
    const aggregate = aggregateConcurrent([hot, cold]);

    stages.push({
      stageDurationSeconds,
      aggregate,
      topErrors: topErrors(aggregate.errorMap),
    });
  }

  const peakStage = stages.reduce((best, current) => {
    if (!best) {
      return current;
    }

    const currentRps = current.aggregate.achievedRps ?? 0;
    const bestRps = best.aggregate.achievedRps ?? 0;
    return currentRps > bestRps ? current : best;
  }, null);

  const warmup = warmupFile ? await parseReport(warmupFile) : null;
  const contention = contentionFile ? await parseReport(contentionFile) : null;

  if (stages.length === 0 && skippedStages.length === 0 && !warmup && !contention) {
    throw new Error(`No parsable load-test reports found in ${args.resultsDir}`);
  }

  const lines = [];
  lines.push('# CheckAddressCompliance gRPC Stress Test Summary');
  lines.push('');
  lines.push(`- Results directory: \`${args.resultsDir}\``);
  lines.push(`- Mode: ${describeLoadMode(runConfig)}; stage values represent duration in seconds`);
  lines.push(`- Peak achieved throughput: ${peakStage ? `${formatRps(peakStage.aggregate.achievedRps)} RPS at ${peakStage.stageDurationSeconds}s stage` : 'N/A'}`);
  if (skippedStages.length > 0) {
    lines.push(
      `- Incomplete stages skipped: ${skippedStages
        .map((stage) => `${stage.stageDurationSeconds} (missing ${stage.missing.join('+')})`)
        .join(', ')}`,
    );
  }
  lines.push('');
  if (stages.length > 0) {
    lines.push('| Stage duration (s) | Achieved RPS | p50 | p95 | p99 | Error % | Top errors |');
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: | --- |');

    for (const stage of stages) {
      lines.push(
        `| ${stage.stageDurationSeconds} | ${formatRps(stage.aggregate.achievedRps)} | ${formatMs(stage.aggregate.p50Ms)} | ${formatMs(stage.aggregate.p95Ms)} | ${formatMs(stage.aggregate.p99Ms)} | ${formatPct(stage.aggregate.errorRatePct)} | ${stage.topErrors.length ? stage.topErrors.join('; ') : '-'} |`,
      );
    }
  } else {
    lines.push('No complete hot+cold stage pairs found in this run.');
  }

  lines.push('');
  if (warmup) {
    lines.push('## Warm-up');
    lines.push('');
    lines.push(`- Requests: ${warmup.count}`);
    lines.push(`- Achieved RPS: ${formatRps(warmup.achievedRps)}`);
    lines.push(`- Error rate: ${formatPct(warmup.errorRatePct)}`);
    lines.push('');
  }

  if (contention) {
    lines.push('## Lock Contention Burst');
    lines.push('');
    lines.push(`- Requests: ${contention.count}`);
    lines.push(`- Achieved RPS: ${formatRps(contention.achievedRps)}`);
    lines.push(`- p95: ${formatMs(contention.p95Ms)}`);
    lines.push(`- Error rate: ${formatPct(contention.errorRatePct)}`);
    const contentionErrors = topErrors(contention.errorMap, 5);
    lines.push(`- Top errors: ${contentionErrors.length ? contentionErrors.join('; ') : '-'}`);
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  lines.push('- Stage percentiles are conservative (`max(hot, cold)`) because hot and cold streams are measured in separate concurrent ghz runs.');
  if (skippedStages.length > 0) {
    lines.push('- Incomplete stage files were skipped from aggregated stage metrics.');
  }

  const summaryPath = path.join(args.resultsDir, 'summary.md');
  const summaryJsonPath = path.join(args.resultsDir, 'summary.json');

  const serializable = {
    resultsDir: args.resultsDir,
    stageUnit: 'seconds',
    peakStage: peakStage
      ? {
          stageDurationSeconds: peakStage.stageDurationSeconds,
          achievedRps: peakStage.aggregate.achievedRps,
        }
      : null,
    mode: describeLoadMode(runConfig),
    runConfig: runConfig
      ? {
          target: runConfig.TARGET ?? null,
          totalConcurrency: toNumber(
            runConfig.TOTAL_CONCURRENCY ?? runConfig.UNLIMITED_TOTAL_CONCURRENCY,
            0,
          ),
          warmupRps: toNumber(runConfig.WARMUP_RPS, 0),
          stageTotalRps: toNumber(runConfig.STAGE_TOTAL_RPS, 0),
          contentionRps: toNumber(runConfig.CONTENTION_RPS, 0),
          maxConnectionsPerStream: toNumber(runConfig.MAX_CONNECTIONS_PER_STREAM, 0),
        }
      : null,
    skippedStages,
    stages: stages.map((stage) => ({
      stageDurationSeconds: stage.stageDurationSeconds,
      achievedRps: stage.aggregate.achievedRps,
      p50Ms: stage.aggregate.p50Ms,
      p95Ms: stage.aggregate.p95Ms,
      p99Ms: stage.aggregate.p99Ms,
      errorCount: [...stage.aggregate.errorMap.values()].reduce(
        (sum, value) => sum + value,
        0,
      ),
      errorRatePct: stage.aggregate.errorRatePct,
      topErrors: stage.topErrors,
    })),
    warmup: warmup
      ? {
          count: warmup.count,
          achievedRps: warmup.achievedRps,
          errorCount: warmup.errorCount,
          errorRatePct: warmup.errorRatePct,
        }
      : null,
    contention: contention
      ? {
          count: contention.count,
          achievedRps: contention.achievedRps,
          p95Ms: contention.p95Ms,
          errorCount: contention.errorCount,
          errorRatePct: contention.errorRatePct,
          topErrors: topErrors(contention.errorMap, 5),
        }
      : null,
  };

  await fs.writeFile(summaryPath, `${lines.join('\n')}\n`, 'utf8');
  await fs.writeFile(summaryJsonPath, `${JSON.stringify(serializable, null, 2)}\n`, 'utf8');

  process.stdout.write(`${lines.join('\n')}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to parse ghz reports: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
