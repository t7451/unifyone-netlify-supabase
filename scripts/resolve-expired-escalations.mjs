#!/usr/bin/env node

/**
 * Resolve Expired Escalations Script
 * 
 * This script auto-resolves escalations that have exceeded their expiration time.
 * Should be run hourly via cron job.
 * 
 * Usage: DATABASE_URL=<your-db> node scripts/resolve-expired-escalations.mjs
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

async function resolveExpiredEscalations() {
  let connection;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Find expired pending escalations
    console.log('\n⏰ Finding expired escalations...');
    const [expired] = await connection.execute(`
      SELECT id, decision_type, expires_at
      FROM escalation_queue
      WHERE status = 'pending' AND expires_at < NOW()
    `);

    if (expired.length === 0) {
      console.log('✅ No expired escalations found');
      return;
    }

    console.log(`Found ${expired.length} expired escalation(s)`);

    // Auto-resolve each expired escalation
    for (const escalation of expired) {
      await connection.execute(`
        UPDATE escalation_queue
        SET 
          status = 'expired',
          resolution_notes = 'Auto-resolved: Escalation window expired',
          resolved_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
      `, [escalation.id]);

      console.log(`  ✓ Escalation #${escalation.id} (${escalation.decision_type}) auto-resolved`);
    }

    console.log(`\n✅ Successfully resolved ${expired.length} expired escalation(s)`);

    // Log the action in audit_logs
    await connection.execute(`
      INSERT INTO audit_logs 
      (user_id, action, entity_type, decision_authority, escalation_triggered, created_at, updated_at)
      VALUES (0, ?, ?, ?, 0, NOW(), NOW())
    `, [
      `Auto-resolved ${expired.length} expired escalation(s)`,
      'escalation_queue',
      'system',
    ]);

    console.log('📋 Audit log entry created');
  } catch (error) {
    console.error('❌ Error resolving expired escalations:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resolveExpiredEscalations();
