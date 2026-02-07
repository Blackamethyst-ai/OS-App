/**
 * Seed Skills Library
 *
 * Bootstrap skills for the GenomeLayer skill registry.
 * These provide foundational capabilities that can be composed
 * via SkillWeaver into more complex behaviors.
 */

import type { SkillGenome } from './types';

// =============================================================================
// HELPER
// =============================================================================

let seedCounter = 0;

function createSeedSkill(
  name: string,
  description: string,
  tags: string[],
  inputSchema: SkillGenome['inputSchema'],
  outputSchema: SkillGenome['outputSchema'],
  handler: SkillGenome['handler'],
  options: { runtime?: 'sync' | 'async'; timeoutMs?: number; dqScore?: number } = {}
): SkillGenome {
  const id = `seed_${name.toLowerCase().replace(/\s+/g, '_')}_${++seedCounter}`;
  const now = Date.now();

  return {
    id,
    version: '1.0.0',
    name,
    description,
    tags: ['seed', ...tags],
    inputSchema,
    outputSchema,
    handler,
    dependencies: [],
    runtime: options.runtime || 'sync',
    timeoutMs: options.timeoutMs || 5000,
    mcpResource: {
      uri: `mcp://agent-genome/skills/${id}`,
      mimeType: 'application/json',
      toolSchema: {
        name: `genome_${name.toLowerCase().replace(/\s+/g, '_')}`,
        description,
        inputSchema,
      },
    },
    portability: {
      isPortable: true,
      requiresContext: [],
      compatibility: [],
      orthogonalDimensions: [],
    },
    origin: {
      type: 'native',
      createdAt: now,
      createdBy: 'seed-library',
    },
    checksum: '',
    dqScore: options.dqScore || 0.85,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// DATA TRANSFORMATION SKILLS
// =============================================================================

const jsonParse = createSeedSkill(
  'JSON Parse',
  'Parse a JSON string into an object with error handling',
  ['data', 'transform', 'json'],
  {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'JSON string to parse' },
    },
    required: ['input'],
  },
  { type: 'object' },
  {
    body: `
      try {
        return JSON.parse(input.input);
      } catch (e) {
        return { error: 'Invalid JSON: ' + e.message, raw: input.input };
      }
    `,
    params: ['input'],
    isAsync: false,
  }
);

const jsonStringify = createSeedSkill(
  'JSON Stringify',
  'Convert an object to a formatted JSON string',
  ['data', 'transform', 'json'],
  {
    type: 'object',
    properties: {
      data: { type: 'object', description: 'Object to stringify' },
      pretty: { type: 'boolean', description: 'Whether to format with indentation' },
    },
    required: ['data'],
  },
  { type: 'string' },
  {
    body: `
      var indent = input.pretty ? 2 : 0;
      return JSON.stringify(input.data, null, indent);
    `,
    params: ['input'],
    isAsync: false,
  }
);

const flattenObject = createSeedSkill(
  'Flatten Object',
  'Flatten a nested object into dot-notation keys',
  ['data', 'transform'],
  {
    type: 'object',
    properties: {
      obj: { type: 'object', description: 'Nested object to flatten' },
      prefix: { type: 'string', description: 'Key prefix' },
    },
    required: ['obj'],
  },
  { type: 'object' },
  {
    body: `
      var result = {};
      function recurse(cur, prop) {
        if (Object(cur) !== cur || Array.isArray(cur)) {
          result[prop] = cur;
        } else {
          var isEmpty = true;
          for (var p in cur) {
            isEmpty = false;
            recurse(cur[p], prop ? prop + '.' + p : p);
          }
          if (isEmpty && prop) result[prop] = {};
        }
      }
      recurse(input.obj, input.prefix || '');
      return result;
    `,
    params: ['input'],
    isAsync: false,
  }
);

// =============================================================================
// TEXT ANALYSIS SKILLS
// =============================================================================

