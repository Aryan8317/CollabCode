import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-8 text-center font-mono">
          <span className="material-symbols-outlined text-[64px] text-error mb-4">terminal</span>
          <h1 className="text-[24px] font-bold uppercase tracking-widest mb-2">System Failure</h1>
          <p className="text-on-surface-variant max-w-md mb-8">
            An unexpected runtime error has occurred. The collaborative session has been suspended to prevent data corruption.
          </p>
          <div className="bg-surface-container-high p-4 rounded-lg border border-outline-variant w-full max-w-2xl text-left overflow-auto max-h-48 mb-8">
            <p className="text-error font-bold mb-2">Error Log:</p>
            <pre className="text-[12px] opacity-80">{this.state.error?.message}</pre>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all text-[12px]"
          >
            Reboot Session
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
