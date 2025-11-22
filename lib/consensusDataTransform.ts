/**
 * Consensus Data Transformation Utilities
 * 
 * Transforms real BlockStats data from MonoPulse SDK v1.2.0 into
 * validator graph data for visualization.
 */

import type {
  BlockStats,
  ValidatorInfo,
  BlockValidatorData,
  CommitState,
  ValidatorRole,
  Address,
} from '@/types/blockStats';

/**
 * Normalize address to lowercase for deduplication
 */
const normalizeAddress = (address: string): Address => {
  return address.toLowerCase() as Address;
};

/**
 * Determine roles based on commit state progression
 * 
 * MonoPulse consensus flow:
 * - Proposed: Proposer creates block
 * - Voted: QC signers vote on block
 * - Finalized: Block is finalized (first QC signer acts as finalizer)
 * - Verified: Block is verified (remaining QC signers act as verifiers)
 */
const determineRole = (
  address: Address,
  proposer: Address | null | undefined,
  qcSigners: Address[],
  commitState: CommitState | null | undefined
): ValidatorRole[] => {
  const roles: ValidatorRole[] = [];

  // Normalize for comparison
  const normalizedAddress = normalizeAddress(address);
  const normalizedProposer = proposer ? normalizeAddress(proposer) : null;
  const normalizedSigners = qcSigners.map(normalizeAddress);

  // Check if this address is the proposer
  if (normalizedProposer && normalizedAddress === normalizedProposer) {
    roles.push('Proposer');
  }

  // Check if this address is in QC signers (voters)
  if (normalizedSigners.includes(normalizedAddress)) {
    roles.push('Voter');

    // In finalized/verified state, first signer becomes finalizer
    if (commitState === 'Finalized' || commitState === 'Verified') {
      if (normalizedSigners[0] === normalizedAddress) {
        roles.push('Finalizer');
      }
    }

    // In verified state, remaining signers become verifiers
    if (commitState === 'Verified' && normalizedSigners[0] !== normalizedAddress) {
      roles.push('Verifier');
    }
  }

  return roles;
};

/**
 * Transform BlockStats from MonoPulse SDK into BlockValidatorData for graph
 */
export const transformBlockStatsToValidatorData = (
  stats: BlockStats,
  transactionCount?: number
): BlockValidatorData => {
  const {
    blockNumber,
    hash,
    proposer,
    qc,
    commitState,
    rawHeader,
    timestamp,
  } = stats;

  // Create a map to deduplicate validators by address
  const validatorMap = new Map<string, ValidatorInfo>();

  // Extract QC signers
  const qcSigners: Address[] = qc?.signers || [];

  // Collect all unique addresses
  const allAddresses = new Set<Address>();
  if (proposer) allAddresses.add(normalizeAddress(proposer));
  qcSigners.forEach(signer => allAddresses.add(normalizeAddress(signer)));

  // Create validator entries with merged roles
  allAddresses.forEach(address => {
    const roles = determineRole(address, proposer, qcSigners, commitState);
    
    if (roles.length > 0) {
      const validatorId = `${normalizeAddress(address)}-${blockNumber}`;
      
      validatorMap.set(normalizeAddress(address), {
        id: validatorId,
        address: normalizeAddress(address),
        roles,
        timestamp: timestamp || new Date().toISOString(),
        blockNumber,
        commitState: commitState || undefined,
      });
    }
  });

  // Convert map to array
  const validators = Array.from(validatorMap.values());

  // Build consensus flow for graph visualization
  const consensusFlow = {
    proposer: validators.find(v => v.roles.includes('Proposer')),
    voters: validators.filter(v => v.roles.includes('Voter')),
    finalizer: validators.find(v => v.roles.includes('Finalizer')),
    verifiers: validators.filter(v => v.roles.includes('Verifier')),
  };

  return {
    blockNumber,
    hash: hash || null,
    validators,
    transactionCount,
    consensusFlow,
    rawHeader,
  };
};

/**
 * Merge new validator data into existing data (for real-time updates)
 * 
 * This allows cumulative state progression:
 * Proposed → Voted → Finalized → Verified
 */
export const mergeValidatorData = (
  existing: BlockValidatorData,
  incoming: BlockValidatorData
): BlockValidatorData => {
  // Create a map to merge validators by address
  const validatorMap = new Map<string, ValidatorInfo>();

  // Add existing validators
  existing.validators.forEach(v => {
    validatorMap.set(normalizeAddress(v.address), { ...v });
  });

  // Merge incoming validators (update roles if they've progressed)
  incoming.validators.forEach(v => {
    const normalized = normalizeAddress(v.address);
    const existingValidator = validatorMap.get(normalized);

    if (existingValidator) {
      // Merge roles (deduplicate)
      const mergedRoles = Array.from(
        new Set([...existingValidator.roles, ...v.roles])
      ) as ValidatorRole[];

      validatorMap.set(normalized, {
        ...existingValidator,
        roles: mergedRoles,
        commitState: v.commitState || existingValidator.commitState,
        timestamp: v.timestamp, // Use latest timestamp
      });
    } else {
      validatorMap.set(normalized, { ...v });
    }
  });

  const mergedValidators = Array.from(validatorMap.values());

  // Rebuild consensus flow
  const consensusFlow = {
    proposer: mergedValidators.find(v => v.roles.includes('Proposer')),
    voters: mergedValidators.filter(v => v.roles.includes('Voter')),
    finalizer: mergedValidators.find(v => v.roles.includes('Finalizer')),
    verifiers: mergedValidators.filter(v => v.roles.includes('Verifier')),
  };

  return {
    blockNumber: incoming.blockNumber,
    hash: incoming.hash || existing.hash,
    validators: mergedValidators,
    transactionCount: incoming.transactionCount ?? existing.transactionCount,
    consensusFlow,
    rawHeader: incoming.rawHeader || existing.rawHeader,
  };
};


