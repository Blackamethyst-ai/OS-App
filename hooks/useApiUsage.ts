/**
 * useApiUsage Hook
 * React hook for subscribing to API usage statistics.
 */
import { useState, useEffect, useCallback } from 'react';
import { apiUsageService, ApiUsageStats } from '../services/apiUsageService';

export function useApiUsage() {
    const [stats, setStats] = useState<ApiUsageStats>(() => apiUsageService.getStats());

    useEffect(() => {
        // Subscribe to updates
        const unsubscribe = apiUsageService.subscribe(() => {
            setStats(apiUsageService.getStats());
        });

        // Refresh every 10 seconds for realtime feel
        const interval = setInterval(() => {
            setStats(apiUsageService.getStats());
        }, 10000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const getRateLimitInfo = useCallback((model: string) => {
        return apiUsageService.getRateLimitInfo(model);
    }, []);

    const isRateLimited = useCallback((model: string) => {
        return apiUsageService.isRateLimited(model);
    }, []);

    return {
        stats,
        getRateLimitInfo,
        isRateLimited
    };
}
