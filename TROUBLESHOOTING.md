# Troubleshooting Guide

## Recent Fixes (October 1, 2025)

### Issue 1: "unknown scheme" Error ❌→✅

**Problem:**
```
Error: unknown scheme
at makeRpcCall (lib/blockchainUtils.ts:30:26)
```

**Root Cause:**  
The code was trying to use `fetch()` with a WebSocket URL (`wss://`), but `fetch()` only works with HTTP/HTTPS URLs.

**Fix:**  
Modified `pages/api/stream.ts` to use `getRpcUrl()` which automatically converts:
- `wss://` → `https://`
- `ws://` → `http://`

```typescript
// Before (BROKEN)
const transactionCount = await getBlockTransactionCount(rpcUrl, ...);

// After (FIXED)
const httpRpcUrl = getRpcUrl(); // Converts wss:// to https://
const transactionCount = await getBlockTransactionCount(httpRpcUrl, ...);
```

---

### Issue 2: BigInt Serialization Error ❌→✅

**Problem:**
```
TypeError: Do not know how to serialize a BigInt
at JSON.stringify
at sendEvent (pages/api/stream.ts:50:31)
```

**Root Cause:**  
SSE events were trying to `JSON.stringify()` data containing BigInt values, which JavaScript doesn't support natively.

**Fix:**  
Added custom serializer to convert BigInt to string:

```typescript
// Before (BROKEN)
res.write(`data: ${JSON.stringify(data)}\n\n`)

// After (FIXED)
const serializedData = JSON.stringify(data, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
)
res.write(`data: ${serializedData}\n\n`)
```

---

### Issue 3: Empty Validator Data ⚠️

**Problem:**
```javascript
{
  "blockNumber": "40553429",
  "validators": [],  // Empty!
  "transactionCount": 22,
  "consensusFlow": { "voters": [], "verifiers": [] }
}
```

**Possible Causes:**

1. **MonoPulse SDK not returning consensus data**
   - Check logs for: `[Stream] Block XXX consensus data:`
   - Should show proposer and qcSigners count

2. **Transformation not working**
   - Check logs for: `[Stream] Block XXX validator count:`
   - Should show number of validators extracted

3. **Cache timing issue**
   - API endpoint might be called before cache is populated
   - Wait for streaming to start before opening graph view

---

## Debugging Steps

### 1. Check Server Logs

When you start `npm run dev`, look for these logs:

#### ✅ Good Output (Consensus Data Present)
```
[Stream] Block 40553429 consensus data: {
  proposer: '0x1234567890abcdef...',
  qcSigners: 5,
  commitState: 'Voted',
  hash: '0xabc123...'
}
[Stream] Block 40553429: 22 txs, state: Voted
[Stream] Block 40553429 validator count: 6
[Stream] Block 40553429 validator roles: [
  { address: '0x1234...', roles: ['Proposer'] },
  { address: '0x5678...', roles: ['Voter'] },
  ...
]
```

#### ⚠️ Bad Output (No Consensus Data)
```
[Stream] Block 40553429 consensus data: {
  proposer: 'null',
  qcSigners: 0,
  commitState: 'null',
  hash: 'null'
}
[Stream] Block 40553429 validator count: 0
```

### 2. Check RPC URL Configuration

Verify your environment variable:

```bash
# Should be WebSocket URL
echo $RPC_URL
# Output: wss://testnet-rpc.monad.xyz

# The code will automatically convert it to HTTPS for JSON-RPC calls
# Internal: https://testnet-rpc.monad.xyz
```

### 3. Test MonoPulse SDK Directly

Run the example to verify SDK is working:

```bash
RPC_URL=wss://testnet-rpc.monad.xyz npx ts-node --esm examples/consensusData.ts
```

Expected output:
```
📦 Block #40553429
👤 PROPOSER:
   Address:     0x1234567890abcdef...

🗳️  QUORUM CERTIFICATE (QC):
   Signers:     5 validators
```

---

## Common Issues

### Issue: "No validator data" in Graph View

**Symptoms:**
- Graph shows "No Validator Data"
- Console log shows empty validators array

**Solutions:**

1. **Wait for streaming to start**
   - The cache needs time to populate from real-time events
   - Wait 30-60 seconds after starting the app
   - Refresh the page after streaming starts

2. **Check if block is too old**
   - Cache only stores last 1000 blocks
   - Cache TTL is 1 hour
   - Try viewing a more recent block

3. **Verify consensus data is available**
   - Check server logs for consensus data
   - If all blocks show `proposer: 'null'`, the RPC might not support monadNewHeads
   - Try a different RPC endpoint

### Issue: "Connection refused" or WebSocket errors

**Symptoms:**
```
Error: connect ECONNREFUSED
Failed to initialize MonoPulse
```

**Solutions:**

1. **Verify RPC URL is correct**
   ```bash
   curl https://testnet-rpc.monad.xyz \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. **Check firewall/proxy settings**
   - Ensure WebSocket connections are allowed
   - Some corporate networks block WebSocket

3. **Try alternative RPC endpoint**
   - Use a different Monad RPC provider
   - Contact Monad team for recommended RPC URLs

---

## Performance Tips

### Reduce Log Verbosity

Set log level to reduce console noise:

```bash
MONOPULSE_LOG_LEVEL=error npm run dev
```

Levels: `debug` | `info` | `warn` | `error` | `silent`

### Cache Statistics

Check cache stats in server logs:

```typescript
// In your code
import { blockDataCache } from '@/lib/blockDataCache';
console.log(blockDataCache.getStats());
```

Output:
```javascript
{
  size: 150,           // Number of cached blocks
  maxSize: 1000,       // Maximum cache size
  oldestBlock: "40550000",
  newestBlock: "40553429"
}
```

---

## Need More Help?

### Check Documentation
- [CONSENSUS_DATA_MIGRATION.md](./CONSENSUS_DATA_MIGRATION.md) - Architecture details
- [examples/README.md](./examples/README.md) - Example usage

### Enable Debug Logging

1. Set environment variable:
   ```bash
   MONOPULSE_LOG_LEVEL=debug npm run dev
   ```

2. Check browser console for:
   - SSE connection status
   - Block updates
   - Validator data

3. Check server logs for:
   - MonoPulse SDK events
   - Cache operations
   - RPC calls

### Report Issues

If you've tried all troubleshooting steps:

1. **Collect logs**
   - Server console output
   - Browser console output
   - Network tab (WebSocket frames)

2. **Check MonoPulse SDK**
   - https://github.com/husseinrasti/mono-pulse/issues
   - Verify SDK version: `npm list monopulse`

3. **Verify Monad testnet status**
   - https://testnet.monadexplorer.com
   - Check if network is producing blocks

---

## Quick Reference

### Environment Variables
```bash
RPC_URL=wss://testnet-rpc.monad.xyz
MONOPULSE_LOG_LEVEL=info
```

### Start Development
```bash
npm run dev
```

### View Logs
```bash
# Server logs: terminal where you ran npm run dev
# Client logs: browser console (F12)
```

### Test Example
```bash
RPC_URL=wss://testnet-rpc.monad.xyz npx ts-node --esm examples/consensusData.ts
```

---

Last Updated: October 1, 2025


