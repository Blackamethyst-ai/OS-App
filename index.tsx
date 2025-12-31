import React, { ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ShieldAlert, RefreshCw, Terminal, Activity } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

/**
 * Root Error Boundary for Sovereign OS.
 * Provides a specialized diagnostic UI during critical kernel panics.
 */
// Explicitly use React.Component to ensure 'props' is correctly typed from ErrorBoundaryProps
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("KERNEL PANIC:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      let errorMsg = "An unexpected neural desync occurred.";
      const error = this.state.error;
      
      if (error) {
        if (typeof error === 'string') errorMsg = error;
        else if (error.message) errorMsg = error.message;
        else errorMsg = JSON.stringify(error);
      }

      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020204] text-white font-mono p-12 overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(123,44,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(123,44,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
            
            <div className="w-full max-w-2xl bg-[#0a0a0c] border border-red-500/30 p-10 rounded-[3rem] shadow-[0_0_100px_rgba(239,68,68,0.15)] relative overflow-hidden flex flex-col items-center text-center backdrop-blur-3xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-red-400 to-red-500"></div>
                <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black mb-4 tracking-[0.4em] uppercase text-white leading-none">Kernel Panic</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-8">System structural integrity compromised</p>
                
                <div className="p-6 bg-black/40 rounded-2xl border border-red-500/10 mb-10 w-full overflow-hidden text-left shadow-inner">
                    <div className="flex items-center gap-2 mb-4 text-red-500">
                        <Terminal size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Diagnostic Stack Trace</span>
                    </div>
                    <p className="text-xs text-red-200/70 leading-relaxed font-mono break-all line-clamp-4">
                        {errorMsg}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="group px-10 py-4 bg-red-500 hover:bg-red-400 text-black font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center gap-3 shadow-[0_0_40px_rgba(239,68,68,0.3)] rounded-2xl active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                        Cold Reboot
                    </button>
                    <button 
                        onClick={() => window.location.hash = '/metaventions-hub'} 
                        className="px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all"
                    >
                        Return to Hub
                    </button>
                </div>
            </div>
            
            <div className="absolute bottom-10 flex items-center gap-3 text-[8px] font-black text-gray-700 uppercase tracking-widest">
                <Activity size={12} />
                Neural OS Zenith // Error_Code_0xFD2
            </div>
        </div>
      );
    }

    // Access children through this.props, which is now explicitly typed via React.Component inheritance
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