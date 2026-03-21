import dagre from '@dagrejs/dagre';
import type { WFNode, WFEdge } from './types';

const GATEWAY_TYPES = new Set(['exclusiveGateway', 'parallelGateway', 'inclusiveGateway']);
const EVENT_TYPES   = new Set(['startEvent', 'endEvent']);

/** Use the node's actual stored dimensions with padding for dagre spacing. */
function dagreNodeSize(node: WFNode): { w: number; h: number } {
  // Use actual dimensions from the node, fallback to sensible defaults
  const w = node.width  || (GATEWAY_TYPES.has(node.type) ? 48 : EVENT_TYPES.has(node.type) ? 44 : 166);
  const h = node.height || (GATEWAY_TYPES.has(node.type) ? 48 : EVENT_TYPES.has(node.type) ? 44 : 44);
  return { w, h };
}

/**
 * Returns new nodes with updated positions calculated by Dagre.
 * Does not mutate the original arrays.
 */
export function applyDagreLayout(
  nodes: WFNode[],
  edges: WFEdge[],
  direction: 'LR' | 'TB' = 'LR',
): WFNode[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  // Increased nodesep/ranksep to prevent overlap with real node widths
  graph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120, marginx: 50, marginy: 50 });

  nodes.forEach((n) => {
    const { w, h } = dagreNodeSize(n);
    graph.setNode(n.id, { width: w, height: h });
  });

  edges.forEach((e) => {
    graph.setEdge(e.source, e.target);
  });

  dagre.layout(graph);

  return nodes.map((n) => {
    const gn = graph.node(n.id);
    return {
      ...n,
      position: { x: gn.x - gn.width / 2, y: gn.y - gn.height / 2 },
      width:    gn.width,
      height:   gn.height,
    };
  });
}
