'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useWorkflowStore } from '@/lib/store';
import type {
  BusinessRule,
  RuleCondition,
  RuleTrigger,
  RuleAction,
  RuleOperator,
} from '@/lib/types';

const TRIGGERS: { value: RuleTrigger; label: string }[] = [
  { value: 'onLoad', label: 'On Load' },
  { value: 'onChange', label: 'On Change' },
  { value: 'onSubmit', label: 'On Submit' },
  { value: 'always', label: 'Always' },
];

const OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: 'eq', label: '= equals' },
  { value: 'neq', label: '≠ not equals' },
  { value: 'gt', label: '> greater than' },
  { value: 'gte', label: '>= greater or equal' },
  { value: 'lt', label: '< less than' },
  { value: 'lte', label: '<= less or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'notContains', label: 'not contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
  { value: 'in', label: 'in (comma-sep)' },
  { value: 'notIn', label: 'not in (comma-sep)' },
  { value: 'matchesRegex', label: 'matches regex' },
];

const ACTIONS: { value: RuleAction; label: string }[] = [
  { value: 'show', label: 'Show field' },
  { value: 'hide', label: 'Hide field' },
  { value: 'enable', label: 'Enable field' },
  { value: 'disable', label: 'Disable field' },
  { value: 'require', label: 'Make required' },
  { value: 'makeOptional', label: 'Make optional' },
  { value: 'setValue', label: 'Set value' },
  { value: 'showError', label: 'Show error message' },
  { value: 'hideError', label: 'Hide error message' },
];

function ConditionRow({
  condition,
  fields,
  onUpdate,
  onRemove,
}: {
  condition: RuleCondition;
  fields: string[];
  onUpdate: (c: RuleCondition) => void;
  onRemove: () => void;
}) {
  const valuesNeeded = !['isEmpty', 'isNotEmpty'].includes(condition.operator);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5">
      <select
        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 outline-none"
        value={condition.fieldName}
        onChange={(e) => onUpdate({ ...condition, fieldName: e.target.value })}
      >
        <option value="">— field —</option>
        {fields.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <select
        className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 outline-none"
        value={condition.operator}
        onChange={(e) => onUpdate({ ...condition, operator: e.target.value as RuleOperator })}
      >
        {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {valuesNeeded && (
        <input
          className="w-24 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 outline-none"
          value={condition.value ?? ''}
          onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
          placeholder="value"
        />
      )}
      <button onClick={onRemove} className="ml-auto text-slate-300 hover:text-rose-500">
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function RuleCard({
  rule,
  fields,
  onUpdate,
  onRemove,
}: {
  rule: BusinessRule;
  fields: string[];
  onUpdate: (r: BusinessRule) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const update = (patch: Partial<BusinessRule>) => onUpdate({ ...rule, ...patch });

  const addCondition = () => {
    const cond: RuleCondition = { id: uuidv4(), fieldName: '', operator: 'eq', value: '' };
    update({ conditions: [...rule.conditions, cond] });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        <GripVertical size={13} className="text-slate-300" />
        <input
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-slate-700 outline-none hover:border-slate-200 focus:border-indigo-300"
          value={rule.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Rule name"
        />
        <select
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 outline-none"
          value={rule.trigger}
          onChange={(e) => update({ trigger: e.target.value as RuleTrigger })}
        >
          {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="h-3 w-3 rounded"
          />
          On
        </label>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-700">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={onRemove} className="text-slate-300 hover:text-rose-500">
          <Trash2 size={13} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-3 py-3 space-y-3">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1.5">
              Conditions
              <select
                className="ml-2 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] outline-none"
                value={rule.conditionOperator}
                onChange={(e) => update({ conditionOperator: e.target.value as 'AND' | 'OR' })}
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              {rule.conditions.map((cond, i) => (
                <ConditionRow
                  key={cond.id}
                  condition={cond}
                  fields={fields}
                  onUpdate={(updated) => {
                    const newConds = [...rule.conditions];
                    newConds[i] = updated;
                    update({ conditions: newConds });
                  }}
                  onRemove={() => update({ conditions: rule.conditions.filter((_, j) => j !== i) })}
                />
              ))}
            </div>
            <button
              onClick={addCondition}
              className="mt-2 flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700"
            >
              <Plus size={11} /> Add Condition
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Action</label>
              <select
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={rule.action}
                onChange={(e) => update({ action: e.target.value as RuleAction })}
              >
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Target Field</label>
              <select
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
                value={rule.targetField ?? ''}
                onChange={(e) => update({ targetField: e.target.value })}
              >
                <option value="">— select field —</option>
                {fields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {rule.action === 'setValue' && (
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Value to Set</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-300"
                value={rule.actionValue ?? ''}
                onChange={(e) => update({ actionValue: e.target.value })}
                placeholder="Value or {{fieldName}}"
              />
            </div>
          )}

          {(rule.action === 'showError' || rule.action === 'hideError') && (
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-1">Error Message</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-300"
                value={rule.errorMessage ?? ''}
                onChange={(e) => update({ errorMessage: e.target.value })}
                placeholder="Validation error message"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Description</label>
            <textarea
              className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] outline-none focus:border-indigo-300"
              rows={2}
              value={rule.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe the rule purpose"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function BusinessRulesEditor({ nodeId }: { nodeId: string }) {
  const store = useWorkflowStore();
  const node = store.nodes.find((n) => n.id === nodeId);
  const rules = node?.data.businessRules ?? [];
  const inputFields = (node?.data.inputFields ?? []).map((f) => f.name);
  const outputFields = (node?.data.outputFields ?? []).map((f) => f.name);
  const allFields = [...new Set([...inputFields, ...outputFields])];

  const addRule = useCallback(() => {
    const rule: BusinessRule = {
      id: uuidv4(),
      name: `Rule ${rules.length + 1}`,
      trigger: 'onLoad',
      conditions: [],
      conditionOperator: 'AND',
      action: 'show',
      targetField: '',
      priority: rules.length + 1,
      enabled: true,
    };
    store.addBusinessRule(nodeId, rule);
  }, [nodeId, rules.length, store]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Conditional logic that shows, hides, or validates fields
        </p>
        <button
          onClick={addRule}
          className="flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
        >
          <Plus size={12} /> Add Rule
        </button>
      </div>

      {rules.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
          No rules defined. Click &quot;Add Rule&quot; to begin.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            fields={allFields}
            onUpdate={(updated) => store.updateBusinessRule(nodeId, updated)}
            onRemove={() => store.removeBusinessRule(nodeId, rule.id)}
          />
        ))}
      </div>
    </div>
  );
}
