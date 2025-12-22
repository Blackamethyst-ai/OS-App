
import { useAppStore } from '../store';
import { AppMode, PeerPresence, SwarmEvent } from '../types';

const MOCK_PEER_NAMES = ['AlphaNode', 'BinaryArch', 'ZeroVector', 'NexusOne', 'VoidWalker', 'SyntaxError', 'KernelRoot'];
const MOCK_ROLES = ['Architect', 'Sentinel', 'Netrunner', 'Operator'];
const MOCK_COLORS = ['#9d4edd', '#22d3ee', '#10b981', '#ef4444', '#f59e0b', '#ec4899'];

class CollaborationService {
    private interval: number | null = null;

    public init() {
        console.log('[CollabService] Synchronizing with Peer Mesh...');
        
        // Initial set of peers
        this.syncPeers();
        
        // Start simulation loop
        this.interval = window.setInterval(() => {
            this.simulateNetworkActivity();
        }, 8000);
    }

    private syncPeers() {
        const { setCollabState } = useAppStore.getState();
        const initialPeers: PeerPresence[] = Array.from({ length: 3 + Math.floor(Math.random() * 4) }).map((_, i) => ({
            id: `peer-${i}`,
            name: MOCK_PEER_NAMES[Math.floor(Math.random() * MOCK_PEER_NAMES.length)],
            role: MOCK_ROLES[Math.floor(Math.random() * MOCK_ROLES.length)],
            activeSector: Object.values(AppMode)[Math.floor(Math.random() * Object.values(AppMode).length)],
            status: Math.random() > 0.3 ? 'ACTIVE' : 'IDLE',
            lastSeen: Date.now(),
            color: MOCK_COLORS[Math.floor(Math.random() * MOCK_COLORS.length)]
        }));

        setCollabState({ peers: initialPeers });
    }

    private simulateNetworkActivity() {
        const { setCollabState, addSwarmEvent, collaboration, addLog } = useAppStore.getState();
        const rand = Math.random();

        // 1. Peer Sector Migration
        if (rand > 0.7 && collaboration.peers.length > 0) {
            const peerIdx = Math.floor(Math.random() * collaboration.peers.length);
            const peer = collaboration.peers[peerIdx];
            const nextSector = Object.values(AppMode)[Math.floor(Math.random() * Object.values(AppMode).length)];
            
            setCollabState(prev => ({
                peers: prev.peers.map((p, i) => i === peerIdx ? { ...p, activeSector: nextSector, lastSeen: Date.now() } : p)
            }));

            addSwarmEvent({
                userId: peer.id,
                userName: peer.name,
                action: `Migrated to ${nextSector}`,
                target: nextSector
            });
        }

        // 2. Swarm Action
        if (rand < 0.3 && collaboration.peers.length > 0) {
            const peer = collaboration.peers[Math.floor(Math.random() * collaboration.peers.length)];
            const actions = ['Optimized Lattice', 'Synchronized Vault', 'Generated Asset', 'Executed Directive', 'Refactored Logic'];
            const action = actions[Math.floor(Math.random() * actions.length)];

            addSwarmEvent({
                userId: peer.id,
                userName: peer.name,
                action: action
            });

            // Occasional system log from peers
            if (Math.random() > 0.8) {
                addLog('SYSTEM', `SWARM_SIGNAL: ${peer.name} successfully ${action.toLowerCase()}.`);
            }
        }
        
        // 3. New Peer Arrival / Departure
        if (rand > 0.95) {
            this.syncPeers();
        }
    }

    public disconnect() {
        if (this.interval) clearInterval(this.interval);
    }
}

export const collabService = new CollaborationService();
