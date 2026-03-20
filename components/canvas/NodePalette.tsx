'use client';

import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Square,
  User,
  Cog,
  Layers,
  Search,
  X,
  Flag,
  AlignLeft,
  GripVertical,
  Mail,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WFNodeType } from '@/lib/types';

interface PaletteItem {
  type: WFNodeType;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  accent: string;       // tailwind color token e.g. 'emerald'
  accentHex: string;    // hex for inline style
  shape: 'circle' | 'diamond' | 'rounded';
  category: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Events
  {
    type: 'startEvent',
    label: 'Start Event',
    shortLabel: 'Start',
    description: 'Where the process begins',
    icon: <Play size={13} fill="currentColor" />,
    accent: 'emerald',
    accentHex: '#10b981',
    shape: 'circle',
    category: 'Events',
  },
  {
    type: 'startMessageEvent',
    label: 'Message Start',
    shortLabel: 'Msg Start',
    description: 'Process triggered by a message',
    icon: <Mail size={12} />,
    accent: 'emerald',
    accentHex: '#059669',
    shape: 'circle',
    category: 'Events',
  },
  {
    type: 'endEvent',
    label: 'End Event',
    shortLabel: 'End',
    description: 'Final state of the process',
    icon: <Square size={10} fill="currentColor" />,
    accent: 'rose',
    accentHex: '#f43f5e',
    shape: 'circle',
    category: 'Events',
  },
  {
    type: 'intermediateMessageEvent',
    label: 'Message Event',
    shortLabel: 'Message',
    description: 'Intermediate point to send or receive a message',
    icon: <Mail size={12} />,
    accent: 'amber',
    accentHex: '#d97706',
    shape: 'circle',
    category: 'Events',
  },
  {
    type: 'timerEvent',
    label: 'Timer Event',
    shortLabel: 'Timer',
    description: 'Pause until a time condition is met',
    icon: <Clock size={12} />,
    accent: 'indigo',
    accentHex: '#4f46e5',
    shape: 'circle',
    category: 'Events',
  },
  {
    type: 'errorBoundaryEvent',
    label: 'Error Boundary',
    shortLabel: 'Error',
    description: 'Catches exceptions thrown by an activity',
    icon: <AlertTriangle size={12} />,
    accent: 'red',
    accentHex: '#dc2626',
    shape: 'circle',
    category: 'Events',
  },
  // Activities
  {
    type: 'userTask',
    label: 'User Task',
    shortLabel: 'User Task',
    description: 'A human step — form, review, or decision',
    icon: <User size={13} />,
    accent: 'blue',
    accentHex: '#3b82f6',
    shape: 'rounded',
    category: 'Activities',
  },
  {
    type: 'serviceTask',
    label: 'Service Task',
    shortLabel: 'Service',
    description: 'Automated API or system call',
    icon: <Cog size={13} />,
    accent: 'violet',
    accentHex: '#8b5cf6',
    shape: 'rounded',
    category: 'Activities',
  },
  {
    type: 'subProcess',
    label: 'Sub-Process',
    shortLabel: 'Sub-Process',
    description: 'Embeds a reusable workflow',
    icon: <Layers size={13} />,
    accent: 'slate',
    accentHex: '#64748b',
    shape: 'rounded',
    category: 'Activities',
  },
  // Gateways
  {
    type: 'exclusiveGateway',
    label: 'Exclusive Gateway',
    shortLabel: 'XOR',
    description: 'Routes to exactly one branch',
    icon: <span className="text-[10px] font-black leading-none">✕</span>,
    accent: 'amber',
    accentHex: '#f59e0b',
    shape: 'diamond',
    category: 'Gateways',
  },
  {
    type: 'parallelGateway',
    label: 'Parallel Gateway',
    shortLabel: 'AND',
    description: 'Fork into simultaneous branches',
    icon: <span className="text-[10px] font-black leading-none">+</span>,
    accent: 'teal',
    accentHex: '#14b8a6',
    shape: 'diamond',
    category: 'Gateways',
  },
  {
    type: 'inclusiveGateway',
    label: 'Inclusive Gateway',
    shortLabel: 'OR',
    description: 'Routes to one or more branches',
    icon: <span className="text-[10px] font-black leading-none">○</span>,
    accent: 'sky',
    accentHex: '#0ea5e9',
    shape: 'diamond',
    category: 'Gateways',
  },
  // Structure
  {
    type: 'swimlane',
    label: 'Swimlane',
    shortLabel: 'Swimlane',
    description: 'Groups activities by role',
    icon: <AlignLeft size={13} />,
    accent: 'indigo',
    accentHex: '#6366f1',
    shape: 'rounded',
    category: 'Structure',
  },
  {
    type: 'milestone',
    label: 'Milestone',
    shortLabel: 'Milestone',
    description: 'Checkpoint or phase marker',
    icon: <Flag size={13} />,
    accent: 'violet',
    accentHex: '#7c3aed',
    shape: 'rounded',
    category: 'Structure',
  },
];

