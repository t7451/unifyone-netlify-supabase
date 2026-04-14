-- Create user_preferences table for persisted notification and display settings.
-- Each user gets one row, created on first access via the user.getPreferences endpoint.

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL UNIQUE,
  "emailNotifications" boolean NOT NULL DEFAULT true,
  "pushNotifications" boolean NOT NULL DEFAULT true,
  "orderUpdates" boolean NOT NULL DEFAULT true,
  "teamAlerts" boolean NOT NULL DEFAULT true,
  "marketingEmails" boolean NOT NULL DEFAULT false,
  "weeklyDigest" boolean NOT NULL DEFAULT true,
  "analyticsSharing" boolean NOT NULL DEFAULT true,
  "theme" varchar(20) NOT NULL DEFAULT 'dark',
  "language" varchar(10) NOT NULL DEFAULT 'en',
  "timezone" varchar(64) NOT NULL DEFAULT 'UTC',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
