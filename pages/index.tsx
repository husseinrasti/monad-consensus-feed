import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import BlockStatsTable from '@/components/BlockStatsTable';
import TerminalLog from '@/components/TerminalLog';
import { BlockState, LogEntry } from '@/types/blockStats';
import { watchBlockStats, BlockStatsEvent } from '@/lib/mockMonoPulse';

const HomePage: React.FC = () => {
  const [blocks, setBlocks] = useState<Map<number, BlockState>>(new Map());
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleBlockStatsUpdate = useCallback((event: BlockStatsEvent) => {
    const { blockNumber, state, timestamp } = event;

    // Update blocks map
    setBlocks(prevBlocks => {
      const newBlocks = new Map(prevBlocks);
      const currentBlock = newBlocks.get(blockNumber) || {};
      
      // Update the specific state
      const updatedBlock = {
        ...currentBlock,
        [state]: true,
      };
      
      newBlocks.set(blockNumber, updatedBlock);
      return newBlocks;
    });

    // Add log entry
    const logEntry: LogEntry = {
      id: `${blockNumber}-${state}-${Date.now()}`,
      timestamp,
      blockNumber,
      state,
      message: `${state}`,
    };

    setLogs(prevLogs => [...prevLogs, logEntry]);
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('BlockStats Error:', error);
    
    const errorLog: LogEntry = {
      id: `error-${Date.now()}`,
      timestamp: new Date().toISOString(),
      blockNumber: 0,
      state: 'ERROR',
      message: `Error: ${error.message}`,
    };
    
    setLogs(prevLogs => [...prevLogs, errorLog]);
  }, []);

  useEffect(() => {
    // Start watching block stats with speculative feed
    const unsubscribe = watchBlockStats({
      feed: 'speculative',
      onBlockStats: handleBlockStatsUpdate,
      onError: handleError,
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
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
              <span className="text-terminal-green ml-1">ONLINE</span>
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
