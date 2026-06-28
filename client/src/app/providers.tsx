import { Suspense, type ReactNode } from "react";
import { ClerkProvider } from "@clerk/clerk-react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import ErrorBoundary, { RouteErrorBoundary } from "../components/ErrorBoundary";
import LoadingExperience from "../components/LoadingExperience";
import { ThemeProvider } from "../contexts/ThemeContext";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

function AppWithOptionalClerk({ children }: { children: ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppWithOptionalClerk>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster theme="dark" />
            <Suspense
              fallback={
                <LoadingExperience
                  fullScreen
                  title="Loading your next view"
                  description="Streaming route bundles, restoring interface state, and preparing a smoother transition."
                  label="Route bundle loading"
                />
              }
            >
              <RouteErrorBoundary>{children}</RouteErrorBoundary>
            </Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </AppWithOptionalClerk>
  );
}
