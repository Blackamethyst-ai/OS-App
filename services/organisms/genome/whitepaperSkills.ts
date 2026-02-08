/**
 * Whitepaper-Inspired Seed Skills
 *
 * Skills derived from the Metaventions whitepaper:
 * "A Sovereign Substrate for Cognitive Equity"
 *
 * Implements the UCW's 3 semantic layers (Data/Light/Instinct),
 * cognitive asset scoring, session classification, and coherence detection.
 */

import type { SkillGenome } from './types';

// =============================================================================
// HELPER (mirrors seedSkills.ts pattern)
// =============================================================================

let wpCounter = 0;

function createWhitepaperSkill(
  name: string,
  description: string,
  tags: string[],
  inputSchema: SkillGenome['inputSchema'],
  outputSchema: SkillGenome['outputSchema'],
  handler: SkillGenome['handler'],
  options: { runtime?: 'sync' | 'async'; timeoutMs?: number; dqScore?: number } = {}
): SkillGenome {
  const id = `wp_${name.toLowerCase().replace(/\s+/g, '_')}_${++wpCounter}`;
  const now = Date.now();

  return {
    id,
    version: '1.0.0',
    name,
    description,
    tags: ['whitepaper', 'ucw', ...tags],
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
      createdBy: 'whitepaper-library',
    },
    checksum: '',
    dqScore: options.dqScore || 0.9,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// SEMANTIC LAYER EXTRACTION (Data / Light / Instinct)
// =============================================================================

const semanticLayerExtractor = createWhitepaperSkill(
  'Semantic Layer Extractor',
  'Extract UCW semantic layers (Data/Light/Instinct) from content. Data = raw content metrics, Light = meaning and intent, Instinct = emergence signals.',
  ['semantic', 'cognitive', 'layers'],
  {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Content to analyze' },
      source: { type: 'string', description: 'Source platform (claude, chatgpt, grok)' },
    },
    required: ['content'],
  },
  {
    type: 'object',
    properties: {
      data: { type: 'object' },
      light: { type: 'object' },
      instinct: { type: 'object' },
    },
  },
  {
    body: `
      var content = input.content || '';
      var source = input.source || 'unknown';
      var words = content.trim().split(/\\s+/).filter(function(w) { return w.length > 0; });
      var sentences = content.split(/[.!?]+/).filter(function(s) { return s.trim().length > 0; });

      // DATA LAYER — What was said (raw content metrics)
      var data = {
        charCount: content.length,
        wordCount: words.length,
        sentenceCount: sentences.length,
        tokenEstimate: Math.ceil(content.length / 4),
        source: source,
        timestamp: Date.now(),
      };

      // LIGHT LAYER — What it means (intent, topics, key concepts)
      var questionMarks = (content.match(/\\?/g) || []).length;
      var exclamations = (content.match(/!/g) || []).length;
      var codeBlocks = (content.match(/\`\`\`/g) || []).length / 2;
      var urls = (content.match(/https?:\\/\\//g) || []).length;

      var intentSignals = [];
      if (questionMarks > 0) intentSignals.push('inquiry');
      if (exclamations > 0) intentSignals.push('emphasis');
      if (codeBlocks > 0) intentSignals.push('implementation');
      if (urls > 0) intentSignals.push('reference');
      if (content.match(/\\b(should|could|would|might)\\b/gi)) intentSignals.push('deliberation');
      if (content.match(/\\b(build|create|implement|design)\\b/gi)) intentSignals.push('construction');
      if (content.match(/\\b(bug|error|fix|broken)\\b/gi)) intentSignals.push('debugging');

      var light = {
        intent: intentSignals,
        complexity: Math.min(1, (words.length / 500) * 0.4 + (codeBlocks / 3) * 0.3 + (sentences.length / 20) * 0.3),
        hasCode: codeBlocks > 0,
        hasReferences: urls > 0,
        questionDensity: words.length > 0 ? questionMarks / words.length : 0,
      };

      // INSTINCT LAYER — What it signals (coherence potential, flow, emergence)
      var noveltyIndicators = (content.match(/\\b(novel|new|first|breakthrough|discover|insight|realize)\\b/gi) || []).length;
      var synthesisIndicators = (content.match(/\\b(connect|combine|unif|integrat|synthesiz|bridg|merg)\\w*\\b/gi) || []).length;
      var depthIndicators = (content.match(/\\b(because|therefore|consequently|implies|means|suggests)\\b/gi) || []).length;

      var coherencePotential = Math.min(1,
        (noveltyIndicators * 0.15) +
        (synthesisIndicators * 0.2) +
        (depthIndicators * 0.1) +
        (light.complexity * 0.3)
      );

      var instinct = {
        coherencePotential: Math.round(coherencePotential * 1000) / 1000,
        noveltySignals: noveltyIndicators,
        synthesisSignals: synthesisIndicators,
        depthSignals: depthIndicators,
        emergenceScore: Math.round(Math.min(1, (noveltyIndicators + synthesisIndicators) * 0.15) * 1000) / 1000,
        flowIndicator: words.length > 100 && light.complexity > 0.5 ? 'deep' : words.length > 30 ? 'moderate' : 'shallow',
      };

      return { data: data, light: light, instinct: instinct };
    `,
    params: ['input'],
    isAsync: false,
  },
  { dqScore: 0.92 }
);

