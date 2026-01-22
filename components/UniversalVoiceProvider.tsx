/**
 * UNIVERSAL VOICE PROVIDER
 *
 * Initializes the universal voice hooks system and provides
 * real-time UI awareness to the voice system.
 *
 * Add this component once at the app root - it automatically
 * makes ALL interactive elements voice-controllable.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { universalVoice, type VoiceSnapshot } from '../services/universalVoiceHooks';
import { useSystemMind } from '../stores/useSystemMind';

interface UniversalVoiceProviderProps {
    /** Show debug overlay (default: false) */
    showDebug?: boolean;
    /** Auto-start on mount (default: true) */
    autoStart?: boolean;
}

const UniversalVoiceProvider: React.FC<UniversalVoiceProviderProps> = ({
    showDebug = false,
    autoStart = true
}) => {
    const [snapshot, setSnapshot] = useState<VoiceSnapshot | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const uplinkData = useSystemMind(s => s.uplinkData);

    // Start universal voice service
    useEffect(() => {
        if (autoStart) {
            universalVoice.start();

            // Subscribe to updates
            const unsubscribe = universalVoice.subscribe((newSnapshot) => {
                setSnapshot(newSnapshot);

                // Uplink to SystemMind for AI context
                uplinkData('universal-voice-ui', {
                    summary: universalVoice.getSummary(),
                    inputCount: newSnapshot.inputs.length,
                    buttonCount: newSnapshot.buttons.length,
                    tabCount: newSnapshot.tabs.length,
                    topInputs: newSnapshot.inputs.slice(0, 5).map(i => ({ id: i.id, label: i.label })),
                    topButtons: newSnapshot.buttons.slice(0, 5).map(b => ({ id: b.id, label: b.label })),
                    tabs: newSnapshot.tabs.map(t => ({ id: t.id, label: t.label }))
                });
            });

            // Initial snapshot
            setSnapshot(universalVoice.getSnapshot());

            return () => {
                unsubscribe();
            };
        }
    }, [autoStart, uplinkData]);

    // Keyboard shortcut for debug toggle
    useEffect(() => {
        if (!showDebug) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                setIsExpanded(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showDebug]);

    // Refresh handler
    const handleRefresh = useCallback(() => {
        setSnapshot(universalVoice.refresh());
    }, []);

    // Don't render anything if debug is off
    if (!showDebug || !snapshot) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: isExpanded ? '10px' : '60px',
            left: '10px',
            background: 'rgba(0, 20, 40, 0.95)',
            color: '#00ffcc',
            padding: '8px 12px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '10px',
            zIndex: 10000,
            border: '1px solid #00ffcc33',
            maxWidth: isExpanded ? '400px' : '200px',
            maxHeight: isExpanded ? '500px' : '80px',
            overflow: 'auto',
            transition: 'all 0.2s ease'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
            }}>
                <span style={{ fontWeight: 'bold', color: '#00ff88' }}>
                    🎤 Universal Voice
                </span>
                <div>
                    <button
                        onClick={handleRefresh}
                        style={{
                            background: 'none',
                            border: '1px solid #00ffcc44',
                            color: '#00ffcc',
                            padding: '2px 6px',
                            marginRight: '4px',
                            cursor: 'pointer',
                            fontSize: '9px'
                        }}
                    >
                        ↻
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            background: 'none',
                            border: '1px solid #00ffcc44',
                            color: '#00ffcc',
                            padding: '2px 6px',
                            cursor: 'pointer',
                            fontSize: '9px'
                        }}
                    >
                        {isExpanded ? '−' : '+'}
                    </button>
                </div>
            </div>

            <div style={{ color: '#888', marginBottom: '4px' }}>
                {snapshot.summary}
            </div>

            {isExpanded && (
                <>
                    <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
                        <div style={{ color: '#ffcc00', marginBottom: '4px' }}>Inputs:</div>
                        {snapshot.inputs.slice(0, 8).map((input, i) => (
                            <div key={i} style={{ color: '#aaa', paddingLeft: '8px', fontSize: '9px' }}>
                                • <span style={{ color: '#00ccff' }}>{input.id}</span>: {input.label}
                                {input.value && <span style={{ color: '#666' }}> = "{input.value.slice(0, 20)}"</span>}
                            </div>
                        ))}
                        {snapshot.inputs.length > 8 && (
                            <div style={{ color: '#666', paddingLeft: '8px' }}>...+{snapshot.inputs.length - 8} more</div>
                        )}
                    </div>

                    <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
                        <div style={{ color: '#ff8800', marginBottom: '4px' }}>Buttons:</div>
                        {snapshot.buttons.slice(0, 8).map((btn, i) => (
                            <div key={i} style={{ color: '#aaa', paddingLeft: '8px', fontSize: '9px' }}>
                                • <span style={{ color: '#ff8800' }}>{btn.id}</span>: {btn.label}
                            </div>
                        ))}
                        {snapshot.buttons.length > 8 && (
                            <div style={{ color: '#666', paddingLeft: '8px' }}>...+{snapshot.buttons.length - 8} more</div>
                        )}
                    </div>

                    {snapshot.tabs.length > 0 && (
                        <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
                            <div style={{ color: '#cc00ff', marginBottom: '4px' }}>Tabs:</div>
                            {snapshot.tabs.map((tab, i) => (
                                <div key={i} style={{ color: '#aaa', paddingLeft: '8px', fontSize: '9px' }}>
                                    • <span style={{ color: '#cc00ff' }}>{tab.id}</span>: {tab.label}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px', color: '#666', fontSize: '9px' }}>
                        Ctrl+Shift+V to toggle | Refresh to rescan
                    </div>
                </>
            )}
        </div>
    );
};

export default UniversalVoiceProvider;
