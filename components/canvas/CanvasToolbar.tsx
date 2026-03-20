'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/lib/store';
import {
  Save,
  Download,
  Upload,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutDashboard,
  Wand2,
  Sparkles,
  ArrowRightLeft,
  ArrowUpDown,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { downloadJson } from '@/lib/utils';
import { useCanvasEngine } from '@/components/canvas/engine';
import { saveWorkflowData } from '@/lib/project-store';
import { cn } from '@/lib/utils';

export function CanvasToolbar({
  onOpenAI,
  aiOpen,
  projectId,
}: {
  onOpenAI?: () => void;
  aiOpen?: boolean;
  projectId?: string;
}) {
  const router = useRouter();
  const { meta, setMeta, exportWorkflow, importWorkflow, resetWorkflow, autoLayout } =
    useWorkflowStore();
  const { zoomIn, zoomOut, fitView } = useCanvasEngine();
  const [layoutDir, setLayoutDir] = useState<'LR' | 'TB'>('LR');

  const handleSave = useCallback(() => {
    if (!projectId) return;
    const json = exportWorkflow();
    saveWorkflowData(projectId, json);
  }, [projectId, exportWorkflow]);

  const handleExport = useCallback(() => {
    const json = exportWorkflow();
    downloadJson(json, `${meta.name.replace(/\s+/g, '-').toLowerCase()}.json`);
  }, [exportWorkflow, meta.name]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const json = ev.target?.result as string;
        importWorkflow(json);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importWorkflow]);

  const handleReset = useCallback(() => {
    import('@/lib/confirmStore').then(({ showConfirm }) => {
      showConfirm({
        title: 'Reset workflow?',
        description: 'All nodes and connections will be removed. This cannot be undone.',
        confirmLabel: 'Reset',
        variant: 'warning',
        onConfirm: resetWorkflow,
      });
    });
  }, [resetWorkflow]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 shadow-sm">
      {/* Left – Back + Logo + workflow name */}
      <div className="flex items-center gap-2">
        {/* Back to dashboard */}
        <button
          onClick={() => { handleSave(); router.push('/'); }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Back to dashboard"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow">
            <LayoutDashboard size={14} />
          </div>
          <span className="text-sm font-bold text-slate-800 hidden sm:block">FlowForge</span>
        </div>

        {/* Editable workflow name */}
        <div className="flex items-center gap-1 ml-2">
          <input
            type="text"
            value={meta.name}
            onChange={(e) => setMeta({ name: e.target.value })}
            className="max-w-[200px] rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-slate-700 outline-none hover:border-slate-200 focus:border-indigo-300 focus:bg-white focus:ring-1 focus:ring-indigo-200"
          />
          <span className="text-xs text-slate-400">v{meta.version}</span>
        </div>
      </div>

      {/* Right – Controls */}
      <div className="flex items-center gap-1">
        {/* Zoom controls */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
          <button
            onClick={() => zoomOut()}
            className="flex h-8 w-8 items-center justify-center rounded-l-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => fitView({ padding: 0.15, duration: 300 })}
            className="flex h-8 w-8 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="Fit to view"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => zoomIn()}
            className="flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div className="mx-0.5 h-5 w-px bg-slate-200" />

        {/* Auto Layout */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
          <button
            onClick={() => { autoLayout(layoutDir); setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 100); }}
            className="flex h-8 items-center gap-1.5 rounded-l-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            title="Auto-arrange nodes"
          >
            <Wand2 size={13} />
            <span className="hidden md:inline">Auto Layout</span>
          </button>
          <div className="h-full w-px bg-slate-200" />
          <button
            onClick={() => setLayoutDir((d) => d === 'LR' ? 'TB' : 'LR')}
            className="flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title={`Direction: ${layoutDir === 'LR' ? 'Left → Right' : 'Top → Bottom'}`}
          >
            {layoutDir === 'LR' ? <ArrowRightLeft size={13} /> : <ArrowUpDown size={13} />}
          </button>
        </div>

        <div className="mx-0.5 h-5 w-px bg-slate-200" />

        {/* AI Chat Toggle */}
        <button
          onClick={onOpenAI}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition',
            aiOpen
              ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-500',
          )}
          title="Toggle AI Assistant"
        >
          <MessageSquare size={13} />
          <span className="hidden md:inline">AI Assistant</span>
        </button>

        <div className="mx-0.5 h-5 w-px bg-slate-200" />

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          title="Save workflow"
        >
          <Save size={13} />
          <span className="hidden lg:inline">Save</span>
        </button>

        {/* Import */}
        <button
          onClick={handleImport}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          title="Import workflow JSON"
        >
          <Upload size={13} />
          <span className="hidden lg:inline">Import</span>
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          title="Export workflow as JSON"
        >
          <Download size={13} />
          <span className="hidden lg:inline">Export</span>
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-400 hover:bg-rose-50 hover:text-rose-600"
          title="Reset workflow"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </header>
  );
}