const wordCount = createSeedSkill(
  'Word Count',
  'Count words, sentences, and characters in text',
  ['text', 'analysis'],
  {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to analyze' },
    },
    required: ['text'],
  },
  {
    type: 'object',
    properties: {
      words: { type: 'number' },
      sentences: { type: 'number' },
      characters: { type: 'number' },
      paragraphs: { type: 'number' },
    },
  },
  {
    body: `
      var text = input.text || '';
      var words = text.trim().split(/\\s+/).filter(function(w) { return w.length > 0; });
      var sentences = text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 0; });
      var paragraphs = text.split(/\\n\\n+/).filter(function(p) { return p.trim().length > 0; });
      return {
        words: words.length,
        sentences: sentences.length,
        characters: text.length,
        paragraphs: paragraphs.length,
      };
    `,
    params: ['input'],
    isAsync: false,
  }
);

const extractKeywords = createSeedSkill(
  'Extract Keywords',
  'Extract significant keywords from text using frequency analysis',
  ['text', 'analysis', 'nlp'],
  {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Text to extract keywords from' },
      topN: { type: 'number', description: 'Number of keywords to return' },
    },
    required: ['text'],
  },
  {
    type: 'object',
    properties: {
      keywords: { type: 'array', items: { type: 'object' } },
    },
  },
  {
    body: `
      var stopWords = new Set(['the','a','an','is','are','was','were','be','been','being',
        'have','has','had','do','does','did','will','would','could','should','may','might',
        'shall','can','need','dare','ought','used','to','of','in','for','on','with','at',
        'by','from','as','into','through','during','before','after','above','below','between',
        'out','off','over','under','again','further','then','once','it','its','this','that',
        'these','those','i','me','my','we','our','you','your','he','him','his','she','her',
        'they','them','their','what','which','who','whom','and','but','or','nor','not','so']);

      var words = (input.text || '').toLowerCase().replace(/[^a-z0-9\\s]/g, '').split(/\\s+/)
        .filter(function(w) { return w.length > 2 && !stopWords.has(w); });

      var freq = {};
      words.forEach(function(w) { freq[w] = (freq[w] || 0) + 1; });

      var topN = input.topN || 10;
      var sorted = Object.entries(freq).sort(function(a, b) { return b[1] - a[1]; }).slice(0, topN);

      return {
        keywords: sorted.map(function(entry) {
          return { word: entry[0], count: entry[1], density: entry[1] / words.length };
        }),
        totalWords: words.length,
      };
    `,
    params: ['input'],
    isAsync: false,
  }
);

// =============================================================================
// SCHEMA & VALIDATION SKILLS
// =============================================================================

const validateSchema = createSeedSkill(
  'Schema Validator',
  'Validate data against a JSON Schema definition',
  ['validation', 'schema'],
  {
    type: 'object',
    properties: {
      data: { type: 'object', description: 'Data to validate' },
      schema: { type: 'object', description: 'JSON Schema to validate against' },
    },
    required: ['data', 'schema'],
  },
  {
    type: 'object',
    properties: {
      valid: { type: 'boolean' },
      errors: { type: 'array', items: { type: 'string' } },
    },
  },
  {
    body: `
      var errors = [];
      var data = input.data;
      var schema = input.schema;

      function validate(value, schema, path) {
        if (!schema) return;

        if (schema.type) {
          var actualType = Array.isArray(value) ? 'array' : typeof value;
          if (value === null) actualType = 'null';
          if (actualType === 'number' && schema.type === 'integer' && value % 1 !== 0) {
            errors.push(path + ': expected integer, got float');
          } else if (schema.type !== actualType && !(schema.type === 'number' && actualType === 'number')) {
            errors.push(path + ': expected ' + schema.type + ', got ' + actualType);
          }
        }

        if (schema.required && schema.properties) {
          schema.required.forEach(function(key) {
            if (value[key] === undefined) {
              errors.push(path + '.' + key + ': required field missing');
            }
          });
        }

        if (schema.properties && typeof value === 'object' && value !== null) {
          Object.keys(schema.properties).forEach(function(key) {
            if (value[key] !== undefined) {
              validate(value[key], schema.properties[key], path + '.' + key);
            }
          });
        }
      }

      validate(data, schema, '$');
      return { valid: errors.length === 0, errors: errors };
    `,
    params: ['input'],
    isAsync: false,
  }
);

