# System Audit Report

## Dead Files (zero imports — safe to delete)

| File | Notes |
|---|---|
| `frontend/src/server/services/batch-queue.ts` | Replaced by job-queue.ts |
| `frontend/src/server/services/comparisonChecker.ts` | Never used |
| `frontend/src/server/services/learning.ts` | Never used |
| `frontend/src/server/services/verifier.ts` | Never used |
| `frontend/src/server/services/insightface/index.ts` | Never used |
| `frontend/src/server/types.ts` | All types re-exported from `types/index.ts` instead |

## Dead Exports

### `frontend/src/server/services/input-learner.ts` (functions)
| Export | Used internally? | Imported externally? |
|---|---|---|
| `getLearningNotes` | No | No |
| `getAnalysis` | No | No |
| `clearAllInputs` | No | No |
| `getInputs` | No | No |

### `frontend/src/server/routes/gen-utils.ts` (functions)
| Export | Used in same file? | Imported externally? |
|---|---|---|
| `normalizeMimeType` | Yes (by `img`) | No |
| `img` | No | No |
| `label` | No | No |

## Alive (keep — part of active feature)

| File | Usage |
|---|---|
| `scanner.ts` | → `resolver.ts` → `context-builder.ts` → `debug.ts` (debug route) |
| `resolver.ts` | → `context-builder.ts` → `debug.ts` |
| `context-builder.ts` | → `debug.ts` (debug build-prompt endpoints) |
| `faceAnalyzer.ts` | → `context-builder.ts` + `debug.ts` |
| `preferenceEngine.ts` | → `feedback.ts` + `debug.ts` (live routes) |
| `feedbackEngine.ts` | → `feedback.ts` (live route) |
| `generate.ts` | Main `/api/generate` router (history, CRUD) |

## Recommended Order

1. Delete dead files
2. Remove dead exports from `input-learner.ts` and `gen-utils.ts`
