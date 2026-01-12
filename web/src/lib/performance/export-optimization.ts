/**
 * Export Performance Optimization Module
 * Phase 4C Performance Validation - Large Dataset Handling
 *
 * Optimizes PDF and Excel export performance for large datasets
 * Implements streaming, chunking, and memory management strategies
 */

import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

interface ExportPerformanceConfig {
  // Chunking configuration
  maxRowsPerChunk: number;
  maxMemoryUsage: number; // in MB

  // Streaming configuration
  enableStreaming: boolean;
  streamChunkSize: number;

  // Background processing
  enableBackgroundProcessing: boolean;
  jobTimeout: number; // in milliseconds

  // Caching
  enableResultCaching: boolean;
  cacheTTL: number; // in milliseconds
}

export const EXPORT_PERFORMANCE_CONFIG: ExportPerformanceConfig = {
  maxRowsPerChunk: 1000,
  maxMemoryUsage: 100, // 100MB limit
  enableStreaming: true,
  streamChunkSize: 100,
  enableBackgroundProcessing: true,
  jobTimeout: 300000, // 5 minutes
  enableResultCaching: true,
  cacheTTL: 15 * 60 * 1000, // 15 minutes
};

export class ExportOptimizer {
  private static memoryUsageCache = new Map<string, number>();
  private static activeExports = new Set<string>();

  /**
   * Check if export should be processed in background based on data size
   */
  static shouldUseBackgroundProcessing(dataSize: number): boolean {
    const estimatedMemoryMB = dataSize * 0.001; // Rough estimation: 1KB per row
    return estimatedMemoryMB > EXPORT_PERFORMANCE_CONFIG.maxMemoryUsage / 2;
  }

  /**
   * Generate export job ID for tracking large exports
   */
  static generateJobId(reportType: string, format: string, userId: string): string {
    const timestamp = Date.now();
    return `export_${reportType}_${format}_${userId}_${timestamp}`;
  }

  /**
   * Chunk large datasets for memory-efficient processing
   */
  static chunkDataset<T>(data: T[], chunkSize: number = EXPORT_PERFORMANCE_CONFIG.maxRowsPerChunk): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Memory-efficient Excel export for large datasets
   */
  static async exportLargeExcelDataset(
    title: string,
    columns: Array<{ header: string; key: string; width?: number }>,
    data: any[],
    filename: string
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    // Set up columns with optimal performance settings
    worksheet.columns = columns.map(col => ({
      ...col,
      width: col.width || 20
    }));

    // Apply header formatting
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F4FD' }
    };

    // Process data in chunks to manage memory
    const chunks = this.chunkDataset(data, EXPORT_PERFORMANCE_CONFIG.streamChunkSize);
    let currentRow = 2; // Start after header

    for (const chunk of chunks) {
      // Add chunk data
      worksheet.addRows(chunk);

      // Apply formatting to chunk (optional, can be skipped for performance)
      for (let i = 0; i < chunk.length; i++) {
        const row = worksheet.getRow(currentRow + i);

        // Apply conditional formatting for key cells
        columns.forEach((col, colIndex) => {
          const cell = row.getCell(colIndex + 1);

          // Format currency columns
          if (col.key.includes('amount') || col.key.includes('total') || col.key.includes('cost')) {
            cell.numFmt = '"$"#,##0.00';
          }

          // Format percentage columns
          if (col.key.includes('percentage') || col.key.includes('rate')) {
            cell.numFmt = '0.0%';
          }

          // Format date columns
          if (col.key.includes('date') || col.key.includes('time')) {
            cell.numFmt = 'mm/dd/yyyy';
          }
        });
      }

      currentRow += chunk.length;

      // Memory management: force garbage collection hint
      if (chunks.length > 10 && chunks.indexOf(chunk) % 10 === 0) {
        if (global.gc) {
          global.gc();
        }
      }
    }

    // Apply final formatting
    worksheet.autoFilter = {
      from: 'A1',
      to: worksheet.lastColumn?.letter + '1'
    };

    // Generate buffer
    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  /**
   * Streaming CSV export for large datasets
   */
  static createStreamingCSVExport(
    columns: Array<{ header: string; key: string }>,
    data: any[],
    filename: string
  ): { stream: PassThrough; headers: Record<string, string> } {
    const stream = new PassThrough();

    // CSV headers
    const csvHeaders = {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Transfer-Encoding': 'chunked'
    };

    // Start the streaming process
    process.nextTick(async () => {
      try {
        // Write CSV header row
        const headerRow = columns.map(col => `"${col.header}"`).join(',') + '\n';
        stream.write(headerRow);

        // Stream data in chunks
        const chunks = this.chunkDataset(data, EXPORT_PERFORMANCE_CONFIG.streamChunkSize);

        for (const chunk of chunks) {
          const csvChunk = chunk.map(row => {
            return columns.map(col => {
              const value = row[col.key];
              if (value == null) return '""';
              if (typeof value === 'string') {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return `"${value}"`;
            }).join(',');
          }).join('\n') + '\n';

          stream.write(csvChunk);

          // Add small delay to prevent blocking
          await new Promise(resolve => setTimeout(resolve, 1));
        }

        stream.end();
      } catch (error) {
        stream.destroy(error as Error);
      }
    });

    return { stream, headers: csvHeaders };
  }

  /**
   * Performance monitoring for export operations
   */
  static async monitorExportPerformance<T>(
    operation: () => Promise<T>,
    operationName: string,
    dataSize: number
  ): Promise<{ result: T; metrics: ExportPerformanceMetrics }> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();

    let result: T;
    let endTime: bigint;
    let endMemory: NodeJS.MemoryUsage;

    try {
      result = await operation();
      endTime = process.hrtime.bigint();
      endMemory = process.memoryUsage();
    } catch (error) {
      endTime = process.hrtime.bigint();
      endMemory = process.memoryUsage();
      throw error;
    }

    const metrics: ExportPerformanceMetrics = {
      operationName,
      dataSize,
      duration: Number(endTime - startTime) / 1000000, // Convert to milliseconds
      memoryPeak: Math.max(endMemory.heapUsed, startMemory.heapUsed),
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      timestamp: new Date().toISOString(),
    };

    return { result, metrics };
  }

