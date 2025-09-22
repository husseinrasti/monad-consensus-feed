// Mock implementation of MonoPulse SDK for development purposes
// This would be replaced with the actual SDK when available

export interface BlockStatsEvent {
  blockNumber: number;
  state: 'Proposed' | 'Voted' | 'Finalized' | 'Verified';
  timestamp: string;
}

export interface WatchBlockStatsOptions {
  feed?: 'speculative' | 'finalized';
  onBlockStats?: (event: BlockStatsEvent) => void;
  onError?: (error: Error) => void;
}

export const watchBlockStats = (options: WatchBlockStatsOptions) => {
  const { feed = 'speculative', onBlockStats, onError } = options;
  
  let intervalId: NodeJS.Timeout;
  let currentBlock = 31130304; // Starting block number from PRD
  
  // Simulate streaming block stats
  const simulateBlockStats = () => {
    try {
      const states: Array<'Proposed' | 'Voted' | 'Finalized' | 'Verified'> = [
        'Proposed', 'Voted', 'Finalized', 'Verified'
      ];
      
      // Randomly select a state and block number
      const randomState = states[Math.floor(Math.random() * states.length)];
      const blockNumber = currentBlock + Math.floor(Math.random() * 10);
      
      if (Math.random() > 0.3) { // 70% chance of generating an event
        const event: BlockStatsEvent = {
          blockNumber,
          state: randomState,
          timestamp: new Date().toISOString(),
        };
        
        if (onBlockStats) {
          onBlockStats(event);
        }
      }
      
      // Occasionally increment the current block
      if (Math.random() > 0.8) {
        currentBlock += 1;
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    }
  };
  
  // Start the simulation
  intervalId = setInterval(simulateBlockStats, 1000 + Math.random() * 2000); // 1-3 second intervals
  
  // Return unsubscribe function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
};
