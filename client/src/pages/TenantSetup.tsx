import { BrandLockup } from "@/components/Brand";
import "@/components/workspace.css";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { trackActivation } from "@/lib/userTracking";
import {
  landingPathForProduct,
  type PrimaryProduct,
} from "@/lib/primaryProduct";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const FIRST_ACTIONS = [
  {
    value: "/overview",
    title: "See my overview",
    description: "Start with a clear view of earnings, mileage and next steps.",
  },
  {
    value: "/gig-command",
    title: "Track my next shift",
    description:
      "Start the timer for a delivery, rideshare or freelance work session.",
  },
  {
    value: "/money-manager",
    title: "Add past earnings",
    description: "Import a platform export and review your work history.",
  },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function TenantSetup() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [showIdentifier, setShowIdentifier] = useState(false);
  const [primaryProduct, setPrimaryProduct] = useState<PrimaryProduct>("gig");
  const [firstAction, setFirstAction] = useState<string>("/overview");
  const [createdTenantId, setCreatedTenantId] = useState<number | null>(null);
  const [createdProduct, setCreatedProduct] = useState<PrimaryProduct>("gig");
  const [step, setStep] = useState<1 | 2>(1);
  const [seedDemo, setSeedDemo] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const createTenant = trpc.tenant.create.useMutation();
  const seedDemoMutation = trpc.tenant.seedDemoData.useMutation();
  const busy =
    finishing || createTenant.isPending || seedDemoMutation.isPending;

  useEffect(() => {
    if (nameEdited || !user) return;
    const defaultName = user.name?.trim()
      ? `${user.name.trim()}'s work`
      : "My work";
    setName(defaultName);
    if (!slugEdited) setSlug(slugify(defaultName) || "my-work");
  }, [user, nameEdited, slugEdited]);

  const validName = name.trim().length >= 2 && name.trim().length <= 255;
  const validSlug = /^[a-z0-9-]{2,100}$/.test(slug);

  async function finish(path: string) {
    setFinishing(true);
    try {
      // Both guards must see the newly created workspace before navigating.
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.tenant.list.invalidate(),
      ]);
      navigate(path);
    } catch {
      setError(
        "Your workspace was created, but we could not open it yet. Try opening it again."
      );
    } finally {
      setFinishing(false);
    }
  }

  async function createWorkspace(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!validName || !validSlug) {
      setShowIdentifier(!validSlug);
      setError(
        !validName
          ? "Use a workspace name with 2–255 characters."
          : "Use 2–100 lowercase letters, numbers or hyphens for your workspace identifier."
      );
      return;
    }
    if (createdTenantId) {
      if (createdProduct === "commerce") setStep(2);
      else await finish(firstAction);
      return;
    }
    try {
      const tenant = await createTenant.mutateAsync({
        name: name.trim(),
        slug,
        primaryProduct,
      });
      const savedProduct =
        tenant.primaryProduct === "commerce" ? "commerce" : "gig";
      setCreatedTenantId(tenant.id);
      setCreatedProduct(savedProduct);
      trackActivation("tenant_created");
      if (savedProduct === "commerce") setStep(2);
      else await finish(firstAction);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We could not create your workspace. Please try again."
      );
      setShowIdentifier(true);
    }
  }

  async function finishCommerce(withSamples: boolean) {
    if (busy || !createdTenantId) return;
    setError("");
    if (withSamples) {
      try {
        await seedDemoMutation.mutateAsync({ tenantId: createdTenantId });
        await utils.products.list.invalidate();
      } catch {
        setError(
          "The sample products could not be added. Try again, or open your empty storefront workspace."
        );
        return;
      }
    }
    await finish("/dashboard");
  }

  if (loading)
    return (
      <main
        className="workspace-shell flex min-h-screen items-center justify-center bg-background p-6 text-foreground"
        aria-busy="true"
      >
        <p role="status">Loading your workspace…</p>
      </main>
    );

  if (user?.tenantId && !createdTenantId)
    return (
      <main className="workspace-shell flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section className="w-full max-w-lg rounded-2xl border border-border bg-muted/40 p-6 sm:p-8">
          <Check className="mb-4 h-8 w-8 text-emerald-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold">
            Your workspace is already ready
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Continue where you left off. You can change your workspace name and
            experience in Settings.
          </p>
          <Button
            className="mt-6 min-h-11 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate(landingPathForProduct(user.primaryProduct))}
          >
            Open my workspace <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </section>
      </main>
    );

  return (
    <main className="workspace-shell min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" aria-label="UnifyOne home" className="inline-flex">
          <BrandLockup size={36} />
        </Link>
        <header className="mb-7 mt-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {step === 2 ? "One optional step" : "Start with your own numbers"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {step === 2
              ? "Your storefront workspace is ready"
              : "Make your work add up"}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {step === 2
              ? "Choose an empty workspace or explore with clearly labeled sample products."
              : "Delivery, rideshare, freelance—or a mix. Set up your workspace, then track a shift or bring in your earnings."}
          </p>
        </header>
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"
          >
            {error}
          </div>
        )}
        {step === 1 ? (
          <form
            onSubmit={event => void createWorkspace(event)}
            className="space-y-6 rounded-2xl border border-border bg-muted/40 p-5 sm:p-7"
          >
            <fieldset disabled={busy || !!createdTenantId}>
              <legend className="mb-3 text-sm font-semibold">
                What are you here to manage?
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      id: "gig",
                      title: "My work and earnings",
                      description:
                        "Delivery, rideshare and freelance income, work sessions and mileage.",
                      icon: BriefcaseBusiness,
                    },
                    {
                      id: "commerce",
                      title: "A storefront",
                      description:
                        "Products, customers and orders for a commerce business.",
                      icon: ShoppingBag,
                    },
                  ] as const
                ).map(option => (
                  <label
                    key={option.id}
                    className={cn(
                      "relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-primary",
                      primaryProduct === option.id
                        ? "border-primary/60 bg-primary/10"
                        : "border-border hover:border-white/25"
                    )}
                  >
                    <input
                      type="radio"
                      name="primary-product"
                      value={option.id}
                      checked={primaryProduct === option.id}
                      onChange={() => {
                        setPrimaryProduct(option.id);
                        setError("");
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <option.icon className="h-4 w-4" aria-hidden="true" />
                        {option.title}
                      </span>
                      <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={name}
                minLength={2}
                maxLength={255}
                required
                disabled={busy || !!createdTenantId}
                aria-describedby="workspace-name-hint"
                className="min-h-11 border-border bg-background text-foreground"
                placeholder="e.g. Sam's work"
                onChange={event => {
                  const value = event.target.value;
                  setNameEdited(true);
                  setName(value);
                  if (!slugEdited) setSlug(slugify(value));
                  setError("");
                }}
              />
              <p
                id="workspace-name-hint"
                className="text-xs leading-relaxed text-muted-foreground"
              >
                A label for your records. Your name or business name is fine;
                you can rename it later.
              </p>
            </div>
            <details
              open={showIdentifier}
              onToggle={event => setShowIdentifier(event.currentTarget.open)}
              className="rounded-xl border border-border p-3"
            >
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Workspace identifier{" "}
                <span className="text-xs text-muted-foreground">
                  · optional to customize
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="workspace-identifier">Identifier</Label>
                <Input
                  id="workspace-identifier"
                  value={slug}
                  disabled={busy || !!createdTenantId}
                  minLength={2}
                  maxLength={100}
                  pattern="[a-z0-9-]+"
                  aria-describedby="identifier-hint"
                  className="min-h-11 border-border bg-background text-foreground"
                  onChange={event => {
                    setSlugEdited(true);
                    setSlug(event.target.value);
                    setError("");
                  }}
                />
                <p
                  id="identifier-hint"
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  An internal identifier, not a public website. Use 2–100
                  lowercase letters, numbers or hyphens.
                </p>
              </div>
            </details>
            {primaryProduct === "gig" && (
              <fieldset disabled={busy}>
                <legend className="mb-3 text-sm font-semibold">
                  Where would you like to start?
                </legend>
                <div className="space-y-2">
                  {FIRST_ACTIONS.map(action => (
                    <label
                      key={action.value}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-xl border p-3 focus-within:ring-2 focus-within:ring-primary",
                        firstAction === action.value
                          ? "border-primary/40 bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <input
                        type="radio"
                        name="first-action"
                        value={action.value}
                        checked={firstAction === action.value}
                        onChange={() => setFirstAction(action.value)}
                        className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {action.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <Button
              type="submit"
              disabled={busy || !validName || !validSlug}
              className="min-h-12 w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {finishing
                    ? "Opening your workspace…"
                    : "Creating your workspace…"}
                </>
              ) : (
                <>
                  {createdTenantId
                    ? "Open my workspace"
                    : primaryProduct === "gig"
                      ? "Create my workspace"
                      : "Continue with storefront"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            {primaryProduct === "gig" && (
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                No bank connection needed to get started. Track work or import
                earnings while automatic account linking is being prepared. Your
                records start empty.
              </p>
            )}
          </form>
        ) : (
          <section className="space-y-5 rounded-2xl border border-border bg-muted/40 p-5 sm:p-7">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm">
                <strong>{name}</strong> has been created. Sample products are
                optional and do not represent real sales.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border p-4">
              <Checkbox
                id="sample-products"
                checked={seedDemo}
                disabled={busy}
                onCheckedChange={checked => setSeedDemo(checked === true)}
                className="mt-0.5 border-white/30"
              />
              <div>
                <Label
                  htmlFor="sample-products"
                  className="text-sm font-medium"
                >
                  Add sample products
                </Label>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Explore the product catalog with example records. These are
                  storefront products, not gig earnings or tracked shifts.
                </p>
              </div>
            </div>
            <Button
              disabled={busy}
              onClick={() => void finishCommerce(seedDemo)}
              className="min-h-12 w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening your storefront…
                </>
              ) : (
                <>
                  Open my storefront <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            {seedDemo && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void finishCommerce(false)}
                className="min-h-11 w-full text-muted-foreground"
              >
                Skip sample products
              </Button>
            )}
          </section>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link
            href="/tools"
            className="inline-flex min-h-11 items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Explore the free tools
          </Link>
        </p>
      </div>
    </main>
  );
}
