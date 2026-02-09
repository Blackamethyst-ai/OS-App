/**
 * Infracost API Service
 *
 * Fetches cloud GPU instance pricing for major providers.
 * Uses the free Infracost Cloud Pricing API.
 *
 * API Docs: https://www.infracost.io/docs/cloud_pricing_api/
 * GraphQL Endpoint: https://pricing.api.infracost.io/graphql
 */

import { apiKeyService } from './apiKeyService';

const INFRACOST_API_URL = 'https://pricing.api.infracost.io/graphql';

// Cache for pricing data (1 hour TTL)
const CACHE_TTL = 60 * 60 * 1000;
const pricingCache: Map<string, { data: CloudGpuPricing; timestamp: number }> = new Map();

export interface CloudGpuPricing {
    provider: 'aws' | 'gcp' | 'azure';
    region: string;
    instanceType: string;
    gpuModel: string;
    gpuCount: number;
    hourlyPrice: number;
    spotPrice?: number;
    monthlyEstimate: number;
    currency: string;
}

export interface CloudProviderPricing {
    aws: CloudGpuPricing[];
    gcp: CloudGpuPricing[];
    azure: CloudGpuPricing[];
}

// GPU model to instance type mapping
const GPU_INSTANCE_MAPPING: Record<string, { aws?: string[]; gcp?: string[]; azure?: string[] }> = {
    'A100': {
        aws: ['p4d.24xlarge', 'p4de.24xlarge'],
        gcp: ['a2-highgpu-1g', 'a2-highgpu-2g', 'a2-highgpu-4g', 'a2-highgpu-8g'],
        azure: ['Standard_ND96asr_v4', 'Standard_ND96amsr_A100_v4']
    },
    'V100': {
        aws: ['p3.2xlarge', 'p3.8xlarge', 'p3.16xlarge'],
        gcp: ['n1-standard-8-nvidia-tesla-v100'],
        azure: ['Standard_NC6s_v3', 'Standard_NC12s_v3', 'Standard_NC24s_v3']
    },
    'T4': {
        aws: ['g4dn.xlarge', 'g4dn.2xlarge', 'g4dn.4xlarge', 'g4dn.8xlarge'],
        gcp: ['n1-standard-4-nvidia-tesla-t4'],
        azure: ['Standard_NC4as_T4_v3', 'Standard_NC8as_T4_v3', 'Standard_NC16as_T4_v3']
    },
    'H100': {
        aws: ['p5.48xlarge'],
        gcp: ['a3-highgpu-8g'],
        azure: ['Standard_ND96isr_H100_v5']
    },
    'L4': {
        aws: ['g6.xlarge', 'g6.2xlarge', 'g6.4xlarge'],
        gcp: ['g2-standard-4', 'g2-standard-8', 'g2-standard-16']
    }
};

/**
 * Get the API key
 */
function getApiKey(): string | null {
    return apiKeyService.getKey('infracost') || null;
}

/**
 * Check if API key is configured
 */
export function hasApiKey(): boolean {
    return !!getApiKey();
}

/**
 * Execute GraphQL query against Infracost API
 */
