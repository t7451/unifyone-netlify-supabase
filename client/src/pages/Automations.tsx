import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Zap,
  Globe,
  Activity,
  Clock,
  TestTube2,
  Trash2,
  Settings2,
  Mail,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// ── n8n Workflows Tab ─────────────────────────────────────────────────────────
function N8nTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    triggerEvent: "",
    webhookUrl: "",
    enabled: true,
  });

  const { data: workflows = [], refetch } = trpc.automation.n8n.list.useQuery();
  const { data: events = [] } = trpc.automation.getTriggerEvents.useQuery();

  const create = trpc.automation.n8n.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreate(false);
      setForm({
        name: "",
        description: "",
        triggerEvent: "",
        webhookUrl: "",
        enabled: true,
      });
      toast.success("Workflow created");
    },
    onError: e => toast.error(e.message),
  });
  const update = trpc.automation.n8n.update.useMutation({
    onSuccess: () => {
      refetch();
      setUpdatingId(null);
      toast.success("Workflow updated");
    },
    onError: e => {
      setUpdatingId(null);
      toast.error(e.message);
    },
  });
  const del = trpc.automation.n8n.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeletingId(null);
      toast.success("Workflow deleted");
    },
    onError: e => {
      setDeletingId(null);
      toast.error(e.message);
    },
  });
  const test = trpc.automation.n8n.test.useMutation({
    onSuccess: d => {
      setTestingId(null);
      toast.success(`Test sent — HTTP ${d.status}`);
    },
    onError: e => {
      setTestingId(null);
      toast.error(`Test failed: ${e.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">n8n Workflows</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Fire HTTP webhooks to your n8n instance on any platform event
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-10 text-center">
            <Zap className="w-10 h-10 text-orange-400/40 mx-auto mb-3" />
            <p className="text-gray-400">No workflows yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Add your n8n webhook URL and choose a trigger event
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map(wf => (
            <Card key={wf.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white text-sm">
                        {wf.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs text-orange-400 border-orange-500/30"
                      >
                        {wf.triggerEvent}
                      </Badge>
                      {wf.enabled ? (
                        <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    {wf.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {wf.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />{" "}
                        {wf.webhookUrl.substring(0, 50)}
                        {wf.webhookUrl.length > 50 ? "…" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {wf.triggerCount ?? 0}{" "}
                        triggers
                      </span>
                      {wf.lastTriggeredAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{" "}
                          {new Date(wf.lastTriggeredAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {wf.lastError && (
                      <p className="text-xs text-red-400 mt-1 truncate">
                        Error: {wf.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {updatingId === wf.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <Switch
                        checked={wf.enabled}
                        onCheckedChange={v => {
                          setUpdatingId(wf.id);
                          update.mutate({ id: wf.id, enabled: v });
                        }}
                        disabled={update.isPending}
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTestingId(wf.id);
                        test.mutate({ id: wf.id });
                      }}
                      disabled={testingId === wf.id}
                      className="gap-1 text-xs"
                    >
                      {testingId === wf.id ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Testing...</>
                      ) : (
                        <><TestTube2 className="w-3 h-3" /> Test</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingId(wf.id)}
                      className="text-red-400 hover:text-red-300 border-red-500/30"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400" /> New n8n Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Lead notification"
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Trigger Event</Label>
              <Select
                value={form.triggerEvent}
                onValueChange={v => setForm(f => ({ ...f, triggerEvent: v }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 mt-1">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(e => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={form.webhookUrl}
                onChange={e =>
                  setForm(f => ({ ...f, webhookUrl: e.target.value }))
                }
                placeholder="https://your-n8n.app.n8n.cloud/webhook/..."
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
                placeholder="What does this workflow do?"
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate(form)}
              disabled={
                !form.name ||
                !form.triggerEvent ||
                !form.webhookUrl ||
                create.isPending
              }
            >
              {create.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
              ) : (
                "Create Workflow"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingId !== null} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently remove the workflow and stop all future triggers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-gray-300 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletingId !== null && del.mutate({ id: deletingId })}
            >
              {del.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Zapier Hooks Tab ──────────────────────────────────────────────────────────
function ZapierTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    triggerEvent: "",
    webhookUrl: "",
    enabled: true,
  });

  const { data: hooks = [], refetch } = trpc.automation.zapier.list.useQuery();
  const { data: events = [] } = trpc.automation.getTriggerEvents.useQuery();

  const create = trpc.automation.zapier.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreate(false);
      setForm({ name: "", triggerEvent: "", webhookUrl: "", enabled: true });
      toast.success("Zapier hook created");
    },
    onError: e => toast.error(e.message),
  });
  const update = trpc.automation.zapier.update.useMutation({
    onSuccess: () => {
      refetch();
      setUpdatingId(null);
      toast.success("Hook updated");
    },
    onError: e => {
      setUpdatingId(null);
      toast.error(e.message);
    },
  });
  const del = trpc.automation.zapier.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeletingId(null);
      toast.success("Hook deleted");
    },
    onError: e => {
      setDeletingId(null);
      toast.error(e.message);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Zapier Webhooks</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Connect UnifyOne events to 6,000+ apps via Zapier catch hooks
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Hook
        </Button>
      </div>

      {hooks.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-10 text-center">
            <Zap className="w-10 h-10 text-yellow-400/40 mx-auto mb-3" />
            <p className="text-gray-400">No Zapier hooks yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Create a "Catch Hook" Zap, paste the URL here, and pick a trigger
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {hooks.map(hook => (
            <Card key={hook.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white text-sm">
                        {hook.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs text-yellow-400 border-yellow-500/30"
                      >
                        {hook.triggerEvent}
                      </Badge>
                      {hook.enabled ? (
                        <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                      <span>
                        {hook.webhookUrl.substring(0, 55)}
                        {hook.webhookUrl.length > 55 ? "…" : ""}
                      </span>
                      <span>{hook.triggerCount ?? 0} triggers</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {updatingId === hook.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : (
                      <Switch
                        checked={hook.enabled}
                        onCheckedChange={v => {
                          setUpdatingId(hook.id);
                          update.mutate({ id: hook.id, enabled: v });
                        }}
                        disabled={update.isPending}
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingId(hook.id)}
                      className="text-red-400 hover:text-red-300 border-red-500/30"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> New Zapier Hook
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="New Lead → Google Sheets"
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Trigger Event</Label>
              <Select
                value={form.triggerEvent}
                onValueChange={v => setForm(f => ({ ...f, triggerEvent: v }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 mt-1">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(e => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Zapier Catch Hook URL</Label>
              <Input
                value={form.webhookUrl}
                onChange={e =>
                  setForm(f => ({ ...f, webhookUrl: e.target.value }))
                }
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate(form)}
              disabled={
                !form.name ||
                !form.triggerEvent ||
                !form.webhookUrl ||
                create.isPending
              }
            >
              {create.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
              ) : (
                "Create Hook"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingId !== null} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zapier Hook?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently remove the hook and stop all future triggers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-gray-300 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => del.mutate({ id: deletingId! })}
            >
              {del.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Mailchimp Tab ─────────────────────────────────────────────────────────────
function MailchimpTab() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    apiKey: "",
    serverPrefix: "",
    listId: "",
    tagPrefix: "unifyone",
    enabled: true,
  });

  const { data: config, refetch } =
    trpc.automation.mailchimp.getConfig.useQuery();
  const save = trpc.automation.mailchimp.saveConfig.useMutation({
    onSuccess: () => {
      refetch();
      setEditing(false);
      toast.success("Mailchimp config saved");
    },
    onError: e => toast.error(e.message),
  });
  const testConn = trpc.automation.mailchimp.testConnection.useMutation({
    onSuccess: d => toast.success(`Mailchimp connected — ${d.status}`),
    onError: e => toast.error(`Connection failed: ${e.message}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Mailchimp Integration</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Auto-subscribe leads and customers to your Mailchimp audience
          </p>
        </div>
        <div className="flex gap-2">
          {config && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => testConn.mutate()}
              disabled={testConn.isPending}
              className="gap-1.5"
            >
              {testConn.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing...</>
              ) : (
                <><TestTube2 className="w-3.5 h-3.5" /> Test</>
              )}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setEditing(true);
              if (config)
                setForm({
                  apiKey: "",
                  serverPrefix: config.serverPrefix ?? "",
                  listId: config.listId ?? "",
                  tagPrefix: config.tagPrefix ?? "unifyone",
                  enabled: config.enabled,
                });
            }}
            className="gap-1.5"
          >
            <Settings2 className="w-4 h-4" /> {config ? "Edit" : "Configure"}
          </Button>
        </div>
      </div>

      {config ? (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "API Key", value: config.apiKey ?? "Not set" },
                {
                  label: "Server Prefix",
                  value: config.serverPrefix ?? "Not set",
                },
                { label: "List ID", value: config.listId ?? "Not set" },
                { label: "Tag Prefix", value: config.tagPrefix ?? "unifyone" },
                {
                  label: "Subscribers",
                  value: String(config.subscriberCount ?? 0),
                },
                {
                  label: "Status",
                  value: config.enabled ? "Active" : "Disabled",
                },
              ].map(f => (
                <div key={f.label}>
                  <span className="text-gray-500 text-xs">{f.label}</span>
                  <p className="text-gray-200 font-medium mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-10 text-center">
            <Mail className="w-10 h-10 text-blue-400/40 mx-auto mb-3" />
            <p className="text-gray-400">Mailchimp not configured</p>
            <p className="text-xs text-gray-600 mt-1">
              Add your API key to start syncing contacts automatically
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="bg-card border-border text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" /> Mailchimp Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder="Enter new API key (leave blank to keep current)"
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Server Prefix</Label>
              <Input
                value={form.serverPrefix}
                onChange={e =>
                  setForm(f => ({ ...f, serverPrefix: e.target.value }))
                }
                placeholder="us1, us6, us21, etc."
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Audience List ID</Label>
              <Input
                value={form.listId}
                onChange={e => setForm(f => ({ ...f, listId: e.target.value }))}
                placeholder="abc123def"
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Tag Prefix</Label>
              <Input
                value={form.tagPrefix}
                onChange={e =>
                  setForm(f => ({ ...f, tagPrefix: e.target.value }))
                }
                placeholder="unifyone"
                className="bg-gray-800 border-gray-700 mt-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.enabled}
                onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))}
              />
              <Label>Enable auto-subscribe on lead submission</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate(form)}
              disabled={
                (!form.apiKey && !config) ||
                !form.serverPrefix ||
                !form.listId ||
                save.isPending
              }
            >
              {save.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Automations Page ─────────────────────────────────────────────────────
export default function Automations() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-orange-400" />
          Automations
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Connect UnifyOne events to n8n, Zapier, and Mailchimp — no-code
          automation at scale
        </p>
      </div>

      {/* Quick-start cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: <Zap className="w-5 h-5 text-orange-400" />,
            title: "n8n Workflows",
            desc: "Self-hosted or cloud n8n. Full payload control, retry logic, and error tracking.",
            color: "border-orange-500/20",
          },
          {
            icon: <Zap className="w-5 h-5 text-yellow-400" />,
            title: "Zapier Hooks",
            desc: "6,000+ app integrations. Use Zapier Catch Hooks to trigger any Zap.",
            color: "border-yellow-500/20",
          },
          {
            icon: <Mail className="w-5 h-5 text-blue-400" />,
            title: "Mailchimp",
            desc: "Auto-subscribe leads and customers to your audience with custom tags.",
            color: "border-blue-500/20",
          },
        ].map(c => (
          <Card key={c.title} className={`bg-card border ${c.color}`}>
            <CardContent className="p-4 flex gap-3">
              <div className="mt-0.5">{c.icon}</div>
              <div>
                <p className="text-white font-medium text-sm">{c.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {c.desc}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="n8n" className="space-y-4">
        <TabsList className="bg-card border border-gray-800">
          <TabsTrigger
            value="n8n"
            className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" /> n8n
          </TabsTrigger>
          <TabsTrigger
            value="zapier"
            className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Zapier
          </TabsTrigger>
          <TabsTrigger
            value="mailchimp"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" /> Mailchimp
          </TabsTrigger>
        </TabsList>
        <TabsContent value="n8n">
          <N8nTab />
        </TabsContent>
        <TabsContent value="zapier">
          <ZapierTab />
        </TabsContent>
        <TabsContent value="mailchimp">
          <MailchimpTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
