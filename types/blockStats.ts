export interface BlockState {
  Proposed?: boolean;
  Voted?: boolean;
  Finalized?: boolean;
  Verified?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  blockNumber: number;
  state: string;
  message: string;
}
