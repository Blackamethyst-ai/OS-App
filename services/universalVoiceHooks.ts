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
// Element Discovery - Smart Context Extraction
// =============================================================================

/**
 * Extract component/section context by traversing up the DOM tree
 * This is the KEY function that makes voice work without manual tagging
 */
function getComponentContext(el: HTMLElement): { component: string; section: string; path: string[] } {
    const path: string[] = [];
    let component = '';
    let section = '';
    let current: HTMLElement | null = el;
    let depth = 0;
    const maxDepth = 10;

    while (current && depth < maxDepth) {
        // Check for component indicators in class names
        const classList = Array.from(current.classList || []);

        // Look for semantic component names in classes
        for (const cls of classList) {
            const clsLower = cls.toLowerCase();
            // Match patterns like "biometric-panel", "mission-control", "agent-control", etc.
            if (clsLower.includes('panel') || clsLower.includes('control') ||
                clsLower.includes('section') || clsLower.includes('module') ||
                clsLower.includes('widget') || clsLower.includes('card') ||
                clsLower.includes('hub') || clsLower.includes('engine') ||
                clsLower.includes('studio') || clsLower.includes('core') ||
                clsLower.includes('bridge') || clsLower.includes('lab')) {
                if (!component) component = cls;
            }
        }

        // Check for data attributes that indicate component
        const dataComponent = current.getAttribute('data-component') ||
                             current.getAttribute('data-testid') ||
                             current.getAttribute('data-section');
        if (dataComponent && !component) {
            component = dataComponent;
        }

        // Check for role attributes
        const role = current.getAttribute('role');
        if (role === 'dialog' || role === 'region' || role === 'group') {
            const ariaLabel = current.getAttribute('aria-label') || current.getAttribute('aria-labelledby');
            if (ariaLabel && !section) section = ariaLabel;
        }

        // Look for headings nearby that describe this section
        const heading = current.querySelector('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="header"], [class*="heading"]');
        if (heading?.textContent && !section) {
            const headingText = heading.textContent.trim();
            if (headingText.length < 40) section = headingText;
        }

        // Check ID for component hints
        if (current.id && !component) {
            const idLower = current.id.toLowerCase();
            if (idLower.includes('-') || idLower.includes('_')) {
                component = current.id;
            }
        }

        // Build path for context
        if (current.id) path.unshift(current.id);
        else if (classList.length > 0 && classList[0].length < 30) path.unshift(classList[0]);

        current = current.parentElement;
        depth++;
    }

    return {
        component: component.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30),
        section: section.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().slice(0, 30),
        path
    };
}

/**
 * Generate a unique, descriptive ID for an element
 * Now includes component context for disambiguation
 */
function generateElementId(el: HTMLElement, index: number): string {
    // Priority 1: Explicit voice ID
    const dataVoiceId = el.getAttribute('data-voice-id');
    if (dataVoiceId) return dataVoiceId;

    // Priority 2: Standard ID
    const id = el.id;
    if (id) return id;

    // Priority 3: Name attribute
    const name = el.getAttribute('name');
    if (name) return name;

    // Priority 4: Build contextual ID from component + label
    const context = getComponentContext(el);
    const label = getElementLabel(el);
    const labelSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 25);

    // Combine component context with label
    if (context.component && labelSlug && labelSlug !== 'button' && labelSlug !== 'input') {
        return `${context.component}-${labelSlug}`;
    }
    if (context.section && labelSlug) {
        const sectionSlug = context.section.replace(/\s+/g, '-').slice(0, 15);
        return `${sectionSlug}-${labelSlug}`;
    }

    // Priority 5: Aria label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.toLowerCase().replace(/\s+/g, '-').slice(0, 30);

    // Priority 6: Placeholder
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder.toLowerCase().replace(/\s+/g, '-').slice(0, 25);

    // Priority 7: Title
    const title = el.getAttribute('title');
    if (title) return title.toLowerCase().replace(/\s+/g, '-').slice(0, 25);

    // Priority 8: Text content with context
    const textContent = el.textContent?.trim().slice(0, 25);
    if (textContent) {
        const textSlug = textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (context.component) return `${context.component}-${textSlug}`;
        return textSlug;
    }

    return `element-${index}`;
}

