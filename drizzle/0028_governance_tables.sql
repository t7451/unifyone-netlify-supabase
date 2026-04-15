-- Governance tables migration (PostgreSQL)
--
-- Converts governance-schema.sql (which used MySQL AUTO_INCREMENT / inline ENUM
-- syntax) to idiomatic PostgreSQL using SERIAL, DO $$ … $$ guards for enums,
-- and IF NOT EXISTS guards for tables and indexes.  Safe to run on both fresh
-- databases and databases where any of these tables already exist.

-- ── Enums ──────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escalation_status') THEN
    CREATE TYPE escalation_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'authority_level_enum') THEN
    CREATE TYPE authority_level_enum AS ENUM ('viewer', 'operator', 'architect', 'cathedral');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
    CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- ── audit_logs ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"                   SERIAL PRIMARY KEY,
  "userId"               INTEGER,
  "action"               VARCHAR(255) NOT NULL,
  "entity_type"          VARCHAR(100),
  "entity_id"            INTEGER,
  "old_value"            JSONB,
  "new_value"            JSONB,
  "decision_authority"   VARCHAR(100),
  "escalation_triggered" BOOLEAN NOT NULL DEFAULT FALSE,
  "escalation_reason"    TEXT,
  "ip_address"           VARCHAR(45),
  "user_agent"           TEXT,
  "created_at"           TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id"       ON "audit_logs" ("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at"    ON "audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_escalation"    ON "audit_logs" ("escalation_triggered");

-- ── escalation_queue ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "escalation_queue" (
  "id"                  SERIAL PRIMARY KEY,
  "audit_log_id"        INTEGER NOT NULL REFERENCES "audit_logs" ("id"),
  "decision_type"       VARCHAR(100) NOT NULL,
  "decision_context"    JSONB NOT NULL,
  "threshold_exceeded"  DECIMAL(10, 2),
  "threshold_limit"     DECIMAL(10, 2),
  "authority_level"     VARCHAR(50),
  "required_approvals"  INTEGER DEFAULT 1,
  "approvals_received"  INTEGER DEFAULT 0,
  "status"              escalation_status NOT NULL DEFAULT 'pending',
  "created_at"          TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at"          TIMESTAMP,
  "resolved_at"         TIMESTAMP,
  "resolved_by"         INTEGER,
  "resolution_notes"    TEXT,
  "updated_at"          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_escalation_queue_status"          ON "escalation_queue" ("status");
CREATE INDEX IF NOT EXISTS "idx_escalation_queue_created_at"      ON "escalation_queue" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_escalation_queue_authority_level" ON "escalation_queue" ("authority_level");

-- ── decision_authority ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "decision_authority" (
  "id"                     SERIAL PRIMARY KEY,
  "user_id"                INTEGER NOT NULL,
  "authority_level"        authority_level_enum NOT NULL DEFAULT 'operator',
  "approval_threshold"     DECIMAL(10, 2),
  "can_override_decisions" BOOLEAN NOT NULL DEFAULT FALSE,
  "can_modify_governance"  BOOLEAN NOT NULL DEFAULT FALSE,
  "can_access_audit_logs"  BOOLEAN NOT NULL DEFAULT TRUE,
  "active"                 BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"             TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"             TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("user_id")
);

CREATE INDEX IF NOT EXISTS "idx_decision_authority_level" ON "decision_authority" ("authority_level");

-- ── kill_switches ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "kill_switches" (
  "id"                 SERIAL PRIMARY KEY,
  "switch_name"        VARCHAR(100) NOT NULL UNIQUE,
  "description"        TEXT,
  "is_active"          BOOLEAN NOT NULL DEFAULT FALSE,
  "triggered_by"       INTEGER,
  "triggered_at"       TIMESTAMP,
  "reason"             TEXT,
  "auto_reset_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "auto_reset_at"      TIMESTAMP,
  "impact_scope"       VARCHAR(255),
  "created_at"         TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_kill_switches_is_active"    ON "kill_switches" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_kill_switches_triggered_at" ON "kill_switches" ("triggered_at");

-- ── governance_rules ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "governance_rules" (
  "id"                       SERIAL PRIMARY KEY,
  "rule_name"                VARCHAR(100) NOT NULL,
  "rule_type"                VARCHAR(50) NOT NULL,
  "entity_type"              VARCHAR(100),
  "condition_json"           JSONB NOT NULL,
  "action_on_violation"      VARCHAR(20) NOT NULL DEFAULT 'escalate',
  "authority_level_required" VARCHAR(50),
  "is_active"                BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"               TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"               TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_governance_rules_rule_type" ON "governance_rules" ("rule_type");
CREATE INDEX IF NOT EXISTS "idx_governance_rules_is_active" ON "governance_rules" ("is_active");

-- ── governance_metrics ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "governance_metrics" (
  "id"                                SERIAL PRIMARY KEY,
  "metric_date"                       DATE NOT NULL UNIQUE,
  "total_operations"                  INTEGER NOT NULL DEFAULT 0,
  "escalations_triggered"             INTEGER NOT NULL DEFAULT 0,
  "escalations_approved"              INTEGER NOT NULL DEFAULT 0,
  "escalations_rejected"              INTEGER NOT NULL DEFAULT 0,
  "kill_switches_activated"           INTEGER NOT NULL DEFAULT 0,
  "average_escalation_time_minutes"   INTEGER,
  "compliance_score"                  DECIMAL(5, 2),
  "created_at"                        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_governance_metrics_metric_date" ON "governance_metrics" ("metric_date");
