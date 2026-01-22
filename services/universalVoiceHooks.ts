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

import { useSystemMind } from '../stores/useSystemMind';

// =============================================================================
// Types
// =============================================================================

export interface VoiceElement {
    id: string;
    type: 'input' | 'button' | 'link' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'tab' | 'action';
    label: string;
    description: string;
    element: HTMLElement;
    value?: string;
    options?: string[];
    checked?: boolean;
}

export interface VoiceSnapshot {
    inputs: VoiceElement[];
    buttons: VoiceElement[];
    links: VoiceElement[];
    tabs: VoiceElement[];
    selects: VoiceElement[];
    allElements: VoiceElement[];
    summary: string;
}

// =============================================================================
// Element Discovery
// =============================================================================

/**
 * Generate a unique, descriptive ID for an element
 */
function generateElementId(el: HTMLElement, index: number): string {
    // Try various attributes for identification
    const id = el.id;
    const name = el.getAttribute('name');
    const dataVoiceId = el.getAttribute('data-voice-id');
    const ariaLabel = el.getAttribute('aria-label');
    const placeholder = el.getAttribute('placeholder');
    const title = el.getAttribute('title');
    const textContent = el.textContent?.trim().slice(0, 30);

    if (dataVoiceId) return dataVoiceId;
    if (id) return id;
    if (name) return name;
    if (ariaLabel) return ariaLabel.toLowerCase().replace(/\s+/g, '-');
    if (placeholder) return placeholder.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
    if (title) return title.toLowerCase().replace(/\s+/g, '-').slice(0, 20);
    if (textContent) return textContent.toLowerCase().replace(/\s+/g, '-').slice(0, 20);

    return `element-${index}`;
}

/**
 * Get a human-readable label for an element
 */
function getElementLabel(el: HTMLElement): string {
    // Check for associated label
    if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (label?.textContent) return label.textContent.trim();
    }

    // Check various attributes
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder;

    const title = el.getAttribute('title');
    if (title) return title;

    const dataLabel = el.getAttribute('data-label');
    if (dataLabel) return dataLabel;

    // For buttons/links, use text content
    const textContent = el.textContent?.trim();
    if (textContent && textContent.length < 50) return textContent;

    // For inputs, check parent for label text
    const parent = el.parentElement;
    if (parent) {
        const siblingLabel = parent.querySelector('label, span, div');
        if (siblingLabel?.textContent && siblingLabel.textContent.length < 50) {
            return siblingLabel.textContent.trim();
        }
    }

    return el.tagName.toLowerCase();
}

/**
 * Generate a description for voice context
 */
function getElementDescription(el: HTMLElement, type: string): string {
    const label = getElementLabel(el);
    const value = (el as HTMLInputElement).value;
    const placeholder = el.getAttribute('placeholder');

    switch (type) {
        case 'input':
        case 'textarea':
            return `Text input: "${label}"${value ? ` (current: "${value.slice(0, 30)}")` : ''}${placeholder ? ` (hint: ${placeholder})` : ''}`;
        case 'button':
            return `Button: "${label}" - click to activate`;
        case 'link':
            return `Link: "${label}" - click to navigate`;
        case 'select':
            const options = Array.from((el as HTMLSelectElement).options).map(o => o.text).slice(0, 5);
            return `Dropdown: "${label}" - options: ${options.join(', ')}`;
        case 'checkbox':
            const checked = (el as HTMLInputElement).checked;
            return `Checkbox: "${label}" - currently ${checked ? 'checked' : 'unchecked'}`;
        case 'radio':
            const selected = (el as HTMLInputElement).checked;
            return `Radio: "${label}" - currently ${selected ? 'selected' : 'unselected'}`;
        case 'tab':
            return `Tab: "${label}" - click to switch view`;
        default:
            return `${type}: "${label}"`;
    }
}

/**
 * Check if element is visible and interactive
 */
function isInteractable(el: HTMLElement): boolean {
    if (!el) return false;

    const style = window.getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (style.opacity === '0') return false;
    if ((el as HTMLInputElement).disabled) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;

    // Check if element is in viewport (roughly)
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    return true;
}

/**
 * Scan the DOM for all interactive elements
 */
