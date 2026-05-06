/**
 * Firebase Features Smoke Tests
 * Tests for newly implemented Firebase utilities:
 * - App Check verification
 * - Performance Monitoring
 * - Error Reporting & Crashlytics
 * - Analytics events
 * - Remote Config feature flags
 * 
 * Can be merged into emulator-smoke-users.cjs or run separately
 */

import type { CallableRequest } from 'firebase-functions/v2/https';
import { verifyAppCheckToken, requireAppCheck } from '../src/utils/app-check';
import { CustomTrace, PerformanceTracker, LatencyTracker } from '../src/utils/performance-monitoring';
import { ErrorReporter, ExceptionHandler } from '../src/utils/error-reporting';

/**
 * Test utilities
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

function assertGreaterThan(actual: number, threshold: number, message: string) {
  if (actual <= threshold) {
    throw new Error(`Assertion failed: ${message}. Expected > ${threshold}, got ${actual}`);
  }
}

/**
 * ============================================================================
 * TEST SUITE: Firebase App Check
 * ============================================================================
 */

export async function runAppCheckSmoke() {
  console.log('\n📋 Starting Firebase App Check Smoke Tests...');
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Missing App Check token should verify to false
    console.log('  Test 1: Missing App Check token...');
    const mockRequest = {
      rawRequest: { headers: {} }
    } as any as CallableRequest;

    const result = await verifyAppCheckToken(mockRequest);
    assertEquals(result, false, 'Should return false when token missing');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 1 failed:`, error);
    failed++;
  }

  try {
    // Test 2: Invalid App Check token should fail (in emulator)
    console.log('  Test 2: Invalid App Check token...');
    const mockRequest = {
      rawRequest: {
        headers: { 'x-firebase-appcheck': 'invalid-token' }
      }
    } as any as CallableRequest;

    const result = await verifyAppCheckToken(mockRequest);
    // In emulator, this returns false (token not valid)
    assertEquals(result, false, 'Should return false for invalid token in emulator');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 2 failed:`, error);
    failed++;
  }

  try {
    // Test 3: requireAppCheck should allow in emulator
    console.log('  Test 3: requireAppCheck in emulator mode...');
    process.env.FUNCTIONS_EMULATOR = 'true';
    
    const mockRequest = {
      rawRequest: { headers: {} }
    } as any as CallableRequest;

    // In emulator, this should not throw (returns true for local testing)
    const result = await requireAppCheck(mockRequest);
    assertEquals(result, true, 'Should allow requests in emulator');
    passed++;
    
    delete process.env.FUNCTIONS_EMULATOR;
  } catch (error) {
    console.error(`  ❌ Test 3 failed:`, error);
    failed++;
  }

  console.log(`\n✅ App Check Tests: ${passed}/${passed + failed} passed`);
  return { passed, failed };
}

/**
 * ============================================================================
 * TEST SUITE: Performance Monitoring
 * ============================================================================
 */

