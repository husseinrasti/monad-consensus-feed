/**
 * Example: Real Consensus Data from MonoPulse SDK v1.2.0
 * 
 * Demonstrates how to subscribe to real-time consensus data and build a validator graph.
 * 
 * This example shows:
 * - Subscribing to monadNewHeads with speculative feed
 * - Extracting proposer and QC signers from BlockStats
 * - Building validator graphs with real consensus data
 * - Tracking state progression (Proposed → Voted → Finalized → Verified)
 * 
 * Run with:
 * RPC_URL=wss://your-monad-testnet-rpc npx ts-node --esm examples/consensusData.ts
 */

import { MonoPulse } from 'monopulse';
import type { BlockStats, QuorumCertificate, Address } from '../types/blockStats';

// Ensure RPC_URL is set
const rpcUrl = process.env.RPC_URL || process.env.WS_RPC_URL;
if (!rpcUrl) {
  console.error('❌ RPC_URL environment variable is required');
  process.exit(1);
}

console.log('🚀 Starting MonoPulse Consensus Data Example...\n');
console.log('📡 Connecting to:', rpcUrl.replace(/\/\/.*@/, '//***@'));
console.log('🔍 Feed mode: speculative (real-time consensus updates)\n');

// Initialize MonoPulse SDK
const sdk = new MonoPulse({
  provider: 'ws',
  rpcUrl,
  logger: { level: 'warn' },
});

// Track statistics
let blockCount = 0;
let proposerCount = 0;
let qcCount = 0;
let totalSigners = 0;

// Track validator participation
const validatorStats = new Map<Address, {
  proposals: number;
  votes: number;
  lastSeen: string;
}>();

/**
 * Process a block and extract consensus data
 */
const processBlock = (stats: BlockStats) => {
  blockCount++;
  
  const {
    blockNumber,
    hash,
    blockId,
    commitState,
    proposer,
    qc,
    rawHeader,
  } = stats;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📦 Block #${blockNumber.toString()}`);
  console.log(`${'='.repeat(80)}`);
  
  // Block metadata
  if (hash) {
    console.log(`🔗 Hash:        ${hash}`);
  }
  if (blockId) {
    console.log(`🆔 Block ID:    ${blockId}`);
  }
  console.log(`📊 State:       ${commitState || 'Unknown'}`);
  
  // Proposer data
  if (proposer) {
    proposerCount++;
    console.log(`\n👤 PROPOSER:`);
    console.log(`   Address:     ${proposer}`);
    
    // Track proposer stats
    const stats = validatorStats.get(proposer) || { proposals: 0, votes: 0, lastSeen: '' };
    stats.proposals++;
    stats.lastSeen = new Date().toISOString();
    validatorStats.set(proposer, stats);
  } else {
    console.log(`\n⚠️  No proposer data (may be pending)`);
  }
  
  // QC (Quorum Certificate) data
  if (qc && qc.signers && qc.signers.length > 0) {
    qcCount++;
    totalSigners += qc.signers.length;
    
    console.log(`\n🗳️  QUORUM CERTIFICATE (QC):`);
    console.log(`   Signers:     ${qc.signers.length} validators`);
    console.log(`   Signatures:  ${qc.signatures?.length || 0}`);
    
    console.log(`\n   Voter Addresses:`);
    qc.signers.forEach((signer, index) => {
      console.log(`     ${index + 1}. ${signer}`);
      
      // Track voter stats
      const stats = validatorStats.get(signer) || { proposals: 0, votes: 0, lastSeen: '' };
      stats.votes++;
      stats.lastSeen = new Date().toISOString();
      validatorStats.set(signer, stats);
    });
    
    // Show validator graph structure
    console.log(`\n   📊 Consensus Flow:`);
    if (proposer) {
      console.log(`      Proposer: ${proposer}`);
      console.log(`      └─> Voters: ${qc.signers.length} signers`);
      qc.signers.forEach((signer, index) => {
        const prefix = index === qc.signers.length - 1 ? '          └─>' : '          ├─>';
        console.log(`${prefix} ${signer}`);
      });
    }
  } else {
    console.log(`\n⚠️  No QC data (block may not have reached voting stage)`);
  }
  
  // Raw header (for debugging)
  if (rawHeader && Object.keys(rawHeader).length > 0) {
    console.log(`\n🔍 Raw Header Fields: ${Object.keys(rawHeader).join(', ')}`);
  }
  
  // Show running statistics every 10 blocks
  if (blockCount % 10 === 0) {
    showStatistics();
  }
};

/**
 * Show aggregated statistics
 */
const showStatistics = () => {
  console.log(`\n\n${'═'.repeat(80)}`);
  console.log(`📈 STATISTICS (${blockCount} blocks processed)`);
  console.log(`${'═'.repeat(80)}`);
  
  console.log(`\n📊 Block Data:`);
  console.log(`   Total blocks:          ${blockCount}`);
  console.log(`   Blocks with proposer:  ${proposerCount} (${(proposerCount / blockCount * 100).toFixed(1)}%)`);
  console.log(`   Blocks with QC:        ${qcCount} (${(qcCount / blockCount * 100).toFixed(1)}%)`);
  console.log(`   Avg signers per QC:    ${qcCount > 0 ? (totalSigners / qcCount).toFixed(1) : 'N/A'}`);
  
  console.log(`\n👥 Validator Participation:`);
  console.log(`   Unique validators:     ${validatorStats.size}`);
  
  // Show top 5 most active validators
  const sortedValidators = Array.from(validatorStats.entries())
    .sort((a, b) => (b[1].proposals + b[1].votes) - (a[1].proposals + a[1].votes))
    .slice(0, 5);
  
  if (sortedValidators.length > 0) {
    console.log(`\n   Top 5 Most Active:`);
    sortedValidators.forEach(([address, stats], index) => {
      const total = stats.proposals + stats.votes;
      console.log(`     ${index + 1}. ${address}`);
      console.log(`        Proposals: ${stats.proposals}, Votes: ${stats.votes}, Total: ${total}`);
    });
  }
  
  console.log(`\n${'═'.repeat(80)}\n`);
};

/**
 * Start watching blocks
 */
const startWatching = async () => {
  try {
    // Get chain ID
    const chainId = await sdk.getChainId();
    console.log(`✅ Connected to chain ID: ${chainId}\n`);
    
    // Subscribe to block stats with speculative feed
    const stopWatcher = await sdk.watchBlockStats(
      (stats: BlockStats) => {
        try {
          processBlock(stats);
        } catch (error) {
          console.error('❌ Error processing block:', error);
        }
      },
      {
        feed: 'speculative',  // Real-time speculative updates
        verifiedOnly: false,  // Include unverified blocks
      }
    );
    
    console.log('✅ MonoPulse block watcher started');
    console.log('⏳ Waiting for blocks...\n');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down...');
      stopWatcher();
      showStatistics();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start watcher:', error);
    process.exit(1);
  }
};

// Start the example
startWatching().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


