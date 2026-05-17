/**
 * API USAGE SERVICE
 * Tracks API call counts, timestamps, and provides rate limiting awareness.
 */

export interface ApiCallRecord {
    model: string;
    timestamp: number;
    success: boolean;
}

export interface ApiUsageStats {
    totalCalls: number;
    callsThisMinute: number;
    callsThisHour: number;
    callsByModel: Record<string, number>;
    lastCallTime: number | null;
    errors: number;
}

// Gemini API limits (approximate - varies by tier)
const RATE_LIMITS = {
    'gemini-2.5-flash-image': { rpm: 15, rpd: 1500 },
    'gemini-2.5-flash': { rpm: 15, rpd: 1500 },
    'text-embedding-004': { rpm: 100, rpd: 10000 },
    'default': { rpm: 15, rpd: 1500 }
};

class ApiUsageService {
    private calls: ApiCallRecord[] = [];
    private listeners: Set<() => void> = new Set();

    /**
     * Record an API call
     */
    recordCall(model: string, success: boolean = true) {
        this.calls.push({
            model: this.normalizeModel(model),
            timestamp: Date.now(),
            success
        });

        // Keep only last 24 hours of data
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.calls = this.calls.filter(c => c.timestamp > dayAgo);

        this.notifyListeners();
    }

    /**
     * Get current usage statistics
     */
    getStats(): ApiUsageStats {
        const now = Date.now();
        const minuteAgo = now - 60 * 1000;
        const hourAgo = now - 60 * 60 * 1000;

        const callsThisMinute = this.calls.filter(c => c.timestamp > minuteAgo).length;
        const callsThisHour = this.calls.filter(c => c.timestamp > hourAgo).length;
        const errors = this.calls.filter(c => !c.success).length;

        const callsByModel: Record<string, number> = {};
        this.calls.forEach(c => {
            callsByModel[c.model] = (callsByModel[c.model] || 0) + 1;
        });

        return {
            totalCalls: this.calls.length,
            callsThisMinute,
            callsThisHour,
            callsByModel,
            lastCallTime: this.calls.length > 0 ? this.calls[this.calls.length - 1].timestamp : null,
            errors
        };
    }

    /**
     * Get rate limit info for a model
     */
    getRateLimitInfo(model: string) {
        const normalizedModel = this.normalizeModel(model);
        const limits = RATE_LIMITS[normalizedModel as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
        const now = Date.now();
        const minuteAgo = now - 60 * 1000;

        const callsThisMinute = this.calls.filter(
            c => c.model === normalizedModel && c.timestamp > minuteAgo
        ).length;

        return {
            model: normalizedModel,
            callsThisMinute,
            limitPerMinute: limits.rpm,
            percentUsed: Math.round((callsThisMinute / limits.rpm) * 100),
            isNearLimit: callsThisMinute >= limits.rpm * 0.8,
            isAtLimit: callsThisMinute >= limits.rpm
        };
    }

    /**
     * Check if we're rate limited
     */
    isRateLimited(model: string): boolean {
        return this.getRateLimitInfo(model).isAtLimit;
    }

    /**
     * Subscribe to updates
     */
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener());
    }

    private normalizeModel(model: string): string {
        // Handle model name variations
        if (model.includes('gemini-2.5-flash-image')) return 'gemini-2.5-flash-image';
        if (model.includes('gemini-2.5-flash')) return 'gemini-2.5-flash';
        if (model.includes('gemini-2.5-flash')) return 'gemini-2.5-flash';
        if (model.includes('embedding')) return 'text-embedding-004';
        return model;
    }

    /**
     * Reset all tracking (for debugging)
     */
    reset() {
        this.calls = [];
        this.notifyListeners();
    }
}

// Singleton instance
export const apiUsageService = new ApiUsageService();
