-- =============================================
-- KOC Fashion - PostgreSQL Schema for Supabase
-- Run this entire script in Supabase SQL Editor
-- =============================================

-- =============================================
-- USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  "membershipLevel" INTEGER NOT NULL DEFAULT 1,
  "affiliateCode" TEXT UNIQUE,
  "referredBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =============================================
-- ACTIVITY LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  "ipAddress" TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_userId ON activity_logs("userId");
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);

-- =============================================
-- GENERATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  prompt TEXT NOT NULL,
  scene TEXT,
  camera TEXT,
  ratio TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  "characterCount" INTEGER NOT NULL DEFAULT 1,
  images JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_userId ON generations("userId");
CREATE INDEX IF NOT EXISTS idx_generations_createdAt ON generations("createdAt");

-- =============================================
-- FEEDBACKS
-- =============================================
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "generationId" TEXT NOT NULL,
  "imageIndex" INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL,
  "faceSimilarity" NUMERIC,
  "outfitSimilarity" NUMERIC,
  "productSimilarity" NUMERIC,
  "sceneMatch" NUMERIC,
  score NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_userId ON feedbacks("userId");

-- =============================================
-- GENERATION PIPELINE STORAGE
-- =============================================
CREATE TABLE IF NOT EXISTS generation_inputs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_analysis (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_plan (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_prompts (
  id TEXT PRIMARY KEY,
  prompts JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- GENERATION CHARACTERS & INTERACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS generation_characters (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_interactions (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- USER PREFERENCES
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  "userId" TEXT PRIMARY KEY,
  prefs JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- AFFILIATE TABLES
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  url TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
