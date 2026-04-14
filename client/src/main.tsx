import { trpc } from "@/lib/trpc";
import { HelmetProvider } from "react-helmet-async";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

function initializeApp() {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error("[UnifyOne] Root DOM element #root not found. Check index.html.");
      throw new Error("[UnifyOne] Root DOM element #root not found. Check index.html.");
    }

    console.log("[UnifyOne] Initializing React application...");

    createRoot(rootElement).render(
      <HelmetProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </trpc.Provider>
      </HelmetProvider>
    );

    console.log("[UnifyOne] React application initialized successfully");
  } catch (error) {
    console.error("[UnifyOne] Failed to initialize application:", error);
    // Display a user-friendly error message on the page
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #020202; color: #F0D080; font-family: system-ui, sans-serif;">
          <div style="max-width: 600px; padding: 2rem; text-align: center;">
            <h1 style="font-size: 2rem; margin-bottom: 1rem;">Application Error</h1>
            <p style="margin-bottom: 1rem; color: #9A9A9A;">We encountered an error while loading the application. Please try refreshing the page.</p>
            <p style="font-size: 0.875rem; color: #5A5A5A; font-family: monospace;">${error instanceof Error ? error.message : String(error)}</p>
            <button onclick="window.location.reload()" style="margin-top: 1.5rem; padding: 0.75rem 2rem; background: #D4A843; color: #020202; border: none; cursor: pointer; font-weight: 600; letter-spacing: 0.05em;">
              Refresh Page
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Ensure DOM is ready before initializing React
// Module scripts are deferred, but add extra safety for Netlify deployments
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
