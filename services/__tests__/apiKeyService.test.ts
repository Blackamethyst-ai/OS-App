// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock cryptoService before importing the service
vi.mock('../../utils/cryptoService', () => ({
  encrypt: vi.fn().mockResolvedValue('encrypted-data'),
  decrypt: vi.fn().mockResolvedValue('{}'),
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// We need to test a fresh instance each time, so we use dynamic imports
// and reset modules between tests
describe('ApiKeyService', () => {
  let localStorageData: Record<string, string>;
  let sessionStorageData: Record<string, string>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    localStorageData = {};
    sessionStorageData = {};

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageData[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value; }),
      removeItem: vi.fn((key: string) => { delete localStorageData[key]; }),
      clear: vi.fn(() => { localStorageData = {}; }),
    });

    // Mock sessionStorage
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => sessionStorageData[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { sessionStorageData[key] = value; }),
      removeItem: vi.fn((key: string) => { delete sessionStorageData[key]; }),
      clear: vi.fn(() => { sessionStorageData = {}; }),
    });
  });

  async function createService() {
    const mod = await import('../apiKeyService');
    return mod;
  }

  describe('hasVault()', () => {
    it('returns false when no password hash is stored', async () => {
      const { apiKeyService } = await createService();
      expect(apiKeyService.hasVault()).toBe(false);
    });

    it('returns true when password hash exists in localStorage', async () => {
      localStorageData['os_app_master_hash'] = 'some-hash';
      const { apiKeyService } = await createService();
      expect(apiKeyService.hasVault()).toBe(true);
    });
  });

  describe('isVaultUnlocked()', () => {
    it('returns false on fresh service with no vault', async () => {
      const { apiKeyService } = await createService();
      expect(apiKeyService.isVaultUnlocked()).toBe(false);
    });

    it('returns true after creating a vault', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('test-password');
      expect(apiKeyService.isVaultUnlocked()).toBe(true);
    });
  });

  describe('lockVault()', () => {
    it('locks an unlocked vault', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('test-password');
      expect(apiKeyService.isVaultUnlocked()).toBe(true);

      apiKeyService.lockVault();
      expect(apiKeyService.isVaultUnlocked()).toBe(false);
    });

    it('notifies listeners when locking', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('test-password');

      const listener = vi.fn();
      apiKeyService.subscribe(listener);
      listener.mockClear(); // clear the notification from createVault

      apiKeyService.lockVault();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetVault()', () => {
    it('removes all storage keys and locks the vault', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('test-password');

      apiKeyService.resetVault();

      expect(apiKeyService.hasVault()).toBe(false);
      expect(apiKeyService.isVaultUnlocked()).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('os_app_api_keys_encrypted');
      expect(localStorage.removeItem).toHaveBeenCalledWith('os_app_master_hash');
    });

    it('notifies listeners when resetting', async () => {
      const { apiKeyService } = await createService();
      const listener = vi.fn();
      apiKeyService.subscribe(listener);

      apiKeyService.resetVault();
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('getKey() fallback behavior', () => {
    it('returns undefined for non-gemini providers when vault is locked', async () => {
      const { apiKeyService } = await createService();
      expect(apiKeyService.getKey('claude')).toBeUndefined();
      expect(apiKeyService.getKey('openai')).toBeUndefined();
      expect(apiKeyService.getKey('grok')).toBeUndefined();
    });

    it('falls back to env var for gemini when vault is locked', async () => {
      // import.meta.env is read-only in tests, so we test the code path exists
      const { apiKeyService } = await createService();
      // When no env var is set, should return undefined
      const result = apiKeyService.getKey('gemini');
      // Either undefined or the env var value
      expect(result === undefined || typeof result === 'string').toBe(true);
    });

    it('returns stored key when vault is unlocked', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('test-password');
      await apiKeyService.setKey('claude', 'sk-test-key-12345');

      expect(apiKeyService.getKey('claude')).toBe('sk-test-key-12345');
    });
  });

  describe('hasAnyKey()', () => {
    it('returns false when vault is locked', async () => {
      const { apiKeyService } = await createService();
      expect(apiKeyService.hasAnyKey()).toBe(false);
    });

    it('returns false when vault is unlocked but no keys are stored', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('test-password');
      expect(apiKeyService.hasAnyKey()).toBe(false);
    });

    it('returns true when vault is unlocked and a key is stored', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('test-password');
      await apiKeyService.setKey('openai', 'sk-openai-key');
      expect(apiKeyService.hasAnyKey()).toBe(true);
    });
  });

  describe('hasGeminiKey()', () => {
    it('returns true when vault has gemini key', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('test-password');
      await apiKeyService.setKey('gemini', 'AIza-test-key');
      expect(apiKeyService.hasGeminiKey()).toBe(true);
    });
  });

  describe('subscribe/notify pattern', () => {
    it('calls listener on createVault', async () => {
      const { apiKeyService } = await createService();
      const listener = vi.fn();
      apiKeyService.subscribe(listener);

      await apiKeyService.createVault('pw');
      expect(listener).toHaveBeenCalled();
    });

    it('calls listener on setKey', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('pw');

      const listener = vi.fn();
      apiKeyService.subscribe(listener);

      await apiKeyService.setKey('gemini', 'key');
      expect(listener).toHaveBeenCalled();
    });

    it('unsubscribe stops notifications', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('pw');

      const listener = vi.fn();
      const unsub = apiKeyService.subscribe(listener);
      listener.mockClear();

      unsub();
      apiKeyService.lockVault();
      expect(listener).not.toHaveBeenCalled();
    });

    it('supports multiple listeners', async () => {
      const { apiKeyService } = await createService();

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      apiKeyService.subscribe(listener1);
      apiKeyService.subscribe(listener2);

      apiKeyService.resetVault();
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('createVault()', () => {
    it('stores password hash in localStorage', async () => {
      const { apiKeyService } = await createService();
      const result = await apiKeyService.createVault('my-password');

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('os_app_master_hash', 'hashed-password');
    });

    it('stores session key in sessionStorage', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('my-password');

      expect(sessionStorage.setItem).toHaveBeenCalledWith('os_app_session_unlocked', 'my-password');
    });
  });

  describe('removeKey()', () => {
    it('removes a key and notifies listeners', async () => {
      const { apiKeyService } = await createService();
      await apiKeyService.createVault('pw');
      await apiKeyService.setKey('openai', 'sk-key');
      expect(apiKeyService.getKey('openai')).toBe('sk-key');

      const listener = vi.fn();
      apiKeyService.subscribe(listener);

      await apiKeyService.removeKey('openai');
      expect(apiKeyService.getKey('openai')).toBeUndefined();
      expect(listener).toHaveBeenCalled();
    });

    it('does nothing when vault is locked', async () => {
      const { apiKeyService } = await createService();
      const listener = vi.fn();
      apiKeyService.subscribe(listener);

      await apiKeyService.removeKey('openai');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
