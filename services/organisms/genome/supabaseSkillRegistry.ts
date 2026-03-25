/**
 * Supabase Skill Registry
 *
 * Persistent skill storage with write-through caching.
 * - In-memory Map for fast synchronous reads
 * - Async Supabase writes on register/unregister
 * - Hydration from Supabase on initialization
 * - Graceful fallback to pure in-memory if Supabase unavailable
 *
 * @module genome/supabaseSkillRegistry
 */

import type { SkillGenome } from './types';
import type { SkillRegistry } from './skillWeaver';
import { supabase } from '../../supabaseService';
import { logger } from '../../logger';

// =============================================================================
// TYPES
// =============================================================================

interface SupabaseSkillRow {
  id: string;
  name: string;
  version: string;
  description: string | null;
  tags: string[];
  dq_score: number;
  origin_type: string;
  checksum: string;
  genome_data: SkillGenome;
  created_at: number;
  updated_at: number;
}

// =============================================================================
// SUPABASE SKILL REGISTRY
// =============================================================================

/**
 * Persistent skill registry backed by Supabase.
 *
 * Write-through cache pattern:
 * - Reads are synchronous from in-memory Map (fast)
 * - Writes are fire-and-forget to Supabase (eventual consistency)
 * - Hydration from Supabase on init (loads all skills)
 *
 * Graceful degradation:
 * - If Supabase not configured, behaves identically to InMemorySkillRegistry
 * - If Supabase writes fail, logs error but cache remains consistent
 */
export class SupabaseSkillRegistry implements SkillRegistry {
  private skills: Map<string, SkillGenome> = new Map();
  private nameIndex: Map<string, string> = new Map();
  private isHydrated = false;
  private supabaseConfigured: boolean;

  constructor() {
    this.supabaseConfigured = this.checkSupabaseConfigured();
    if (!this.supabaseConfigured) {
      logger.warn(
        'Supabase not configured - falling back to in-memory only',
        undefined,
        'SupabaseSkillRegistry'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Configuration Check
  // ---------------------------------------------------------------------------

  private checkSupabaseConfigured(): boolean {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return !!(url && key);
  }

  // ---------------------------------------------------------------------------
  // Hydration
  // ---------------------------------------------------------------------------

  /**
   * Load all skills from Supabase into in-memory cache.
   * Called once during GenomeLayer initialization.
   * Idempotent - safe to call multiple times.
   */
  async hydrate(): Promise<number> {
    if (this.isHydrated) {
      return this.skills.size;
    }

    if (!this.supabaseConfigured) {
      this.isHydrated = true;
      return 0;
    }

    try {
      const { data, error } = await supabase!
        .from('genome_skills')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Hydration failed', error, 'SupabaseSkillRegistry');
        this.isHydrated = true;
        return 0;
      }

      if (data) {
        for (const row of data as SupabaseSkillRow[]) {
          const skill = row.genome_data;
          this.skills.set(skill.id, skill);
          this.nameIndex.set(skill.name.toLowerCase(), skill.id);
        }
      }

      this.isHydrated = true;
      logger.info(`Hydrated ${this.skills.size} skills from Supabase`, undefined, 'SkillRegistry');
      return this.skills.size;
    } catch (err) {
      logger.error('Hydration exception', err, 'SupabaseSkillRegistry');
      this.isHydrated = true;
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // SkillRegistry Interface
  // ---------------------------------------------------------------------------

  register(skill: SkillGenome): void {
    // Synchronous cache update
    this.skills.set(skill.id, skill);
    this.nameIndex.set(skill.name.toLowerCase(), skill.id);

    // Fire-and-forget Supabase write
    if (this.supabaseConfigured) {
      this.writeToSupabase(skill).catch((err) => {
        logger.error(`Failed to persist skill: ${skill.id}`, err, 'SupabaseSkillRegistry');
      });
    }
  }

  unregister(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return false;
    }

    // Synchronous cache delete
    this.skills.delete(skillId);
    this.nameIndex.delete(skill.name.toLowerCase());

    // Fire-and-forget Supabase delete
    if (this.supabaseConfigured) {
      this.deleteFromSupabase(skillId).catch((err) => {
        logger.error(`Failed to delete skill: ${skillId}`, err, 'SupabaseSkillRegistry');
      });
    }

    return true;
  }

  get(skillId: string): SkillGenome | undefined {
    return this.skills.get(skillId);
  }

  getByName(name: string): SkillGenome | undefined {
    const id = this.nameIndex.get(name.toLowerCase());
    return id ? this.skills.get(id) : undefined;
  }

  getAll(): SkillGenome[] {
    return Array.from(this.skills.values());
  }

  clear(): void {
    this.skills.clear();
    this.nameIndex.clear();

    // Fire-and-forget clear all skills from Supabase
    if (this.supabaseConfigured) {
      this.clearSupabase().catch((err) => {
        logger.error('Failed to clear Supabase skills', err, 'SupabaseSkillRegistry');
      });
    }
  }

  size(): number {
    return this.skills.size;
  }

  // ---------------------------------------------------------------------------
  // Supabase Operations (Async, Fire-and-Forget)
  // ---------------------------------------------------------------------------

  private async writeToSupabase(skill: SkillGenome): Promise<void> {
    const row: Omit<SupabaseSkillRow, never> = {
      id: skill.id,
      name: skill.name,
      version: skill.version,
      description: skill.description || null,
      tags: skill.tags,
      dq_score: skill.dqScore,
      origin_type: skill.origin.type,
      checksum: skill.checksum,
      genome_data: skill,
      created_at: skill.createdAt,
      updated_at: skill.updatedAt,
    };

    const { error } = await supabase!.from('genome_skills').upsert(row, {
      onConflict: 'id',
    });

    if (error) {
      throw error;
    }
  }

  private async deleteFromSupabase(skillId: string): Promise<void> {
    const { error } = await supabase!.from('genome_skills').delete().eq('id', skillId);

    if (error) {
      throw error;
    }
  }

  private async clearSupabase(): Promise<void> {
    // Delete all skills (use with caution!)
    const { error } = await supabase!.from('genome_skills').delete().neq('id', '');

    if (error) {
      throw error;
    }
  }
}
