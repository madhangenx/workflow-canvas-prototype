'use client';

import { useState, useRef, useCallback } from 'react';
import { Sparkles, X, Wand2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkflowStore } from '@/lib/store';
import { useCanvasEngine } from '@/components/canvas/engine';
import { applyDagreLayout } from '@/lib/layout';

const EXAMPLE_PROMPTS = [
  'Customer submits a loan application form, then agent reviews and validates it, if approved send approval email and create account, otherwise notify rejection and close',
  'Employee requests leave, manager reviews and decides, if approved update HR system and notify payroll, if rejected send rejection notice',
  'New user registers, verify email, complete profile form, onboarding tutorial, then activate account and send welcome notification',
  'Order placed, fetch inventory, calculate total and apply discounts, process payment, if payment fails notify customer and retry, otherwise ship and send confirmation',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AIFlowGenerator({ open, onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { importWorkflow } = useWorkflowStore();
  const { fitView } = useCanvasEngine();

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) { setError('Please enter a prompt first.'); return; }
    if (trimmed.length < 10) { setError('Please describe your process in more detail.'); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });

      const data = await res.json() as { flow?: { nodes: any[]; edges: any[] }; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? 'Generation failed. Please try again.');
        return;
      }

      if (!data.flow?.nodes?.length) {
        setError('No flow was generated. Try rephrasing your prompt.');
        return;
      }

      // Apply auto-layout before importing
      const laidOut = applyDagreLayout(data.flow.nodes, data.flow.edges, 'LR');
      const workflow = { nodes: laidOut, edges: data.flow.edges };
      importWorkflow(JSON.stringify(workflow));
      setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100);
      onClose();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, importWorkflow, fitView, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Flow Generator</h2>
              <p className="text-xs text-indigo-200">Describe your business process in plain English</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Prompt textarea */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Describe your workflow
            </label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setError(null); }}
              placeholder="e.g. Customer submits a purchase request, manager reviews and approves or rejects it, then procurement system is updated and supplier is notified…"
              rows={5}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-400">{prompt.length}/2000 chars · ⌘↵ to generate</span>
              {!process.env.NEXT_PUBLIC_HAS_AI && (
                <span className="text-xs text-amber-600">Rule-based mode (add OPENAI_API_KEY for AI)</span>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Example prompts */}
          <div>
            <button
              onClick={() => setShowExamples((v) => !v)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
            >
              {showExamples ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showExamples ? 'Hide examples' : 'Show example prompts'}
            </button>
            {showExamples && (
              <div className="mt-2 space-y-1.5">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setPrompt(ex); setShowExamples(false); textareaRef.current?.focus(); }}
                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-500">
            Generated flow will replace the current canvas after auto-layout.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  Generate Flow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
