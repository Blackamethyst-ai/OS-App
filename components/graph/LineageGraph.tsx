/**
 * LineageGraph - Research lineage visualization component
 *
 * Displays a directed graph showing:
 * - Session as root node
 * - Findings produced by the session
 * - Papers cited in findings/session
 * - Relationship edges between nodes
 *
 * Uses simple SVG rendering (no external dependencies)
 */

import { useMemo, useState } from 'react';
import type { GraphNode, GraphEdge } from '../../libs/agent-core-sdk/src/types';

// Node colors by type
const NODE_COLORS: Record<string, string> = {
  session: '#3B82F6',    // Blue
  finding: '#10B981',    // Green
  paper: '#8B5CF6',      // Purple
  thesis: '#F59E0B',     // Amber
  gap: '#EF4444',        // Red
  innovation: '#EC4899', // Pink
  concept: '#6B7280',    // Gray
};

// Node sizes by type
const NODE_SIZES: Record<string, number> = {
  session: 40,
  finding: 25,
  paper: 30,
  thesis: 30,
  gap: 25,
  innovation: 28,
};

interface LineageGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  className?: string;
}

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  size: number;
  color: string;
}

/**
 * Simple force-directed layout calculation
 */
function calculateLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): LayoutNode[] {
  const layoutNodes: LayoutNode[] = [];
  const nodeMap = new Map<string, LayoutNode>();

  // Initialize nodes with random positions
  const centerX = width / 2;
  const centerY = height / 2;

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const radius = Math.min(width, height) * 0.35;

    // Root node goes in center
    const isRoot = node.isRoot || node.type === 'session';

    const layoutNode: LayoutNode = {
      ...node,
      x: isRoot ? centerX : centerX + radius * Math.cos(angle),
      y: isRoot ? centerY : centerY + radius * Math.sin(angle),
      size: NODE_SIZES[node.type] || 20,
      color: NODE_COLORS[node.type] || '#6B7280',
    };

    layoutNodes.push(layoutNode);
    nodeMap.set(node.id, layoutNode);
  });

  // Simple force simulation (10 iterations)
  for (let iter = 0; iter < 10; iter++) {
    // Repulsion between nodes
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const a = layoutNodes[i];
        const b = layoutNodes[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = 500 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!a.isRoot) {
          a.x -= fx;
          a.y -= fy;
        }
        if (!b.isRoot) {
          b.x += fx;
          b.y += fy;
        }
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = dist * 0.01;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!source.isRoot) {
        source.x += fx;
        source.y += fy;
      }
      if (!target.isRoot) {
        target.x -= fx;
        target.y -= fy;
      }
    }

    // Keep nodes within bounds
    for (const node of layoutNodes) {
      const padding = node.size + 10;
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    }
  }

  return layoutNodes;
}

export function LineageGraph({
  nodes,
  edges,
  width = 600,
  height = 400,
  onNodeClick,
  onNodeHover,
  className = '',
}: LineageGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const layoutNodes = useMemo(
    () => calculateLayout(nodes, edges, width, height),
    [nodes, edges, width, height]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutNode>();
    layoutNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [layoutNodes]);

  const handleNodeMouseEnter = (node: LayoutNode) => {
    setHoveredNode(node.id);
    onNodeHover?.(node);
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
    onNodeHover?.(null);
  };

  if (nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <p className="text-gray-500">No lineage data available</p>
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={`bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}
    >
      {/* Edges */}
      <g className="edges">
        {edges.map((edge, i) => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) return null;

          const isHighlighted =
            hoveredNode === edge.source || hoveredNode === edge.target;

          return (
            <g key={`edge-${i}`}>
              <line
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isHighlighted ? '#3B82F6' : '#D1D5DB'}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeDasharray={edge.relation === 'cites' ? '4,2' : undefined}
                opacity={isHighlighted ? 1 : 0.5}
              />
              {/* Arrow marker */}
              <circle
                cx={target.x - ((target.x - source.x) * target.size) / (Math.sqrt((target.x - source.x) ** 2 + (target.y - source.y) ** 2) || 1)}
                cy={target.y - ((target.y - source.y) * target.size) / (Math.sqrt((target.x - source.x) ** 2 + (target.y - source.y) ** 2) || 1)}
                r={3}
                fill={isHighlighted ? '#3B82F6' : '#9CA3AF'}
              />
            </g>
          );
        })}
      </g>

      {/* Nodes */}
      <g className="nodes">
        {layoutNodes.map((node) => {
          const isHovered = hoveredNode === node.id;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onMouseEnter={() => handleNodeMouseEnter(node)}
              onMouseLeave={handleNodeMouseLeave}
              onClick={() => onNodeClick?.(node)}
            >
              {/* Node circle */}
              <circle
                r={node.size}
                fill={node.color}
                stroke={isHovered ? '#1F2937' : 'white'}
                strokeWidth={isHovered ? 3 : 2}
                opacity={isHovered ? 1 : 0.9}
              />

              {/* Node label */}
              <text
                y={node.size + 12}
                textAnchor="middle"
                className="text-xs fill-gray-700 dark:fill-gray-300"
                style={{ fontSize: '10px' }}
              >
                {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
              </text>

              {/* Type badge */}
              <text
                y={4}
                textAnchor="middle"
                className="fill-white font-medium"
                style={{ fontSize: '8px' }}
              >
                {node.type.slice(0, 1).toUpperCase()}
              </text>
            </g>
          );
        })}
      </g>

      {/* Legend */}
      <g transform={`translate(10, ${height - 60})`}>
        <text className="text-xs fill-gray-500" y={0}>Legend:</text>
        {Object.entries(NODE_COLORS).slice(0, 4).map(([type, color], i) => (
          <g key={type} transform={`translate(${i * 70}, 15)`}>
            <circle r={6} cx={6} cy={6} fill={color} />
            <text x={16} y={10} className="text-xs fill-gray-600 dark:fill-gray-400" style={{ fontSize: '9px' }}>
              {type}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export default LineageGraph;
