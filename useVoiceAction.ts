
import { useEffect, useRef } from 'react';
import { useSystemMind } from '../stores/useSystemMind';

/**
 * Registers a functional capability with the Voice Core.
 * The AI can trigger this function using the `execute_component_action` tool.
 * 
 * @param id Unique identifier for the action (e.g., 'generate_identity', 'scan_network')
 * @param description Natural language description of what the action does (for the AI)
 * @param callback The function to execute
 */
export const useVoiceAction = (id: string, description: string, callback: (args: any) => void | Promise<void>) => {
    const registerAction = useSystemMind((state) => state.registerAction);
    const unregisterAction = useSystemMind((state) => state.unregisterAction);
    
    // Keep latest callback ref to avoid re-registering effect loop if callback isn't memoized
    const callbackRef = useRef(callback);
    
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        // Register with a stable proxy caller
        registerAction(id, description, (args) => callbackRef.current(args));
        
        return () => {
            unregisterAction(id);
        };
    }, [id, description, registerAction, unregisterAction]);
};
