import type { Capability } from '../../../../services/capabilities';
import type { TabNavigationResult } from '../../../../services/tabNavigationRegistry';

type AddLog = (level: string, message: string) => void;

type LoggerLike = {
  warn: (message: string, error?: unknown, context?: string) => void;
};

type AudioLike = {
  playSuccess: () => void;
  playTransition: () => void;
  playClick: () => void;
};

type CapabilityResult = {
  success: boolean;
  result?: unknown;
  error?: string;
  timing?: number;
};

type ExecuteCapability = (id: string, args?: Record<string, unknown>) => Promise<CapabilityResult>;
type GetCapability = (id: string) => Capability | undefined;
type FindCapability = (query: string, options?: Record<string, unknown>) => Capability | undefined;
type ExecuteAction = (id: string, args?: Record<string, unknown>) => Promise<unknown>;
type NavigateToTab = (query: string) => TabNavigationResult;
type FillInput = (fieldId: string, text: string) => { success: boolean; element?: string; error?: string };
type ClickButton = (target: string) => { success: boolean; element?: string; error?: string };
type SelectOption = (dropdown: string, option: string) => { success: boolean; element?: string; error?: string };
type ScanElement = { id: string; type: string; label: string };
type ScanSnapshot = { summary?: string; allElements?: ScanElement[]; [key: string]: unknown };
type ScanInteractiveElements = () => ScanSnapshot;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function handleExecuteComponentAction(
  args: Record<string, unknown>,
  deps: {
    addLog: AddLog;
    logger: LoggerLike;
    audio: AudioLike;
    getCapability: GetCapability;
    findCapability: FindCapability;
    executeCapability: ExecuteCapability;
    executeAction: ExecuteAction;
    actionRegistry: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const rawActionId = args.action_id;
  if (typeof rawActionId !== 'string' || rawActionId.trim().length === 0) {
    deps.addLog('WARN', 'VOICE_EXECUTIVE: Missing required action_id for execute_component_action.');
    return {
      error: 'Missing required action_id',
      hint: 'Call get_available_actions to discover valid action IDs',
    };
  }

  let actionId = rawActionId.trim();
  const actionArgs = args.args && typeof args.args === 'object'
    ? args.args as Record<string, unknown>
    : {};

  deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Executing action [${actionId}]...`);

  // Resolve against the capability registry first (exact ID, then fuzzy action match).
  let capability = deps.getCapability(actionId);
  if (!capability) {
    capability = deps.findCapability(actionId, { kind: 'action' });
    if (capability) {
      deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Resolved action via capability registry [${actionId}] → [${capability.id}]`);
      actionId = capability.id;
    }
  }

  if (capability) {
    const usesCPB = capability.complexity !== 'simple' && capability.complexity !== 'navigation';
    if (usesCPB) {
      deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Routing [${actionId}] through CPB (complexity: ${capability.complexity}, path: ${capability.executionPath})`);
    } else {
      deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Executing [${actionId}] through capability registry.`);
    }

    const capabilityResult = await deps.executeCapability(actionId, actionArgs);

    if (capabilityResult.success) {
      deps.addLog('SUCCESS', `VOICE_EXECUTIVE: ${usesCPB ? 'CPB' : 'Capability'} execution complete (timing: ${capabilityResult.timing?.toFixed(0)}ms)`);
      deps.audio.playSuccess();
      return {
        status: usesCPB ? 'CPB_ACTION_EXECUTED' : 'ACTION_EXECUTED',
        actionId,
        executionPath: capability.executionPath,
        timing: capabilityResult.timing,
        result: capabilityResult.result,
      };
    }

    const errorMsg = capabilityResult.error || 'Unknown error';
    deps.logger.warn(
      `Capability execution failed for [${actionId}], falling back to SystemMind registry`,
      errorMsg,
      'VoiceManager'
    );
  }

  // Fallback to SystemMind registry.
  const actionExists = !!deps.actionRegistry[actionId];

  // If not found, try fuzzy matching
  if (!actionExists) {
    const normalized = actionId.toLowerCase().replace(/[-_\s]/g, '');
    const allActionIds = Object.keys(deps.actionRegistry);

    // Try exact normalized match first
    let matchedId = allActionIds.find((key) => {
      const keyNorm = key.toLowerCase().replace(/[-_\s]/g, '');
      return keyNorm === normalized;
    });

    // Try partial match if no exact match
    if (!matchedId) {
      matchedId = allActionIds.find((key) => {
        const keyNorm = key.toLowerCase().replace(/[-_\s]/g, '');
        return keyNorm.includes(normalized) || normalized.includes(keyNorm);
      });
    }

    // Try matching individual words
    if (!matchedId) {
      const words = actionId.toLowerCase().split(/[-_\s]+/).filter((w) => w.length > 2);
      matchedId = allActionIds.find((key) => {
        const keyLower = key.toLowerCase();
        return words.every((word) => keyLower.includes(word));
      });
    }

    if (matchedId) {
      deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Fuzzy matched [${actionId}] → [${matchedId}]`);
      actionId = matchedId;
    } else {
      // Suggest similar actions
      const suggestions = allActionIds
        .filter((k) => {
          const kLower = k.toLowerCase();
          return normalized.split('').some((char) => kLower.includes(char));
        })
        .slice(0, 5);
      deps.addLog('WARN', `VOICE_EXECUTIVE: Action [${rawActionId}] not found. Suggestions: ${suggestions.join(', ')}`);
      return {
        error: `Action "${rawActionId}" not found`,
        suggestions,
        hint: 'Call get_available_actions to see all available actions',
      };
    }
  }

  try {
    const result = await deps.executeAction(actionId, actionArgs);
    deps.addLog('SUCCESS', `VOICE_EXECUTIVE: Action [${actionId}] completed.`);
    deps.audio.playSuccess();
    return { status: 'ACTION_EXECUTED', actionId, result };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    deps.addLog('ERROR', `VOICE_EXECUTIVE: Action [${actionId}] failed: ${message}`);
    return { error: message, actionId };
  }
}

export async function handleNavigateToTab(
  args: Record<string, unknown>,
  deps: {
    addLog: AddLog;
    logger: LoggerLike;
    audio: AudioLike;
    findCapability: FindCapability;
    executeCapability: ExecuteCapability;
    navigateToTab: NavigateToTab;
  }
): Promise<Record<string, unknown>> {
  const query = (args.query as string || '').trim();
  deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Parsing tab navigation for "${query}"...`);

  if (!query) {
    return { error: 'Missing tab query', hint: "Try 'go to nexus' or 'open discovery'" };
  }

  // Capability registry is the primary source of truth for tab navigation.
  const tabCapability = deps.findCapability(query, { kind: 'tab' })
    ?? deps.findCapability(query, { source: 'tab' });

  if (tabCapability) {
    const capabilityResult = await deps.executeCapability(tabCapability.id, { query });

    if (capabilityResult.success) {
      const capabilityData = (capabilityResult.result as { data?: Record<string, unknown> } | undefined)?.data;

      if (capabilityData?.success) {
        deps.addLog('SUCCESS', `VOICE_EXECUTIVE: Navigated to ${capabilityData.sectorLabel} > ${capabilityData.tabLabel}${capabilityData.subtabLabel ? ` > ${capabilityData.subtabLabel}` : ''}`);
        deps.audio.playTransition();
        return {
          status: 'TAB_NAVIGATION_COMPLETE',
          sector: capabilityData.sector,
          sectorLabel: capabilityData.sectorLabel,
          tab: capabilityData.tab,
          tabLabel: capabilityData.tabLabel,
          subtab: capabilityData.subtab,
          subtabLabel: capabilityData.subtabLabel,
          route: capabilityData.route,
          capabilityId: tabCapability.id,
        };
      }

      deps.addLog('SUCCESS', `VOICE_EXECUTIVE: Tab capability [${tabCapability.id}] executed.`);
      deps.audio.playTransition();
      return {
        status: 'TAB_NAVIGATION_COMPLETE',
        capabilityId: tabCapability.id,
        result: capabilityResult.result,
      };
    }

    deps.logger.warn(
      `Tab capability execution failed for "${query}", falling back to legacy parser`,
      capabilityResult.error,
      'VoiceManager'
    );
  }

  // Legacy fallback path for unmatched/failed capability resolution.
  const result = deps.navigateToTab(query);

  if (result.success) {
    deps.addLog('SUCCESS', `VOICE_EXECUTIVE: Navigated to ${result.sectorLabel} > ${result.tabLabel}${result.subtabLabel ? ` > ${result.subtabLabel}` : ''}`);
    deps.audio.playTransition();
    return {
      status: 'TAB_NAVIGATION_COMPLETE',
      sector: result.sector,
      sectorLabel: result.sectorLabel,
      tab: result.tab,
      tabLabel: result.tabLabel,
      subtab: result.subtab,
      subtabLabel: result.subtabLabel,
      route: result.route,
    };
  }

  deps.addLog('WARN', `VOICE_EXECUTIVE: ${result.error}`);
  return {
    error: result.error,
    suggestions: result.suggestions,
    hint: "Available tabs: Nexus, Discovery, DNA, Agora, Bicameral, IDE, Actions, Cascade, ACE, RLM, and more. Say 'go to [tab name]' or '[sector] [tab]'.",
  };
}

