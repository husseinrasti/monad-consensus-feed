# Monad BlockStats Dashboard

A real-time blockchain statistics dashboard for the Monad network, built with Next.js, TypeScript, and the MonoPulse SDK v1.2.0.

## 🎯 Features

### Real Consensus Data (MonoPulse v1.2.0)
- **🔐 Real Validator Addresses**: Actual proposer and QC signer addresses from blockchain
- **📊 Consensus Visualization**: Interactive graph showing proposer → voters → finalizer → verifiers
- **🗳️ Quorum Certificates**: Display real QC signers and signatures for each block
- **🔄 Live State Progression**: Track blocks from Proposed → Voted → Finalized → Verified
- **📈 Validator Participation**: Multi-role validator support with address deduplication

### Dashboard & Streaming
- **Real-time Block Streaming**: Live updates via `monadNewHeads` subscription
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

## Deployment

### Vercel Deployment

This project is optimized for Vercel deployment. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

**Quick Deploy:**
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `RPC_URL=wss://your-monad-testnet-rpc-url`
4. Deploy!

**Using the deployment script:**
```bash
./scripts/deploy.sh
```

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `RPC_URL` | Monad WebSocket RPC endpoint | Yes | `wss://monad-testnet-rpc.example.com` |
| `MONOPULSE_LOG_LEVEL` | Logging level for MonoPulse SDK | No | `warn` |

## 📊 Real Consensus Data

This application uses **real consensus data** from MonoPulse SDK v1.2.0:

### Data Sources
- **Proposer**: Real block proposer address from `monadNewHeads`
- **QC Signers**: Actual validator addresses who signed the Quorum Certificate
- **QC Signatures**: Cryptographic signatures from validators
- **Commit State**: Real consensus state progression
- **Block Hash**: Actual block hash from blockchain

### Validator Graph
The graph visualization uses real consensus data to show:
- **Nodes**: Validators with their actual addresses and roles
- **Edges**: Consensus flow from proposer → voters → finalizer → verifiers
- **Multi-role**: Same validator can have multiple roles (deduplicated by address)

### Architecture
```
monadNewHeads → MonoPulse SDK → Cache → API → Graph View
     ↓              ↓               ↓       ↓        ↓
Real-time    proposer, qc.signers  Store  Serve  Visualize
```

## 📚 Examples

See the `examples/` directory for standalone examples:

### Consensus Data Example
```bash
# Run the example
RPC_URL=wss://testnet-rpc.monad.xyz npx ts-node --esm examples/consensusData.ts
```

This example demonstrates:
- Subscribe to real-time consensus data
- Extract proposer and QC signers
- Build validator participation graphs
- Track consensus state progression

See `examples/README.md` for more details.

## 📖 Documentation

- **[CONSENSUS_DATA_MIGRATION.md](./CONSENSUS_DATA_MIGRATION.md)**: Detailed migration documentation
- **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)**: Migration summary and checklist
- **[examples/README.md](./examples/README.md)**: Example usage documentation
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Deployment instructions
- **[MonoPulse SDK Docs](https://github.com/husseinrasti/mono-pulse)**: MonoPulse SDK reference

## License

MIT License - see LICENSE file for details.
