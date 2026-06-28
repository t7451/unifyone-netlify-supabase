import { trpc } from "@/lib/trpc";

/**
 * Data-access hooks for the Customers page.
 *
 * Thin, typed wrappers around the exact `trpc.*` query/mutation calls the page
 * made inline. Same procedures, inputs, query keys, and options — no behavior
 * change. Side-effect callbacks (toasts, dialog state) stay in the page and are
 * forwarded through, so closures over component state are preserved.
 */

export interface CustomerListQueryInput {
  search?: string;
  page: number;
  limit: number;
}

export function useCustomerListQuery(input: CustomerListQueryInput) {
  return trpc.customers.list.useQuery(input, { staleTime: 30_000 });
}

export function useCustomerOrdersQuery(input: {
  email: string;
  enabled: boolean;
}) {
  return trpc.orders.customerOrders.useQuery(
    { email: input.email },
    { enabled: input.enabled }
  );
}

export function useUpdateCustomerMutation(options: {
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.orders.updateCustomer.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      options.onSuccess();
    },
    onError: e => options.onError(e),
  });
}

/** Invalidate the customer list — used by the realtime subscription. */
export function useInvalidateCustomerList() {
  const utils = trpc.useUtils();
  return () => utils.customers.list.invalidate();
}
