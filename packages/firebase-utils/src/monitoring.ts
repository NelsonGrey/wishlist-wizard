/**
 * Firebase Performance Monitoring Client Utilities
 * Tracks user-facing performance metrics and sends to Firebase
 */

export interface PerformanceMetric {
  name: string;
  value: number; // milliseconds
  timestamp: number;
  attributes?: Record<string, string>;
}

/**
 * Client-side Performance Monitoring
 * Usage:
 * const perf = new ClientPerformanceMonitor();
 * perf.startMeasure('wishlist_load');
 * // Do work
 * perf.stopMeasure('wishlist_load', { wishlistId: '123' });
 */
export class ClientPerformanceMonitor {
  private measures: Map<string, number> = new Map();
  private metrics: PerformanceMetric[] = [];

  /**
   * Start measuring a performance operation
   */
  startMeasure(operationName: string): void {
    this.measures.set(operationName, performance.now());
  }

  /**
   * Stop measuring and record the metric
   */
  stopMeasure(
    operationName: string,
    attributes?: Record<string, string>
  ): number | null {
    const startTime = this.measures.get(operationName);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationName}`);
      return null;
    }

    const duration = performance.now() - startTime;
    
    const metric: PerformanceMetric = {
      name: operationName,
      value: duration,
      timestamp: Date.now(),
      attributes
    };

    this.metrics.push(metric);
    this.measures.delete(operationName);

    // Log significant latencies (> 500ms for BR-013 SLO)
    if (duration > 500) {
      console.warn(`🐌 Slow operation: ${operationName} took ${duration.toFixed(2)}ms`, attributes);
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operationName: string): number | null {
    const matching = this.metrics.filter(m => m.name === operationName);
    if (matching.length === 0) return null;

    const sum = matching.reduce((acc, m) => acc + m.value, 0);
    return sum / matching.length;
  }

  /**
   * Send metrics to Firebase Analytics
   */
  async sendMetricsToFirebase(analytics: any): Promise<void> {
    for (const metric of this.metrics) {
      try {
        // This would integrate with Firebase Analytics SDK
        // analytics.logEvent(`perf_${metric.name}`, {
        //   value: metric.value,
        //   ...metric.attributes
        // });
        console.log(`📊 Performance metric: ${metric.name} = ${metric.value.toFixed(2)}ms`);
      } catch (error) {
        console.error(`Failed to send metric ${metric.name}:`, error);
      }
    }
  }
}

/**
 * Client-side Error Reporting
 * Tracks JavaScript errors and sends to Firebase Crashlytics
 */
export class ClientErrorReporter {
  private errors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
    context?: Record<string, unknown>;
  }> = [];

  constructor() {
    // Set up global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error, 'uncaught_error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Set up unhandled rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, 'unhandled_rejection');
    });
  }

  /**
   * Capture an error
   */
  captureError(
    error: unknown,
    context: string,
    additionalData?: Record<string, unknown>
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    this.errors.push({
      message: errorObj.message,
      stack: errorObj.stack,
      timestamp: Date.now(),
      context: { context, ...additionalData }
    });

    console.error(`🔴 Error [${context}]:`, errorObj, additionalData);

    // Keep only recent errors (last 50)
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
  }

  /**
   * Get all captured errors
   */
  getErrors(): Array<any> {
    return [...this.errors];
  }

  /**
   * Send errors to Crashlytics
   */
  async sendToCrashlytics(crashlytics: any): Promise<void> {
    for (const error of this.errors) {
      try {
        // This would integrate with Firebase Crashlytics SDK
        // crashlytics.recordError(new Error(error.message));
        console.log(`📤 Sending error to Crashlytics: ${error.message}`);
      } catch (err) {
        console.error('Failed to send error to Crashlytics:', err);
      }
    }
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.errors = [];
  }
}

/**
 * Web Vitals tracking for Core Web Vitals (LCP, FID, CLS)
 * https://web.dev/vitals/
 */
export class WebVitalsTracker {
  private vitals: Record<string, number> = {};

  /**
   * Track Largest Contentful Paint (LCP)
   */
  trackLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).startTime > (this.vitals['lcp'] || 0)) {
            this.vitals['lcp'] = (entry as any).startTime;
          }
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('Could not track LCP:', error);
    }
  }

  /**
   * Track First Input Delay (FID) / Interaction to Next Paint (INP)
   */
  trackInputDelay(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const delay = (entry as any).processingStart - (entry as any).startTime;
          if (!this.vitals['fid'] || delay > this.vitals['fid']) {
            this.vitals['fid'] = delay;
          }
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('Could not track FID:', error);
    }
  }

  /**
   * Track Cumulative Layout Shift (CLS)
   */
  trackCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.vitals['cls'] = clsValue;
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Could not track CLS:', error);
    }
  }

  /**
   * Get all tracked Web Vitals
   */
  getVitals(): Record<string, number> {
    return { ...this.vitals };
  }

  /**
   * Report Web Vitals to analytics
   */
  async reportToAnalytics(analytics: any): Promise<void> {
    const vitals = this.getVitals();
    
    for (const [metric, value] of Object.entries(vitals)) {
      try {
        // This would integrate with Firebase Analytics
        // analytics.logEvent(`web_vital_${metric}`, { value });
        console.log(`📊 Web Vital: ${metric} = ${value.toFixed(2)}ms`);
      } catch (error) {
        console.error(`Failed to report ${metric}:`, error);
      }
    }
  }
}

/**
 * Initialize all client-side monitoring
 */
export function initializeClientMonitoring(): {
  performanceMonitor: ClientPerformanceMonitor;
  errorReporter: ClientErrorReporter;
  webVitals: WebVitalsTracker;
} {
  const performanceMonitor = new ClientPerformanceMonitor();
  const errorReporter = new ClientErrorReporter();
  const webVitals = new WebVitalsTracker();

  // Start tracking Web Vitals
  webVitals.trackLCP();
  webVitals.trackInputDelay();
  webVitals.trackCLS();

  return {
    performanceMonitor,
    errorReporter,
    webVitals
  };
}
