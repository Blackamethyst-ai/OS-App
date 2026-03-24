import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const executeCapabilityMock = vi.fn();
  const getCapabilityMock = vi.fn();
  const findCapabilityMock = vi.fn();
  const navigateToTabMock = vi.fn();
  const executeActionMock = vi.fn();
  const addLogMock = vi.fn();
  const setVoiceStateMock = vi.fn();
  const setVoiceNexusStateMock = vi.fn();
  const setModeMock = vi.fn();
  const setCPBStateMock = vi.fn();
  const playSuccessMock = vi.fn();
  const playTransitionMock = vi.fn();
  const playClickMock = vi.fn();
  const fillInputMock = vi.fn(() => ({ success: true, element: 'input' }));
  const clickButtonMock = vi.fn(() => ({ success: true, element: 'button' }));
  const selectOptionMock = vi.fn(() => ({ success: true, element: 'select' }));
  const scanInteractiveElementsMock = vi.fn(() => ({ summary: 'ok', allElements: [] }));
  const routeQueryToCPBMock = vi.fn(() => ({
    path: 'ace',
    reasoning: 'matched complexity',
    confidence: 0.9,
    matchedCapabilities: [],
  }));
  const executeQueryWithCPBMock = vi.fn(async () => ({
    success: true,
    output: 'Reasoned answer',
    executionPath: 'ace',
    dqScore: 0.82,
    executionTimeMs: 120,
  }));
  const actionRegistry: Record<string, unknown> = {};

  const liveSessionMock: Record<string, any> = {
    onToolCall: undefined,
    onAgentSwitch: undefined,
    isConnected: vi.fn(() => false),
    disconnect: vi.fn(),
    primeAudio: vi.fn(),
    connect: vi.fn(),
  };

  const appState = {
    voice: {
      isActive: false,
      voiceName: 'Puck',
      partialTranscript: null,
      mentalState: { skepticism: 50, excitement: 50, alignment: 50 },
    },
    voiceNexus: {},
    operationalContext: {},
    mode: 'DASHBOARD',
    tasks: [],
    actions: {
      setVoiceState: setVoiceStateMock,
      setVoiceNexusState: setVoiceNexusStateMock,
      setMode: setModeMock,
      addLog: addLogMock,
      setCPBState: setCPBStateMock,
    },
  };

  const useAppStoreMock = Object.assign(vi.fn(() => appState), {
    getState: vi.fn(() => ({ mode: 'DASHBOARD' })),
  });

  return {
    executeCapabilityMock,
    getCapabilityMock,
    findCapabilityMock,
    navigateToTabMock,
    executeActionMock,
    addLogMock,
    setVoiceStateMock,
    setVoiceNexusStateMock,
    setModeMock,
    setCPBStateMock,
    playSuccessMock,
    playTransitionMock,
    playClickMock,
    fillInputMock,
    clickButtonMock,
    selectOptionMock,
    scanInteractiveElementsMock,
    routeQueryToCPBMock,
    executeQueryWithCPBMock,
    actionRegistry,
    liveSessionMock,
    useAppStoreMock,
  };
});

vi.mock('../../../../store', () => ({
  useAppStore: mocks.useAppStoreMock,
}));

vi.mock('../../../../stores/useSystemMind', () => ({
  useSystemMind: vi.fn(() => ({
    currentLocation: 'DASHBOARD',
    getSnapshot: vi.fn(() => ({ available_actions: [], current_location: 'DASHBOARD' })),
    executeAction: mocks.executeActionMock,
    actionRegistry: mocks.actionRegistry,
    activeTelemetry: {},
    getEpoch: vi.fn(() => 1),
    getActionsForSector: vi.fn(() => []),
    subscribeToEpoch: vi.fn(() => () => {}),
    getContextDigest: vi.fn(() => 'digest'),
  })),
}));

