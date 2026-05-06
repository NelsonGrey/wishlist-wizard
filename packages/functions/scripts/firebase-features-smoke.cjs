const { verifyAppCheckToken, requireAppCheck } = require('../lib/utils/app-check.js');
const { CustomTrace, PerformanceTracker, LatencyTracker } = require('../lib/utils/performance-monitoring.js');
const { ErrorReporter, ExceptionHandler } = require('../lib/utils/error-reporting.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

function assertGreaterThan(actual, threshold, message) {
  if (actual <= threshold) {
    throw new Error(`Assertion failed: ${message}. Expected > ${threshold}, got ${actual}`);
  }
}

async function runAppCheckSmoke() {
  console.log('\n[firebase-smoke] App Check tests');
  let passed = 0;
  let failed = 0;

  try {
    const mockRequest = { rawRequest: { headers: {} } };
    const result = await verifyAppCheckToken(mockRequest);
    assertEquals(result, false, 'verifyAppCheckToken should return false when token is missing');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] App Check test 1 failed', error);
    failed += 1;
  }

  try {
    const mockRequest = { rawRequest: { headers: { 'x-firebase-appcheck': 'invalid-token' } } };
    const result = await verifyAppCheckToken(mockRequest);
    assertEquals(result, false, 'verifyAppCheckToken should return false for invalid token');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] App Check test 2 failed', error);
    failed += 1;
  }

  const previousEmulatorEnv = process.env.FUNCTIONS_EMULATOR;
  try {
    process.env.FUNCTIONS_EMULATOR = 'true';
    const mockRequest = { rawRequest: { headers: {} } };
    const result = await requireAppCheck(mockRequest);
    assertEquals(result, true, 'requireAppCheck should allow requests in emulator mode');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] App Check test 3 failed', error);
    failed += 1;
  } finally {
    if (previousEmulatorEnv === undefined) {
      delete process.env.FUNCTIONS_EMULATOR;
    } else {
      process.env.FUNCTIONS_EMULATOR = previousEmulatorEnv;
    }
  }

  console.log(`[firebase-smoke] App Check: ${passed}/${passed + failed} passed`);
  return { passed, failed };
}