// =============================================================================
// MATH / COMPUTATION SKILLS
// =============================================================================

const statistics = createSeedSkill(
  'Basic Statistics',
  'Compute basic statistics (mean, median, stddev, min, max) for a numeric array',
  ['math', 'statistics', 'analysis'],
  {
    type: 'object',
    properties: {
      values: { type: 'array', items: { type: 'number' }, description: 'Numeric array' },
    },
    required: ['values'],
  },
  {
    type: 'object',
    properties: {
      mean: { type: 'number' },
      median: { type: 'number' },
      stddev: { type: 'number' },
      min: { type: 'number' },
      max: { type: 'number' },
      count: { type: 'number' },
    },
  },
  {
    body: `
      var vals = (input.values || []).slice().sort(function(a, b) { return a - b; });
      var n = vals.length;
      if (n === 0) return { mean: 0, median: 0, stddev: 0, min: 0, max: 0, count: 0 };

      var sum = vals.reduce(function(a, b) { return a + b; }, 0);
      var mean = sum / n;
      var median = n % 2 === 0 ? (vals[n/2 - 1] + vals[n/2]) / 2 : vals[Math.floor(n/2)];
      var variance = vals.reduce(function(acc, v) { return acc + (v - mean) * (v - mean); }, 0) / n;

      return {
        mean: mean,
        median: median,
        stddev: Math.sqrt(variance),
        min: vals[0],
        max: vals[n - 1],
        count: n,
        sum: sum,
      };
    `,
    params: ['input'],
    isAsync: false,
  }
);

// =============================================================================
// DQ SCORING SKILL
// =============================================================================

const dqScorer = createSeedSkill(
  'DQ Scorer',
  'Compute DQ (Decision Quality) score: validity (40%) + specificity (30%) + correctness (30%)',
  ['quality', 'scoring', 'dq'],
  {
    type: 'object',
    properties: {
      validity: { type: 'number', description: 'Validity score 0-1', minimum: 0, maximum: 1 },
      specificity: { type: 'number', description: 'Specificity score 0-1', minimum: 0, maximum: 1 },
      correctness: { type: 'number', description: 'Correctness score 0-1', minimum: 0, maximum: 1 },
    },
    required: ['validity', 'specificity', 'correctness'],
  },
  {
    type: 'object',
    properties: {
      score: { type: 'number' },
      isActionable: { type: 'boolean' },
      components: { type: 'object' },
    },
  },
  {
    body: `
      var v = Math.max(0, Math.min(1, input.validity || 0));
      var s = Math.max(0, Math.min(1, input.specificity || 0));
      var c = Math.max(0, Math.min(1, input.correctness || 0));
      var score = v * 0.4 + s * 0.3 + c * 0.3;

      return {
        score: Math.round(score * 1000) / 1000,
        isActionable: score >= 0.6,
        components: { validity: v, specificity: s, correctness: c },
        timestamp: Date.now(),
      };
    `,
    params: ['input'],
    isAsync: false,
  },
  { dqScore: 0.95 }
);

// =============================================================================
// EXPORTS
// =============================================================================

/** All seed skills */
export const SEED_SKILLS: SkillGenome[] = [
  jsonParse,
  jsonStringify,
  flattenObject,
  wordCount,
  extractKeywords,
  validateSchema,
  statistics,
  dqScorer,
];

/**
 * Register all seed skills with a skill registry and MCP server.
 * Skips skills that are already registered (by name).
 */
export function registerSeedSkills(
  registry: { register: (skill: SkillGenome) => void; getAll: () => SkillGenome[] },
  mcpServer: { registerSkillResource: (skill: SkillGenome) => void }
): { registered: number; skipped: number } {
  const existing = new Set(registry.getAll().map((s) => s.name));
  let registered = 0;
  let skipped = 0;

  for (const skill of SEED_SKILLS) {
    if (existing.has(skill.name)) {
      skipped++;
      continue;
    }

    registry.register(skill);
    mcpServer.registerSkillResource(skill);
    registered++;
  }

  return { registered, skipped };
}