// =============================================================================
// COGNITIVE ASSET SCORER
// =============================================================================

const cognitiveAssetScorer = createWhitepaperSkill(
  'Cognitive Asset Scorer',
  'Score content as a cognitive asset based on novelty, verifiability, composability, and sovereign value. Core primitive of the UCW.',
  ['cognitive-equity', 'scoring', 'asset'],
  {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Content to score as cognitive asset' },
      hasProvenance: { type: 'boolean', description: 'Whether authorship is provable' },
      hasCitations: { type: 'boolean', description: 'Whether content references sources' },
      isComposable: { type: 'boolean', description: 'Whether content can be built upon' },
    },
    required: ['content'],
  },
  {
    type: 'object',
    properties: {
      score: { type: 'number' },
      dimensions: { type: 'object' },
      tier: { type: 'string' },
    },
  },
  {
    body: `
      var content = input.content || '';
      var words = content.trim().split(/\\s+/).filter(function(w) { return w.length > 0; });

      // Novelty — unique concepts, not boilerplate
      var genericPhrases = (content.match(/\\b(in conclusion|as we can see|it is important|in other words)\\b/gi) || []).length;
      var specificTerms = (content.match(/\\b[A-Z][a-z]+[A-Z]\\w*\\b/g) || []).length; // CamelCase = specific
      var novelty = Math.min(1, Math.max(0,
        (words.length > 20 ? 0.3 : 0) +
        (specificTerms * 0.05) +
        (genericPhrases > 3 ? -0.2 : 0.1) +
        (content.match(/\\b(novel|new|first|unique|original)\\b/gi) ? 0.15 : 0) +
        0.3
      ));

      // Verifiability — can claims be checked?
      var verifiability = 0;
      if (input.hasProvenance) verifiability += 0.3;
      if (input.hasCitations) verifiability += 0.3;
      if (content.match(/\\b\\d{4}\\b/)) verifiability += 0.1; // dates
      if (content.match(/https?:\\/\\//)) verifiability += 0.15;
      if (content.match(/arXiv|doi|isbn/i)) verifiability += 0.15;
      verifiability = Math.min(1, verifiability);

      // Composability — can others build on this?
      var composability = 0;
      if (input.isComposable !== false) composability += 0.2;
      if (content.match(/\\b(interface|api|protocol|standard|specification)\\b/gi)) composability += 0.2;
      if (content.match(/\\b(example|usage|pattern|template)\\b/gi)) composability += 0.15;
      if (content.match(/\`\`\`/)) composability += 0.2; // has code
      if (words.length > 50) composability += 0.15;
      composability = Math.min(1, composability);

      // Sovereign value — does it strengthen owner's position?
      var sovereignValue = Math.min(1,
        (novelty * 0.4) + (verifiability * 0.3) + (composability * 0.3)
      );

      var score = Math.round(sovereignValue * 1000) / 1000;

      var tier = score >= 0.75 ? 'deep_work' :
                 score >= 0.5 ? 'exploration' :
                 score >= 0.3 ? 'casual' : 'garbage';

      return {
        score: score,
        dimensions: {
          novelty: Math.round(novelty * 1000) / 1000,
          verifiability: Math.round(verifiability * 1000) / 1000,
          composability: Math.round(composability * 1000) / 1000,
          sovereignValue: score,
        },
        tier: tier,
        isWorthCapturing: score >= 0.4,
        timestamp: Date.now(),
      };
    `,
    params: ['input'],
    isAsync: false,
  },
  { dqScore: 0.93 }
);

