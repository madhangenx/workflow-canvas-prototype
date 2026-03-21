/**
 * Flow Generator Service
 * Core business logic for rule-based and AI-driven BPMN workflow generation.
 * This module is framework-agnostic (no Next.js / HTTP dependencies).
 */
import { v4 as uuidv4 } from 'uuid';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SerializedNode {
  id:       string;
  type:     string;
  position: { x: number; y: number };
  width:    number;
  height:   number;
  data:     Record<string, unknown>;
}

export interface SerializedEdge {
  id:     string;
  source: string;
  target: string;
  type:   string;
  data:   { label?: string };
}

export interface GeneratedFlow {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

// ── Keyword → node-type mappings ─────────────────────────────────────────────

const TASK_KEYWORDS: { pattern: RegExp; type: string; label: string }[] = [
  { pattern: /\b(form|input|fill|submit|request|apply|register)\b/i,          type: 'userTask',    label: 'User Task' },
  { pattern: /\b(review|approve|reject|verify|check|validate|assess)\b/i,     type: 'userTask',    label: 'Review & Approve' },
  { pattern: /\b(email|notify|send|message|alert|webhook|callback)\b/i,       type: 'serviceTask', label: 'Send Notification' },
  { pattern: /\b(fetch|retrieve|query|search|lookup|load|get)\b/i,            type: 'serviceTask', label: 'Fetch Data' },
  { pattern: /\b(save|store|persist|write|update|insert|record)\b/i,          type: 'serviceTask', label: 'Save Record' },
  { pattern: /\b(calculate|compute|process|transform|convert|aggregate)\b/i,  type: 'scriptTask',  label: 'Process Data' },
  { pattern: /\b(generate|create|build|produce|render|export)\b/i,            type: 'scriptTask',  label: 'Generate Output' },
  { pattern: /\b(invoice|payment|charge|bill|receipt)\b/i,                    type: 'serviceTask', label: 'Process Payment' },
  { pattern: /\b(report|summary|dashboard|analytics|log|audit)\b/i,           type: 'scriptTask',  label: 'Generate Report' },
  { pattern: /\b(upload|download|file|document|attachment)\b/i,               type: 'userTask',    label: 'Manage Document' },
  { pattern: /\b(signin|login|authenticate|authorize|auth)\b/i,               type: 'serviceTask', label: 'Authenticate User' },
  { pattern: /\b(onboard|welcome|setup|configure|initialise|initialize)\b/i,  type: 'userTask',    label: 'Onboarding' },
];

const GATEWAY_KEYWORDS: { pattern: RegExp; label: string; type: string }[] = [
  { pattern: /\b(if|when|check|condition|decision|branch|choice|whether|based on|depending)\b/i, label: 'Decision',  type: 'exclusiveGateway' },
  { pattern: /\b(parallel|simultaneously|at the same time|fork|split)\b/i,                       label: 'Fork',      type: 'parallelGateway' },
  { pattern: /\b(join|merge|converge|all complete|gather)\b/i,                                    label: 'Join',      type: 'parallelGateway' },
  { pattern: /\b(approved|rejected|accepted|denied)\b/i,                                          label: 'Approved?', type: 'exclusiveGateway' },
  { pattern: /\b(valid|invalid|error|fail|success)\b/i,                                           label: 'Valid?',    type: 'exclusiveGateway' },
];

// ── Node / Edge builders ──────────────────────────────────────────────────────

function makeNode(type: string, label: string, x: number, y: number): SerializedNode {
  const isGateway = type.includes('Gateway');
  const isEvent   = type.includes('Event');
  const width  = isEvent ? 44 : isGateway ? 48 : 166;
  const height = isEvent ? 44 : isGateway ? 48 : 44;
  return {
    id: uuidv4(),
    type,
    position: { x, y },
    width,
    height,
    data: {
      nodeType:      type,
      label,
      inputFields:   [],
      outputFields:  [],
      businessRules: [],
      apis:          [],
      actionButtons: [],
    },
  };
}

function makeEdge(source: string, target: string, label?: string): SerializedEdge {
  return {
    id: uuidv4(),
    source,
    target,
    type: 'sequenceEdge',
    data: { label },
  };
}

// ── Prompt segmentation ───────────────────────────────────────────────────────

function segmentPrompt(prompt: string): string[] {
  return prompt
    .split(/[,;.\n]|(\band\b)|(\bthen\b)|(\bafter\b)|(\bnext\b)/i)
    .map((s) => s?.trim())
    .filter((s): s is string => !!s && s.length > 3);
}

// ── Rule-based generator ──────────────────────────────────────────────────────

export function ruleBasedGenerate(prompt: string): GeneratedFlow {
  const segments = segmentPrompt(prompt);
  const nodes: SerializedNode[] = [];
  const edges: SerializedEdge[] = [];

  const startNode = makeNode('startEvent', 'Start', 60, 200);
  nodes.push(startNode);

  const X_STEP = 240;
  let x      = 60 + X_STEP;
  let prevId = startNode.id;

  for (const segment of segments) {
    const gwMatch = GATEWAY_KEYWORDS.find((g) => g.pattern.test(segment));
    if (gwMatch) {
      const gw = makeNode(gwMatch.type, gwMatch.label, x, 200);
      nodes.push(gw);
      edges.push(makeEdge(prevId, gw.id));
      prevId = gw.id;
      x += X_STEP;

      if (gwMatch.type === 'exclusiveGateway') {
        const yesTask = makeNode('userTask',    'Yes Path', x, 120);
        const noTask  = makeNode('serviceTask', 'No Path',  x, 280);
        nodes.push(yesTask, noTask);
        edges.push(makeEdge(gw.id, yesTask.id, 'Yes'), makeEdge(gw.id, noTask.id, 'No'));
        x += X_STEP;
        const mergeGw = makeNode('exclusiveGateway', 'Merge', x, 200);
        nodes.push(mergeGw);
        edges.push(makeEdge(yesTask.id, mergeGw.id), makeEdge(noTask.id, mergeGw.id));
        prevId = mergeGw.id;
        x += X_STEP;
      }
      continue;
    }

    const taskMatch = TASK_KEYWORDS.find((t) => t.pattern.test(segment));
    if (taskMatch) {
      const words = segment.replace(/[^a-zA-Z ]/g, '').split(/\s+/).slice(0, 4);
      const raw   = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      const label = raw.length > 30 ? taskMatch.label : raw || taskMatch.label;
      const task  = makeNode(taskMatch.type, label, x, 200);
      nodes.push(task);
      edges.push(makeEdge(prevId, task.id));
      prevId = task.id;
      x += X_STEP;
    }
  }

  // Default flow if nothing meaningful was extracted
  if (nodes.length === 1) {
    const t1      = makeNode('userTask',         'User Action',   x, 200); x += X_STEP;
    const t2      = makeNode('serviceTask',      'Process',       x, 200); x += X_STEP;
    const t3      = makeNode('userTask',         'Review',        x, 200); x += X_STEP;
    const gw      = makeNode('exclusiveGateway', 'Approved?',     x, 200); x += X_STEP;
    const notified = makeNode('serviceTask',     'Notify Result', x, 200); x += X_STEP;
    nodes.push(t1, t2, t3, gw, notified);
    edges.push(
      makeEdge(prevId,     t1.id),
      makeEdge(t1.id,      t2.id),
      makeEdge(t2.id,      t3.id),
      makeEdge(t3.id,      gw.id),
      makeEdge(gw.id,      notified.id, 'Yes'),
      makeEdge(gw.id,      t2.id,       'No'),
    );
    prevId = notified.id;
  }

  const endNode = makeNode('endEvent', 'End', x, 200);
  nodes.push(endNode);
  edges.push(makeEdge(prevId, endNode.id));

  return { nodes, edges };
}

// ── AI provider (optional — requires OPENAI_API_KEY) ─────────────────────────

const AI_SYSTEM_PROMPT = `You are a workflow designer. Given a business process description, return a JSON object with "nodes" and "edges" arrays that represent the BPMN workflow.

Node types: startEvent, endEvent, userTask, serviceTask, scriptTask, exclusiveGateway, parallelGateway, subProcess
Each node: { "id": "<uuid>", "type": "<nodeType>", "position": {"x": <number>, "y": <number>}, "width": <number>, "height": <number>, "data": {"nodeType": "<type>", "label": "<name>", "inputFields": [], "outputFields": [], "businessRules": [], "apis": [], "actionButtons": []} }
Each edge: { "id": "<uuid>", "source": "<nodeId>", "target": "<nodeId>", "type": "sequenceEdge", "data": {"label": "<optional>"} }

Sizes: startEvent/endEvent width=44 height=44, exclusiveGateway/parallelGateway width=48 height=48, tasks width=166 height=44
Layout nodes horizontally from x=60 with 240px gaps. Return ONLY valid JSON, no markdown.`;

export async function aiGenerate(prompt: string): Promise<GeneratedFlow | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user',   content: `Create a workflow for: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });
    if (!response.ok) return null;
    const json    = await response.json();
    const content = (json.choices?.[0]?.message?.content ?? '') as string;
    return JSON.parse(content) as GeneratedFlow;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Generate a BPMN flow from a natural-language prompt. Uses AI when available, falls back to rule-based. */
export async function generateFlow(prompt: string): Promise<GeneratedFlow> {
  return (await aiGenerate(prompt)) ?? ruleBasedGenerate(prompt);
}
