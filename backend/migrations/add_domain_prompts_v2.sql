-- Migration: v2 scoring stabilization
-- Run this in Supabase SQL editor before deploying the updated backend.

-- ── 1. Domain-scoped reusable prompts ────────────────────────────────────────
-- Stores generated prompts per domain so repeated audits reuse the same prompts,
-- ensuring score repeatability (±7 pts target).

CREATE TABLE IF NOT EXISTS domain_prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain      TEXT NOT NULL,
  first_audit_id UUID REFERENCES audits(id),
  category    TEXT NOT NULL CHECK (category IN ('discovery', 'factual', 'comparative', 'evaluation', 'practical')),
  prompt_text TEXT NOT NULL,
  language    TEXT NOT NULL DEFAULT 'en',
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_domain_prompt UNIQUE (domain, prompt_text)
);

CREATE INDEX IF NOT EXISTS idx_domain_prompts_domain_lang
  ON domain_prompts(domain, language);

-- ── 2. Extended audit scores (JSONB for components) ───────────────────────────
-- Stores full score breakdown including sub-components for transparency.

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS scores JSONB;

-- Example JSONB shape stored in scores:
-- {
--   "visibility":   { "score": 67, "components": { "weighted_mention_avg": 0.54, "position_score": 0.42, "model_coverage": 0.75, "consistency_bonus": 0.60 } },
--   "accuracy":     { "score": 72, "label": "Minor accuracy issues", "claim_stats": { ... } },
--   "reputation":   { "score": null, "components": { "mention_count": 1 } },
--   "competitive":  { "score": 58, "components": { "share_of_voice": 0.32, "avg_rank": 0.55 }, "competitorRanking": [ ... ] },
--   "composite":    65
-- }
