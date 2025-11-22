// Define types based on MonoPulse SDK v1.2.0
export type CommitState = "Proposed" | "Voted" | "Finalized" | "Verified";
export type ValidatorRole = "Proposer" | "Voter" | "Finalizer" | "Verifier";

// Address type (checksummed Ethereum address)
export type Address = `0x${string}`;
export type Hex = `0x${string}`;

// Quorum Certificate from MonoPulse SDK
export interface QuorumCertificate {
  signers: Address[]; // Validators who signed this QC
  signatures: Hex[]; // Cryptographic signatures
}

// BlockStats from monadNewHeads subscription (MonoPulse SDK v1.2.0)
export interface BlockStats {
  blockNumber: bigint;
  hash?: Hex | null;
  blockId?: string | null;
  commitState?: CommitState | null;
  
  // Monad consensus data (from MonoPulse SDK)
  proposer?: Address | null;
  qc?: QuorumCertificate | null;
  rawHeader?: Record<string, any>;
  
  // Additional fields
  transactionCount?: number;
  timestamp?: string;
}

export interface BlockState {
  Proposed?: boolean;
  Voted?: boolean;
  Finalized?: boolean;
  Verified?: boolean;
  transactionCount?: number;
}

// Validator info derived from BlockStats
export interface ValidatorInfo {
  id: string;
  address: Address;
  roles: ValidatorRole[];
  timestamp: string;
  blockNumber: bigint;
  commitState?: CommitState;
}

// Block validator data for graph visualization
export interface BlockValidatorData {
  blockNumber: bigint;
  hash?: Hex | null;
  validators: ValidatorInfo[];
  transactionCount?: number;
  consensusFlow: {
    proposer?: ValidatorInfo;
    voters: ValidatorInfo[];
    finalizer?: ValidatorInfo;
    verifiers: ValidatorInfo[];
  };
  rawHeader?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  blockNumber: bigint;
  state: string;
  message: string;
}
