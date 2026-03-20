'use client';

import { memo, useId } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from '@/components/canvas/engine';
import { cn } from '@/lib/utils';
import { useWorkflowStore } from '@/lib/store';
import type { WorkflowNodeData } from '@/lib/types';
import { User, Cog, Code2, Layers, Flag, Mail, Clock } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

const HC =
  'wf-handle !w-[10px] !h-[10px] !rounded-full !bg-white !border-2 !border-indigo-400';

const rh = (c: string, round = false) => ({
  width: 6,
  height: 6,
  borderRadius: round ? '50%' : 2,
  backgroundColor: c,
  border: '1.5px solid #fff',
});
const rl = (c: string) => ({
  borderColor: c,
  borderWidth: 1,
  borderStyle: 'dashed' as const,
});

function Chip({ n, bg }: { n: number; bg: string }) {
  if (!n) return null;
  return (
    <span
      className={cn(
        'inline-flex h-[13px] min-w-[13px] items-center justify-center rounded-full px-[3px] text-[6.5px] font-bold leading-none',
        bg,
      )}
    >
      {n}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SVG EVENT NODES — proper circles with gradient fills
   ═══════════════════════════════════════════════════════════════════════════════ */

export const StartEventNode = memo(({ id, selected, data }: NodeProps) => {
  const { setSelectedNodeId } = useWorkflowStore();
  const label = (data as unknown as WorkflowNodeData).label ?? 'Start';
  const u = useId().replace(/:/g, '');

  return (
    <div className="wf-node relative h-full w-full cursor-pointer" onClick={() => setSelectedNodeId(id)}>
      <NodeResizer
        isVisible={!!selected}
        minWidth={28}
        minHeight={28}
        keepAspectRatio
        handleStyle={rh('#10b981', true)}
        lineStyle={rl('#10b981')}
      />
      <svg viewBox="0 0 36 36" className="h-full w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id={`f${u}`} x="-25%" y="-15%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
          </filter>
        </defs>
        {selected && (
          <circle cx="18" cy="18" r="17.5" fill="none" stroke="#6ee7b7" strokeWidth="1.5"
            strokeDasharray="3 2" className="wf-sel-ring" />
        )}
        <circle cx="18" cy="18" r="14.5" fill={`url(#g${u})`} filter={`url(#f${u})`} />
        <circle cx="18" cy="18" r="14.5" fill="none" stroke="#047857" strokeWidth="0.5" opacity="0.4" />
        <polygon points="15,10.5 15,25.5 26.5,18" fill="white" fillOpacity="0.95" />
      </svg>
      <span className="wf-label">{label}</span>
      <Handle type="source" position={Position.Right} className={HC} />
    </div>
  );
});
StartEventNode.displayName = 'StartEventNode';

export const EndEventNode = memo(({ id, selected, data }: NodeProps) => {
  const { setSelectedNodeId } = useWorkflowStore();
  const label = (data as unknown as WorkflowNodeData).label ?? 'End';
  const u = useId().replace(/:/g, '');

  return (
    <div className="wf-node relative h-full w-full cursor-pointer" onClick={() => setSelectedNodeId(id)}>
      <NodeResizer
        isVisible={!!selected}
        minWidth={28}
        minHeight={28}
        keepAspectRatio
        handleStyle={rh('#e11d48', true)}
        lineStyle={rl('#e11d48')}
      />
      <svg viewBox="0 0 36 36" className="h-full w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          <filter id={`f${u}`} x="-25%" y="-15%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
          </filter>
        </defs>
        {selected && (
          <circle cx="18" cy="18" r="17.5" fill="none" stroke="#fda4af" strokeWidth="1.5"
            strokeDasharray="3 2" className="wf-sel-ring" />
        )}
        <circle cx="18" cy="18" r="14.5" fill={`url(#g${u})`} filter={`url(#f${u})`} />
        <circle cx="18" cy="18" r="14.5" fill="none" stroke="#9f1239" strokeWidth="2.5" opacity="0.25" />
        <rect x="13" y="13" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.95" />
      </svg>
      <span className="wf-label">{label}</span>
      <Handle type="target" position={Position.Left} className={HC} />
    </div>
  );
});
EndEventNode.displayName = 'EndEventNode';

/* ═══════════════════════════════════════════════════════════════════════════════
   START MESSAGE EVENT — green circle + envelope symbol
   ═══════════════════════════════════════════════════════════════════════════════ */

export const StartMessageEventNode = memo(({ id, selected, data }: NodeProps) => {
  const { setSelectedNodeId } = useWorkflowStore();
  const label = (data as unknown as WorkflowNodeData).label ?? 'Message Start';
  const u = useId().replace(/:/g, '');

  return (
    <div className="wf-node relative h-full w-full cursor-pointer" onClick={() => setSelectedNodeId(id)}>
      <NodeResizer isVisible={!!selected} minWidth={28} minHeight={28} keepAspectRatio handleStyle={rh('#10b981', true)} lineStyle={rl('#10b981')} />
      <svg viewBox="0 0 36 36" className="h-full w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id={`f${u}`} x="-25%" y="-15%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
          </filter>
        </defs>
        {selected && <circle cx="18" cy="18" r="17.5" fill="none" stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="3 2" className="wf-sel-ring" />}
        <circle cx="18" cy="18" r="14.5" fill={`url(#g${u})`} filter={`url(#f${u})`} />
        <circle cx="18" cy="18" r="14.5" fill="none" stroke="#047857" strokeWidth="0.5" opacity="0.4" />
        {/* Envelope symbol */}
        <rect x="10" y="13" width="16" height="11" rx="1.5" fill="none" stroke="white" strokeWidth="1.2" strokeOpacity="0.9" />
        <polyline points="10,13 18,20 26,13" fill="none" stroke="white" strokeWidth="1.2" strokeOpacity="0.9" strokeLinejoin="round" />
      </svg>
      <span className="wf-label">{label}</span>
      <Handle type="source" position={Position.Right} className={HC} />
    </div>
  );
});
StartMessageEventNode.displayName = 'StartMessageEventNode';

/* ═══════════════════════════════════════════════════════════════════════════════
   INTERMEDIATE MESSAGE EVENT — double-ring circle + envelope
   ═══════════════════════════════════════════════════════════════════════════════ */

export const IntermediateMessageEventNode = memo(({ id, selected, data }: NodeProps) => {
  const { setSelectedNodeId } = useWorkflowStore();
  const label = (data as unknown as WorkflowNodeData).label ?? 'Message';
  const u = useId().replace(/:/g, '');

  return (
    <div className="wf-node relative h-full w-full cursor-pointer" onClick={() => setSelectedNodeId(id)}>
      <NodeResizer isVisible={!!selected} minWidth={28} minHeight={28} keepAspectRatio handleStyle={rh('#f59e0b', true)} lineStyle={rl('#f59e0b')} />
      <svg viewBox="0 0 36 36" className="h-full w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id={`f${u}`} x="-25%" y="-15%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
          </filter>
        </defs>
        {selected && <circle cx="18" cy="18" r="17.5" fill="none" stroke="#fde68a" strokeWidth="1.5" strokeDasharray="3 2" className="wf-sel-ring" />}
        {/* Outer ring */}
        <circle cx="18" cy="18" r="14.5" fill={`url(#g${u})`} filter={`url(#f${u})`} />
        {/* Inner double-ring (BPMN intermediate event marker) */}
        <circle cx="18" cy="18" r="11.5" fill="none" stroke="#92400e" strokeWidth="0.8" opacity="0.35" />
        {/* Envelope symbol */}
        <rect x="11" y="14" width="14" height="9" rx="1" fill="none" stroke="white" strokeWidth="1.1" strokeOpacity="0.9" />
        <polyline points="11,14 18,19.5 25,14" fill="none" stroke="white" strokeWidth="1.1" strokeOpacity="0.9" strokeLinejoin="round" />
      </svg>
      <span className="wf-label">{label}</span>
      <Handle type="target" position={Position.Left} className={HC} />
      <Handle type="source" position={Position.Right} className={HC} />
    </div>
  );
});
IntermediateMessageEventNode.displayName = 'IntermediateMessageEventNode';

/* ═══════════════════════════════════════════════════════════════════════════════
   TIMER EVENT — circle + clock face (can act as start or intermediate)
   ═══════════════════════════════════════════════════════════════════════════════ */

export const TimerEventNode = memo(({ id, selected, data }: NodeProps) => {
  const { setSelectedNodeId } = useWorkflowStore();
  const label = (data as unknown as WorkflowNodeData).label ?? 'Timer';
  const u = useId().replace(/:/g, '');

  return (
    <div className="wf-node relative h-full w-full cursor-pointer" onClick={() => setSelectedNodeId(id)}>
      <NodeResizer isVisible={!!selected} minWidth={28} minHeight={28} keepAspectRatio handleStyle={rh('#6366f1', true)} lineStyle={rl('#6366f1')} />
      <svg viewBox="0 0 36 36" className="h-full w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <filter id={`f${u}`} x="-25%" y="-15%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
          </filter>
        </defs>
        {selected && <circle cx="18" cy="18" r="17.5" fill="none" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="3 2" className="wf-sel-ring" />}
        <circle cx="18" cy="18" r="14.5" fill={`url(#g${u})`} filter={`url(#f${u})`} />
        {/* Inner double-ring */}
        <circle cx="18" cy="18" r="11.5" fill="none" stroke="#3730a3" strokeWidth="0.8" opacity="0.3" />
        {/* Clock face */}
        <circle cx="18" cy="18" r="8" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.85" />
        {/* Hour hand (pointing ~10:10) */}
        <line x1="18" y1="18" x2="18" y2="12.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.9" />
        <line x1="18" y1="18" x2="21.8" y2="20.2" stroke="white" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.9" />
        <circle cx="18" cy="18" r="1" fill="white" fillOpacity="0.9" />
        {/* Tick marks at 12, 3, 6, 9 */}
        <line x1="18" y1="11" x2="18" y2="12.5" stroke="white" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="25" y1="18" x2="23.5" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="18" y1="25" x2="18" y2="23.5" stroke="white" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="11" y1="18" x2="12.5" y2="18" stroke="white" strokeWidth="1" strokeOpacity="0.6" />
      </svg>
      <span className="wf-label">{label}</span>
      <Handle type="target" position={Position.Left} className={HC} />
      <Handle type="source" position={Position.Right} className={HC} />
    </div>
  );
});
TimerEventNode.displayName = 'TimerEventNode';

/* ═══════════════════════════════════════════════════════════════════════════════
   PREMIUM TASK NODES — accent bar + icon badge + label + chips
   ═══════════════════════════════════════════════════════════════════════════════ */

interface TaskBaseProps {
  id: string;
  selected?: boolean;
  data: WorkflowNodeData;
  icon: React.ReactNode;
  accent: string;
  iconBg: string;
  borderSel: string;
  ringSel: string;
}

const TaskBase = memo(
  ({ id, selected, data, icon, accent, iconBg, borderSel, ringSel }: TaskBaseProps) => {
    const { setSelectedNodeId } = useWorkflowStore();
    const ic = data.inputFields?.length ?? 0;
    const oc = data.outputFields?.length ?? 0;
    const rc = data.businessRules?.length ?? 0;
    const ac = data.apis?.length ?? 0;
    const hasChips = ic + oc + rc + ac > 0;

    return (
      <div
        className={cn(
          'wf-node wf-task relative flex h-full w-full cursor-pointer items-center gap-2 rounded-lg border bg-gradient-to-b from-white to-slate-50/80 px-2.5',
          selected ? `${borderSel} ring-1 ring-offset-1 ${ringSel}` : 'border-slate-200/80',
        )}
        style={{ borderLeftWidth: 3, borderLeftColor: accent }}
        onClick={() => setSelectedNodeId(id)}
      >
        <NodeResizer
          isVisible={!!selected}
          minWidth={120}
          minHeight={32}
          handleStyle={rh('#6366f1')}
          lineStyle={rl('#6366f1')}
        />

        <div className={cn('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-white shadow-sm', iconBg)}>
          {icon}
        </div>

        <div className="min-w-0 flex-1 py-1">
          <span className="block truncate text-[10.5px] font-semibold leading-tight text-slate-700" title={data.label}>
            {data.label}
          </span>
          {hasChips && (
            <div className="mt-px flex gap-[3px]">
              <Chip n={ic} bg="bg-blue-100 text-blue-700" />
              <Chip n={oc} bg="bg-emerald-100 text-emerald-700" />
              <Chip n={rc} bg="bg-amber-100 text-amber-700" />
              <Chip n={ac} bg="bg-purple-100 text-purple-700" />
            </div>
          )}
        </div>

        <Handle type="target" position={Position.Left} className={HC} />
        <Handle type="source" position={Position.Right} className={HC} />
      </div>
    );
  },
);
TaskBase.displayName = 'TaskBase';

export const UserTaskNode = memo(({ id, selected, data }: NodeProps) => (
  <TaskBase id={id} selected={selected} data={data as unknown as WorkflowNodeData}
    icon={<User size={11} />} accent="#3b82f6" iconBg="bg-blue-500" borderSel="border-blue-300" ringSel="ring-blue-200" />
));
UserTaskNode.displayName = 'UserTaskNode';

export const ServiceTaskNode = memo(({ id, selected, data }: NodeProps) => (
  <TaskBase id={id} selected={selected} data={data as unknown as WorkflowNodeData}
    icon={<Cog size={11} />} accent="#8b5cf6" iconBg="bg-violet-500" borderSel="border-violet-300" ringSel="ring-violet-200" />
));
ServiceTaskNode.displayName = 'ServiceTaskNode';

export const ScriptTaskNode = memo(({ id, selected, data }: NodeProps) => (
  <TaskBase id={id} selected={selected} data={data as unknown as WorkflowNodeData}
    icon={<Code2 size={11} />} accent="#f97316" iconBg="bg-orange-500" borderSel="border-orange-300" ringSel="ring-orange-200" />
));
ScriptTaskNode.displayName = 'ScriptTaskNode';

export const SubProcessNode = memo(({ id, selected, data }: NodeProps) => (
  <TaskBase id={id} selected={selected} data={data as unknown as WorkflowNodeData}
    icon={<Layers size={11} />} accent="#475569" iconBg="bg-slate-600" borderSel="border-slate-400" ringSel="ring-slate-300" />
));
SubProcessNode.displayName = 'SubProcessNode';

/* ═══════════════════════════════════════════════════════════════════════════════
   SVG GATEWAY NODES — proper rotated diamonds with gradient fills
   ═══════════════════════════════════════════════════════════════════════════════ */

type GatewayVariant = 'exclusive' | 'parallel' | 'inclusive';

const GATEWAY_CFG: Record<GatewayVariant, {
  grad: [string, string]; stroke: string; sel: string; symbol: React.ReactNode;
}> = {
  exclusive: {
    grad: ['#fcd34d', '#d97706'], stroke: '#92400e', sel: '#fcd34d',
    symbol: (
      <g stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="15" y1="15" x2="25" y2="25" />
        <line x1="25" y1="15" x2="15" y2="25" />
      </g>
    ),
  },
  parallel: {
    grad: ['#5eead4', '#0d9488'], stroke: '#134e4a', sel: '#5eead4',
    symbol: (
      <g stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="20" y1="13" x2="20" y2="27" />
        <line x1="13" y1="20" x2="27" y2="20" />
      </g>
    ),
  },
  inclusive: {
    grad: ['#7dd3fc', '#0284c7'], stroke: '#0c4a6e', sel: '#7dd3fc',
    symbol: <circle cx="20" cy="20" r="5.5" fill="none" stroke="white" strokeWidth="2" />,
  },
};

interface GatewayBaseProps {
  id: string;
  selected?: boolean;
  data: WorkflowNodeData;
  variant: GatewayVariant;
}

const GatewayBase = memo(({ id, selected, data, variant }: GatewayBaseProps) => {
  const { setSelectedNodeId } = useWorkflowStore();
  const u = useId().replace(/:/g, '');
  const cfg = GATEWAY_CFG[variant];

  return (
    <div className="wf-node relative h-full w-full cursor-pointer" onClick={() => setSelectedNodeId(id)}>
      <NodeResizer
        isVisible={!!selected}
        minWidth={32}
        minHeight={32}
        keepAspectRatio
        handleStyle={rh(cfg.sel)}
        lineStyle={rl(cfg.sel)}
      />
      <svg viewBox="0 0 40 40" className="h-full w-full" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`g${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cfg.grad[0]} />
            <stop offset="100%" stopColor={cfg.grad[1]} />
          </linearGradient>
          <filter id={`f${u}`} x="-25%" y="-15%" width="150%" height="150%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.12" />
          </filter>
        </defs>
        {selected && (
          <rect x="6" y="6" width="28" height="28" rx="2.5"
            transform="rotate(45 20 20)" fill="none" stroke={cfg.sel}
            strokeWidth="1.5" strokeDasharray="3 2" className="wf-sel-ring" />
        )}
        <rect x="8" y="8" width="24" height="24" rx="2.5"
          transform="rotate(45 20 20)" fill={`url(#g${u})`} filter={`url(#f${u})`} />
        <rect x="8" y="8" width="24" height="24" rx="2.5"
          transform="rotate(45 20 20)" fill="none" stroke={cfg.stroke} strokeWidth="0.5" opacity="0.3" />
        {cfg.symbol}
      </svg>
      <span className="wf-label">{data.label}</span>
      <Handle type="target" position={Position.Left} className={HC} />
      <Handle type="source" position={Position.Right} className={HC} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={HC} />
    </div>
  );
});
GatewayBase.displayName = 'GatewayBase';

export const ExclusiveGatewayNode = memo(({ id, selected, data }: NodeProps) => (
  <GatewayBase id={id} selected={selected} data={data as unknown as WorkflowNodeData} variant="exclusive" />
));
ExclusiveGatewayNode.displayName = 'ExclusiveGatewayNode';

export const ParallelGatewayNode = memo(({ id, selected, data }: NodeProps) => (
  <GatewayBase id={id} selected={selected} data={data as unknown as WorkflowNodeData} variant="parallel" />
));
ParallelGatewayNode.displayName = 'ParallelGatewayNode';

export const InclusiveGatewayNode = memo(({ id, selected, data }: NodeProps) => (
  <GatewayBase id={id} selected={selected} data={data as unknown as WorkflowNodeData} variant="inclusive" />
));
InclusiveGatewayNode.displayName = 'InclusiveGatewayNode';

/* ═══════════════════════════════════════════════════════════════════════════════
   NODE TYPE MAP
   ═══════════════════════════════════════════════════════════════════════════════ */

export const nodeTypes = {
  startEvent: StartEventNode,
  startMessageEvent: StartMessageEventNode,
  endEvent: EndEventNode,
  intermediateMessageEvent: IntermediateMessageEventNode,
  timerEvent: TimerEventNode,
  userTask: UserTaskNode,
  serviceTask: ServiceTaskNode,
  scriptTask: ScriptTaskNode,
  exclusiveGateway: ExclusiveGatewayNode,
  parallelGateway: ParallelGatewayNode,
  inclusiveGateway: InclusiveGatewayNode,
  subProcess: SubProcessNode,
  swimlane: SwimlaneNode,
  milestone: MilestoneNode,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   SWIMLANE NODE — large horizontal lane / container
   ═══════════════════════════════════════════════════════════════════════════════ */

export function SwimlaneNode({ id, selected, data }: NodeProps) {
  const { setSelectedNodeId } = useWorkflowStore();
  const wd = data as unknown as WorkflowNodeData;
  const accent = wd.color ?? '#6366f1';

  return (
    <div
      className="wf-node relative h-full w-full cursor-pointer"
      onClick={() => setSelectedNodeId(id)}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={200}
        minHeight={80}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, backgroundColor: accent, border: '1.5px solid #fff' }}
        lineStyle={{ borderColor: accent, borderWidth: 1, borderStyle: 'dashed' as const }}
      />

      {/* Container border */}
      <div
        style={{
          position:     'absolute',
          inset:        0,
          borderRadius: 10,
          border:       `1.5px dashed ${selected ? accent : '#c7d2fe'}`,
          background:   selected ? 'rgba(99,102,241,0.04)' : 'rgba(241,245,255,0.6)',
          transition:   'border-color 150ms, background 150ms',
          pointerEvents:'none',
        }}
      />

      {/* Header bar */}
      <div
        style={{
          position:      'absolute',
          top:           0,
          left:          0,
          right:         0,
          height:        28,
          borderRadius:  '10px 10px 0 0',
          background:    `linear-gradient(90deg, ${accent}22, ${accent}11)`,
          borderBottom:  `1px solid ${accent}44`,
          display:       'flex',
          alignItems:    'center',
          paddingLeft:   10,
          gap:           6,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.04em', userSelect: 'none' }}>
          {wd.label || 'Swimlane'}
        </span>
      </div>

      <Handle type="target" position={Position.Left}  className="wf-handle !w-[10px] !h-[10px] !rounded-full !bg-white !border-2 !border-indigo-400" />
      <Handle type="source" position={Position.Right} className="wf-handle !w-[10px] !h-[10px] !rounded-full !bg-white !border-2 !border-indigo-400" />
    </div>
  );
}
SwimlaneNode.displayName = 'SwimlaneNode';

/* ═══════════════════════════════════════════════════════════════════════════════
   MILESTONE NODE — flag marker / diamond pill for timeline checkpoints
   ═══════════════════════════════════════════════════════════════════════════════ */

export function MilestoneNode({ id, selected, data }: NodeProps) {
  const { setSelectedNodeId } = useWorkflowStore();
  const wd = data as unknown as WorkflowNodeData;

  return (
    <div
      className="wf-node relative h-full w-full cursor-pointer"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={() => setSelectedNodeId(id)}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={80}
        minHeight={28}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#7c3aed', border: '1.5px solid #fff' }}
        lineStyle={{ borderColor: '#7c3aed', borderWidth: 1, borderStyle: 'dashed' as const }}
      />

      {/* Diamond shape via rotated rounded rect */}
      <div
        style={{
          position:     'absolute',
          inset:        0,
          display:      'flex',
          alignItems:   'center',
          justifyContent:'center',
          gap:          6,
          borderRadius: 6,
          background:   selected
            ? 'linear-gradient(135deg, #ede9fe, #ddd6fe)'
            : 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
          border:       `${selected ? 2 : 1.5}px solid ${selected ? '#7c3aed' : '#a78bfa'}`,
          boxShadow:    selected
            ? '0 0 0 3px rgba(124,58,237,0.12), 0 2px 8px rgba(124,58,237,0.15)'
            : '0 1px 4px rgba(124,58,237,0.1)',
          transition:   'all 150ms',
        }}
      >
        <Flag size={11} style={{ color: '#7c3aed', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#5b21b6', userSelect: 'none', whiteSpace: 'nowrap' }}>
          {wd.label || 'Milestone'}
        </span>
      </div>

      <Handle type="target" position={Position.Left}  className="wf-handle !w-[10px] !h-[10px] !rounded-full !bg-white !border-2 !border-violet-400" />
      <Handle type="source" position={Position.Right} className="wf-handle !w-[10px] !h-[10px] !rounded-full !bg-white !border-2 !border-violet-400" />
    </div>
  );
}
MilestoneNode.displayName = 'MilestoneNode';
