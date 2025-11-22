import type { NextApiRequest, NextApiResponse } from 'next'
import { MonoPulse } from 'monopulse'
import { getBlockTransactionCount, getRpcUrl } from '@/lib/blockchainUtils'

type WatcherStopFn = () => void

// Ensure this API route runs in Node (not edge)
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  // Flush headers
  res.write('\n')

  // Validate environment variables (Vercel uses process.env directly)
  const rpcUrl = (
    process.env.RPC_URL || 
    process.env.WS_RPC_URL || 
    process.env.NEXT_PUBLIC_RPC_URL
  )?.trim()
  
  if (!rpcUrl) {
    const errorMsg = 'RPC URL is required. Please set RPC_URL, WS_RPC_URL, or NEXT_PUBLIC_RPC_URL in Vercel environment variables.'
    res.write(`event: error\n`)
    res.write(`data: ${JSON.stringify({ message: errorMsg })}\n\n`)
    res.end()
    return
  }


  let stopWatcher: WatcherStopFn | undefined
  let heartbeat: NodeJS.Timeout | undefined

  const sendEvent = (event: string, data: unknown) => {
    try {
      res.write(`event: ${event}\n`)
      // Convert BigInt to string for JSON serialization
      const serializedData = JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
      res.write(`data: ${serializedData}\n\n`)
    } catch (error) {
      // Failed to write SSE event
    }
  }


  let mono: any = null
  
  try {
    // Initialize MonoPulse with WebSocket provider for real-time monadNewHeads
    
    mono = new MonoPulse({
      provider: 'ws',
      rpcUrl,
      logger: { level: (process.env.MONOPULSE_LOG_LEVEL as any) || 'warn' },
    })

  } catch (error: any) {
    sendEvent('error', { message: `Failed to initialize MonoPulse: ${error?.message}` })
    res.end()
    return
  }

  try {
    // Send meta (chainId) once
    try {
      const chainId = await mono.getChainId()
      sendEvent('meta', { chainId })
    } catch (error: any) {
      sendEvent('meta', { chainId: null })
    }

    // Get HTTP RPC URL for transaction count queries (WebSocket URL converted to HTTP)
    const httpRpcUrl = getRpcUrl();

    // Start streaming block stats with real consensus data from MonoPulse SDK
    try {
      stopWatcher = await mono.watchBlockStats(
        async (stats: any) => {
          try {

            // Get real transaction count from blockchain using HTTP RPC
            let transactionCount: number | undefined;
            try {
              transactionCount = await getBlockTransactionCount(httpRpcUrl, stats.blockNumber.toString());
            } catch (error) {
              // Failed to get transaction count
            }
            
            // Store in cache for block-specific API requests
            const { blockDataCache } = await import('@/lib/blockDataCache');
            blockDataCache.set({ ...stats, timestamp: new Date().toISOString() }, transactionCount);
            
            // Get processed validator data from cache (already transformed)
            const validatorData = blockDataCache.get(stats.blockNumber.toString());
            
            // Convert bigint to string for SSE
            const blockStatsData = {
              blockNumber: stats.blockNumber ? stats.blockNumber.toString() : null,
              hash: stats.hash ?? null,
              blockId: stats.blockId ?? null,
              commitState: stats.commitState ?? null,
              proposer: stats.proposer ?? null,
              qcSignerCount: stats.qc?.signers?.length || 0,
              transactionCount,
            };
            
            console.log('blockStatsData', blockStatsData);

            sendEvent('blockStats', blockStatsData);
            
            // Also send block-specific validator event for graph view
            if (stats.blockNumber && validatorData) {
              const blockValidatorsPayload = {
                blockNumber: stats.blockNumber.toString(),
                validators: validatorData.validators,
                consensusFlow: validatorData.consensusFlow,
                commitState: stats.commitState,
                transactionCount,
                timestamp: new Date().toISOString(),
              };
              
              // Debug: Log consensus flow data
              console.log('blockValidatorsPayload', blockValidatorsPayload);

              sendEvent('blockValidators', blockValidatorsPayload);
            }
          } catch (error: any) {
            // Error processing block stats
          }
        },
        {
          feed: 'speculative',
          verifiedOnly: false,
        }
      )
    } catch (wsError: any) {
      sendEvent('error', { message: `Failed to start block watcher: ${wsError?.message}` })
      res.end()
      return
    }

    // Heartbeat to keep connection alive
    heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n')
      } catch {
        // ignore
      }
    }, 30000) // Increased to 30s for Vercel
    
  } catch (error: any) {
    sendEvent('error', { message: error?.message || 'Unknown error starting watcher' })
    res.end()
    return
  }

  // Note: Polling mode removed - all data now comes from real MonoPulse SDK subscriptions
  // The WebSocket connection to monadNewHeads provides real-time consensus data

  // Cleanup on client disconnect
  req.on('close', () => {
    try {
      if (heartbeat) {
        clearInterval(heartbeat)
      }
      if (stopWatcher) {
        stopWatcher()
      }
    } catch (error: any) {
      // Error during cleanup
    }
    res.end()
  })
}


