-- =====================================================
-- Genome Skills Table
-- =====================================================
-- Stores persistent skills for GenomeLayer
-- Research basis: arXiv:2504.07079 (SkillWeaver), arXiv:2512.23880 (CASCADE)

CREATE TABLE IF NOT EXISTS genome_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  dq_score REAL NOT NULL DEFAULT 0,
  origin_type TEXT NOT NULL DEFAULT 'native',
  checksum TEXT NOT NULL,
  genome_data JSONB NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_genome_skills_name ON genome_skills(name);
CREATE INDEX IF NOT EXISTS idx_genome_skills_dq_score ON genome_skills(dq_score);
CREATE INDEX IF NOT EXISTS idx_genome_skills_tags ON genome_skills USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_genome_skills_origin_type ON genome_skills(origin_type);

-- Comments
COMMENT ON TABLE genome_skills IS 'Persistent skill storage for GenomeLayer - enables skill library across sessions';
COMMENT ON COLUMN genome_skills.id IS 'Unique skill identifier (UUID)';
COMMENT ON COLUMN genome_skills.genome_data IS 'Full SkillGenome as JSONB';
COMMENT ON COLUMN genome_skills.checksum IS 'SHA-256 checksum of skill function for deduplication';
