/**
 * Integration Example: Using Prediction Components in Dashboard
 *
 * This file demonstrates how to integrate the Meta-Learning prediction
 * components into the Dashboard.tsx right column.
 *
 * INTEGRATION POINTS:
 * 1. Import the PredictionPanel component
 * 2. Add state for current task intent
 * 3. Place the panel in the right column grid
 */

import React, { useState } from 'react';
import { PredictionPanel, PredictionBadge } from '../index';
import type { SearchResult } from '@antigravity/agent-core-sdk';

/**
 * Example: Dashboard with Prediction Panel
 *
 * This shows where to add the prediction panel in the Dashboard's
 * right column (col-span-3), after the Biometric Anchor section.
 */
export const DashboardPredictionExample = () => {
  // Track user's current task intent
  const [currentIntent, setCurrentIntent] = useState('');

  // Handle research selection
  const handleResearchSelect = (result: SearchResult) => {
    console.log('Selected research:', result);
    // Could open research in modal, inject into context, etc.
  };

  // Handle task start
  const handleStartTask = () => {
    console.log('Starting task:', currentIntent);
    // Execute task with optimal conditions confirmed
  };

  // Handle scheduling for later
  const handleScheduleLater = () => {
    console.log('Scheduling task for later:', currentIntent);
    // Add to task queue, set reminder, etc.
  };

  return (
    <div className="col-span-3 space-y-4 flex flex-col">
      {/* Existing right column content... */}

      {/* NEW: Prediction Panel Integration */}
      <div className="crystalline rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg">🔮</span>
          <span className="text-[10px] font-black font-mono text-white uppercase tracking-widest">
            Session Oracle
          </span>
        </div>

        {/* Task Intent Input */}
        <input
          type="text"
          value={currentIntent}
          onChange={(e) => setCurrentIntent(e.target.value)}
          placeholder="What are you working on?"
          className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono placeholder-gray-500 focus:border-[#f1c21b] focus:outline-none transition-all"
        />

        {/* Prediction Panel */}
        {currentIntent.length >= 3 && (
          <PredictionPanel
            intent={currentIntent}
            track={true}
            showErrors={true}
            showTiming={true}
            showResearch={true}
            onStartTask={handleStartTask}
            onScheduleLater={handleScheduleLater}
            onSelectResearch={handleResearchSelect}
          />
        )}
      </div>

      {/* Rest of existing right column content... */}
    </div>
  );
};

/**
 * MINIMAL INTEGRATION (No UI Changes)
 *
 * If you just want prediction data without the full panel:
 */
export const MinimalPredictionExample = () => {
  const [intent, setIntent] = useState('implement authentication');

  return (
    <div>
      {/* Use standalone prediction badge */}
      <PredictionBadge
        quality={4.2}
        successRate={0.78}
        confidence={0.85}
        compact={true}
      />
    </div>
  );
};

/**
 * ADVANCED INTEGRATION (Agent Control Center)
 *
 * Show predictions before spawning agents:
 */
export const AgentControlCenterPredictionExample = () => {
  const [agentTask, setAgentTask] = useState('');

  return (
    <div className="space-y-4">
      <h3>Spawn Agent</h3>

      <input
        type="text"
        value={agentTask}
        onChange={(e) => setAgentTask(e.target.value)}
        placeholder="Agent task..."
      />

      {/* Show prediction before agent spawns */}
      {agentTask.length >= 3 && (
        <PredictionPanel
          intent={agentTask}
          track={false}
          showErrors={true}
          showTiming={true}
          showResearch={false}
          onStartTask={() => {
            // Spawn agent with optimal conditions
            console.log('Spawning agent for:', agentTask);
          }}
        />
      )}
    </div>
  );
};

/**
 * KEYBOARD COMMAND INTEGRATION
 *
 * Add to Command Palette for quick predictions:
 */
export const CommandPalettePredictionExample = () => {
  // Add these commands to CommandPalette.tsx:
  const predictionCommands = [
    {
      id: 'predict-session',
      title: 'Predict Session Outcome',
      icon: '🔮',
      handler: (intent: string) => {
        // Show prediction modal
        console.log('Predicting:', intent);
      }
    },
    {
      id: 'check-errors',
      title: 'Check Potential Errors',
      icon: '⚠️',
      handler: (intent: string) => {
        // Show error predictions
        console.log('Checking errors for:', intent);
      }
    }
  ];

  return <div>Commands ready for Command Palette integration</div>;
};

/**
 * CSS INTEGRATION
 *
 * The prediction components use their own CSS file:
 * /components/predictions/styles/predictions.css
 *
 * This is automatically imported when you import any prediction component.
 * No additional CSS imports needed!
 */

/**
 * USAGE SUMMARY
 *
 * Standalone usage (works anywhere):
 * ```tsx
 * import { PredictionPanel } from '@/components/predictions';
 *
 * <PredictionPanel
 *   intent="your task description"
 *   track={true}
 *   onStartTask={() => console.log('Starting!')}
 * />
 * ```
 *
 * Individual components:
 * ```tsx
 * import {
 *   PredictionBadge,
 *   ErrorWarningPanel,
 *   OptimalTimeIndicator,
 *   ResearchChips,
 *   SignalBreakdown
 * } from '@/components/predictions';
 * ```
 *
 * With Agent Core SDK hooks:
 * ```tsx
 * import { useSessionPrediction } from '@antigravity/agent-core-sdk';
 *
 * const { prediction, isLoading, error } = useSessionPrediction({
 *   intent: 'your task',
 *   track: true
 * });
 * ```
 */
