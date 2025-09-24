import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import BlockStatsTable from '@/components/BlockStatsTable';
import TerminalLog from '@/components/TerminalLog';
import { BlockState, LogEntry, BlockStats } from '@/types/blockStats';

const HomePage: React.FC = () => {
  const [blocks, setBlocks] = useState<Map<bigint, BlockState>>(new Map());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [chainId, setChainId] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Compute the latest (highest) block number from received blocks
  const latestBlockNumber = React.useMemo(() => {
    if (blocks.size === 0) return 0;
    let maxBlock = 0;
    const blockNumbers = Array.from(blocks.keys());
    for (let i = 0; i < blockNumbers.length; i++) {
      const num = Number(blockNumbers[i]);
      if (num > maxBlock) {
        maxBlock = num;
      }
    }
    return maxBlock;
  }, [blocks]);

  const handleBlockStatsUpdate = useCallback((stats: BlockStats) => {
    const { blockNumber, commitState, blockId } = stats;

    if (commitState) {
      // Update blocks map with the new commit state
      setBlocks(prevBlocks => {
        const newBlocks = new Map(prevBlocks);
        const currentBlock = newBlocks.get(blockNumber) || {};
        
        // Update the specific commit state
        const updatedBlock = {
          ...currentBlock,
          [commitState]: true,
        };
        
        newBlocks.set(blockNumber, updatedBlock);
        return newBlocks;
      });

      // Add log entry
      const logEntry: LogEntry = {
        id: `${blockNumber.toString()}-${commitState}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        blockNumber,
        state: commitState,
        message: `${commitState}${blockId ? ` (${blockId.slice(0, 8)}...)` : ''}`,
      };

      setLogs(prevLogs => [...prevLogs.slice(-99), logEntry]); // Keep only last 100 logs
    }
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('MonoPulse Error:', error);
    setConnectionStatus('error');
    
    const errorLog: LogEntry = {
      id: `error-${Date.now()}`,
      timestamp: new Date().toISOString(),
      blockNumber: BigInt(0),
      state: 'ERROR',
      message: `Connection Error: ${error.message}`,
    };
    
    setLogs(prevLogs => [...prevLogs.slice(-99), errorLog]);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setConnectionStatus('connecting');

    const es = new EventSource('/api/stream');
    eventSourceRef.current = es;

    es.addEventListener('meta', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        if (isMounted && typeof data.chainId === 'number') {
          setChainId(data.chainId);
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener('blockStats', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data) as { blockNumber?: string; blockId?: string | null; commitState?: BlockStats['commitState'] };
        const bn = data.blockNumber ? BigInt(data.blockNumber) : undefined;
        if (bn && data.commitState) {
          handleBlockStatsUpdate({
            blockNumber: bn,
            blockId: data.blockId ?? null,
            commitState: data.commitState ?? null,
          });
        }
        if (isMounted) setConnectionStatus('connected');
      } catch (error) {
        handleError(error as Error);
      }
    });

    es.addEventListener('error', (evt: MessageEvent) => {
      try {
        const data = JSON.parse((evt as any).data || '{}');
        handleError(new Error(data.message || 'SSE error'));
      } catch {
        handleError(new Error('SSE error'));
      }
    });

    es.onerror = () => {
      if (!isMounted) return;
      setConnectionStatus('error');
    };

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionStatus('disconnected');
    };
  }, [handleBlockStatsUpdate, handleError]);

  return (
    <>
      <Head>
        <title>MonadBFT Live</title>
        <meta name="description" content="Live Monad blockchain statistics dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/monad-logo.png" />
      </Head>

      <main className="h-screen w-screen bg-terminal-bg text-terminal-green font-mono p-4">
        {/* Header Info Bar */}
        <header className="mb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl md:text-3xl terminal-glow tracking-wide" aria-label="MONAD CONSENSUS FEED">
              MONAD CONSENSUS FEED
            </h1>
            <div className="text-xs sm:text-sm text-gray-400">by <span className="monospace text-xl"><a href="https://x.com/hr0xCrypto" target="_blank" rel="noopener noreferrer">cipHer</a></span></div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] sm:text-xs text-gray-400">
            <span>Latest Block Number: {latestBlockNumber}</span>
            <span>•</span>
            <span>
              Last Update: {logs.length > 0 ? new Date(logs[logs.length - 1].timestamp).toLocaleTimeString() : 'N/A'}
            </span>
          </div>
        </header>

        {/* Split Layout with Vertical Divider */}
        <section className="h-[calc(100vh-4rem)] sm:h-[calc(100vh-4.25rem)] md:h-[calc(100vh-4.5rem)] flex min-h-0">
          {/* Left: Block Stats (70%) */}
          <div className="flex-[7] min-w-0 mr-3 flex flex-col overflow-hidden" aria-label="Block statistics section">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <BlockStatsTable blocks={blocks} />
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px bg-terminal-green/40" role="separator" aria-orientation="vertical" />

          {/* Right: Terminal Log (30%) */}
          <div className="flex-[3] min-w-0 ml-3 flex flex-col overflow-hidden" aria-label="Terminal log section">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TerminalLog logs={logs} />
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default HomePage;
