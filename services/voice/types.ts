/**
 * UNIVERSAL VOICE TYPES
 * Types for voice-interactive UI elements.
 */

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

export interface VoiceActionResult {
  success: boolean;
  element?: string;
  value?: string;
  error?: string;
}

export interface ComponentContext {
  component: string;
  section: string;
  path: string[];
}
