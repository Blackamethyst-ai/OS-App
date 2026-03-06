/**
 * Prediction Demo Component
 *
 * A standalone demo that can be dropped into App.tsx for immediate testing.
 *
 * USAGE:
 * 1. Import: import { PredictionDemo } from './components/predictions/PredictionDemo';
 * 2. Add to App.tsx: <PredictionDemo />
 * 3. Ensure ResearchGravity API is running: uvicorn api.server:app --reload --port 3847
 * 4. Open browser and test the prediction system
 */

import React, { useState } from 'react';
import { PredictionPanel, PredictionBadge, ErrorWarningPanel, OptimalTimeIndicator, ResearchChips, SignalBreakdown } from './index';
import './styles/predictions.css';

export const PredictionDemo: React.FC = () => {
  const [intent, setIntent] = useState('');
  const [activeTab, setActiveTab] = useState<'full' | 'components'>('full');

  // Example data for component showcase
  const exampleSignals = {
    outcome_score: 0.85,
    cognitive_alignment: 0.72,
    research_availability: 0.68,
    error_probability: 0.15,
  };

  const exampleErrors = [
    {
      error_type: 'git_username_mismatch',
      context: 'Committing with wrong username',
      solution: 'Run: git config user.name "Dicoangelo"',
      success_rate: 0.95,
      severity: 'high' as const,
      score: 0.85,
    },
    {
      error_type: 'missing_api_key',
      context: 'Anthropic API key not configured',
      solution: 'Set ANTHROPIC_API_KEY environment variable',
      success_rate: 0.88,
      severity: 'medium' as const,
      score: 0.72,
    },
  ];

  const exampleResearch: any[] = [
    {
      id: '1',
      title: 'Multi-Agent Consensus Mechanisms',
      url: 'https://arxiv.org/abs/2508.17536',
      category: 'architecture',
      relevance: 0.92,
      tier: 1,
      finding: 'Voting alone captures most gains in multi-agent systems',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Adaptive Learning in Cognitive Systems',
      url: 'https://arxiv.org/abs/2512.05470',
      category: 'meta-learning',
      relevance: 0.85,
      tier: 1,
      finding: 'Meta-learning improves prediction accuracy by 20%',
      timestamp: new Date().toISOString(),
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black font-mono text-white uppercase tracking-tight">
          🔮 Meta-Learning Prediction Demo
        </h1>
        <p className="text-gray-400 text-sm font-mono max-w-2xl mx-auto">
          Standalone demonstration of the Meta-Learning Engine prediction components.
          Enter a task intent to see real-time predictions, or explore individual components below.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-500">API Ready</span>
          </div>
          <div className="text-gray-600">|</div>
          <div className="text-gray-500">Agent Core MCP</div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setActiveTab('full')}
          className={`px-6 py-2 rounded-lg font-mono text-sm uppercase tracking-wider transition-all ${
            activeTab === 'full'
              ? 'bg-[var(--executive-gold)] text-black font-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Full Panel
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`px-6 py-2 rounded-lg font-mono text-sm uppercase tracking-wider transition-all ${
            activeTab === 'components'
              ? 'bg-[var(--executive-gold)] text-black font-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Components
        </button>
      </div>

      {/* Full Panel Demo */}
      {activeTab === 'full' && (
        <div className="space-y-6">
          <div className="crystalline rounded-2xl p-6">
            <h2 className="text-lg font-black font-mono text-white uppercase tracking-wider mb-4">
              💬 Enter Task Intent
            </h2>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., implement authentication system, refactor API layer, build multi-agent orchestrator..."
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white font-mono placeholder-gray-500 focus:border-[var(--executive-gold)] focus:outline-none transition-all"
            />
            <p className="text-xs text-gray-500 font-mono mt-2">
              {intent.length < 3
                ? `Type at least 3 characters to trigger predictions (${intent.length}/3)`
                : '✅ Ready for prediction'}
            </p>
          </div>

          {/* Live Prediction Panel */}
          {intent.length >= 3 && (
            <div className="animate-in fade-in duration-500">
              <PredictionPanel
                intent={intent}
                track={false} // Set to true to actually track predictions
                showErrors={true}
                showTiming={true}
                showResearch={true}
                onStartTask={() => setIntent('')}
                onScheduleLater={() => setIntent('')}
                onSelectResearch={(result) => {
                  if (result.url) window.open(result.url, '_blank', 'noopener');
                }}
              />
            </div>
          )}

          {intent.length === 0 && (
            <div className="crystalline rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-gray-500 font-mono text-sm">
                Enter a task intent above to see real-time predictions
              </p>
            </div>
          )}
        </div>
      )}

      {/* Individual Components Demo */}
      {activeTab === 'components' && (
        <div className="space-y-8">
          {/* Prediction Badge */}
          <div className="crystalline rounded-2xl p-6">
            <h3 className="text-sm font-black font-mono text-white uppercase tracking-wider mb-4">
              1️⃣ Prediction Badge
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              Compact quality indicator with star rating and success probability
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">Regular Mode:</p>
                <PredictionBadge quality={4.2} successRate={0.78} confidence={0.85} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Compact Mode:</p>
                <PredictionBadge quality={3.5} successRate={0.65} confidence={0.72} compact={true} />
              </div>
            </div>
          </div>

          {/* Error Warning Panel */}
          <div className="crystalline rounded-2xl p-6">
            <h3 className="text-sm font-black font-mono text-white uppercase tracking-wider mb-4">
              2️⃣ Error Warning Panel
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              Predictive error prevention with solutions from past recoveries
            </p>
            <ErrorWarningPanel
              errors={exampleErrors}
              maxDisplay={3}
              onDismiss={() => {}}
            />
          </div>

          {/* Optimal Time Indicator */}
          <div className="crystalline rounded-2xl p-6">
            <h3 className="text-sm font-black font-mono text-white uppercase tracking-wider mb-4">
              3️⃣ Optimal Time Indicator
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              Cognitive state alignment and optimal timing suggestions
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-2">Optimal Now:</p>
                <OptimalTimeIndicator
                  optimalHour={20}
                  isOptimalNow={true}
                  reasoning="Current hour (20:00) is your peak productivity time based on historical patterns"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Not Optimal:</p>
                <OptimalTimeIndicator
                  optimalHour={20}
                  isOptimalNow={false}
                  reasoning="Peak performance detected at 20:00. Current time (14:00) shows 30% lower success rate for this task type"
                />
              </div>
            </div>
          </div>

          {/* Research Chips */}
          <div className="crystalline rounded-2xl p-6">
            <h3 className="text-sm font-black font-mono text-white uppercase tracking-wider mb-4">
              4️⃣ Research Chips
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              Recommended research papers from ResearchGravity knowledge base
            </p>
            <ResearchChips
              research={exampleResearch}
              maxDisplay={3}
              onSelect={(result) => {
                if (result.url) window.open(result.url, '_blank', 'noopener');
              }}
            />
          </div>

          {/* Signal Breakdown */}
          <div className="crystalline rounded-2xl p-6">
            <h3 className="text-sm font-black font-mono text-white uppercase tracking-wider mb-4">
              5️⃣ Signal Breakdown
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              Advanced correlation analysis across 4 dimensions (power user feature)
            </p>
            <SignalBreakdown signals={exampleSignals} showWeights={true} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center space-y-2 pt-8 border-t border-white/10">
        <p className="text-xs text-gray-600 font-mono">
          Meta-Learning Engine • Phase 7 Complete • OS-App Integration Ready
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 font-mono">
          <a href="https://github.com/Dicoangelo/researchgravity" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--executive-gold)] transition-colors">
            📖 Documentation
          </a>
          <span>•</span>
          <a href="https://github.com/Dicoangelo/OS-App" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--executive-gold)] transition-colors">
            🚀 Integration Guide
          </a>
          <span>•</span>
          <a href="https://github.com/Dicoangelo/researchgravity" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--executive-gold)] transition-colors">
            🔌 API Docs
          </a>
        </div>
      </div>
    </div>
  );
};

export default PredictionDemo;