vi.mock('../../../../services/geminiService', () => ({
  liveSession: mocks.liveSessionMock,
  HIVE_AGENTS: { Puck: { name: 'Puck', id: 'puck' } },
  constructHiveContext: vi.fn(() => 'context'),
  runAgentReasoning: vi.fn(),
}));

vi.mock('../../../../services/voiceNexus', () => ({
  voiceNexus: {},
  analyzeComplexity: vi.fn(),
  runPreflightCheck: vi.fn(() => ({ canProceed: true, mode: 'browser', warnings: [], errors: [] })),
  formatPreflightResult: vi.fn(() => 'ok'),
}));

vi.mock('../../../../services/capabilities', () => ({
  executeCapability: mocks.executeCapabilityMock,
  findCapability: mocks.findCapabilityMock,
  getCapability: mocks.getCapabilityMock,
  getVoiceCapabilityList: vi.fn(() => ''),
  initializeCapabilities: vi.fn(),
  routeQueryToCPB: mocks.routeQueryToCPBMock,
  executeQueryWithCPB: mocks.executeQueryWithCPBMock,
}));

vi.mock('../../../../services/audioService', () => ({
  audio: {
    playSuccess: mocks.playSuccessMock,
    playTransition: mocks.playTransitionMock,
    playClick: mocks.playClickMock,
  },
}));

vi.mock('../../../../services/archon', () => ({
  CODEBASE_KNOWLEDGE: { structure: {}, subsystems: {} },
  buildCodebaseContext: vi.fn(() => ''),
}));

vi.mock('../../../../services/voiceUIContext', () => ({
  getFullSystemContext: vi.fn(() => ''),
  getSectorContext: vi.fn(() => ''),
}));

vi.mock('../../../../services/universalVoiceHooks', () => ({
  universalVoice: {},
  fillInput: mocks.fillInputMock,
  clickButton: mocks.clickButtonMock,
  selectOption: mocks.selectOptionMock,
  scanInteractiveElements: mocks.scanInteractiveElementsMock,
}));

vi.mock('../../../../services/tabNavigationRegistry', () => ({
  navigateToTab: mocks.navigateToTabMock,
  generateTabContext: vi.fn(() => ''),
}));

vi.mock('../../../../services/memory/MemoryStore', () => ({
  SovereignMemory: class {
    store = vi.fn();
    retrieve = vi.fn();
    search = vi.fn(() => []);
  },
}));

vi.mock('../../../../services/persistenceService', () => ({
  neuralVault: {
    get: vi.fn(async () => []),
    set: vi.fn(async () => undefined),
  },
}));

vi.mock('../../../../services/faceDetectionService', () => ({
  faceDetectionService: {
    isReady: vi.fn(() => false),
    estimateStress: vi.fn(() => ({ level: 'low' })),
    getBlinkRate: vi.fn(() => 0),
  },
}));

vi.mock('../../../../services/dreamProtocol', () => ({
  dreamProtocol: {
    getStatus: vi.fn(() => ({})),
    getPastSessions: vi.fn(() => []),
  },
}));

vi.mock('../../../../services/bicameralService', () => ({
  adaptiveConsensusEngine: {},
  quickConsensus: vi.fn(),
  generateDecompositionMap: vi.fn(),
}));

vi.mock('../../../../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../parts/tools', () => ({
  VOICE_TOOLS: [],
}));

import VoiceManager from '../index';

