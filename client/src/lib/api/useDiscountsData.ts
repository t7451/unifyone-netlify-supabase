import { trpc } from "@/lib/trpc";

/**
 * Data-access hooks for the Discounts page. Thin, typed wrappers around the
 * exact `trpc.discounts.*` calls the page made inline — same procedures,
 * inputs, query keys, and invalidations. Side-effect callbacks (toasts, dialog
 * reset) stay in the page and are forwarded through.
 */

export function useDiscountListQuery() {
  return trpc.discounts.list.useQuery();
}

export function useCreateDiscountMutation(options: {
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.discounts.create.useMutation({
    onSuccess: () => {
      utils.discounts.list.invalidate();
      options.onSuccess();
    },
    onError: error => options.onError(error),
  });
}

export function useToggleDiscountMutation(options: {
  onSuccess: (variables: { isActive: boolean }) => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.discounts.toggleActive.useMutation({
    onSuccess: (_data, variables) => {
      utils.discounts.list.invalidate();
      options.onSuccess(variables);
    },
    onError: error => options.onError(error),
  });
}

export function useDeleteDiscountMutation(options: {
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
}) {
  const utils = trpc.useUtils();
  return trpc.discounts.delete.useMutation({
    onSuccess: () => {
      utils.discounts.list.invalidate();
      options.onSuccess();
    },
    onError: error => options.onError(error),
  });
}
