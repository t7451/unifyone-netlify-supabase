import { getDb } from "../../db";
import { emailSubscribers } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Data access for email subscribers. Wraps the shared Drizzle `getDb()` helper;
 * queries are relocated verbatim from the original router.
 */

export type CaptureSubscriberInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  source: "landing_page" | "blog" | "referral" | "other";
  metadata?: Record<string, unknown>;
};

/**
 * Insert a subscriber, ignoring conflicts on the unique email. Returns the
 * inserted row (or undefined when the email already existed).
 */
export async function insertSubscriber(input: CaptureSubscriberInput) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [insertedSubscriber] = await db
    .insert(emailSubscribers)
    .values({
      email: input.email,
      firstName: input.firstName || undefined,
      lastName: input.lastName || undefined,
      source: input.source,
      metadata: input.metadata || undefined,
      status: "subscribed",
      dripsCompleted: 0,
    })
    .onConflictDoNothing({ target: emailSubscribers.email })
    .returning({ id: emailSubscribers.id });

  return insertedSubscriber;
}

/** Fetch a single subscriber by email, or null if none exists. */
export async function getSubscriberByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const subscriber = await db
    .select()
    .from(emailSubscribers)
    .where(eq(emailSubscribers.email, email))
    .limit(1);

  return subscriber[0] || null;
}

/** Mark a subscriber as unsubscribed by email. */
export async function unsubscribeByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(emailSubscribers)
    .set({ status: "unsubscribed" })
    .where(eq(emailSubscribers.email, email));
}
