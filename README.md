# Monad BlockStats Dashboard

A real-time blockchain statistics dashboard for the Monad network, built with Next.js, TypeScript, and the MonoPulse SDK.

## Features

- **Real-time Block Streaming**: Live updates of block commit states (Proposed, Voted, Finalized, Verified)
- **Hybrid UI**: Table view for recent blocks and terminal-style log view for chronological updates
- **Speculative Feed**: Uses MonoPulse SDK's speculative feed for fastest updates
- **Terminal Theme**: Dark hacker-style interface with monospace fonts and green highlights
- **Auto-scroll Logs**: Terminal log with blinking cursor and auto-scroll functionality
- **Connection Status**: Real-time connection status and chain ID display

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy the example environment file and update with your Monad RPC URL:
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and set your Monad WebSocket RPC URL:
   ```env
   NEXT_PUBLIC_RPC_URL=wss://your-monad-rpc-endpoint.com
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Open Application**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Architecture

### Components

- **`pages/index.tsx`**: Main dashboard page with MonoPulse integration
- **`components/BlockStatsTable.tsx`**: Table view showing recent blocks and their commit states
- **`components/TerminalLog.tsx`**: Terminal-style log view with auto-scroll
- **`lib/monoPulseClient.ts`**: MonoPulse SDK wrapper with connection management
- **`types/blockStats.ts`**: TypeScript type definitions

### MonoPulse Integration

The application uses the MonoPulse SDK to connect to the Monad network:

- **Real-time Streaming**: `watchBlockStats` with speculative feed
- **Connection Management**: Automatic reconnection and error handling  
- **Clean Shutdown**: Proper cleanup on component unmount
- **No Polling**: Pure event-driven updates via WebSocket

### Block Commit States

The dashboard tracks four commit states for each block:
- **Proposed (P)**: Block has been proposed
- **Voted (V)**: Block has received votes
- **Finalized (F)**: Block has been finalized
- **Verified (Ver)**: Block has been verified

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_RPC_URL` | Monad WebSocket RPC endpoint (client-side) | Yes |
| `RPC_URL` | Monad WebSocket RPC endpoint (server-side fallback) | No |
| `MONOPULSE_LOG_LEVEL` | SDK log level (silent, error, warn, info, debug) | No |

## Development

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom terminal theme
- **SDK**: MonoPulse SDK for Monad blockchain integration
- **State Management**: React hooks with proper cleanup

## Production Deployment

1. Set environment variables in your deployment platform
2. Build the application: `npm run build`
3. Start the production server: `npm start`

## Troubleshooting

### Connection Issues
- Verify your `NEXT_PUBLIC_RPC_URL` is correct and accessible
- Check network connectivity to the Monad endpoint
- Monitor browser console for WebSocket connection errors

### Performance
- The application limits logs to the last 100 entries
- Block table shows the most recent 100 blocks
- Auto-scroll can be disabled by manually scrolling up in the log view

## License

MIT License - see LICENSE file for details.
