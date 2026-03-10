#!/usr/bin/env node

/**
 * Seed Governance Rules Script
 * 
 * This script seeds the initial governance rules into the database.
 * Run after database migration: DATABASE_URL=<your-db> node scripts/seed-governance-rules.mjs
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

const GOVERNANCE_RULES = [
  // Payment Processing Rules
  {
    ruleName: 'Payment Over $10,000 Threshold',
    ruleType: 'approval_threshold',
    entityType: 'payment_processing',
    conditionJson: JSON.stringify({ threshold: 10000, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'architect',
    isActive: true,
  },
  {
    ruleName: 'Payment Over $50,000 Critical Threshold',
    ruleType: 'approval_threshold',
    entityType: 'payment_processing',
    conditionJson: JSON.stringify({ threshold: 50000, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'cathedral',
    isActive: true,
  },

  // Refund Processing Rules
  {
    ruleName: 'Refund Over $5,000 Threshold',
    ruleType: 'approval_threshold',
    entityType: 'refund_issuance',
    conditionJson: JSON.stringify({ threshold: 5000, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'architect',
    isActive: true,
  },
  {
    ruleName: 'Bulk Refund Over $20,000 Threshold',
    ruleType: 'approval_threshold',
    entityType: 'refund_issuance',
    conditionJson: JSON.stringify({ threshold: 20000, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'cathedral',
    isActive: true,
  },

  // Data Deletion Rules
  {
    ruleName: 'Bulk Data Deletion Over 1,000 Records',
    ruleType: 'data_access',
    entityType: 'data_deletion',
    conditionJson: JSON.stringify({ recordCount: 1000, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'architect',
    isActive: true,
  },
  {
    ruleName: 'Sensitive Data Deletion Over 100 Records',
    ruleType: 'data_access',
    entityType: 'data_deletion',
    conditionJson: JSON.stringify({ recordCount: 100, sensitive: true, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'cathedral',
    isActive: true,
  },

  // Pricing Adjustment Rules
  {
    ruleName: 'Major Pricing Adjustment Over 25%',
    ruleType: 'operational_constraint',
    entityType: 'pricing_adjustment',
    conditionJson: JSON.stringify({ percentageChange: 25, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'architect',
    isActive: true,
  },
  {
    ruleName: 'Critical Pricing Adjustment Over 50%',
    ruleType: 'operational_constraint',
    entityType: 'pricing_adjustment',
    conditionJson: JSON.stringify({ percentageChange: 50, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'cathedral',
    isActive: true,
  },

  // Inventory Adjustment Rules
  {
    ruleName: 'Large Inventory Adjustment Over 10,000 Units',
    ruleType: 'operational_constraint',
    entityType: 'inventory_adjustment',
    conditionJson: JSON.stringify({ unitCount: 10000, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'architect',
    isActive: true,
  },

  // Subscription Change Rules
  {
    ruleName: 'Mass Subscription Downgrade Over 100 Customers',
    ruleType: 'rate_limit',
    entityType: 'subscription_change',
    conditionJson: JSON.stringify({ customerCount: 100, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'architect',
    isActive: true,
  },

  // AI Content Generation Rules
  {
    ruleName: 'AI-Generated Content Batch Over 1,000 Items',
    ruleType: 'operational_constraint',
    entityType: 'ai_generated_content',
    conditionJson: JSON.stringify({ itemCount: 1000, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'architect',
    isActive: true,
  },

  // Customer Acquisition Rules
  {
    ruleName: 'High Customer Acquisition Spend Over $100,000',
    ruleType: 'approval_threshold',
    entityType: 'customer_acquisition',
    conditionJson: JSON.stringify({ threshold: 100000, operator: 'greater_than' }),
    actionOnViolation: 'escalate',
    authorityLevelRequired: 'architect',
    isActive: true,
  },
];

const DECISION_AUTHORITY_DEFAULTS = [
  {
    userId: 1, // Admin user
    authorityLevel: 'cathedral',
    approvalThreshold: null, // Unlimited
    canAccessAuditLogs: true,
    canOverrideDecisions: true,
    canModifyGovernance: true,
    active: true,
  },
  {
    userId: 2, // Architect user
    authorityLevel: 'architect',
    approvalThreshold: 50000,
    canAccessAuditLogs: true,
    canOverrideDecisions: false,
    canModifyGovernance: false,
    active: true,
  },
  {
    userId: 3, // Operator user
    authorityLevel: 'operator',
    approvalThreshold: 10000,
    canAccessAuditLogs: true,
    canOverrideDecisions: false,
    canModifyGovernance: false,
    active: true,
  },
];

const KILL_SWITCHES = [
  {
    switchName: 'payment_processing_halt',
    description: 'Emergency halt for all payment processing operations',
    impactScope: 'All payment transactions will be blocked',
    isActive: false,
  },
  {
    switchName: 'refund_processing_halt',
    description: 'Emergency halt for all refund processing',
    impactScope: 'All refund operations will be blocked',
    isActive: false,
  },
  {
    switchName: 'data_operations_halt',
    description: 'Emergency halt for all data operations (deletion, modification)',
    impactScope: 'All data operations will be blocked',
    isActive: false,
  },
  {
    switchName: 'ai_operations_halt',
    description: 'Emergency halt for all AI-generated content operations',
    impactScope: 'All AI content generation will be blocked',
    isActive: false,
  },
  {
    switchName: 'autonomous_operations_halt',
    description: 'Master kill switch for all autonomous operations',
    impactScope: 'All autonomous operations will be blocked',
    isActive: false,
  },
];

async function seedDatabase() {
  let connection;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Seed Governance Rules
    console.log('\n📋 Seeding governance rules...');
    for (const rule of GOVERNANCE_RULES) {
      const query = `
        INSERT INTO governance_rules 
        (rule_name, rule_type, entity_type, condition_json, action_on_violation, authority_level_required, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `;
      await connection.execute(query, [
        rule.ruleName,
        rule.ruleType,
        rule.entityType,
        rule.conditionJson,
        rule.actionOnViolation,
        rule.authorityLevelRequired,
        rule.isActive ? 1 : 0,
      ]);
      console.log(`  ✓ ${rule.ruleName}`);
    }
    console.log(`✅ Seeded ${GOVERNANCE_RULES.length} governance rules`);

    // Seed Decision Authority
    console.log('\n👥 Seeding decision authority matrix...');
    for (const auth of DECISION_AUTHORITY_DEFAULTS) {
      const query = `
        INSERT INTO decision_authority 
        (user_id, authority_level, approval_threshold, can_access_audit_logs, can_override_decisions, can_modify_governance, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `;
      await connection.execute(query, [
        auth.userId,
        auth.authorityLevel,
        auth.approvalThreshold,
        auth.canAccessAuditLogs ? 1 : 0,
        auth.canOverrideDecisions ? 1 : 0,
        auth.canModifyGovernance ? 1 : 0,
        auth.active ? 1 : 0,
      ]);
      console.log(`  ✓ User ${auth.userId} - ${auth.authorityLevel}`);
    }
    console.log(`✅ Seeded ${DECISION_AUTHORITY_DEFAULTS.length} authority records`);

    // Seed Kill Switches
    console.log('\n🔌 Seeding kill switches...');
    for (const ks of KILL_SWITCHES) {
      const query = `
        INSERT INTO kill_switches 
        (switch_name, description, impact_scope, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `;
      await connection.execute(query, [
        ks.switchName,
        ks.description,
        ks.impactScope,
        ks.isActive ? 1 : 0,
      ]);
      console.log(`  ✓ ${ks.switchName}`);
    }
    console.log(`✅ Seeded ${KILL_SWITCHES.length} kill switches`);

    // Initialize Governance Metrics
    console.log('\n📊 Initializing governance metrics...');
    const metricsQuery = `
      INSERT INTO governance_metrics 
      (compliance_score, total_escalations, pending_escalations, average_resolution_time_minutes, last_computed_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE last_computed_at = NOW()
    `;
    await connection.execute(metricsQuery, [100, 0, 0, 0]);
    console.log('  ✓ Governance metrics initialized');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Governance Rules: ${GOVERNANCE_RULES.length}`);
    console.log(`  - Decision Authority Records: ${DECISION_AUTHORITY_DEFAULTS.length}`);
    console.log(`  - Kill Switches: ${KILL_SWITCHES.length}`);
    console.log(`  - Governance Metrics: 1`);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();
