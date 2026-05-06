import { logger } from 'firebase-functions/v2';

/**
 * Custom trace wrapper for Firebase Performance Monitoring
 * 
 * Usage:
 * const trace = new CustomTrace('add_item_operation');
 * await trace.executeAsync(async () => {
 *   // Your code here
 * });
 */
export class CustomTrace {
  private startTime: number = 0;
  private endTime: number = 0;
  private attributes: Map<string, string> = new Map();
  private metrics: Map<string, number> = new Map();

  constructor(private traceName: string) {}

  /**
   * Add a custom attribute to the trace
   */
  putAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  /**
   * Get all attributes
   */
  getAttributes(): Record<string, string> {
    const result: Record<string, string> = {};
    this.attributes.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Increment a metric counter
   */
  incrementMetric(name: string, value: number = 1): void {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);
  }

  /**
   * Get all metrics
   */
  getMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Start the trace
   */
  start(): void {
    this.startTime = Date.now();
    logger.info(`Trace started: ${this.traceName}`);
  }

  /**
   * Stop the trace and log duration
   */
  stop(): void {
    this.endTime = Date.now();
    const duration = this.endTime - this.startTime;
    logger.info(`Trace completed: ${this.traceName}`, {
      duration_ms: duration,
      attributes: this.getAttributes(),
      metrics: this.getMetrics()
    });
  }

  /**
   * Execute a synchronous function and automatically time it
   */
  executeSync<T>(fn: () => T): T {
    this.start();
    try {
      const result = fn();
      return result;
    } finally {
      this.stop();
    }
  }

  /**
   * Execute an async function and automatically time it
   */
  async executeAsync<T>(fn: () => Promise<T>): Promise<T> {
    this.start();
    try {
      const result = await fn();
      return result;
    } finally {
      this.stop();
    }
  }

  /**
   * Get the duration in milliseconds
   */
  getDurationMs(): number {
    return this.endTime - this.startTime;
  }
}

/**
 * Track key Flow Performance metrics
 * 
 * Usage:
 * const perf = new PerformanceTracker('add_wishlist_item');
 * perf.mark('extract_url');
 * // Extract URL
 * perf.mark('firestore_write');
 * // Write to Firestore
 * perf.report();
 */
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();
  private startTime: number;

  constructor(private operationName: string) {
    this.startTime = Date.now();
    this.marks.set('start', this.startTime);
  }

  /**
   * Mark a point in time
   */
  mark(label: string): void {
    this.marks.set(label, Date.now());
  }

  /**
   * Get duration between two marks
   */
  getDuration(startLabel: string, endLabel: string): number {
    const start = this.marks.get(startLabel);
    const end = this.marks.get(endLabel);
    
    if (!start || !end) {
      return -1;
    }
    
    return end - start;
  }

  /**
   * Report performance metrics
   */
  report(): Record<string, number> {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    const segments: Record<string, number> = {};
    
    const labels = Array.from(this.marks.keys()).sort();
    for (let i = 0; i < labels.length - 1; i++) {
      const current = labels[i];
      const next = labels[i + 1];
      const duration = this.getDuration(current, next);
      segments[`${current}_to_${next}`] = duration;
    }

    logger.info(`Performance Report: ${this.operationName}`, {
      total_duration_ms: totalDuration,
      segments,
      marks: Array.from(this.marks.entries()).map(([k, v]) => ({ [k]: v }))
    });

    return {
      totalDuration,
      ...segments
    };
  }
}

/**
 * Helper to measure P95 latency for SLO tracking
 */
export class LatencyTracker {
  private latencies: number[] = [];
  private readonly bucketSize = 1000; // Track last 1000 measurements

  /**
   * Record a latency measurement
   */
  record(latencyMs: number): void {
    this.latencies.push(latencyMs);
    
    // Keep only recent measurements
    if (this.latencies.length > this.bucketSize) {
      this.latencies = this.latencies.slice(-this.bucketSize);
    }
  }

  /**
   * Calculate P95 percentile
   */
  getP95(): number {
    if (this.latencies.length === 0) return 0;
    
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index];
  }

  /**
   * Calculate P99 percentile
   */
  getP99(): number {
    if (this.latencies.length === 0) return 0;
    
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.99) - 1;
    return sorted[index];
  }

  /**
   * Get average latency
   */
  getAverage(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  /**
   * Get median latency
   */
  getMedian(): number {
    if (this.latencies.length === 0) return 0;
    
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Report all metrics
   */
  report(): Record<string, number> {
    return {
      count: this.latencies.length,
      average_ms: this.getAverage(),
      median_ms: this.getMedian(),
      p95_ms: this.getP95(),
      p99_ms: this.getP99()
    };
  }
}
