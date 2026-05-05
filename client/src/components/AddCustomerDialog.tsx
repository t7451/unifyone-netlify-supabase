/**
 * AddCustomerDialog — manual customer create modal.
 *
 * Used from Customers page: drop in `<AddCustomerDialog onCreated={...} />`
 * anywhere; the dialog manages its own open state and renders a trigger
 * button. Backed by trpc.customers.create which is idempotent on
 * (tenantId, email).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UserPlus, Loader2 } from "lucide-react";

interface Props {
  onCreated?: (customerId: number) => void;
}

export function AddCustomerDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const utils = trpc.useUtils();
  const create = trpc.customers.create.useMutation({
    onSuccess: data => {
      if (data.alreadyExisted) {
        toast.info(
          "Customer with that email already exists — updated instead."
        );
      } else {
        toast.success("Customer created.");
      }
      utils.customers.list.invalidate?.();
      onCreated?.(data.id ?? 0);
      setOpen(false);
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!email) {
      toast.error("Email is required.");
      return;
    }
    create.mutate({
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: phone || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record. Email must be unique within your
            tenant — duplicates are merged into the existing record.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="ac-email" className="text-xs">
              Email <span className="text-red-400">*</span>
            </Label>
            <Input
              id="ac-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ac-fn" className="text-xs">
                First name
              </Label>
              <Input
                id="ac-fn"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ac-ln" className="text-xs">
                Last name
              </Label>
              <Input
                id="ac-ln"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ac-phone" className="text-xs">
              Phone
            </Label>
            <Input
              id="ac-phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
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
            onClick={handleSubmit}
            disabled={create.isPending || !email}
            className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 text-[#00D9FF] hover:bg-[#00D9FF]/20"
          >
            {create.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Customer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddCustomerDialog;