export function scanInteractiveElements(): VoiceSnapshot {
    const inputs: VoiceElement[] = [];
    const buttons: VoiceElement[] = [];
    const links: VoiceElement[] = [];
    const tabs: VoiceElement[] = [];
    const selects: VoiceElement[] = [];

    let index = 0;

    // Scan text inputs and textareas
    document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="number"], input:not([type]), textarea').forEach((el) => {
        const element = el as HTMLInputElement | HTMLTextAreaElement;
        if (!isInteractable(element)) return;

        const id = generateElementId(element, index++);
        inputs.push({
            id,
            type: element.tagName === 'TEXTAREA' ? 'textarea' : 'input',
            label: getElementLabel(element),
            description: getElementDescription(element, element.tagName === 'TEXTAREA' ? 'textarea' : 'input'),
            element,
            value: element.value
        });
    });

    // Scan buttons
    document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach((el) => {
        const element = el as HTMLElement;
        if (!isInteractable(element)) return;

        const id = generateElementId(element, index++);
        buttons.push({
            id,
            type: 'button',
            label: getElementLabel(element),
            description: getElementDescription(element, 'button'),
            element
        });
    });

    // Scan links (but not nav links in menus)
    document.querySelectorAll('a[href], [role="link"]').forEach((el) => {
        const element = el as HTMLElement;
        if (!isInteractable(element)) return;
        // Skip if it's a tiny icon link or empty
        if (!element.textContent?.trim()) return;

        const id = generateElementId(element, index++);
        links.push({
            id,
            type: 'link',
            label: getElementLabel(element),
            description: getElementDescription(element, 'link'),
            element
        });
    });

    // Scan tabs
    document.querySelectorAll('[role="tab"], [data-tab], .tab, [class*="tab-"]').forEach((el) => {
        const element = el as HTMLElement;
        if (!isInteractable(element)) return;

        const id = generateElementId(element, index++);
        tabs.push({
            id,
            type: 'tab',
            label: getElementLabel(element),
            description: getElementDescription(element, 'tab'),
            element
        });
    });

    // Scan selects
    document.querySelectorAll('select').forEach((el) => {
        const element = el as HTMLSelectElement;
        if (!isInteractable(element)) return;

        const id = generateElementId(element, index++);
        const options = Array.from(element.options).map(o => o.text);
        selects.push({
            id,
            type: 'select',
            label: getElementLabel(element),
            description: getElementDescription(element, 'select'),
            element,
            value: element.value,
            options
        });
    });

    // Scan checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach((el) => {
        const element = el as HTMLInputElement;
        if (!isInteractable(element)) return;

        const id = generateElementId(element, index++);
        inputs.push({
            id,
            type: 'checkbox',
            label: getElementLabel(element),
            description: getElementDescription(element, 'checkbox'),
            element,
            checked: element.checked
        });
    });

    const allElements = [...inputs, ...buttons, ...links, ...tabs, ...selects];

    const summary = `Found ${inputs.length} inputs, ${buttons.length} buttons, ${links.length} links, ${tabs.length} tabs, ${selects.length} selects`;

    return { inputs, buttons, links, tabs, selects, allElements, summary };
}

// =============================================================================
// Universal Actions
// =============================================================================

/**
 * Fill an input element by ID or fuzzy match
 * Uses multiple strategies to ensure React state updates correctly
 */
export function fillInput(identifier: string, text: string): { success: boolean; element?: string; error?: string } {
    const snapshot = scanInteractiveElements();

    // Try exact match first
    let target = snapshot.inputs.find(i => i.id === identifier);

    // Fuzzy match by label
    if (!target) {
        const idLower = identifier.toLowerCase();
        target = snapshot.inputs.find(i =>
            i.label.toLowerCase().includes(idLower) ||
            i.id.toLowerCase().includes(idLower) ||
            i.description.toLowerCase().includes(idLower)
        );
    }

    // Try matching any input if identifier is generic
    if (!target && (identifier === 'input' || identifier === 'text' || identifier === 'field')) {
        target = snapshot.inputs[0]; // First available input
    }

    if (target) {
        const el = target.element as HTMLInputElement | HTMLTextAreaElement;
        el.focus();

        // Strategy 1: Try to access React fiber and call onChange directly
        // This is the most reliable way to update React controlled inputs
        const reactKey = Object.keys(el).find(k =>
            k.startsWith('__reactFiber$') ||
            k.startsWith('__reactInternalInstance$') ||
            k.startsWith('__reactProps$')
        );

        if (reactKey) {
            try {
                // Try to find the props with onChange handler
                const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
                if (propsKey) {
                    const props = (el as any)[propsKey];
                    if (props?.onChange) {
                        // Create a synthetic-like event object
                        const syntheticEvent = {
                            target: { value: text, name: el.name || el.id },
                            currentTarget: { value: text, name: el.name || el.id },
                            type: 'change',
                            bubbles: true,
                            cancelable: true,
                            defaultPrevented: false,
                            eventPhase: 3,
                            isTrusted: true,
                            nativeEvent: new Event('input'),
                            preventDefault: () => {},
                            stopPropagation: () => {},
                            persist: () => {}
                        };

                        // Call React's onChange directly
                        props.onChange(syntheticEvent);

                        // Also set the DOM value for visual feedback
                        el.value = text;

                        return { success: true, element: target.label };
                    }
                }
            } catch (e) {
                // Fall through to other strategies
                console.debug('[UniversalVoice] React fiber strategy failed, trying alternatives');
            }
        }

        // Strategy 2: Use native value setter to bypass React's controlled input restrictions
        // This tricks React into thinking the value was set natively
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            target.type === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            'value'
        )?.set;

        if (nativeInputValueSetter) {
            // Set value using native setter
            nativeInputValueSetter.call(el, text);

            // Create and dispatch InputEvent (more compatible with React 16+)
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: text
            });
            el.dispatchEvent(inputEvent);

            // Also dispatch change event for form validation
            el.dispatchEvent(new Event('change', { bubbles: true }));

            return { success: true, element: target.label };
        }

        // Strategy 3: Fallback - simulate keyboard input with execCommand
        // This is a last resort but can work for some inputs
        try {
            el.focus();
            el.select(); // Select all existing text
            document.execCommand('insertText', false, text);
            return { success: true, element: target.label };
        } catch (e) {
            // execCommand might not be supported
        }

        // Strategy 4: Direct assignment with multiple event dispatches
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

        return { success: true, element: target.label };
    }

    return {
        success: false,
        error: `No input found matching "${identifier}". Available: ${snapshot.inputs.map(i => i.label).join(', ')}`
    };
}

