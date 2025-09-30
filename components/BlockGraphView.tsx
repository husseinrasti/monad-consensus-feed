import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BlockState, ValidatorInfo, ValidatorRole } from '@/types/blockStats';
import * as d3 from 'd3';

interface NodePosition {
  x: number;
  y: number;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  validator: ValidatorInfo;
  primaryRole: ValidatorRole;
  level: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode;
  target: GraphNode;
  active: boolean;
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
  
  // Zoom and pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const graphRef = useRef<HTMLDivElement>(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
        
        // Set minimum graph size to be larger than container for better zooming
        const minGraphWidth = Math.max(rect.width, 800);
        const minGraphHeight = Math.max(rect.height, 600);
        setGraphDimensions({ width: minGraphWidth, height: minGraphHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Zoom and pan event handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.1, transform.scale + delta), 3);
    
    // Zoom towards mouse position
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const scaleRatio = newScale / transform.scale;
      const newX = mouseX - (mouseX - transform.x) * scaleRatio;
      const newY = mouseY - (mouseY - transform.y) * scaleRatio;
      
      setTransform({ x: newX, y: newY, scale: newScale });
    }
  }, [transform]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
    }
  }, [transform]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setTransform(prev => ({
        ...prev,
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      }));
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset zoom function
  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // Listen for control events from parent
  useEffect(() => {
    const handleResetZoom = () => resetZoom();
    const handleZoomIn = () => {
      setTransform(prev => ({
        ...prev,
        scale: Math.min(prev.scale * 1.2, 3)
      }));
    };
    const handleZoomOut = () => {
      setTransform(prev => ({
        ...prev,
        scale: Math.max(prev.scale / 1.2, 0.1)
      }));
    };
    
    const element = containerRef.current;
    if (element) {
      element.addEventListener('graph-reset-zoom', handleResetZoom);
      element.addEventListener('graph-zoom-in', handleZoomIn);
      element.addEventListener('graph-zoom-out', handleZoomOut);
      return () => {
        element.removeEventListener('graph-reset-zoom', handleResetZoom);
        element.removeEventListener('graph-zoom-in', handleZoomIn);
        element.removeEventListener('graph-zoom-out', handleZoomOut);
      };
    }
  }, [resetZoom]);

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

  // Create graph nodes and links for force simulation
  const { nodes, links } = useMemo(() => {
    if (!graphDimensions.width || !graphDimensions.height || validatorData.length === 0) {
      return { nodes: [], links: [] };
    }

    // Create nodes with level information for positioning
    const graphNodes: GraphNode[] = validatorData.map(validator => {
      const primaryRole = getPrimaryRole(validator.roles);
      let level = 0;
      
      // Assign levels based on consensus flow
      switch (primaryRole) {
        case 'Proposer': level = 0; break;
        case 'Voter': level = 1; break;
        case 'Finalizer': level = 2; break;
        case 'Verifier': level = 3; break;
      }

      return {
        id: validator.id,
        validator,
        primaryRole,
        level,
        x: graphDimensions.width / 2 + (Math.random() - 0.5) * 100, // Small random offset
        y: graphDimensions.height / 2 + (Math.random() - 0.5) * 100,
      };
    });

    // Create links based on consensus flow
    const graphLinks: GraphLink[] = [];
    
    // Group nodes by role for connection logic
    const roleGroups = {
      Proposer: graphNodes.filter(n => n.validator.roles.includes('Proposer')),
      Voter: graphNodes.filter(n => n.validator.roles.includes('Voter')),
      Finalizer: graphNodes.filter(n => n.validator.roles.includes('Finalizer')),
      Verifier: graphNodes.filter(n => n.validator.roles.includes('Verifier')),
    };

    // Proposer → Voters
    if (roleGroups.Proposer.length > 0 && roleGroups.Voter.length > 0) {
      const proposer = roleGroups.Proposer[0];
      roleGroups.Voter.forEach(voter => {
        graphLinks.push({
          source: proposer,
          target: voter,
          active: blockState.Voted || false,
        });
      });
    }

    // Voters → Finalizer
    if (roleGroups.Voter.length > 0 && roleGroups.Finalizer.length > 0) {
      const finalizer = roleGroups.Finalizer[0];
      roleGroups.Voter.forEach(voter => {
        graphLinks.push({
          source: voter,
          target: finalizer,
          active: blockState.Finalized || false,
        });
      });
    }

    // Finalizer → Verifiers
    if (roleGroups.Finalizer.length > 0 && roleGroups.Verifier.length > 0) {
      const finalizer = roleGroups.Finalizer[0];
      roleGroups.Verifier.forEach(verifier => {
        graphLinks.push({
          source: finalizer,
          target: verifier,
          active: blockState.Verified || false,
        });
      });
    }

    return { nodes: graphNodes, links: graphLinks };
  }, [validatorData, graphDimensions, blockState]);

  // Force simulation for dynamic layout
  const nodePositions = useMemo(() => {
    if (!graphDimensions.width || !graphDimensions.height || nodes.length === 0) {
      return new Map<string, NodePosition>();
    }

    const nodeRadius = Math.min(35, Math.max(25, Math.min(dimensions.width, graphDimensions.width) / 25));
    const positions = new Map<string, NodePosition>();

    // Calculate dynamic parameters based on graph size and node count
    const totalNodes = nodes.length;
    const containerArea = graphDimensions.width * graphDimensions.height;
    const optimalDistance = Math.sqrt(containerArea / totalNodes) * 0.8;
    const linkDistance = Math.max(80, Math.min(150, optimalDistance));
    const repulsionStrength = -Math.max(400, linkDistance * 8);
    
    // Create simulation with adaptive parameters
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(linkDistance)
        .strength(0.7)
      )
      .force('charge', d3.forceManyBody()
        .strength(repulsionStrength)
        .distanceMax(linkDistance * 2)
      )
      .force('center', d3.forceCenter(graphDimensions.width / 2, graphDimensions.height / 2))
      .force('collision', d3.forceCollide()
        .radius(nodeRadius * 1.5) // Prevent overlap with comfortable spacing
        .strength(1.0)
      )
      // Vertical positioning force to maintain hierarchy
      .force('y', d3.forceY()
        .y((d: any) => {
          const availableHeight = graphDimensions.height * 0.7; // Use 70% of height
          const levelHeight = availableHeight / 4; // 4 levels max
          const startY = graphDimensions.height * 0.15; // Start 15% from top
          return startY + (d.level * levelHeight);
        })
        .strength(0.4)
      )
      // Horizontal spreading for same-level nodes
      .force('x', d3.forceX()
        .x((d: any) => {
          const sameLevel = nodes.filter(n => n.level === d.level);
          if (sameLevel.length === 1) return graphDimensions.width / 2;
          
          const index = sameLevel.findIndex(n => n.id === d.id);
          const availableWidth = graphDimensions.width * 0.9; // Use 90% of width
          const optimalSpacing = Math.min(availableWidth, sameLevel.length * nodeRadius * 4);
          const spacing = sameLevel.length > 1 ? optimalSpacing / (sameLevel.length - 1) : 0;
          const startX = graphDimensions.width / 2 - optimalSpacing / 2;
          return startX + (index * spacing);
        })
        .strength(0.3)
      );

    // Run simulation synchronously for initial positions
    simulation.stop();
    
    // Run multiple ticks to stabilize
    for (let i = 0; i < 300; ++i) {
      simulation.tick();
    }

    // Extract final positions with proper margins
    const margin = nodeRadius + 20; // Extra margin for better visual spacing
    nodes.forEach(node => {
      positions.set(node.id, {
        x: Math.max(margin, Math.min(graphDimensions.width - margin, node.x || graphDimensions.width / 2)),
        y: Math.max(margin, Math.min(graphDimensions.height - margin, node.y || graphDimensions.height / 2)),
      });
    });

    return positions;
  }, [nodes, links, graphDimensions]);

  // Calculate edge positions that connect to node borders with proper spacing
  const calculateEdgePoints = (from: NodePosition, to: NodePosition, nodeRadius: number) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { from, to };
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // Add extra spacing to prevent arrowheads from touching nodes
    const spacing = nodeRadius + 8;
    
    return {
      from: {
        x: from.x + unitX * spacing,
        y: from.y + unitY * spacing,
      },
      to: {
        x: to.x - unitX * spacing,
        y: to.y - unitY * spacing,
      },
    };
  };

  // Generate connections between nodes based on the graph links
  const connections = useMemo(() => {
    const nodeRadius = Math.min(35, Math.max(25, Math.min(dimensions.width, graphDimensions.width) / 25));
    const conns: Array<{ 
      from: NodePosition; 
      to: NodePosition; 
      active: boolean;
      edgeFrom: NodePosition;
      edgeTo: NodePosition;
    }> = [];
    
    links.forEach(link => {
      const sourcePos = nodePositions.get(link.source.id);
      const targetPos = nodePositions.get(link.target.id);
      
      if (sourcePos && targetPos) {
        const edgePoints = calculateEdgePoints(sourcePos, targetPos, nodeRadius);
        conns.push({
          from: sourcePos,
          to: targetPos,
          edgeFrom: edgePoints.from,
          edgeTo: edgePoints.to,
          active: link.active,
        });
      }
    });

    return conns;
  }, [links, nodePositions, graphDimensions.width]);

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
      id="block-graph-view"
      className="h-full w-full relative bg-transparent select-none"
      style={{ 
        minHeight: '400px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Zoomable/Pannable Graph Container */}
      <div
        ref={graphRef}
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          width: `${graphDimensions.width}px`,
          height: `${graphDimensions.height}px`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* SVG for connections */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 2, 8 5, 0 8"
              fill="rgba(34, 197, 94, 0.6)"
              stroke="rgba(34, 197, 94, 0.6)"
              strokeWidth="1"
            />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 2, 8 5, 0 8"
              fill="#06b6d4"
              stroke="#06b6d4"
              strokeWidth="1"
            />
          </marker>
        </defs>
        {connections.map((conn, index) => {
          // Calculate control point for curved edges
          const midX = (conn.edgeFrom.x + conn.edgeTo.x) / 2;
          const midY = (conn.edgeFrom.y + conn.edgeTo.y) / 2;
          const dx = conn.edgeTo.x - conn.edgeFrom.x;
          const dy = conn.edgeTo.y - conn.edgeFrom.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Create a subtle curve by offsetting the control point
          const curvature = Math.min(50, distance * 0.2);
          const controlX = midX + (-dy / distance) * curvature;
          const controlY = midY + (dx / distance) * curvature;
          
          const pathData = `M ${conn.edgeFrom.x} ${conn.edgeFrom.y} Q ${controlX} ${controlY} ${conn.edgeTo.x} ${conn.edgeTo.y}`;
          
          return (
            <path
              key={`${index}-${animationKey}`}
              d={pathData}
              fill="none"
              stroke={conn.active ? '#06b6d4' : 'rgba(34, 197, 94, 0.4)'}
              strokeWidth={conn.active ? 3 : 2}
              strokeDasharray={conn.active ? 'none' : '6,4'}
              markerEnd={conn.active ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
              className={`transition-all duration-700 ${conn.active ? 'animate-pulse' : ''}`}
              style={{
                filter: conn.active ? 'drop-shadow(0 0 6px #06b6d4)' : 'none',
              }}
            />
          );
        })}
      </svg>

        {/* Nodes */}
        {validatorData.map((validator) => {
          const position = nodePositions.get(validator.id);
          if (!position) return null;

          const nodeRadius = Math.min(35, Math.max(25, Math.min(dimensions.width, graphDimensions.width) / 25));
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
                pointerEvents: 'auto',
              }}
            >
              <div
                className={`rounded-full border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 ${getRoleColor(validator.roles)} p-1`}
                style={{
                  width: `${nodeSize}px`,
                  height: `${nodeSize}px`,
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  handleNodeHover(validator, e);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  handleNodeLeave();
                }}
                onMouseMove={(e) => {
                  e.stopPropagation();
                  handleNodeHover(validator, e);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
              <div className="text-center w-full">
                <div 
                  className="font-bold text-xs leading-tight"
                  style={{ fontSize: `${Math.max(8, fontSize * 0.6)}px` }}
                >
                  {validator.roles.join(', ')}
                </div>
                <div 
                  className="opacity-90 text-xs truncate w-full leading-tight"
                  style={{ fontSize: `${Math.max(6, labelFontSize * 0.7)}px` }}
                  title={validator.address}
                >
                  {validator.address.slice(0, 6)}...{validator.address.slice(-4)}
                </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip - outside the transform container */}
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
          <div className="text-xs text-gray-300">
            {hoveredNode.validator.address}
          </div>
        </div>
      )}

      {/* Zoom level indicator */}
      <div className="absolute bottom-4 left-4 z-10 bg-terminal-bg/80 border border-terminal-green/40 rounded-sm p-2 text-xs text-terminal-green">
        Zoom: {Math.round(transform.scale * 100)}%
      </div>

      {/* Legend */}
      {/* <div className="absolute bottom-4 left-4 bg-terminal-bg/80 border border-terminal-green/40 rounded-sm p-3 text-xs">
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
      </div> */}
    </div>
  );
};

export default BlockGraphView;