export async function handleInputText(
  args: Record<string, unknown>,
  deps: {
    addLog: AddLog;
    audio: AudioLike;
    executeAction: ExecuteAction;
    actionRegistry: Record<string, unknown>;
    fillInput: FillInput;
  }
): Promise<Record<string, unknown>> {
  const fieldId = asNonEmptyString(args.field_id);
  if (!fieldId) {
    return {
      error: 'Missing required field_id',
      hint: 'Specify the input field identifier (for example: mission-objective)',
    };
  }

  if (typeof args.text !== 'string') {
    return {
      error: 'Missing required text',
      hint: 'Provide text to input into the field',
    };
  }

  const text = args.text;
  deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Inputting text to [${fieldId}]...`);

  const result = deps.fillInput(fieldId, text);

  if (result.success) {
    deps.addLog('SUCCESS', `VOICE_EXECUTIVE: Text input to [${result.element}] complete.`);
    deps.audio.playClick();
    return { status: 'TEXT_INPUT_COMPLETE', element: result.element, textLength: text.length };
  }

  const fieldNeedle = fieldId.toLowerCase();
  const inputAction = Object.keys(deps.actionRegistry).find((key) => {
    const normalized = key.toLowerCase();
    return normalized.includes(fieldNeedle) || normalized.includes('input') || normalized.includes('set');
  });

  if (inputAction) {
    try {
      await deps.executeAction(inputAction, { text, value: text });
      return { status: 'TEXT_INPUT_VIA_ACTION', actionUsed: inputAction };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      deps.addLog('ERROR', `VOICE_EXECUTIVE: Input fallback action [${inputAction}] failed: ${message}`);
      return { error: message };
    }
  }

  deps.addLog('WARN', `VOICE_EXECUTIVE: ${result.error}`);
  return { error: result.error, suggestion: 'Try get_ui_context to see available inputs' };
}

export function handleClickElement(
  args: Record<string, unknown>,
  deps: {
    addLog: AddLog;
    audio: AudioLike;
    clickButton: ClickButton;
  }
): Record<string, unknown> {
  const target = asNonEmptyString(args.target)
    ?? asNonEmptyString(args.button)
    ?? asNonEmptyString(args.element);

  if (!target) {
    return {
      error: 'Missing click target',
      hint: 'Provide target, button, or element to click',
    };
  }

  deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Clicking [${target}]...`);

  const result = deps.clickButton(target);
  if (result.success) {
    deps.addLog('SUCCESS', `VOICE_EXECUTIVE: Clicked [${result.element}].`);
    deps.audio.playClick();
    return { status: 'CLICK_COMPLETE', element: result.element };
  }

  deps.addLog('WARN', `VOICE_EXECUTIVE: ${result.error}`);
  return { error: result.error };
}