/**
 * Get a human-readable label for an element
 * Enhanced to extract better labels from complex UI
 */
function getElementLabel(el: HTMLElement): string {
    // Priority 1: Explicit aria-label
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Priority 2: Associated label element
    if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (label?.textContent) return label.textContent.trim();
    }

    // Priority 3: data-label attribute
    const dataLabel = el.getAttribute('data-label');
    if (dataLabel) return dataLabel;

    // Priority 4: title attribute
    const title = el.getAttribute('title');
    if (title) return title;

    // Priority 5: placeholder (for inputs)
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder;

    // Priority 6: Direct text content (cleaned)
    // For buttons, get only direct text, not nested element text
    let textContent = '';
    for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            textContent += node.textContent?.trim() || '';
        }
    }
    // If no direct text, use full text content
    if (!textContent) {
        textContent = el.textContent?.trim() || '';
    }
    // Clean up whitespace and limit length
    textContent = textContent.replace(/\s+/g, ' ').trim();
    if (textContent && textContent.length < 50 && textContent.length > 0) {
        return textContent;
    }

    // Priority 7: Look for nearby label in parent
    const parent = el.parentElement;
    if (parent) {
        // Check for label as previous sibling
        const prevSibling = el.previousElementSibling;
        if (prevSibling?.tagName === 'LABEL' || prevSibling?.classList.contains('label')) {
            const sibText = prevSibling.textContent?.trim();
            if (sibText && sibText.length < 50) return sibText;
        }

        // Check for span/label inside parent
        const parentLabel = parent.querySelector(':scope > label, :scope > span:first-child');
        if (parentLabel?.textContent && parentLabel !== el) {
            const labelText = parentLabel.textContent.trim();
            if (labelText.length < 50) return labelText;
        }
    }

    // Priority 8: Use component context as fallback
    const context = getComponentContext(el);
    if (context.section) return context.section;
    if (context.component) return context.component;

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
        case 'select': {
            const options = Array.from((el as HTMLSelectElement).options).map(o => o.text).slice(0, 5);
            return `Dropdown: "${label}" - options: ${options.join(', ')}`;
        }
        case 'checkbox': {
            const checked = (el as HTMLInputElement).checked;
            return `Checkbox: "${label}" - currently ${checked ? 'checked' : 'unchecked'}`;
        }
        case 'radio': {
            const selected = (el as HTMLInputElement).checked;
            return `Radio: "${label}" - currently ${selected ? 'selected' : 'unselected'}`;
        }
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
    const idLower = identifier.toLowerCase().replace(/[-_\s]/g, '');

    // Priority 1: Exact data-voice-id match (most reliable)
    let target = snapshot.inputs.find(i => {
        const voiceId = i.element.getAttribute('data-voice-id');
        return voiceId && voiceId.toLowerCase().replace(/[-_\s]/g, '') === idLower;
    });

    // Priority 2: Partial data-voice-id match
    if (!target) {
        target = snapshot.inputs.find(i => {
            const voiceId = i.element.getAttribute('data-voice-id');
            if (!voiceId) return false;
            const voiceIdNorm = voiceId.toLowerCase().replace(/[-_\s]/g, '');
            return voiceIdNorm.includes(idLower) || idLower.includes(voiceIdNorm);
        });
    }

    // Priority 3: Exact id match
    if (!target) {
        target = snapshot.inputs.find(i => i.id === identifier);
    }

    // Priority 4: Fuzzy match by label, id, or description
    if (!target) {
        target = snapshot.inputs.find(i =>
            i.label.toLowerCase().includes(identifier.toLowerCase()) ||
            i.id.toLowerCase().includes(identifier.toLowerCase()) ||
            i.description.toLowerCase().includes(identifier.toLowerCase())
        );
    }

    // Priority 5: Match by aria-label
    if (!target) {
        target = snapshot.inputs.find(i => {
            const ariaLabel = i.element.getAttribute('aria-label');
            return ariaLabel && ariaLabel.toLowerCase().includes(identifier.toLowerCase());
        });
    }

    // Priority 6: Generic input fallback
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
 * Prioritizes data-voice-id for reliable targeting
 */
