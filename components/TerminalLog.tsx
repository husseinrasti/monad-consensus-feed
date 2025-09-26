import React, { useMemo } from 'react';
import { LogEntry } from '@/types/blockStats';

interface TerminalLogProps {
  logs: LogEntry[];
}

const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  // Newest first (top)
  const newestFirst = useMemo(() => [...logs].reverse(), [logs]);

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="w-full h-full flex flex-col" aria-label="Terminal log">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className="text-terminal-green font-mono text-xs sm:text-sm md:text-base font-bold terminal-glow">Terminal Log</h2>
      </div>
      <div className="font-mono text-xs sm:text-sm leading-relaxed space-y-1 flex-1 overflow-y-auto" aria-live="polite">
        {newestFirst.length === 0 ? (
          <div className="text-gray-500">
            <span>Waiting for block updates...</span>
            <span className="inline-block w-2 h-4 bg-terminal-green animate-blink ml-1">▌</span>
          </div>
        ) : (
          newestFirst.map((log) => (
            <div key={log.id} className="mb-1">
              <span className="text-gray-400">[{formatTimestamp(log.timestamp)}]</span>
              <span className="text-terminal-green ml-2 terminal-glow">
                #{log.blockNumber.toString()} {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TerminalLog;
