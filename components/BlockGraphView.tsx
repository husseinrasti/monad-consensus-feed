import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BlockState, ValidatorInfo, ValidatorRole } from '@/types/blockStats';

interface NodePosition {
  x: number;
  y: number;
}

interface BlockGraphViewProps {
  blockNumber: string;
  blockState: BlockState;
  validatorData: ValidatorInfo[];
}

interface TooltipData {
  validator: ValidatorInfo;
  x: number;
  y: number;
}

const BlockGraphView: React.FC<BlockGraphViewProps> = ({
  blockNumber,
  blockState,
  validatorData,
}) => {
  const [hoveredNode, setHoveredNode] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [animationKey, setAnimationKey] = useState(0);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Trigger animation when validator data changes
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [validatorData]);

  // Get role color - handles multiple roles by using the highest priority role
  const getRoleColor = (roles: ValidatorRole[]): string => {
    // Priority order: Proposer > Finalizer > Verifier > Voter
    if (roles.includes('Proposer')) {
      return 'bg-blue-500/30 border-blue-400 text-blue-300 shadow-[0_0_15px_#3b82f6]';
    }
    if (roles.includes('Finalizer')) {
      return 'bg-red-500/30 border-red-400 text-red-300 shadow-[0_0_15px_#ef4444]';
    }
    if (roles.includes('Verifier')) {
      return 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_15px_#10b981]';
    }
    if (roles.includes('Voter')) {
      return 'bg-orange-500/30 border-orange-400 text-orange-300 shadow-[0_0_15px_#fb923c]';
    }
    return 'bg-gray-500/30 border-gray-400 text-gray-300 shadow-[0_0_15px_#6b7280]';
  };

  // Get primary role for positioning
  const getPrimaryRole = (roles: ValidatorRole[]): ValidatorRole => {
    if (roles.includes('Proposer')) return 'Proposer';
    if (roles.includes('Finalizer')) return 'Finalizer';
    if (roles.includes('Verifier')) return 'Verifier';
    if (roles.includes('Voter')) return 'Voter';
    return 'Voter'; // fallback
  };

  // Calculate node positions using hierarchical tree layout
  const nodePositions = useMemo(() => {
    if (!dimensions.width || !dimensions.height || validatorData.length === 0) {
      return new Map<string, NodePosition>();
    }

    const positions = new Map<string, NodePosition>();
    const nodeRadius = Math.min(35, Math.max(25, dimensions.width / 25)); // Responsive node size
    const minNodeSpacing = nodeRadius * 2.5; // Minimum spacing between nodes
    const levelHeight = Math.max(80, dimensions.height / 6); // Vertical spacing between levels
    
    // Group validators by primary role (for positioning)
    const roleGroups = {
      Proposer: validatorData.filter(v => getPrimaryRole(v.roles) === 'Proposer'),
      Voter: validatorData.filter(v => getPrimaryRole(v.roles) === 'Voter'),
      Finalizer: validatorData.filter(v => getPrimaryRole(v.roles) === 'Finalizer'),
      Verifier: validatorData.filter(v => getPrimaryRole(v.roles) === 'Verifier'),
    };

    // Calculate the total height needed for the tree
    const levels = [
      roleGroups.Proposer.length > 0 ? 1 : 0,
      roleGroups.Voter.length > 0 ? 1 : 0,
      roleGroups.Finalizer.length > 0 ? 1 : 0,
      roleGroups.Verifier.length > 0 ? 1 : 0,
    ].filter(Boolean).length;
    
    const totalTreeHeight = (levels - 1) * levelHeight;
    const startY = (dimensions.height - totalTreeHeight) / 2;

    let currentLevel = 0;

    // Level 1: Proposer (Root) - Top center
    if (roleGroups.Proposer.length > 0) {
      const proposer = roleGroups.Proposer[0];
      positions.set(proposer.id, {
        x: dimensions.width / 2,
        y: startY + (currentLevel * levelHeight),
      });
      currentLevel++;
    }

    // Level 2: Voters - Horizontally distributed
    if (roleGroups.Voter.length > 0) {
      const voterCount = roleGroups.Voter.length;
      const totalWidth = Math.max(
        minNodeSpacing * (voterCount - 1),
        Math.min(dimensions.width * 0.8, voterCount * minNodeSpacing)
      );
      const spacing = voterCount > 1 ? totalWidth / (voterCount - 1) : 0;
      const startX = dimensions.width / 2 - totalWidth / 2;
      
      roleGroups.Voter.forEach((voter, index) => {
        positions.set(voter.id, {
          x: voterCount === 1 ? dimensions.width / 2 : startX + (index * spacing),
          y: startY + (currentLevel * levelHeight),
        });
      });
      currentLevel++;
    }

    // Level 3: Finalizer - Center
    if (roleGroups.Finalizer.length > 0) {
      const finalizer = roleGroups.Finalizer[0];
      positions.set(finalizer.id, {
        x: dimensions.width / 2,
        y: startY + (currentLevel * levelHeight),
      });
      currentLevel++;
    }

    // Level 4: Verifiers - Horizontally distributed at bottom
    if (roleGroups.Verifier.length > 0) {
      const verifierCount = roleGroups.Verifier.length;
      const totalWidth = Math.max(
        minNodeSpacing * (verifierCount - 1),
        Math.min(dimensions.width * 0.8, verifierCount * minNodeSpacing)
      );
      const spacing = verifierCount > 1 ? totalWidth / (verifierCount - 1) : 0;
      const startX = dimensions.width / 2 - totalWidth / 2;
      
      roleGroups.Verifier.forEach((verifier, index) => {
        positions.set(verifier.id, {
          x: verifierCount === 1 ? dimensions.width / 2 : startX + (index * spacing),
          y: startY + (currentLevel * levelHeight),
        });
      });
    }

    return positions;
  }, [validatorData, dimensions]);

  // Calculate edge positions that connect to node borders, not centers
  const calculateEdgePoints = (from: NodePosition, to: NodePosition, nodeRadius: number) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { from, to };
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    return {
      from: {
        x: from.x + unitX * nodeRadius,
        y: from.y + unitY * nodeRadius,
      },
      to: {
        x: to.x - unitX * nodeRadius,
        y: to.y - unitY * nodeRadius,
      },
    };
  };

  // Generate connections between nodes based on consensus flow
  const connections = useMemo(() => {
    const nodeRadius = Math.min(35, Math.max(25, dimensions.width / 25));
    const conns: Array<{ 
      from: NodePosition; 
      to: NodePosition; 
      active: boolean;
      edgeFrom: NodePosition;
      edgeTo: NodePosition;
    }> = [];
    
    // Group validators by all their roles (for connections)
    const roleGroups = {
      Proposer: validatorData.filter(v => v.roles.includes('Proposer')),
      Voter: validatorData.filter(v => v.roles.includes('Voter')),
      Finalizer: validatorData.filter(v => v.roles.includes('Finalizer')),
      Verifier: validatorData.filter(v => v.roles.includes('Verifier')),
    };

    // Proposer → Voters
    if (roleGroups.Proposer.length > 0 && roleGroups.Voter.length > 0) {
      const proposerPos = nodePositions.get(roleGroups.Proposer[0].id);
      if (proposerPos) {
        roleGroups.Voter.forEach(voter => {
          const voterPos = nodePositions.get(voter.id);
          if (voterPos) {
            const edgePoints = calculateEdgePoints(proposerPos, voterPos, nodeRadius);
            conns.push({
              from: proposerPos,
              to: voterPos,
              edgeFrom: edgePoints.from,
              edgeTo: edgePoints.to,
              active: blockState.Voted || false,
            });
          }
        });
      }
    }

    // Voters → Finalizer
    if (roleGroups.Voter.length > 0 && roleGroups.Finalizer.length > 0) {
      const finalizerPos = nodePositions.get(roleGroups.Finalizer[0].id);
      if (finalizerPos) {
        roleGroups.Voter.forEach(voter => {
          const voterPos = nodePositions.get(voter.id);
          if (voterPos) {
            const edgePoints = calculateEdgePoints(voterPos, finalizerPos, nodeRadius);
            conns.push({
              from: voterPos,
              to: finalizerPos,
              edgeFrom: edgePoints.from,
              edgeTo: edgePoints.to,
              active: blockState.Finalized || false,
            });
          }
        });
      }
    }

    // Finalizer → Verifiers
    if (roleGroups.Finalizer.length > 0 && roleGroups.Verifier.length > 0) {
      const finalizerPos = nodePositions.get(roleGroups.Finalizer[0].id);
      if (finalizerPos) {
        roleGroups.Verifier.forEach(verifier => {
          const verifierPos = nodePositions.get(verifier.id);
          if (verifierPos) {
            const edgePoints = calculateEdgePoints(finalizerPos, verifierPos, nodeRadius);
            conns.push({
              from: finalizerPos,
              to: verifierPos,
              edgeFrom: edgePoints.from,
              edgeTo: edgePoints.to,
              active: blockState.Verified || false,
            });
          }
        });
      }
    }

    return conns;
  }, [validatorData, nodePositions, blockState, dimensions.width]);

  const handleNodeHover = (validator: ValidatorInfo, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setHoveredNode({
        validator,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  };

  const handleNodeLeave = () => {
    setHoveredNode(null);
  };

  if (validatorData.length === 0) {
    return (
      <div 
        ref={containerRef}
        className="h-full w-full flex items-center justify-center"
      >
        <div className="text-center text-terminal-green/60">
          <div className="text-xl mb-2">No Validator Data</div>
          <div className="text-sm">Waiting for block consensus events...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative overflow-hidden"
      style={{ minHeight: '400px' }}
    >
      {/* SVG for connections */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="8"
            refX="11"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 12 4, 0 8"
              fill="rgba(34, 197, 94, 0.6)"
              stroke="rgba(34, 197, 94, 0.6)"
              strokeWidth="1"
            />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="12"
            markerHeight="8"
            refX="11"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 12 4, 0 8"
              fill="#06b6d4"
              stroke="#06b6d4"
              strokeWidth="1"
            />
          </marker>
        </defs>
        {connections.map((conn, index) => (
          <line
            key={`${index}-${animationKey}`}
            x1={conn.edgeFrom.x}
            y1={conn.edgeFrom.y}
            x2={conn.edgeTo.x}
            y2={conn.edgeTo.y}
            stroke={conn.active ? '#06b6d4' : 'rgba(34, 197, 94, 0.4)'}
            strokeWidth={conn.active ? 3 : 2}
            strokeDasharray={conn.active ? 'none' : '6,4'}
            markerEnd={conn.active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
            className={`transition-all duration-700 ${conn.active ? 'animate-pulse' : ''}`}
            style={{
              filter: conn.active ? 'drop-shadow(0 0 6px #06b6d4)' : 'none',
            }}
          />
        ))}
      </svg>

      {/* Nodes */}
      {validatorData.map((validator) => {
        const position = nodePositions.get(validator.id);
        if (!position) return null;

        const nodeRadius = Math.min(35, Math.max(25, dimensions.width / 25));
        const nodeSize = nodeRadius * 2;
        const fontSize = Math.max(10, nodeRadius / 3);
        const labelFontSize = Math.max(8, nodeRadius / 4.5);

        const isActive = 
          (validator.roles.includes('Proposer') && blockState.Proposed) ||
          (validator.roles.includes('Voter') && blockState.Voted) ||
          (validator.roles.includes('Finalizer') && blockState.Finalized) ||
          (validator.roles.includes('Verifier') && blockState.Verified);

        return (
          <div
            key={`${validator.id}-${animationKey}`}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out ${isActive ? 'animate-pulse' : ''}`}
            style={{
              left: position.x,
              top: position.y,
              zIndex: 2,
              animationDelay: `${validatorData.indexOf(validator) * 100}ms`,
            }}
          >
            <div
              className={`rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 ${getRoleColor(validator.roles)}`}
              style={{
                width: `${nodeSize}px`,
                height: `${nodeSize}px`,
              }}
              onMouseEnter={(e) => handleNodeHover(validator, e)}
              onMouseLeave={handleNodeLeave}
              onMouseMove={(e) => handleNodeHover(validator, e)}
            >
              <div className="text-center">
                <div 
                  className="font-bold"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {validator.roles.includes('Proposer') ? 'P' : 
                   validator.roles.includes('Finalizer') ? 'F' : 
                   validator.roles.includes('Verifier') ? 'VE' : 'V'}
                </div>
                <div 
                  className="opacity-80"
                  style={{ fontSize: `${labelFontSize}px` }}
                >
                  {validator.roles.length > 1 ? 'MULTI' : getPrimaryRole(validator.roles).slice(0, 3).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none z-50 bg-terminal-bg/95 border border-terminal-green/40 rounded-sm p-3 text-sm shadow-lg"
          style={{
            left: Math.min(hoveredNode.x + 10, dimensions.width - 200),
            top: Math.max(hoveredNode.y - 60, 10),
            minWidth: '180px',
          }}
        >
          <div className="font-bold text-terminal-green mb-1">
            {hoveredNode.validator.roles.join(' + ')}
          </div>
          <div className="text-xs text-gray-300 mb-1">
            {hoveredNode.validator.address}
          </div>
          <div className="text-xs text-gray-400">
            {new Date(hoveredNode.validator.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-terminal-bg/80 border border-terminal-green/40 rounded-sm p-3 text-xs">
        <div className="font-bold text-terminal-green mb-2">Validator Roles</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-400"></div>
            <span>Proposer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500/50 border border-orange-400"></div>
            <span>Voter</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-400"></div>
            <span>Finalizer</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-400"></div>
            <span>Verifier</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockGraphView;
