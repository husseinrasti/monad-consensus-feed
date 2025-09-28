// Define types based on MonoPulse SDK
export type CommitState = "Proposed" | "Voted" | "Finalized" | "Verified";
export type ValidatorRole = "Proposer" | "Voter" | "Finalizer" | "Verifier";

export interface BlockStats {
  blockNumber: bigint;
  blockId?: string | null;
  commitState?: CommitState | null;
  validators?: ValidatorInfo[];
  transactionCount?: number;
}

export interface BlockState {
  Proposed?: boolean;
  Voted?: boolean;
  Finalized?: boolean;
  Verified?: boolean;
  transactionCount?: number;
}

export interface ValidatorInfo {
  id: string;
  address: string;
  roles: ValidatorRole[];
  timestamp: string;
  blockNumber: bigint;
  commitState?: CommitState;
}

export interface BlockValidatorData {
  blockNumber: bigint;
  validators: ValidatorInfo[];
  transactionCount?: number;
  consensusFlow: {
    proposer?: ValidatorInfo;
    voters: ValidatorInfo[];
    finalizer?: ValidatorInfo;
    verifiers: ValidatorInfo[];
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  blockNumber: bigint;
  state: string;
  message: string;
}
