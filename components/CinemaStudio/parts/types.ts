// Shared types for CinemaStudio sub-components.

export interface RefRow {
  url: string;
  alias?: string;
  source?: 'real_photo' | 'ai_generated' | 'composite';
  isPersonLikeness?: boolean;
}
