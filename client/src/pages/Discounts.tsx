import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Power, Trash2, Tag, Loader2, AlertTriangle } from "lucide-react";
import { QueryErrorState } from "@/components/QueryErrorState";

export default function DiscountsPage() {
  const utils = trpc.useUtils();
  const list = trpc.discounts.list.useQuery();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("10");
  const [usageLimit, setUsageLimit] = useState("0");

  const create = trpc.discounts.create.useMutation({
    onSuccess: () => {
      toast.success("Discount created");
      utils.discounts.list.invalidate();
      setOpen(false);
      setCode("");
      setDescription("");
      setType("percentage");
      setValue("10");
      setUsageLimit("0");
    },
    onError: error => toast.error(error.message || "Something went wrong"),
  });

  const toggle = trpc.discounts.toggleActive.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(
        variables.isActive ? "Discount activated" : "Discount deactivated"
      );
      utils.discounts.list.invalidate();
    },
    onError: error => toast.error(error.message || "Something went wrong"),
  });

  const del = trpc.discounts.delete.useMutation({
    onSuccess: () => {
      toast.success("Discount deleted");
      utils.discounts.list.invalidate();
    },
    onError: error => toast.error(error.message || "Something went wrong"),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Storefront Discounts
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Optional promo codes for gig workers who also run a store — not
            needed to track your gig earnings or taxes.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20">
              <Plus className="w-4 h-4 mr-2" />
              New Discount
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Discount</DialogTitle>
              <DialogDescription>
                Codes are case-insensitive (stored uppercase). Unique per
                tenant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Code</Label>
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <select
                    value={type}
                    onChange={e =>
                      setType(e.target.value as "percentage" | "fixed")
                    }
                    className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Value {type === "percentage" ? "(%)" : "(amount)"}
                  </Label>
                  <Input
                    type="number"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    min="0"
                    max={type === "percentage" ? 100 : undefined}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Usage limit (0 = unlimited)</Label>
                <Input
                  type="number"
                  value={usageLimit}
                  onChange={e => setUsageLimit(e.target.value)}
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-white/10 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  create.mutate({
                    code,
                    description: description || undefined,
                    type,
                    value,
                    usageLimit: parseInt(usageLimit, 10) || 0,
                    isActive: true,
                  })
                }
                disabled={create.isPending || !code || !value}
                className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20"
              >
                {create.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#00D9FF]" />
            Active codes
          </CardTitle>
          <CardDescription className="text-gray-400">
            {list.data?.length ?? 0} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : list.isError ? (
            <div className="flex justify-center py-8">
              <QueryErrorState
                icon={AlertTriangle}
                title="Failed to load discounts"
                message={list.error.message}
                onRetry={() => void list.refetch()}
                isRetrying={list.isFetching}
                size="sm"
              />
            </div>
          ) : !list.data?.length ? (
            <p className="text-sm text-gray-500 py-4">
              No store discounts yet. If you sell alongside your gig work,
              create your first promo code above.
            </p>
          ) : (
            <div className="space-y-2">
              {list.data.map(d => {
                const isToggling =
                  toggle.isPending && toggle.variables?.id === d.id;
                const isDeleting = del.isPending && del.variables?.id === d.id;

                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-white font-mono text-sm">
                          {d.code}
                        </code>
                        <Badge
                          variant="outline"
                          className={
                            d.isActive
                              ? "border-emerald-500/30 text-emerald-400 text-xs"
                              : "border-gray-500/30 text-gray-400 text-xs"
                          }
                        >
                          {d.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {d.type === "percentage"
                            ? `${d.value}% off`
                            : `${d.value} ${d.currency} off`}
                        </span>
                      </div>
                      {d.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {d.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-600 mt-0.5">
                        Used {d.usageCount}
                        {d.usageLimit > 0 ? ` / ${d.usageLimit}` : ""} times
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toggle.mutate({ id: d.id, isActive: !d.isActive })
                        }
                        disabled={isToggling || isDeleting}
                        className="border-white/10 text-gray-300 hover:text-white"
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete discount '${d.code}'? Cannot be undone.`
                            )
                          ) {
                            del.mutate({ id: d.id });
                          }
                        }}
                        disabled={isToggling || isDeleting}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
