
import React, { ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Root Error Boundary for Sovereign OS Crash Handling
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL KERNEL PANIC:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#030303] text-red-500 font-mono p-12 text-center">
            <div className="border border-red-900/50 bg-red-900/10 p-12 rounded max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                <h1 className="text-2xl font-black mb-4 tracking-[0.2em] uppercase">System Failure</h1>
                <p className="text-xs text-gray-400 mb-8 leading-relaxed">
                    The Sovereign Architecture has encountered a fatal exception. 
                    Cognitive processes have been suspended to preserve integrity.
                </p>
                <button 
                    onClick={() => window.location.reload()} 
                    className="px-6 py-3 bg-red-500 hover:bg-red-400 text-black font-bold text-xs uppercase tracking-[0.2em] transition-all"
                >
                    Initiate Reboot
                </button>
            </div>
        </div>
      );
    }

    // Force type assertion to avoid TS errors on strict class component typing
    return (this as any).props.children;
  }
}

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    // Retry mechanism ensures mounting even if script loads before DOM
    setTimeout(mountApp, 50);
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}
