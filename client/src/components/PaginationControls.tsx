import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationControlsProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
}

export function PaginationControls({
  page,
  limit,
  total,
  totalPages,
  itemLabel,
  onPageChange,
  onLimitChange,
  disabled = false,
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = total === 0 ? 0 : Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-sm text-white">
          Showing {start}–{end} of {total} {itemLabel}
        </p>
        <p className="text-xs text-gray-400">
          Page {Math.min(page, safeTotalPages)} of {safeTotalPages}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Page size</span>
          <Select
            value={String(limit)}
            onValueChange={value => onLimitChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger className="w-24 border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0F172A]">
              {[25, 50, 100].map(size => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= safeTotalPages || total === 0}
            className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