const CATEGORY_ORDER = ['Events', 'Activities', 'Gateways', 'Structure'];

// ─── Floating tooltip (rendered via portal so it's never clipped) ─────────────

function FloatingTooltip({ text, anchorRect }: { text: string; anchorRect: DOMRect | null }) {
  if (!anchorRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: anchorRect.right + 12,
    top: anchorRect.top + anchorRect.height / 2,
    transform: 'translateY(-50%)',
    zIndex: 9999,
    pointerEvents: 'none',
  };

  return createPortal(
    <div style={style}>
      <div
        className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-xl"
        style={{ maxWidth: 220, backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[11px] font-medium text-slate-700 leading-snug">{text}</p>
      </div>
    </div>,
    document.body,
  );
}

// ─── Draggable palette card ──────────────────────────────────────────────────

function PaletteCard({ item }: { item: PaletteItem }) {
  const [hovered, setHovered] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/workflow-node-type', item.type);
      e.dataTransfer.setData('application/workflow-node-label', item.label);
      e.dataTransfer.effectAllowed = 'copy';
      setHovered(false);
    },
    [item],
  );

  const onMouseEnter = useCallback(() => {
    setHovered(true);
    if (cardRef.current) setAnchorRect(cardRef.current.getBoundingClientRect());
  }, []);

  const onMouseLeave = useCallback(() => {
    setHovered(false);
    setAnchorRect(null);
  }, []);

  const shapeClass =
    item.shape === 'circle' ? 'rounded-full' :
    item.shape === 'diamond' ? 'rounded-[3px] rotate-45' :
    'rounded-lg';

  return (
    <>
      <div
        ref={cardRef}
        draggable
        onDragStart={onDragStart}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          'group flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-grab transition-all duration-150',
          'border border-transparent',
          'hover:bg-slate-50 hover:border-slate-200/80 hover:shadow-sm',
          'active:scale-[0.97] active:cursor-grabbing active:shadow-none',
        )}
      >
        {/* Icon container */}
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center text-white',
            'shadow-sm transition-transform duration-150',
            'group-hover:scale-110 group-hover:shadow-md',
            shapeClass,
          )}
          style={{
            width: item.shape === 'diamond' ? 26 : 30,
            height: item.shape === 'diamond' ? 26 : 30,
            background: `linear-gradient(135deg, ${item.accentHex}cc, ${item.accentHex})`,
          }}
        >
          <span className={item.shape === 'diamond' ? '-rotate-45 flex items-center justify-center' : 'flex items-center justify-center'}>
            {item.icon}
          </span>
        </div>

        {/* Label + description */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-700 leading-tight truncate">
            {item.label}
          </p>
          <p className="text-[9px] text-slate-400 leading-tight mt-px truncate">
            {item.description}
          </p>
        </div>

        {/* Drag grip */}
        <GripVertical size={12} className="shrink-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {hovered && <FloatingTooltip text={`${item.label} — ${item.description}. Drag onto canvas to add.`} anchorRect={anchorRect} />}
    </>
  );
}

// ─── NodePalette ──────────────────────────────────────────────────────────────

export function NodePalette() {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return PALETTE_ITEMS;
    return PALETTE_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.shortLabel.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map: Record<string, PaletteItem[]> = {};
    for (const item of filtered) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return CATEGORY_ORDER
      .filter((cat) => map[cat]?.length)
      .map((cat) => ({ category: cat, items: map[cat] }));
  }, [filtered]);

  return (
    <aside className="flex h-full w-[200px] shrink-0 flex-col border-r border-slate-200/80 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50">
          <GripVertical size={11} className="text-indigo-500" />
        </div>
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          Components
        </span>
      </div>

      {/* Search */}
      <div className="px-2.5 pt-2 pb-1">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-7 pr-7 py-1.5 text-[11px] text-slate-600 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-50 transition-all"
            placeholder="Search nodes…"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable node list */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        {grouped.length === 0 && (
          <p className="mt-6 text-center text-[11px] text-slate-400">No matching nodes</p>
        )}
        {grouped.map(({ category, items }) => {
          const isCollapsed = collapsed[category];
          return (
            <div key={category} className="mb-1">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <svg
                  width="8" height="8" viewBox="0 0 8 8"
                  className={cn('transition-transform', isCollapsed ? '' : 'rotate-90')}
                >
                  <path d="M2 1 L6 4 L2 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {category}
                <span className="ml-auto text-[8px] font-medium text-slate-300">{items.length}</span>
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div className="flex flex-col gap-0.5 pb-1">
                  {items.map((item) => (
                    <PaletteCard key={item.type} item={item} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-3 py-2">
        <p className="text-[9px] text-slate-400 leading-relaxed text-center">
          Drag components onto the canvas
        </p>
      </div>
    </aside>
  );
}
