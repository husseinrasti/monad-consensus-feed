/**
 * In-Memory Block Data Cache
 * 
 * Stores real-time block consensus data from MonoPulse SDK subscriptions.
 * Used by API endpoints to serve block validator data.
 */

import type { BlockStats, BlockValidatorData } from '@/types/blockStats';
import { transformBlockStatsToValidatorData, mergeValidatorData } from './consensusDataTransform';

interface CachedBlockData {
  stats: BlockStats;
  validatorData: BlockValidatorData;
  lastUpdated: number;
}

class BlockDataCache {
  private cache = new Map<string, CachedBlockData>();
  private maxCacheSize = 1000; // Keep last 1000 blocks
  private maxAge = 3600000; // 1 hour in milliseconds

  /**
   * Store or update block data
   */
  set(stats: BlockStats, transactionCount?: number): void {
    const blockNumber = stats.blockNumber.toString();
    const existing = this.cache.get(blockNumber);

    const newValidatorData = transformBlockStatsToValidatorData(stats, transactionCount);

    if (existing) {
      // Merge with existing data to support cumulative updates
      const merged = mergeValidatorData(existing.validatorData, newValidatorData);
      
      this.cache.set(blockNumber, {
        stats: { ...existing.stats, ...stats },
        validatorData: merged,
        lastUpdated: Date.now(),
      });
    } else {
      this.cache.set(blockNumber, {
        stats,
        validatorData: newValidatorData,
        lastUpdated: Date.now(),
      });
    }

    // Cleanup old entries if cache is too large
    this.cleanup();
  }

  /**
   * Get block data
   */
  get(blockNumber: string): BlockValidatorData | null {
    const cached = this.cache.get(blockNumber);
    
    if (!cached) {
      return null;
    }

    // Check if data is too old
    if (Date.now() - cached.lastUpdated > this.maxAge) {
      this.cache.delete(blockNumber);
      return null;
    }

    return cached.validatorData;
  }

  /**
   * Check if block exists in cache
   */
  has(blockNumber: string): boolean {
    return this.cache.has(blockNumber);
  }

  /**
   * Get all cached block numbers (sorted, newest first)
   */
  getBlockNumbers(): string[] {
    return Array.from(this.cache.keys())
      .sort((a, b) => Number(b) - Number(a));
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Get all entries sorted by lastUpdated (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);

    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
    toRemove.forEach(([blockNumber]) => {
      this.cache.delete(blockNumber);
    });
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      oldestBlock: this.getBlockNumbers()[this.cache.size - 1] || null,
      newestBlock: this.getBlockNumbers()[0] || null,
    };
  }
}

// Export singleton instance
export const blockDataCache = new BlockDataCache();


