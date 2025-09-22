import type { NextApiRequest, NextApiResponse } from 'next'
import { MonoPulse } from 'monopulse'

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

  // Flush headers
  res.write('\n')

  const rpcUrl = (process.env.RPC_URL || process.env.WS_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || '').trim()
  if (!rpcUrl) {
    res.write(`event: error\n`)
    res.write(`data: ${JSON.stringify({ message: 'RPC_URL is required. Set NEXT_PUBLIC_RPC_URL or RPC_URL.' })}\n\n`)
    res.end()
    return
  }

  let stopWatcher: WatcherStopFn | undefined
  let heartbeat: NodeJS.Timeout | undefined

  const mono = new MonoPulse({
    provider: 'ws',
    rpcUrl,
    logger: { level: (process.env.MONOPULSE_LOG_LEVEL as any) || 'info' },
  })

  const sendEvent = (event: string, data: unknown) => {
    try {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    } catch {
      // ignore write errors
    }
  }

  try {
    // Send meta (chainId) once
    try {
      const chainId = await mono.getChainId()
      sendEvent('meta', { chainId })
    } catch {
      // ignore
    }

    // Start streaming block stats (speculative feed)
    stopWatcher = await mono.watchBlockStats(
      (stats) => {
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

    // Heartbeat to keep connection alive
    heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n')
      } catch {
        // ignore
      }
    }, 15000)
  } catch (error: any) {
    sendEvent('error', { message: error?.message || 'Unknown error starting watcher' })
    res.end()
    return
  }

  // Cleanup on client disconnect
  req.on('close', () => {
    try {
      if (heartbeat) clearInterval(heartbeat)
      if (stopWatcher) stopWatcher()
    } catch {
      // ignore
    }
    res.end()
  })
}


