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
        <title>Monad BlockStats Feed</title>
        <meta name="description" content="Live Monad blockchain statistics dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-terminal-bg text-terminal-green font-mono">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold terminal-glow mb-2">
              MONAD BLOCK STATS FEED
            </h1>
            <div className="w-full h-px bg-terminal-green mb-4"></div>
            <p className="text-sm text-gray-400">
              Real-time blockchain statistics • Feed: Speculative • Status: 
              <span className={`ml-1 ${
                connectionStatus === 'connected' ? 'text-terminal-green' :
                connectionStatus === 'connecting' ? 'text-yellow-400' :
                connectionStatus === 'error' ? 'text-red-400' :
                'text-gray-500'
              }`}>
                {connectionStatus.toUpperCase()}
              </span>
              {chainId && (
                <span className="text-gray-400 ml-2">• Chain ID: {chainId}</span>
              )}
            </p>
          </header>

          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Block Stats Table */}
            <BlockStatsTable blocks={blocks} />

            {/* Terminal Log */}
            <TerminalLog logs={logs} />
          </div>

          {/* Footer Stats */}
          <footer className="mt-8 text-center text-sm text-gray-500">
            <div className="flex justify-center space-x-8">
              <span>Total Blocks: {blocks.size}</span>
              <span>Log Entries: {logs.length}</span>
              <span>Last Update: {logs.length > 0 ? new Date(logs[logs.length - 1].timestamp).toLocaleTimeString() : 'N/A'}</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
};

export default HomePage;
