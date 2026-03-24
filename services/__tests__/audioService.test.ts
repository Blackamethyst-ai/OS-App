// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AudioContext and related Web Audio API
const mockStop = vi.fn();
const mockStart = vi.fn();
const mockOscConnect = vi.fn();
const mockGainConnect = vi.fn();
const mockSetValueAtTime = vi.fn();
const mockLinearRamp = vi.fn();
const mockExponentialRamp = vi.fn();
const mockFreqSetValueAtTime = vi.fn();
const mockFreqExpRamp = vi.fn();
const mockResume = vi.fn().mockResolvedValue(undefined);

const mockGainParam = {
    value: 0.15,
    setValueAtTime: mockSetValueAtTime,
    linearRampToValueAtTime: mockLinearRamp,
    exponentialRampToValueAtTime: mockExponentialRamp,
};

const mockFrequencyParam = {
    setValueAtTime: mockFreqSetValueAtTime,
    exponentialRampToValueAtTime: mockFreqExpRamp,
};

const mockCreateOscillator = vi.fn(() => ({
    type: 'sine' as OscillatorType,
    frequency: mockFrequencyParam,
    connect: mockOscConnect,
    start: mockStart,
    stop: mockStop,
}));

const mockCreateGain = vi.fn(() => ({
    gain: { ...mockGainParam },
    connect: mockGainConnect,
}));

const mockDestination = {};

class MockAudioContext {
    currentTime = 0;
    state = 'running';
    destination = mockDestination;
    createOscillator = mockCreateOscillator;
    createGain = mockCreateGain;
    resume = mockResume;
}

// Set up window.AudioContext before importing the module
(window as any).AudioContext = MockAudioContext;

// Dynamic import so AudioContext mock is in place
const { audio } = await import('../audioService');

describe('AudioService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should export an audio service instance', () => {
        expect(audio).toBeDefined();
        expect(typeof audio.playTone).toBe('function');
        expect(typeof audio.playClick).toBe('function');
        expect(typeof audio.playHover).toBe('function');
        expect(typeof audio.playTransition).toBe('function');
        expect(typeof audio.playSuccess).toBe('function');
        expect(typeof audio.playError).toBe('function');
    });

    it('should create AudioContext lazily on first playTone call', () => {
        audio.playTone(440, 'sine', 0.1);
        expect(mockCreateOscillator).toHaveBeenCalled();
        expect(mockCreateGain).toHaveBeenCalled();
    });

    it('should create oscillator with correct type and connect it', () => {
        audio.playTone(440, 'sine', 0.2);
        expect(mockCreateOscillator).toHaveBeenCalled();
        expect(mockOscConnect).toHaveBeenCalled();
        expect(mockGainConnect).toHaveBeenCalled();
    });

    it('should start and stop the oscillator', () => {
        audio.playTone(880, 'triangle', 0.3);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).toHaveBeenCalled();
    });

    it('should set frequency on the oscillator', () => {
        audio.playTone(660, 'square', 0.1);
        expect(mockFreqSetValueAtTime).toHaveBeenCalledWith(660, expect.any(Number));
    });

    it('playClick should play two tones', () => {
        mockCreateOscillator.mockClear();
        audio.playClick();
        // playClick calls playTone twice (800Hz + 1200Hz)
        expect(mockCreateOscillator).toHaveBeenCalledTimes(2);
    });

    it('playHover should play a single subtle tone', () => {
        mockCreateOscillator.mockClear();
        audio.playHover();
        expect(mockCreateOscillator).toHaveBeenCalledTimes(1);
    });

    it('playSuccess should play three tones for a triad', () => {
        mockCreateOscillator.mockClear();
        audio.playSuccess();
        // A4 + C#5 + E5
        expect(mockCreateOscillator).toHaveBeenCalledTimes(3);
    });

    it('playError should play two sawtooth tones', () => {
        mockCreateOscillator.mockClear();
        audio.playError();
        expect(mockCreateOscillator).toHaveBeenCalledTimes(2);
    });

    it('playTransition should create an oscillator with frequency ramp', () => {
        mockCreateOscillator.mockClear();
        audio.playTransition();
        expect(mockCreateOscillator).toHaveBeenCalledTimes(1);
        expect(mockFreqSetValueAtTime).toHaveBeenCalled();
        expect(mockFreqExpRamp).toHaveBeenCalled();
    });

    it('should handle delayed playTone', () => {
        audio.playTone(500, 'sine', 0.1, 0.5);
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).toHaveBeenCalled();
    });

    it('should resume suspended AudioContext', () => {
        audio.playTone(300, 'sine', 0.1);
        expect(mockCreateOscillator).toHaveBeenCalled();
    });
});