/**
 * Click a button by ID or fuzzy match
 */
export function clickButton(identifier: string): { success: boolean; element?: string; error?: string } {
    const snapshot = scanInteractiveElements();

    // Combine buttons and tabs for clicking
    const clickables = [...snapshot.buttons, ...snapshot.tabs, ...snapshot.links];

    // Try exact match
    let target = clickables.find(b => b.id === identifier);

    // Fuzzy match
    if (!target) {
        const idLower = identifier.toLowerCase();
        target = clickables.find(b =>
            b.label.toLowerCase().includes(idLower) ||
            b.id.toLowerCase().includes(idLower) ||
            b.description.toLowerCase().includes(idLower)
        );
    }

    if (target) {
        target.element.click();
        return { success: true, element: target.label };
    }

    return {
        success: false,
        error: `No button found matching "${identifier}". Available: ${clickables.map(b => b.label).slice(0, 10).join(', ')}`
    };
}

/**
 * Select an option from a dropdown
 */
export function selectOption(dropdownId: string, optionText: string): { success: boolean; element?: string; error?: string } {
    const snapshot = scanInteractiveElements();

    const target = snapshot.selects.find(s =>
        s.id === dropdownId ||
        s.label.toLowerCase().includes(dropdownId.toLowerCase())
    );

    if (target) {
        const select = target.element as HTMLSelectElement;
        const option = Array.from(select.options).find(o =>
            o.text.toLowerCase().includes(optionText.toLowerCase()) ||
            o.value.toLowerCase().includes(optionText.toLowerCase())
        );

        if (option) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return { success: true, element: `${target.label} = ${option.text}` };
        }

        return {
            success: false,
            error: `Option "${optionText}" not found. Available: ${target.options?.join(', ')}`
        };
    }

    return {
        success: false,
        error: `No dropdown found matching "${dropdownId}"`
    };
}

/**
 * Toggle a checkbox
 */
export function toggleCheckbox(identifier: string, state?: boolean): { success: boolean; element?: string; error?: string } {
    const snapshot = scanInteractiveElements();

    const target = snapshot.inputs.find(i =>
        i.type === 'checkbox' && (
            i.id === identifier ||
            i.label.toLowerCase().includes(identifier.toLowerCase())
        )
    );

    if (target) {
        const checkbox = target.element as HTMLInputElement;
        if (state !== undefined) {
            checkbox.checked = state;
        } else {
            checkbox.checked = !checkbox.checked;
        }
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, element: `${target.label} = ${checkbox.checked}` };
    }

    return {
        success: false,
        error: `No checkbox found matching "${identifier}"`
    };
}

/**
 * Focus an element
 */
export function focusElement(identifier: string): { success: boolean; element?: string; error?: string } {
    const snapshot = scanInteractiveElements();

    const target = snapshot.allElements.find(e =>
        e.id === identifier ||
        e.label.toLowerCase().includes(identifier.toLowerCase())
    );

    if (target) {
        target.element.focus();
        target.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { success: true, element: target.label };
    }

    return { success: false, error: `No element found matching "${identifier}"` };
}

