import { getDb } from "../../db";
import { leads } from "../../../drizzle/schema";

/**
 * Data access for the public contact form.
 *
 * Wraps the shared `getDb` helper and the `leads` table so the service layer
 * never talks to Drizzle directly.
 */

export type InsertLeadInput = {
  contactName: string;
  email: string;
  message: string;
};

/**
 * Persist a contact-form submission to the `leads` table (source="contact_form").
 * Returns false when the DB is unavailable so the caller can fall through to the
 * webhook path without failing the request.
 */
export async function insertContactLead(
  input: InsertLeadInput
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.insert(leads).values({
    contactName: input.contactName,
    email: input.email,
    message: input.message,
    source: "contact_form",
  });
  return true;
}
