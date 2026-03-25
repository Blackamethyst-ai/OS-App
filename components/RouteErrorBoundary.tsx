
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '../services/logger';

interface RouteErrorBoundaryProps {
    sector: string;
    children: ReactNode;
}

interface RouteErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Per-route error boundary that isolates crashes to individual sectors.
 * Unlike GlobalErrorBoundary, this does NOT re-throw — a crash in one
 * sector will not take down the rest of the application shell.
 */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
    state: RouteErrorBoundaryState = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ error, errorInfo });

        logger.error(
            `[RouteErrorBoundary] Sector "${this.props.sector}" crashed:`,
            error,
            errorInfo.componentStack ?? undefined
        );
    }

    handleReloadSector = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleReturnToDashboard = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.hash = '#/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-full max-w-lg border border-[var(--amethyst)]/30 bg-[var(--obsidian,#020204)]/80 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_60px_rgba(123,44,255,0.15)]">
                        {/* Top accent bar */}
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[var(--amethyst)] to-transparent opacity-60 rounded-t-2xl" />

                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="p-3 bg-[var(--amethyst)]/20 rounded-full">
                                <AlertTriangle size={28} className="text-[var(--amethyst)]" />
                            </div>
                            <div className="text-left">
                                <h2 className="text-lg font-bold text-[#F8FAFC] uppercase tracking-widest">
                                    Sector Fault
                                </h2>
                                <p className="text-xs text-[#94A3B8] uppercase tracking-[0.15em] mt-0.5">
                                    Isolated failure — system stable
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-[#94A3B8] mb-4">
                            The{' '}
                            <span className="text-[var(--cyan)] font-mono font-semibold">
                                {this.props.sector}
                            </span>{' '}
                            sector encountered an error and was isolated to protect system stability.
                        </p>

                        {/* Error details */}
                        {this.state.error && (
                            <div className="p-3 bg-[#0F172A] border border-white/5 rounded-lg font-mono text-xs text-[#EF4444] overflow-auto max-h-[120px] mb-6 text-left">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReloadSector}
                                className="flex-1 py-3 bg-[var(--amethyst)] hover:bg-[var(--amethyst)]/80 text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group"
                            >
                                <RefreshCw
                                    size={14}
                                    className="group-hover:rotate-180 transition-transform duration-500"
                                />
                                Reload Sector
                            </button>
                            <button
                                onClick={this.handleReturnToDashboard}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-white/10"
                            >
                                <Home size={14} />
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