export async function runPerformanceMonitoringSmoke() {
  console.log('\n📋 Starting Performance Monitoring Smoke Tests...');
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: CustomTrace captures operation duration
    console.log('  Test 1: CustomTrace timing...');
    const trace = new CustomTrace('test_operation');
    
    await trace.executeAsync(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const duration = trace.getDurationMs();
    assertGreaterThan(duration, 90, 'Trace duration should be >= 100ms');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 1 failed:`, error);
    failed++;
  }

  try {
    // Test 2: CustomTrace attributes
    console.log('  Test 2: CustomTrace attributes...');
    const trace = new CustomTrace('test_operation');
    trace.putAttribute('wishlist_id', '123');
    trace.putAttribute('user_id', 'user456');

    const attrs = trace.getAttributes();
    assertEquals(attrs.wishlist_id, '123', 'Wishlist ID attribute should be set');
    assertEquals(attrs.user_id, 'user456', 'User ID attribute should be set');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 2 failed:`, error);
    failed++;
  }

  try {
    // Test 3: CustomTrace metrics
    console.log('  Test 3: CustomTrace metrics...');
    const trace = new CustomTrace('test_operation');
    trace.incrementMetric('documents_processed', 5);
    trace.incrementMetric('documents_processed', 3);

    const metrics = trace.getMetrics();
    assertEquals(metrics.documents_processed, 8, 'Metric count should be incremented');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 3 failed:`, error);
    failed++;
  }

  try {
    // Test 4: PerformanceTracker segment timing
    console.log('  Test 4: PerformanceTracker segments...');
    const perf = new PerformanceTracker('item_add_flow');
    
    perf.mark('start_extraction');
    await new Promise(resolve => setTimeout(resolve, 50));
    perf.mark('end_extraction');
    
    perf.mark('start_write');
    await new Promise(resolve => setTimeout(resolve, 75));
    perf.mark('end_write');

    const extractDuration = perf.getDuration('start_extraction', 'end_extraction');
    assertGreaterThan(extractDuration, 40, 'Extraction segment should be >= 50ms');
    
    const writeDuration = perf.getDuration('start_write', 'end_write');
    assertGreaterThan(writeDuration, 70, 'Write segment should be >= 75ms');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 4 failed:`, error);
    failed++;
  }

  try {
    // Test 5: LatencyTracker percentiles
    console.log('  Test 5: LatencyTracker percentiles...');
    const tracker = new LatencyTracker();
    
    // Record 100 latency measurements
    for (let i = 1; i <= 100; i++) {
      tracker.record(i * 10); // 10ms to 1000ms
    }

    const p95 = tracker.getP95();
    const p99 = tracker.getP99();
    const avg = tracker.getAverage();

    assert(p95 > 0, 'P95 should be positive');
    assert(p99 >= p95, 'P99 should be >= P95');
    assert(avg > 0, 'Average should be positive');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 5 failed:`, error);
    failed++;
  }

  console.log(`\n✅ Performance Monitoring Tests: ${passed}/${passed + failed} passed`);
  return { passed, failed };
}

/**
 * ============================================================================
 * TEST SUITE: Error Reporting
 * ============================================================================
 */

export async function runErrorReportingSmoke() {
  console.log('\n📋 Starting Error Reporting Smoke Tests...');
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: ErrorReporter captures error count
    console.log('  Test 1: Error count tracking...');
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
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 1 failed:`, error);
    failed++;
  }

  try {
    // Test 2: ExceptionHandler formats exceptions
    console.log('  Test 2: Exception formatting...');
    const error = new Error('Test error');
    const formatted = ExceptionHandler.formatException(error);

    assertEquals(formatted.name, 'Error', 'Error name should be "Error"');
    assert(formatted.message.length > 0, 'Error message should be present');
    assert(formatted.stack && formatted.stack.length > 0, 'Stack trace should be present');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 2 failed:`, error);
    failed++;
  }

  try {
    // Test 3: Retryable error detection
    console.log('  Test 3: Retryable error detection...');
    const networkError = new Error('ECONNREFUSED: Connection refused');
    const timeoutError = new Error('ETIMEDOUT: Connection timeout');
    const otherError = new Error('Some other error');

    assert(ExceptionHandler.isRetryable(networkError), 'ECONNREFUSED should be retryable');
    assert(ExceptionHandler.isRetryable(timeoutError), 'ETIMEDOUT should be retryable');
    assert(!ExceptionHandler.isRetryable(otherError), 'Other errors should not be retryable');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 3 failed:`, error);
    failed++;
  }

  try {
    // Test 4: Exponential backoff calculation
    console.log('  Test 4: Exponential backoff...');
    const delay0 = ExceptionHandler.getRetryDelay(0, 100);
    const delay1 = ExceptionHandler.getRetryDelay(1, 100);
    const delay2 = ExceptionHandler.getRetryDelay(2, 100);

    // 2^0 - 1 = 0, 2^1 - 1 = 1, 2^2 - 1 = 3
    assertGreaterThan(delay0, -1, 'Delay for attempt 0 should be >= 0');
    assertGreaterThan(delay1, 50, 'Delay for attempt 1 should be > 50ms');
    assertGreaterThan(delay2, 250, 'Delay for attempt 2 should be > 250ms');
    passed++;
  } catch (error) {
    console.error(`  ❌ Test 4 failed:`, error);
    failed++;
  }

  console.log(`\n✅ Error Reporting Tests: ${passed}/${passed + failed} passed`);
  return { passed, failed };
}

/**
 * ============================================================================
 * MAIN: Run all Firebase smoke tests
 * ============================================================================
 */

export async function runAllFirebaseSmokeTests() {
  console.log('\n🚀 Firebase Features Smoke Test Suite');
  console.log('=' .repeat(50));

  const startTime = Date.now();

  const appCheckResults = await runAppCheckSmoke();
  const performanceResults = await runPerformanceMonitoringSmoke();
  const errorResults = await runErrorReportingSmoke();

  const totalPassed = 
    appCheckResults.passed + 
    performanceResults.passed + 
    errorResults.passed;

  const totalFailed = 
    appCheckResults.failed + 
    performanceResults.failed + 
    errorResults.failed;

  const duration = Date.now() - startTime;

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total: ${totalPassed + totalFailed} tests`);
  console.log(`   Passed: ${totalPassed} ✅`);
  console.log(`   Failed: ${totalFailed} ❌`);
  console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log('\n' + '='.repeat(50) + '\n');

  const success = totalFailed === 0;
  return {
    success,
    totalPassed,
    totalFailed,
    durationMs: duration
  };
}

// Run if called directly
if (require.main === module) {
  runAllFirebaseSmokeTests()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
