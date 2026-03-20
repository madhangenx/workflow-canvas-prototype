'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Zap,
  Clock,
  Send,
  MousePointerClick,
} from 'lucide-react';
import { useWorkflowStore } from '@/lib/store';
import type {
  ApiDefinition,
  ActionButton,
  ApiTiming,
  HttpMethod,
  ButtonAction,
  ButtonStyle,
  KeyValuePair,
  ResponseMapping,
} from '@/lib/types';
import { cn } from '@/lib/utils';

// ─── Timing badge ─────────────────────────────────────────────────────────────

const timingConfig: Record<
  ApiTiming,
  { label: string; color: string; icon: React.ReactNode; desc: string }
> = {
  preload: {
    label: 'Pre-load',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Clock size={10} />,
    desc: 'Called synchronously before the screen renders. Response populates input fields.',
  },
  'on-action': {
    label: 'On Action',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    icon: <MousePointerClick size={10} />,
    desc: 'Called when a button is clicked. UI blocks until response is received.',
  },
  'fire-and-forget': {
    label: 'Fire & Forget',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <Send size={10} />,
    desc: 'Triggered by a button click. User immediately proceeds without waiting.',
  },
};

// ─── KV row editor ────────────────────────────────────────────────────────────

function KvRow({
  row,
  onUpdate,
  onRemove,
}: {
  row: KeyValuePair;
  onUpdate: (r: KeyValuePair) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-[10px] outline-none focus:border-indigo-300"
        value={row.key}
        onChange={(e) => onUpdate({ ...row, key: e.target.value })}
        placeholder="Key"
      />
      <span className="text-slate-300">:</span>
      <input
        className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-[10px] outline-none focus:border-indigo-300"
        value={row.value}
        onChange={(e) => onUpdate({ ...row, value: e.target.value })}
        placeholder="Value / {{fieldName}}"
      />
      <button onClick={onRemove} className="text-slate-300 hover:text-rose-400">
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ─── API editor card ──────────────────────────────────────────────────────────

function ApiCard({
  api,
  onUpdate,
  onRemove,
}: {
  api: ApiDefinition;
  onUpdate: (a: ApiDefinition) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const update = (patch: Partial<ApiDefinition>) => onUpdate({ ...api, ...patch });
  const timing = timingConfig[api.timing];

  const addKv = (field: 'headers' | 'queryParams') =>
    update({ [field]: [...api[field], { id: uuidv4(), key: '', value: '' }] });
  const updateKv = (field: 'headers' | 'queryParams', updated: KeyValuePair) =>
    update({ [field]: api[field].map((r) => (r.id === updated.id ? updated : r)) });
  const removeKv = (field: 'headers' | 'queryParams', id: string) =>
    update({ [field]: api[field].filter((r) => r.id !== id) });

  const addMapping = () =>
    update({ responseMapping: [...api.responseMapping, { id: uuidv4(), responsePath: '', fieldName: '' }] });
  const updateMapping = (m: ResponseMapping) =>
    update({ responseMapping: api.responseMapping.map((r) => (r.id === m.id ? m : r)) });
  const removeMapping = (id: string) =>
    update({ responseMapping: api.responseMapping.filter((r) => r.id !== id) });

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical size={13} className="text-slate-300" />
        <input
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-slate-700 outline-none hover:border-slate-200 focus:border-indigo-300"
          value={api.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="API name"
        />
        <span
          className={cn(
            'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold',
            timing.color,
          )}
        >
          {timing.icon} {timing.label}
        </span>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-700">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={onRemove} className="text-slate-300 hover:text-rose-500">
          <Trash2 size={13} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-3 py-3 space-y-3">
          {/* Timing explanation */}
          <div className={cn('rounded-md border px-2.5 py-2 text-[10px]', timing.color)}>
            <span className="font-semibold">{timing.label}: </span>{timing.desc}
          </div>

          {/* Timing selector */}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Call Timing</label>
            <div className="grid grid-cols-3 gap-1">
              {(Object.keys(timingConfig) as ApiTiming[]).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ timing: t })}
                  className={cn(
                    'rounded-md border px-2 py-1 text-[10px] font-medium transition-colors',
                    api.timing === t
                      ? timingConfig[t].color
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {timingConfig[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* URL + Method */}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Endpoint</label>
            <div className="flex gap-1">
              <select
                className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 outline-none"
                value={api.method}
                onChange={(e) => update({ method: e.target.value as HttpMethod })}
              >
                {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                className="flex-1 rounded border border-slate-200 px-2 py-1 font-mono text-[10px] text-slate-700 outline-none focus:border-indigo-300"
                value={api.url}
                onChange={(e) => update({ url: e.target.value })}
                placeholder="https://api.example.com/endpoint/{{id}}"
              />
            </div>
          </div>

          {/* Query Params */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-slate-500">Query Params</label>
              <button onClick={() => addKv('queryParams')} className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {api.queryParams.map((r) => (
                <KvRow key={r.id} row={r} onUpdate={(u) => updateKv('queryParams', u)} onRemove={() => removeKv('queryParams', r.id)} />
              ))}
            </div>
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-slate-500">Headers</label>
              <button onClick={() => addKv('headers')} className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {api.headers.map((r) => (
                <KvRow key={r.id} row={r} onUpdate={(u) => updateKv('headers', u)} onRemove={() => removeKv('headers', r.id)} />
              ))}
            </div>
          </div>

          {/* Body template */}
          {api.method !== 'GET' && api.method !== 'DELETE' && (
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                Request Body (JSON template, use <code>{`{{fieldName}}`}</code>)
              </label>
              <textarea
                className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-[10px] text-slate-700 outline-none focus:border-indigo-300"
                rows={5}
                value={api.bodyTemplate ?? ''}
                onChange={(e) => update({ bodyTemplate: e.target.value })}
                placeholder={'{\n  "userId": "{{userId}}",\n  "amount": "{{amount}}"\n}'}
              />
            </div>
          )}

          {/* Response mapping */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-slate-500">
                Response Mapping <span className="text-slate-400">(dot-path → field)</span>
              </label>
              <button onClick={addMapping} className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {api.responseMapping.map((m) => (
                <div key={m.id} className="flex items-center gap-1">
                  <input
                    className="flex-1 rounded border border-slate-200 px-2 py-0.5 font-mono text-[10px] outline-none focus:border-indigo-300"
                    value={m.responsePath}
                    onChange={(e) => updateMapping({ ...m, responsePath: e.target.value })}
                    placeholder="data.user.name"
                  />
                  <span className="text-slate-300">→</span>
                  <input
                    className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-[10px] outline-none focus:border-indigo-300"
                    value={m.fieldName}
                    onChange={(e) => updateMapping({ ...m, fieldName: e.target.value })}
                    placeholder="fieldName"
                  />
                  <button onClick={() => removeMapping(m.id)} className="text-slate-300 hover:text-rose-400">
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Loading Message</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] outline-none focus:border-indigo-300"
                value={api.loadingMessage ?? ''}
                onChange={(e) => update({ loadingMessage: e.target.value })}
                placeholder="Loading…"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Error Message</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] outline-none focus:border-indigo-300"
                value={api.errorMessage ?? ''}
                onChange={(e) => update({ errorMessage: e.target.value })}
                placeholder="An error occurred"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Action button editor ─────────────────────────────────────────────────────

const BUTTON_STYLES: { value: ButtonStyle; label: string; color: string }[] = [
  { value: 'primary', label: 'Primary', color: 'bg-indigo-600 text-white' },
  { value: 'secondary', label: 'Secondary', color: 'bg-slate-100 text-slate-700' },
  { value: 'danger', label: 'Danger', color: 'bg-rose-500 text-white' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-400 text-white' },
  { value: 'ghost', label: 'Ghost', color: 'text-slate-600 border border-slate-300' },
];

const ACTION_TYPES: { value: ButtonAction; label: string; desc: string }[] = [
  { value: 'submit', label: 'Submit', desc: 'Validate, collect output fields & advance to next activity' },
  { value: 'api-call', label: 'API Call', desc: 'Call API, map response to fields, then optionally advance' },
  { value: 'fire-and-forget', label: 'Fire & Forget', desc: 'Trigger API in background; immediately proceed without waiting' },
  { value: 'navigate', label: 'Navigate', desc: 'Immediately go to a URL / dashboard without any API call' },
];

function ButtonCard({
  btn,
  apis,
  onUpdate,
  onRemove,
}: {
  btn: ActionButton;
  apis: ApiDefinition[];
  onUpdate: (b: ActionButton) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const update = (patch: Partial<ActionButton>) => onUpdate({ ...btn, ...patch });
  const styleConf = BUTTON_STYLES.find((s) => s.value === btn.style) ?? BUTTON_STYLES[0];
  const actionConf = ACTION_TYPES.find((a) => a.value === btn.action) ?? ACTION_TYPES[0];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical size={13} className="text-slate-300" />
        <input
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-slate-700 outline-none hover:border-slate-200 focus:border-indigo-300"
          value={btn.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Button label"
        />
        <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', styleConf.color)}>
          {styleConf.label}
        </span>
        <span className="text-[9px] font-semibold text-slate-400 uppercase">{btn.action}</span>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-700">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={onRemove} className="text-slate-300 hover:text-rose-500">
          <Trash2 size={13} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-3 py-3 space-y-3">
          {/* Action type selector */}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1.5">Action Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ACTION_TYPES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => update({ action: a.value })}
                  className={cn(
                    'rounded-lg border p-2 text-left transition-colors',
                    btn.action === a.value
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <p className="text-[10px] font-bold">{a.label}</p>
                  <p className="text-[9px] text-current opacity-60 mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Button Style</label>
            <div className="flex flex-wrap gap-1.5">
              {BUTTON_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => update({ style: s.value })}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[10px] font-semibold border transition-all',
                    s.color,
                    btn.style === s.value ? 'ring-2 ring-offset-1 ring-indigo-400' : 'opacity-60 hover:opacity-100',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* API selection for api-call / fire-and-forget */}
          {(btn.action === 'api-call' || btn.action === 'fire-and-forget') && (
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Linked API</label>
              <select
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={btn.apiId ?? ''}
                onChange={(e) => update({ apiId: e.target.value })}
              >
                <option value="">— select API —</option>
                {apis.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.method} {a.url.slice(0, 30)})</option>
                ))}
              </select>
            </div>
          )}

          {/* Navigate to / after fire-and-forget */}
          {(btn.action === 'navigate' || btn.action === 'fire-and-forget') && (
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                Navigate To (path / URL)
              </label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-[10px] outline-none focus:border-indigo-300"
                value={btn.navigateTo ?? ''}
                onChange={(e) => update({ navigateTo: e.target.value })}
                placeholder="/dashboard"
              />
            </div>
          )}

          {/* Confirmation */}
          <div className="flex items-start gap-2 rounded-md bg-slate-50 p-2">
            <input
              type="checkbox"
              checked={!!btn.requiresConfirmation}
              onChange={(e) => update({ requiresConfirmation: e.target.checked })}
              className="mt-0.5 h-3 w-3 rounded"
            />
            <div>
              <label className="text-[10px] font-medium text-slate-600">Require Confirmation</label>
              {btn.requiresConfirmation && (
                <input
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-[10px] outline-none focus:border-indigo-300"
                  value={btn.confirmationMessage ?? ''}
                  onChange={(e) => update({ confirmationMessage: e.target.value })}
                  placeholder="Are you sure you want to proceed?"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Tooltip</label>
            <input
              className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] outline-none focus:border-indigo-300"
              value={btn.tooltip ?? ''}
              onChange={(e) => update({ tooltip: e.target.value })}
              placeholder="Button tooltip text"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main APIsActionsEditor ───────────────────────────────────────────────────

export function ApiActionsEditor({ nodeId }: { nodeId: string }) {
  const store = useWorkflowStore();
  const node = store.nodes.find((n) => n.id === nodeId);
  const apis = node?.data.apis ?? [];
  const buttons = node?.data.actionButtons ?? [];

  const addApi = useCallback(() => {
    const api: ApiDefinition = {
      id: uuidv4(),
      name: `API ${apis.length + 1}`,
      url: 'https://',
      method: 'GET',
      headers: [],
      queryParams: [],
      responseMapping: [],
      timing: 'on-action',
    };
    store.addApi(nodeId, api);
  }, [nodeId, apis.length, store]);

  const addButton = useCallback(() => {
    const btn: ActionButton = {
      id: uuidv4(),
      label: `Submit`,
      style: 'primary',
      action: 'submit',
    };
    store.addActionButton(nodeId, btn);
  }, [nodeId, store]);

  return (
    <div className="flex flex-col gap-6">
      {/* APIs section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-700">API Integrations</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Pre-load, On-Action, and Fire-&amp;-Forget calls</p>
          </div>
          <button
            onClick={addApi}
            className="flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
          >
            <Plus size={12} /> Add API
          </button>
        </div>

        {/* Timing legend */}
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {(Object.entries(timingConfig) as [ApiTiming, typeof timingConfig[ApiTiming]][]).map(
            ([key, cfg]) => (
              <div key={key} className={cn('rounded-md border p-1.5 text-[9px]', cfg.color)}>
                <div className="flex items-center gap-1 font-bold mb-0.5">
                  {cfg.icon} {cfg.label}
                </div>
                <span className="opacity-70 leading-tight block">{cfg.desc.slice(0, 60)}…</span>
              </div>
            ),
          )}
        </div>

        {apis.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
            No APIs defined.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {apis.map((api) => (
            <ApiCard
              key={api.id}
              api={api}
              onUpdate={(updated) => store.updateApi(nodeId, updated)}
              onRemove={() => store.removeApi(nodeId, api.id)}
            />
          ))}
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Action Buttons section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-700">Action Buttons</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Buttons rendered on the task screen</p>
          </div>
          <button
            onClick={addButton}
            className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-100"
          >
            <Plus size={12} /> Add Button
          </button>
        </div>

        {/* Preview */}
        {buttons.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="text-[9px] text-slate-400 w-full mb-1">Preview:</span>
            {buttons.map((btn) => {
              const s = BUTTON_STYLES.find((x) => x.value === btn.style) ?? BUTTON_STYLES[0];
              return (
                <span key={btn.id} className={cn('rounded-md px-3 py-1 text-[10px] font-semibold', s.color)}>
                  {btn.label}
                </span>
              );
            })}
          </div>
        )}

        {buttons.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
            No buttons defined.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {buttons.map((btn) => (
            <ButtonCard
              key={btn.id}
              btn={btn}
              apis={apis}
              onUpdate={(updated) => store.updateActionButton(nodeId, updated)}
              onRemove={() => store.removeActionButton(nodeId, btn.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
