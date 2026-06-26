<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-architecture -->
# AI Generation Pipeline Architecture

## Flow
```
POST /gen-batch → createJob() → Job Queue (MAX_CONCURRENT=2) → Worker → Gemini
              → return generationId immediately
              → Worker updates DB progressively (per image)
              → Frontend polls GET /generate/:id OR SSE /stream/:id
```

## Components

### `gemini.ts` — Circuit Breaker (per model)
- Separate circuit breaker for PRO (analyze) vs IMAGEN (generate)
- Threshold: 10 failures → open for 60s
- Retryable statuses: 429, 500, 502, 503, 504
- `fetchWithBackoff()` — PRO model calls (analysis)
- `fetchWithCircuitBreaker()` — IMAGEN calls (generation), throws `AI_PROVIDER_PAUSED` when circuit open

### `job-queue.ts` — In-memory Job Queue
- `MAX_CONCURRENT=2` — prevents Vertex API quota exhaustion
- Job states: pending → processing → completed/failed
- AI errors → requeue or retry individual slot
- SSE notification system for real-time progress
- Auto-cleanup completed/failed jobs after 30 min

### Route Handlers
- `gen-batch` — builds variant parts, calls createJob(), returns immediately
- `/gen` (streaming) — remains synchronous (direct Gemini call)
- SSE endpoint `/stream/:id` — polls DB every 1s for progressive rendering
<!-- END:project-architecture -->
