// Real MonoPulse SDK integration for Monad blockchain
import { MonoPulse } from 'monopulse';
import type { BlockStats } from '@/types/blockStats';

// Define WatcherStopFn type based on MonoPulse SDK
export type WatcherStopFn = () => void;

export interface MonoPulseClientOptions {
  rpcUrl?: string;
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

export class MonoPulseClient {
  private monoPulse: MonoPulse;
  private stopWatcher?: WatcherStopFn;

  constructor(options: MonoPulseClientOptions) {
    const rpcUrl = options.rpcUrl || 
                   process.env.NEXT_PUBLIC_RPC_URL || 
                   process.env.RPC_URL || 
                   process.env.WS_RPC_URL;
    
    if (!rpcUrl) {
      throw new Error('RPC_URL is required for MonoPulse connection. Please set NEXT_PUBLIC_RPC_URL in your environment variables.');
    }

    this.monoPulse = new MonoPulse({
      provider: 'auto', // Let MonoPulse choose the best provider
      rpcUrl,
      logger: {
        level: options.logLevel || (process.env.MONOPULSE_LOG_LEVEL as any) || 'info',
      },
    });
  }

  /**
   * Start watching block stats with speculative feed
   * @param onUpdate Callback function to handle block stats updates
   * @param onError Optional error handler
   * @returns Promise that resolves when the watcher is started
   */
  async startWatchingBlockStats(
    onUpdate: (stats: BlockStats) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Stop any existing watcher
      if (this.stopWatcher) {
        this.stopWatcher();
      }

      // Start watching block stats with speculative feed
      this.stopWatcher = await this.monoPulse.watchBlockStats(
        (stats: BlockStats) => {
          try {
            onUpdate(stats);
          } catch (error) {
            console.error('Error in block stats update handler:', error);
            if (onError) {
              onError(error as Error);
            }
          }
        },
        {
          feed: 'speculative', // Use speculative feed for real-time updates
          verifiedOnly: false, // Include unverified blocks for faster updates
          pollIntervalMs: 1000, // Poll every second for updates
        }
      );

      console.log('MonoPulse block stats watcher started with speculative feed');
    } catch (error) {
      console.error('Failed to start MonoPulse block stats watcher:', error);
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Stop watching block stats and cleanup
   */
  stopWatching(): void {
    if (this.stopWatcher) {
      try {
        this.stopWatcher();
        this.stopWatcher = undefined;
        console.log('MonoPulse block stats watcher stopped');
      } catch (error) {
        console.error('Error stopping MonoPulse watcher:', error);
      }
    }
  }

  /**
   * Get the current chain ID
   */
  async getChainId(): Promise<number> {
    return await this.monoPulse.getChainId();
  }

  /**
   * Check if the watcher is currently active
   */
  isWatching(): boolean {
    return !!this.stopWatcher;
  }
}
