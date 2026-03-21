// ─── Field Definitions ────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'select'
  | 'multiselect'
  | 'file'
  | 'currency'
  | 'json'
  | 'table';

export interface SelectOption {
  label: string;
  value: string;
}

export interface FieldDefinition {
  id: string;
  name: string;           // programmatic key
  label: string;          // display label
  type: FieldType;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: SelectOption[]; // for select / multiselect
  validationRegex?: string;
  validationMessage?: string;
  helpText?: string;
  readOnly?: boolean;
  hidden?: boolean;
  columns?: FieldDefinition[]; // for 'table' type — defines repeatable row columns
}

// ─── API / Integration Definitions ───────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * preload        – Called synchronously BEFORE the task screen renders.
 *                  The response is injected into input fields automatically.
 * on-action      – Called when the user clicks an ActionButton (awaited, blocks UI).
 * fire-and-forget – Called when a button is clicked; user proceeds immediately
 *                  to next activity / dashboard without waiting for a response.
 */
export type ApiTiming = 'preload' | 'on-action' | 'fire-and-forget';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

export interface ResponseMapping {
  id: string;
  responsePath: string;  // dot-notation path in the response JSON (e.g. "data.user.id")
  fieldName: string;     // target field name in the activity
}

export interface ApiDefinition {
  id: string;
  name: string;
  description?: string;
  url: string;                   // supports {{fieldName}} interpolation
  method: HttpMethod;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyTemplate?: string;         // JSON string with {{fieldName}} placeholders
  responseMapping: ResponseMapping[];
  timing: ApiTiming;
  loadingMessage?: string;
  errorMessage?: string;
  timeoutMs?: number;
}

// ─── Action Buttons ───────────────────────────────────────────────────────────

export type ButtonStyle = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';

/**
 * submit          – Validate form, collect output fields, advance to next activity.
 * api-call        – Call the linked API. Waits for response, maps to fields, then
 *                   optionally advances.
 * fire-and-forget – POST the data, immediately advance/navigate without waiting.
 * navigate        – Immediately navigate to a URL / dashboard without any API call.
 */
export type ButtonAction = 'submit' | 'api-call' | 'fire-and-forget' | 'navigate';

export interface ActionButton {
  id: string;
  label: string;
  style: ButtonStyle;
  action: ButtonAction;
  apiId?: string;                // references ApiDefinition.id for api-call / fire-and-forget
  navigateTo?: string;           // path for navigate / after fire-and-forget
  advanceActivity?: boolean;     // advance to next activity after action (default true for submit)
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  tooltip?: string;
  icon?: string;
  disabled?: boolean;
}

// ─── Business Rules ───────────────────────────────────────────────────────────

export type RuleOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'notContains'
  | 'startsWith' | 'endsWith'
  | 'isEmpty' | 'isNotEmpty'
  | 'in' | 'notIn'
  | 'matchesRegex';

export type RuleTrigger = 'onLoad' | 'onChange' | 'onSubmit' | 'always';

export type RuleAction =
  | 'show' | 'hide'
  | 'enable' | 'disable'
  | 'require' | 'makeOptional'
  | 'setValue'
  | 'showError'
  | 'hideError';

export interface RuleCondition {
  id: string;
  fieldName: string;
  operator: RuleOperator;
  value?: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description?: string;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  conditionOperator: 'AND' | 'OR';
  action: RuleAction;
  targetField?: string;
  actionValue?: string;
  errorMessage?: string;
  priority: number;
  enabled: boolean;
}

// ─── Workflow Node Data ────────────────────────────────────────────────────────

export type WFNodeType =
  | 'startEvent'
  | 'startMessageEvent'
  | 'endEvent'
  | 'intermediateMessageEvent'
  | 'timerEvent'
  | 'errorBoundaryEvent'
  | 'userTask'
  | 'serviceTask'
  | 'exclusiveGateway'
  | 'parallelGateway'
  | 'inclusiveGateway'
  | 'scriptTask'
  | 'subProcess'
  | 'swimlane'
  | 'milestone';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type AssigneeType = 'user' | 'role' | 'expression';

export interface WorkflowNodeData extends Record<string, unknown> {
  nodeType: WFNodeType;
  label: string;
  description?: string;

  // ── Boundary event attachment
  attachedToNodeId?: string;

  // ── UserTask specific
  assignee?: string;
  assigneeType?: AssigneeType;
  dueDate?: string;
  priority?: TaskPriority;
  formTitle?: string;

  // ── Gateway specific
  defaultFlowId?: string;

  // ── ServiceTask specific (ID of the single API to call)
  serviceApiId?: string;
  retryCount?: number;

  // ── ScriptTask specific
  scriptBody?: string;
  scriptLanguage?: 'javascript' | 'python' | 'groovy';

  // ── Fields
  inputFields: FieldDefinition[];
  outputFields: FieldDefinition[];

  // ── Business rules
  businessRules: BusinessRule[];

  // ── APIs (preload, on-action, fire-and-forget)
  apis: ApiDefinition[];

  // ── Action buttons (primarily for UserTask)
  actionButtons: ActionButton[];

  // ── Visual metadata
  color?: string;
}

export type WorkflowNodeDataRecord = Record<string, unknown> & WorkflowNodeData;

// ─── Workflow Edge Data ───────────────────────────────────────────────────────

export interface WorkflowEdgeData {
  label?: string;
  condition?: string;             // human-readable condition
  conditionExpression?: string;   // expression evaluated at runtime
  isDefault?: boolean;
  [key: string]: unknown;
}

// ─── Top-level Workflow Metadata ──────────────────────────────────────────────

export interface WorkflowMeta {
  id: string;
  name: string;
  description?: string;
  version: string;
  owner?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Custom Canvas Node & Edge types ─────────────────────────────────────────

/** A workflow node in our custom canvas engine (replaces xyflow Node). */
export interface WFNode {
  id:       string;
  type:     string;
  position: { x: number; y: number };
  width:    number;
  height:   number;
  data:     WorkflowNodeData;
  selected?: boolean;
}

/** A workflow edge in our custom canvas engine (replaces xyflow Edge). */
export interface WFEdge {
  id:            string;
  source:        string;
  target:        string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?:         string;
  data?:         WorkflowEdgeData;
  selected?:     boolean;
}
