import { logger } from './logger';

export function reportWebVitals() {
    if (typeof window === 'undefined') return;

    // Use PerformanceObserver for Core Web Vitals
    try {
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcp = entries[entries.length - 1];
            logger.info(`[WebVitals] LCP: ${Math.round(lcp.startTime)}ms`, undefined, 'Performance');
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // First Input Delay
        new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
                logger.info(`[WebVitals] FID: ${Math.round(entry.processingStart - entry.startTime)}ms`, undefined, 'Performance');
            });
        }).observe({ type: 'first-input', buffered: true });

        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
                if (!entry.hadRecentInput) clsValue += entry.value;
            }
            logger.info(`[WebVitals] CLS: ${clsValue.toFixed(3)}`, undefined, 'Performance');
        }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
        // PerformanceObserver not supported
    }
}
