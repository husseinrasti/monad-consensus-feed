import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BlockState } from '@/types/blockStats';

interface BlockStatsTableProps {
  blocks: Map<bigint, BlockState>;
}

const BlockStatsTable: React.FC<BlockStatsTableProps> = ({ blocks }) => {
  // Track which rows were recently updated to flash highlight
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, number>>(new Map());
  const prevBlocksRef = useRef<Map<bigint, BlockState>>(new Map());

  // Compute newest-first list (top) and limit to last 100
  const sortedBlocks = useMemo(() => (
    Array.from(blocks.entries())
      .sort(([a], [b]) => Number(b - a))
      .slice(0, 100)
  ), [blocks]);

  // Detect changes per block to trigger highlight
  useEffect(() => {
    const updatedKeys: string[] = [];
    blocks.forEach((state, blockNumber) => {
      const prev = prevBlocksRef.current.get(blockNumber);
      const changed = !prev ||
        prev.Proposed !== state.Proposed ||
        prev.Voted !== state.Voted ||
        prev.Finalized !== state.Finalized ||
        prev.Verified !== state.Verified;
      if (changed) updatedKeys.push(blockNumber.toString());
    });

    if (updatedKeys.length > 0) {
      setHighlighted(prevSet => {
        const newSet = new Set(prevSet);
        for (const key of updatedKeys) {
          newSet.add(key);
          const existing = timeoutsRef.current.get(key);
          if (existing) window.clearTimeout(existing);
          const timeoutId = window.setTimeout(() => {
            setHighlighted(current => {
              const copy = new Set(current);
              copy.delete(key);
              return copy;
            });
            timeoutsRef.current.delete(key);
          }, 1000);
          timeoutsRef.current.set(key, timeoutId);
        }
        return newSet;
      });
    }

    // snapshot current for next comparison
    prevBlocksRef.current = new Map(blocks);
  }, [blocks]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(id => window.clearTimeout(id));
      timeoutsRef.current.clear();
    };
  }, []);

  const renderCheckmark = (value?: boolean): string => {
    return value ? '✔' : ' ';
  };

  return (
    <div className="w-full" aria-label="Block stats table">
      <table className="w-full font-mono text-sm">
        <thead className="sticky top-0 bg-terminal-bg">
          <tr className="border-b border-terminal-green/40">
            <th className="text-left p-2 text-terminal-green font-bold">Block</th>
            <th className="text-center p-2 text-terminal-green font-bold">Proposed</th>
            <th className="text-center p-2 text-terminal-green font-bold">Voted</th>
            <th className="text-center p-2 text-terminal-green font-bold">Finalized</th>
            <th className="text-center p-2 text-terminal-green font-bold">Verified</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {sortedBlocks.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center p-4 text-gray-500">
                Waiting for block data...
              </td>
            </tr>
          ) : (
            sortedBlocks.map(([blockNumber, state]) => (
              <tr
                key={blockNumber}
                className={`hover:bg-gray-900/40 transition-colors duration-1000 ${highlighted.has(blockNumber.toString()) ? 'bg-emerald-800/30' : ''}`}
              >
                <td className="p-2 text-terminal-green font-bold select-all">
                  #{blockNumber.toString()}
                </td>
                <td className="text-center p-2">
                  <span className={`${state.Proposed ? 'text-terminal-green' : 'text-gray-600'}`}>
                    {renderCheckmark(state.Proposed)}
                  </span>
                </td>
                <td className="text-center p-2">
                  <span className={`${state.Voted ? 'text-terminal-green' : 'text-gray-600'}`}>
                    {renderCheckmark(state.Voted)}
                  </span>
                </td>
                <td className="text-center p-2">
                  <span className={`${state.Finalized ? 'text-terminal-green' : 'text-gray-600'}`}>
                    {renderCheckmark(state.Finalized)}
                  </span>
                </td>
                <td className="text-center p-2">
                  <span className={`${state.Verified ? 'text-terminal-green' : 'text-gray-600'}`}>
                    {renderCheckmark(state.Verified)}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BlockStatsTable;