async function executeQuery<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Infracost API key not configured');
    }

    const response = await fetch(INFRACOST_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
        },
        body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
        throw new Error(`Infracost API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`Infracost GraphQL error: ${result.errors[0].message}`);
    }

    return result.data;
}

/**
 * Get AWS GPU instance pricing
 */
async function getAwsPricing(instanceTypes: string[], region: string = 'us-east-1'): Promise<CloudGpuPricing[]> {
    const query = `
        query GetAwsPrices($filter: ProductFilter!) {
            products(filter: $filter) {
                productHash
                vendorName
                region
                sku
                attributes
                prices(filter: { purchaseOption: "on_demand" }) {
                    USD
                }
            }
        }
    `;

    const results: CloudGpuPricing[] = [];

    for (const instanceType of instanceTypes) {
        try {
            const data = await executeQuery<any>(query, {
                filter: {
                    vendorName: 'aws',
                    service: 'AmazonEC2',
                    region,
                    attributeFilters: [
                        { key: 'instanceType', value: instanceType },
                        { key: 'tenancy', value: 'Shared' },
                        { key: 'operatingSystem', value: 'Linux' }
                    ]
                }
            });

            if (data.products && data.products.length > 0) {
                const product = data.products[0];
                const hourlyPrice = parseFloat(product.prices[0]?.USD || '0');

                results.push({
                    provider: 'aws',
                    region,
                    instanceType,
                    gpuModel: extractGpuModel(instanceType, 'aws'),
                    gpuCount: extractGpuCount(instanceType, 'aws'),
                    hourlyPrice,
                    monthlyEstimate: hourlyPrice * 730, // ~730 hours/month
                    currency: 'USD'
                });
            }
        } catch (error) {
            console.warn(`[Infracost] Failed to get AWS pricing for ${instanceType}:`, error);
        }
    }

    return results;
}

/**
 * Get GCP GPU instance pricing
 */
async function getGcpPricing(machineTypes: string[], region: string = 'us-central1'): Promise<CloudGpuPricing[]> {
    const query = `
        query GetGcpPrices($filter: ProductFilter!) {
            products(filter: $filter) {
                productHash
                vendorName
                region
                sku
                attributes
                prices(filter: { purchaseOption: "on_demand" }) {
                    USD
                }
            }
        }
    `;

    const results: CloudGpuPricing[] = [];

    for (const machineType of machineTypes) {
        try {
            const data = await executeQuery<any>(query, {
                filter: {
                    vendorName: 'gcp',
                    service: 'Compute Engine',
                    region,
                    attributeFilters: [
                        { key: 'machineType', value: machineType }
                    ]
                }
            });

            if (data.products && data.products.length > 0) {
                const product = data.products[0];
                const hourlyPrice = parseFloat(product.prices[0]?.USD || '0');

                results.push({
                    provider: 'gcp',
                    region,
                    instanceType: machineType,
                    gpuModel: extractGpuModel(machineType, 'gcp'),
                    gpuCount: extractGpuCount(machineType, 'gcp'),
                    hourlyPrice,
                    monthlyEstimate: hourlyPrice * 730,
                    currency: 'USD'
                });
            }
        } catch (error) {
            console.warn(`[Infracost] Failed to get GCP pricing for ${machineType}:`, error);
        }
    }

    return results;
}

/**
 * Extract GPU model from instance type
 */
function extractGpuModel(instanceType: string, provider: string): string {
    const mapping: Record<string, string> = {
        // AWS
        'p4d': 'A100',
        'p4de': 'A100',
        'p5': 'H100',
        'p3': 'V100',
        'g4dn': 'T4',
        'g5': 'A10G',
        'g6': 'L4',
        // GCP
        'a2': 'A100',
        'a3': 'H100',
        'g2': 'L4',
        'v100': 'V100',
        't4': 'T4'
    };

    const lower = instanceType.toLowerCase();
    for (const [key, model] of Object.entries(mapping)) {
        if (lower.includes(key)) {
            return model;
        }
    }
    return 'Unknown';
}

/**
 * Extract GPU count from instance type
 */
function extractGpuCount(instanceType: string, provider: string): number {
    // AWS patterns
    if (instanceType.includes('xlarge')) {
        const match = instanceType.match(/(\d+)?xlarge/);
        if (match && match[1]) {
            return Math.ceil(parseInt(match[1]) / 2);
        }
        return 1;
    }

    // GCP patterns
    const gpuMatch = instanceType.match(/(\d+)g$/);
    if (gpuMatch) {
        return parseInt(gpuMatch[1]);
    }

    return 1;
}

/**
 * Get cloud GPU pricing for a specific GPU model
 *
 * @param gpuModel - GPU model name (e.g., 'A100', 'V100', 'H100')
 * @param region - Cloud region (default: us-east-1 for AWS)
 * @returns Pricing from all providers
 */
export async function getCloudGpuPricing(
    gpuModel: string,
    region?: string
): Promise<CloudProviderPricing> {
    // Check cache
    const cacheKey = `${gpuModel}-${region || 'default'}`;
    const cached = pricingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data as unknown as CloudProviderPricing;
    }

    const mapping = GPU_INSTANCE_MAPPING[gpuModel.toUpperCase()];
    if (!mapping) {
        if (import.meta.env.DEV) console.log(`[Infracost] No instance mapping for GPU model: ${gpuModel}`);
        return { aws: [], gcp: [], azure: [] };
    }

    const result: CloudProviderPricing = {
        aws: [],
        gcp: [],
        azure: []
    };

    if (!hasApiKey()) {
        if (import.meta.env.DEV) console.log('[Infracost] API key not configured, returning static pricing');
        return getStaticPricing(gpuModel);
    }

    try {
        const [awsPricing, gcpPricing] = await Promise.allSettled([
            mapping.aws ? getAwsPricing(mapping.aws, region || 'us-east-1') : Promise.resolve([]),
            mapping.gcp ? getGcpPricing(mapping.gcp, region || 'us-central1') : Promise.resolve([])
        ]);

        if (awsPricing.status === 'fulfilled') {
            result.aws = awsPricing.value;
        }
        if (gcpPricing.status === 'fulfilled') {
            result.gcp = gcpPricing.value;
        }

        // Cache result
        pricingCache.set(cacheKey, { data: result as any, timestamp: Date.now() });

        return result;
    } catch (error) {
        console.error('[Infracost] Error fetching cloud pricing:', error);
        return getStaticPricing(gpuModel);
    }
}

/**
 * Get static pricing as fallback (when API is unavailable)
 */
function getStaticPricing(gpuModel: string): CloudProviderPricing {
    // Static pricing estimates (as of Jan 2026)
    const staticPrices: Record<string, CloudProviderPricing> = {
        'A100': {
            aws: [{
                provider: 'aws',
                region: 'us-east-1',
                instanceType: 'p4d.24xlarge',
                gpuModel: 'A100',
                gpuCount: 8,
                hourlyPrice: 32.77,
                monthlyEstimate: 23922.10,
                currency: 'USD'
            }],
            gcp: [{
                provider: 'gcp',
                region: 'us-central1',
                instanceType: 'a2-highgpu-1g',
                gpuModel: 'A100',
                gpuCount: 1,
                hourlyPrice: 3.67,
                monthlyEstimate: 2679.10,
                currency: 'USD'
            }],
            azure: [{
                provider: 'azure',
                region: 'eastus',
                instanceType: 'Standard_ND96asr_v4',
                gpuModel: 'A100',
                gpuCount: 8,
                hourlyPrice: 27.20,
                monthlyEstimate: 19856.00,
                currency: 'USD'
            }]
        },
        'H100': {
            aws: [{
                provider: 'aws',
                region: 'us-east-1',
                instanceType: 'p5.48xlarge',
                gpuModel: 'H100',
                gpuCount: 8,
                hourlyPrice: 98.32,
                monthlyEstimate: 71773.60,
                currency: 'USD'
            }],
            gcp: [{
                provider: 'gcp',
                region: 'us-central1',
                instanceType: 'a3-highgpu-8g',
                gpuModel: 'H100',
                gpuCount: 8,
                hourlyPrice: 101.22,
                monthlyEstimate: 73890.60,
                currency: 'USD'
            }],
            azure: [{
                provider: 'azure',
                region: 'eastus',
                instanceType: 'Standard_ND96isr_H100_v5',
                gpuModel: 'H100',
                gpuCount: 8,
                hourlyPrice: 98.00,
                monthlyEstimate: 71540.00,
                currency: 'USD'
            }]
        },
        'V100': {
            aws: [{
                provider: 'aws',
                region: 'us-east-1',
                instanceType: 'p3.2xlarge',
                gpuModel: 'V100',
                gpuCount: 1,
                hourlyPrice: 3.06,
                monthlyEstimate: 2233.80,
                currency: 'USD'
            }],
            gcp: [{
                provider: 'gcp',
                region: 'us-central1',
                instanceType: 'n1-standard-8-nvidia-tesla-v100',
                gpuModel: 'V100',
                gpuCount: 1,
                hourlyPrice: 2.48,
                monthlyEstimate: 1810.40,
                currency: 'USD'
            }],
            azure: [{
                provider: 'azure',
                region: 'eastus',
                instanceType: 'Standard_NC6s_v3',
                gpuModel: 'V100',
                gpuCount: 1,
                hourlyPrice: 3.06,
                monthlyEstimate: 2233.80,
                currency: 'USD'
            }]
        },
        'T4': {
            aws: [{
                provider: 'aws',
                region: 'us-east-1',
                instanceType: 'g4dn.xlarge',
                gpuModel: 'T4',
                gpuCount: 1,
                hourlyPrice: 0.526,
                monthlyEstimate: 383.98,
                currency: 'USD'
            }],
            gcp: [{
                provider: 'gcp',
                region: 'us-central1',
                instanceType: 'n1-standard-4-nvidia-tesla-t4',
                gpuModel: 'T4',
                gpuCount: 1,
                hourlyPrice: 0.35,
                monthlyEstimate: 255.50,
                currency: 'USD'
            }],
            azure: [{
                provider: 'azure',
                region: 'eastus',
                instanceType: 'Standard_NC4as_T4_v3',
                gpuModel: 'T4',
                gpuCount: 1,
                hourlyPrice: 0.526,
                monthlyEstimate: 383.98,
                currency: 'USD'
            }]
        }
    };

    return staticPrices[gpuModel.toUpperCase()] || { aws: [], gcp: [], azure: [] };
}

/**
 * Get cost comparison between buying GPU vs cloud rental
 *
 * @param gpuModel - GPU model
 * @param purchasePrice - Price to buy the GPU
 * @param hoursPerMonth - Expected usage hours per month
 * @returns Break-even analysis
 */
export function calculateBreakeven(
    gpuModel: string,
    purchasePrice: number,
    hoursPerMonth: number = 730
): {
    cloudMonthlyCost: number;
    monthsToBreakeven: number;
    recommendation: 'buy' | 'rent' | 'depends';
    analysis: string;
} {
    const cloudPricing = getStaticPricing(gpuModel);

    // Get cheapest cloud option
    const allOptions = [...cloudPricing.aws, ...cloudPricing.gcp, ...cloudPricing.azure];
    if (allOptions.length === 0) {
        return {
            cloudMonthlyCost: 0,
            monthsToBreakeven: 0,
            recommendation: 'buy',
            analysis: 'No cloud pricing available for comparison'
        };
    }

    const cheapest = allOptions.reduce((a, b) =>
        a.hourlyPrice < b.hourlyPrice ? a : b
    );

    const cloudMonthlyCost = cheapest.hourlyPrice * hoursPerMonth;
    const monthsToBreakeven = purchasePrice / cloudMonthlyCost;

    let recommendation: 'buy' | 'rent' | 'depends';
    let analysis: string;

    if (monthsToBreakeven <= 6) {
        recommendation = 'buy';
        analysis = `Break-even in ${monthsToBreakeven.toFixed(1)} months. Buying is cost-effective for long-term use.`;
    } else if (monthsToBreakeven <= 18) {
        recommendation = 'depends';
        analysis = `Break-even in ${monthsToBreakeven.toFixed(1)} months. Consider usage duration and maintenance costs.`;
    } else {
        recommendation = 'rent';
        analysis = `Break-even in ${monthsToBreakeven.toFixed(1)} months. Cloud rental may be more economical for short-term use.`;
    }

    return {
        cloudMonthlyCost: Math.round(cloudMonthlyCost),
        monthsToBreakeven: Math.round(monthsToBreakeven * 10) / 10,
        recommendation,
        analysis
    };
}

/**
 * Clear pricing cache
 */
export function clearCache(): void {
    pricingCache.clear();
    if (import.meta.env.DEV) console.log('[Infracost] Cache cleared');
}