describe('VoiceManager tool-call routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.liveSessionMock.onToolCall = undefined;
    Object.keys(mocks.actionRegistry).forEach((key) => delete mocks.actionRegistry[key]);
  });

  afterEach(() => {
    cleanup();
  });

  async function mountAndGetToolCallHandler(): Promise<(name: string, args: Record<string, unknown>) => Promise<any>> {
    render(React.createElement(VoiceManager));
    await waitFor(() => {
      expect(typeof mocks.liveSessionMock.onToolCall).toBe('function');
    });
    return mocks.liveSessionMock.onToolCall as (name: string, args: Record<string, unknown>) => Promise<any>;
  }

  it('executes execute_component_action through capability registry when capability succeeds', async () => {
    mocks.getCapabilityMock.mockReturnValue({
      id: 'ui_toggle_theme',
      complexity: 'simple',
      executionPath: 'direct',
    });
    mocks.executeCapabilityMock.mockResolvedValue({
      success: true,
      timing: 9,
      result: { success: true, data: { changed: true } },
    });

    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('execute_component_action', {
      action_id: 'ui_toggle_theme',
      args: { theme: 'MIDNIGHT' },
    });

    expect(result.status).toBe('ACTION_EXECUTED');
    expect(result.actionId).toBe('ui_toggle_theme');
    expect(mocks.executeCapabilityMock).toHaveBeenCalledWith('ui_toggle_theme', { theme: 'MIDNIGHT' });
    expect(mocks.executeActionMock).not.toHaveBeenCalled();
  });

  it('falls back to SystemMind execution when capability execution fails', async () => {
    mocks.getCapabilityMock.mockReturnValue({
      id: 'run_local_action',
      complexity: 'simple',
      executionPath: 'direct',
    });
    mocks.executeCapabilityMock.mockResolvedValue({
      success: false,
      error: 'capability failure',
    });
    mocks.actionRegistry.run_local_action = { id: 'run_local_action' };
    mocks.executeActionMock.mockResolvedValue({ output: { ok: true } });

    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('execute_component_action', {
      action_id: 'run_local_action',
      args: { count: 1 },
    });

    expect(mocks.executeActionMock).toHaveBeenCalledWith('run_local_action', { count: 1 });
    expect(result.status).toBe('ACTION_EXECUTED');
    expect(result.actionId).toBe('run_local_action');
  });

  it('remaps unknown action_id via findCapability and executes mapped capability', async () => {
    mocks.getCapabilityMock.mockReturnValue(undefined);
    mocks.findCapabilityMock.mockReturnValue({
      id: 'architect_generate_process',
      kind: 'action',
      complexity: 'analysis',
      executionPath: 'ace',
    });
    mocks.executeCapabilityMock.mockResolvedValue({
      success: true,
      timing: 12,
      result: { success: true, data: { plan: 'ok' } },
    });

    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('execute_component_action', {
      action_id: 'generate process',
      args: { goal: 'refactor voice' },
    });

    expect(mocks.findCapabilityMock).toHaveBeenCalledWith('generate process', { kind: 'action' });
    expect(mocks.executeCapabilityMock).toHaveBeenCalledWith('architect_generate_process', { goal: 'refactor voice' });
    expect(result.status).toBe('CPB_ACTION_EXECUTED');
    expect(result.actionId).toBe('architect_generate_process');
    expect(mocks.executeActionMock).not.toHaveBeenCalled();
  });

  it('returns a validation error when execute_component_action is called without action_id', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('execute_component_action', {
      args: { foo: 'bar' },
    });

    expect(result.error).toBe('Missing required action_id');
    expect(mocks.executeCapabilityMock).not.toHaveBeenCalled();
    expect(mocks.executeActionMock).not.toHaveBeenCalled();
  });

  it('returns validation error for navigate_to_sector without target_sector', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('navigate_to_sector', {});

    expect(result.error).toBe('Missing required target_sector');
  });

  it('handles undefined tool args safely via normalization', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await (onToolCall as unknown as (name: string, args?: Record<string, unknown>) => Promise<any>)('quick_answer');

    expect(result.error).toBe('Missing required question');
  });

  it('uses capability registry first for navigate_to_tab and avoids legacy fallback on success', async () => {
    mocks.findCapabilityMock
      .mockReturnValueOnce({ id: 'tab_nexus-main' })
      .mockReturnValueOnce(undefined);
    mocks.executeCapabilityMock.mockResolvedValue({
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

    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('navigate_to_tab', { query: 'nexus' });

    expect(result.status).toBe('TAB_NAVIGATION_COMPLETE');
    expect(result.capabilityId).toBe('tab_nexus-main');
    expect(mocks.navigateToTabMock).not.toHaveBeenCalled();
  });

  it('falls back to legacy tab navigation when no tab capability match is found', async () => {
    mocks.findCapabilityMock.mockReturnValue(undefined);
    mocks.navigateToTabMock.mockReturnValue({
      success: true,
      sector: 'BIBLIOMORPHIC',
      sectorLabel: 'Research',
      tab: 'discovery',
      tabLabel: 'Discovery Lab',
      route: '/bibliomorphic',
    });

    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('navigate_to_tab', { query: 'discovery' });

    expect(mocks.navigateToTabMock).toHaveBeenCalledWith('discovery');
    expect(result.status).toBe('TAB_NAVIGATION_COMPLETE');
    expect(result.tabLabel).toBe('Discovery Lab');
  });

  it('handles input_text successfully via universal voice hooks', async () => {
    mocks.fillInputMock.mockReturnValue({ success: true, element: 'mission-objective' });
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('input_text', {
      field_id: 'mission-objective',
      text: 'Ship the refactor',
    });

    expect(mocks.fillInputMock).toHaveBeenCalledWith('mission-objective', 'Ship the refactor');
    expect(result.status).toBe('TEXT_INPUT_COMPLETE');
    expect(result.textLength).toBe(17);
  });

  it('returns validation error for input_text without field_id', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('input_text', { text: 'hello' });

    expect(result.error).toBe('Missing required field_id');
    expect(mocks.fillInputMock).not.toHaveBeenCalled();
  });

  it('falls back to action execution when input_text hook fails', async () => {
    mocks.fillInputMock.mockReturnValue({ success: false, element: '' } as any);
    mocks.actionRegistry.set_mission_objective = { id: 'set_mission_objective' };
    mocks.executeActionMock.mockResolvedValue({ output: { ok: true } });

    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('input_text', {
      field_id: 'mission-objective',
      text: 'Fallback path',
    });

    expect(mocks.executeActionMock).toHaveBeenCalledWith('set_mission_objective', { text: 'Fallback path', value: 'Fallback path' });
    expect(result.status).toBe('TEXT_INPUT_VIA_ACTION');
  });

  it('handles click_element successfully', async () => {
    mocks.clickButtonMock.mockReturnValue({ success: true, element: 'submit' });
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('click_element', { target: 'submit' });

    expect(mocks.clickButtonMock).toHaveBeenCalledWith('submit');
    expect(result.status).toBe('CLICK_COMPLETE');
  });

  it('returns validation error for click_element without target', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('click_element', {});

    expect(result.error).toBe('Missing click target');
    expect(mocks.clickButtonMock).not.toHaveBeenCalled();
  });

  it('handles select_option successfully', async () => {
    mocks.selectOptionMock.mockReturnValue({ success: true, element: 'model-dropdown' });
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('select_option', {
      dropdown: 'model',
      option: 'gpt-5',
    });

    expect(mocks.selectOptionMock).toHaveBeenCalledWith('model', 'gpt-5');
    expect(result.status).toBe('SELECT_COMPLETE');
  });

  it('returns validation error for select_option with missing args', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('select_option', { dropdown: 'model' });

    expect(result.error).toBe('Missing dropdown or option');
    expect(mocks.selectOptionMock).not.toHaveBeenCalled();
  });

  it('returns safe scan_ui output when allElements is missing', async () => {
    mocks.scanInteractiveElementsMock.mockReturnValue({ summary: 'scan complete', allElements: [] });
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('scan_ui', {});

    expect(result.status).toBe('OK');
    expect(result.allElements).toEqual([]);
  });

  it('returns THINK error when task is missing', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('think', { context: 'any context' });

    expect(result.status).toBe('THOUGHT_ERROR');
    expect(result.error).toBe('Missing required task');
    expect(mocks.routeQueryToCPBMock).not.toHaveBeenCalled();
    expect(mocks.executeQueryWithCPBMock).not.toHaveBeenCalled();
  });

  it('returns THINK complete result on successful CPB execution', async () => {
    mocks.routeQueryToCPBMock.mockReturnValue({
      path: 'ace',
      reasoning: 'routed to ace',
      confidence: 0.88,
      matchedCapabilities: [],
    });
    mocks.executeQueryWithCPBMock.mockResolvedValue({
      success: true,
      output: 'CPB output',
      executionPath: 'ace',
      dqScore: 0.9,
      executionTimeMs: 140,
    });

    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('think', { task: 'Analyze architecture' });

    expect(result.status).toBe('THOUGHT_COMPLETE');
    expect(result.reasoning_path).toBe('ace');
    expect(result.response).toBe('CPB output');
    expect(result.quality_score).toBe('90%');
    expect(mocks.executeQueryWithCPBMock).toHaveBeenCalled();
  });

  it('returns validation error for search_intel without query', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('search_intel', {});

    expect(result.error).toBe('Missing required query');
    expect(mocks.executeActionMock).not.toHaveBeenCalled();
  });

  it('returns validation error for converge_lattices without targetGoal', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('converge_lattices', {});

    expect(result.error).toBe('Missing required targetGoal');
    expect(mocks.executeActionMock).not.toHaveBeenCalled();
  });

  it('returns validation error for update_task_priority without taskId', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('update_task_priority', { priority: 'HIGH' });

    expect(result.error).toBe('Missing required taskId');
  });

  it('returns validation error for update_task_priority without priority', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('update_task_priority', { taskId: 'abc123' });

    expect(result.error).toBe('Missing required priority');
  });

  it('returns validation error for media_control without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('media_control', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for open_external without target', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('open_external', {});

    expect(result.error).toBe('Missing required target');
  });

  it('returns validation error for chain_commands without commands', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('chain_commands', {});

    expect(result.error).toBe('Missing commands');
  });

  it('returns validation error for parallel_ops without operations', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('parallel_ops', {});

    expect(result.error).toBe('Missing operations');
  });

  it('returns validation error for set_reminder with invalid delay', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('set_reminder', { message: 'Stand up', delayMinutes: 0 });

    expect(result.error).toBe('Invalid delayMinutes');
  });

  it('returns validation error for bicameral_dialogue without topic', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('bicameral_dialogue', {});

    expect(result.error).toBe('Missing required topic');
  });

  it('returns validation error for recall_memory without query', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('recall_memory', {});

    expect(result.error).toBe('Missing required query');
  });

  it('returns validation error for smart_query without query', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('smart_query', {});

    expect(result.error).toBe('Missing required query');
  });

  it('returns validation error for set_scene without scene', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('set_scene', {});

    expect(result.error).toBe('Missing required scene');
  });

  it('returns validation error for create_task without title', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('create_task', { priority: 'HIGH' });

    expect(result.error).toBe('Missing required title');
  });

  it('returns validation error for quick_capture without thought', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('quick_capture', {});

    expect(result.error).toBe('Missing thought');
  });

  it('returns validation error for system_mode without mode', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('system_mode', {});

    expect(result.error).toBe('Missing required mode');
  });

  it('returns validation error for predict_outcome without scenario', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('predict_outcome', {});

    expect(result.error).toBe('Missing required scenario');
  });

  it('returns validation error for compare_analyze without items', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('compare_analyze', {});

    expect(result.error).toBe('Missing items');
  });

  it('returns validation error for research_topic without topic', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('research_topic', {});

    expect(result.error).toBe('Missing required topic');
  });

  it('returns validation error for cross_reference without item', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('cross_reference', {});

    expect(result.error).toBe('Missing required item');
  });

  it('returns validation error for debug_assist without problem', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('debug_assist', {});

    expect(result.error).toBe('Missing required problem');
  });

  it('returns validation error for delegate_to_agent without agent/task', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('delegate_to_agent', {});

    expect(result.error).toBe('Missing required agent or task');
  });

  it('returns validation error for decompose_task without goal', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('decompose_task', {});

    expect(result.error).toBe('Missing required goal');
  });

  it('returns validation error for run_consensus without question', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('run_consensus', {});

    expect(result.error).toBe('Missing required question');
  });

  it('returns validation error for save_snapshot without label', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('save_snapshot', {});

    expect(result.error).toBe('Missing required label');
  });

  it('returns validation error for load_snapshot without label', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('load_snapshot', {});

    expect(result.error).toBe('Missing required label');
  });

  it('returns validation error for toggle_biometrics without enabled flag', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('toggle_biometrics', {});

    expect(result.error).toBe('Missing required enabled');
  });

  it('returns validation error for copy_to_clipboard without content', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('copy_to_clipboard', {});

    expect(result.error).toBe('Missing required content');
  });

  it('returns validation error for execute_sequence without steps', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('execute_sequence', {});

    expect(result.error).toBe('Missing steps');
  });

  it('returns validation error for create_macro without trigger', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('create_macro', { actions: ['open dashboard'] });

    expect(result.error).toBe('Missing required trigger');
  });

  it('returns validation error for create_macro without actions', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('create_macro', { trigger: 'daily-start' });

    expect(result.error).toBe('Missing actions');
  });

  it('returns validation error for manage_macros without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('manage_macros', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for schedule_action without action/when', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('schedule_action', {});

    expect(result.error).toBe('Missing required action or when');
  });

  it('returns validation error for learn_preference without category/preference', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('learn_preference', {});

    expect(result.error).toBe('Missing required category or preference');
  });

  it('returns validation error for timer_control without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('timer_control', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for timer_control start with invalid duration', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('timer_control', { action: 'start', duration: 0 });

    expect(result.error).toBe('Invalid duration');
  });

  it('returns validation error for calculate without expression', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('calculate', {});

    expect(result.error).toBe('Missing required expression');
  });

  it('returns validation error for quick_answer without question', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('quick_answer', {});

    expect(result.error).toBe('Missing required question');
  });

  it('returns validation error for pause_resume without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('pause_resume', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for teach_command without trigger/action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('teach_command', {});

    expect(result.error).toBe('Missing required trigger or action');
  });

  it('returns validation error for voice_templates save without steps', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('voice_templates', { action: 'save', name: 'morning-routine' });

    expect(result.error).toBe('Missing steps');
  });

  it('returns validation error for remember_person without person when remembering', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('remember_person', { action: 'remember', info: 'works with us' });

    expect(result.error).toBe('Missing required person');
  });

  it('returns validation error for topic_memory without topic when adding', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('topic_memory', { action: 'add', content: 'note' });

    expect(result.error).toBe('Missing required topic');
  });

  it('returns validation error for ambient_listen without mode', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('ambient_listen', {});

    expect(result.error).toBe('Missing required mode');
  });

  it('returns validation error for workspace without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('workspace', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for workspace save without name', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('workspace', { action: 'save' });

    expect(result.error).toBe('Missing required name');
  });

  it('returns validation error for learn_pattern without pattern', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('learn_pattern', {});

    expect(result.error).toBe('Missing required pattern');
  });

  it('returns validation error for track_goal without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('track_goal', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for track_goal update with invalid progress', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('track_goal', { action: 'update', goal: 'Finish API', progress: 'abc' });

    expect(result.error).toBe('Invalid progress');
  });

  it('returns validation error for voice_journal without entry', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('voice_journal', {});

    expect(result.error).toBe('Missing required entry');
  });

  it('returns validation error for quick_command without command', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('quick_command', {});

    expect(result.error).toBe('Missing required command');
  });

  it('returns validation error for annotate_item without annotation text', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('annotate_item', { action: 'add', target: 'task-1' });

    expect(result.error).toBe('Missing annotation');
  });

  it('returns validation error for voice_bookmark without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('voice_bookmark', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for voice_bookmark go without name', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('voice_bookmark', { action: 'go' });

    expect(result.error).toBe('Missing required name');
  });

  it('returns validation error for smart_notify without mode', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('smart_notify', {});

    expect(result.error).toBe('Missing required mode');
  });

  it('returns validation error for conversation_mode without style', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('conversation_mode', {});

    expect(result.error).toBe('Missing required style');
  });

  it('returns validation error for voice_search without query', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('voice_search', {});

    expect(result.error).toBe('Missing required query');
  });

  it('returns validation error for proactive_suggest without level', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('proactive_suggest', {});

    expect(result.error).toBe('Missing required level');
  });

  it('returns validation error for personality_mode without personality', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('personality_mode', {});

    expect(result.error).toBe('Missing required personality');
  });

  it('returns validation error for document_ops create without name', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('document_ops', { action: 'create' });

    expect(result.error).toBe('Missing required name');
  });

  it('returns validation error for meeting_mode note without content', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('meeting_mode', { action: 'note' });

    expect(result.error).toBe('Missing required content');
  });

  it('returns validation error for presentation_mode goto without slideNumber', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('presentation_mode', { action: 'goto' });

    expect(result.error).toBe('Invalid slideNumber');
  });

  it('returns validation error for quick_note add without content', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('quick_note', { action: 'add' });

    expect(result.error).toBe('Missing required content');
  });

  it('returns validation error for transcribe without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('transcribe', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for dictate_to_doc without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('dictate_to_doc', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for screen_layout without layout', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('screen_layout', {});

    expect(result.error).toBe('Missing required layout');
  });

  it('returns validation error for dev_commands without command', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('dev_commands', {});

    expect(result.error).toBe('Missing required command');
  });

  it('returns validation error for git_voice without command', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('git_voice', {});

    expect(result.error).toBe('Missing required command');
  });

  it('returns validation error for build_run without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('build_run', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for pinned_items without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('pinned_items', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for pinned_items pin without item', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('pinned_items', { action: 'pin' });

    expect(result.error).toBe('Missing required item');
  });

  it('returns validation error for analyze_code without target', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('analyze_code', {});

    expect(result.error).toBe('Missing required target');
  });

  it('returns validation error for generate_code without description', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('generate_code', {});

    expect(result.error).toBe('Missing required description');
  });

  it('returns validation error for focus_mode without enabled', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('focus_mode', {});

    expect(result.error).toBe('Missing required enabled');
  });

  it('returns validation error for trigger_webhook without target', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('trigger_webhook', {});

    expect(result.error).toBe('Missing required target');
  });

  it('returns validation error for ambient_mode without enabled', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('ambient_mode', {});

    expect(result.error).toBe('Missing required enabled');
  });

  it('returns validation error for dictation_mode without enabled', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('dictation_mode', {});

    expect(result.error).toBe('Missing required enabled');
  });

  it('returns validation error for narrate_actions without enabled', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('narrate_actions', {});

    expect(result.error).toBe('Missing required enabled');
  });

  it('returns validation error for rate_feedback without rating', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('rate_feedback', {});

    expect(result.error).toBe('Missing required rating');
  });

  it('returns validation error for focus_entity without entity', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('focus_entity', {});

    expect(result.error).toBe('Missing required entity');
  });

  it('returns validation error for voice_shortcut without action', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('voice_shortcut', {});

    expect(result.error).toBe('Missing required action');
  });

  it('returns validation error for voice_shortcut create without phrase/expansion', async () => {
    const onToolCall = await mountAndGetToolCallHandler();
    const result = await onToolCall('voice_shortcut', { action: 'create', phrase: 'launch' });

    expect(result.error).toBe('Missing required phrase or expansion');
  });
});