async function runPerformanceMonitoringSmoke() {
  console.log('\n[firebase-smoke] Performance Monitoring tests');
  let passed = 0;
  let failed = 0;

  try {
    const trace = new CustomTrace('test_operation');
    await trace.executeAsync(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const duration = trace.getDurationMs();
    assertGreaterThan(duration, 90, 'CustomTrace duration should be >= 100ms');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Performance test 1 failed', error);
    failed += 1;
  }

  try {
    const trace = new CustomTrace('test_operation');
    trace.putAttribute('wishlist_id', '123');
    trace.putAttribute('user_id', 'user456');

    const attrs = trace.getAttributes();
    assertEquals(attrs.wishlist_id, '123', 'wishlist_id attribute should be set');
    assertEquals(attrs.user_id, 'user456', 'user_id attribute should be set');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Performance test 2 failed', error);
    failed += 1;
  }

  try {
    const trace = new CustomTrace('test_operation');
    trace.incrementMetric('documents_processed', 5);
    trace.incrementMetric('documents_processed', 3);

    const metrics = trace.getMetrics();
    assertEquals(metrics.documents_processed, 8, 'documents_processed metric should be incremented');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Performance test 3 failed', error);
    failed += 1;
  }

  try {
    const perf = new PerformanceTracker('item_add_flow');

    perf.mark('start_extraction');
    await new Promise((resolve) => setTimeout(resolve, 50));
    perf.mark('end_extraction');

    perf.mark('start_write');
    await new Promise((resolve) => setTimeout(resolve, 75));
    perf.mark('end_write');

    const extractDuration = perf.getDuration('start_extraction', 'end_extraction');
    assertGreaterThan(extractDuration, 40, 'Extraction segment should be >= 50ms');

    const writeDuration = perf.getDuration('start_write', 'end_write');
    assertGreaterThan(writeDuration, 70, 'Write segment should be >= 75ms');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Performance test 4 failed', error);
    failed += 1;
  }

  try {
    const tracker = new LatencyTracker();

    for (let i = 1; i <= 100; i += 1) {
      tracker.record(i * 10);
    }

    const p95 = tracker.getP95();
    const p99 = tracker.getP99();
    const avg = tracker.getAverage();

    assert(p95 > 0, 'P95 should be positive');
    assert(p99 >= p95, 'P99 should be greater than or equal to P95');
    assert(avg > 0, 'Average should be positive');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Performance test 5 failed', error);
    failed += 1;
  }

  console.log(`[firebase-smoke] Performance Monitoring: ${passed}/${passed + failed} passed`);
  return { passed, failed };
}

async function runErrorReportingSmoke() {
  console.log('\n[firebase-smoke] Error Reporting tests');
  let passed = 0;
  let failed = 0;

  try {
    ErrorReporter.resetMetrics();

    const error1 = new Error('Test error 1');
    const error2 = new Error('Test error 2');

    ErrorReporter.captureError(error1, 'operation_a');
    ErrorReporter.captureError(error2, 'operation_a');
    ErrorReporter.captureError(error1, 'operation_b');

    const countA = ErrorReporter.getErrorCount('operation_a');
    const countB = ErrorReporter.getErrorCount('operation_b');

    assertEquals(countA, 2, 'operation_a error count should be 2');
    assertEquals(countB, 1, 'operation_b error count should be 1');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Error Reporting test 1 failed', error);
    failed += 1;
  }

  try {
    const error = new Error('Test error');
    const formatted = ExceptionHandler.formatException(error);

    assertEquals(formatted.name, 'Error', 'Error name should be Error');
    assert(formatted.message.length > 0, 'Error message should be present');
    assert(formatted.stack && formatted.stack.length > 0, 'Stack trace should be present');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Error Reporting test 2 failed', error);
    failed += 1;
  }

  try {
    const networkError = new Error('ECONNREFUSED: Connection refused');
    const timeoutError = new Error('ETIMEDOUT: Connection timeout');
    const otherError = new Error('Some other error');

    assert(ExceptionHandler.isRetryable(networkError), 'ECONNREFUSED should be retryable');
    assert(ExceptionHandler.isRetryable(timeoutError), 'ETIMEDOUT should be retryable');
    assert(!ExceptionHandler.isRetryable(otherError), 'Non-network errors should not be retryable');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Error Reporting test 3 failed', error);
    failed += 1;
  }

  try {
    const delay0 = ExceptionHandler.getRetryDelay(0, 100);
    const delay1 = ExceptionHandler.getRetryDelay(1, 100);
    const delay2 = ExceptionHandler.getRetryDelay(2, 100);

    assertGreaterThan(delay0, -1, 'Delay for attempt 0 should be >= 0');
    assertGreaterThan(delay1, 50, 'Delay for attempt 1 should be > 50ms');
    assertGreaterThan(delay2, 250, 'Delay for attempt 2 should be > 250ms');
    passed += 1;
  } catch (error) {
    console.error('[firebase-smoke] Error Reporting test 4 failed', error);
    failed += 1;
  }

  console.log(`[firebase-smoke] Error Reporting: ${passed}/${passed + failed} passed`);
  return { passed, failed };
}

async function runAllFirebaseSmokeTests() {
  console.log('\n[firebase-smoke] Firebase Feature Smoke Suite');

  const started = Date.now();
  const appCheck = await runAppCheckSmoke();
  const performance = await runPerformanceMonitoringSmoke();
  const errorReporting = await runErrorReportingSmoke();

  const totalPassed = appCheck.passed + performance.passed + errorReporting.passed;
  const totalFailed = appCheck.failed + performance.failed + errorReporting.failed;

  console.log('\n[firebase-smoke] Summary');
  console.log(`[firebase-smoke] Total: ${totalPassed + totalFailed}`);
  console.log(`[firebase-smoke] Passed: ${totalPassed}`);
  console.log(`[firebase-smoke] Failed: ${totalFailed}`);
  console.log(`[firebase-smoke] DurationMs: ${Date.now() - started}`);

  return {
    success: totalFailed === 0,
    totalPassed,
    totalFailed,
  };
}

if (require.main === module) {
  runAllFirebaseSmokeTests()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('[firebase-smoke] Fatal error', error);
      process.exit(1);
    });
}

module.exports = {
  runAllFirebaseSmokeTests,
};
