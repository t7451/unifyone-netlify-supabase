import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import { leads } from "../../../drizzle/schema";

type LeadInsert = typeof leads.$inferInsert;
type LeadStatus = (typeof leads.status.enumValues)[number];

export async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

type Db = Awaited<ReturnType<typeof requireDb>>;

export async function insertLead(db: Db, values: LeadInsert) {
  const [inserted] = await db.insert(leads).values(values).returning();
  return inserted;
}

export async function updateLeadTrackingFlags(
  db: Db,
  leadId: number,
  flags: {
    notificationSent: boolean;
    n8nTriggered: boolean;
    zapierTriggered: boolean;
  }
) {
  await db.update(leads).set(flags).where(eq(leads.id, leadId));
}

export async function listLeads(db: Db, status?: LeadStatus) {
  return status
    ? db
        .select()
        .from(leads)
        .where(eq(leads.status, status))
        .orderBy(desc(leads.createdAt))
    : db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function updateStatus(db: Db, id: number, status: LeadStatus) {
  await db.update(leads).set({ status }).where(eq(leads.id, id));
}

export async function getNotes(db: Db, id: number) {
  const [lead] = await db
    .select({ notes: leads.notes })
    .from(leads)
    .where(eq(leads.id, id));
  return lead?.notes ?? "";
}

export async function setNotes(db: Db, id: number, notes: string) {
  await db.update(leads).set({ notes }).where(eq(leads.id, id));
}

export async function listStatuses(db: Db) {
  return db.select({ status: leads.status }).from(leads);
}
