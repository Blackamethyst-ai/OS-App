import React, { ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ShieldAlert, RefreshCw, Terminal } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Root Error Boundary for Sovereign OS Crash Handling.
 * Handles critical application failures with a specialized system diagnostic UI.
 */
// Fix: Explicitly extend React.Component to ensure props and state are correctly inherited and recognized by TypeScript
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Initialize state as a class field for robust TypeScript recognition
  public state: ErrorBoundaryState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL KERNEL PANIC:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    // Fix: Access props correctly from the component instance 'this' context
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#030303] text-white font-mono p-12 overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
            
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-red-500/30 p-10 rounded-2xl shadow-[0_0_100px_rgba(239,68,68,0.15)] relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/30 animate-pulse">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                
                <h1 className="text-3xl font-black mb-4 tracking-[0.3em] uppercase text-red-500">System Failure</h1>
                
                <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase tracking-widest mb-4 border-b border-[#222] pb-2">
                    <Terminal className="w-3 h-3" />
                    <span>KERNEL_EXCEPTION_TRAP</span>
                </div>

                <div className="p-4 bg-red-500/5 rounded border border-red-500/10 mb-8 w-full overflow-hidden">
                    <p className="text-[10px] text-red-400 font-bold uppercase mb-2">Error Diagnostic:</p>
                    <p className="text-xs text-gray-400 leading-relaxed font-mono break-all">
                        {error?.message || "An unexpected neural desync occurred in the Sovereign Core."}
                    </p>
                </div>

                <button 
                    onClick={() => window.location.reload()} 
                    className="group px-10 py-4 bg-red-500 hover:bg-red-400 text-black font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    Initiate Cold Reboot
                </button>
                
                <div className="mt-12 pt-6 border-t border-[#1f1f1f] w-full flex justify-between text-[8px] text-gray-600 uppercase tracking-widest">
                    <span>ERR: KERNEL_PANIC_RUNTIME</span>
                    <span>METAVENTIONS AI // SOVEREIGN_CORE_V1</span>
                </div>
            </div>
        </div>
      );
    }

    return children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}