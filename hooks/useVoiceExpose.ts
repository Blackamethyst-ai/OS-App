
import { useEffect, useRef } from 'react';
import useSystemMind from '../stores/useSystemMind';

/**
 * Connects a component to the Voice Core.
 * @param id Unique identifier (e.g., 'energy-chart-1')
 * @param data The data object to expose to the AI
 */
export const useVoiceExpose = (id: string, data: any) => {
  const uplinkData = useSystemMind((state) => state.uplinkData);
  const severUplink = useSystemMind((state) => state.severUplink);
  
  // Ref helps prevent infinite loops if data object reference changes but content is same
  const prevData = useRef<string>("");

  useEffect(() => {
    const dataString = JSON.stringify(data);
    
    // Only update if data has genuinely changed
    if (prevData.current !== dataString) {
      uplinkData(id, data);
      prevData.current = dataString;
    }

    // Cleanup when component unmounts (tab switch)
    return () => {
      severUplink(id);
    };
  }, [id, JSON.stringify(data), uplinkData, severUplink]);
};
