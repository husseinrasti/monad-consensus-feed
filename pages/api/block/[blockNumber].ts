import type { NextApiRequest, NextApiResponse } from 'next';
import { BlockValidatorData, ValidatorInfo } from '@/types/blockStats';
import { getBlockTransactionCount, getRpcUrl } from '@/lib/blockchainUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { blockNumber } = req.query;
  
  if (!blockNumber || typeof blockNumber !== 'string') {
    return res.status(400).json({ error: 'Block number is required' });
  }

  try {
    const blockNum = BigInt(blockNumber);
    
    // Generate realistic mock data based on the block number
    // In a real implementation, this would fetch actual validator data from MonoPulse
    const validatorData = await generateBlockValidatorData(blockNum);

    // Convert BigInt values to strings for JSON serialization
    const serializedData = JSON.parse(JSON.stringify(validatorData, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    res.status(200).json(serializedData);
  } catch (error: any) {
    console.error('Error fetching block validator data:', error);
    res.status(500).json({ 
      error: `Failed to fetch validator data for block ${blockNumber}: ${error?.message}` 
    });
  }
}

async function generateBlockValidatorData(blockNumber: bigint): Promise<BlockValidatorData> {
  // Generate deterministic but realistic validator data based on block number
  const blockNum = Number(blockNumber);
  const blockNumStr = blockNumber.toString(); // Convert to string for JSON serialization
  const seed = blockNum % 1000000; // Use block number as seed for consistency
  
  // Generate deterministic addresses based on block number
  const generateAddress = (role: string, index: number): string => {
    const hash = (seed + role.charCodeAt(0) + index * 7) % 0xFFFFFF;
    return `0x${hash.toString(16).padStart(6, '0')}...${(hash * 3).toString(16).slice(-4)}`;
  };

  const now = new Date();
  const baseTimestamp = now.getTime() - (seed % 300000); // Vary timestamp based on block
  
  // Create validators with roles
  const proposer: ValidatorInfo = {
    id: `proposer-${blockNumStr}`,
    address: generateAddress('proposer', 1),
    roles: ['Proposer'],
    timestamp: new Date(baseTimestamp).toISOString(),
    blockNumber: BigInt(blockNumStr), // Keep as BigInt for type compatibility
    commitState: 'Proposed',
  };

  // Generate 3-6 voters based on block number
  const voterCount = 3 + (seed % 4);
  const voters: ValidatorInfo[] = [];
  for (let i = 0; i < voterCount; i++) {
    voters.push({
      id: `voter-${blockNumStr}-${i}`,
      address: generateAddress('voter', i + 1),
      roles: ['Voter'],
      timestamp: new Date(baseTimestamp + 1000 + (i * 500)).toISOString(),
      blockNumber: BigInt(blockNumStr),
      commitState: 'Voted',
    });
  }

  const finalizer: ValidatorInfo = {
    id: `finalizer-${blockNumStr}`,
    address: generateAddress('finalizer', 1),
    roles: ['Finalizer'],
    timestamp: new Date(baseTimestamp + 5000).toISOString(),
    blockNumber: BigInt(blockNumStr),
    commitState: 'Finalized',
  };

  // Generate 2-4 verifiers based on block number
  const verifierCount = 2 + (seed % 3);
  const verifiers: ValidatorInfo[] = [];
  for (let i = 0; i < verifierCount; i++) {
    verifiers.push({
      id: `verifier-${blockNumStr}-${i}`,
      address: generateAddress('verifier', i + 1),
      roles: ['Verifier'],
      timestamp: new Date(baseTimestamp + 8000 + (i * 300)).toISOString(),
      blockNumber: BigInt(blockNumStr),
      commitState: 'Verified',
    });
  }

  // Handle multi-role validators (some validators might have participated in multiple stages)
  const allValidators = [proposer, ...voters, finalizer, ...verifiers];
  
  // Simulate some validators having multiple roles (e.g., a voter who also verified)
  if (seed % 3 === 0 && voters.length > 0 && verifiers.length > 0) {
    // Make the first voter also a verifier
    const multiRoleValidator = { ...voters[0] };
    multiRoleValidator.roles = ['Voter', 'Verifier'];
    multiRoleValidator.id = `multi-${blockNumStr}-0`;
    
    // Remove the original single-role entries and add the multi-role one
    allValidators.splice(1, 1); // Remove original voter
    allValidators.splice(-1, 1); // Remove original verifier
    allValidators.push(multiRoleValidator);
  }

  // Get real transaction count from blockchain
  let transactionCount = 0;
  let usingFallback = false;
  try {
    const rpcUrl = getRpcUrl();
    console.log(`Attempting to get transaction count for block ${blockNumStr} from ${rpcUrl}`);
    transactionCount = await getBlockTransactionCount(rpcUrl, blockNumStr);
    console.log(`✅ Block ${blockNumStr}: Found ${transactionCount} transactions from blockchain`);
  } catch (error) {
    console.error(`❌ Failed to get real transaction count for block ${blockNumStr}:`, error);
    // Fallback to deterministic mock data if RPC fails
    usingFallback = true;
    transactionCount = 50 + (seed % 100); // More deterministic fallback
    console.log(`🔄 Using fallback transaction count: ${transactionCount} for block ${blockNumStr}`);
  }

  return {
    blockNumber: BigInt(blockNumStr),
    validators: allValidators,
    transactionCount,
    consensusFlow: {
      proposer,
      voters,
      finalizer,
      verifiers,
    },
  };
}
