# MonadBlockStats Examples

This directory contains examples demonstrating real consensus data from MonoPulse SDK v1.2.0.

## Prerequisites

1. Node.js >= 18
2. MonoPulse SDK v1.2.0 or higher
3. Access to a Monad testnet RPC endpoint (WebSocket)

## Setup

```bash
# Install dependencies
npm install

# Set your RPC URL
export RPC_URL=wss://your-monad-testnet-rpc
```

## Examples

### consensusData.ts

Demonstrates how to subscribe to real-time consensus data from `monadNewHeads` and extract validator information.

**Features:**
- Subscribe to speculative block headers
- Extract proposer and QC signers
- Build validator participation graphs
- Track consensus state progression

**Run:**
```bash
RPC_URL=wss://your-monad-testnet-rpc npx ts-node --esm examples/consensusData.ts
```

**Output:**
- Real-time block data with proposer and voter addresses
- Quorum Certificate (QC) signer lists
- Consensus flow visualization
- Aggregated validator statistics

## Real Data Fields

All examples use **real consensus data** from the MonoPulse SDK:

| Field | Type | Description |
|-------|------|-------------|
| `blockNumber` | bigint | Block number |
| `hash` | Hex \| null | Block hash |
| `blockId` | string \| null | Unique proposal ID |
| `commitState` | "Proposed" \| "Voted" \| "Finalized" \| "Verified" | Consensus state |
| `proposer` | Address \| null | Block proposer address |
| `qc.signers` | Address[] | Validator addresses who signed the QC |
| `qc.signatures` | Hex[] | Cryptographic signatures |
| `rawHeader` | Record<string, any> | Full raw header for custom parsing |

## Use Cases

These examples demonstrate how to:

1. **Build Consensus Explorers**: Visualize block proposals and validator votes
2. **Track Validator Performance**: Monitor proposals and votes per validator
3. **Analyze Network Health**: Calculate QC completion rates and validator participation
4. **Create Real-Time Dashboards**: Display live consensus data with state progression

## Notes

- **No Mock Data**: All validator data comes from real blockchain events via MonoPulse SDK
- **Speculative Feed**: Examples use `feed: 'speculative'` for real-time updates
- **State Progression**: Consensus states progress cumulatively (Proposed → Voted → Finalized → Verified)

## Troubleshooting

### "Connection refused" or "ECONNREFUSED"
Ensure your RPC_URL is correct and accessible.

### "No proposer data"
Some blocks may not include proposer data depending on the consensus state. Wait for more blocks.

### "No QC data"
QC data appears when blocks reach the voting stage. Ensure you're using `feed: 'speculative'` to capture early-stage blocks.

## References

- [MonoPulse SDK Documentation](https://github.com/husseinrasti/mono-pulse)
- [MonoPulse v1.2.0 Consensus Fields](https://github.com/husseinrasti/mono-pulse/blob/main/README.md#consensus-data-proposer--quorum-certificates)


