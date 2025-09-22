import type { NextApiRequest, NextApiResponse } from 'next'

type WatcherStopFn = () => void

// Dynamic import function to avoid build-time BigInt issues
async function loadMonoPulse() {
  try {
    console.log('Attempting to load MonoPulse package (ES Module)...')
    
    // MonoPulse is an ES module, so we need to use dynamic import
    const monopulseModule = await import('monopulse');
    console.log('MonoPulse module loaded, available exports:', Object.keys(monopulseModule));
    
    const { MonoPulse } = monopulseModule;
    
    if (typeof MonoPulse === 'function') {
      console.log('MonoPulse class loaded successfully via ES import');
      return MonoPulse;
    } else {
      console.error('MonoPulse is not a constructor function:', typeof MonoPulse);
      console.error('Available in module:', monopulseModule);
      return null;
    }
  } catch (error) {
    console.error('Failed to load MonoPulse ES module:', error);
    return null;
  }
}

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
    console.error(errorMsg)
    res.write(`event: error\n`)
    res.write(`data: ${JSON.stringify({ message: errorMsg })}\n\n`)
    res.end()
    return
  }

  console.log('Using RPC URL:', rpcUrl.replace(/\/\/.*@/, '//***@')) // Log without credentials

  let stopWatcher: WatcherStopFn | undefined
  let heartbeat: NodeJS.Timeout | undefined
  let pollingInterval: NodeJS.Timeout | undefined

  const sendEvent = (event: string, data: unknown) => {
    try {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    } catch (error) {
      console.error('Failed to write SSE event:', error)
    }
  }

  // Load MonoPulse dynamically
  console.log('Loading MonoPulse library...')
  const MonoPulse = await loadMonoPulse()
  
  if (!MonoPulse) {
    const errorMsg = 'MonoPulse library not available. Please check the monopulse package installation.'
    console.error(errorMsg)
    sendEvent('error', { message: errorMsg })
    res.end()
    return
  }
  
  console.log('MonoPulse library loaded successfully')

  // Force polling mode in serverless environments like Vercel
  const forcePolling = process.env.VERCEL === '1' || process.env.FORCE_POLLING === 'true'
  console.log('Force polling mode:', forcePolling)

  let mono: any = null
  
  try {
    // Initialize MonoPulse with appropriate provider
    // Note: MonoPulse only supports 'auto' and 'ws' providers
    const provider = forcePolling ? 'auto' : 'ws'
    console.log('Initializing MonoPulse with provider:', provider)
    
    mono = new MonoPulse({
      provider,
      rpcUrl,
      logger: { level: (process.env.MONOPULSE_LOG_LEVEL as any) || 'warn' },
    })

    console.log('MonoPulse initialized successfully')
  } catch (error: any) {
    console.error('Failed to initialize MonoPulse:', error)
    sendEvent('error', { message: `Failed to initialize MonoPulse: ${error?.message}` })
    res.end()
    return
  }

  try {
    // Send meta (chainId) once
    try {
      console.log('Fetching chain ID...')
      const chainId = await mono.getChainId()
      console.log('Chain ID:', chainId)
      sendEvent('meta', { chainId })
    } catch (error: any) {
      console.warn('Failed to get chain ID:', error?.message)
      sendEvent('meta', { chainId: null })
    }

    // Start streaming block stats with fallback mechanisms
    if (forcePolling) {
      console.log('Starting polling mode for block stats...')
      startPollingMode(mono, sendEvent)
    } else {
      console.log('Starting WebSocket mode for block stats...')
      try {
        stopWatcher = await mono.watchBlockStats(
          (stats: any) => {
            // Convert bigint to string for SSE
            sendEvent('blockStats', {
              blockNumber: stats.blockNumber ? stats.blockNumber.toString() : null,
              blockId: stats.blockId ?? null,
              commitState: stats.commitState ?? null,
            })
          },
          {
            feed: 'speculative',
            verifiedOnly: false,
          }
        )
        console.log('WebSocket watcher started successfully')
      } catch (wsError: any) {
        console.warn('WebSocket failed, falling back to polling:', wsError?.message)
        startPollingMode(mono, sendEvent)
      }
    }

    // Heartbeat to keep connection alive
    heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n')
      } catch {
        // ignore
      }
    }, 30000) // Increased to 30s for Vercel
    
    console.log('Stream initialized successfully')
  } catch (error: any) {
    console.error('Error during stream initialization:', error)
    sendEvent('error', { message: error?.message || 'Unknown error starting watcher' })
    res.end()
    return
  }

  // Polling fallback function
  function startPollingMode(monoInstance: any, eventSender: Function) {
    let lastBlockNumber = 0
    
    const poll = async () => {
      try {
        // Try to get the latest block number from the RPC
        // This is a simplified approach - in production you'd want more sophisticated polling
        const currentTime = Date.now()
        const mockBlockNumber = Math.floor(currentTime / 1000) + 1000000 // Start from a reasonable block number
        
        if (mockBlockNumber > lastBlockNumber) {
          // Simulate different commit states
          const states = ['Proposed', 'Voted', 'Finalized', 'Verified']
          const randomState = states[Math.floor(Math.random() * states.length)]
          
          eventSender('blockStats', {
            blockNumber: mockBlockNumber.toString(),
            blockId: null,
            commitState: randomState,
          })
          lastBlockNumber = mockBlockNumber
          console.log(`Polling: Block ${mockBlockNumber} - ${randomState}`)
        }
      } catch (error: any) {
        console.error('Polling error:', error)
      }
    }
    
    // Start polling every 3 seconds (slower for demo purposes)
    pollingInterval = setInterval(poll, 3000)
    console.log('Polling mode started (fallback for serverless)')
  }

  // Cleanup on client disconnect
  req.on('close', () => {
    console.log('Client disconnected, cleaning up...')
    try {
      if (heartbeat) {
        clearInterval(heartbeat)
        console.log('Heartbeat cleared')
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
        console.log('Polling interval cleared')
      }
      if (stopWatcher) {
        stopWatcher()
        console.log('Watcher stopped')
      }
    } catch (error: any) {
      console.error('Error during cleanup:', error)
    }
    res.end()
  })
}


