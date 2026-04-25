import { spawn } from "node:child_process";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  advanceSequences,
  connectNeon,
  createAnthropic,
  findContacts,
  loadEnv,
  logger,
  qualifyProspects,
  scheduleSequence,
  schema,
} from "@1commerce/spire";

// Sub-commands behind `pnpm spire outreach <verb>`. None of these touch
// the sender loop directly — sender lives in spire-worker. These commands
// shape the queue (qualify → find-contacts → queue → review → approve).

type CampaignType = "broken_link" | "guest_post" | "resource_page";

const VALID_TYPES: CampaignType[] = [
  "broken_link",
  "guest_post",
  "resource_page",
];

function assertCampaignType(s: string): asserts s is CampaignType {
  if (!VALID_TYPES.includes(s as CampaignType)) {
    throw new Error(
      `Invalid campaign type "${s}". Must be one of: ${VALID_TYPES.join(", ")}`
    );
  }
}

async function bySite(slug: string) {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  const site = await db
    .select()
    .from(schema.sites)
    .where(eq(schema.sites.slug, slug))
    .limit(1);
  if (site.length === 0) {
    await raw.end({ timeout: 5 });
    throw new Error(`Site "${slug}" not found. Register it first.`);
  }
  return { env, raw, db, siteId: site[0]!.id };
}

