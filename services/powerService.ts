/**
 * POWER MANAGEMENT SERVICE
 * 
 * Controls compute budget, feature toggles, and power modes.
 * Enables/disables expensive AI features based on user preferences and budget.
 */

export type PowerMode = 'ECO' | 'BALANCED' | 'OVERDRIVE' | 'CUSTOM';

export interface FeatureToggles {
    dreamProtocol: boolean;
    multiAgentSwarm: boolean;
    memoryRAG: boolean;
    autoEvolution: boolean;
    continuousMonitor: boolean;
    proactiveInsights: boolean;
}

export interface UsageStats {
    tokensUsedToday: number;
    estimatedCostToday: number;
    tokensUsedMonth: number;
    estimatedCostMonth: number;
    lastReset: number;
}

export interface PowerConfig {
    mode: PowerMode;
    features: FeatureToggles;
    budget: {
        dailyLimit: number;  // in dollars
        monthlyLimit: number;
        alertThreshold: number; // 0-1, when to warn
    };
    usage: UsageStats;
}

// Preset configurations
const POWER_PRESETS: Record<Exclude<PowerMode, 'CUSTOM'>, FeatureToggles> = {
    ECO: {
        dreamProtocol: false,
        multiAgentSwarm: false,
        memoryRAG: false,
        autoEvolution: false,
        continuousMonitor: false,
        proactiveInsights: false
    },
    BALANCED: {
        dreamProtocol: false,
        multiAgentSwarm: false,
        memoryRAG: true,
        autoEvolution: false,
        continuousMonitor: false,
        proactiveInsights: true
    },
    OVERDRIVE: {
        dreamProtocol: true,
        multiAgentSwarm: true,
        memoryRAG: true,
        autoEvolution: true,
        continuousMonitor: true,
        proactiveInsights: true
    }
};

// Cost estimates per feature per call (in dollars)
const FEATURE_COSTS: Record<keyof FeatureToggles, number> = {
    dreamProtocol: 0.05,      // Per session
    multiAgentSwarm: 0.02,    // Per query (12 agents)
    memoryRAG: 0.005,         // Per retrieval
    autoEvolution: 0.01,      // Per cycle
    continuousMonitor: 0.0002, // Per check
    proactiveInsights: 0.003  // Per insight
};

const STORAGE_KEY = 'sovereign_power_config';

class PowerManagementService {
    private config: PowerConfig;
    private listeners: Set<(config: PowerConfig) => void> = new Set();

    constructor() {
        this.config = this.loadConfig();
        this.checkDailyReset();
    }

    private loadConfig(): PowerConfig {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migrate old configs if needed
                return { ...this.getDefaultConfig(), ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load power config:', e);
        }
        return this.getDefaultConfig();
    }

    private getDefaultConfig(): PowerConfig {
        return {
            mode: 'BALANCED',
            features: { ...POWER_PRESETS.BALANCED },
            budget: {
                dailyLimit: 5.00,
                monthlyLimit: 50.00,
                alertThreshold: 0.8
            },
            usage: {
                tokensUsedToday: 0,
                estimatedCostToday: 0,
                tokensUsedMonth: 0,
                estimatedCostMonth: 0,
                lastReset: Date.now()
            }
        };
    }

    private save(): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        this.notifyListeners();
    }

    private notifyListeners(): void {
        this.listeners.forEach(fn => fn(this.config));
    }

    private checkDailyReset(): void {
        const now = new Date();
        const lastReset = new Date(this.config.usage.lastReset);

        // Reset daily if it's a new day
        if (now.toDateString() !== lastReset.toDateString()) {
            this.config.usage.tokensUsedToday = 0;
            this.config.usage.estimatedCostToday = 0;
            this.config.usage.lastReset = Date.now();

            // Reset monthly if new month
            if (now.getMonth() !== lastReset.getMonth()) {
                this.config.usage.tokensUsedMonth = 0;
                this.config.usage.estimatedCostMonth = 0;
            }

            this.save();
        }
    }

    // --- PUBLIC API ---

    /**
     * Get current power configuration
     */
    getConfig(): PowerConfig {
        this.checkDailyReset();
        return { ...this.config };
    }

    /**
     * Set power mode (ECO, BALANCED, OVERDRIVE)
     */
    setMode(mode: PowerMode): void {
        this.config.mode = mode;
        if (mode !== 'CUSTOM') {
            this.config.features = { ...POWER_PRESETS[mode] };
        }
        this.save();
        if (import.meta.env.DEV) console.log(`⚡ POWER: Mode set to ${mode}`);
    }

    /**
     * Toggle a specific feature
     */
    toggleFeature(feature: keyof FeatureToggles, enabled: boolean): void {
        this.config.features[feature] = enabled;
        this.config.mode = 'CUSTOM'; // Switch to custom when manually toggling
        this.save();
        if (import.meta.env.DEV) console.log(`⚡ POWER: ${feature} ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if a feature is enabled
     */
    isEnabled(feature: keyof FeatureToggles): boolean {
        // Even if enabled, check budget
        if (this.isBudgetExceeded()) {
            return false;
        }
        return this.config.features[feature];
    }

    /**
     * Check if budget is exceeded
     */
    isBudgetExceeded(): boolean {
        return this.config.usage.estimatedCostToday >= this.config.budget.dailyLimit;
    }

    /**
     * Check if approaching budget limit
     */
    isApproachingLimit(): boolean {
        const threshold = this.config.budget.dailyLimit * this.config.budget.alertThreshold;
        return this.config.usage.estimatedCostToday >= threshold;
    }

    /**
     * Record usage of a feature
     */
    recordUsage(feature: keyof FeatureToggles, tokens: number = 1000): void {
        const cost = FEATURE_COSTS[feature];

        this.config.usage.tokensUsedToday += tokens;
        this.config.usage.estimatedCostToday += cost;
        this.config.usage.tokensUsedMonth += tokens;
        this.config.usage.estimatedCostMonth += cost;

        this.save();

        // Auto-throttle if budget exceeded
        if (this.isBudgetExceeded()) {
            console.warn('⚡ POWER: Daily budget exceeded, switching to ECO mode');
            this.setMode('ECO');
        }
    }

    /**
     * Update budget settings
     */
    setBudget(daily: number, monthly: number, alertThreshold: number = 0.8): void {
        this.config.budget = { dailyLimit: daily, monthlyLimit: monthly, alertThreshold };
        this.save();
    }

    /**
     * Subscribe to config changes
     */
    subscribe(callback: (config: PowerConfig) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Get usage percentage (for progress bars)
     */
    getDailyUsagePercent(): number {
        return Math.min(100, (this.config.usage.estimatedCostToday / this.config.budget.dailyLimit) * 100);
    }

    /**
     * Get formatted cost string
     */
    getFormattedDailyCost(): string {
        return `$${this.config.usage.estimatedCostToday.toFixed(2)}`;
    }

    /**
     * Get formatted budget string
     */
    getFormattedDailyBudget(): string {
        return `$${this.config.budget.dailyLimit.toFixed(2)}`;
    }

    /**
     * Reset usage stats (for testing)
     */
    resetUsage(): void {
        this.config.usage = {
            tokensUsedToday: 0,
            estimatedCostToday: 0,
            tokensUsedMonth: 0,
            estimatedCostMonth: 0,
            lastReset: Date.now()
        };
        this.save();
    }
}

// Singleton export
export const powerService = new PowerManagementService();