// =============================================================================
// COGNITIVE MODE CLASSIFIER
// =============================================================================

const cognitiveModeClassifier = createWhitepaperSkill(
  'Cognitive Mode Classifier',
  'Classify a session or content into cognitive modes: deep_work (>0.75), exploration (0.5-0.75), casual (0.3-0.5), garbage (<0.3). Maps to platform archetypes.',
  ['cognitive', 'classification', 'mode'],
  {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Session content to classify' },
      messageCount: { type: 'number', description: 'Number of messages in session' },
      durationMinutes: { type: 'number', description: 'Session duration in minutes' },
      toolUsageCount: { type: 'number', description: 'Number of tool uses' },
    },
    required: ['content'],
  },
  {
    type: 'object',
    properties: {
      mode: { type: 'string' },
      score: { type: 'number' },
      platform: { type: 'string' },
    },
  },
  {
    body: `
      var content = input.content || '';
      var msgCount = input.messageCount || 1;
      var duration = input.durationMinutes || 5;
      var toolUse = input.toolUsageCount || 0;
      var words = content.trim().split(/\\s+/).length;

      // Depth signals
      var codeBlocks = (content.match(/\`\`\`/g) || []).length / 2;
      var technicalTerms = (content.match(/\\b(function|class|interface|import|export|async|await|const|let|var|return|type|enum)\\b/g) || []).length;
      var analysisTerms = (content.match(/\\b(analyze|investigate|compare|evaluate|assess|review|audit)\\b/gi) || []).length;
      var creativeTerms = (content.match(/\\b(design|architect|build|create|implement|develop|prototype)\\b/gi) || []).length;

      // Engagement density
      var wordsPerMinute = duration > 0 ? words / duration : words;
      var toolDensity = duration > 0 ? toolUse / duration : 0;
      var msgDensity = duration > 0 ? msgCount / duration : msgCount;

      // Score computation
      var depthScore = Math.min(1,
        (codeBlocks * 0.08) +
        (technicalTerms * 0.01) +
        (analysisTerms * 0.05) +
        (creativeTerms * 0.05) +
        (toolDensity > 0.5 ? 0.2 : toolDensity * 0.4) +
        (wordsPerMinute > 50 ? 0.15 : 0) +
        (duration > 30 ? 0.15 : duration > 10 ? 0.08 : 0)
      );

      var mode = depthScore >= 0.75 ? 'deep_work' :
                 depthScore >= 0.5 ? 'exploration' :
                 depthScore >= 0.3 ? 'casual' : 'garbage';

      // Platform archetype mapping
      var platform = mode === 'deep_work' ? 'claude' :
                     mode === 'exploration' ? 'chatgpt' :
                     mode === 'casual' ? 'ccc' : 'unknown';

      return {
        mode: mode,
        score: Math.round(depthScore * 1000) / 1000,
        platform: platform,
        signals: {
          codeBlocks: codeBlocks,
          technicalTerms: technicalTerms,
          analysisTerms: analysisTerms,
          creativeTerms: creativeTerms,
          wordsPerMinute: Math.round(wordsPerMinute),
          toolDensity: Math.round(toolDensity * 100) / 100,
        },
        isWorthCapturing: depthScore >= 0.3,
      };
    `,
    params: ['input'],
    isAsync: false,
  },
  { dqScore: 0.91 }
);

// =============================================================================
// COHERENCE DETECTOR
// =============================================================================

