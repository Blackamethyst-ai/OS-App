// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockHasGeminiKey = vi.hoisted(() => vi.fn());
const mockFileToGenerativePart = vi.hoisted(() => vi.fn());
const mockAnalyzeVisualInput = vi.hoisted(() => vi.fn());
const mockPromptSelectKey = vi.hoisted(() => vi.fn());
const mockPlayClick = vi.hoisted(() => vi.fn());
const mockPlaySuccess = vi.hoisted(() => vi.fn());
const mockPlayError = vi.hoisted(() => vi.fn());
const mockExecute = vi.hoisted(() => vi.fn());
const mockSetVisualCortexState = vi.hoisted(() => vi.fn());
const mockAddLog = vi.hoisted(() => vi.fn());
const mockSetMode = vi.hoisted(() => vi.fn());
const mockSetCodeStudioState = vi.hoisted(() => vi.fn());
const mockPushToInvestmentQueue = vi.hoisted(() => vi.fn());

vi.mock('../../services/apiKeyService', () => ({
    apiKeyService: { hasGeminiKey: mockHasGeminiKey }
}));

vi.mock('../../services/geminiService', () => ({
    fileToGenerativePart: mockFileToGenerativePart,
    analyzeVisualInput: mockAnalyzeVisualInput,
    promptSelectKey: mockPromptSelectKey,
}));

vi.mock('../../services/audioService', () => ({
    audio: {
        playClick: mockPlayClick,
        playSuccess: mockPlaySuccess,
        playError: mockPlayError,
    }
}));

vi.mock('../useAgentRuntime', () => ({
    useAgentRuntime: () => ({ execute: mockExecute })
}));

vi.mock('../../store', () => ({
    useAppStore: () => ({
        visualCortex: { isAnalyzing: false, isProbing: false, dropActive: false },
        mode: 'METAVENTIONS_HUB',
        actions: {
            setVisualCortexState: mockSetVisualCortexState,
            addLog: mockAddLog,
            setMode: mockSetMode,
            setCodeStudioState: mockSetCodeStudioState,
            pushToInvestmentQueue: mockPushToInvestmentQueue,
        }
    })
}));

import { useVisualCortex } from '../useVisualCortex';

