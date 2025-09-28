// Utility functions for fetching blockchain data
interface RpcResponse<T = any> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

interface BlockData {
  number: string;
  hash: string;
  transactions: string[] | Array<{
    hash: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Make a JSON-RPC call to the blockchain
 */
async function makeRpcCall<T = any>(
  rpcUrl: string,
  method: string,
  params: any[] = []
): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
  }

  const data: RpcResponse<T> = await response.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message} (code: ${data.error.code})`);
  }

  if (data.result === undefined) {
    throw new Error('RPC response missing result');
  }

  return data.result;
}

/**
 * Get transaction count for a specific block using eth_getBlockTransactionCountByNumber
 */
export async function getBlockTransactionCount(
  rpcUrl: string,
  blockNumber: string | number
): Promise<number> {
  try {
    // Convert block number to hex if it's a number
    const blockParam = typeof blockNumber === 'number' 
      ? `0x${blockNumber.toString(16)}` 
      : `0x${parseInt(blockNumber).toString(16)}`;

    const result = await makeRpcCall<string>(
      rpcUrl,
      'eth_getBlockTransactionCountByNumber',
      [blockParam]
    );

    // Convert hex result to decimal
    return parseInt(result, 16);
  } catch (error) {
    console.error(`Failed to get transaction count for block ${blockNumber}:`, error);
    throw error;
  }
}

/**
 * Get full block data using eth_getBlockByNumber
 */
export async function getBlockByNumber(
  rpcUrl: string,
  blockNumber: string | number,
  includeTransactions: boolean = false
): Promise<BlockData> {
  try {
    // Convert block number to hex if it's a number
    const blockParam = typeof blockNumber === 'number' 
      ? `0x${blockNumber.toString(16)}` 
      : `0x${parseInt(blockNumber).toString(16)}`;

    const result = await makeRpcCall<BlockData>(
      rpcUrl,
      'eth_getBlockByNumber',
      [blockParam, includeTransactions]
    );

    return result;
  } catch (error) {
    console.error(`Failed to get block data for block ${blockNumber}:`, error);
    throw error;
  }
}

/**
 * Get transaction count from block data (more efficient if you already have the block)
 */
export function getTransactionCountFromBlock(blockData: BlockData): number {
  if (!blockData.transactions) {
    return 0;
  }

  // Handle both transaction hash arrays and full transaction objects
  return Array.isArray(blockData.transactions) ? blockData.transactions.length : 0;
}

/**
 * Get RPC URL from environment variables and convert WebSocket to HTTP if needed
 */
export function getRpcUrl(): string {
  let rpcUrl = (
    process.env.RPC_URL || 
    process.env.WS_RPC_URL || 
    process.env.NEXT_PUBLIC_RPC_URL
  )?.trim();
  
  if (!rpcUrl) {
    throw new Error('RPC URL is required. Please set RPC_URL, WS_RPC_URL, or NEXT_PUBLIC_RPC_URL in environment variables.');
  }

  // Convert WebSocket URLs to HTTP for JSON-RPC calls
  if (rpcUrl.startsWith('wss://')) {
    rpcUrl = rpcUrl.replace('wss://', 'https://');
  } else if (rpcUrl.startsWith('ws://')) {
    rpcUrl = rpcUrl.replace('ws://', 'http://');
  }

  return rpcUrl;
}
