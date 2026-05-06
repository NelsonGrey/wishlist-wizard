import fs from 'node:fs';
import path from 'node:path';

const USERS_REPORT_PATH = process.env.USERS_SMOKE_REPORT_PATH || 'artifacts/smoke-users-report.json';
const FUNCTIONS_REPORT_PATH = process.env.FUNCTIONS_SMOKE_REPORT_PATH || 'artifacts/smoke-all-functions-report.json';
const BASELINE_PATH = process.env.BASELINE_METRICS_PATH || 'docs/ci-baseline-metrics.json';
const OUTPUT_PATH = process.env.BASELINE_METRICS_REPORT_PATH || 'artifacts/baseline-metrics-report.json';

function ensureDirectory(filePath) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function toNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function computeUsersMetrics(usersReport) {
  const summary = usersReport?.summary || {};
  const calls = Array.isArray(usersReport?.calls) ? usersReport.calls : [];
  const totalCalls = toNumber(summary.totalCalls, calls.length);
  const failedCalls = toNumber(summary.failedCalls, 0);
  const durationMs = toNumber(summary.durationMs, 0);
  const totalCallDurationMs = calls.reduce((acc, call) => acc + toNumber(call?.durationMs, 0), 0);
  const avgCallMs = totalCalls > 0 ? totalCallDurationMs / totalCalls : 0;

  return {
    totalCalls,
    failedCalls,
    durationMs,
    avgCallMs: Number(avgCallMs.toFixed(2))
  };
}

function computeFunctionsMetrics(functionsReport) {
  const summary = functionsReport?.summary || {};
  const total = toNumber(summary.total, 0);
  const passed = toNumber(summary.passed, 0);
  const warned = toNumber(summary.warned, 0);
  const failed = toNumber(summary.failed, 0);
  const passRate = total > 0 ? (passed / total) * 100 : 0;

  return {
    total,
    passed,
    warned,
    failed,
    passRate: Number(passRate.toFixed(2))
  };
}

function evaluate(usersMetrics, functionsMetrics, baseline) {
  const warnings = [];
  const failures = [];

  if (usersMetrics.failedCalls > 0) {
    failures.push(`usersSmoke.failedCalls > 0 (${usersMetrics.failedCalls})`);
  }

  if (functionsMetrics.failed > 0) {
    failures.push(`functionsSmoke.failed > 0 (${functionsMetrics.failed})`);
  }

  const usersDurationWarn = toNumber(baseline?.usersSmoke?.durationMs?.warnAbove, 45000);
  const usersDurationFail = toNumber(baseline?.usersSmoke?.durationMs?.failAbove, 70000);
  if (usersMetrics.durationMs > usersDurationFail) {
    failures.push(`usersSmoke.durationMs ${usersMetrics.durationMs} exceeded fail threshold ${usersDurationFail}`);
  } else if (usersMetrics.durationMs > usersDurationWarn) {
    warnings.push(`usersSmoke.durationMs ${usersMetrics.durationMs} exceeded warn threshold ${usersDurationWarn}`);
  }

  const usersAvgWarn = toNumber(baseline?.usersSmoke?.avgCallMs?.warnAbove, 1200);
  const usersAvgFail = toNumber(baseline?.usersSmoke?.avgCallMs?.failAbove, 2000);
  if (usersMetrics.avgCallMs > usersAvgFail) {
    failures.push(`usersSmoke.avgCallMs ${usersMetrics.avgCallMs} exceeded fail threshold ${usersAvgFail}`);
  } else if (usersMetrics.avgCallMs > usersAvgWarn) {
    warnings.push(`usersSmoke.avgCallMs ${usersMetrics.avgCallMs} exceeded warn threshold ${usersAvgWarn}`);
  }

  const functionsWarnWarn = toNumber(baseline?.functionsSmoke?.warned?.warnAbove, 12);
  const functionsWarnFail = toNumber(baseline?.functionsSmoke?.warned?.failAbove, 25);
  if (functionsMetrics.warned > functionsWarnFail) {
    failures.push(`functionsSmoke.warned ${functionsMetrics.warned} exceeded fail threshold ${functionsWarnFail}`);
  } else if (functionsMetrics.warned > functionsWarnWarn) {
    warnings.push(`functionsSmoke.warned ${functionsMetrics.warned} exceeded warn threshold ${functionsWarnWarn}`);
  }

  return { warnings, failures };
}

function main() {
  if (!exists(USERS_REPORT_PATH)) {
    throw new Error(`Users smoke report not found at ${USERS_REPORT_PATH}`);
  }
  if (!exists(FUNCTIONS_REPORT_PATH)) {
    throw new Error(`Functions smoke report not found at ${FUNCTIONS_REPORT_PATH}`);
  }
  if (!exists(BASELINE_PATH)) {
    throw new Error(`Baseline metrics config not found at ${BASELINE_PATH}`);
  }

  const usersReport = readJson(USERS_REPORT_PATH);
  const functionsReport = readJson(FUNCTIONS_REPORT_PATH);
  const baseline = readJson(BASELINE_PATH);

  const usersMetrics = computeUsersMetrics(usersReport);
  const functionsMetrics = computeFunctionsMetrics(functionsReport);
  const { warnings, failures } = evaluate(usersMetrics, functionsMetrics, baseline);

  const report = {
    timestamp: new Date().toISOString(),
    source: {
      usersReportPath: USERS_REPORT_PATH,
      functionsReportPath: FUNCTIONS_REPORT_PATH,
      baselinePath: BASELINE_PATH
    },
    metrics: {
      usersSmoke: usersMetrics,
      functionsSmoke: functionsMetrics
    },
    summary: {
      warnings: warnings.length,
      failures: failures.length
    },
    warnings,
    failures
  };

  ensureDirectory(OUTPUT_PATH);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  console.log('Baseline metrics summary:');
  console.log(`- Users smoke: calls=${usersMetrics.totalCalls}, failed=${usersMetrics.failedCalls}, durationMs=${usersMetrics.durationMs}, avgCallMs=${usersMetrics.avgCallMs}`);
  console.log(`- Functions smoke: total=${functionsMetrics.total}, passed=${functionsMetrics.passed}, warned=${functionsMetrics.warned}, failed=${functionsMetrics.failed}, passRate=${functionsMetrics.passRate}%`);
  console.log(`- Warnings: ${warnings.length}`);
  console.log(`- Failures: ${failures.length}`);
  console.log(`- Report: ${OUTPUT_PATH}`);

  if (warnings.length > 0) {
    console.warn('\nBaseline drift warnings:');
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error('\nBaseline drift failures:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main();
