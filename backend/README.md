# Backend Services

Framework-agnostic server-side business logic. No Next.js or HTTP dependencies here — all modules are pure TypeScript that can be tested in isolation and reused across any transport layer.

## Structure

```
backend/
└── services/
    └── flow-generator.ts   # BPMN workflow generation (rule-based + AI)
```

## Services

### `flow-generator.ts`

Generates BPMN workflow graphs from natural-language prompts.

**Exports:**
- `generateFlow(prompt)` — Primary entry point. Uses OpenAI when `OPENAI_API_KEY` is set, falls back to rule-based generation.
- `ruleBasedGenerate(prompt)` — Deterministic keyword-matching engine.
- `aiGenerate(prompt)` — OpenAI `gpt-4o-mini` integration.

**HTTP controller:** `src/app/api/generate-flow/route.ts`
