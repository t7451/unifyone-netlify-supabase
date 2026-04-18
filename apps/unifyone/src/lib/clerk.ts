/**
 * Clerk helpers. @clerk/astro exposes `Astro.locals.auth()` in routes; this
 * module centralises the import surface so switching to the React-island
 * fallback later only touches one file.
 */
export type ClerkUserEvent = {
  id: string;
  email_addresses: Array<{ id: string; email_address: string }>;
  primary_email_address_id?: string | null;
  organization_memberships?: Array<{ organization: { id: string } }>;
};

export function primaryEmail(event: ClerkUserEvent): string | null {
  const primary = event.email_addresses.find(
    (e) => e.id === event.primary_email_address_id
  );
  return primary?.email_address ?? event.email_addresses[0]?.email_address ?? null;
}

export function primaryOrgId(event: ClerkUserEvent): string | null {
  return event.organization_memberships?.[0]?.organization.id ?? null;
}
