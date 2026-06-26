-- =============================================
-- KOC Fashion - Fix column naming consistency
-- NOTE: Columns are now created with correct names in 001_pg_init.sql
-- This file is kept for reference only
-- Run after 002_affiliate_commission.sql
-- =============================================

-- All tables now use camelCase for timestamps:
-- - createdAt (was created_at)
-- - updatedAt (was updated_at)