import React from 'react';
import { BlockState } from '@/types/blockStats';

interface BlockStatsTableProps {
  blocks: Map<bigint, BlockState>;
}

const BlockStatsTable: React.FC<BlockStatsTableProps> = ({ blocks }) => {
  // Get the last 100 blocks, sorted by block number (descending)
  const sortedBlocks = Array.from(blocks.entries())
    .sort(([a], [b]) => Number(b - a))
    .slice(0, 100);

  const renderCheckmark = (value?: boolean): string => {
    return value ? '✔' : '-';
  };

  return (
    <div className="w-1/2 pr-4">
      <div className="bg-terminal-bg border border-terminal-green rounded-lg overflow-hidden">
        <div className="bg-gray-900 px-4 py-2 border-b border-terminal-green">
          <h2 className="text-terminal-green font-mono text-lg font-bold terminal-glow">
            Block Stats Table
          </h2>
        </div>
        <div className="h-96 overflow-y-auto">
          <table className="w-full font-mono text-sm">
            <thead className="sticky top-0 bg-gray-900">
              <tr className="border-b border-terminal-green">
                <th className="text-left p-2 text-terminal-green font-bold">Block</th>
                <th className="text-center p-2 text-terminal-green font-bold">P</th>
                <th className="text-center p-2 text-terminal-green font-bold">V</th>
                <th className="text-center p-2 text-terminal-green font-bold">F</th>
                <th className="text-center p-2 text-terminal-green font-bold">Ver</th>
              </tr>
            </thead>
            <tbody>
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
                    className="border-b border-gray-700 hover:bg-gray-800 transition-colors"
                  >
                    <td className="p-2 text-terminal-green font-bold">
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
      </div>
    </div>
  );
};

export default BlockStatsTable;
