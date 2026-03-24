// @vitest-environment happy-dom
/**
 * Tests for Voice Services
 *
 * Covers discovery, actions, and service lifecycle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VoiceSnapshot, VoiceElement } from '../types';

// Hoisted mocks for use inside vi.mock() factories
const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

const mockSystemMindStore = vi.hoisted(() => ({
  getState: vi.fn(() => ({
    registerActions: vi.fn(),
    currentLocation: 'test-sector',
  })),
}));

const mockScanInteractiveElements = vi.hoisted(() => vi.fn());

vi.mock('@/services/logger', () => ({ logger: mockLogger }));
vi.mock('../../logger', () => ({ logger: mockLogger }));
vi.mock('../../../stores/useSystemMind', () => ({
  useSystemMind: mockSystemMindStore,
}));

/** Helper to create a VoiceElement from a real DOM element */
function makeVoiceElement(
  el: HTMLElement,
  overrides: Partial<VoiceElement> = {},
): VoiceElement {
  return {
    id: el.id || 'test-el',
    type: 'button',
    label: el.textContent || el.getAttribute('aria-label') || 'unlabelled',
    description: '',
    element: el,
    ...overrides,
  };
}

/** Helper to build an empty snapshot */
function emptySnapshot(
  overrides: Partial<VoiceSnapshot> = {},
): VoiceSnapshot {
  return {
    inputs: [],
    buttons: [],
    links: [],
    tabs: [],
    selects: [],
    allElements: [],
    summary: 'empty',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Discovery tests (no mock needed — these test the discovery functions directly)
// ---------------------------------------------------------------------------
describe('Voice Discovery', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('getElementLabel', () => {
    it('returns aria-label when present', async () => {
      const { getElementLabel } = await import('../discovery');
      const el = document.createElement('button');
      el.setAttribute('aria-label', 'Save Document');
      document.body.appendChild(el);

      expect(getElementLabel(el)).toBe('Save Document');
    });

    it('returns placeholder for inputs', async () => {
      const { getElementLabel } = await import('../discovery');
      const el = document.createElement('input');
      el.setAttribute('placeholder', 'Enter email');
      document.body.appendChild(el);

      expect(getElementLabel(el)).toBe('Enter email');
    });

    it('returns text content when no other label exists', async () => {
      const { getElementLabel } = await import('../discovery');
      const el = document.createElement('button');
      el.textContent = 'Click Me';
      document.body.appendChild(el);

      expect(getElementLabel(el)).toBe('Click Me');
    });
  });

  describe('generateElementId', () => {
    it('returns data-voice-id when present', async () => {
      const { generateElementId } = await import('../discovery');
      const el = document.createElement('button');
      el.setAttribute('data-voice-id', 'my-btn');
      document.body.appendChild(el);

      expect(generateElementId(el, 0)).toBe('my-btn');
    });

    it('returns element id when present', async () => {
      const { generateElementId } = await import('../discovery');
      const el = document.createElement('input');
      el.id = 'username';
      document.body.appendChild(el);

      expect(generateElementId(el, 0)).toBe('username');
    });

    it('returns name attribute as fallback', async () => {
      const { generateElementId } = await import('../discovery');
      const el = document.createElement('input');
      el.setAttribute('name', 'email');
      document.body.appendChild(el);

      expect(generateElementId(el, 0)).toBe('email');
    });

    it('returns fallback element-N when no identifiers exist', async () => {
      const { generateElementId } = await import('../discovery');
      const el = document.createElement('span');
      document.body.appendChild(el);

      expect(generateElementId(el, 7)).toBe('element-7');
    });
  });

  describe('getElementDescription', () => {
    it('describes a button', async () => {
      const { getElementDescription } = await import('../discovery');
      const el = document.createElement('button');
      el.setAttribute('aria-label', 'Submit');
      document.body.appendChild(el);

      const desc = getElementDescription(el, 'button');
      expect(desc).toContain('Button');
      expect(desc).toContain('Submit');
    });

    it('describes a checkbox with checked state', async () => {
      const { getElementDescription } = await import('../discovery');
      const el = document.createElement('input') as HTMLInputElement;
      el.type = 'checkbox';
      el.checked = true;
      el.setAttribute('aria-label', 'Dark mode');
      document.body.appendChild(el);

      const desc = getElementDescription(el, 'checkbox');
      expect(desc).toContain('Checkbox');
      expect(desc).toContain('checked');
    });
  });

  describe('isInteractable', () => {
    it('returns false for disabled elements', async () => {
      const { isInteractable } = await import('../discovery');
      const el = document.createElement('button') as HTMLButtonElement;
      el.disabled = true;
      document.body.appendChild(el);

      expect(isInteractable(el)).toBe(false);
    });

    it('returns false for aria-hidden elements', async () => {
      const { isInteractable } = await import('../discovery');
      const el = document.createElement('button');
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);

      expect(isInteractable(el)).toBe(false);
    });
  });

  describe('getComponentContext', () => {
    it('detects data-component attribute', async () => {
      const { getComponentContext } = await import('../discovery');
      const parent = document.createElement('div');
      parent.setAttribute('data-component', 'SettingsPanel');
      const child = document.createElement('input');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const ctx = getComponentContext(child);
      expect(ctx.component).toContain('settingspanel');
    });

    it('detects semantic class names', async () => {
      const { getComponentContext } = await import('../discovery');
      const parent = document.createElement('div');
      parent.classList.add('control-panel');
      const child = document.createElement('button');
      parent.appendChild(child);
      document.body.appendChild(parent);

      const ctx = getComponentContext(child);
      expect(ctx.component).toContain('control-panel');
    });
  });
});

