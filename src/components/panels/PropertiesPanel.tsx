'use client';

import { useCallback } from 'react';
import {
  X,
  Info,
  FormInput,
  ArrowRightLeft,
  BookOpen,
  Plug,
  Trash2,
  User,
  Cog,
  GitBranch,
  Layers,
  Play,
  Square,
  Flag,
  AlignLeft,
  Mail,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { showConfirm } from '@/lib/confirmStore';
import { useWorkflowStore } from '@/lib/store';
import { FieldsEditor } from './FieldsEditor';
import { ApiActionsEditor } from './ApiActionsEditor';
import { cn } from '@/lib/utils';
import type { WFNodeType, TaskPriority, AssigneeType } from '@/lib/types';
import { useState, useRef } from 'react';

// ─── Tab definition ───────────────────────────────────────────────────────────

type Tab = 'general' | 'input' | 'output' | 'rules' | 'apis';

const ALL_TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Info size={13} /> },
  { id: 'input', label: 'Input', icon: <FormInput size={13} /> },
  { id: 'output', label: 'Output', icon: <ArrowRightLeft size={13} /> },
  { id: 'rules', label: 'Rules', icon: <BookOpen size={13} /> },
  { id: 'apis', label: 'APIs & Actions', icon: <Plug size={13} /> },
];

// Hide APIs tab for gateway/event nodes
const TABS_BY_NODE_TYPE: Record<WFNodeType, Tab[]> = {
  startEvent:               ['general'],
  startMessageEvent:        ['general', 'input', 'output'],
  endEvent:                 ['general'],
  intermediateMessageEvent: ['general', 'input', 'output'],
  timerEvent:               ['general'],
  errorBoundaryEvent:       ['general'],
  userTask:         ['general', 'input', 'output', 'rules', 'apis'],
  serviceTask:      ['general', 'input', 'output', 'rules', 'apis'],
  scriptTask:       ['general'],
  exclusiveGateway: ['general'],
  parallelGateway:  ['general'],
  inclusiveGateway: ['general'],
  subProcess:       ['general', 'input', 'output', 'rules'],
  swimlane:         ['general'],
  milestone:        ['general'],
};

// ─── Node type icon / colour ──────────────────────────────────────────────────

const NODE_META: Record<WFNodeType, { icon: React.ReactNode; color: string; label: string }> = {
  startEvent:               { icon: <Play size={14} fill="white" />,              color: 'bg-emerald-500', label: 'Start Event' },
  startMessageEvent:        { icon: <Mail size={14} />,                            color: 'bg-emerald-600', label: 'Message Start' },
  endEvent:                 { icon: <Square size={12} fill="white" />,             color: 'bg-rose-500',    label: 'End Event' },
  intermediateMessageEvent: { icon: <Mail size={14} />,                            color: 'bg-amber-500',   label: 'Message Event' },
  timerEvent:               { icon: <Clock size={14} />,                           color: 'bg-indigo-500',  label: 'Timer Event' },
  errorBoundaryEvent:       { icon: <AlertTriangle size={14} />,                   color: 'bg-red-600',     label: 'Error Boundary' },
  userTask:         { icon: <User size={14} />,                            color: 'bg-blue-500',    label: 'User Task' },
  serviceTask:      { icon: <Cog size={14} />,                             color: 'bg-violet-500',  label: 'Service Task' },
  scriptTask:       { icon: <GitBranch size={14} />,                       color: 'bg-orange-500',  label: 'Script Task' },
  exclusiveGateway: { icon: <span className="text-xs font-black">✕</span>, color: 'bg-amber-400',   label: 'Exclusive Gateway' },
  parallelGateway:  { icon: <span className="text-xs font-black">+</span>, color: 'bg-teal-500',    label: 'Parallel Gateway' },
  inclusiveGateway: { icon: <span className="text-xs font-black">○</span>, color: 'bg-sky-500',     label: 'Inclusive Gateway' },
  subProcess:       { icon: <Layers size={14} />,                          color: 'bg-slate-600',   label: 'Sub-Process' },
  swimlane:         { icon: <AlignLeft size={14} />,                       color: 'bg-indigo-500',  label: 'Swimlane' },
  milestone:        { icon: <Flag size={14} />,                            color: 'bg-violet-600',  label: 'Milestone' },
};

// ─── Rules tab — simplified description field ─────────────────────────────────

