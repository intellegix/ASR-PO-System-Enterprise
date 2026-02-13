/**
 * Dashboard Cache Service
 * Simple in-memory cache for expensive KPI calculations
 * Can be upgraded to Redis for production scaling
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  entries: number;
}

class DashboardCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    entries: 0,
  };
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);
  }

  /**
   * Generate cache key for dashboard data
   */
  private generateKey(type: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `dashboard:${type}:${sortedParams}`;
  }

  /**
   * Get cached data
   */
  get<T>(type: string, params: Record<string, unknown>): T | null {
    const key = this.generateKey(type, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set cached data with TTL in milliseconds
   */
  set<T>(type: string, params: Record<string, unknown>, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const key = this.generateKey(type, params);

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });

    this.stats.sets++;
    this.stats.entries = this.cache.size;
  }

  /**
   * Get or set pattern for cache-aside
   */
  async getOrSet<T>(
    type: string,
    params: Record<string, unknown>,
    fetcher: () => Promise<T>,
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(type, params);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    const data = await fetcher();

    // Store in cache
    this.set(type, params, data, ttlMs);

    return data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(type?: string, specificParams?: Record<string, unknown>): number {
    let deletedCount = 0;

    if (specificParams && type) {
      // Invalidate specific entry
      const key = this.generateKey(type, specificParams);
      if (this.cache.delete(key)) {
        deletedCount = 1;
      }
    } else if (type) {
      // Invalidate all entries of a specific type
      const prefix = `dashboard:${type}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }
    } else {
      // Invalidate all entries
      deletedCount = this.cache.size;
      this.cache.clear();
    }

    this.stats.evictions += deletedCount;
    this.stats.entries = this.cache.size;

    return deletedCount;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let evictedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      this.stats.evictions += evictedCount;
      this.stats.entries = this.cache.size;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      ...this.stats,
      hitRate,
    };
  }

  /**
   * Clear all cache data and reset stats
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      entries: 0,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  KPI_QUICK: 1 * 60 * 1000,      // 1 minute for quick KPIs
  KPI_STANDARD: 5 * 60 * 1000,   // 5 minutes for standard KPIs
  KPI_HEAVY: 10 * 60 * 1000,     // 10 minutes for expensive calculations
  DIVISION_DATA: 5 * 60 * 1000,   // 5 minutes for division data
  CROSS_DIVISION: 3 * 60 * 1000,  // 3 minutes for cross-division (changes more frequently)
  PENDING_APPROVALS: 30 * 1000,   // 30 seconds for pending approvals (need real-time updates)
  REPORTS: 15 * 60 * 1000,        // 15 minutes for reports
  SYSTEM_HEALTH: 2 * 60 * 1000,   // 2 minutes for system health
} as const;

// Singleton instance
export const dashboardCache = new DashboardCache();

// Cache invalidation helpers for when data changes
export const invalidateRelatedCache = {
  /**
   * Invalidate cache when PO data changes
   */
  onPOChange: (divisionId?: string) => {
    dashboardCache.invalidate('division-kpis', divisionId ? { divisionId } : undefined);
    dashboardCache.invalidate('cross-division-kpis');
    dashboardCache.invalidate('pending-approvals');
    dashboardCache.invalidate('kpis');
  },

  /**
   * Invalidate cache when approval happens
   */
  onApprovalChange: (divisionId?: string) => {
    dashboardCache.invalidate('pending-approvals');
    dashboardCache.invalidate('division-kpis', divisionId ? { divisionId } : undefined);
    dashboardCache.invalidate('cross-division-kpis');
    dashboardCache.invalidate('kpis');
  },

  /**
   * Invalidate cache when vendor data changes
   */
  onVendorChange: () => {
    dashboardCache.invalidate('division-kpis');
    dashboardCache.invalidate('cross-division-kpis');
  },

  /**
   * Invalidate specific division cache
   */
  forDivision: (divisionId: string) => {
    dashboardCache.invalidate('division-kpis', { divisionId });
    dashboardCache.invalidate('cross-division-kpis');
    dashboardCache.invalidate('kpis', { divisionId });
  },

  /**
   * Clear all dashboard cache
   */
  all: () => {
    dashboardCache.clear();
  },
};

// Types for cached data
export interface CachedDivisionKPIs {
  currentMonth: {
    spend: number;
    count: number;
    averageValue: number;
  };
  yearToDate: {
    spend: number;
    count: number;
  };
  trends: {
    monthOverMonthChange: number;
    averageApprovalTimeHours: number;
  };
  pending: {
    count: number;
    totalAmount: number;
    items: Array<{
      id: string;
      poNumber: string;
      amount: number;
      vendor: string;
      daysOld: number;
    }>;
  };
  canViewDetails: boolean;
}

export interface CachedCrossDivisionKPIs {
  companyWide: {
    currentMonth: {
      totalSpend: number;
      totalCount: number;
      averagePOValue: number;
    };
    yearToDate: {
      totalSpend: number;
      totalCount: number;
    };
    alerts: {
      highValuePendingCount: number;
      approvalBottlenecks: number;
    };
  };
  divisionBreakdown: Array<{
    division: {
      id: string;
      name: string;
      code: string;
    };
    metrics: {
      currentMonthSpend: number;
      currentMonthCount: number;
      ytdSpend: number;
      ytdCount: number;
      pendingApprovals: number;
      averagePOValue: number;
    };
  }>;
  highValuePendings: Array<{
    id: string;
    poNumber: string;
    amount: number;
    division: string;
    vendor: string;
    daysOld: number;
  }>;
  approvalVelocity: Array<{
    divisionName: string;
    approvedCount: number;
    avgApprovalTimeHours: number;
  }>;
}

// Cache wrapper functions for specific dashboard types
export const cachedDashboardData = {
  /**
   * Cached division KPIs
   */
  getDivisionKPIs: async (
    divisionId: string,
    userRole: string,
    userDivisionId: string | null,
    fetcher: () => Promise<CachedDivisionKPIs>
  ): Promise<CachedDivisionKPIs> => {
    return dashboardCache.getOrSet(
      'division-kpis',
      { divisionId, userRole, userDivisionId },
      fetcher,
      CACHE_TTL.DIVISION_DATA
    );
  },

  /**
   * Cached cross-division KPIs
   */
  getCrossDivisionKPIs: async (
    userRole: string,
    fetcher: () => Promise<CachedCrossDivisionKPIs>
  ): Promise<CachedCrossDivisionKPIs> => {
    return dashboardCache.getOrSet(
      'cross-division-kpis',
      { userRole },
      fetcher,
      CACHE_TTL.CROSS_DIVISION
    );
  },

  /**
   * Cached quick KPIs
   */
  getQuickKPIs: async <T>(
    params: Record<string, unknown>,
    fetcher: () => Promise<T>
  ): Promise<T> => {
    return dashboardCache.getOrSet(
      'kpis',
      params,
      fetcher,
      CACHE_TTL.KPI_QUICK
    );
  },

  /**
   * Cached pending approvals
   */
  getPendingApprovals: async <T>(
    userRole: string,
    userDivisionId: string | null,
    fetcher: () => Promise<T>
  ): Promise<T> => {
    return dashboardCache.getOrSet(
      'pending-approvals',
      { userRole, userDivisionId },
      fetcher,
      CACHE_TTL.PENDING_APPROVALS
    );
  },
};

export default dashboardCache;