/**
 * Get element value
 */
export function getElementValue(identifier: string): { success: boolean; value?: string; error?: string } {
    const snapshot = scanInteractiveElements();

    const target = snapshot.inputs.find(i =>
        i.id === identifier ||
        i.label.toLowerCase().includes(identifier.toLowerCase())
    );

    if (target) {
        const el = target.element as HTMLInputElement;
        return { success: true, value: el.value || el.textContent || '' };
    }

    return { success: false, error: `No input found matching "${identifier}"` };
}

// =============================================================================
// Universal Voice Service
// =============================================================================

class UniversalVoiceService {
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
        this.observer = new MutationObserver((mutations) => {
            // Debounce updates
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

        console.log('[UniversalVoice] Started monitoring DOM');
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
        console.log('[UniversalVoice] Stopped monitoring');
    }

    /**
     * Update the current snapshot and notify listeners
     */
    private updateSnapshot(): void {
        this.lastSnapshot = scanInteractiveElements();

        // Register actions with SystemMind
        this.registerWithSystemMind();

        // Notify callbacks
        for (const callback of this.updateCallbacks) {
            callback(this.lastSnapshot);
        }
    }

    /**
     * Register discovered elements as actions in SystemMind
     */
    private registerWithSystemMind(): void {
        const store = useSystemMind.getState();

        // Register universal actions
        store.registerAction('voice_fill_input', 'Fill any text input field with specified text', async (args) => {
            const result = fillInput(args.field || args.identifier || 'input', args.text || args.value);
            return result;
        });

        store.registerAction('voice_click_button', 'Click any button, tab, or link', async (args) => {
            const result = clickButton(args.button || args.identifier || args.target);
            return result;
        });

        store.registerAction('voice_select_option', 'Select an option from a dropdown', async (args) => {
            const result = selectOption(args.dropdown || args.select, args.option || args.value);
            return result;
        });

        store.registerAction('voice_toggle_checkbox', 'Toggle or set a checkbox state', async (args) => {
            const result = toggleCheckbox(args.checkbox || args.identifier, args.state);
            return result;
        });

        store.registerAction('voice_focus_element', 'Focus and scroll to an element', async (args) => {
            const result = focusElement(args.element || args.identifier);
            return result;
        });

        store.registerAction('voice_get_value', 'Get the current value of an input', async (args) => {
            const result = getElementValue(args.field || args.identifier);
            return result;
        });

        store.registerAction('voice_scan_ui', 'Scan and return all interactive elements', async () => {
            return this.getSnapshot();
        });

        store.registerAction('voice_submit_form', 'Submit the current form or trigger primary action', async () => {
            // Find submit button or primary action
            const snapshot = scanInteractiveElements();
            const submitBtn = snapshot.buttons.find(b =>
                b.label.toLowerCase().includes('submit') ||
                b.label.toLowerCase().includes('send') ||
                b.label.toLowerCase().includes('run') ||
                b.label.toLowerCase().includes('execute') ||
                b.label.toLowerCase().includes('go') ||
                b.id.includes('submit')
            );

            if (submitBtn) {
                submitBtn.element.click();
                return { success: true, element: submitBtn.label };
            }

            // Try pressing Enter on focused input
            const focused = document.activeElement as HTMLElement;
            if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) {
                focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                return { success: true, element: 'Enter key pressed' };
            }

            return { success: false, error: 'No submit button or active input found' };
        });

        // Register individual element actions for more precise control
        if (this.lastSnapshot) {
            // Register top inputs as individual actions
            this.lastSnapshot.inputs.slice(0, 10).forEach((input, i) => {
                store.registerAction(`input_${input.id}`, `Fill "${input.label}" input`, async (args) => {
                    const el = input.element as HTMLInputElement;
                    el.value = args.text || args.value || '';
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    return { success: true };
                });
            });

            // Register top buttons as individual actions
            this.lastSnapshot.buttons.slice(0, 15).forEach((btn, i) => {
                store.registerAction(`click_${btn.id}`, `Click "${btn.label}" button`, async () => {
                    btn.element.click();
                    return { success: true };
                });
            });
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

// =============================================================================
// Singleton Export
// =============================================================================

export const universalVoice = new UniversalVoiceService();

// Auto-start when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            universalVoice.start();
        });
    } else {
        // DOM already loaded
        setTimeout(() => universalVoice.start(), 100);
    }

    // Expose for debugging
    (window as any).__universalVoice = universalVoice;
    (window as any).__voiceFill = fillInput;
    (window as any).__voiceClick = clickButton;
    (window as any).__voiceScan = scanInteractiveElements;
}
