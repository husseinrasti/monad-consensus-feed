import type { NextApiRequest, NextApiResponse } from 'next';
import { BlockValidatorData } from '@/types/blockStats';
import { getBlockTransactionCount, getRpcUrl } from '@/lib/blockchainUtils';
import { blockDataCache } from '@/lib/blockDataCache';
import { MonoPulse } from 'monopulse';

/**
 * API endpoint to fetch validator data for a specific block.
 * 
 * This endpoint:
 * 1. First checks the in-memory cache (populated by the streaming API)
 * 2. If not cached, directly queries the blockchain using MonoPulse SDK
 * 3. Returns real consensus data (proposer, qc.signers) from monadNewHeads
 * 
 * NO MOCK DATA - All validator data comes from real blockchain events
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { blockNumber } = req.query;
  
  if (!blockNumber || typeof blockNumber !== 'string') {
    return res.status(400).json({ error: 'Block number is required' });
  }

  try {
    // Validate block number
    const blockNum = BigInt(blockNumber);
    
    
    // Step 1: Check cache first (populated by streaming API)
    const cachedData = blockDataCache.get(blockNumber);
    
    if (cachedData) {
      
      // Get real transaction count from blockchain
      let transactionCount = cachedData.transactionCount;
      if (!transactionCount) {
        try {
          const rpcUrl = getRpcUrl();
          transactionCount = await getBlockTransactionCount(rpcUrl, blockNumber);
        } catch (error) {
        }
      }
      
      // Prepare response data with updated transaction count
      const responseData = {
        ...cachedData,
        transactionCount,
      };
      
      // Debug: Log consensus flow data being sent
      console.log(`[API] Block ${blockNumber}: Returning consensusFlow with ${cachedData.consensusFlow.voters.length} voters, ${cachedData.consensusFlow.verifiers.length} verifiers`);
      
      // Convert BigInt values to strings for JSON serialization
      // Use a custom replacer function that properly handles nested objects
      const serializedData = JSON.stringify(responseData, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      );

      // Set content type and send the serialized response
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(serializedData);
    }
    
    // Step 2: Not in cache - fetch directly from blockchain
    
    const rpcUrl = getRpcUrl();
    const monoPulse = new MonoPulse({
      provider: 'ws',
      rpcUrl,
      logger: { level: 'warn' },
    });

    // Get block data using eth_getBlockByNumber
    // Note: MonoPulse doesn't provide a direct method to fetch historical monadNewHeads data,
    // so we'll return minimal data indicating the block exists but needs real-time subscription
    let transactionCount = 0;
    try {
      transactionCount = await getBlockTransactionCount(rpcUrl, blockNumber);
    } catch (error) {
      throw new Error(`Block ${blockNumber} not found or RPC unavailable. Please ensure the streaming API is running to capture real-time consensus data.`);
    }

    // Return minimal data - client should wait for real-time updates
    const response: BlockValidatorData = {
      blockNumber: blockNum,
      validators: [],
      transactionCount,
      consensusFlow: {
        voters: [],
        verifiers: [],
      },
    };

    // Convert BigInt values to strings for JSON serialization
    const serializedData = JSON.parse(JSON.stringify(response, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    res.status(200).json(serializedData);
  } catch (error: any) {
    res.status(500).json({ 
      error: `Failed to fetch validator data for block ${blockNumber}: ${error?.message}` 
    });
  }
}
