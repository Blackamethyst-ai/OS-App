export interface EconomicProtocol {
    id: string;
    type: 'SWAP' | 'MINT' | 'STAKE' | 'LEND' | 'ARB';
    status: 'ACTIVE' | 'PENDING' | 'HALTED';
    volume: string;
    yield?: string;
}

export interface InterventionProtocol {
    id: string;
    title: string;
    context: string;
    logic: string;
    steps: string[];
    physicalImpact: string;
    timestamp: number;
}

export interface AgentWallet {
    id: string;
    address: string;
    balance: string;
    assets: { symbol: string; value: string }[];
}

export interface MetaventionsState {
    layers: {
        id: string;
        name: string;
        role: string;
        leverage: string;
        status: string;
        level: number;
        metrics: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[];
    }[];
    activeLayerId: string;
    isAnalyzing: boolean;
    strategyLog: string[];
    strategyLibrary: InterventionProtocol[];
    wallets: AgentWallet[];
    economicProtocols: EconomicProtocol[];
}
