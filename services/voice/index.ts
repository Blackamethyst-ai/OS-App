/**
 * UNIVERSAL VOICE HOOKS
 *
 * Automatically makes the entire app voice-interactive by:
 * 1. Scanning DOM for all interactive elements (inputs, buttons, links, etc.)
 * 2. Auto-registering them with SystemMind for voice control
 * 3. Using MutationObserver to track UI changes in real-time
 * 4. Providing universal voice commands for any element
 *
 * No manual per-component hooks needed - this works globally.
 */

// Types
export * from './types';

// Discovery functions
export {
  getComponentContext,
  getElementLabel,
  generateElementId,
  getElementDescription,
  isInteractable,
  scanInteractiveElements,
} from './discovery';

// Action functions
export {
  fillInput,
  clickButton,
  selectOption,
  toggleCheckbox,
  focusElement,
  getElementValue,
  submitForm,
} from './actions';

// Service class
export { UniversalVoiceService } from './service';

// Singleton instance
import { UniversalVoiceService } from './service';
import { scanInteractiveElements } from './discovery';
import { fillInput, clickButton } from './actions';

export const universalVoice = new UniversalVoiceService();

// Auto-start when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      universalVoice.start();
    });
  } else {
    setTimeout(() => universalVoice.start(), 100);
  }

  // Expose for debugging
  (window as any).__universalVoice = universalVoice;
  (window as any).__voiceFill = fillInput;
  (window as any).__voiceClick = clickButton;
  (window as any).__voiceScan = scanInteractiveElements;
}
