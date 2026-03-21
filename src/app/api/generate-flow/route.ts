import { NextRequest, NextResponse } from 'next/server';
import { generateFlow } from '@backend/services/flow-generator';

// Re-export types for API consumers
export type { SerializedNode, SerializedEdge, GeneratedFlow } from '@backend/services/flow-generator';

// ──────────────────────────────────────────────────────────────────────────────
// NOTE: All flow generation logic lives in backend/services/flow-generator.ts
// This file is a thin HTTP controller only.
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt || prompt.length < 5) {
    return NextResponse.json({ error: 'Prompt must be at least 5 characters.' }, { status: 400 });
  }
  if (prompt.length > 2000) {
    return NextResponse.json({ error: 'Prompt too long (max 2000 chars).' }, { status: 400 });
  }

  const flow = await generateFlow(prompt);
  return NextResponse.json({ flow });
}