const coherenceDetector = createWhitepaperSkill(
  'Coherence Detector',
  'Detect semantic coherence between two pieces of content from different platforms. Finds cross-platform alignment — the core UCW signal.',
  ['coherence', 'cross-platform', 'detection'],
  {
    type: 'object',
    properties: {
      contentA: { type: 'string', description: 'Content from platform A' },
      contentB: { type: 'string', description: 'Content from platform B' },
      sourceA: { type: 'string', description: 'Platform name A' },
      sourceB: { type: 'string', description: 'Platform name B' },
    },
    required: ['contentA', 'contentB'],
  },
  {
    type: 'object',
    properties: {
      coherenceScore: { type: 'number' },
      isCoherent: { type: 'boolean' },
      sharedConcepts: { type: 'array' },
    },
  },
  {
    body: `
      var a = (input.contentA || '').toLowerCase();
      var b = (input.contentB || '').toLowerCase();

      // Extract significant words (>3 chars, not stopwords)
      var stopWords = new Set(['the','and','for','are','but','not','you','all','can','her','was',
        'one','our','out','has','have','had','been','were','they','this','that','with','from',
        'will','would','could','should','about','which','their','there','them','than','then',
        'into','some','what','when','more','also','just','each','much','very','most','only']);

      function getSignificantWords(text) {
        return text.replace(/[^a-z0-9\\s]/g, '').split(/\\s+/)
          .filter(function(w) { return w.length > 3 && !stopWords.has(w); });
      }

      var wordsA = getSignificantWords(a);
      var wordsB = getSignificantWords(b);
      var setA = new Set(wordsA);
      var setB = new Set(wordsB);

      // Jaccard similarity on significant words
      var intersection = [];
      setA.forEach(function(w) { if (setB.has(w)) intersection.push(w); });
      var union = new Set([].concat(Array.from(setA), Array.from(setB)));
      var jaccard = union.size > 0 ? intersection.length / union.size : 0;

      // Concept overlap (2-grams)
      function getBigrams(words) {
        var bigrams = [];
        for (var i = 0; i < words.length - 1; i++) {
          bigrams.push(words[i] + '_' + words[i+1]);
        }
        return bigrams;
      }

      var bigramsA = new Set(getBigrams(wordsA));
      var bigramsB = new Set(getBigrams(wordsB));
      var bigramOverlap = [];
      bigramsA.forEach(function(bg) { if (bigramsB.has(bg)) bigramOverlap.push(bg.replace('_', ' ')); });

      // Combined coherence score
      var bigramScore = (bigramsA.size + bigramsB.size) > 0 ?
        bigramOverlap.length / Math.min(bigramsA.size, bigramsB.size) : 0;
      var coherenceScore = Math.min(1, (jaccard * 0.5) + (bigramScore * 0.5));

      return {
        coherenceScore: Math.round(coherenceScore * 1000) / 1000,
        isCoherent: coherenceScore >= 0.15,
        sharedConcepts: intersection.slice(0, 20),
        sharedBigrams: bigramOverlap.slice(0, 10),
        sourceA: input.sourceA || 'unknown',
        sourceB: input.sourceB || 'unknown',
        metrics: {
          jaccardSimilarity: Math.round(jaccard * 1000) / 1000,
          bigramOverlapScore: Math.round(bigramScore * 1000) / 1000,
          uniqueWordsA: setA.size,
          uniqueWordsB: setB.size,
          sharedWordCount: intersection.length,
        },
      };
    `,
    params: ['input'],
    isAsync: false,
  },
  { dqScore: 0.90 }
);

// =============================================================================
// PORTFOLIO VALUATOR
// =============================================================================

const portfolioValuator = createWhitepaperSkill(
  'Portfolio Valuator',
  'Compute the cognitive equity value of a portfolio of assets. Implements compounding value logic from the whitepaper.',
  ['cognitive-equity', 'portfolio', 'valuation'],
  {
    type: 'object',
    properties: {
      assets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            score: { type: 'number', description: 'Asset quality score 0-1' },
            tier: { type: 'string', description: 'deep_work|exploration|casual' },
            ageInDays: { type: 'number', description: 'Age of asset in days' },
            compositionCount: { type: 'number', description: 'Times this asset has been built upon' },
          },
        },
        description: 'Array of cognitive assets with scores',
      },
    },
    required: ['assets'],
  },
  {
    type: 'object',
    properties: {
      totalValue: { type: 'number' },
      assetCount: { type: 'number' },
      tierBreakdown: { type: 'object' },
    },
  },
  {
    body: `
      var assets = input.assets || [];
      if (assets.length === 0) {
        return { totalValue: 0, assetCount: 0, tierBreakdown: {}, avgQuality: 0, compoundingFactor: 1 };
      }

      var tierValues = { deep_work: 0, exploration: 0, casual: 0, garbage: 0 };
      var tierCounts = { deep_work: 0, exploration: 0, casual: 0, garbage: 0 };
      var totalBaseValue = 0;

      assets.forEach(function(asset) {
        var score = Math.max(0, Math.min(1, asset.score || 0));
        var tier = asset.tier || (score >= 0.75 ? 'deep_work' : score >= 0.5 ? 'exploration' : score >= 0.3 ? 'casual' : 'garbage');
        var ageInDays = asset.ageInDays || 0;
        var compositions = asset.compositionCount || 0;

        // Base value by tier
        var tierMultiplier = tier === 'deep_work' ? 10 :
                             tier === 'exploration' ? 3 :
                             tier === 'casual' ? 1 : 0.1;

        // Compounding: assets that get built upon are worth more
        var compoundingBonus = 1 + (compositions * 0.15);

        // Decay: old assets lose some value unless they're deep work
        var decayRate = tier === 'deep_work' ? 0.002 : tier === 'exploration' ? 0.008 : 0.02;
        var decayFactor = Math.max(0.1, 1 - (ageInDays * decayRate));

        var assetValue = score * tierMultiplier * compoundingBonus * decayFactor;
        totalBaseValue += assetValue;

        if (tierValues[tier] !== undefined) {
          tierValues[tier] += assetValue;
          tierCounts[tier]++;
        }
      });

      // Portfolio compounding: diverse portfolios are worth more
      var activeTiers = Object.values(tierCounts).filter(function(c) { return c > 0; }).length;
      var diversityBonus = 1 + (activeTiers * 0.1);
      var totalValue = totalBaseValue * diversityBonus;

      var avgQuality = assets.reduce(function(sum, a) { return sum + (a.score || 0); }, 0) / assets.length;

      return {
        totalValue: Math.round(totalValue * 100) / 100,
        assetCount: assets.length,
        tierBreakdown: {
          deep_work: { count: tierCounts.deep_work, value: Math.round(tierValues.deep_work * 100) / 100 },
          exploration: { count: tierCounts.exploration, value: Math.round(tierValues.exploration * 100) / 100 },
          casual: { count: tierCounts.casual, value: Math.round(tierValues.casual * 100) / 100 },
        },
        avgQuality: Math.round(avgQuality * 1000) / 1000,
        compoundingFactor: Math.round(diversityBonus * 100) / 100,
      };
    `,
    params: ['input'],
    isAsync: false,
  },
  { dqScore: 0.88 }
);

