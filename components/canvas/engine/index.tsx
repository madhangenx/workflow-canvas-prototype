'use client';

/**
 * Custom Workflow Canvas Engine
 * A zero-dependency canvas engine with pan, zoom, drag, connect, minimap.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  memo,
  useMemo,
  type ReactNode,
  type CSSProperties,
  type RefObject,
  type PointerEvent as RP,
} from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useWorkflowStore } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import type { WFNodeType } from '@/lib/types';
import { showConfirm } from '@/lib/confirmStore';

/* ═══════════════════════════════════════════════════════════════════════════════
   EXPORTED TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */

export enum Position {
  Top    = 'top',
  Right  = 'right',
  Bottom = 'bottom',
  Left   = 'left',
}

export type HandleType = 'source' | 'target';

export interface NodeProps {
  id: string;
  selected?: boolean;
  data: Record<string, unknown>;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   VIEWPORT TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Viewport { x: number; y: number; scale: number }

const MIN_ZOOM   = 0.1;
const MAX_ZOOM   = 3;
const ZOOM_STEP  = 0.25;
const GRID_SIZE  = 24; // background grid spacing (canvas px)

// Canvas background grid (two-layer line grid)
const GRID_BG_IMAGE =
  'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),' +
  'linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)';
const CANVAS_BG_COLOR = '#f4f6fb';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BEZIER PATH MATH
   ═══════════════════════════════════════════════════════════════════════════════ */

function getBezierPath(
  sx: number, sy: number, sp: Position,
  tx: number, ty: number, tp: Position,
): [string, number, number] {
  const dx  = Math.abs(tx - sx);
  const dy  = Math.abs(ty - sy);
  const off = Math.max(30, Math.min(100, (dx + dy) * 0.4));

  let c1x = sx, c1y = sy, c2x = tx, c2y = ty;

  switch (sp) {
    case Position.Right:  c1x = sx + off; break;
    case Position.Left:   c1x = sx - off; break;
    case Position.Bottom: c1y = sy + off; break;
    case Position.Top:    c1y = sy - off; break;
  }
  switch (tp) {
    case Position.Left:   c2x = tx - off; break;
    case Position.Right:  c2x = tx + off; break;
    case Position.Top:    c2y = ty - off; break;
    case Position.Bottom: c2y = ty + off; break;
  }

  const path = `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${tx},${ty}`;
  const midX = (sx + c1x + c2x + tx) / 4;
  const midY = (sy + c1y + c2y + ty) / 4;
  return [path, midX, midY];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HANDLE POSITION UTILITIES  (for edge rendering)
   ═══════════════════════════════════════════════════════════════════════════════ */

function handleIdToPos(
  handleId: string | null | undefined,
  edgeType: 'source' | 'target',
): Position {
  switch (handleId) {
    case 'top':    return Position.Top;
    case 'right':  return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left':   return Position.Left;
    default:       return edgeType === 'source' ? Position.Right : Position.Left;
  }
}

function getHandleCoords(
  nx: number, ny: number, nw: number, nh: number,
  handleId: string | null | undefined,
  edgeType: 'source' | 'target',
): [number, number, Position] {
  const pos = handleIdToPos(handleId, edgeType);
  switch (pos) {
    case Position.Right:  return [nx + nw, ny + nh / 2, Position.Right];
    case Position.Left:   return [nx,      ny + nh / 2, Position.Left];
    case Position.Top:    return [nx + nw / 2, ny,      Position.Top];
    case Position.Bottom: return [nx + nw / 2, ny + nh, Position.Bottom];
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CANVAS CONTEXT  — shared between Canvas, Handle, NodeResizer, Toolbar, etc.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface ConnectingState {
  nodeId:     string;
  handleId:   string | null;
  handleType: HandleType;
  pos:        Position;
  startCx:    number; // canvas-space start coords
  startCy:    number;
}

interface CanvasCtxValue {
  viewportRef:    RefObject<Viewport>;
  rootRef:        RefObject<HTMLDivElement | null>;
  viewportElRef:  RefObject<HTMLDivElement | null>;
  connecting:     ConnectingState | null;
  startConnect:   (s: ConnectingState) => void;
  finishConnect:  (targetNodeId: string, targetHandleId: string | null) => void;
  cancelConnect:  () => void;
  screenToCanvas: (sx: number, sy: number) => [number, number];
  zoomIn:         () => void;
  zoomOut:        () => void;
  fitView:        (opts?: { padding?: number; duration?: number }) => void;
}

const CanvasCtx = createContext<CanvasCtxValue | null>(null);

export function useCanvasEngine(): CanvasCtxValue {
  const ctx = useContext(CanvasCtx);
  if (!ctx) throw new Error('useCanvasEngine must be used inside <CanvasProvider>');
  return ctx;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NODE CONTEXT  — used by Handle + NodeResizer to know their parent node
   ═══════════════════════════════════════════════════════════════════════════════ */

interface NodeCtxValue { id: string; width: number; height: number }
const NodeCtx = createContext<NodeCtxValue>({ id: '', width: 0, height: 0 });

/* ═══════════════════════════════════════════════════════════════════════════════
   HANDLE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */

function getPosStyle(pos: Position): CSSProperties {
  const base: CSSProperties = { position: 'absolute', zIndex: 10, pointerEvents: 'all' };
  switch (pos) {
    case Position.Right:  return { ...base, right:  -4, top:  '50%', transform: 'translateY(-50%)' };
    case Position.Left:   return { ...base, left:   -4, top:  '50%', transform: 'translateY(-50%)' };
    case Position.Top:    return { ...base, top:    -4, left: '50%', transform: 'translateX(-50%)' };
    case Position.Bottom: return { ...base, bottom: -4, left: '50%', transform: 'translateX(-50%)' };
  }
}

export interface HandleProps {
  type:      HandleType;
  position:  Position;
  id?:       string;
  className?: string;
}

export const Handle = memo(function Handle({
  type, position, id: handleId, className,
}: HandleProps) {
  const { id: nodeId } = useContext(NodeCtx);
  const { connecting, startConnect, screenToCanvas } = useCanvasEngine();

  const onPointerDown = (e: RP<HTMLDivElement>) => {
    if (type !== 'source') return; // only source handles initiate connections
    e.stopPropagation();
    e.preventDefault();
    const [cx, cy] = screenToCanvas(e.clientX, e.clientY);
    startConnect({
      nodeId,
      handleId: handleId ?? null,
      handleType: type,
      pos: position,
      startCx: cx,
      startCy: cy,
    });
  };

  return (
    <div
      className={cn(className, connecting && type === 'target' && 'wf-handle-connectable')}
      style={getPosStyle(position)}
      data-handle-node={nodeId}
      data-handle-id={handleId ?? '__default__'}
      data-handle-type={type}
      onPointerDown={onPointerDown}
    />
  );
});
Handle.displayName = 'Handle';

/* ═══════════════════════════════════════════════════════════════════════════════
   NODE RESIZER
   ═══════════════════════════════════════════════════════════════════════════════ */

type ResizeDir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const RESIZE_DIRS: { dir: ResizeDir; style: CSSProperties }[] = [
  { dir: 'n',  style: { top: -4,    left: '50%',  transform: 'translateX(-50%)', cursor: 'n-resize'  } },
  { dir: 'ne', style: { top: -4,    right: -4,                                   cursor: 'ne-resize' } },
  { dir: 'e',  style: { right: -4,  top: '50%',   transform: 'translateY(-50%)', cursor: 'e-resize'  } },
  { dir: 'se', style: { bottom: -4, right: -4,                                   cursor: 'se-resize' } },
  { dir: 's',  style: { bottom: -4, left: '50%',  transform: 'translateX(-50%)', cursor: 's-resize'  } },
  { dir: 'sw', style: { bottom: -4, left: -4,                                    cursor: 'sw-resize' } },
  { dir: 'w',  style: { left: -4,   top: '50%',   transform: 'translateY(-50%)', cursor: 'w-resize'  } },
  { dir: 'nw', style: { top: -4,    left: -4,                                    cursor: 'nw-resize' } },
];

export interface NodeResizerProps {
  isVisible?:       boolean;
  minWidth?:        number;
  minHeight?:       number;
  keepAspectRatio?: boolean;
  handleStyle?:     CSSProperties;
  lineStyle?:       CSSProperties;
}

export function NodeResizer({
  isVisible = false,
  minWidth  = 32,
  minHeight = 32,
  keepAspectRatio = false,
  handleStyle: hs,
  lineStyle: ls,
}: NodeResizerProps) {
  const { id: nodeId, width: nodeWidth, height: nodeHeight } = useContext(NodeCtx);
  const { viewportRef } = useCanvasEngine();
  const { resizeNode } = useWorkflowStore();

  const onPointerDown = useCallback((e: RP<HTMLDivElement>, dir: ResizeDir) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = nodeWidth;
    const startH = nodeHeight;
    const ar     = nodeWidth / nodeHeight;

    const onMove = (ev: PointerEvent) => {
      const sc = viewportRef.current?.scale ?? 1;
      const dx = (ev.clientX - startX) / sc;
      const dy = (ev.clientY - startY) / sc;
      let nw = startW, nh = startH;

      if (dir.includes('e')) nw = Math.max(minWidth,  startW + dx);
      if (dir.includes('w')) nw = Math.max(minWidth,  startW - dx);
      if (dir.includes('s')) nh = Math.max(minHeight, startH + dy);
      if (dir.includes('n')) nh = Math.max(minHeight, startH - dy);

      if (keepAspectRatio) {
        if (dir.includes('e') || dir.includes('w')) nh = nw / ar;
        else                                         nw = nh * ar;
        nw = Math.max(minWidth,  nw);
        nh = Math.max(minHeight, nh);
      }

      resizeNode(nodeId, Math.round(nw), Math.round(nh));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }, [nodeId, nodeWidth, nodeHeight, minWidth, minHeight, keepAspectRatio, viewportRef, resizeNode]);

  if (!isVisible) return null;

  const borderColor = ls?.borderColor as string ?? '#6366f1';
  const hColor      = hs?.backgroundColor as string ?? '#6366f1';

  return (
    <>
      {/* Selection border — solid glow ring */}
      <div
        style={{
          position:     'absolute',
          inset:        -2,
          border:       `2px solid ${borderColor}`,
          borderRadius: 8,
          boxShadow:    `0 0 0 3px rgba(99,102,241,0.12), 0 0 16px rgba(99,102,241,0.10)`,
          pointerEvents: 'none',
          zIndex:       9,
        }}
      />
      {/* 8 resize handles */}
      {RESIZE_DIRS.map(({ dir, style: ds }) => (
        <div
          key={dir}
          style={{
            ...ds,
            position:        'absolute',
            width:           8,
            height:          8,
            borderRadius:    2,
            backgroundColor: hColor,
            border:          '1.5px solid #fff',
            boxShadow:       '0 1px 3px rgba(0,0,0,0.2)',
            zIndex:          11,
            pointerEvents:   'all',
          }}
          onPointerDown={(e) => onPointerDown(e, dir)}
        />
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MINIMAP — removed (Overview panel removed per UX requirement)
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════════
   CONTROLS
   ═══════════════════════════════════════════════════════════════════════════════ */

const Controls = memo(function Controls() {
  const { zoomIn, zoomOut, fitView, viewportRef } = useCanvasEngine();
  const [zoomPct, setZoomPct] = useState(100);

  // Poll zoom level at 4 fps to display it
  useEffect(() => {
    const id = setInterval(() => {
      setZoomPct(Math.round((viewportRef.current?.scale ?? 1) * 100));
    }, 250);
    return () => clearInterval(id);
  }, [viewportRef]);

  const btn =
    'flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 active:bg-indigo-100 transition-colors rounded-lg';

  return (
    <div
      data-canvas-controls
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Zoom controls */}
      <div
        style={{
          display:        'flex',
          flexDirection:  'column',
          borderRadius:   12,
          border:         '1px solid #e2e8f0',
          background:     'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(10px)',
          boxShadow:      '0 4px 16px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
          overflow:       'hidden',
        }}
      >
        <button onClick={zoomIn}  className={btn} title="Zoom in"><ZoomIn   size={15} /></button>
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 6px' }} />
        <button
          onClick={() => fitView({ padding: 0.15, duration: 400 })}
          className={btn}
          title="Fit to view"
        >
          <Maximize2 size={15} />
        </button>
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 6px' }} />
        <button onClick={zoomOut} className={btn} title="Zoom out"><ZoomOut  size={15} /></button>
      </div>

      {/* Zoom percentage badge */}
      <div
        style={{
          textAlign:      'center',
          borderRadius:   8,
          border:         '1px solid #e2e8f0',
          background:     'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(10px)',
          boxShadow:      '0 2px 8px rgba(0,0,0,0.06)',
          padding:        '3px 0',
          fontSize:       10,
          fontWeight:     700,
          color:          '#6366f1',
          letterSpacing:  '0.02em',
          userSelect:     'none',
        }}
      >
        {zoomPct}%
      </div>
    </div>
  );
});
Controls.displayName = 'Controls';

/* ═══════════════════════════════════════════════════════════════════════════════
   CANVAS PROVIDER  — holds viewport + connection state; wraps the whole editor
   ═══════════════════════════════════════════════════════════════════════════════ */

export function CanvasProvider({ children }: { children: ReactNode }) {
  const rootRef       = useRef<HTMLDivElement>(null);
  const viewportElRef = useRef<HTMLDivElement>(null);
  const viewportRef   = useRef<Viewport>({ x: 0, y: 0, scale: 1 });

  const [connecting, setConnecting] = useState<ConnectingState | null>(null);

  /* ── Viewport application (imperative for 60fps fluidity) ─────────────── */

  const applyViewport = useCallback((vp: Viewport) => {
    viewportRef.current = vp;
    if (viewportElRef.current) {
      viewportElRef.current.style.transform =
        `translate(${vp.x}px,${vp.y}px) scale(${vp.scale})`;
    }
    // CSS line-grid background tracks viewport
    if (rootRef.current) {
      const sz = GRID_SIZE * vp.scale;
      rootRef.current.style.backgroundSize     = `${sz}px ${sz}px`;
      rootRef.current.style.backgroundPosition = `${vp.x % sz}px ${vp.y % sz}px`;
    }
  }, []);

  const applyViewportAnimated = useCallback((target: Viewport, duration = 350) => {
    const el = viewportElRef.current;
    if (!el) { applyViewport(target); return; }
    el.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1)`;
    applyViewport(target);
    setTimeout(() => { if (el) el.style.transition = ''; }, duration + 16);
  }, [applyViewport]);

  /* ── Coordinate conversion ────────────────────────────────────────────── */

  const screenToCanvas = useCallback((sx: number, sy: number): [number, number] => {
    const root = rootRef.current;
    if (!root) return [0, 0];
    const rect = root.getBoundingClientRect();
    const vp   = viewportRef.current;
    return [(sx - rect.left - vp.x) / vp.scale, (sy - rect.top - vp.y) / vp.scale];
  }, []);

  /* ── Zoom ─────────────────────────────────────────────────────────────── */

  const doZoom = useCallback((factor: number, pivotSx?: number, pivotSy?: number) => {
    const vp       = viewportRef.current;
    const root     = rootRef.current;
    const newScale = clamp(vp.scale * factor, MIN_ZOOM, MAX_ZOOM);
    if (newScale === vp.scale) return;

    const rect  = root?.getBoundingClientRect();
    const pxRel = (pivotSx !== undefined ? pivotSx : (rect ? rect.left + rect.width  / 2 : 0)) - (rect?.left ?? 0);
    const pyRel = (pivotSy !== undefined ? pivotSy : (rect ? rect.top  + rect.height / 2 : 0)) - (rect?.top  ?? 0);

    applyViewport({
      scale: newScale,
      x: pxRel - (pxRel - vp.x) * (newScale / vp.scale),
      y: pyRel - (pyRel - vp.y) * (newScale / vp.scale),
    });
  }, [applyViewport]);

  const zoomIn  = useCallback(() => doZoom(1 + ZOOM_STEP), [doZoom]);
  const zoomOut = useCallback(() => doZoom(1 / (1 + ZOOM_STEP)), [doZoom]);

  /* ── Fit view ─────────────────────────────────────────────────────────── */

  const fitView = useCallback((opts?: { padding?: number; duration?: number }) => {
    const root  = rootRef.current;
    const nodes = useWorkflowStore.getState().nodes;
    if (!root || !nodes.length) return;

    const pad    = opts?.padding  ?? 0.15;
    const dur    = opts?.duration ?? 350;
    let minX =  Infinity, minY =  Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const n of nodes) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + n.width);
      maxY = Math.max(maxY, n.position.y + n.height);
    }

    const cw       = root.clientWidth, ch = root.clientHeight;
    const contentW = maxX - minX,     contentH = maxY - minY;
    const scale    = clamp(
      Math.min((cw * (1 - pad * 2)) / contentW, (ch * (1 - pad * 2)) / contentH),
      MIN_ZOOM, 1.2,
    );
    const x = cw / 2 - (minX + contentW / 2) * scale;
    const y = ch / 2 - (minY + contentH / 2) * scale;

    applyViewportAnimated({ x, y, scale }, dur);
  }, [applyViewportAnimated]);

  /* ── Connection handlers ──────────────────────────────────────────────── */

  const startConnect  = useCallback((s: ConnectingState) => setConnecting(s), []);
  const cancelConnect = useCallback(() => setConnecting(null), []);

  const finishConnect = useCallback((targetNodeId: string, targetHandleId: string | null) => {
    const c = connecting;
    setConnecting(null);
    if (!c || targetNodeId === c.nodeId) return;
    useWorkflowStore.getState().connectNodes(
      c.nodeId, c.handleId, targetNodeId, targetHandleId,
    );
  }, [connecting]);

  /* ── Context value ────────────────────────────────────────────────────── */

  const ctxValue = useMemo<CanvasCtxValue>(() => ({
    viewportRef, rootRef, viewportElRef,
    connecting, startConnect, finishConnect, cancelConnect,
    screenToCanvas, zoomIn, zoomOut, fitView,
  }), [connecting, startConnect, finishConnect, cancelConnect,
       screenToCanvas, zoomIn, zoomOut, fitView]);

  return <CanvasCtx.Provider value={ctxValue}>{children}</CanvasCtx.Provider>;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NODE SIZES (for palette drop)
   ═══════════════════════════════════════════════════════════════════════════════ */

const NODE_SIZES: Record<string, { w: number; h: number }> = {
  startEvent:               { w: 44,  h: 44  },
  startMessageEvent:        { w: 44,  h: 44  },
  endEvent:                 { w: 44,  h: 44  },
  intermediateMessageEvent: { w: 44,  h: 44  },
  timerEvent:               { w: 44,  h: 44  },
  userTask:         { w: 166, h: 44  },
  serviceTask:      { w: 166, h: 44  },
  scriptTask:       { w: 166, h: 44  },
  subProcess:       { w: 176, h: 44  },
  exclusiveGateway: { w: 48,  h: 48  },
  parallelGateway:  { w: 48,  h: 48  },
  inclusiveGateway: { w: 48,  h: 48  },
  swimlane:         { w: 500, h: 180 },
  milestone:        { w: 140, h: 36  },
};

/* ═══════════════════════════════════════════════════════════════════════════════
   CANVAS COMPONENT  — the main canvas rendering component
   ═══════════════════════════════════════════════════════════════════════════════ */

interface CanvasProps {
  nodeTypes: Record<string, React.ComponentType<NodeProps>>;
}

export function Canvas({ nodeTypes }: CanvasProps) {
  const {
    nodes, edges,
    moveNode,
    selectedNodeId, selectedEdgeId,
    setSelectedNodeId, setSelectedEdgeId,
    deleteNode, deleteEdge, addNode,
  } = useWorkflowStore();

  const {
    viewportRef, rootRef, viewportElRef,
    connecting, startConnect, finishConnect, cancelConnect,
    screenToCanvas, fitView,
  } = useCanvasEngine();

  /* ── Local refs for imperative perf ──────────────────────────────────── */

  const isPanning   = useRef(false);
  const panStart    = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const tempEdgeRef = useRef<SVGPathElement | null>(null);

  /* ── Initial fit view ─────────────────────────────────────────────────── */

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Temp edge during connection (imperative: no re-renders per frame) ── */

  useEffect(() => {
    if (!connecting) return;

    const onMove = (e: PointerEvent) => {
      if (!tempEdgeRef.current) return;
      const [cx, cy] = screenToCanvas(e.clientX, e.clientY);
      const [path]   = getBezierPath(
        connecting.startCx, connecting.startCy, connecting.pos,
        cx, cy, Position.Left,
      );
      tempEdgeRef.current.setAttribute('d', path);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [connecting, screenToCanvas]);

  /* ── Connection release (window-level so we catch drops anywhere) ─────── */

  useEffect(() => {
    if (!connecting) return;

    const MAGNET_RADIUS = 80; // screen-space pixels — auto-snap within this distance

    const onUp = (e: PointerEvent) => {
      // 1. Try exact handle hit first
      const under    = document.elementsFromPoint(e.clientX, e.clientY);
      const handleEl = under.find(
        (el) => (el as HTMLElement).dataset?.handleType === 'target',
      ) as HTMLElement | undefined;

      if (handleEl) {
        const tgtNodeId   = handleEl.dataset.handleNode!;
        const rawHandleId = handleEl.dataset.handleId!;
        if (tgtNodeId && tgtNodeId !== connecting.nodeId) {
          finishConnect(tgtNodeId, rawHandleId === '__default__' ? null : rawHandleId);
          return;
        }
      }

      // 2. Magnet: find nearest node within MAGNET_RADIUS (using edge-distance, not center)
      const allNodeEls = document.querySelectorAll<HTMLElement>('[data-node-id]');
      let bestId   = '';
      let bestDist = MAGNET_RADIUS;

      allNodeEls.forEach((el) => {
        const nid = el.dataset.nodeId;
        if (!nid || nid === connecting.nodeId) return;
        const rect = el.getBoundingClientRect();
        // Compute distance from cursor to nearest edge of bounding box
        const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
        const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) { bestDist = dist; bestId = nid; }
      });

      if (bestId) {
        finishConnect(bestId, null); // null → default handle (left)
        return;
      }

      cancelConnect();
    };

    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [connecting, finishConnect, cancelConnect]);

  /* ── Viewport pan ─────────────────────────────────────────────────────── */

  const applyViewportImperative = useCallback((vp: { x: number; y: number; scale: number }) => {
    viewportRef.current = vp;
    if (viewportElRef.current) {
      viewportElRef.current.style.transform =
        `translate(${vp.x}px,${vp.y}px) scale(${vp.scale})`;
    }
    if (rootRef.current) {
      const sz = GRID_SIZE * vp.scale;
      rootRef.current.style.backgroundSize     = `${sz}px ${sz}px`;
      rootRef.current.style.backgroundPosition = `${vp.x % sz}px ${vp.y % sz}px`;
    }
  }, [viewportRef, viewportElRef, rootRef]);

  /* ── Canvas pointer events ───────────────────────────────────────────── */

  const onRootPointerDown = useCallback((e: RP<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Only pan when clicking the canvas background (not nodes, edges, handles, or overlay controls)
    if (target.closest('[data-node-id]') || target.dataset.handleType) return;
    if (target.closest('[data-edge-id]')) return;
    if (target.closest('[data-canvas-controls]') || target.closest('button')) return;
    isPanning.current = true;
    panStart.current  = {
      x: e.clientX, y: e.clientY,
      vx: viewportRef.current.x, vy: viewportRef.current.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).classList.add('is-panning');
  }, [viewportRef]);

  const onRootPointerMove = useCallback((e: RP<HTMLDivElement>) => {
    if (!isPanning.current) return;
    const vp = viewportRef.current;
    applyViewportImperative({
      scale: vp.scale,
      x: panStart.current.vx + (e.clientX - panStart.current.x),
      y: panStart.current.vy + (e.clientY - panStart.current.y),
    });
  }, [viewportRef, applyViewportImperative]);

  const onRootPointerUp = useCallback((e: RP<HTMLDivElement>) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).classList.remove('is-panning');
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);

  /* ── Wheel-to-zoom (imperative, { passive:false } so preventDefault works) ── */

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const vp       = viewportRef.current;
      const root     = rootRef.current;
      const factor   = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = clamp(vp.scale * factor, MIN_ZOOM, MAX_ZOOM);
      if (newScale === vp.scale) return;

      const rect  = root?.getBoundingClientRect();
      const pxRel = e.clientX - (rect?.left ?? 0);
      const pyRel = e.clientY - (rect?.top  ?? 0);

      applyViewportImperative({
        scale: newScale,
        x: pxRel - (pxRel - vp.x) * (newScale / vp.scale),
        y: pyRel - (pyRel - vp.y) * (newScale / vp.scale),
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [viewportRef, rootRef, applyViewportImperative]);

  /* ── Node drag ────────────────────────────────────────────────────────── */

  const onNodePointerDown = useCallback((e: RP<HTMLDivElement>, nodeId: string) => {
    const target = e.target as HTMLElement;
    if (target.dataset.handleType) return; // let Handle handle it
    if (e.button !== 0) return;
    e.stopPropagation();

    const node = useWorkflowStore.getState().nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const startX = e.clientX, startY = e.clientY;
    const baseX  = node.position.x, baseY = node.position.y;
    let moved    = false;

    const onMove = (ev: PointerEvent) => {
      moved = true;
      const sc = viewportRef.current.scale;
      moveNode(nodeId,
        baseX + (ev.clientX - startX) / sc,
        baseY + (ev.clientY - startY) / sc,
      );
    };

    const onUp = (ev: PointerEvent) => {
      if (!moved) {
        // Treat as click → select
        useWorkflowStore.getState().setSelectedNodeId(nodeId);
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }, [moveNode, viewportRef]);

  /* ── Click on canvas background → deselect ───────────────────────────── */

  const onRootClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-id]'))  return;
    if (target.closest('[data-edge-id]'))  return;
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  /* ── Keyboard shortcuts ─────────────────────────────────────────────── */

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { cancelConnect(); return; }
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    // Don't delete if focus is inside an input
    if ((e.target as HTMLElement).tagName === 'INPUT'   ||
        (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    const { selectedNodeId: snid, selectedEdgeId: seid } = useWorkflowStore.getState();
    if (snid) {
      const node = useWorkflowStore.getState().nodes.find((n) => n.id === snid);
      showConfirm({
        title: `Delete "${node?.data?.label ?? 'node'}"?`,
        description: 'The node and all its connections will be permanently removed.',
        confirmLabel: 'Delete',
        variant: 'danger',
        onConfirm: () => deleteNode(snid),
      });
    } else if (seid) {
      showConfirm({
        title: 'Delete connection?',
        description: 'This sequence flow will be permanently removed.',
        confirmLabel: 'Delete',
        variant: 'danger',
        onConfirm: () => deleteEdge(seid),
      });
    }
  }, [cancelConnect, deleteNode, deleteEdge]);

  /* ── Drag-and-drop from NodePalette ──────────────────────────────────── */

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type  = e.dataTransfer.getData('application/workflow-node-type') as WFNodeType;
    const label = e.dataTransfer.getData('application/workflow-node-label');
    if (!type) return;

    const [cx, cy] = screenToCanvas(e.clientX, e.clientY);
    const size     = NODE_SIZES[type] ?? { w: 166, h: 44 };

    addNode({
      id:       `${type}-${uuidv4()}`,
      type,
      position: { x: cx - size.w / 2, y: cy - size.h / 2 },
      width:    size.w,
      height:   size.h,
      data: {
        nodeType:      type,
        label,
        inputFields:   [],
        outputFields:  [],
        businessRules: [],
        apis:          [],
        actionButtons: [],
      },
    });
  }, [screenToCanvas, addNode]);

  /* ── Edge rendering ─────────────────────────────────────────────────── */

  const nodeMap  = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const arrowNs  = 'wf-arrow'; // stable ID prefix for SVG markers

  // Build per-source outgoing edge count & target-position map for smart routing
  const edgeRouting = useMemo(() => {
    const GATEWAY_TYPES = new Set(['exclusiveGateway', 'parallelGateway', 'inclusiveGateway']);
    // Group edges by source
    const bySource = new Map<string, typeof edges>();
    for (const e of edges) {
      if (!bySource.has(e.source)) bySource.set(e.source, []);
      bySource.get(e.source)!.push(e);
    }
    // For gateway sources with multiple outgoing edges, compute smart handles
    const handleOverrides = new Map<string, string>(); // edgeId → sourceHandle
    bySource.forEach((outEdges, srcId) => {
      const src = nodeMap.get(srcId);
      if (!src || outEdges.length < 2 || !GATEWAY_TYPES.has(src.type)) return;
      const srcCenterY = src.position.y + src.height / 2;
      // Sort edges by target Y position
      const sorted = outEdges
        .map(e => ({ edge: e, tgt: nodeMap.get(e.target) }))
        .filter(x => x.tgt)
        .sort((a, b) => a.tgt!.position.y - b.tgt!.position.y);
      // Top-most edge(s) keep 'right', bottom edge(s) use 'bottom'
      sorted.forEach((item, idx) => {
        const tgtCenterY = item.tgt!.position.y + item.tgt!.height / 2;
        // If target is below the source center, use bottom handle
        if (tgtCenterY > srcCenterY + 10 && idx > 0) {
          handleOverrides.set(item.edge.id, 'bottom');
        }
      });
    });
    return handleOverrides;
  }, [edges, nodeMap]);

  const renderedEdges = useMemo(() => edges.map((edge) => {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return null;

    // Use smart handle override for gateway edges, otherwise use edge's own handle
    const effectiveSourceHandle = edgeRouting.get(edge.id) ?? edge.sourceHandle;

    const [sx, sy, sp] = getHandleCoords(src.position.x, src.position.y, src.width, src.height, effectiveSourceHandle, 'source');
    const [tx, ty, tp] = getHandleCoords(tgt.position.x, tgt.position.y, tgt.width, tgt.height, edge.targetHandle, 'target');
    const [path, midX, midY] = getBezierPath(sx, sy, sp, tx, ty, tp);

    const isSel    = edge.id === selectedEdgeId;
    const edgeColor = isSel ? '#6366f1' : '#94a3b8';
    const edgeW     = isSel ? 2.2 : 1.6;
    const hasLabel = !!(edge.data?.label || edge.data?.condition);

    return (
      <g key={edge.id} data-edge-id={edge.id}>
        {/* Ghost glow behind selected edge */}
        {isSel && (
          <path
            d={path}
            fill="none"
            stroke="#6366f1"
            strokeWidth={6}
            opacity={0.12}
            style={{ pointerEvents: 'none' }}
          />
        )}
        {/* Wider invisible hitbox for easier clicking */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          style={{ cursor: 'pointer', pointerEvents: 'all' }}
          onClick={() => {
            setSelectedNodeId(null);
            setSelectedEdgeId(edge.id);
            // Focus the canvas root so keyboard shortcuts (Delete/Backspace) work on selected edge
            rootRef.current?.focus();
          }}
        />
        {/* Visible edge */}
        <path
          d={path}
          fill="none"
          stroke={edgeColor}
          strokeWidth={edgeW}
          markerEnd={`url(#${arrowNs}-${isSel ? 'sel' : 'def'})`}
          className={isSel ? 'wf-edge-flow' : ''}
          style={{
            transition:    'stroke 150ms, stroke-width 150ms',
            pointerEvents: 'none',
          }}
        />
        {/* Edge label */}
        {hasLabel && (
          <foreignObject
            x={midX - 44} y={midY - 12}
            width={88}    height={24}
            style={{ overflow: 'visible', pointerEvents: 'all' }}
          >
            <div
              // @ts-ignore – foreignObject children need the xmlns in some renderers
              onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(edge.id); rootRef.current?.focus(); }}
              style={{
                display:       'inline-flex',
                cursor:        'pointer',
                padding:       '2px 8px',
                borderRadius:  6,
                fontSize:      10,
                fontWeight:    600,
                whiteSpace:    'nowrap',
                background:    isSel ? '#eef2ff' : 'rgba(255,255,255,0.95)',
                color:         isSel ? '#4f46e5' : '#64748b',
                border:        `1px solid ${isSel ? '#c7d2fe' : '#e2e8f0'}`,
                boxShadow:     isSel ? '0 2px 8px rgba(99,102,241,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {(edge.data?.label as string) || (edge.data?.condition as string)}
            </div>
          </foreignObject>
        )}
      </g>
    );
  }), [edges, nodeMap, edgeRouting, selectedEdgeId, setSelectedNodeId, setSelectedEdgeId]);

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    /* Canvas root – captures pan, zoom, drop, keyboard */
    <div
      ref={rootRef}
      className={cn(
        'wf-canvas-root relative flex-1 overflow-hidden select-none outline-none',
        connecting && 'is-connecting',
      )}
      tabIndex={0}
      style={{
        backgroundImage:   GRID_BG_IMAGE,
        backgroundSize:    `${GRID_SIZE}px ${GRID_SIZE}px`,
        backgroundPosition:'0px 0px',
        backgroundColor:   CANVAS_BG_COLOR,
      }}
      onPointerDown={onRootPointerDown}
      onPointerMove={onRootPointerMove}
      onPointerUp={onRootPointerUp}
      onClick={onRootClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
    >
      {/* ── Viewport transform wrapper ── */}
      <div
        ref={viewportElRef}
        style={{
          position:       'absolute',
          left:           0,
          top:            0,
          transformOrigin:'0 0',
          willChange:     'transform',
        }}
      >
        {/* ── Edges SVG (canvas-space) ── */}
        <svg
          style={{
            position:      'absolute',
            left:          0,
            top:           0,
            width:         '1px',
            height:        '1px',
            overflow:      'visible',
            zIndex:        0,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <marker
              id={`${arrowNs}-def`}
              markerWidth="8" markerHeight="8"
              refX="7" refY="3" orient="auto"
            >
              <path d="M0,0 L0,6 L7,3 z" fill="#94a3b8" />
            </marker>
            <marker
              id={`${arrowNs}-sel`}
              markerWidth="8" markerHeight="8"
              refX="7" refY="3" orient="auto"
            >
              <path d="M0,0 L0,6 L7,3 z" fill="#6366f1" />
            </marker>
          </defs>

          {/* All edges */}
          <g style={{ pointerEvents: 'all' }}>
            {renderedEdges}
          </g>

          {/* Temp edge during connection drag */}
          {connecting && (
            <path
              ref={tempEdgeRef}
              d=""
              fill="none"
              stroke="#6366f1"
              strokeWidth={2}
              className="wf-conn-line"
              opacity={0.8}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </svg>

        {/* ── Nodes layer ── */}
        <div style={{ position: 'absolute', left: 0, top: 0 }}>
          {nodes.map((node) => {
            const NodeComponent = nodeTypes[node.type];
            if (!NodeComponent) return null;
            const isSel = node.id === selectedNodeId;

            return (
              <div
                key={node.id}
                data-node-id={node.id}
                style={{
                  position:   'absolute',
                  left:       node.position.x,
                  top:        node.position.y,
                  width:      node.width,
                  height:     node.height,
                  zIndex:     isSel ? 3 : 1,
                  filter:     isSel
                    ? 'drop-shadow(0 0 8px rgba(99,102,241,0.4)) drop-shadow(0 2px 8px rgba(0,0,0,0.12))'
                    : undefined,
                }}
                className={cn('wf-canvas-node', isSel && 'selected')}
                onPointerDown={(e) => onNodePointerDown(e, node.id)}
              >
                <NodeCtx.Provider value={{ id: node.id, width: node.width, height: node.height }}>
                  <NodeComponent id={node.id} selected={isSel} data={node.data} />
                </NodeCtx.Provider>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Empty state hint ── */}
      {nodes.length <= 1 && (
        <div
          style={{
            position:      'absolute',
            top:           '42%',
            left:          '50%',
            transform:     'translate(-50%,-50%)',
            pointerEvents: 'none',
            zIndex:        10,
          }}
        >
          <div
            style={{
              padding:       '16px 28px',
              borderRadius:  14,
              background:    'rgba(255,255,255,0.96)',
              border:        '1px solid rgba(99,102,241,0.15)',
              boxShadow:     '0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(99,102,241,0.06)',
              backdropFilter:'blur(12px)',
              textAlign:     'center',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: '#3730a3', marginBottom: 6 }}>
              Start building your workflow
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
              Drag nodes from the left panel · Scroll to zoom · Drag canvas to pan
            </p>
          </div>
        </div>
      )}

      {/* ── Overlay controls ── */}
      <Controls />
    </div>
  );
}
