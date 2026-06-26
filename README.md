# KOC Fashion Studio

AI-powered fashion image generation for KOC (Key Opinion Consumer) product promotion. Generate photorealistic commercial photography with face identity preservation.

## Features

- **Single Character Generation** — 1 person, 1 product, premium commercial style
- **Two Character Generation** — 2 people with independent face/outfit/product control
- **AI Pipeline** — 10-stage architecture: input → multimodal analysis → priority engine → action expansion → conflict detection → prompt composition → variant planning → image generation
- **Face Identity Lock** — Vision pre-analysis + reference stack architecture for face preservation
- **User DNA Profile** — Feedback-driven personalization (scenes, camera, lighting, mood preferences)
- **Admin Panel** — User management, generation history, activity logs, affiliate settings
- **Vietnamese UI** — Fully localized interface

## Tech Stack

- **Backend**: Node.js + Hono + TypeScript
- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
- **AI**: Google Gemini 2.5 Flash Image
- **Database**: Supabase PostgreSQL (production) / In-memory (local dev)
- **Auth**: JWT tokens (local dev auto-login)

## Quick Start

### Prerequisites

- Node.js 18+
- Google Gemini API Key ([get one here](https://aistudio.google.com/apikey))

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/koc-fashion-studio.git
cd koc-fashion-studio

# Install dependencies
cd functions && npm install && cd ..
cd frontend && npm install && cd ..

# Set your Gemini API key
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY
```

### Run (Windows)

```bash
# Option 1: Using batch scripts
run-backend.bat     # Starts backend on :5001
run-frontend.bat    # Starts frontend on :3000

# Option 2: Manual
cd functions
set GEMINI_API_KEY=your_key_here
set LOCAL_DEV=true
npx tsx src/dev-server.ts

cd frontend
npx next dev -p 3000
```

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- Auto-login as admin on local dev

## Project Structure

```
├── functions/                 # Backend
│   └── src/
│       ├── ai-orchestration/  # AI pipeline
│       │   ├── single/        # Tab 1 pipeline
│       │   ├── two/           # Tab 2 pipeline
│       │   └── shared/        # Scene, action, ratio, negative rules
│       ├── routes/            # API endpoints
│       ├── services/          # Gemini, face analyzer, DNA engine
│       ├── db/                # Database (local + Supabase)
│       └── middleware/        # Auth, admin
├── frontend/                  # Next.js 15 App Router
│   └── src/
│       ├── app/               # Pages (generate, history, admin, affiliate)
│       ├── components/        # UI components (Shadcn/Base UI)
│       ├── hooks/             # useGeneration, useAuth
│       └── lib/               # API client, utils, types
└── .env.example               # Environment template
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate/single` | Generate single-character image |
| POST | `/api/generate/two` | Generate two-character image (Level 2) |
| GET | `/api/generate/history` | User generation history |
| GET | `/api/generate/:id` | Poll generation status |
| POST | `/api/feedback` | Submit image feedback |
| GET | `/api/feedback/dna` | User style DNA |
| GET | `/api/admin/dashboard` | Admin statistics |
| GET | `/api/admin/users` | User management |
| POST | `/api/debug/single/build-prompt` | Debug prompt |
| POST | `/api/debug/two/build-prompt` | Debug prompt (Tab 2) |

## License

MIT
