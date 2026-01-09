/**
 * useFixationGlow Hook
 *
 * Listens for biometric-fixation events and applies glow effects
 * to DOM elements via data attributes. The CSS in adaptive-ui.css
 * handles the actual styling.
 *
 * Usage:
 * 1. Add `data-biometric-id="unique-id"` to elements you want to track
 * 2. Call `useFixationGlow()` in your root component
 * 3. Elements will automatically glow when gazed at
 */

import { useEffect, useRef } from 'react';

interface FixationEvent {
  elementId: string;
  isFixating: boolean;
  duration: number; // ms
}

export const useFixationGlow = () => {
  const currentElementRef = useRef<Element | null>(null);
  const fixationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleFixation = (event: CustomEvent<FixationEvent>) => {
      const { elementId, isFixating, duration } = event.detail;

      // Clear any pending timeout
      if (fixationTimeoutRef.current) {
        clearTimeout(fixationTimeoutRef.current);
        fixationTimeoutRef.current = null;
      }

      // Find element by ID or data-biometric-id
      const element =
        document.getElementById(elementId) ||
        document.querySelector(`[data-biometric-id="${elementId}"]`);

      // Clear previous element if different
      if (currentElementRef.current && currentElementRef.current !== element) {
        clearGlowAttributes(currentElementRef.current);
      }

      if (!element) return;

      if (isFixating) {
        // Apply glow attributes
        element.setAttribute('data-biometric-fixating', 'true');

        // Set intensity level based on duration
        const level = getFixationLevel(duration);
        element.setAttribute('data-biometric-fixation-level', level.toString());

        // Set locked state for long fixations (2+ seconds)
        if (duration >= 2000) {
          element.setAttribute('data-biometric-fixation-locked', 'true');
        } else {
          element.removeAttribute('data-biometric-fixation-locked');
        }

        currentElementRef.current = element;
      } else {
        // Delay removal for smooth transition
        fixationTimeoutRef.current = window.setTimeout(() => {
          clearGlowAttributes(element);
          if (currentElementRef.current === element) {
            currentElementRef.current = null;
          }
        }, 150);
      }
    };

    // Also emit gaze position events for the reticle
    const handleGazeUpdate = (event: CustomEvent) => {
      const gazeEvent = new CustomEvent('biometric-gaze-update', {
        detail: event.detail,
      });
      window.dispatchEvent(gazeEvent);
    };

    window.addEventListener('biometric-fixation' as any, handleFixation);

    return () => {
      window.removeEventListener('biometric-fixation' as any, handleFixation);

      // Cleanup on unmount
      if (fixationTimeoutRef.current) {
        clearTimeout(fixationTimeoutRef.current);
      }
      if (currentElementRef.current) {
        clearGlowAttributes(currentElementRef.current);
      }
    };
  }, []);
};

/**
 * Determine fixation intensity level based on duration
 */
function getFixationLevel(duration: number): number {
  if (duration < 500) return 1; // Light glow
  if (duration < 1500) return 2; // Medium glow
  return 3; // Strong glow
}

/**
 * Clear all glow-related attributes from an element
 */
function clearGlowAttributes(element: Element) {
  element.removeAttribute('data-biometric-fixating');
  element.removeAttribute('data-biometric-fixation-level');
  element.removeAttribute('data-biometric-fixation-locked');
}

export default useFixationGlow;
