import { performance } from 'perf_hooks';
import log from '@/lib/logging/logger';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  status: 'pending' | 'completed' | 'failed';
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

interface PerformanceThresholds {
  warning: number; // milliseconds
  critical: number; // milliseconds
}

interface PerformanceConfig {
  enableMetrics: boolean;
  enableDetailedProfiling: boolean;
  thresholds: {
    apiResponse: PerformanceThresholds;
    databaseQuery: PerformanceThresholds;
    reportGeneration: PerformanceThresholds;
    pdfExport: PerformanceThresholds;
    emailSending: PerformanceThresholds;
  };
  maxMetricsHistory: number;
  cleanupIntervalMs: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private metricHistory: PerformanceMetric[] = [];
  private config: PerformanceConfig;

  constructor() {
    this.config = {
      enableMetrics: process.env.NODE_ENV !== 'test',
      enableDetailedProfiling: process.env.ENABLE_PERFORMANCE_PROFILING === 'true',
      thresholds: {
        apiResponse: { warning: 2000, critical: 5000 }, // 2s warning, 5s critical
        databaseQuery: { warning: 500, critical: 1000 }, // 500ms warning, 1s critical
        reportGeneration: { warning: 10000, critical: 30000 }, // 10s warning, 30s critical
        pdfExport: { warning: 15000, critical: 45000 }, // 15s warning, 45s critical
        emailSending: { warning: 3000, critical: 10000 }, // 3s warning, 10s critical
      },
      maxMetricsHistory: 1000,
      cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
    };

    // Start cleanup interval
    if (this.config.enableMetrics) {
      setInterval(() => this.cleanup(), this.config.cleanupIntervalMs);
    }
  }

  /**
   * Start measuring performance for an operation
   */
  startMeasure(name: string, metadata?: Record<string, unknown>): string {
    if (!this.config.enableMetrics) return '';

    const measureId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      status: 'pending',
      metadata,
    };

    if (this.config.enableDetailedProfiling) {
      metric.memoryUsage = process.memoryUsage();
      metric.cpuUsage = process.cpuUsage();
    }

