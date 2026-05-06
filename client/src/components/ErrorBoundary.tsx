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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader className="items-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>{message}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && error?.stack ? (
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-left text-xs text-muted-foreground whitespace-pre-wrap">
              {error.stack}
            </pre>
          ) : null}
          <Button className="gap-2" onClick={resetError} type="button">
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
