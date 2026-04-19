# UnifyOne Governance System — Deployment Instructions

This document outlines the steps to deploy the governance system (Phases 40-44) to the production environment.

## Prerequisites

- Production database access (PostgreSQL / Neon)
- Environment variables configured:
  - `DATABASE_URL` — PostgreSQL (Neon) connection string
  - `BUILT_IN_FORGE_API_KEY` — AI API key for governance decisions (replaces OPENAI_API_KEY)
  - `BUILT_IN_FORGE_API_URL` — AI API endpoint (optional, defaults to Forge)
  - `RESEND_API_KEY` — Email service for notifications
  - `META_PIXEL_ID` — Meta pixel for tracking
  - `META_CAPI_ACCESS_TOKEN` — Meta CAPI token

## Deployment Steps

### Step 1: Database Migration

The governance tables are already defined in `drizzle/schema.ts`. Run the Drizzle push command to sync them to your database:

```bash
# In production environment
DATABASE_URL=<your-production-db-url> pnpm drizzle-kit push:pg
```

This will create the following tables if they don't exist:

- `audit_logs` — Operation audit trail
- `escalation_queue` — Pending decisions requiring human approval
- `decision_authority` — User permission matrix
- `kill_switches` — Emergency operational controls
- `governance_rules` — Governance rule definitions
- `approval_workflows` — Multi-level approval tracking
- `governance_metrics` — Computed metrics snapshots

**Note:** The legacy `drizzle/governance-schema.sql` file contains MySQL syntax and should NOT be run directly. The governance tables are already in the TypeScript schema and will be created via `drizzle-kit push`.

**Expected output:**

```
✅ 7 tables created successfully
✅ All indexes created
✅ Foreign key constraints applied
```

### Step 2: Seed Governance Rules

Run the governance rules seeding script to populate initial rules and authority matrix:

```bash
# In production environment
DATABASE_URL=<your-production-db-url> node scripts/seed-governance-rules.mjs
```

This will seed:

- **11 governance rules** covering all action types (payments, refunds, data, pricing, inventory, subscriptions, AI content)
- **3 decision authority records** (cathedral, architect, operator)
- **5 kill switches** for emergency operational control
- **1 governance metrics record** for dashboard

**Expected output:**

```
✅ Seeded 11 governance rules
✅ Seeded 3 authority records
✅ Seeded 5 kill switches
✅ Governance metrics initialized
```

### Step 3: Verify Governance Dashboard

1. Log in to the UnifyOne admin panel
2. Navigate to **Governance Dashboard** (new menu item)
3. Verify all tabs load with live data:
   - **Audit Log** — Should show recent operations
   - **Escalations** — Should be empty (no pending escalations yet)
   - **Decision Authority** — Should show 3 authority records
   - **Governance Rules** — Should show 11 rules
4. Verify metrics display:
   - Pending Escalations: 0
   - Active Kill Switches: 0
   - Compliance Score: 100%
   - Audit Log Entries: (count of operations)

### Step 4: Test Escalation Workflow

1. **Trigger an escalation:**
   - Use the Claude Governance API to evaluate an autonomous action
   - Example: Payment of $15,000 (exceeds $10k threshold)

   ```bash
   curl -X POST https://your-domain/api/trpc/claudeGovernance.evaluateAutonomousAction \
     -H "Content-Type: application/json" \
     -d '{
       "actionType": "payment_processing",
       "description": "Process customer refund",
       "estimatedValue": 15000,
       "urgency": "medium"
     }'
   ```

2. **Verify escalation created:**
   - Check Governance Dashboard → Escalations tab
   - Should show 1 pending escalation with Claude's reasoning

3. **Approve/reject escalation:**
   - Click "Approve" or "Reject" button
   - Verify decision recorded in Audit Log

4. **Check audit trail:**
   - Governance Dashboard → Audit Log tab
   - Should show the decision with timestamp and authority level

### Step 5: Test Kill Switch

1. **Activate kill switch:**
   - Governance Dashboard → Emergency Controls section
   - Click "Activate Kill Switch" on any switch (e.g., "payment_processing_halt")

2. **Verify activation:**
   - Kill switch should show "ACTIVE — Systems Halted"
   - Audit log should record the activation

3. **Test operational impact:**
   - Attempt to process a payment
   - Should be blocked with message: "Payment processing is currently halted"

4. **Deactivate kill switch:**
   - Click "Deactivate" button
   - Verify operations resume

### Step 6: Configure Email Notifications (Optional)

Add email notifications for escalations:

```typescript
// In server/routers/governance.ts, add to resolveEscalation mutation:
if (escalation.status === "pending") {
  await sendEmail({
    to: adminEmail,
    subject: `Escalation Resolved: ${escalation.decisionType}`,
    template: "escalation_resolved",
    data: { escalation, decision },
  });
}
```

### Step 7: Deploy to Netlify

1. **Push code to GitHub:**

   ```bash
   git push origin main
   ```

2. **Netlify auto-deployment:**
   - Netlify will automatically build and deploy on push
   - Monitor deployment status in Netlify dashboard

3. **Verify production deployment:**
   - Visit https://your-production-domain
   - Log in as admin
   - Navigate to Governance Dashboard
   - Verify all features working

## Rollback Procedure

If issues occur, rollback is straightforward:

```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main

# Drop governance tables (if needed)
# WARNING: This will delete all governance data
DATABASE_URL=<your-db> pnpm drizzle-kit drop
```

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Escalation Queue Health:**
   - Pending escalations should be resolved within 12 hours
   - Monitor average resolution time in metrics

2. **Compliance Score:**
   - Should remain above 95% for normal operations
   - Drops below 90% indicate rule violations

3. **Kill Switch Status:**
   - Should always be "All Systems Operational"
   - Any active kill switch indicates emergency state

### Scheduled Tasks

Add these to your cron/scheduler:

```bash
# Auto-resolve expired escalations (every hour)
0 * * * * DATABASE_URL=<your-db> node scripts/resolve-expired-escalations.mjs

# Compute governance metrics (every 6 hours)
0 */6 * * * DATABASE_URL=<your-db> node scripts/compute-governance-metrics.mjs
```

### Database Maintenance

```bash
# Backup governance tables (daily)
pg_dump -t audit_logs -t escalation_queue -t decision_authority $DATABASE_URL > backup.sql

# Archive old audit logs (monthly)
DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

## Troubleshooting

### Issue: "Governance Dashboard shows no data"

**Solution:**

1. Verify DATABASE_URL is set correctly
2. Check that database migration completed successfully
3. Verify seeding script ran without errors
4. Check browser console for API errors

### Issue: "Escalations not being created"

**Solution:**

1. Verify BUILT_IN_FORGE_API_KEY is set
2. Check server logs for AI API errors
3. Verify governance rules are seeded
4. Test Claude integration directly:
   ```bash
   curl -X POST https://your-domain/api/trpc/claudeGovernance.evaluateAutonomousAction
   ```

### Issue: "Kill switches not working"

**Solution:**

1. Verify kill switch toggle mutation completes
2. Check audit logs for toggle events
3. Verify operational code checks kill switch status before executing

## Support

For issues or questions:

1. Check the `.manus/PHASES_40-44_COMPLETION.md` document
2. Review server logs for detailed error messages
3. Contact the development team with error details

---

**Last Updated:** March 10, 2026  
**Version:** 1.0  
**Status:** Ready for Production Deployment
