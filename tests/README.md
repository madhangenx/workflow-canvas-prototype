# Tests

End-to-end and integration test suite using [Playwright](https://playwright.dev/).

## Structure

```
tests/
├── e2e/
│   ├── pw-verify-features.spec.ts       # Core features: edges, BPMN events, palette
│   └── pw-verify-ux-enhancements.spec.ts # UX: resizable panel, table fields, quick-add
└── playwright.config.ts
```

## Running Tests

**Dev server must be running first:**
```bash
npm run dev
```

**Run all E2E tests (headless):**
```bash
npm test
```

**Run with browser visible:**
```bash
npm run test:e2e
```

**Run a specific spec:**
```bash
npx playwright test --config=tests/playwright.config.ts tests/e2e/pw-verify-ux-enhancements.spec.ts
```

## Screenshots

Failure screenshots are saved to `pw-screenshots/` at the project root.
Trace files are saved to `test-results/` for debugging with `npx playwright show-trace`.
