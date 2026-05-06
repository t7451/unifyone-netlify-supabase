import { trpc } from "@/lib/trpc";
import { HelmetProvider } from "react-helmet-async";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import "./lib/metaPixelInit";
import "./lib/analyticsInit";
import "./lib/impactCapture";

const FETCH_TIMEOUT_MS = 15_000;

const getTrpcErrorCode = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return null;

  return error.data?.code ?? null;
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (typeof window === "undefined") return;

  const code = getTrpcErrorCode(error);
  const isUnauthorized =
    code === "UNAUTHORIZED" ||
    (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG);

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

const showGlobalTrpcErrorToast = (error: unknown) => {
  const code = getTrpcErrorCode(error);

  if (
    code === "UNAUTHORIZED" ||
    code === "NOT_FOUND" ||
    (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG)
  ) {
    return;
  }

  if (code === "FORBIDDEN") {
    toast.error("You don't have permission to do that");
    return;
  }

  if (code === "INTERNAL_SERVER_ERROR") {
    toast.error("Server error — please try again");
    return;
  }

  if (error instanceof Error && error.message) {
    toast.error(error.message);
    return;
  }

  toast.error("Something went wrong");
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: error => {
      redirectToLoginIfUnauthorized(error);
      showGlobalTrpcErrorToast(error);
      console.error("[API Query Error]", error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      redirectToLoginIfUnauthorized(error);

      if (!mutation.options.onError) {
        showGlobalTrpcErrorToast(error);
      }

      console.error("[API Mutation Error]", error);
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      // 30 s stale window — prevents redundant background refetches
      staleTime: 30_000,
    },
  },
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
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      },
    }),
  ],
});

function initializeApp() {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error(
        "[UnifyOne] Root DOM element #root not found. Check index.html."
      );
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
      // Sanitize error message to prevent XSS
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const sanitizedMessage = document.createTextNode(errorMessage);

      const errorContainer = document.createElement("div");
      errorContainer.style.cssText =
        "min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #020202; color: #F0D080; font-family: system-ui, sans-serif;";

      const errorContent = document.createElement("div");
      errorContent.style.cssText =
        "max-width: 600px; padding: 2rem; text-align: center;";

      const heading = document.createElement("h1");
      heading.style.cssText = "font-size: 2rem; margin-bottom: 1rem;";
      heading.textContent = "Application Error";

      const description = document.createElement("p");
      description.style.cssText = "margin-bottom: 1rem; color: #9A9A9A;";
      description.textContent =
        "We encountered an error while loading the application. Please try refreshing the page.";

      const errorDetails = document.createElement("p");
      errorDetails.style.cssText =
        "font-size: 0.875rem; color: #5A5A5A; font-family: monospace;";
      errorDetails.appendChild(sanitizedMessage);

      const refreshButton = document.createElement("button");
      refreshButton.textContent = "Refresh Page";
      refreshButton.style.cssText =
        "margin-top: 1.5rem; padding: 0.75rem 2rem; background: #D4A843; color: #020202; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; letter-spacing: 0.05em;";
      refreshButton.onclick = () => window.location.reload();

      errorContent.appendChild(heading);
      errorContent.appendChild(description);
      errorContent.appendChild(errorDetails);
      errorContent.appendChild(refreshButton);
      errorContainer.appendChild(errorContent);

      rootElement.replaceChildren(errorContainer);
    }
  }
}

// Ensure DOM is ready before initializing React
// Module scripts are deferred, but add extra safety for Netlify deployments
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, { once: true });
} else {
  initializeApp();
}
