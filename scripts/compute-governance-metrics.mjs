#!/usr/bin/env node

/**
 * Compute Governance Metrics Script
 * 
 * This script computes live governance metrics from the database.
 * Should be run periodically (every 6 hours) via cron job.
 * 
 * Usage: DATABASE_URL=<your-db> node scripts/compute-governance-metrics.mjs
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(DATABASE_URL);
const dbConfig = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  port: url.port || 3306,
};

async function computeGovernanceMetrics() {
  let connection;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    console.log('\n📊 Computing governance metrics...');

    // Count total escalations
    const [[{ totalEscalations }]] = await connection.execute(`
      SELECT COUNT(*) as totalEscalations FROM escalation_queue
    `);

    // Count pending escalations
    const [[{ pendingEscalations }]] = await connection.execute(`
      SELECT COUNT(*) as pendingEscalations FROM escalation_queue WHERE status = 'pending'
    `);

    // Compute average resolution time (in minutes)
    const [[{ avgResolutionTime }]] = await connection.execute(`
      SELECT 
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at))) as avgResolutionTime
      FROM escalation_queue
      WHERE status IN ('approved', 'rejected', 'expired') AND resolved_at IS NOT NULL
    `);

    // Compute compliance score (0-100)
    // Formula: (approved + expired) / total * 100
    // If no escalations, score is 100
    let complianceScore = 100;
    if (totalEscalations > 0) {
      const [[{ resolvedCount }]] = await connection.execute(`
        SELECT COUNT(*) as resolvedCount 
        FROM escalation_queue 
        WHERE status IN ('approved', 'rejected', 'expired')
      `);
      complianceScore = Math.round((resolvedCount / totalEscalations) * 100);
    }

    // Count active kill switches
    const [[{ activeKillSwitches }]] = await connection.execute(`
      SELECT COUNT(*) as activeKillSwitches FROM kill_switches WHERE is_active = 1
    `);

    // Count audit log entries (last 30 days)
    const [[{ recentAuditLogs }]] = await connection.execute(`
      SELECT COUNT(*) as recentAuditLogs 
      FROM audit_logs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Count rule violations (escalations triggered by rules)
    const [[{ ruleViolations }]] = await connection.execute(`
      SELECT COUNT(*) as ruleViolations 
      FROM escalation_queue 
      WHERE escalation_triggered = 1
    `);

    console.log(`  Total Escalations: ${totalEscalations}`);
    console.log(`  Pending Escalations: ${pendingEscalations}`);
    console.log(`  Avg Resolution Time: ${avgResolutionTime || 0} minutes`);
    console.log(`  Compliance Score: ${complianceScore}%`);
    console.log(`  Active Kill Switches: ${activeKillSwitches}`);
    console.log(`  Recent Audit Logs (30d): ${recentAuditLogs}`);
    console.log(`  Rule Violations: ${ruleViolations}`);

    // Update governance_metrics table
    console.log('\n💾 Updating governance metrics in database...');
    await connection.execute(`
      UPDATE governance_metrics
      SET 
        compliance_score = ?,
        total_escalations = ?,
        pending_escalations = ?,
        average_resolution_time_minutes = ?,
        last_computed_at = NOW(),
        updated_at = NOW()
      LIMIT 1
    `, [
      complianceScore,
      totalEscalations,
      pendingEscalations,
      avgResolutionTime || 0,
    ]);

    console.log('✅ Governance metrics updated successfully');

    // Log the computation in audit_logs
    await connection.execute(`
      INSERT INTO audit_logs 
      (user_id, action, entity_type, decision_authority, escalation_triggered, created_at, updated_at)
      VALUES (0, ?, ?, ?, 0, NOW(), NOW())
    `, [
      `Computed governance metrics: compliance=${complianceScore}%, pending=${pendingEscalations}`,
      'governance_metrics',
      'system',
    ]);

    console.log('📋 Audit log entry created');

    // Alert if compliance score is low
    if (complianceScore < 90) {
      console.warn(`\n⚠️  WARNING: Compliance score is low (${complianceScore}%)`);
      console.warn('   Consider reviewing pending escalations');
    }

    // Alert if there are active kill switches
    if (activeKillSwitches > 0) {
      console.warn(`\n⚠️  WARNING: ${activeKillSwitches} kill switch(es) are active`);
      console.warn('   Emergency operational controls are engaged');
    }

    console.log('\n✅ Governance metrics computation completed successfully');
  } catch (error) {
    console.error('❌ Error computing governance metrics:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

computeGovernanceMetrics();
