-- Add password reset and email verification token columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationToken" varchar(128) UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken" varchar(128) UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" timestamp;
