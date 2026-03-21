import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import { applyDagreLayout } from './layout';
import type {
  WFNode,
  WFEdge,
  WorkflowNodeData,
  WorkflowEdgeData,
  WorkflowMeta,
  FieldDefinition,
  BusinessRule,
  ApiDefinition,
  ActionButton,
} from './types';

// Re-export for convenience
export type { WFNode, WFEdge };

interface WorkflowStore {
  // ── Workflow metadata
  meta: WorkflowMeta;
  setMeta: (meta: Partial<WorkflowMeta>) => void;

  // ── Nodes & edges
  nodes: WFNode[];
  edges: WFEdge[];

  // ── Canvas mutations (driven by the engine)
  moveNode:     (id: string, x: number, y: number) => void;
  resizeNode:   (id: string, w: number, h: number) => void;
  connectNodes: (sourceId: string, sourceHandle: string | null, targetId: string, targetHandle: string | null) => void;

  // ── Node CRUD
  addNode: (node: WFNode) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;

  // ── Edge CRUD
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
  deleteEdge: (edgeId: string) => void;

  // ── Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;

  // ── Sub-entity helpers (fields, rules, apis, buttons)
  addInputField: (nodeId: string, field: FieldDefinition) => void;
  updateInputField: (nodeId: string, field: FieldDefinition) => void;
  removeInputField: (nodeId: string, fieldId: string) => void;

  addOutputField: (nodeId: string, field: FieldDefinition) => void;
  updateOutputField: (nodeId: string, field: FieldDefinition) => void;
  removeOutputField: (nodeId: string, fieldId: string) => void;

  addBusinessRule: (nodeId: string, rule: BusinessRule) => void;
  updateBusinessRule: (nodeId: string, rule: BusinessRule) => void;
  removeBusinessRule: (nodeId: string, ruleId: string) => void;

  addApi: (nodeId: string, api: ApiDefinition) => void;
  updateApi: (nodeId: string, api: ApiDefinition) => void;
  removeApi: (nodeId: string, apiId: string) => void;

  addActionButton: (nodeId: string, btn: ActionButton) => void;
  updateActionButton: (nodeId: string, btn: ActionButton) => void;
  removeActionButton: (nodeId: string, btnId: string) => void;

  // ── Layout
  autoLayout: (direction?: 'LR' | 'TB') => void;

  // ── Persistence
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;
  resetWorkflow: () => void;
}

