import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";

const GENERIC_ERROR_MESSAGE = "An unexpected error occurred. Please refresh.";

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function DefaultErrorFallback({
  error,
  resetError,
}: ErrorBoundaryFallbackProps) {
  const message = import.meta.env.DEV
    ? error?.message || GENERIC_ERROR_MESSAGE
    : GENERIC_ERROR_MESSAGE;

  return (
    <div
      className="brand-error flex min-h-screen items-center justify-center px-4 py-8"
      style={{
        background: "var(--brand-background, #141718)",
        color: "var(--brand-ink, #f4f2ed)",
        fontFamily: '"Inter", Arial, sans-serif',
      }}
    >
      <Card
        className="w-full max-w-lg border-white/10 text-center shadow-none"
        style={{
          background: "var(--brand-surface, #1c2022)",
          color: "inherit",
        }}
      >
        <CardHeader className="items-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <AlertTriangle aria-hidden="true" className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <CardTitle style={{ fontFamily: "inherit", color: "inherit" }}>
              Something went wrong
            </CardTitle>
            <CardDescription style={{ color: "var(--brand-muted, #b5bab7)" }}>
              {message}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4" role="alert">
          {import.meta.env.DEV && error?.stack ? (
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-left text-xs text-muted-foreground whitespace-pre-wrap">
              {error.stack}
            </pre>
          ) : null}
          <Button
            className="min-h-11 gap-2"
            style={{
              background: "var(--brand-accent, #f39450)",
              color: "#141718",
            }}
            onClick={resetError}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  private resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;

      if (Fallback) {
        return (
          <Fallback error={this.state.error} resetError={this.resetError} />
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

export function RouteErrorBoundary({
  children,
  fallback,
  onError,
}: ErrorBoundaryProps) {
  const [location] = useLocation();

  return (
    <ErrorBoundary key={location} fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
