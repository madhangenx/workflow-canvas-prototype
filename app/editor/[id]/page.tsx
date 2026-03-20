'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CanvasProvider } from '@/components/canvas/engine';
import { NodePalette } from '@/components/canvas/NodePalette';
import { WorkflowCanvas } from '@/components/canvas/WorkflowCanvas';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { AIChatPanel } from '@/components/canvas/AIChatPanel';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useWorkflowStore } from '@/lib/store';
import { getWorkflowData, saveWorkflowData, getUser } from '@/lib/project-store';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [loaded, setLoaded] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { importWorkflow, exportWorkflow, nodes, edges } = useWorkflowStore();

  // Redirect if not logged in
  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.replace('/');
    }
  }, [router]);

  // Load workflow data from localStorage once
  useEffect(() => {
    if (!projectId) return;
    const data = getWorkflowData(projectId);
    if (data) {
      importWorkflow(data);
    }
    setLoaded(true);
  }, [projectId, importWorkflow]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!loaded || !projectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const json = exportWorkflow();
      saveWorkflowData(projectId, json);
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, loaded, projectId, exportWorkflow]);

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <CanvasProvider>
      <ConfirmDialog />
      <div className="editor-layout flex w-screen flex-col bg-slate-50">
        {/* Top toolbar */}
        <CanvasToolbar
          onOpenAI={() => setAiOpen((v) => !v)}
          aiOpen={aiOpen}
          projectId={projectId}
        />

        {/* Main layout: palette | canvas | ai chat | properties */}
        <div className="flex flex-1 overflow-hidden">
          <NodePalette />
          <WorkflowCanvas />
          {aiOpen && <AIChatPanel onClose={() => setAiOpen(false)} />}
          <PropertiesPanel />
        </div>
      </div>
    </CanvasProvider>
  );
}
