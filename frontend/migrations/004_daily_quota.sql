-- Daily generation usage tracking
CREATE TABLE IF NOT EXISTS daily_usage (
  id BIGSERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE("userId", date)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_userId ON daily_usage("userId");
CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON daily_usage(date);

-- Seed default quotas (run once)
INSERT INTO app_settings (key, value) VALUES ('level1_daily_quota', '20') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (key, value) VALUES ('level2_daily_quota', '100') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (key, value) VALUES ('affiliate_direct_percent', '10') ON CONFLICT (key) DO NOTHING;
INSERT INTO app_settings (key, value) VALUES ('affiliate_indirect_percent', '2') ON CONFLICT (key) DO NOTHING;
