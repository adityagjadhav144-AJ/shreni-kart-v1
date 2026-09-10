import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ErrorBoundary ${this.props.label || "General"}] Caught error:`,
      error,
      errorInfo,
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error || new Error("Unknown error"),
          reset: this.handleReset,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const safeId = (this.props.label || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-");

      return (
        <div
          id={`error-boundary-${safeId}`}
          className="my-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-center text-foreground"
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <AlertTriangle className="size-6 text-destructive" />
            <p className="text-sm font-semibold text-foreground">
              {this.props.label
                ? `${this.props.label} encountered an issue`
                : "Something went wrong"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {this.state.error?.message || "An unexpected error occurred. Please try reloading."}
            </p>
            <button
              id={`retry-btn-${safeId}`}
              type="button"
              onClick={this.handleReset}
              className="tap mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-soft"
            >
              <RefreshCw className="size-3.5" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
