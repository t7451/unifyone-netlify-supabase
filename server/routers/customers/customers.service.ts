import { TRPCError } from "@trpc/server";
import { logAudit } from "../../auditLogger";
import { customersRepo } from "./customers.repo";

async function requireDbOrThrow() {
  const db = await customersRepo.getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });
  return db;
}

export const customersService = {
  async list(
    tenantId: number,
    input: { search?: string; page?: number; limit?: number } | undefined
  ) {
    const db = await requireDbOrThrow();

    const page = input?.page ?? 1;
    const limit = input?.limit ?? 25;

    const [items, totalResult] = await customersRepo.listPage(
      db,
      tenantId,
      input?.search,
      page,
      limit
    );

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async create(
    tenantId: number,
    userId: number,
    input: {
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      notes?: string;
    }
  ) {
    const db = await requireDbOrThrow();

    // Already-exists path: return the existing row, don't error. Manual
    // create from the UI behaves identically to the upsertCustomer code
    // path that orders.create uses.
    const existing = await customersRepo.findByEmail(db, tenantId, input.email);

    if (existing[0]) {
      // Update with any newly-supplied fields
      const update: Record<string, unknown> = { updatedAt: new Date() };
      if (input.firstName !== undefined) update.firstName = input.firstName;
      if (input.lastName !== undefined) update.lastName = input.lastName;
      if (input.phone !== undefined) update.phone = input.phone;
      if (input.notes !== undefined) update.notes = input.notes;
      await customersRepo.updateById(db, existing[0].id, tenantId, update);
      return { ...existing[0], ...update, alreadyExisted: true as const };
    }

    const inserted = await customersRepo.insert(db, {
      tenantId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      notes: input.notes,
    });

    logAudit({
      userId,
      tenantId,
      action: "customer.create",
      resource: "customer",
      resourceId: String(inserted[0]?.id ?? ""),
      severity: "low",
      metadata: { email: input.email },
    }).catch(() => {});

    return { ...inserted[0], alreadyExisted: false as const };
  },

  async update(
    tenantId: number,
    input: {
      id: number;
      firstName?: string;
      lastName?: string;
      phone?: string;
      notes?: string;
    }
  ) {
    const db = await requireDbOrThrow();

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.notes !== undefined) update.notes = input.notes;

    await customersRepo.updateById(db, input.id, tenantId, update);
    return { success: true };
  },
};