export function handleSelectOption(
  args: Record<string, unknown>,
  deps: {
    addLog: AddLog;
    audio: AudioLike;
    selectOption: SelectOption;
  }
): Record<string, unknown> {
  const dropdown = asNonEmptyString(args.dropdown);
  const option = asNonEmptyString(args.option);

  if (!dropdown || !option) {
    return {
      error: 'Missing dropdown or option',
      hint: 'Provide both dropdown and option',
    };
  }

  deps.addLog('SYSTEM', `VOICE_EXECUTIVE: Selecting [${option}] from [${dropdown}]...`);
  const result = deps.selectOption(dropdown, option);
  if (result.success) {
    deps.addLog('SUCCESS', `VOICE_EXECUTIVE: Selected [${result.element}].`);
    deps.audio.playClick();
    return { status: 'SELECT_COMPLETE', element: result.element };
  }

  deps.addLog('WARN', `VOICE_EXECUTIVE: ${result.error}`);
  return { error: result.error };
}

export function handleScanUI(
  deps: {
    addLog: AddLog;
    scanInteractiveElements: ScanInteractiveElements;
  }
): Record<string, unknown> {
  const uiSnapshot = deps.scanInteractiveElements();
  deps.addLog('SYSTEM', `VOICE_EXECUTIVE: ${uiSnapshot.summary || 'UI scan complete.'}`);

  const allElements = Array.isArray(uiSnapshot.allElements)
    ? uiSnapshot.allElements.map((e) => ({ id: e.id, type: e.type, label: e.label }))
    : [];

  return {
    status: 'OK',
    ...uiSnapshot,
    allElements,
  };
}
