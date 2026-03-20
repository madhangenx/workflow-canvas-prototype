'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { useWorkflowStore } from '@/lib/store';
import type { FieldDefinition, FieldType, SelectOption } from '@/lib/types';
import { cn } from '@/lib/utils';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'boolean', label: 'Boolean (Toggle)' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'file', label: 'File Upload' },
  { value: 'currency', label: 'Currency' },
  { value: 'json', label: 'JSON / Object' },
];

// ── Single field expansion editor ──────────────────────────────────────────────

function FieldEditor({
  field,
  onUpdate,
  onRemove,
}: {
  field: FieldDefinition;
  onUpdate: (f: FieldDefinition) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [optionInput, setOptionInput] = useState('');

  const update = (patch: Partial<FieldDefinition>) => onUpdate({ ...field, ...patch });

  const addOption = () => {
    if (!optionInput.trim()) return;
    const opt: SelectOption = {
      label: optionInput.trim(),
      value: optionInput.trim().toLowerCase().replace(/\s+/g, '_'),
    };
    update({ options: [...(field.options ?? []), opt] });
    setOptionInput('');
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Compact header row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical size={13} className="text-slate-300" />
        <input
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-slate-700 outline-none hover:border-slate-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
          value={field.label}
          onChange={(e) => update({ label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
          placeholder="Field label"
        />
        <select
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 outline-none"
          value={field.type}
          onChange={(e) => update({ type: e.target.value as FieldType })}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => update({ required: e.target.checked })}
            className="h-3 w-3 rounded"
          />
          Req
        </label>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={onRemove} className="text-slate-300 hover:text-rose-500">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="border-t border-slate-100 px-3 py-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Field Key</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={field.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="field_key"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Default Value</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={field.defaultValue ?? ''}
                onChange={(e) => update({ defaultValue: e.target.value })}
                placeholder="Default"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Placeholder</label>
            <input
              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
              value={field.placeholder ?? ''}
              onChange={(e) => update({ placeholder: e.target.value })}
              placeholder="Placeholder text"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Help Text</label>
            <input
              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
              value={field.helpText ?? ''}
              onChange={(e) => update({ helpText: e.target.value })}
              placeholder="Hint shown below the field"
            />
          </div>

          {/* Options for select/multiselect */}
          {(field.type === 'select' || field.type === 'multiselect') && (
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Options</label>
              <div className="flex flex-col gap-1 mb-1.5">
                {(field.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-50 rounded px-2 py-1">
                    <span className="flex-1 text-[10px] text-slate-700">{opt.label}</span>
                    <span className="text-[10px] text-slate-400">{opt.value}</span>
                    <button
                      onClick={() => update({ options: field.options?.filter((_, j) => j !== i) })}
                      className="text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-300"
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOption()}
                  placeholder="Add option…"
                />
                <button onClick={addOption} className="rounded bg-indigo-500 px-2 text-white hover:bg-indigo-600">
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Validation Regex</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-[10px] text-slate-700 outline-none focus:border-indigo-300"
                value={field.validationRegex ?? ''}
                onChange={(e) => update({ validationRegex: e.target.value })}
                placeholder="^[A-Za-z]+$"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Validation Message</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] text-slate-700 outline-none focus:border-indigo-300"
                value={field.validationMessage ?? ''}
                onChange={(e) => update({ validationMessage: e.target.value })}
                placeholder="Invalid value"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-600">
              <input type="checkbox" checked={!!field.readOnly} onChange={(e) => update({ readOnly: e.target.checked })} className="h-3 w-3 rounded" />
              Read-only
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-600">
              <input type="checkbox" checked={!!field.hidden} onChange={(e) => update({ hidden: e.target.checked })} className="h-3 w-3 rounded" />
              Hidden
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FieldsEditor (used for both input and output) ─────────────────────────────

export function FieldsEditor({
  nodeId,
  mode,
}: {
  nodeId: string;
  mode: 'input' | 'output';
}) {
  const store = useWorkflowStore();
  const node = store.nodes.find((n) => n.id === nodeId);
  const fields = mode === 'input' ? (node?.data.inputFields ?? []) : (node?.data.outputFields ?? []);

  const addFn = mode === 'input' ? store.addInputField : store.addOutputField;
  const updateFn = mode === 'input' ? store.updateInputField : store.updateOutputField;
  const removeFn = mode === 'input' ? store.removeInputField : store.removeOutputField;

  const addField = useCallback(() => {
    const newField: FieldDefinition = {
      id: uuidv4(),
      name: `field_${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      type: 'text',
      required: false,
    };
    addFn(nodeId, newField);
  }, [nodeId, fields.length, addFn]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {mode === 'input' ? 'Data consumed by this activity' : 'Data produced by this activity'}
        </p>
        <button
          onClick={addField}
          className="flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
        >
          <Plus size={12} /> Add Field
        </button>
      </div>

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
          No fields defined. Click &quot;Add Field&quot; to begin.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {fields.map((f) => (
          <FieldEditor
            key={f.id}
            field={f}
            onUpdate={(updated) => updateFn(nodeId, updated)}
            onRemove={() => removeFn(nodeId, f.id)}
          />
        ))}
      </div>
    </div>
  );
}
