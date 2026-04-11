-- Migration: Add custom auth columns to users table
-- Created: 2026-04-11
-- Purpose: Support roll-your-own JWT auth with password hashing

-- Add passwordHash column for storing scrypt hashes
ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash VARCHAR(255);

-- Add emailVerified flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerified BOOLEAN DEFAULT FALSE;

-- Make email unique (for custom auth signup/signin)
-- Note: This may fail if there are duplicate emails - clean up first if needed
-- ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Create index for faster email lookups during signin
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