// ---------------------------------------------------------------------------
// Actions tests — mock scanInteractiveElements to control what's "visible"
// ---------------------------------------------------------------------------
describe('Voice Actions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.doMock('../discovery', () => ({
      scanInteractiveElements: mockScanInteractiveElements,
      getComponentContext: vi.fn(() => ({ component: '', section: '', path: [] })),
      getElementLabel: vi.fn((el: HTMLElement) => el.textContent || ''),
      generateElementId: vi.fn((el: HTMLElement, i: number) => el.id || `el-${i}`),
      getElementDescription: vi.fn(() => ''),
      isInteractable: vi.fn(() => true),
    }));
    mockScanInteractiveElements.mockReset();
  });

  afterEach(() => {
    vi.doUnmock('../discovery');
  });

  describe('clickButton', () => {
    it('clicks a button matching by label', async () => {
      const btn = document.createElement('button');
      btn.textContent = 'Generate Report';
      btn.id = 'gen-btn';
      document.body.appendChild(btn);
      const clicked = vi.fn();
      btn.addEventListener('click', clicked);

      const ve = makeVoiceElement(btn, { label: 'Generate Report', id: 'gen-btn' });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ buttons: [ve], allElements: [ve] }),
      );

      const { clickButton } = await import('../actions');
      const result = clickButton('Generate');
      expect(result.success).toBe(true);
      expect(clicked).toHaveBeenCalled();
    });

    it('returns error when no matching button', async () => {
      mockScanInteractiveElements.mockReturnValue(emptySnapshot());

      const { clickButton } = await import('../actions');
      const result = clickButton('nonexistent-button-xyz');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No button found');
    });
  });

  describe('fillInput', () => {
    it('fills an input matching by id', async () => {
      const input = document.createElement('input') as HTMLInputElement;
      input.type = 'text';
      input.id = 'search-box';
      document.body.appendChild(input);

      const ve = makeVoiceElement(input, { type: 'input', label: 'Search', id: 'search-box' });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ inputs: [ve], allElements: [ve] }),
      );

      const { fillInput } = await import('../actions');
      const result = fillInput('search-box', 'hello world');
      expect(result.success).toBe(true);
    });

    it('returns error when no matching input', async () => {
      mockScanInteractiveElements.mockReturnValue(emptySnapshot());

      const { fillInput } = await import('../actions');
      const result = fillInput('nonexistent-input-xyz', 'text');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No input found');
    });

    it('fills input matching by generic fallback keyword', async () => {
      const input = document.createElement('input') as HTMLInputElement;
      input.type = 'text';
      document.body.appendChild(input);

      const ve = makeVoiceElement(input, { type: 'input', label: 'some-field', id: 'xyz' });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ inputs: [ve], allElements: [ve] }),
      );

      const { fillInput } = await import('../actions');
      const result = fillInput('input', 'test value');
      expect(result.success).toBe(true);
    });
  });

  describe('selectOption', () => {
    it('selects an option from a dropdown', async () => {
      const select = document.createElement('select') as HTMLSelectElement;
      select.id = 'color-picker';
      const opt1 = document.createElement('option');
      opt1.value = 'red';
      opt1.text = 'Red';
      const opt2 = document.createElement('option');
      opt2.value = 'blue';
      opt2.text = 'Blue';
      select.appendChild(opt1);
      select.appendChild(opt2);
      document.body.appendChild(select);

      const ve = makeVoiceElement(select, {
        type: 'select',
        label: 'Color',
        id: 'color-picker',
        options: ['Red', 'Blue'],
      });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ selects: [ve], allElements: [ve] }),
      );

      const { selectOption } = await import('../actions');
      const result = selectOption('color-picker', 'Blue');
      expect(result.success).toBe(true);
      expect(select.value).toBe('blue');
    });

    it('returns error when dropdown not found', async () => {
      mockScanInteractiveElements.mockReturnValue(emptySnapshot());

      const { selectOption } = await import('../actions');
      const result = selectOption('nonexistent', 'val');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No dropdown found');
    });

    it('returns error when option not found in existing dropdown', async () => {
      const select = document.createElement('select') as HTMLSelectElement;
      select.id = 'size';
      const opt = document.createElement('option');
      opt.value = 'small';
      opt.text = 'Small';
      select.appendChild(opt);
      document.body.appendChild(select);

      const ve = makeVoiceElement(select, {
        type: 'select',
        label: 'Size',
        id: 'size',
        options: ['Small'],
      });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ selects: [ve], allElements: [ve] }),
      );

      const { selectOption } = await import('../actions');
      const result = selectOption('size', 'XXXL');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('toggleCheckbox', () => {
    it('toggles a checkbox', async () => {
      const cb = document.createElement('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.id = 'agree';
      cb.checked = false;
      document.body.appendChild(cb);

      const ve = makeVoiceElement(cb, { type: 'checkbox', label: 'Agree', id: 'agree' });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ inputs: [ve], allElements: [ve] }),
      );

      const { toggleCheckbox } = await import('../actions');
      const result = toggleCheckbox('agree');
      expect(result.success).toBe(true);
      expect(cb.checked).toBe(true);
    });

    it('sets checkbox to explicit state', async () => {
      const cb = document.createElement('input') as HTMLInputElement;
      cb.type = 'checkbox';
      cb.id = 'notifications';
      cb.checked = true;
      document.body.appendChild(cb);

      const ve = makeVoiceElement(cb, { type: 'checkbox', label: 'Notifications', id: 'notifications' });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ inputs: [ve], allElements: [ve] }),
      );

      const { toggleCheckbox } = await import('../actions');
      const result = toggleCheckbox('notifications', false);
      expect(result.success).toBe(true);
      expect(cb.checked).toBe(false);
    });

    it('returns error when checkbox not found', async () => {
      mockScanInteractiveElements.mockReturnValue(emptySnapshot());

      const { toggleCheckbox } = await import('../actions');
      const result = toggleCheckbox('nonexistent-cb');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No checkbox found');
    });
  });

  describe('focusElement', () => {
    it('focuses an element by id', async () => {
      const input = document.createElement('input') as HTMLInputElement;
      input.id = 'focus-target';
      document.body.appendChild(input);

      const ve = makeVoiceElement(input, { type: 'input', label: 'Focus', id: 'focus-target' });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ inputs: [ve], allElements: [ve] }),
      );

      const { focusElement } = await import('../actions');
      const result = focusElement('focus-target');
      expect(result.success).toBe(true);
    });

    it('returns error when element not found', async () => {
      mockScanInteractiveElements.mockReturnValue(emptySnapshot());

      const { focusElement } = await import('../actions');
      const result = focusElement('missing-element');
      expect(result.success).toBe(false);
      expect(result.error).toContain('No element found');
    });
  });

  describe('getElementValue', () => {
    it('gets value from an input', async () => {
      const input = document.createElement('input') as HTMLInputElement;
      input.id = 'val-input';
      input.type = 'text';
      input.value = 'current-val';
      document.body.appendChild(input);

      const ve = makeVoiceElement(input, { type: 'input', label: 'Value', id: 'val-input' });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ inputs: [ve], allElements: [ve] }),
      );

      const { getElementValue } = await import('../actions');
      const result = getElementValue('val-input');
      expect(result.success).toBe(true);
      expect(result.value).toBe('current-val');
    });

    it('returns error when input not found', async () => {
      mockScanInteractiveElements.mockReturnValue(emptySnapshot());

      const { getElementValue } = await import('../actions');
      const result = getElementValue('no-such-input');
      expect(result.success).toBe(false);
    });
  });

  describe('submitForm', () => {
    it('clicks submit button when present', async () => {
      const btn = document.createElement('button');
      btn.textContent = 'Submit';
      btn.id = 'submit-btn';
      document.body.appendChild(btn);
      const clicked = vi.fn();
      btn.addEventListener('click', clicked);

      const ve = makeVoiceElement(btn, { label: 'Submit', id: 'submit-btn' });
      mockScanInteractiveElements.mockReturnValue(
        emptySnapshot({ buttons: [ve], allElements: [ve] }),
      );

      const { submitForm } = await import('../actions');
      const result = submitForm();
      expect(result.success).toBe(true);
      expect(clicked).toHaveBeenCalled();
    });

    it('returns error when no submit button or active input', async () => {
      mockScanInteractiveElements.mockReturnValue(emptySnapshot());

      const { submitForm } = await import('../actions');
      const result = submitForm();
      expect(result.success).toBe(false);
      expect(result.error).toContain('No submit button');
    });
  });
});

