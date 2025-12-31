import React, { Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

/**
 * Root Error Boundary for Sovereign OS.
 * Handles critical application failures with a specialized system diagnostic UI.
 */
// Fix: Use Component directly from named imports and ensure generics are properly applied to the class inheritance
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Initialize state as a class property with explicit typing to assist the compiler
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("KERNEL PANIC:", error, errorInfo);
  }

  render() {
    // Fix: Access state from the Component instance correctly
    const { hasError, error } = this.state;
    
    if (hasError) {
      let errorMsg = "An unexpected neural desync occurred.";
      
      if (error) {
        if (typeof error === 'string') errorMsg = error;
        else if (error.message) errorMsg = error.message;
        else errorMsg = JSON.stringify(error);
      }

      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#030303] text-white font-mono p-12 overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(157,78,221,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(157,78,221,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
            
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-red-500/30 p-10 rounded-2xl shadow-[0_0_100px_rgba(239,68,68,0.15)] relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/30">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black mb-4 tracking-[0.3em] uppercase text-red-500">System Failure</h1>
                <div className="p-4 bg-red-500/5 rounded border border-red-500/10 mb-8 w-full overflow-hidden">
                    <p className="text-[10px] text-red-400 font-bold uppercase mb-2">Diagnostic:</p>
                    <p className="text-xs text-gray-400 leading-relaxed font-mono break-all">{errorMsg}</p>
                </div>
                <button 
                    onClick={() => window.location.reload()} 
                    className="group px-10 py-4 bg-red-500 hover:bg-red-400 text-black font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                >
                    <RefreshCw className="w-4 h-4" />
                    Cold Reboot
                </button>
            </div>
        </div>
      );
    }
    // Fix: Correctly access the 'children' property from 'props' inherited from React.Component
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}