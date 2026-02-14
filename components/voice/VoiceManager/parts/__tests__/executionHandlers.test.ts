import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleClickElement,
  handleExecuteComponentAction,
  handleInputText,
  handleNavigateToTab,
  handleScanUI,
  handleSelectOption,
} from '../executionHandlers';

function createBaseDeps() {
  return {
    addLog: vi.fn(),
    logger: { warn: vi.fn() },
    audio: {
      playSuccess: vi.fn(),
      playTransition: vi.fn(),
      playClick: vi.fn(),
    },
    getCapability: vi.fn(),
    findCapability: vi.fn(),
    executeCapability: vi.fn(),
    executeAction: vi.fn(),
    actionRegistry: {} as Record<string, unknown>,
    navigateToTab: vi.fn(),
    fillInput: vi.fn(),
    clickButton: vi.fn(),
    selectOption: vi.fn(),
    scanInteractiveElements: vi.fn(),
  };
}

describe('executionHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleExecuteComponentAction', () => {
    it('returns validation error when action_id is missing', async () => {
      const deps = createBaseDeps();
      const result = await handleExecuteComponentAction({}, deps);

      expect(result.error).toBe('Missing required action_id');
      expect(deps.executeCapability).not.toHaveBeenCalled();
      expect(deps.executeAction).not.toHaveBeenCalled();
    });

    it('defaults args to empty object when args is not an object', async () => {
      const deps = createBaseDeps();
      deps.getCapability.mockReturnValue({
        id: 'toggle_theme',
        complexity: 'simple',
        executionPath: 'direct',
      });
      deps.executeCapability.mockResolvedValue({
        success: true,
        timing: 5,
        result: { ok: true },
      });

      const result = await handleExecuteComponentAction(
        { action_id: 'toggle_theme', args: 'not-an-object' },
        deps
      );

      expect(deps.executeCapability).toHaveBeenCalledWith('toggle_theme', {});
      expect(result.status).toBe('ACTION_EXECUTED');
    });

    it('routes complex capability to CPB-style status', async () => {
      const deps = createBaseDeps();
      deps.getCapability.mockReturnValue({
        id: 'architect_generate_process',
        complexity: 'analysis',
        executionPath: 'ace',
      });
      deps.executeCapability.mockResolvedValue({
        success: true,
        timing: 12,
        result: { ok: true },
      });

      const result = await handleExecuteComponentAction(
        { action_id: 'architect_generate_process', args: { goal: 'x' } },
        deps
      );

      expect(result.status).toBe('CPB_ACTION_EXECUTED');
      expect(result.executionPath).toBe('ace');
      expect(deps.audio.playSuccess).toHaveBeenCalled();
    });

    it('uses mapped capability id when findCapability resolves', async () => {
      const deps = createBaseDeps();
      deps.getCapability.mockReturnValue(undefined);
      deps.findCapability.mockReturnValue({
        id: 'mapped_action',
        complexity: 'simple',
        executionPath: 'direct',
      });
      deps.executeCapability.mockResolvedValue({
        success: true,
        timing: 7,
        result: { ok: true },
      });

      const result = await handleExecuteComponentAction(
        { action_id: 'mapped action', args: { a: 1 } },
        deps
      );

      expect(deps.findCapability).toHaveBeenCalledWith('mapped action', { kind: 'action' });
      expect(deps.executeCapability).toHaveBeenCalledWith('mapped_action', { a: 1 });
      expect(result.actionId).toBe('mapped_action');
    });

    it('falls back to action registry execution when capability execution fails', async () => {
      const deps = createBaseDeps();
      deps.getCapability.mockReturnValue({
        id: 'local_action',
        complexity: 'simple',
        executionPath: 'direct',
      });
      deps.executeCapability.mockResolvedValue({
        success: false,
        error: 'capability failed',
      });
      deps.actionRegistry.local_action = { id: 'local_action' };
      deps.executeAction.mockResolvedValue({ output: { ok: true } });

      const result = await handleExecuteComponentAction(
        { action_id: 'local_action', args: { k: 1 } },
        deps
      );

      expect(deps.executeAction).toHaveBeenCalledWith('local_action', { k: 1 });
      expect(result.status).toBe('ACTION_EXECUTED');
    });

    it('returns not-found error when neither capability nor action match is found', async () => {
      const deps = createBaseDeps();
      deps.getCapability.mockReturnValue(undefined);
      deps.findCapability.mockReturnValue(undefined);

      const result = await handleExecuteComponentAction(
        { action_id: 'unknown-action' },
        deps
      );

      expect(result.error).toBe('Action "unknown-action" not found');
      expect(result.hint).toBe('Call get_available_actions to see all available actions');
    });
  });

  describe('handleNavigateToTab', () => {
    it('returns validation error when query is missing', async () => {
      const deps = createBaseDeps();
      const result = await handleNavigateToTab({}, deps);
      expect(result.error).toBe('Missing tab query');
    });

    it('returns capability tab result when capability execution succeeds with data', async () => {
      const deps = createBaseDeps();
      deps.findCapability
        .mockReturnValueOnce({ id: 'tab_nexus-main' })
        .mockReturnValueOnce(undefined);
      deps.executeCapability.mockResolvedValue({
        success: true,
        result: {
          data: {
            success: true,
            sector: 'NEXUS',
            sectorLabel: 'Nexus',
            tab: 'nexus',
            tabLabel: 'Nexus Matrix',
            route: '/nexus',
          },
        },
      });

      const result = await handleNavigateToTab({ query: 'nexus' }, deps);
      expect(result.status).toBe('TAB_NAVIGATION_COMPLETE');
      expect(result.capabilityId).toBe('tab_nexus-main');
      expect(deps.navigateToTab).not.toHaveBeenCalled();
    });

    it('falls back to legacy tab navigation when capability fails', async () => {
      const deps = createBaseDeps();
      deps.findCapability.mockReturnValue({ id: 'tab_discovery' });
      deps.executeCapability.mockResolvedValue({ success: false, error: 'fail' });
      deps.navigateToTab.mockReturnValue({
        success: true,
        sector: 'BIBLIOMORPHIC',
        sectorLabel: 'Research',
        tab: 'discovery',
        tabLabel: 'Discovery Lab',
        route: '/bibliomorphic',
      });

      const result = await handleNavigateToTab({ query: 'discovery' }, deps);
      expect(deps.navigateToTab).toHaveBeenCalledWith('discovery');
      expect(result.tabLabel).toBe('Discovery Lab');
    });
  });

  describe('handleInputText', () => {
    it('validates field_id and text', async () => {
      const deps = createBaseDeps();
      let result = await handleInputText({ text: 'hello' }, deps);
      expect(result.error).toBe('Missing required field_id');

      result = await handleInputText({ field_id: 'target' }, deps);
      expect(result.error).toBe('Missing required text');
    });

    it('uses fillInput success path', async () => {
      const deps = createBaseDeps();
      deps.fillInput.mockReturnValue({ success: true, element: 'target-input' });

      const result = await handleInputText(
        { field_id: 'target-input', text: 'hello world' },
        deps
      );

      expect(deps.fillInput).toHaveBeenCalledWith('target-input', 'hello world');
      expect(result.status).toBe('TEXT_INPUT_COMPLETE');
      expect(result.textLength).toBe(11);
    });

    it('falls back to executeAction when fillInput fails and action exists', async () => {
      const deps = createBaseDeps();
      deps.fillInput.mockReturnValue({ success: false, error: 'no field' });
      deps.actionRegistry.set_target_input = { id: 'set_target_input' };
      deps.executeAction.mockResolvedValue({ output: { ok: true } });

      const result = await handleInputText(
        { field_id: 'target-input', text: 'hello' },
        deps
      );

      expect(deps.executeAction).toHaveBeenCalledWith('set_target_input', { text: 'hello', value: 'hello' });
      expect(result.status).toBe('TEXT_INPUT_VIA_ACTION');
    });
  });

  describe('handleClickElement', () => {
    it('validates target and supports button alias', () => {
      const deps = createBaseDeps();
      let result = handleClickElement({}, deps);
      expect(result.error).toBe('Missing click target');

      deps.clickButton.mockReturnValue({ success: true, element: 'submit' });
      result = handleClickElement({ button: 'submit' }, deps);
      expect(deps.clickButton).toHaveBeenCalledWith('submit');
      expect(result.status).toBe('CLICK_COMPLETE');
    });
  });

  describe('handleSelectOption', () => {
    it('validates args and returns success on selection', () => {
      const deps = createBaseDeps();
      let result = handleSelectOption({ dropdown: 'model' }, deps);
      expect(result.error).toBe('Missing dropdown or option');

      deps.selectOption.mockReturnValue({ success: true, element: 'model-dropdown' });
      result = handleSelectOption({ dropdown: 'model', option: 'gpt-5' }, deps);
      expect(result.status).toBe('SELECT_COMPLETE');
    });
  });

  describe('handleScanUI', () => {
    it('returns stable output even when allElements is missing', () => {
      const deps = createBaseDeps();
      deps.scanInteractiveElements.mockReturnValue({ summary: 'scan complete' });

      const result = handleScanUI(deps);
      expect(result.status).toBe('OK');
      expect(result.allElements).toEqual([]);
    });
  });
});