// ---------------------------------------------------------------------------
// Service lifecycle tests
// ---------------------------------------------------------------------------
describe('UniversalVoiceService', () => {
  let UniversalVoiceService: typeof import('../service').UniversalVoiceService;
  let service: InstanceType<typeof import('../service').UniversalVoiceService>;

  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    // Use real discovery for service tests since service calls scanInteractiveElements internally
    const mod = await import('../service');
    UniversalVoiceService = mod.UniversalVoiceService;
    service = new UniversalVoiceService();
  });

  afterEach(() => {
    service.stop();
  });

  it('starts and sets up mutation observer', () => {
    service.start();
    // Second start should be a no-op (idempotent)
    service.start();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Started monitoring DOM',
      undefined,
      'VoiceService',
    );
    // Should only log once since second call is a no-op
    const startCalls = mockLogger.debug.mock.calls.filter(
      (c: any[]) => c[0] === 'Started monitoring DOM',
    );
    expect(startCalls).toHaveLength(1);
  });

  it('stops and disconnects observer', () => {
    service.start();
    service.stop();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Stopped monitoring',
      undefined,
      'VoiceService',
    );
  });

  it('getSnapshot returns a valid snapshot', () => {
    const snapshot = service.getSnapshot();
    expect(snapshot).toHaveProperty('allElements');
    expect(snapshot).toHaveProperty('summary');
  });

  it('refresh forces a new scan', () => {
    document.body.innerHTML = '';
    const snap1 = service.getSnapshot();
    expect(snap1.buttons.length).toBe(0);

    // refresh picks up new state
    const snap2 = service.refresh();
    expect(snap2).toHaveProperty('allElements');
  });

  it('subscribe receives updates on refresh', () => {
    const callback = vi.fn();
    const unsub = service.subscribe(callback);

    service.refresh();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toHaveProperty('allElements');

    unsub();
    service.refresh();
    // After unsub, callback should not be called again
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('getSummary returns formatted string', () => {
    const summary = service.getSummary();
    expect(summary).toContain('UI State');
    expect(summary).toContain('Inputs');
    expect(summary).toContain('Buttons');
  });
});