export async function campaignCreate(opts: {
  siteSlug: string;
  type: string;
  name?: string;
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
}): Promise<void> {
  assertCampaignType(opts.type);
  const { raw, db, siteId } = await bySite(opts.siteSlug);
  try {
    const existing = await db
      .select()
      .from(schema.outreachCampaigns)
      .where(
        and(
          eq(schema.outreachCampaigns.siteId, siteId),
          eq(schema.outreachCampaigns.campaignType, opts.type)
        )
      )
      .limit(1);
    if (existing.length > 0) {
      logger.info({ campaign: existing[0] }, "Campaign already exists");
      return;
    }
    const inserted = await db
      .insert(schema.outreachCampaigns)
      .values({
        siteId,
        campaignType: opts.type,
        name:
          opts.name ?? `${opts.siteSlug} ${opts.type.replace(/_/g, " ")} v1`,
        ...(opts.fromName ? { fromName: opts.fromName } : {}),
        ...(opts.fromEmail ? { fromEmail: opts.fromEmail } : {}),
        ...(opts.replyToEmail ? { replyToEmail: opts.replyToEmail } : {}),
      })
      .returning();
    logger.info({ campaign: inserted[0] }, "Campaign created");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function campaignList(opts: { siteSlug?: string }): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const all = await db
      .select({
        id: schema.outreachCampaigns.id,
        type: schema.outreachCampaigns.campaignType,
        name: schema.outreachCampaigns.name,
        active: schema.outreachCampaigns.active,
        autopilot: schema.outreachCampaigns.autopilot,
        cap: schema.outreachCampaigns.dailySendCap,
        siteSlug: schema.sites.slug,
      })
      .from(schema.outreachCampaigns)
      .leftJoin(
        schema.sites,
        eq(schema.outreachCampaigns.siteId, schema.sites.id)
      )
      .where(opts.siteSlug ? eq(schema.sites.slug, opts.siteSlug) : sql`true`);
    for (const c of all) {
      // eslint-disable-next-line no-console
      console.log(
        `${c.id}  ${c.siteSlug}/${c.type}  cap=${c.cap}  active=${c.active}  autopilot=${c.autopilot}  ${c.name}`
      );
    }
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function qualifyCmd(opts: {
  siteSlug: string;
  type: string;
  limit?: number;
}): Promise<void> {
  assertCampaignType(opts.type);
  const { raw, db, siteId } = await bySite(opts.siteSlug);
  try {
    const out = await qualifyProspects({
      db,
      siteId,
      campaignType: opts.type,
      limit: opts.limit ?? 50,
    });
    logger.info(out, "qualify complete");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function findContactsCmd(opts: {
  siteSlug: string;
  limit?: number;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL", "HUNTER_API_KEY"] as const);
  if (!env.HUNTER_API_KEY) {
    throw new Error(
      "HUNTER_API_KEY is required for find-contacts. Set it in your .env."
    );
  }
  const { raw, db, siteId } = await bySite(opts.siteSlug);
  try {
    const out = await findContacts({
      db,
      siteId,
      apiKey: env.HUNTER_API_KEY,
      limit: opts.limit ?? 25,
    });
    logger.info(
      { scanned: out.scanned, found: out.found, unreachable: out.unreachable },
      "find-contacts complete"
    );
    for (const r of out.byDomain) {
      // eslint-disable-next-line no-console
      console.log(
        `${r.domain.padEnd(40)} ${r.email ?? "(none)"} ${r.reason ?? ""}`
      );
    }
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function crawlBrokenCmd(opts: {
  siteSlug: string;
  limit?: number;
}): Promise<void> {
  const { raw, db, siteId } = await bySite(opts.siteSlug);
  try {
    const { crawlSiteSample } = await import("@1commerce/spire");
    const results = await crawlSiteSample({
      db,
      siteId,
      limit: opts.limit ?? 20,
    });
    let total = 0;
    let broken = 0;
    let matched = 0;
    for (const r of results) {
      total += r.scanned;
      broken += r.broken;
      matched += r.matched;
    }
    logger.info(
      { prospects: results.length, scanned: total, broken, matched },
      "crawl-broken-links complete"
    );
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function queueCmd(opts: {
  campaignId: string;
  limit?: number;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL", "ANTHROPIC_API_KEY"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  const anthropic = createAnthropic(env.ANTHROPIC_API_KEY);
  const model = process.env.SPIRE_MODEL ?? "claude-opus-4-7";
  try {
    const camp = await db
      .select()
      .from(schema.outreachCampaigns)
      .where(eq(schema.outreachCampaigns.id, opts.campaignId))
      .limit(1);
    if (camp.length === 0)
      throw new Error(`Campaign ${opts.campaignId} not found`);

    // Pull qualified-or-contact_found prospects without an active sequence
    // for this campaign.
    const candidates = await db.execute(sql`
      select p.id as id
        from spire_outreach_prospects p
       where p.site_id = ${camp[0]!.siteId}
         and p.status in ('qualified', 'contact_found')
         and p.prospect_contact_email is not null
         and not exists (
           select 1 from spire_outreach_sequences s
            where s.campaign_id = ${opts.campaignId} and s.prospect_id = p.id
         )
       order by coalesce(p.reachability_score, 0) desc
       limit ${opts.limit ?? 5}
    `);
    const rows =
      (candidates as unknown as { rows?: Array<{ id: string }> }).rows ?? [];

    let queued = 0;
    let failed = 0;
    for (const r of rows) {
      const out = await scheduleSequence({
        db,
        anthropic,
        model,
        campaignId: opts.campaignId,
        prospectId: r.id,
      });
      if (out.ok) {
        queued += 1;
        logger.info(
          { sequenceId: out.sequenceId, messageId: out.step0MessageId },
          "queued"
        );
      } else {
        failed += 1;
        logger.warn({ prospectId: r.id, reason: out.reason }, "queue skipped");
      }
    }
    logger.info({ scanned: rows.length, queued, failed }, "queue complete");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function reviewCmd(opts: { campaignId: string }): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const pending = await db.execute(sql`
      select m.id as id, m.subject, m.body_text, m.scheduled_for,
             p.domain, p.prospect_contact_email
        from spire_outreach_messages m
        join spire_outreach_sequences s on s.id = m.sequence_id
        join spire_outreach_prospects p on p.id = s.prospect_id
       where s.campaign_id = ${opts.campaignId}
         and m.status = 'pending_approval'
       order by m.scheduled_for asc
    `);
    const rows =
      (
        pending as unknown as {
          rows?: Array<{
            id: string;
            subject: string;
            body_text: string;
            scheduled_for: string;
            domain: string;
            prospect_contact_email: string;
          }>;
        }
      ).rows ?? [];
    if (rows.length === 0) {
      // eslint-disable-next-line no-console
      console.log("(no messages awaiting approval)");
      return;
    }
    for (const r of rows) {
      // eslint-disable-next-line no-console
      console.log("\n────────────────────────────────────────");
      // eslint-disable-next-line no-console
      console.log(`id:        ${r.id}`);
      // eslint-disable-next-line no-console
      console.log(`to:        ${r.prospect_contact_email}  (${r.domain})`);
      // eslint-disable-next-line no-console
      console.log(`scheduled: ${r.scheduled_for}`);
      // eslint-disable-next-line no-console
      console.log(`subject:   ${r.subject}`);
      // eslint-disable-next-line no-console
      console.log("\n" + r.body_text);
    }
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function approveCmd(opts: { messageId: string }): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    await db
      .update(schema.outreachMessages)
      .set({
        status: "scheduled",
        approvedBy: process.env.USER ?? "operator",
        approvedAt: new Date(),
      })
      .where(eq(schema.outreachMessages.id, opts.messageId));
    logger.info({ messageId: opts.messageId }, "approved → scheduled");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function rejectCmd(opts: {
  messageId: string;
  reason: string;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    await db
      .update(schema.outreachMessages)
      .set({ status: "cancelled", error: `rejected: ${opts.reason}` })
      .where(eq(schema.outreachMessages.id, opts.messageId));
    logger.info({ messageId: opts.messageId, reason: opts.reason }, "rejected");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function editCmd(opts: { messageId: string }): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const rows = await db
      .select()
      .from(schema.outreachMessages)
      .where(eq(schema.outreachMessages.id, opts.messageId))
      .limit(1);
    if (rows.length === 0) throw new Error("message not found");
    const original = rows[0]!;
    const tmp = `/tmp/spire-outreach-${opts.messageId}.txt`;
    const { writeFileSync, readFileSync } = await import("node:fs");
    writeFileSync(
      tmp,
      `# Subject: ${original.subject}\n\n${original.bodyText}\n`,
      "utf8"
    );
    await new Promise<void>((resolve, reject) => {
      const editor = process.env.EDITOR ?? "nano";
      const child = spawn(editor, [tmp], { stdio: "inherit" });
      child.on("exit", code =>
        code === 0 ? resolve() : reject(new Error(`editor exit ${code}`))
      );
    });
    const edited = readFileSync(tmp, "utf8");
    const subjectMatch = /^# Subject:\s*(.+)$/m.exec(edited);
    const subject = subjectMatch ? subjectMatch[1]!.trim() : original.subject;
    const body = edited
      .replace(/^# Subject:.*$/m, "")
      .replace(/^\s+/, "")
      .replace(/\s+$/, "");
    await db
      .update(schema.outreachMessages)
      .set({ subject, bodyText: body })
      .where(eq(schema.outreachMessages.id, opts.messageId));
    logger.info({ messageId: opts.messageId }, "message edited");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function autopilotCmd(opts: {
  campaignId: string;
  enable: boolean;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    await db
      .update(schema.outreachCampaigns)
      .set({ autopilot: opts.enable })
      .where(eq(schema.outreachCampaigns.id, opts.campaignId));
    logger.info(
      { campaignId: opts.campaignId, autopilot: opts.enable },
      "autopilot updated"
    );
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function repliesCmd(opts: {
  unactioned?: boolean;
}): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const rows = await db
      .select({
        id: schema.outreachReplies.id,
        from: schema.outreachReplies.fromEmail,
        subject: schema.outreachReplies.subject,
        klass: schema.outreachReplies.classification,
        confidence: schema.outreachReplies.classificationConfidence,
        actedOn: schema.outreachReplies.actedOn,
        receivedAt: schema.outreachReplies.receivedAt,
      })
      .from(schema.outreachReplies)
      .where(
        opts.unactioned ? eq(schema.outreachReplies.actedOn, false) : sql`true`
      )
      .orderBy(desc(schema.outreachReplies.receivedAt))
      .limit(50);
    for (const r of rows) {
      // eslint-disable-next-line no-console
      console.log(
        `${r.id}  ${(r.klass ?? "?").padEnd(12)} conf=${r.confidence ?? "?"} ${r.from}  ${r.subject ?? ""}`
      );
    }
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function replyViewCmd(opts: { replyId: string }): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    const rows = await db
      .select()
      .from(schema.outreachReplies)
      .where(eq(schema.outreachReplies.id, opts.replyId))
      .limit(1);
    if (rows.length === 0) throw new Error("reply not found");
    const r = rows[0]!;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(r, null, 2));
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function suppressCmd(opts: {
  email?: string;
  domain?: string;
  reason?: string;
}): Promise<void> {
  if (!opts.email && !opts.domain) {
    throw new Error("Provide --email or --domain");
  }
  const env = loadEnv(["NEON_DATABASE_URL"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  try {
    if (opts.email) {
      await db
        .insert(schema.outreachSuppression)
        .values({
          email: opts.email.toLowerCase().trim(),
          reason: opts.reason ?? "manual",
        })
        .onConflictDoNothing({ target: schema.outreachSuppression.email });
    }
    if (opts.domain) {
      await db
        .insert(schema.outreachSuppression)
        .values({
          domain: opts.domain.toLowerCase().trim(),
          reason: opts.reason ?? "manual",
        })
        .onConflictDoNothing({ target: schema.outreachSuppression.domain });
    }
    logger.info(opts, "suppressed");
  } finally {
    await raw.end({ timeout: 5 });
  }
}

export async function statusCmd(opts: { siteSlug: string }): Promise<void> {
  const { raw, db, siteId } = await bySite(opts.siteSlug);
  try {
    const camps = await db
      .select()
      .from(schema.outreachCampaigns)
      .where(eq(schema.outreachCampaigns.siteId, siteId));

    const prospectStages = await db.execute(sql`
      select status, count(*)::int as n
        from spire_outreach_prospects
       where site_id = ${siteId}
       group by status
       order by n desc
    `);
    const messageStatus = await db.execute(sql`
      select m.status, count(*)::int as n
        from spire_outreach_messages m
        join spire_outreach_sequences s on s.id = m.sequence_id
        join spire_outreach_campaigns c on c.id = s.campaign_id
       where c.site_id = ${siteId}
       group by m.status
       order by n desc
    `);
    const replyQueueDepth = await db.execute(sql`
      select count(*)::int as n
        from spire_outreach_replies r
        join spire_outreach_sequences s on s.id = r.sequence_id
        join spire_outreach_campaigns c on c.id = s.campaign_id
       where c.site_id = ${siteId} and r.acted_on = false
    `);
    const todayVol = await db.execute(sql`
      select v.campaign_id, c.campaign_type, v.sent_count, c.daily_send_cap
        from spire_outreach_volume_daily v
        join spire_outreach_campaigns c on c.id = v.campaign_id
       where c.site_id = ${siteId} and v.date = (now() at time zone 'utc')::date
    `);

    // eslint-disable-next-line no-console
    console.log(`\n=== Outreach status: ${opts.siteSlug} ===`);
    // eslint-disable-next-line no-console
    console.log(`\nActive campaigns (${camps.length}):`);
    for (const c of camps) {
      // eslint-disable-next-line no-console
      console.log(
        `  ${c.campaignType.padEnd(15)} cap=${c.dailySendCap} autopilot=${c.autopilot} active=${c.active}`
      );
    }
    // eslint-disable-next-line no-console
    console.log(`\nProspects by stage:`);
    const prospectRows =
      (
        prospectStages as unknown as {
          rows?: Array<{ status: string; n: number }>;
        }
      ).rows ?? [];
    for (const r of prospectRows) {
      // eslint-disable-next-line no-console
      console.log(`  ${r.status.padEnd(20)} ${r.n}`);
    }
    // eslint-disable-next-line no-console
    console.log(`\nMessages by status:`);
    const msgRows =
      (
        messageStatus as unknown as {
          rows?: Array<{ status: string; n: number }>;
        }
      ).rows ?? [];
    for (const r of msgRows) {
      // eslint-disable-next-line no-console
      console.log(`  ${r.status.padEnd(20)} ${r.n}`);
    }
    // eslint-disable-next-line no-console
    const replyRows =
      (replyQueueDepth as unknown as { rows?: Array<{ n: number }> }).rows ??
      [];
    console.log(`\nReplies awaiting action: ${replyRows[0]?.n ?? 0}`);
    // eslint-disable-next-line no-console
    console.log(`\nToday's send volume:`);
    const volRows =
      (
        todayVol as unknown as {
          rows?: Array<{
            campaign_type: string;
            sent_count: number;
            daily_send_cap: number;
          }>;
        }
      ).rows ?? [];
    for (const v of volRows) {
      // eslint-disable-next-line no-console
      console.log(
        `  ${v.campaign_type.padEnd(15)} ${v.sent_count} / ${v.daily_send_cap}`
      );
    }
  } finally {
    await raw.end({ timeout: 5 });
  }
}

// Used by the netlify outreach-tick function. Same surface as advanceSequences
// but loads env + connects.
export async function tickCmd(): Promise<void> {
  const env = loadEnv(["NEON_DATABASE_URL", "ANTHROPIC_API_KEY"] as const);
  const { sql: raw, db } = connectNeon(env.NEON_DATABASE_URL);
  const anthropic = createAnthropic(env.ANTHROPIC_API_KEY);
  const model = process.env.SPIRE_MODEL ?? "claude-opus-4-7";
  try {
    const out = await advanceSequences({ db, anthropic, model, limit: 50 });
    logger.info(out, "outreach tick complete");
  } finally {
    await raw.end({ timeout: 5 });
  }
}
