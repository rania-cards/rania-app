-- Emotional modes
CREATE TYPE rania_mode_key AS ENUM (
  'CRUSH_REVEAL',
  'DEEP_CONFESSION',
  'BESTIE_TRUTH_CHAIN',
  'ROAST_ME_SOFTLY',
  'FORGIVE_ME',
  'CLOSURE'
);

-- Content snippet types
CREATE TYPE rania_content_type AS ENUM (
  'teaser',
  'hidden',
  'followup_question',
  'caption'
);

-- Language codes
CREATE TYPE rania_language AS ENUM (
  'en',  -- English
  'sw',  -- Swahili
  'sh'   -- Sheng
);

-- Tone
CREATE TYPE rania_tone AS ENUM (
  'soft',
  'neutral',
  'dark'
);

-- Delivery format
CREATE TYPE rania_delivery_format AS ENUM (
  'text',
  'still',
  'gif',
  'motion'
);

-- Moment status
CREATE TYPE rania_moment_status AS ENUM (
  'draft',
  'sent',
  'awaiting_reply',
  'completed',
  'expired'
);

-- Pricing product type
CREATE TYPE rania_pricing_type AS ENUM (
  'per_moment',
  'pass'
);

-- Event types for analytics
CREATE TYPE rania_event_type AS ENUM (
  'moment_created',
  'moment_sent',
  'moment_viewed',
  'reply_created',
  'moment_completed',
  'premium_reveal_purchased',
  'deep_truth_purchased',
  'truth_l2_purchased',
  'pass_activated'
);

CREATE TABLE rania_modes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_key        rania_mode_key UNIQUE NOT NULL,
  name            TEXT NOT NULL,          -- Human label e.g. "Bestie Truth Chain"
  description     TEXT NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE rania_content_snippets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_id         UUID NOT NULL REFERENCES rania_modes(id) ON DELETE CASCADE,
  content_type    rania_content_type NOT NULL,
  language        rania_language NOT NULL,
  tone            rania_tone NOT NULL,
  text            TEXT NOT NULL,
  weight          INT NOT NULL DEFAULT 1,        -- for random selection bias
  tags            JSONB DEFAULT '{}'::JSONB,     -- e.g. {"theme": "accountability"}
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rania_content_mode_type_lang
  ON rania_content_snippets (mode_id, content_type, language);

CREATE TABLE rania_deep_truth_prompts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_id         UUID NOT NULL REFERENCES rania_modes(id) ON DELETE CASCADE,
  language        rania_language NOT NULL,
  prompt_text     TEXT NOT NULL,
  tone            rania_tone NOT NULL DEFAULT 'neutral',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mode_id, language, is_active)
);
CREATE TABLE rania_pricing_options (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT UNIQUE NOT NULL, -- e.g. "PREMIUM_REVEAL", "DEEP_TRUTH", "TRUTH_L2", "PASS_24H", "PASS_7D"
  name                TEXT NOT NULL,
  description         TEXT NOT NULL,
  pricing_type        rania_pricing_type NOT NULL,  -- per_moment vs pass
  price_kes           INT NOT NULL,                 -- e.g. 50, 100, 250
  duration_seconds    INT,                          -- only for passes; NULL for per_moment
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE rania_identities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID,                        -- FK to auth.users if logged in
  guest_id        TEXT,                        -- cookie-based or device-based identifier
  phone_hash      TEXT,                        -- optional, hashed phone if you ever store it
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_rania_identities_guest_id ON rania_identities(guest_id);

CREATE TABLE rania_moments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code              TEXT UNIQUE NOT NULL,   -- e.g. "xy1z", used in rania.co/xy1z
  mode_id                 UUID NOT NULL REFERENCES rania_modes(id) ON DELETE RESTRICT,
  sender_identity_id      UUID REFERENCES rania_identities(id) ON DELETE SET NULL,
  receiver_hint           TEXT,                   -- optional, not PII; e.g. "WhatsApp_contact_hash"
  
  delivery_format         rania_delivery_format NOT NULL DEFAULT 'still',

  teaser_snippet_id       UUID REFERENCES rania_content_snippets(id),
  hidden_snippet_id       UUID REFERENCES rania_content_snippets(id),

  custom_teaser_text      TEXT,  -- if sender edited/generated custom text
  custom_hidden_text      TEXT,

  is_premium_reveal       BOOLEAN NOT NULL DEFAULT FALSE,
  premium_reveal_option_id UUID REFERENCES rania_pricing_options(id),

  status                  rania_moment_status NOT NULL DEFAULT 'draft',
  sent_at                 TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rania_moments_mode_status
  ON rania_moments (mode_id, status);

CREATE TABLE rania_replies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id               UUID NOT NULL REFERENCES rania_moments(id) ON DELETE CASCADE,
  responder_identity_id   UUID REFERENCES rania_identities(id) ON DELETE SET NULL,
  reply_text              TEXT NOT NULL,
  vibe_score              INT,                    -- 1–10 optional
  extra_payload           JSONB DEFAULT '{}'::JSONB, -- e.g. emoji reactions, quick choices
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rania_replies_moment
  ON rania_replies (moment_id);
CREATE TABLE rania_followups (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id               UUID NOT NULL REFERENCES rania_moments(id) ON DELETE CASCADE,
  reply_id                UUID REFERENCES rania_replies(id) ON DELETE SET NULL,
  followup_snippet_id     UUID NOT NULL REFERENCES rania_content_snippets(id),
  custom_followup_text    TEXT,
  
  pricing_option_id       UUID REFERENCES rania_pricing_options(id),
  is_covered_by_pass      BOOLEAN NOT NULL DEFAULT FALSE,
  
  asked_at                TIMESTAMPTZ,
  answered_at             TIMESTAMPTZ,
  answered_text           TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rania_followups_moment
  ON rania_followups (moment_id);

CREATE TABLE rania_passes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id             UUID NOT NULL REFERENCES rania_identities(id) ON DELETE CASCADE,
  pricing_option_id       UUID NOT NULL REFERENCES rania_pricing_options(id) ON DELETE RESTRICT,
  valid_from              TIMESTAMPTZ NOT NULL,
  valid_to                TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rania_passes_identity_valid
  ON rania_passes (identity_id, valid_to);

CREATE TABLE rania_purchases (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id             UUID REFERENCES rania_identities(id) ON DELETE SET NULL,
  moment_id               UUID REFERENCES rania_moments(id) ON DELETE SET NULL,
  pricing_option_id       UUID NOT NULL REFERENCES rania_pricing_options(id) ON DELETE RESTRICT,
  provider                TEXT NOT NULL,             -- e.g. "PAYSTACK"
  provider_ref            TEXT,                      -- transaction reference
  amount_kes              INT NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'KES',
  status                  TEXT NOT NULL,             -- e.g. "success","failed","pending"
  raw_payload             JSONB DEFAULT '{}'::JSONB, -- full webhook/response
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rania_purchases_identity
  ON rania_purchases (identity_id);
CREATE TABLE rania_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id             UUID REFERENCES rania_identities(id) ON DELETE SET NULL,
  moment_id               UUID REFERENCES rania_moments(id) ON DELETE SET NULL,
  reply_id                UUID REFERENCES rania_replies(id) ON DELETE SET NULL,
  event_type              rania_event_type NOT NULL,
  properties              JSONB DEFAULT '{}'::JSONB,  -- device, source, etc.
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rania_events_type_created
  ON rania_events (event_type, created_at);
