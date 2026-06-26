-- =============================================
-- KOC Fashion - Seed admin user
-- Run this AFTER 001_pg_init.sql
-- Password: Admin@123456 (bcrypt hash, cost 12)
-- =============================================

INSERT INTO users (name, email, username, "passwordHash", role, status, "membershipLevel", "affiliateCode")
VALUES (
  'Super Admin',
  'admin@kocapp.com',
  'admin',
  '$2b$12$vPKPH8PPtiaJwS84NUppr.FUGxD08w3HlJycHwYmaAx4o1Ae0./tW',
  'super_admin',
  'active',
  2,
  'KOCADMIN01'
)
ON CONFLICT (email) DO NOTHING;
