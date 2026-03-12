# AI Visibility Audit — Project Bible

## Overview
SaaS tool that audits how well a brand is represented in AI model responses (ChatGPT, Gemini, Claude, Perplexity). Users enter a domain, the system scrapes it, generates prompts, queries AI models, analyzes results, and returns a scored report with recommendations.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS v3, Supabase JS
- **Backend**: Node.js 20, Express, TypeScript, Supabase Admin, OpenAI/Anthropic/Gemini/Perplexity SDKs
- **DB**: Supabase (Postgres + Auth + Realtime)
- **Payments**: Stripe
- **Deployment**: Vercel (frontend), Railway or Fly.io (backend)

## DB Schema

```sql
-- users managed by Supabase Auth

create table audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  domain text not null,
  brand_name text,
  target_keywords text[],
  target_market text default 'global',
  target_language text default 'en',
  status text default 'pending',
  -- status values: pending|scraping|third_party_check|generating_prompts|querying_models|analyzing|scoring|completed|failed
  error_message text,
  plan text default 'free',
  visibility_score int,
  accuracy_score int,
  perception_score int,
  market_rank int,
  models_queried text[],
  total_prompts int,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table audit_results (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits not null,
  result_type text not null,
  -- result_type values: brand_profile|prompt_results|hallucinations|competitors|sentiment|recommendations|website_readiness|third_party
  data jsonb not null,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free', -- free|starter|pro|agency
  status text default 'active',
  current_period_end timestamptz,
  audits_used_this_month int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 9-Step Pipeline

1. **Scrape** — fetch homepage + /about + /pricing, extract brand profile (name, desc, USPs, pricing, founded)
2. **Third-party check** — HEAD requests to G2, Capterra, Trustpilot, Clutch, ProductHunt, LinkedIn, Crunchbase, AppSumo
3. **Generate prompts** — fill templates with brand info, apply language translation if needed
4. **Query AI models** — parallel calls to OpenAI GPT-4o, Anthropic Claude, Google Gemini, Perplexity
5. **Analyze visibility** — mention rate, positions per prompt, model coverage, category breadth
6. **Detect hallucinations** — LLM fact-check call comparing responses to scraped ground truth
7. **Analyze sentiment** — classify each model response as positive/neutral/negative
8. **Extract competitors** — parse competitor brand names from responses, frequency rank
9. **Generate recommendations** — LLM call → structured JSON list of actionable items

After each step: `UPDATE audits SET status = '<step_name>' WHERE id = $1`

## Scoring Formulas

### Visibility Score (0–100)
```
mention_rate    × 40   (% of prompts where brand is mentioned)
model_coverage  × 30   (% of models that mention brand at least once)
avg_position    × 20   (1st=100, 2nd=80, 3rd=60, later=40, none=0; averaged)
category_breadth× 10   (% of prompt categories with ≥1 mention)
```

### Accuracy Score (0–100)
```
starts at 100
confirmed_false hallucination → −20 each
unverifiable claim            → −5 each
confirmed_true                → 0
floor: 0
```

### Perception Score (0–100)
```
positive_pct × 60 + neutral_pct × 30 + negative_pct × 0 + 10 (base)
```

### Market Rank
```
count brands mentioned more frequently than ours across all responses → rank = count + 1
```

## Plan Limits & Constants

| Plan    | Audits/month | Models | Prompts |
|---------|-------------|--------|---------|
| free    | 1           | 2      | 10      |
| starter | 5           | 3      | 25      |
| pro     | 20          | 4      | 50      |
| agency  | unlimited   | 4      | 100     |

## Prompt Template Categories

- **awareness**: "What tools do people use for [category]?"
- **comparison**: "Compare [brand] with alternatives"
- **recommendation**: "Recommend a [category] tool for [use_case]"
- **direct**: "Tell me about [brand]"
- **feature**: "Which tools have [feature]?"
- **problem**: "How do I solve [problem] with software?"

## Environment Variables (backend)

```
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
PERPLEXITY_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_URL=http://localhost:3000
```

## Key Conventions
- All pipeline errors set `audits.status = 'failed'` and `error_message`
- Pipeline runs async (fire-and-forget from POST /audits)
- Frontend polls via Supabase Realtime subscription on `audits` table
- All scores are integers 0–100
- UUIDs everywhere, no auto-increment IDs
