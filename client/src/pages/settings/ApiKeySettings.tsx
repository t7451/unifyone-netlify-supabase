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
import { toast } from "sonner";
import {
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
  ExternalLink,
} from "lucide-react";
import SettingsLayout from "./SettingsLayout";

export default function ApiKeySettings() {
  const [keyInput, setKeyInput] = useState("");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.apiKeys.list.useQuery();
  const openRouterKey = data?.keys.find(k => k.provider === "openrouter");

  const saveMutation = trpc.apiKeys.save.useMutation({
    onSuccess: () => {
      setKeyInput("");
      utils.apiKeys.list.invalidate();
      toast.success("OpenRouter key saved", {
        description:
          "Kai chats now run on your key — no Kai credits will be used.",
      });
    },
    onError: err => {
      toast.error("Key not saved", { description: err.message });
    },
  });

  const removeMutation = trpc.apiKeys.remove.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
      toast.success("OpenRouter key removed", {
        description: "Kai chats will use platform billing again.",
      });
    },
    onError: err => {
      toast.error("Could not remove key", { description: err.message });
    },
  });

  return (
    <SettingsLayout>
      <div className="space-y-4">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#00D9FF]" />
              AI API keys
            </CardTitle>
            <CardDescription>
              Bring your own OpenRouter key and Kai will bill your key directly
              — premium models included, with zero Kai credits used. Keys are
              encrypted at rest and validated before saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your keys…
              </div>
            ) : openRouterKey ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      OpenRouter key active
                      <span className="ml-2 text-gray-400 font-mono">
                        ••••{openRouterKey.last4}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Updated{" "}
                      {new Date(openRouterKey.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() =>
                    removeMutation.mutate({ provider: "openrouter" })
                  }
                  disabled={removeMutation.isPending}
                >
                  {removeMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Remove
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 p-3 text-sm text-gray-400">
                No key saved yet. Kai currently uses platform billing (Kai
                credits) for premium models; free models are always free.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="openrouter-key" className="text-gray-300">
                {openRouterKey ? "Replace key" : "Add OpenRouter key"}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="openrouter-key"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-or-v1-…"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  className="bg-white/5 border-white/10 text-white font-mono"
                />
                <Button
                  onClick={() =>
                    saveMutation.mutate({
                      provider: "openrouter",
                      key: keyInput,
                    })
                  }
                  disabled={
                    keyInput.trim().length < 20 || saveMutation.isPending
                  }
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {saveMutation.isPending ? "Validating…" : "Save key"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Get a key at{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-[#00D9FF] hover:underline"
                >
                  openrouter.ai/keys
                  <ExternalLink className="h-3 w-3" />
                </a>
                . The key is verified with OpenRouter before it is stored.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