  /**
   * Optimize export based on data characteristics
   */
  static getOptimalExportStrategy(data: any[], format: 'csv' | 'excel' | 'pdf'): ExportStrategy {
    const dataSize = data.length;
    const estimatedMemoryMB = dataSize * 0.001;

    // Determine optimal chunk size based on data complexity
    let chunkSize = EXPORT_PERFORMANCE_CONFIG.maxRowsPerChunk;
    const sampleRow = data[0];
    if (sampleRow) {
      const columnCount = Object.keys(sampleRow).length;
      if (columnCount > 20) {
        chunkSize = Math.floor(chunkSize / 2); // Reduce chunk size for wide tables
      }
    }

    return {
      useStreaming: format === 'csv' && dataSize > 500,
      useBackgroundProcessing: estimatedMemoryMB > 50,
      chunkSize: chunkSize,
      enableCompression: dataSize > 1000,
      cacheResult: dataSize > 100,
      maxConcurrentOperations: estimatedMemoryMB > 100 ? 1 : 3
    };
  }

  /**
   * Background export job processor
   */
  static async processBackgroundExport(
    jobId: string,
    exportFunction: () => Promise<Buffer>,
    onComplete: (jobId: string, result: Buffer | Error) => void
  ): Promise<void> {
    this.activeExports.add(jobId);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Export job ${jobId} timed out`));
        }, EXPORT_PERFORMANCE_CONFIG.jobTimeout);
      });

      const exportPromise = exportFunction();
      const result = await Promise.race([exportPromise, timeoutPromise]);

      onComplete(jobId, result);
    } catch (error) {
      onComplete(jobId, error as Error);
    } finally {
      this.activeExports.delete(jobId);
    }
  }

  /**
   * Check export system health and capacity
   */
  static getExportSystemStatus(): ExportSystemStatus {
    const memoryUsage = process.memoryUsage();
    const activeExportCount = this.activeExports.size;

    return {
      isHealthy: memoryUsage.heapUsed < (EXPORT_PERFORMANCE_CONFIG.maxMemoryUsage * 1024 * 1024),
      activeExports: activeExportCount,
      memoryUsageMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      maxMemoryMB: EXPORT_PERFORMANCE_CONFIG.maxMemoryUsage,
      canAcceptNewExports: activeExportCount < 5,
      lastUpdated: new Date().toISOString()
    };
  }
}

// Type definitions for performance monitoring
interface ExportPerformanceMetrics {
  operationName: string;
  dataSize: number;
  duration: number; // milliseconds
  memoryPeak: number; // bytes
  memoryDelta: number; // bytes
  timestamp: string;
}

interface ExportStrategy {
  useStreaming: boolean;
  useBackgroundProcessing: boolean;
  chunkSize: number;
  enableCompression: boolean;
  cacheResult: boolean;
  maxConcurrentOperations: number;
}

interface ExportSystemStatus {
  isHealthy: boolean;
  activeExports: number;
  memoryUsageMB: number;
  maxMemoryMB: number;
  canAcceptNewExports: boolean;
  lastUpdated: string;
}

// Export performance utilities for report endpoints
export const ExportPerformanceUtils = {
  /**
   * Optimized response for large CSV exports
   */
  streamingCSVResponse(
    columns: Array<{ header: string; key: string }>,
    data: any[],
    filename: string
  ): Response {
    const { stream, headers } = ExportOptimizer.createStreamingCSVExport(columns, data, filename);

    return new Response(stream as any, {
      headers: headers
    });
  },

  /**
   * Optimized response for large Excel exports
   */
  async optimizedExcelResponse(
    title: string,
    columns: Array<{ header: string; key: string; width?: number }>,
    data: any[],
    filename: string
  ): Promise<NextResponse> {
    const { result: buffer, metrics } = await ExportOptimizer.monitorExportPerformance(
      () => ExportOptimizer.exportLargeExcelDataset(title, columns, data, filename),
      `Excel export: ${title}`,
      data.length
    );

    // Log performance metrics for monitoring
    console.log('Excel Export Performance:', metrics);

    return new NextResponse(buffer as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  },

  /**
   * Check if export should be deferred to background processing
   */
  shouldDeferExport(dataSize: number): boolean {
    return ExportOptimizer.shouldUseBackgroundProcessing(dataSize);
  },

  /**
   * Get export system health for monitoring
   */
  getSystemStatus(): ExportSystemStatus {
    return ExportOptimizer.getExportSystemStatus();
  }
};

export default ExportOptimizer;