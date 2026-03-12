# AI Visibility Audit

Audit how ChatGPT, Gemini, Claude, and Perplexity describe your brand. Get scored reports with actionable recommendations.

## Structure

```
/
├── backend/          # Node.js + Express + TypeScript API
├── frontend/         # Next.js 14 App Router
└── CLAUDE.md         # Project bible (schema, formulas, pipeline)
```

## Quick start

### Backend
```bash
cd backend
cp .env.example .env   # fill in keys
npm install
npm run dev            # http://localhost:3001
```

### Frontend
```bash
cd frontend
cp .env.local.example .env.local   # fill in Supabase keys
npm install
npm run dev            # http://localhost:3000
```

## Environment variables

See `backend/.env.example` and `frontend/.env.local.example`.

## Pipeline

9-step audit pipeline: Scrape → Third-party check → Generate prompts → Query AI models → Analyze visibility → Detect hallucinations → Analyze sentiment → Extract competitors → Generate recommendations.

See `CLAUDE.md` for full documentation.
