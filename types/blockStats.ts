// Define types based on MonoPulse SDK
export type CommitState = "Proposed" | "Voted" | "Finalized" | "Verified";

export interface BlockStats {
  blockNumber: bigint;
  blockId?: string | null;
  commitState?: CommitState | null;
}

export interface BlockState {
  Proposed?: boolean;
  Voted?: boolean;
  Finalized?: boolean;
  Verified?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  blockNumber: bigint;
  state: string;
  message: string;
}