const defaultMeta: WorkflowMeta = {
  id: uuidv4(),
  name: 'Untitled Workflow',
  description: '',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const initialNodes: WFNode[] = [
  {
    id:       'start-1',
    type:     'startEvent',
    position: { x: 60, y: 60 },
    width:    44,
    height:   44,
    data: {
      nodeType:      'startEvent',
      label:         'Start',
      inputFields:   [],
      outputFields:  [],
      businessRules: [],
      apis:          [],
      actionButtons: [],
    },
  },
];

const initialEdges: WFEdge[] = [];

export const useWorkflowStore = create<WorkflowStore>()(
  immer((set, get) => ({
    meta: defaultMeta,
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    selectedEdgeId: null,

    setMeta: (updates) =>
      set((state) => {
        Object.assign(state.meta, updates, { updatedAt: new Date().toISOString() });
      }),

    moveNode: (id, x, y) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node) { node.position.x = x; node.position.y = y; }
      }),

    resizeNode: (id, w, h) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id);
        if (node) { node.width = w; node.height = h; }
      }),

    connectNodes: (sourceId, sourceHandle, targetId, targetHandle) =>
      set((state) => {
        // Prevent duplicate edges on the same source → target
        const dup = state.edges.some(
          (e) => e.source === sourceId && e.target === targetId &&
                 e.sourceHandle === sourceHandle && e.targetHandle === targetHandle,
        );
        if (dup) return;
        state.edges.push({
          id:           `edge-${uuidv4()}`,
          source:       sourceId,
          target:       targetId,
          sourceHandle: sourceHandle ?? undefined,
          targetHandle: targetHandle ?? undefined,
          type:         'sequenceEdge',
          data:         { label: '', isDefault: false },
        } as WFEdge);
      }),

    addNode: (node) =>
      set((state) => {
        state.nodes.push(node);
      }),

    updateNodeData: (nodeId, data) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) Object.assign(node.data, data);
      }),

    deleteNode: (nodeId) =>
      set((state) => {
        state.nodes = state.nodes.filter((n) => n.id !== nodeId);
        state.edges = state.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        );
        if (state.selectedNodeId === nodeId) state.selectedNodeId = null;
      }),

    updateEdgeData: (edgeId, data) =>
      set((state) => {
        const edge = state.edges.find((e) => e.id === edgeId);
        if (edge) Object.assign(edge.data as object, data);
      }),

    deleteEdge: (edgeId) =>
      set((state) => {
        state.edges = state.edges.filter((e) => e.id !== edgeId);
        if (state.selectedEdgeId === edgeId) state.selectedEdgeId = null;
      }),

    setSelectedNodeId: (id) =>
      set((state) => {
        state.selectedNodeId = id;
        if (id) state.selectedEdgeId = null;
      }),

    setSelectedEdgeId: (id) =>
      set((state) => {
        state.selectedEdgeId = id;
        if (id) state.selectedNodeId = null;
      }),

    // ── Input Fields
    addInputField: (nodeId, field) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.inputFields.push(field);
      }),
    updateInputField: (nodeId, field) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          const idx = node.data.inputFields.findIndex((f) => f.id === field.id);
          if (idx !== -1) node.data.inputFields[idx] = field;
        }
      }),
    removeInputField: (nodeId, fieldId) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.inputFields = node.data.inputFields.filter((f) => f.id !== fieldId);
      }),

    // ── Output Fields
    addOutputField: (nodeId, field) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.outputFields.push(field);
      }),
    updateOutputField: (nodeId, field) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          const idx = node.data.outputFields.findIndex((f) => f.id === field.id);
          if (idx !== -1) node.data.outputFields[idx] = field;
        }
      }),
    removeOutputField: (nodeId, fieldId) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.outputFields = node.data.outputFields.filter((f) => f.id !== fieldId);
      }),

    // ── Business Rules
    addBusinessRule: (nodeId, rule) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.businessRules.push(rule);
      }),
    updateBusinessRule: (nodeId, rule) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          const idx = node.data.businessRules.findIndex((r) => r.id === rule.id);
          if (idx !== -1) node.data.businessRules[idx] = rule;
        }
      }),
    removeBusinessRule: (nodeId, ruleId) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.businessRules = node.data.businessRules.filter((r) => r.id !== ruleId);
      }),

    // ── APIs
    addApi: (nodeId, api) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.apis.push(api);
      }),
    updateApi: (nodeId, api) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          const idx = node.data.apis.findIndex((a) => a.id === api.id);
          if (idx !== -1) node.data.apis[idx] = api;
        }
      }),
    removeApi: (nodeId, apiId) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.apis = node.data.apis.filter((a) => a.id !== apiId);
      }),

    // ── Action Buttons
    addActionButton: (nodeId, btn) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) node.data.actionButtons.push(btn);
      }),
    updateActionButton: (nodeId, btn) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          const idx = node.data.actionButtons.findIndex((b) => b.id === btn.id);
          if (idx !== -1) node.data.actionButtons[idx] = btn;
        }
      }),
    removeActionButton: (nodeId, btnId) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node)
          node.data.actionButtons = node.data.actionButtons.filter((b) => b.id !== btnId);
      }),

    // ── Persistence
    exportWorkflow: () => {
      const { meta, nodes, edges } = get();
      return JSON.stringify({ meta, nodes, edges }, null, 2);
    },

    importWorkflow: (json) => {
      try {
        const parsed = JSON.parse(json) as Partial<{ meta: WorkflowMeta; nodes: WFNode[]; edges: WFEdge[] }>;
        const { meta, nodes, edges } = parsed;
        set((state) => {
          if (meta)  state.meta  = meta;
          if (nodes) {
            // Normalize: support old format where dimensions lived in style.width/height
            state.nodes = nodes.map((n: any) => ({
              ...n,
              width:  n.width  ?? n.style?.width  ?? 44,
              height: n.height ?? n.style?.height ?? 44,
            }));
          }
          if (edges) state.edges = edges;
          state.selectedNodeId = null;
          state.selectedEdgeId = null;
        });
      } catch {
        console.error('Failed to import workflow JSON');
      }
    },

    resetWorkflow: () =>
      set((state) => {
        state.meta = { ...defaultMeta, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.nodes = initialNodes;
        state.edges = initialEdges;
        state.selectedNodeId = null;
        state.selectedEdgeId = null;
      }),

    autoLayout: (direction = 'LR') =>
      set((state) => {
        state.nodes = applyDagreLayout(state.nodes, state.edges, direction);
      }),
  })),
);