    this.metrics.set(measureId, metric);
    return measureId;
  }

  /**
   * End measuring performance for an operation
   */
  endMeasure(measureId: string, status: 'completed' | 'failed' = 'completed', metadata?: Record<string, unknown>): PerformanceMetric | null {
    if (!this.config.enableMetrics || !measureId) return null;

    const metric = this.metrics.get(measureId);
    if (!metric) return null;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.status = status;

    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }

    if (this.config.enableDetailedProfiling && metric.cpuUsage) {
      const endCpuUsage = process.cpuUsage(metric.cpuUsage);
      metric.metadata = {
        ...metric.metadata,
        cpuUsage: {
          user: endCpuUsage.user,
          system: endCpuUsage.system,
        },
        memoryDiff: {
          rss: process.memoryUsage().rss - (metric.memoryUsage?.rss || 0),
          heapUsed: process.memoryUsage().heapUsed - (metric.memoryUsage?.heapUsed || 0),
        },
      };
    }

    // Check thresholds and log warnings
    this.checkThresholds(metric);

    // Add to history and cleanup metrics map
    this.metricHistory.push({ ...metric });
    this.metrics.delete(measureId);

    // Trim history if needed
    if (this.metricHistory.length > this.config.maxMetricsHistory) {
      this.metricHistory = this.metricHistory.slice(-this.config.maxMetricsHistory);
    }

    return metric;
  }

  /**
   * Measure an async operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const measureId = this.startMeasure(name, metadata);

    try {
      const result = await operation();
      this.endMeasure(measureId, 'completed');
      return result;
    } catch (error) {
      this.endMeasure(measureId, 'failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Measure a sync operation
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const measureId = this.startMeasure(name, metadata);

    try {
      const result = operation();
      this.endMeasure(measureId, 'completed');
      return result;
    } catch (error) {
      this.endMeasure(measureId, 'failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindowMs: number = 60 * 60 * 1000): {
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    p99Duration: number;
    operationsByType: Record<string, number>;
    slowestOperations: PerformanceMetric[];
    recentErrors: PerformanceMetric[];
  } {
    const cutoffTime = Date.now() - timeWindowMs;
    const recentMetrics = this.metricHistory.filter(
      metric => (metric.endTime || metric.startTime) > cutoffTime - timeWindowMs
    );

    const completedMetrics = recentMetrics.filter(m => m.status === 'completed' && m.duration);
    const failedMetrics = recentMetrics.filter(m => m.status === 'failed');

    const durations = completedMetrics.map(m => m.duration!).sort((a, b) => a - b);

    const operationsByType = recentMetrics.reduce((acc, metric) => {
      acc[metric.name] = (acc[metric.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOperations: recentMetrics.length,
      completedOperations: completedMetrics.length,
      failedOperations: failedMetrics.length,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      medianDuration: durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0,
      p95Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
      p99Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
      operationsByType,
      slowestOperations: completedMetrics
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 10),
      recentErrors: failedMetrics.slice(-10),
    };
  }

  /**
   * Check if operation duration exceeds thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    if (!metric.duration) return;

    const operationType = this.getOperationType(metric.name);
    const threshold = this.config.thresholds[operationType as keyof typeof this.config.thresholds];

    if (!threshold) return;

    if (metric.duration >= threshold.critical) {
      log.error('Performance critical threshold exceeded', {
        operation: metric.name,
        duration: metric.duration,
        threshold: threshold.critical,
        metadata: metric.metadata,
      });
    } else if (metric.duration >= threshold.warning) {
      log.warn('Performance warning threshold exceeded', {
        operation: metric.name,
        duration: metric.duration,
        threshold: threshold.warning,
        metadata: metric.metadata,
      });
    }
  }

  /**
   * Determine operation type for threshold checking
   */
  private getOperationType(operationName: string): string {
    if (operationName.includes('api') || operationName.includes('route')) return 'apiResponse';
    if (operationName.includes('database') || operationName.includes('query') || operationName.includes('prisma')) return 'databaseQuery';
    if (operationName.includes('report') || operationName.includes('analysis')) return 'reportGeneration';
    if (operationName.includes('pdf') || operationName.includes('excel')) return 'pdfExport';
    if (operationName.includes('email') || operationName.includes('notification')) return 'emailSending';
    return 'apiResponse'; // default
  }

  /**
   * Clean up old metrics and pending operations
   */
  private cleanup(): void {
    const now = performance.now();
    const timeoutThreshold = 5 * 60 * 1000; // 5 minutes

    // Clean up pending operations that have timed out
    for (const [measureId, metric] of this.metrics.entries()) {
      if (now - metric.startTime > timeoutThreshold) {
        log.warn('Performance metric timed out', {
          operation: metric.name,
          duration: now - metric.startTime,
          metadata: metric.metadata,
        });
        this.metrics.delete(measureId);
      }
    }

    // Log performance summary periodically
    const stats = this.getStats();
    if (stats.totalOperations > 0) {
      log.info('Performance summary', {
        timeWindow: '1 hour',
        totalOps: stats.totalOperations,
        completed: stats.completedOperations,
        failed: stats.failedOperations,
        avgDuration: Math.round(stats.averageDuration),
        p95Duration: Math.round(stats.p95Duration),
        slowestOp: stats.slowestOperations[0]?.name,
        recentErrors: stats.recentErrors.length,
      });
    }
  }

  /**
   * Generate performance report
   */
  generateReport(timeWindowMs: number = 24 * 60 * 60 * 1000): string {
    const stats = this.getStats(timeWindowMs);
    const timeWindowHours = timeWindowMs / (60 * 60 * 1000);

    return `
# Performance Report (${timeWindowHours}h window)

## Summary
- **Total Operations**: ${stats.totalOperations}
- **Completed**: ${stats.completedOperations} (${((stats.completedOperations / stats.totalOperations) * 100).toFixed(1)}%)
- **Failed**: ${stats.failedOperations} (${((stats.failedOperations / stats.totalOperations) * 100).toFixed(1)}%)

## Performance Metrics
- **Average Duration**: ${Math.round(stats.averageDuration)}ms
- **Median Duration**: ${Math.round(stats.medianDuration)}ms
- **95th Percentile**: ${Math.round(stats.p95Duration)}ms
- **99th Percentile**: ${Math.round(stats.p99Duration)}ms

## Operations by Type
${Object.entries(stats.operationsByType)
  .sort(([,a], [,b]) => b - a)
  .map(([type, count]) => `- **${type}**: ${count}`)
  .join('\n')}

## Slowest Operations
${stats.slowestOperations
  .slice(0, 5)
  .map((op, i) => `${i + 1}. **${op.name}**: ${Math.round(op.duration!)}ms`)
  .join('\n')}

## Recent Errors
${stats.recentErrors.length > 0
  ? stats.recentErrors
      .slice(0, 5)
      .map(err => `- **${err.name}**: ${err.metadata?.error || 'Unknown error'}`)
      .join('\n')
  : '- No recent errors'}
    `.trim();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(operationName?: string) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const name = operationName || `${(target as { constructor: { name: string } }).constructor.name}.${propertyName}`;

    descriptor.value = function (...args: unknown[]) {
      return performanceMonitor.measureSync(name, () => method.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Decorator for measuring async method performance
 */
export function measureAsyncPerformance(operationName?: string) {
  return function (target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const name = operationName || `${(target as { constructor: { name: string } }).constructor.name}.${propertyName}`;

    descriptor.value = function (...args: unknown[]) {
      return performanceMonitor.measureAsync(name, () => method.apply(this, args));
    };

    return descriptor;
  };
}

export default performanceMonitor;