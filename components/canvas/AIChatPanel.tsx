'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Send, X, Wand2, AlertCircle, RotateCcw, Bot, User } from 'lucide-react';
import { useWorkflowStore } from '@/lib/store';
import { useCanvasEngine } from '@/components/canvas/engine';
import { applyDagreLayout } from '@/lib/layout';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  flow?: boolean; // true if this message generated a flow
  timestamp: Date;
}

const SUGGESTIONS = [
  'Employee leave approval process',
  'Customer onboarding with KYC verification',
  'Order processing and payment workflow',
  'Bug report triage and resolution',
];

export function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I can help you generate workflow diagrams. Describe your business process and I\'ll create a BPMN flow for you.\n\nTry something like: "Customer submits a loan application, it gets reviewed, then approved or rejected."',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { importWorkflow } = useWorkflowStore();
  const { fitView } = useCanvasEngine();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await res.json() as { flow?: { nodes: any[]; edges: any[] }; error?: string };

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I couldn't generate that flow: ${data.error ?? 'Unknown error'}. Try rephrasing your description.`,
            timestamp: new Date(),
          },
        ]);
        return;
      }

      if (!data.flow?.nodes?.length) {
        setMessages((prev) => [
          ...prev,
          {
            id: `empty-${Date.now()}`,
            role: 'assistant',
            content: 'I couldn\'t extract enough workflow steps from that description. Try including more specific actions like "submit form", "review", "approve", "notify", "calculate", etc.',
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Apply layout & import
      const laidOut = applyDagreLayout(data.flow.nodes, data.flow.edges, 'LR');
      const workflow = { nodes: laidOut, edges: data.flow.edges };
      importWorkflow(JSON.stringify(workflow));
      setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 100);

      const nodeCount = data.flow.nodes.length;
      const edgeCount = data.flow.edges.length;
      setMessages((prev) => [
        ...prev,
        {
          id: `flow-${Date.now()}`,
          role: 'assistant',
          content: `Done! I created a workflow with **${nodeCount} nodes** and **${edgeCount} connections**. The canvas has been updated and auto-layouted.\n\nYou can now:\n- Click nodes to configure fields, rules, and APIs\n- Drag more nodes from the palette\n- Ask me to generate a different flow`,
          flow: true,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `net-${Date.now()}`,
          role: 'assistant',
          content: 'Network error. Please check your connection and try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, importWorkflow, fitView]);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI Assistant</p>
            <p className="text-[10px] text-indigo-200">Describe a process to generate flows</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 mt-0.5">
                <Bot size={12} className="text-indigo-600" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-slate-100 text-slate-700 rounded-bl-md',
                msg.flow && 'border border-emerald-200 bg-emerald-50 text-emerald-800',
              )}
            >
              {msg.content.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                  {line.split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                  )}
                </p>
              ))}
            </div>
            {msg.role === 'user' && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 mt-0.5">
                <User size={12} className="text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 mt-0.5">
              <Bot size={12} className="text-indigo-600" />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (show when few messages) */}
      {messages.length <= 2 && !loading && (
        <div className="border-t border-slate-100 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Quick prompts
          </p>
          <div className="flex flex-wrap gap-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe a process…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-300 focus:bg-white focus:ring-1 focus:ring-indigo-100"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-slate-400">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </aside>
  );
}
