/**
 * VOICE ELEMENT DISCOVERY
 * Smart DOM traversal and element identification for voice control.
 */

import { VoiceElement, VoiceSnapshot, ComponentContext } from './types';

/**
 * Extract component/section context by traversing up the DOM tree
 * This is the KEY function that makes voice work without manual tagging
 */
export function getComponentContext(el: HTMLElement): ComponentContext {
  const path: string[] = [];
  let component = '';
  let section = '';
  let current: HTMLElement | null = el;
  let depth = 0;
  const maxDepth = 10;

  while (current && depth < maxDepth) {
    const classList = Array.from(current.classList || []);

    // Look for semantic component names in classes
    for (const cls of classList) {
      const clsLower = cls.toLowerCase();
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
 * Get a human-readable label for an element
 */
export function getElementLabel(el: HTMLElement): string {
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
  let textContent = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      textContent += node.textContent?.trim() || '';
    }
  }
  if (!textContent) {
    textContent = el.textContent?.trim() || '';
  }
  textContent = textContent.replace(/\s+/g, ' ').trim();
  if (textContent && textContent.length < 50 && textContent.length > 0) {
    return textContent;
  }

  // Priority 7: Look for nearby label in parent
  const parent = el.parentElement;
  if (parent) {
    const prevSibling = el.previousElementSibling;
    if (prevSibling?.tagName === 'LABEL' || prevSibling?.classList.contains('label')) {
      const sibText = prevSibling.textContent?.trim();
      if (sibText && sibText.length < 50) return sibText;
    }

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
 * Generate a unique, descriptive ID for an element
 */
export function generateElementId(el: HTMLElement, index: number): string {
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
 * Generate a description for voice context
 */
export function getElementDescription(el: HTMLElement, type: string): string {
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
export function isInteractable(el: HTMLElement): boolean {
  if (!el) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  if ((el as HTMLInputElement).disabled) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;

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

  // Scan links
  document.querySelectorAll('a[href], [role="link"]').forEach((el) => {
    const element = el as HTMLElement;
    if (!isInteractable(element)) return;
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
