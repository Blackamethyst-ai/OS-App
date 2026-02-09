/**
 * Security Audit Log
 *
 * Ring buffer for security events. Stores entries in memory
 * and exposes query methods for the UI and stats endpoints.
 */

import { logger } from '../logger';

const securityLogger = logger.scope('SECURITY');

export interface AuditEntry {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

const MAX_ENTRIES = 500;
const entries: AuditEntry[] = [];

export const securityAudit = {
  log(type: string, data: Record<string, unknown>): void {
    const entry: AuditEntry = { type, timestamp: Date.now(), data };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) {
      entries.shift();
    }
    securityLogger.warn(`[${type}]`, data);
  },

  getEntries(): readonly AuditEntry[] {
    return entries;
  },

  getByType(type: string): AuditEntry[] {
    return entries.filter(e => e.type === type);
  },

  clear(): void {
    entries.length = 0;
  },
};
