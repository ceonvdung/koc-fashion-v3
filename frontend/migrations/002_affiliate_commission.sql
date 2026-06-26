-- =============================================
-- KOC Fashion - Affiliate Settings & Commissions
-- Run after 001_pg_init.sql
-- =============================================

-- App settings (key-value store for affiliate rates, etc)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('affiliate_direct_percent', '"10"'),
  ('affiliate_indirect_percent', '"2"')
ON CONFLICT (key) DO NOTHING;

-- Commission records
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 1,
  "amount" NUMERIC NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_userId ON affiliate_commissions("userId");

-- Click tracking for referral links
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "linkId" TEXT NOT NULL,
  ip TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_linkId ON affiliate_clicks("linkId");
