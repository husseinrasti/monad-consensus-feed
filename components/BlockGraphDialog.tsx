import React, { useState, useEffect, useCallback, useRef } from 'react';
import BlockGraphView from './BlockGraphView';
import { BlockState, BlockValidatorData, ValidatorInfo } from '@/types/blockStats';

interface BlockGraphDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blockNumber: string;
}

const BlockGraphDialog: React.FC<BlockGraphDialogProps> = ({
  isOpen,
  onClose,
  blockNumber,
}) => {
  const [blockState, setBlockState] = useState<BlockState>({});
  const [validatorData, setValidatorData] = useState<ValidatorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Fetch block validator data when dialog opens
  const fetchBlockValidatorData = useCallback(async (blockNum: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching validator data for block ${blockNum}...`);
      
      const response = await fetch(`/api/block/${blockNum}`);
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch validator data: ${response.statusText}`;
        
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

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside to close modal
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Fetch data when dialog opens and blockNumber changes
  useEffect(() => {
    if (isOpen && blockNumber) {
      fetchBlockValidatorData(blockNumber);
    }
  }, [isOpen, blockNumber, fetchBlockValidatorData]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setBlockState({});
      setValidatorData([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleBlockNumberClick = () => {
    if (blockNumber) {
      const url = `https://testnet.monadexplorer.com/block/${blockNumber}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-graph-title"
    >
      <div 
        ref={dialogRef}
        className="relative w-[95vw] h-[90vh] max-w-7xl bg-terminal-bg border-2 border-terminal-green/40 rounded-sm shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-terminal-green/20 bg-terminal-bg/95">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBlockNumberClick}
                className="text-xl md:text-2xl terminal-glow tracking-wide hover:text-cyan-400 transition-colors cursor-pointer"
                aria-label={`Block #${blockNumber} - Click to view on explorer`}
                id="block-graph-title"
              >
                BLOCK #{blockNumber}
              </button>
              {blockState.transactionCount && (
                <div className="text-sm text-terminal-green/80">
                  {blockState.transactionCount} transactions
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="text-2xl text-terminal-green/60 hover:text-terminal-green transition-colors p-2 hover:bg-terminal-green/10 rounded-sm"
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>
          
          {/* Description */}
          <div className="px-4 pb-4">
            <p className="text-xs md:text-sm text-terminal-green/70 text-left leading-relaxed">
              This graph visualizes the MonadBFT consensus process for the selected block. Each node represents a validator that participated in consensus. Validators are shown according to their role: proposer (blue), voters (orange), finalizer (red), and verifiers (green). The edges illustrate how the block progressed through different consensus states, from proposal to verification.
            </p>
          </div>
        </div>

        {/* Content - Scrollable Graph Container */}
        <div className="h-[calc(100%-7rem)] w-full overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl mb-4 text-terminal-green">Loading Block #{blockNumber} Data...</div>
                <div className="animate-spin w-8 h-8 border-2 border-terminal-green/30 border-t-terminal-green rounded-full mx-auto"></div>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-4">
                <div className="text-red-400 text-xl mb-4">Error Loading Block #{blockNumber}</div>
                <div className="text-gray-300 text-sm mb-6 bg-red-500/10 border border-red-500/30 rounded-sm p-4">
                  {error}
                </div>
                <button
                  onClick={() => fetchBlockValidatorData(blockNumber)}
                  className="px-4 py-2 border border-terminal-green/40 rounded-sm bg-terminal-bg/50 hover:bg-terminal-green/10 transition-colors text-terminal-green"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Graph Controls */}
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const graphView = document.getElementById('block-graph-view');
                      if (graphView) {
                        const event = new CustomEvent('graph-zoom-in');
                        graphView.dispatchEvent(event);
                      }
                    }}
                    className="w-8 h-8 text-sm bg-terminal-bg/80 border border-terminal-green/40 rounded-sm hover:bg-terminal-green/10 transition-colors text-terminal-green flex items-center justify-center"
                    title="Zoom in"
                  >
                    +
                  </button>
                  <button
                    onClick={() => {
                      const graphView = document.getElementById('block-graph-view');
                      if (graphView) {
                        const event = new CustomEvent('graph-zoom-out');
                        graphView.dispatchEvent(event);
                      }
                    }}
                    className="w-8 h-8 text-sm bg-terminal-bg/80 border border-terminal-green/40 rounded-sm hover:bg-terminal-green/10 transition-colors text-terminal-green flex items-center justify-center"
                    title="Zoom out"
                  >
                    −
                  </button>
                </div>
                <button
                  onClick={() => {
                    const graphView = document.getElementById('block-graph-view');
                    if (graphView) {
                      const event = new CustomEvent('graph-reset-zoom');
                      graphView.dispatchEvent(event);
                    }
                  }}
                  className="px-2 py-1 text-xs bg-terminal-bg/80 border border-terminal-green/40 rounded-sm hover:bg-terminal-green/10 transition-colors text-terminal-green"
                  title="Reset zoom and position"
                >
                  Reset
                </button>
              </div>
              <BlockGraphView
                blockNumber={blockNumber}
                blockState={blockState}
                validatorData={validatorData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockGraphDialog;
