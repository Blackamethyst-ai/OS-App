/**
 * Tests for security/auditLog.ts
 *
 * Tests the security audit log ring buffer and query methods.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { securityAudit, type AuditEntry } from '../auditLog';

describe('securityAudit', () => {
  beforeEach(() => {
    securityAudit.clear();
  });

  describe('log', () => {
    it('should log an entry with type, timestamp, and data', () => {
      securityAudit.log('LOGIN_ATTEMPT', { user: 'alice', ip: '1.2.3.4' });
      const entries = securityAudit.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].type).toBe('LOGIN_ATTEMPT');
      expect(entries[0].data).toEqual({ user: 'alice', ip: '1.2.3.4' });
      expect(entries[0].timestamp).toBeGreaterThan(0);
    });

    it('should add entries in order', () => {
      securityAudit.log('EVENT_A', { order: 1 });
      securityAudit.log('EVENT_B', { order: 2 });
      securityAudit.log('EVENT_C', { order: 3 });

      const entries = securityAudit.getEntries();
      expect(entries.length).toBe(3);
      expect(entries[0].type).toBe('EVENT_A');
      expect(entries[1].type).toBe('EVENT_B');
      expect(entries[2].type).toBe('EVENT_C');
    });

    it('should enforce the ring buffer limit of 500 entries', () => {
      // Fill beyond the limit
      for (let i = 0; i < 510; i++) {
        securityAudit.log('BULK', { index: i });
      }
      const entries = securityAudit.getEntries();
      expect(entries.length).toBe(500);
      // The oldest entries (0-9) should have been evicted
      expect((entries[0].data as { index: number }).index).toBe(10);
    });
  });

  describe('getEntries', () => {
    it('should return an empty array when no entries logged', () => {
      expect(securityAudit.getEntries()).toEqual([]);
    });

    it('should return a readonly view of entries', () => {
      securityAudit.log('TEST', { foo: 'bar' });
      const entries = securityAudit.getEntries();
      expect(entries.length).toBe(1);
    });
  });

  describe('getByType', () => {
    it('should filter entries by type', () => {
      securityAudit.log('AUTH', { user: 'alice' });
      securityAudit.log('ACCESS', { resource: '/admin' });
      securityAudit.log('AUTH', { user: 'bob' });
      securityAudit.log('ERROR', { msg: 'fail' });

      const authEntries = securityAudit.getByType('AUTH');
      expect(authEntries.length).toBe(2);
      expect(authEntries.every(e => e.type === 'AUTH')).toBe(true);
    });

    it('should return empty array for non-existent type', () => {
      securityAudit.log('AUTH', { user: 'alice' });
      expect(securityAudit.getByType('NONEXISTENT')).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      securityAudit.log('A', {});
      securityAudit.log('B', {});
      expect(securityAudit.getEntries().length).toBe(2);

      securityAudit.clear();
      expect(securityAudit.getEntries().length).toBe(0);
    });

    it('should allow new entries after clearing', () => {
      securityAudit.log('BEFORE', {});
      securityAudit.clear();
      securityAudit.log('AFTER', { fresh: true });

      const entries = securityAudit.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].type).toBe('AFTER');
    });
  });
});
