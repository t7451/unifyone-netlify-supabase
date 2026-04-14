#!/usr/bin/env node

/**
 * Compute Governance Metrics Script
 *
 * This script computes live governance metrics from the database.
 * Should be run periodically (every 6 hours) via cron job.
 *
 * Usage: DATABASE_URL=<your-db> node scripts/compute-governance-metrics.mjs
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function computeGovernanceMetrics() {
  try {
    console.log('🔌 Connecting to database...');
    await sql`SELECT 1`;
    console.log('✅ Connected to database');

    console.log('\n📊 Computing governance metrics...');

    // Count total escalations
    const [{ totalescalations }] = await sql`
      SELECT COUNT(*) as totalescalations FROM escalation_queue
    `;

    // Count pending escalations
    const [{ pendingescalations }] = await sql`
      SELECT COUNT(*) as pendingescalations FROM escalation_queue WHERE status = 'pending'
    `;

    // Compute average resolution time (in minutes)
    const [{ avgresolutiontime }] = await sql`
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)) as avgresolutiontime
      FROM escalation_queue
      WHERE status IN ('approved', 'rejected', 'expired') AND resolved_at IS NOT NULL
    `;

    // Compute compliance score (0-100)
    let complianceScore = 100;
    if (Number(totalescalations) > 0) {
      const [{ resolvedcount }] = await sql`
        SELECT COUNT(*) as resolvedcount
        FROM escalation_queue
        WHERE status IN ('approved', 'rejected', 'expired')
      `;
      complianceScore = Math.round((Number(resolvedcount) / Number(totalescalations)) * 100);
    }

    // Count active kill switches
    const [{ activekillswitches }] = await sql`
      SELECT COUNT(*) as activekillswitches FROM kill_switches WHERE is_active = true
    `;

    // Count audit log entries (last 30 days)
    const [{ recentauditlogs }] = await sql`
      SELECT COUNT(*) as recentauditlogs
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `;

    console.log(`  Total Escalations: ${totalescalations}`);
    console.log(`  Pending Escalations: ${pendingescalations}`);
    console.log(`  Avg Resolution Time: ${avgresolutiontime || 0} minutes`);
    console.log(`  Compliance Score: ${complianceScore}%`);
    console.log(`  Active Kill Switches: ${activekillswitches}`);
    console.log(`  Recent Audit Logs (30d): ${recentauditlogs}`);

    // Insert new governance metrics record
    console.log('\n💾 Inserting governance metrics...');
    await sql`
      INSERT INTO governance_metrics
      (metric_date, total_operations, escalations_triggered, escalations_approved, escalations_rejected,
       kill_switches_activated, average_escalation_time_minutes, compliance_score, created_at)
      VALUES (
        CURRENT_DATE,
        ${Number(recentauditlogs)},
        ${Number(totalescalations)},
        ${complianceScore},
        ${Number(totalescalations) - complianceScore},
        ${Number(activekillswitches)},
        ${Number(avgresolutiontime) || 0},
        ${complianceScore},
        NOW()
      )
    `;

    console.log('✅ Governance metrics recorded successfully');

    // Log the computation in audit_logs
    await sql`
      INSERT INTO audit_logs
      (user_id, action, entity_type, decision_authority, escalation_triggered, created_at, updated_at)
      VALUES (${0}, ${`Computed governance metrics: compliance=${complianceScore}%, pending=${pendingescalations}`}, ${'governance_metrics'}, ${'system'}, ${false}, NOW(), NOW())
    `;

    console.log('📋 Audit log entry created');

    // Alert if compliance score is low
    if (complianceScore < 90) {
      console.warn(`\n⚠️  WARNING: Compliance score is low (${complianceScore}%)`);
      console.warn('   Consider reviewing pending escalations');
    }

    // Alert if there are active kill switches
    if (Number(activekillswitches) > 0) {
      console.warn(`\n⚠️  WARNING: ${activekillswitches} kill switch(es) are active`);
      console.warn('   Emergency operational controls are engaged');
    }

    console.log('\n✅ Governance metrics computation completed successfully');
  } catch (error) {
    console.error('❌ Error computing governance metrics:', error.message);
    process.exit(1);
  }
}

computeGovernanceMetrics();