function RulesDescriptionEditor({ nodeId }: { nodeId: string }) {
  const { nodes, updateNodeData } = useWorkflowStore();
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Business Rules Description
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          rows={8}
          value={(node.data.description as string) ?? ''}
          onChange={(e) => updateNodeData(nodeId, { description: e.target.value })}
          placeholder="Describe the business rules, conditions, and logic that govern this activity…"
        />
      </div>
    </div>
  );
}

// ─── General tab content ──────────────────────────────────────────────────────

function GeneralEditor({ nodeId }: { nodeId: string }) {
  const store = useWorkflowStore();
  const node = store.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const data = node.data;
  const update = (patch: Parameters<typeof store.updateNodeData>[1]) =>
    store.updateNodeData(nodeId, patch);

  const isUserTask = data.nodeType === 'userTask';
  const isServiceTask = data.nodeType === 'serviceTask';
  const isScriptTask = data.nodeType === 'scriptTask';
  const isGateway = ['exclusiveGateway', 'parallelGateway', 'inclusiveGateway'].includes(
    data.nodeType,
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Name */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Name
        </label>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Activity name"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Description
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          rows={3}
          value={data.description ?? ''}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Describe what this activity does…"
        />
      </div>

      {/* UserTask specific */}
      {isUserTask && (
        <>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Form Title
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              value={data.formTitle ?? ''}
              onChange={(e) => update({ formTitle: e.target.value })}
              placeholder="Form title shown to the user"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Assignee
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={data.assignee ?? ''}
                onChange={(e) => update({ assignee: e.target.value })}
                placeholder="user@example.com / ROLE_ADMIN"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Assignee Type
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={data.assigneeType ?? 'user'}
                onChange={(e) => update({ assigneeType: e.target.value as AssigneeType })}
              >
                <option value="user">User</option>
                <option value="role">Role / Group</option>
                <option value="expression">Expression</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Priority
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={data.priority ?? 'medium'}
                onChange={(e) => update({ priority: e.target.value as TaskPriority })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={data.dueDate ?? ''}
                onChange={(e) => update({ dueDate: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {/* Service task */}
      {isServiceTask && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Retry Count
            </label>
            <input
              type="number"
              min={0}
              max={10}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-300"
              value={data.retryCount ?? 3}
              onChange={(e) => update({ retryCount: parseInt(e.target.value) })}
            />
          </div>
        </div>
      )}

      {/* Script task */}
      {isScriptTask && (
        <>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Script Language
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-300"
              value={data.scriptLanguage ?? 'javascript'}
              onChange={(e) =>
                update({ scriptLanguage: e.target.value as 'javascript' | 'python' | 'groovy' })
              }
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="groovy">Groovy</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Script Body
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[10px] text-slate-700 outline-none focus:border-indigo-300"
              rows={8}
              value={data.scriptBody ?? ''}
              onChange={(e) => update({ scriptBody: e.target.value })}
              placeholder="// Write your business logic here&#10;// Access fields via: context.get('fieldName')&#10;// Set output via: context.set('outputField', value)"
            />
          </div>
        </>
      )}

      {/* Node ID (read-only) */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Node ID
        </label>
        <input
          readOnly
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-400 cursor-default"
          value={nodeId}
        />
      </div>
    </div>
  );
}

// ─── Edge editor ──────────────────────────────────────────────────────────────

function EdgeEditor({ edgeId }: { edgeId: string }) {
  const store = useWorkflowStore();
  const edge = store.edges.find((e) => e.id === edgeId);
  if (!edge) return null;
  const data = (edge.data ?? {}) as { label?: string; condition?: string; isDefault?: boolean };
  const update = (patch: Partial<typeof data>) => store.updateEdgeData(edgeId, patch);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-bold text-slate-700">Sequence Flow</h3>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Label
        </label>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300"
          value={data.label ?? ''}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="e.g. Approved"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Condition Expression
        </label>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-700 outline-none focus:border-indigo-300"
          value={data.condition ?? ''}
          onChange={(e) => update({ condition: e.target.value })}
          placeholder="e.g. status == 'approved'"
        />
        <p className="mt-1 text-[9px] text-slate-400">
          Evaluated at runtime. Access fields via their name.
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={!!data.isDefault}
          onChange={(e) => update({ isDefault: e.target.checked })}
          className="h-4 w-4 rounded"
        />
        Default flow (taken when no other condition matches)
      </label>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Edge ID</label>
        <input
          readOnly
          className="w-full rounded border border-slate-100 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-400"
          value={edgeId}
        />
      </div>
    </div>
  );
}

// ─── Resize drag handle ───────────────────────────────────────────────────────

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = lastX.current - e.clientX;
    lastX.current = e.clientX;
    onResize(delta);
  }, [onResize]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group hover:bg-indigo-400/20 transition-colors"
      title="Drag to resize"
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
    </div>
  );
}

// ─── PropertiesPanel ──────────────────────────────────────────────────────────

const MIN_PANEL_W = 280;
const MAX_PANEL_W = 640;
const DEFAULT_PANEL_W = 320;

export function PropertiesPanel() {
  const { selectedNodeId, selectedEdgeId, setSelectedNodeId, setSelectedEdgeId, nodes, deleteNode, deleteEdge } =
    useWorkflowStore();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_W);

  const handleResize = useCallback((delta: number) => {
    setPanelWidth(w => Math.max(MIN_PANEL_W, Math.min(MAX_PANEL_W, w + delta)));
  }, []);

  const node = nodes.find((n) => n.id === selectedNodeId);
  const isOpen = !!selectedNodeId || !!selectedEdgeId;

  if (!isOpen) return null;

  // Edge mode
  if (selectedEdgeId) {
    return (
      <aside className="relative flex h-full shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl" style={{ width: panelWidth }}>
        <ResizeHandle onResize={handleResize} />
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Sequence Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                showConfirm({
                  title: 'Delete connection?',
                  description: 'This sequence flow will be permanently removed.',
                  confirmLabel: 'Delete',
                  variant: 'danger',
                  onConfirm: () => deleteEdge(selectedEdgeId),
                });
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-500"
              title="Delete edge"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={() => setSelectedEdgeId(null)}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <EdgeEditor edgeId={selectedEdgeId} />
        </div>
      </aside>
    );
  }

  if (!node) return null;

  const meta = NODE_META[node.data.nodeType];
  const allowedTabs = TABS_BY_NODE_TYPE[node.data.nodeType] ?? ['general'];
  const tabs = ALL_TABS.filter((t) => allowedTabs.includes(t.id));
  const safeTab = allowedTabs.includes(activeTab) ? activeTab : 'general';

  return (
    <aside className="relative flex h-full shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl" style={{ width: panelWidth }}>
      <ResizeHandle onResize={handleResize} />
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm',
              meta.color,
            )}
          >
            {meta.icon}
          </div>
          <div>
            <p className="text-[10px] text-slate-400">{meta.label}</p>
            <p className="text-sm font-bold text-slate-800 leading-tight">{node.data.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              showConfirm({
                title: `Delete "${node.data.label}"?`,
                description: 'The node and all its connections will be permanently removed.',
                confirmLabel: 'Delete',
                variant: 'danger',
                onConfirm: () => deleteNode(node.id),
              });
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-500"
            title="Delete node"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setSelectedNodeId(null)}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
            title="Close panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex border-b border-slate-100 bg-slate-50 px-4 py-1.5 gap-3">
        {[
          { label: 'In', val: node.data.inputFields.length, color: 'text-blue-600' },
          { label: 'Out', val: node.data.outputFields.length, color: 'text-green-600' },
          { label: 'Rules', val: node.data.businessRules.length, color: 'text-amber-600' },
          { label: 'APIs', val: node.data.apis.length, color: 'text-purple-600' },
          { label: 'Btns', val: node.data.actionButtons.length, color: 'text-slate-600' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className={cn('text-sm font-bold leading-none', s.color)}>{s.val}</p>
            <p className="text-[9px] text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex overflow-x-auto border-b border-slate-200 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[11px] font-semibold transition-colors',
                safeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {safeTab === 'general' && <GeneralEditor nodeId={node.id} />}
        {safeTab === 'input' && <FieldsEditor nodeId={node.id} mode="input" />}
        {safeTab === 'output' && <FieldsEditor nodeId={node.id} mode="output" />}
        {safeTab === 'rules' && <RulesDescriptionEditor nodeId={node.id} />}
        {safeTab === 'apis' && <ApiActionsEditor nodeId={node.id} />}
      </div>
    </aside>
  );
}
