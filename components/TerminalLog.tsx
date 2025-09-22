import React, { useEffect, useRef } from 'react';
import { LogEntry } from '@/types/blockStats';

interface TerminalLogProps {
  logs: LogEntry[];
}

const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

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
    <div className="w-1/2 pl-4">
      <div className="bg-terminal-bg border border-terminal-green rounded-lg overflow-hidden h-full">
        <div className="bg-gray-900 px-4 py-2 border-b border-terminal-green">
          <h2 className="text-terminal-green font-mono text-lg font-bold terminal-glow">
            Terminal Log
          </h2>
        </div>
        <div 
          ref={logContainerRef}
          className="h-96 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
          style={{ scrollBehavior: 'smooth' }}
        >
          {logs.length === 0 ? (
            <div className="text-gray-500">
              <span>Waiting for block updates...</span>
              <span className="inline-block w-2 h-4 bg-terminal-green animate-blink ml-1">▌</span>
            </div>
          ) : (
            <>
              {logs.map((log) => (
                <div key={log.id} className="mb-1">
                  <span className="text-gray-400">[{formatTimestamp(log.timestamp)}]</span>
                  <span className="text-terminal-green ml-2 terminal-glow">
                    #{log.blockNumber.toString()} {log.message}
                  </span>
                </div>
              ))}
              <div className="flex items-center">
                <span className="text-gray-400">[{formatTimestamp(new Date().toISOString())}]</span>
                <span className="inline-block w-2 h-4 bg-terminal-green animate-blink ml-2">▌</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalLog;