// =============================================================================
// QUALITY THRESHOLD FILTER
// =============================================================================

const qualityFilter = createWhitepaperSkill(
  'Quality Threshold Filter',
  'Filter items by quality threshold (default 0.4 from UCW PRD). Separates signal from noise in cognitive capture.',
  ['quality', 'filter', 'threshold'],
  {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            score: { type: 'number' },
            content: { type: 'string' },
          },
        },
        description: 'Items to filter',
      },
      threshold: { type: 'number', description: 'Quality threshold (default 0.4)' },
    },
    required: ['items'],
  },
  {
    type: 'object',
    properties: {
      passed: { type: 'array' },
      filtered: { type: 'array' },
      stats: { type: 'object' },
    },
  },
  {
    body: `
      var items = input.items || [];
      var threshold = input.threshold !== undefined ? input.threshold : 0.4;

      var passed = [];
      var filtered = [];

      items.forEach(function(item) {
        if ((item.score || 0) >= threshold) {
          passed.push(item);
        } else {
          filtered.push(item);
        }
      });

      var passedScores = passed.map(function(i) { return i.score || 0; });
      var avgPassed = passedScores.length > 0 ?
        passedScores.reduce(function(a, b) { return a + b; }, 0) / passedScores.length : 0;

      return {
        passed: passed,
        filtered: filtered,
        stats: {
          total: items.length,
          passedCount: passed.length,
          filteredCount: filtered.length,
          passRate: items.length > 0 ? Math.round((passed.length / items.length) * 1000) / 1000 : 0,
          avgPassedScore: Math.round(avgPassed * 1000) / 1000,
          threshold: threshold,
        },
      };
    `,
    params: ['input'],
    isAsync: false,
  },
  { dqScore: 0.87 }
);

// =============================================================================
// EXPORTS
// =============================================================================

/** All whitepaper-inspired skills */
export const WHITEPAPER_SKILLS: SkillGenome[] = [
  semanticLayerExtractor,
  cognitiveAssetScorer,
  cognitiveModeClassifier,
  coherenceDetector,
  portfolioValuator,
  qualityFilter,
];

/**
 * Register all whitepaper skills with a skill registry and MCP server.
 * Skips skills that are already registered (by name).
 */
export function registerWhitepaperSkills(
  registry: { register: (skill: SkillGenome) => void; getAll: () => SkillGenome[] },
  mcpServer: { registerSkillResource: (skill: SkillGenome) => void }
): { registered: number; skipped: number } {
  const existing = new Set(registry.getAll().map((s) => s.name));
  let registered = 0;
  let skipped = 0;

  for (const skill of WHITEPAPER_SKILLS) {
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
