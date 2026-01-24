/**
 * UNIVERSAL VOICE SERVICE
 * DOM monitoring and SystemMind integration for voice control.
 */

import { useSystemMind } from '../../stores/useSystemMind';
import { VoiceSnapshot } from './types';
import { scanInteractiveElements } from './discovery';
import {
  fillInput,
  clickButton,
  selectOption,
  toggleCheckbox,
  focusElement,
  getElementValue,
  submitForm,
} from './actions';

export class UniversalVoiceService {
  private observer: MutationObserver | null = null;
  private lastSnapshot: VoiceSnapshot | null = null;
  private updateCallbacks: Set<(snapshot: VoiceSnapshot) => void> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start monitoring the DOM for interactive elements
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial scan
    this.updateSnapshot();

    // Set up MutationObserver to track DOM changes
    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.updateSnapshot();
      }, 250);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'aria-hidden', 'style', 'class']
    });

    if (import.meta.env.DEV) console.log('[UniversalVoice] Started monitoring DOM');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isRunning = false;
    if (import.meta.env.DEV) console.log('[UniversalVoice] Stopped monitoring');
  }

  /**
   * Update the current snapshot and notify listeners
   */
  private updateSnapshot(): void {
    this.lastSnapshot = scanInteractiveElements();
    this.registerWithSystemMind();

    for (const callback of this.updateCallbacks) {
      callback(this.lastSnapshot);
    }
  }

  /**
   * Register discovered elements as actions in SystemMind
   */
  private registerWithSystemMind(): void {
    const store = useSystemMind.getState();

    // Build global DOM actions
    const globalDomActions = [
      {
        id: 'voice_fill_input',
        description: '[DOM] Fill any text input field with specified text',
        callback: async (args: any) => fillInput(args.field || args.identifier || 'input', args.text || args.value),
        sectors: [] as string[],
        priority: 90
      },
      {
        id: 'voice_click_button',
        description: '[DOM] Click any button, tab, or link',
        callback: async (args: any) => clickButton(args.button || args.identifier || args.target),
        sectors: [],
        priority: 90
      },
      {
        id: 'voice_select_option',
        description: '[DOM] Select an option from a dropdown',
        callback: async (args: any) => selectOption(args.dropdown || args.select, args.option || args.value),
        sectors: [],
        priority: 85
      },
      {
        id: 'voice_toggle_checkbox',
        description: '[DOM] Toggle or set a checkbox state',
        callback: async (args: any) => toggleCheckbox(args.checkbox || args.identifier, args.state),
        sectors: [],
        priority: 80
      },
      {
        id: 'voice_focus_element',
        description: '[DOM] Focus and scroll to an element',
        callback: async (args: any) => focusElement(args.element || args.identifier),
        sectors: [],
        priority: 70
      },
      {
        id: 'voice_get_value',
        description: '[DOM] Get the current value of an input',
        callback: async (args: any) => getElementValue(args.field || args.identifier),
        sectors: [],
        priority: 65
      },
      {
        id: 'voice_scan_ui',
        description: '[DOM] Scan and return all interactive elements',
        callback: async () => this.getSnapshot(),
        sectors: [],
        priority: 60
      },
      {
        id: 'voice_submit_form',
        description: '[DOM] Submit the current form or trigger primary action',
        callback: async () => submitForm(),
        sectors: [],
        priority: 75
      }
    ];

    store.registerActions(globalDomActions);

    // Register individual element actions
    if (this.lastSnapshot) {
      const elementActions: Array<{
        id: string;
        description: string;
        callback: (args: any) => Promise<any>;
        sectors: string[];
        priority: number;
      }> = [];
      const currentSector = store.currentLocation;

      // Register top inputs
      this.lastSnapshot.inputs.slice(0, 10).forEach((input) => {
        elementActions.push({
          id: `input_${input.id}`,
          description: `[DOM] Fill "${input.label}" input`,
          callback: async (args: any) => {
            const el = input.element as HTMLInputElement;
            el.value = args.text || args.value || '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return { success: true };
          },
          sectors: currentSector ? [currentSector] : [],
          priority: 55
        });
      });

      // Register top buttons
      this.lastSnapshot.buttons.slice(0, 15).forEach((btn) => {
        elementActions.push({
          id: `click_${btn.id}`,
          description: `[DOM] Click "${btn.label}" button`,
          callback: async () => {
            btn.element.click();
            return { success: true };
          },
          sectors: currentSector ? [currentSector] : [],
          priority: 50
        });
      });

      if (elementActions.length > 0) {
        store.registerActions(elementActions);
      }
    }
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): VoiceSnapshot {
    if (!this.lastSnapshot) {
      this.lastSnapshot = scanInteractiveElements();
    }
    return this.lastSnapshot;
  }

  /**
   * Force refresh the snapshot
   */
  refresh(): VoiceSnapshot {
    this.updateSnapshot();
    return this.lastSnapshot!;
  }

  /**
   * Subscribe to snapshot updates
   */
  subscribe(callback: (snapshot: VoiceSnapshot) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Get a voice-friendly summary of current UI
   */
  getSummary(): string {
    const snapshot = this.getSnapshot();

    const inputSummary = snapshot.inputs.slice(0, 5).map(i => `"${i.label}"`).join(', ');
    const buttonSummary = snapshot.buttons.slice(0, 5).map(b => `"${b.label}"`).join(', ');
    const tabSummary = snapshot.tabs.map(t => `"${t.label}"`).join(', ');

    return `
UI State:
- Inputs (${snapshot.inputs.length}): ${inputSummary}${snapshot.inputs.length > 5 ? '...' : ''}
- Buttons (${snapshot.buttons.length}): ${buttonSummary}${snapshot.buttons.length > 5 ? '...' : ''}
- Tabs: ${tabSummary || 'none'}
- Links: ${snapshot.links.length}
- Selects: ${snapshot.selects.length}
    `.trim();
  }
}
