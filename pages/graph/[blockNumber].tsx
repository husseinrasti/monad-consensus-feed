import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import BlockGraphView from '../../components/BlockGraphView';
import { BlockState, BlockValidatorData, ValidatorInfo, BlockStats } from '@/types/blockStats';

const GraphPage: React.FC = () => {
  const router = useRouter();
  const { blockNumber } = router.query;
  const [blockState, setBlockState] = useState<BlockState>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [validatorData, setValidatorData] = useState<ValidatorInfo[]>([]);
  const [blockValidatorData, setBlockValidatorData] = useState<BlockValidatorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleBlockStatsUpdate = useCallback((stats: BlockStats) => {
    const { blockNumber: statsBlockNumber, commitState, validators, transactionCount } = stats;
    
    // Only update if this is the block we're watching
    if (blockNumber && statsBlockNumber.toString() === blockNumber.toString()) {
      if (commitState) {
        setBlockState(prevState => ({
          ...prevState,
          [commitState]: true,
          ...(transactionCount !== undefined && { transactionCount }),
        }));

        // Update validator data if provided
        if (validators && Array.isArray(validators)) {
          setValidatorData(validators);
        }
      }
    }
  }, [blockNumber]);

  const handleBlockValidatorUpdate = useCallback((data: any) => {
    const { blockNumber: dataBlockNumber, validators, commitState, transactionCount } = data;
    
    // Only update if this is the block we're watching
    if (blockNumber && dataBlockNumber === blockNumber.toString()) {
      if (validators && Array.isArray(validators)) {
        setValidatorData(validators);
        
        // Update block state based on the latest commit state
        if (commitState) {
          setBlockState(prevState => ({
            ...prevState,
            [commitState]: true,
            ...(transactionCount !== undefined && { transactionCount }),
          }));
        }
      }
    }
  }, [blockNumber]);

  // Fetch initial block validator data
  const fetchBlockValidatorData = useCallback(async (blockNum: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching validator data for block ${blockNum}...`);
      
      const response = await fetch(`/api/block/${blockNum}`);
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch validator data: ${response.statusText}`;
        
        // Try to get more detailed error from response
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Ignore JSON parsing errors, use the original message
        }
        
        throw new Error(errorMessage);
      }
      
      const data: any = await response.json();
      console.log(`Successfully fetched validator data for block ${blockNum}:`, data);
      
      // Convert string blockNumbers back to BigInt for type compatibility
      const processedData: BlockValidatorData = {
        ...data,
        blockNumber: BigInt(data.blockNumber),
        validators: data.validators.map((v: any) => ({
          ...v,
          blockNumber: BigInt(v.blockNumber)
        })),
        consensusFlow: {
          proposer: data.consensusFlow.proposer ? { ...data.consensusFlow.proposer, blockNumber: BigInt(data.consensusFlow.proposer.blockNumber) } : undefined,
          voters: data.consensusFlow.voters.map((v: any) => ({ ...v, blockNumber: BigInt(v.blockNumber) })),
          finalizer: data.consensusFlow.finalizer ? { ...data.consensusFlow.finalizer, blockNumber: BigInt(data.consensusFlow.finalizer.blockNumber) } : undefined,
          verifiers: data.consensusFlow.verifiers.map((v: any) => ({ ...v, blockNumber: BigInt(v.blockNumber) })),
        },
      };
      
      setBlockValidatorData(processedData);
      setValidatorData(processedData.validators);
      
      // Set initial block state based on available validators
      const newBlockState: BlockState = {};
      if (processedData.consensusFlow.proposer) newBlockState.Proposed = true;
      if (processedData.consensusFlow.voters.length > 0) newBlockState.Voted = true;
      if (processedData.consensusFlow.finalizer) newBlockState.Finalized = true;
      if (processedData.consensusFlow.verifiers.length > 0) newBlockState.Verified = true;
      if (processedData.transactionCount !== undefined) newBlockState.transactionCount = processedData.transactionCount;
      
      setBlockState(newBlockState);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching block validator data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('MonoPulse Error:', error);
    setConnectionStatus('error');
  }, []);

  // Initial data fetching
  useEffect(() => {
    if (blockNumber && typeof blockNumber === 'string') {
      fetchBlockValidatorData(blockNumber);
    }
  }, [blockNumber, fetchBlockValidatorData]);

  // Real-time updates
  useEffect(() => {
    if (!blockNumber) return;

    let isMounted = true;
    setConnectionStatus('connecting');

    const es = new EventSource('/api/stream');
    eventSourceRef.current = es;

    es.addEventListener('blockStats', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data) as { 
          blockNumber?: string; 
          blockId?: string | null; 
          commitState?: BlockStats['commitState'];
          validators?: any[];
        };
        const bn = data.blockNumber ? BigInt(data.blockNumber) : undefined;
        if (bn && data.commitState) {
          handleBlockStatsUpdate({
            blockNumber: bn,
            blockId: data.blockId ?? null,
            commitState: data.commitState ?? null,
            validators: data.validators,
          });
        }
        if (isMounted) setConnectionStatus('connected');
      } catch (error) {
        handleError(error as Error);
      }
    });

    es.addEventListener('blockValidators', (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        handleBlockValidatorUpdate(data);
        if (isMounted) setConnectionStatus('connected');
      } catch (error) {
        handleError(error as Error);
      }
    });

    es.addEventListener('error', (evt: MessageEvent) => {
      try {
        const data = JSON.parse((evt as any).data || '{}');
        handleError(new Error(data.message || 'SSE error'));
      } catch {
        handleError(new Error('SSE error'));
      }
    });

    es.onerror = () => {
      if (!isMounted) return;
      setConnectionStatus('error');
    };

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionStatus('disconnected');
    };
  }, [blockNumber, handleBlockStatsUpdate, handleBlockValidatorUpdate, handleError]);

  const handleBlockNumberClick = () => {
    if (blockNumber) {
      const url = `https://testnet.monadexplorer.com/block/${blockNumber}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!blockNumber) {
    return (
      <div className="h-screen w-screen bg-terminal-bg text-terminal-green font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Invalid Block Number</div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 border border-terminal-green/40 rounded-sm bg-terminal-bg/50 hover:bg-terminal-green/10 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Block #{blockNumber} - Graph View | MonadBFT Live</title>
          <meta name="description" content={`Graph view for block #${blockNumber} on Monad blockchain`} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/monad-logo.png" />
        </Head>

        <main className="h-screen w-screen bg-terminal-bg text-terminal-green font-mono flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl mb-4">Loading Block #{blockNumber} Data...</div>
            <div className="animate-spin w-8 h-8 border-2 border-terminal-green/30 border-t-terminal-green rounded-full mx-auto"></div>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Block #{blockNumber} - Error | MonadBFT Live</title>
          <meta name="description" content={`Error loading block #${blockNumber} on Monad blockchain`} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/monad-logo.png" />
        </Head>

        <main className="h-screen w-screen bg-terminal-bg text-terminal-green font-mono flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-4">
            <div className="text-red-400 text-xl mb-4">Error Loading Block #{blockNumber}</div>
            <div className="text-gray-300 text-sm mb-6 bg-red-500/10 border border-red-500/30 rounded-sm p-4">
              {error}
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => fetchBlockValidatorData(blockNumber.toString())}
                className="px-4 py-2 border border-terminal-green/40 rounded-sm bg-terminal-bg/50 hover:bg-terminal-green/10 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 border border-gray-400/40 rounded-sm bg-terminal-bg/50 hover:bg-gray-400/10 transition-colors text-gray-300"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Block #{blockNumber} - Graph View | MonadBFT Live</title>
        <meta name="description" content={`Graph view for block #${blockNumber} on Monad blockchain`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/monad-logo.png" />
      </Head>

      <main className="h-screen w-screen bg-terminal-bg text-terminal-green font-mono overflow-hidden">
        {/* Block Number Header */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 text-center">
          <button
            onClick={handleBlockNumberClick}
            className="text-2xl md:text-3xl lg:text-4xl terminal-glow tracking-wide hover:text-cyan-400 transition-colors cursor-pointer block"
            aria-label={`Block #${blockNumber} - Click to view on explorer`}
          >
            BLOCK #{blockNumber}
          </button>
          {blockState.transactionCount && (
            <div className="text-sm md:text-base text-terminal-green/80 mt-1">
              {blockState.transactionCount} transactions
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => router.push('/')}
            className="px-3 py-2 text-sm border border-terminal-green/40 rounded-sm bg-terminal-bg/50 hover:bg-terminal-green/10 transition-colors"
            aria-label="Back to dashboard"
          >
            ← Back
          </button>
        </div>

        {/* Graph View */}
        <div className="h-full w-full pt-16">
          <BlockGraphView
            blockNumber={blockNumber.toString()}
            blockState={blockState}
            validatorData={validatorData}
          />
        </div>
      </main>
    </>
  );
};

export default GraphPage;