describe('useVisualCortex', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockHasGeminiKey.mockReturnValue(true);
    });

    it('should return initial state values', () => {
        const { result } = renderHook(() => useVisualCortex());
        expect(result.current.isAnalyzing).toBe(false);
        expect(result.current.isProbing).toBe(false);
        expect(result.current.dropActive).toBe(false);
        expect(typeof result.current.probeScreen).toBe('function');
    });

    it('should register drag event listeners on mount', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        renderHook(() => useVisualCortex());
        const eventNames = addSpy.mock.calls.map(c => c[0]);
        expect(eventNames).toContain('dragover');
        expect(eventNames).toContain('dragleave');
        expect(eventNames).toContain('drop');
        addSpy.mockRestore();
    });

    it('should remove drag event listeners on unmount', () => {
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useVisualCortex());
        unmount();
        const eventNames = removeSpy.mock.calls.map(c => c[0]);
        expect(eventNames).toContain('dragover');
        expect(eventNames).toContain('dragleave');
        expect(eventNames).toContain('drop');
        removeSpy.mockRestore();
    });

    it('should prompt for key when no Gemini key is present', async () => {
        mockHasGeminiKey.mockReturnValue(false);
        mockPromptSelectKey.mockResolvedValue(undefined);

        const { result } = renderHook(() => useVisualCortex());
        // We can't directly call processVisualInput since it's not exposed,
        // but we can trigger it through a drop event
        const file = new File(['test'], 'test.png', { type: 'image/png' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [file] }
        });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockPromptSelectKey).toHaveBeenCalled();
    });

    it('should play click sound when processing visual input', async () => {
        mockAnalyzeVisualInput.mockResolvedValue({
            classification: 'test',
            extracted_data: null,
            sentiment: 'positive',
            suggested_sector: 'NONE',
            summary: 'Test summary',
            action_items: [],
        });
        mockFileToGenerativePart.mockResolvedValue({ inlineData: { data: 'base64', mimeType: 'image/png' } });

        renderHook(() => useVisualCortex());
        const file = new File(['test'], 'test.png', { type: 'image/png' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', {
            value: { files: [file] }
        });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockPlayClick).toHaveBeenCalled();
    });

    it('should set analyzing state and log on visual input', async () => {
        mockAnalyzeVisualInput.mockResolvedValue({
            classification: 'test',
            extracted_data: null,
            sentiment: 'neutral',
            suggested_sector: 'NONE',
            summary: 'Summary',
            action_items: [],
        });
        mockFileToGenerativePart.mockResolvedValue({ inlineData: { data: 'base64', mimeType: 'image/png' } });

        renderHook(() => useVisualCortex());
        const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockSetVisualCortexState).toHaveBeenCalledWith(
            expect.objectContaining({ isAnalyzing: true })
        );
        expect(mockAddLog).toHaveBeenCalledWith('SYSTEM', expect.stringContaining('OCULUS_SCAN'));
    });

    it('should route to AUTONOMOUS_FINANCE when suggested_sector matches', async () => {
        mockAnalyzeVisualInput.mockResolvedValue({
            classification: 'finance',
            extracted_data: { ticker: 'AAPL' },
            sentiment: 'bullish',
            suggested_sector: 'AUTONOMOUS_FINANCE',
            summary: 'Stock analysis',
            action_items: [],
        });
        mockFileToGenerativePart.mockResolvedValue({ inlineData: { data: 'b64', mimeType: 'image/png' } });

        renderHook(() => useVisualCortex());
        const file = new File(['img'], 'chart.png', { type: 'image/png' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockPushToInvestmentQueue).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Stock analysis', viability: 95 })
        );
    });

    it('should route to CODE_STUDIO when suggested_sector matches', async () => {
        mockAnalyzeVisualInput.mockResolvedValue({
            classification: 'code',
            extracted_data: null,
            sentiment: 'neutral',
            suggested_sector: 'CODE_STUDIO',
            summary: 'Code snippet detected',
            action_items: [],
        });
        mockFileToGenerativePart.mockResolvedValue({ inlineData: { data: 'b64', mimeType: 'image/png' } });

        renderHook(() => useVisualCortex());
        const file = new File(['img'], 'code.png', { type: 'image/png' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockSetMode).toHaveBeenCalledWith('CODE_STUDIO');
        expect(mockSetCodeStudioState).toHaveBeenCalledWith(
            expect.objectContaining({ prompt: expect.stringContaining('Code snippet detected') })
        );
    });

    it('should handle analysis errors gracefully', async () => {
        mockAnalyzeVisualInput.mockRejectedValue(new Error('API timeout'));
        mockFileToGenerativePart.mockResolvedValue({ inlineData: { data: 'b64', mimeType: 'image/png' } });

        renderHook(() => useVisualCortex());
        const file = new File(['img'], 'fail.png', { type: 'image/png' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockSetVisualCortexState).toHaveBeenCalledWith(
            expect.objectContaining({ isAnalyzing: false })
        );
        expect(mockAddLog).toHaveBeenCalledWith('ERROR', expect.stringContaining('API timeout'));
        expect(mockPlayError).toHaveBeenCalled();
    });

    it('should not process non-image files on drop', async () => {
        renderHook(() => useVisualCortex());
        const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockPlayClick).not.toHaveBeenCalled();
        expect(mockSetVisualCortexState).toHaveBeenCalledWith({ dropActive: false });
    });

    it('should play success sound after successful analysis', async () => {
        mockAnalyzeVisualInput.mockResolvedValue({
            classification: 'photo',
            extracted_data: null,
            sentiment: 'positive',
            suggested_sector: 'NONE',
            summary: 'Photo',
            action_items: [],
        });
        mockFileToGenerativePart.mockResolvedValue({ inlineData: { data: 'b64', mimeType: 'image/png' } });

        renderHook(() => useVisualCortex());
        const file = new File(['img'], 'ok.png', { type: 'image/png' });
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockPlaySuccess).toHaveBeenCalled();
    });

    it('should handle drop with no files gracefully', async () => {
        renderHook(() => useVisualCortex());
        const dropEvent = new Event('drop', { bubbles: true }) as any;
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [] } });
        dropEvent.preventDefault = vi.fn();

        await act(async () => {
            window.dispatchEvent(dropEvent);
            await new Promise(r => setTimeout(r, 10));
        });

        expect(mockPlayClick).not.toHaveBeenCalled();
        expect(mockSetVisualCortexState).toHaveBeenCalledWith({ dropActive: false });
    });
});
