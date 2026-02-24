-- =============================================================================
-- FitZone Gym CRM — Production Migration Script
-- Run this ONCE on your production database (Render PostgreSQL)
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUMs ─────────────────────────────────────────────────────────────────────
CREATE TYPE user_role   AS ENUM ('admin', 'staff');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
CREATE TYPE lead_source AS ENUM ('website', 'referral', 'social_media', 'walk_in', 'phone', 'other');

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(50)   UNIQUE NOT NULL,
    email         VARCHAR(255)  UNIQUE NOT NULL,
    password      TEXT          NOT NULL,
    role          user_role     NOT NULL DEFAULT 'staff',
    full_name     VARCHAR(100),
    phone         VARCHAR(20),
    country       CHAR(2),
    is_active     BOOLEAN       NOT NULL DEFAULT true,
    created_by    UUID          REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── REFRESH TOKENS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash    TEXT          UNIQUE NOT NULL,
    ip            VARCHAR(45),
    user_agent    TEXT,
    expires_at    TIMESTAMPTZ   NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Revoked tokens — kept for reuse/theft detection
CREATE TABLE IF NOT EXISTS refresh_tokens_revoked (
    token_hash    TEXT          PRIMARY KEY,
    user_id       UUID          REFERENCES users(id) ON DELETE CASCADE,
    revoked_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── LEADS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(255)  UNIQUE,
    phone         VARCHAR(20),
    source        lead_source   NOT NULL DEFAULT 'other',
    status        lead_status   NOT NULL DEFAULT 'new',
    notes         TEXT,
    created_by    UUID          REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active      ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role           ON users(role);

CREATE INDEX IF NOT EXISTS idx_refresh_token_hash   ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_user_id      ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_expires_at   ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_leads_status         ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_by     ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_created_at     ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email          ON leads(email);

-- ── AUTO-UPDATE updated_at TRIGGER ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ADMIN ACCOUNT SETUP
-- Replace the values below with your real admin credentials.
-- Generate the password hash locally first:
--   node -e "import('bcryptjs').then(m => m.default.hash('YourPassword', 12).then(console.log))"
-- Then paste the hash below before running this script.
-- =============================================================================
INSERT INTO users (username, email, password, role, full_name, is_active)
VALUES (
    'admin',
    'admin@fitzone.com',
    '$2b$12$fpOPEQXiR9zO7D/BhRt4je0Ph6nyC8lfrIvIII6SVOogUo0sg6aeS',
    'admin',
    'FitZone Admin',
    true
)
ON CONFLICT (email) DO NOTHING;  -- safe to re-run, won't duplicate admin

-- =============================================================================
-- DONE
-- Verify everything ran correctly:
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
--   SELECT enum_range(NULL::user_role);
--   SELECT id, username, email, role, is_active FROM users;
-- =============================================================================