// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetKey = vi.hoisted(() => vi.fn());

vi.mock('../apiKeyService', () => ({
  apiKeyService: {
    getKey: mockGetKey,
  },
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', mockFetch);

// Mock AudioContext with a proper constructor function
const mockDecodeAudioData = vi.hoisted(() => vi.fn());

vi.stubGlobal('AudioContext', function AudioContext() {
  return {
    decodeAudioData: mockDecodeAudioData,
    createBufferSource: vi.fn(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      buffer: null,
      onended: null,
    })),
    destination: {},
  };
});

import { elevenLabs, ELEVEN_LABS_VOICES } from '../elevenLabsService';

describe('ElevenLabsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKey.mockReturnValue('test-api-key');
  });

  // --- ELEVEN_LABS_VOICES ---

  it('should export voice constants', () => {
    expect(ELEVEN_LABS_VOICES.MIKE).toBeDefined();
    expect(ELEVEN_LABS_VOICES.PERRI).toBeDefined();
    expect(typeof ELEVEN_LABS_VOICES.MIKE).toBe('string');
  });

  it('should have both male and female voices', () => {
    expect(ELEVEN_LABS_VOICES.MIKE).toBeTruthy();
    expect(ELEVEN_LABS_VOICES.DR_IRA).toBeTruthy();
    expect(ELEVEN_LABS_VOICES.CALEB).toBeTruthy();
    expect(ELEVEN_LABS_VOICES.PERRI).toBeTruthy();
    expect(ELEVEN_LABS_VOICES.HELEN).toBeTruthy();
    expect(ELEVEN_LABS_VOICES.NOAH).toBeTruthy();
  });

  // --- generateSpeech ---

  it('should throw if no API key is configured', async () => {
    mockGetKey.mockReturnValue(null);

    await expect(elevenLabs.generateSpeech('hello', 'voice-id')).rejects.toThrow(
      'ElevenLabs API Key not configured'
    );
  });

  it('should throw if no text is provided', async () => {
    await expect(elevenLabs.generateSpeech('', 'voice-id')).rejects.toThrow(
      'No text provided'
    );
  });

  it('should call fetch with correct URL and headers', async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });

    await elevenLabs.generateSpeech('Hello world', 'test-voice-id');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/text-to-speech/test-voice-id',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'xi-api-key': 'test-api-key',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should send correct body with default settings', async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });

    await elevenLabs.generateSpeech('Hello', 'vid');

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.text).toBe('Hello');
    expect(body.model_id).toBe('eleven_turbo_v2_5');
    expect(body.voice_settings.stability).toBe(0.5);
    expect(body.voice_settings.similarity_boost).toBe(0.75);
  });

  it('should use custom voice settings when provided', async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });

    await elevenLabs.generateSpeech('Hello', 'vid', 'eleven_multilingual_v2', {
      stability: 0.9,
      similarity_boost: 0.5,
      style: 0.3,
      use_speaker_boost: true,
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.model_id).toBe('eleven_multilingual_v2');
    expect(body.voice_settings.stability).toBe(0.9);
    expect(body.voice_settings.style).toBe(0.3);
  });

  it('should throw on non-ok response with error detail', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ detail: 'Invalid voice ID' }),
    });

    await expect(elevenLabs.generateSpeech('Hello', 'bad-id')).rejects.toThrow(
      'ElevenLabs Error: Invalid voice ID'
    );
  });

  it('should throw with Unknown error when error json parsing fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('parse fail')),
    });

    await expect(elevenLabs.generateSpeech('Hello', 'bad-id')).rejects.toThrow(
      'ElevenLabs Error: Unknown error'
    );
  });

  it('should return ArrayBuffer on success', async () => {
    const mockArrayBuffer = new ArrayBuffer(16);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });

    const result = await elevenLabs.generateSpeech('Hello', 'vid');
    expect(result).toBe(mockArrayBuffer);
  });

  // --- speak ---

  it('should not throw on speak failure (catches internally)', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(elevenLabs.speak('Hello', 'vid')).resolves.toBeUndefined();
  });

  // --- streamSpeech ---

  it('should decode audio data for streaming', async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    const mockAudioBuffer = { length: 100, duration: 1.0 } as AudioBuffer;

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });
    mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

    const result = await elevenLabs.streamSpeech('Hello', 'vid');
    expect(result).toBe(mockAudioBuffer);
    expect(mockDecodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
  });
});