export function clickButton(identifier: string): { success: boolean; element?: string; error?: string } {
    const snapshot = scanInteractiveElements();
    const idLower = identifier.toLowerCase().replace(/[-_\s]/g, '');

    // Combine buttons and tabs for clicking
    const clickables = [...snapshot.buttons, ...snapshot.tabs, ...snapshot.links];

    // Priority 1: Exact data-voice-id match
    let target = clickables.find(b => {
        const voiceId = b.element.getAttribute('data-voice-id');
        return voiceId && voiceId.toLowerCase().replace(/[-_\s]/g, '') === idLower;
    });

    // Priority 2: Partial data-voice-id match
    if (!target) {
        target = clickables.find(b => {
            const voiceId = b.element.getAttribute('data-voice-id');
            if (!voiceId) return false;
            const voiceIdNorm = voiceId.toLowerCase().replace(/[-_\s]/g, '');
            return voiceIdNorm.includes(idLower) || idLower.includes(voiceIdNorm);
        });
    }

    // Priority 3: Exact id match
    if (!target) {
        target = clickables.find(b => b.id === identifier);
    }

    // Priority 4: Fuzzy match by label, id, or description
    if (!target) {
        target = clickables.find(b =>
            b.label.toLowerCase().includes(identifier.toLowerCase()) ||
            b.id.toLowerCase().includes(identifier.toLowerCase()) ||
            b.description.toLowerCase().includes(identifier.toLowerCase())
        );
    }

    // Priority 5: Match by aria-label
    if (!target) {
        target = clickables.find(b => {
            const ariaLabel = b.element.getAttribute('aria-label');
            return ariaLabel && ariaLabel.toLowerCase().includes(identifier.toLowerCase());
        });
    }

    // Priority 6: Word-based matching (all words must appear)
    if (!target) {
        const words = identifier.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        if (words.length > 0) {
            target = clickables.find(b => {
                const labelLower = b.label.toLowerCase();
                const descLower = b.description.toLowerCase();
                return words.every(word => labelLower.includes(word) || descLower.includes(word));
            });
        }
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

        // Register actions with SystemMind
        this.registerWithSystemMind();

        // Notify callbacks
        for (const callback of this.updateCallbacks) {
            callback(this.lastSnapshot);
        }
    }

    /**
     * Register discovered elements as actions in SystemMind.
     * Uses bulk registration with sector awareness for synchronized clock.
     * DOM-level actions are GLOBAL (empty sectors) - they work everywhere.
     */
    private registerWithSystemMind(): void {
        const store = useSystemMind.getState();

        // Build global DOM actions - these work in ANY sector
        const globalDomActions = [
            {
                id: 'voice_fill_input',
                description: '[DOM] Fill any text input field with specified text',
                callback: async (args: any) => fillInput(args.field || args.identifier || 'input', args.text || args.value),
                sectors: [] as string[],  // Global
                priority: 90  // High priority - fundamental DOM interaction
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
                callback: async () => {
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

                    const focused = document.activeElement as HTMLElement;
                    if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) {
                        focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                        return { success: true, element: 'Enter key pressed' };
                    }

                    return { success: false, error: 'No submit button or active input found' };
                },
                sectors: [],
                priority: 75
            }
        ];

        // Bulk register global DOM actions (single epoch increment)
        store.registerActions(globalDomActions);

        // Register individual element actions for more precise control
        // These are sector-specific based on current view
        if (this.lastSnapshot) {
            const elementActions: Array<{ id: string; description: string; callback: (args: any) => Promise<any>; sectors: string[]; priority: number }> = [];
            const currentSector = store.currentLocation;

            // Register top inputs as individual actions
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

            // Register top buttons as individual actions
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
