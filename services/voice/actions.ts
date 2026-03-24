/**
 * UNIVERSAL VOICE ACTIONS
 * DOM manipulation actions for voice control.
 */

import { VoiceActionResult } from './types';
import { scanInteractiveElements } from './discovery';
import { logger } from '@/services/logger';

/**
 * Fill an input element by ID or fuzzy match
 * Uses multiple strategies to ensure React state updates correctly
 */
export function fillInput(identifier: string, text: string): VoiceActionResult {
  const snapshot = scanInteractiveElements();
  const idLower = identifier.toLowerCase().replace(/[-_\s]/g, '');

  // Priority 1: Exact data-voice-id match
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
    target = snapshot.inputs[0];
  }

  if (target) {
    const el = target.element as HTMLInputElement | HTMLTextAreaElement;
    el.focus();

    // Strategy 1: Try React fiber onChange directly
    const reactKey = Object.keys(el).find(k =>
      k.startsWith('__reactFiber$') ||
      k.startsWith('__reactInternalInstance$') ||
      k.startsWith('__reactProps$')
    );

    if (reactKey) {
      try {
        const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps$'));
        if (propsKey) {
          const props = (el as any)[propsKey];
          if (props?.onChange) {
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
            props.onChange(syntheticEvent);
            el.value = text;
            return { success: true, element: target.label };
          }
        }
      } catch (e) {
        logger.debug('[UniversalVoice] React fiber strategy failed, trying alternatives');
      }
    }

    // Strategy 2: Native value setter
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      target.type === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, text);
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      el.dispatchEvent(inputEvent);
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true, element: target.label };
    }

    // Strategy 3: execCommand fallback
    try {
      el.focus();
      el.select();
      document.execCommand('insertText', false, text);
      return { success: true, element: target.label };
    } catch (e) {
      // execCommand might not be supported
    }

    // Strategy 4: Direct assignment
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
export function clickButton(identifier: string): VoiceActionResult {
  const snapshot = scanInteractiveElements();
  const idLower = identifier.toLowerCase().replace(/[-_\s]/g, '');

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

  // Priority 4: Fuzzy match
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

  // Priority 6: Word-based matching
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
export function selectOption(dropdownId: string, optionText: string): VoiceActionResult {
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

  return { success: false, error: `No dropdown found matching "${dropdownId}"` };
}

/**
 * Toggle a checkbox
 */
export function toggleCheckbox(identifier: string, state?: boolean): VoiceActionResult {
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

  return { success: false, error: `No checkbox found matching "${identifier}"` };
}

/**
 * Focus an element
 */
export function focusElement(identifier: string): VoiceActionResult {
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
export function getElementValue(identifier: string): VoiceActionResult {
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

/**
 * Submit the current form or trigger primary action
 */
export function submitForm(): VoiceActionResult {
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
}
