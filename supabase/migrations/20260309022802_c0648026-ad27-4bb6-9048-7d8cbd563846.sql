
-- Add unique constraint on mfa_requirements.user_id to prevent duplicate rows
-- First clean any remaining duplicates (keep latest per user)
DELETE FROM mfa_requirements a
USING mfa_requirements b
WHERE a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Now add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS mfa_requirements_user_id_unique ON mfa_requirements (user_id);
