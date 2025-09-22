import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BlockState } from '@/types/blockStats';

interface BlockStatsTableProps {
  blocks: Map<bigint, BlockState>;
}

type CommitIndex = 0 | 1 | 2 | 3; // 0=Proposed,1=Voted,2=Finalized,3=Verified

const stateToIndex = (state: BlockState): CommitIndex => {
  if (state.Verified) return 3;
  if (state.Finalized) return 2;
  if (state.Voted) return 1;
  return 0;
};

const indexToLabel = (idx: CommitIndex): string => (
  idx === 0 ? 'Proposed' : idx === 1 ? 'Voted' : idx === 2 ? 'Finalized' : 'Verified'
);

const indexToGlowClass = (idx: CommitIndex): string => (
  idx === 0 ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_#06b6d4]' :
  idx === 1 ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_10px_#f59e0b]' :
  idx === 2 ? 'bg-orange-500/20 border-orange-400 text-orange-300 shadow-[0_0_10px_#fb923c]' :
              'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-[0_0_12px_#10b981]'
);

const BlockStatsTable: React.FC<BlockStatsTableProps> = ({ blocks }) => {
  const BLOCK_STEP = 30; // px between stacked verified blocks
  const BLOCK_HEIGHT = 30; // approximate button height
  // Responsive column count (4 / 6 / 8)
  const [numCols, setNumCols] = useState<number>(6);
  useEffect(() => {
    const computeCols = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      const cols = w < 640 ? 4 : (w < 1024 ? 6 : 8);
      setNumCols(cols);
    };
    computeCols();
    window.addEventListener('resize', computeCols);
    return () => window.removeEventListener('resize', computeCols);
  }, []);

  // Most recent blocks by number (we show falling for all recent; verified limit handled separately)
  const recentBlockNumbers = useMemo(() => (
    Array.from(blocks.keys()).sort((a, b) => Number(b - a)).slice(0, 200)
  ), [blocks]);

  // Track per-block current visual row (for smooth transitions)
  const [rowPositions, setRowPositions] = useState<Map<string, CommitIndex>>(new Map());
  const seenRef = useRef<Set<string>>(new Set());
  const prevBlocksRef = useRef<Map<bigint, BlockState>>(new Map());
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const highlightTimersRef = useRef<Map<string, number>>(new Map());
  // Column assignment state
  const assignedColRef = useRef<Map<string, number>>(new Map());
  const colRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Track last computed top for smooth verified transition, and a short freeze window
  const lastTopRef = useRef<Map<string, number>>(new Map());
  const justVerifiedUntilRef = useRef<Map<string, number>>(new Map());

  // Order of verified blocks for stacking (oldest -> newest)
  const [verifiedOrder, setVerifiedOrder] = useState<string[]>([]);
  const [recentlyVerified, setRecentlyVerified] = useState<Set<string>>(new Set());
  const recentlyTimersRef = useRef<Map<string, number>>(new Map());

  // Build helper maps for fast lookup
  const stateByBlock: Map<string, BlockState> = useMemo(() => {
    const m = new Map<string, BlockState>();
    blocks.forEach((s, bn) => {
      m.set(bn.toString(), s);
    });
    return m;
  }, [blocks]);

  // Update transitions/highlights/verified stacking on data change
  useEffect(() => {
    const nextRowPositions = new Map(rowPositions);
    const nextVerifiedOrder = [...verifiedOrder];
    const updatedKeys: string[] = [];

    for (const bn of recentBlockNumbers) {
      const key = bn.toString();
      const state = stateByBlock.get(key) || {};
      const targetIdx = stateToIndex(state);

      // Initialize unseen blocks at top (Proposed row) for smooth entry
      if (!seenRef.current.has(key)) {
        seenRef.current.add(key);
        nextRowPositions.set(key, 0);
        // lock to a column on first sight
        if (!assignedColRef.current.has(key)) {
          const chosen = getColIndex(key);
          assignedColRef.current.set(key, Math.max(0, Math.min(numCols - 1, chosen)));
        }
        // trigger transition to target on next microtask
        queueMicrotask(() => {
          setRowPositions(prev => {
            const copy = new Map(prev);
            copy.set(key, targetIdx);
            return copy;
          });
        });
      } else {
        const currentIdx = nextRowPositions.get(key);
        if (currentIdx !== targetIdx) {
          nextRowPositions.set(key, targetIdx);
        }
      }

      // Detect changes to flash
      const prev = prevBlocksRef.current.get(bn);
      const changed = !prev || prev.Proposed !== state.Proposed || prev.Voted !== state.Voted || prev.Finalized !== state.Finalized || prev.Verified !== state.Verified;
      if (changed) updatedKeys.push(key);

      // Handle newly verified stacking
      const wasVerified = !!prev?.Verified;
      const isVerified = !!state.Verified;
      if (!wasVerified && isVerified) {
        // append to stacking order, drop overflow beyond 100
        nextVerifiedOrder.push(key);
        while (nextVerifiedOrder.length > 100) nextVerifiedOrder.shift();
        // ensure column lock exists for verified-only arrivals
        if (!assignedColRef.current.has(key)) {
          const chosen = getColIndex(key);
          assignedColRef.current.set(key, Math.max(0, Math.min(numCols - 1, chosen)));
        }
        // mark just-verified freeze to avoid jump, reuse lastTop for a brief moment
        try {
          const now = performance.now ? performance.now() : Date.now();
          justVerifiedUntilRef.current.set(key, now + 250);
        } catch {
          justVerifiedUntilRef.current.set(key, Date.now() + 250);
        }
        // bounce highlight
        setRecentlyVerified(prev => {
          const copy = new Set(prev);
          copy.add(key);
          return copy;
        });
        const existing = recentlyTimersRef.current.get(key);
        if (existing) window.clearTimeout(existing);
        const t = window.setTimeout(() => {
          setRecentlyVerified(prev => {
            const copy = new Set(prev);
            copy.delete(key);
            return copy;
          });
          recentlyTimersRef.current.delete(key);
        }, 700);
        recentlyTimersRef.current.set(key, t);
      }
    }

    // Highlight flash timers
    if (updatedKeys.length > 0) {
      setHighlighted(prev => {
        const copy = new Set(prev);
        for (const k of updatedKeys) {
          copy.add(k);
          const existing = highlightTimersRef.current.get(k);
          if (existing) window.clearTimeout(existing);
          const t = window.setTimeout(() => {
            setHighlighted(cur => {
              const next = new Set(cur);
              next.delete(k);
              return next;
            });
            highlightTimersRef.current.delete(k);
          }, 500);
          highlightTimersRef.current.set(k, t);
        }
        return copy;
      });
    }

    // Cleanup rowPositions for blocks no longer recent
    const recentSet = new Set(recentBlockNumbers.map(b => b.toString()));
    nextRowPositions.forEach((_, k) => {
      if (!recentSet.has(k)) nextRowPositions.delete(k);
    });

    setRowPositions(nextRowPositions);
    setVerifiedOrder(nextVerifiedOrder);
    prevBlocksRef.current = new Map(blocks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, recentBlockNumbers, stateByBlock]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      highlightTimersRef.current.forEach(id => window.clearTimeout(id));
      recentlyTimersRef.current.forEach(id => window.clearTimeout(id));
      highlightTimersRef.current.clear();
      recentlyTimersRef.current.clear();
    };
  }, []);

  // Derive lists for rendering
  const unverifiedToRender = useMemo(() => {
    const result: { key: string; idx: CommitIndex }[] = [];
    for (const bn of recentBlockNumbers) {
      const key = bn.toString();
      const state = stateByBlock.get(key) || {};
      if (!state.Verified) {
        result.push({ key, idx: (rowPositions.get(key) ?? 0) as CommitIndex });
      }
    }
    return result;
  }, [recentBlockNumbers, stateByBlock, rowPositions]);

  const verifiedStack = useMemo(() => {
    // Keep only those verified and in our stacking order (max 100)
    const setVerified = new Set(
      verifiedOrder.filter(k => stateByBlock.get(k)?.Verified)
    );
    const ordered = verifiedOrder.filter(k => setVerified.has(k));
    return ordered.slice(-100);
  }, [verifiedOrder, stateByBlock]);

  // Garbage collect expired just-verified flags
  useEffect(() => {
    let rafId = 0 as unknown as number;
    const tick = () => {
      const now = performance.now ? performance.now() : Date.now();
      let changed = false;
      justVerifiedUntilRef.current.forEach((until, key) => {
        if (until <= now) {
          justVerifiedUntilRef.current.delete(key);
          changed = true;
        }
      });
      if (changed) {
        // trigger re-render to apply new positions if needed
        setRowPositions(prev => new Map(prev));
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // Column assignment (deterministic by block number)
  const getColIndex = (key: string): number => {
    try {
      const n = BigInt(key);
      const mod = Number(n % BigInt(Math.max(1, numCols)));
      return mod;
    } catch {
      return 0;
    }
  };

  // Verified stacks per column (bottom-up ordering)
  const verifiedPerColumn = useMemo(() => {
    const per: string[][] = Array.from({ length: numCols }, () => []);
    verifiedStack.forEach(k => {
      const locked = assignedColRef.current.get(k);
      const col = typeof locked === 'number' ? locked : getColIndex(k);
      const idx = Math.max(0, Math.min(numCols - 1, col));
      per[idx].push(k);
    });
    // Enforce per-column cap of 10 by removing bottom-most (oldest)
    for (let i = 0; i < per.length; i++) {
      if (per[i].length > 10) per[i] = per[i].slice(-10);
    }
    return per;
  }, [verifiedStack, numCols]);

  // Opacity gradient for older stacks
  const computeStackOpacity = (indexFromBottom: number, total: number): number => {
    if (total <= 1) return 1;
    const minOpacity = 0.25;
    const t = indexFromBottom / (total - 1);
    return minOpacity + (1 - minOpacity) * (1 - t);
  };

  const getBlockColorClass = (key: string): string => {
    const s = stateByBlock.get(key) || {};
    return indexToGlowClass(stateToIndex(s));
  };

  const indexToTopPercent = (idx: CommitIndex): string => {
    if (idx <= 0) return '0%';
    if (idx === 1) return '33%';
    if (idx === 2) return '66%';
    return '75%';
  };

  const handleClickOpen = (key: string) => {
    const url = `https://testnet.monadexplorer.com/block/${key}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Build unverified per column using locked assignment
  const unverifiedPerColumn = useMemo(() => {
    const per: { key: string; idx: CommitIndex }[][] = Array.from({ length: numCols }, () => []);
    unverifiedToRender.forEach(({ key, idx }) => {
      const locked = assignedColRef.current.get(key);
      const col = typeof locked === 'number' ? locked : getColIndex(key);
      const idxCol = Math.max(0, Math.min(numCols - 1, col));
      per[idxCol].push({ key, idx });
    });
    return per;
  }, [unverifiedToRender, numCols]);

  // Clamp assignments when column count changes to avoid jumping across columns
  useEffect(() => {
    const map = assignedColRef.current;
    map.forEach((col, k) => {
      if (col >= numCols) map.set(k, numCols - 1);
    });
    // trigger re-render via noop state update by touching rowPositions
    setRowPositions(prev => new Map(prev));
  }, [numCols]);

  return (
    <div className="w-full h-full" aria-label="Parallel falling blocks visualization">
      {/* Legend */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-cyan-500/40 shadow-[0_0_8px_#06b6d4] border border-cyan-400" />
          <span className="text-terminal-green/90">Proposed</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-500/40 shadow-[0_0_8px_#f59e0b] border border-yellow-400" />
          <span className="text-terminal-green/90">Voted</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-orange-500/40 shadow-[0_0_8px_#fb923c] border border-orange-400" />
          <span className="text-terminal-green/90">Finalized</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-600/50 shadow-[0_0_8px_#10b981] border border-emerald-400" />
          <span className="text-terminal-green/90">Verified</span>
        </div>
      </div>

      <div className="h-[calc(100%-1.75rem)] w-full relative overflow-hidden">
        {/* Columns grid */}
        <div className={`absolute inset-0 grid ${numCols === 4 ? 'grid-cols-4' : (numCols === 6 ? 'grid-cols-6' : 'grid-cols-8')} gap-x-3`}>
          {Array.from({ length: numCols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="relative h-full"
              ref={(el) => { colRefs.current[colIndex] = el; }}
            >
              {/* Render all blocks in this column in a single layer to avoid teleportation */}
              {(() => {
                const containerH = colRefs.current[colIndex]?.clientHeight ?? 0;
                const verifiedInCol = verifiedPerColumn[colIndex];
                const verifiedSet = new Set(verifiedInCol);
                const verifiedIndex = new Map<string, number>();
                verifiedInCol.forEach((k, i) => verifiedIndex.set(k, i)); // i = 0 is oldest (bottom)
                const L = verifiedInCol.length;
                const free = Math.max(0, containerH - (L * BLOCK_STEP) - BLOCK_HEIGHT);
                const items = [
                  ...verifiedInCol.map(k => ({ key: k, isVerified: true as const })),
                  ...unverifiedPerColumn[colIndex].map(({ key, idx }) => ({ key, idx, isVerified: false as const })),
                ];
                return items.map((item) => {
                  const key = item.key;
                  const isHighlighted = highlighted.has(key);
                  const isVerified = item.isVerified;
                  const glow = isVerified ? indexToGlowClass(3) : getBlockColorClass(key);
                  let topPx = 0;
                  if (isVerified) {
                    const i = verifiedIndex.get(key) ?? 0; // 0 = oldest bottom
                    const baseTop = containerH - BLOCK_HEIGHT - ((i + 1) * BLOCK_STEP);
                    const until = justVerifiedUntilRef.current.get(key);
                    const now = performance.now ? performance.now() : Date.now();
                    if (until && now < until) {
                      topPx = lastTopRef.current.get(key) ?? baseTop;
                    } else {
                      topPx = baseTop;
                    }
                  } else {
                    const idx = (item as any).idx as CommitIndex;
                    const frac = idx <= 0 ? 0 : (idx === 1 ? 0.33 : idx === 2 ? 0.66 : 1);
                    // For idx===3 (shouldn't happen while unverified), snap to free so if it flips to verified, no jump
                    const effectiveFrac = idx === 3 ? 1 : frac;
                    topPx = Math.round(free * Math.min(effectiveFrac, 1));
                    // remember last top for potential verified flip
                    lastTopRef.current.set(key, topPx);
                  }
                  const isBouncing = isVerified && recentlyVerified.has(key);
                  return (
                    <div
                      key={key}
                      className={`absolute left-1/2 -translate-x-1/2 transition-all duration-700 ease-out ${isHighlighted ? 'animate-pulse' : ''} ${isBouncing ? 'animate-bounce' : ''}`}
                      style={{ top: `${topPx}px` }}
                    >
                      <button
                        className={`px-3 min-w-[10ch] sm:min-w-[11ch] md:min-w-[12ch] h-7 md:h-8 border rounded-sm flex items-center justify-center font-mono text-xs md:text-sm ${glow} transition-colors duration-500`}
                        tabIndex={0}
                        aria-label={`Block #${key}`}
                        onClick={() => handleClickOpen(key)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClickOpen(key); } }}
                      >
                        <span>#{key}</span>
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlockStatsTable;
