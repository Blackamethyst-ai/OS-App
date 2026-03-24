
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '../services/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null, errorInfo: null };

    constructor(props: Props) {
        super(props);
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });

        logger.error("GLOBAL ERROR CAUGHT:", error, errorInfo.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="fixed inset-0 z-[9999] bg-[#020204] flex flex-col items-center justify-center text-[var(--cyan)] font-mono p-8">
                    <div className="w-full max-w-2xl border border-[var(--amethyst)]/50 bg-black/80 rounded-2xl p-8 shadow-[0_0_100px_rgba(123,44,255,0.2)] backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--amethyst)] via-[var(--cyan)] to-[var(--amethyst)] opacity-50" />

                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-[var(--amethyst)]/20 rounded-full animate-pulse">
                                <AlertTriangle size={48} className="text-[var(--amethyst)]" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black uppercase tracking-widest text-[#F8FAFC]">System Critical</h1>
                                <p className="text-[#94A3B8] text-sm uppercase tracking-[0.2em] mt-1">Master Stabilization Protocol Active</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="p-4 bg-[#0F172A] border border-white/5 rounded-lg font-mono text-xs text-[#EF4444] overflow-auto max-h-[200px]">
                                {this.state.error?.toString()}
                                <br />
                                {this.state.errorInfo?.componentStack}
                            </div>
                        </div>

                        <button
                            onClick={this.handleReset}
                            className="w-full py-4 bg-[var(--amethyst)] hover:bg-[var(--cyan)] text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-3 group"
                        >
                            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                            Reboot System Kernel
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
