'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position so menu doesn't overflow viewport
  const [pos, setPos] = React.useState({ x, y });
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x, ny = y;
    if (x + rect.width > window.innerWidth - 8) nx = x - rect.width;
    if (y + rect.height > window.innerHeight - 8) ny = y - rect.height;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  // Close on outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position:     'fixed',
        left:         pos.x,
        top:          pos.y,
        zIndex:       9999,
        minWidth:     160,
        background:   '#ffffff',
        border:       '1px solid #e2e8f0',
        borderRadius: 8,
        boxShadow:    '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        padding:      '4px 0',
        userSelect:   'none',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { onClose(); item.onClick(); }}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            8,
            width:          '100%',
            padding:        '8px 14px',
            background:     'none',
            border:         'none',
            cursor:         'pointer',
            fontSize:       13,
            fontWeight:     500,
            color:          item.danger ? '#e11d48' : '#1e293b',
            textAlign:      'left',
            transition:     'background 100ms',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = item.danger
              ? '#fff1f2'
              : '#f8fafc';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }}
        >
          {item.icon && (
            <span style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
              {item.icon}
            </span>
          )}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
