import { Skeleton } from "./ui/skeleton";

export function DashboardLayoutSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      className="brand-skeleton flex min-h-screen"
      style={{
        background: "var(--brand-background, #141718)",
        color: "var(--brand-ink, #f4f2ed)",
        fontFamily: '"Inter", Arial, sans-serif',
      }}
    >
      <span className="sr-only">Loading workspace…</span>
      <div
        aria-hidden="true"
        className="hidden w-[280px] shrink-0 flex-col gap-6 border-r border-white/10 p-4 md:flex"
      >
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="bg-white/5 motion-reduce:animate-none h-8 w-8 rounded-md" />
          <Skeleton className="bg-white/5 motion-reduce:animate-none h-4 w-24" />
        </div>
        <div className="space-y-2 px-2">
          {[1, 2, 3].map(item => (
            <Skeleton key={item} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 px-2">
          <Skeleton className="bg-white/5 motion-reduce:animate-none h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="bg-white/5 motion-reduce:animate-none h-3 w-20" />
            <Skeleton className="bg-white/5 motion-reduce:animate-none h-2 w-32" />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
        <Skeleton className="bg-white/5 motion-reduce:animate-none h-12 w-48 max-w-full rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(item => (
            <Skeleton key={item} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="bg-white/5 motion-reduce:animate-none h-64 rounded-xl" />
      </div>
    </div>
  );
}
