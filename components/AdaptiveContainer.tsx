/**
 * ADAPTIVE CONTAINER
 *
 * Wrapper component that applies self-synthesizing adaptive UI layouts.
 * Handles liquid morphing transitions and layout switching.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAdaptiveUI } from '../hooks/useAdaptiveUI';
import { UILayoutSpec, UIComponentSpec } from '../services/ui/types';
import { cn } from '../utils/cn';

interface AdaptiveContainerProps {
  children: React.ReactNode;
  regionId?: string;
  className?: string;
  enableMorphing?: boolean;
  showDebugOverlay?: boolean;
}

export const AdaptiveContainer: React.FC<AdaptiveContainerProps> = ({
  children,
  regionId = 'main',
  className,
  enableMorphing = true,
  showDebugOverlay = false,
}) => {
  const {
    isEnabled,
    isRegenerating,
    currentLayout,
    layoutVersion,
    lastEvaluation,
    evaluationScore,
    regenerationLatency,
    iterationCount,
    gazeSemantics,
  } = useAdaptiveUI();

  const [morphState, setMorphState] = useState<'idle' | 'morphing' | 'complete'>('idle');

  // Get region-specific layout
  const regionLayout = useMemo(() => {
    return currentLayout?.regions.find(r => r.id === regionId);
  }, [currentLayout, regionId]);

  // Determine container style based on layout
  // CRITICAL: Container must allow scroll pass-through
  const containerStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      // Allow vertical scrolling
      minHeight: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      // Only apply transitions to visual properties (not layout)
      transition: enableMorphing ? 'opacity 300ms, filter 300ms, background-color 300ms' : 'none',
    };

    if (!currentLayout) return baseStyle;

    // Apply theme-based styling (visual only, no layout changes)
    switch (currentLayout.theme) {
      case 'MINIMAL':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
        };
      case 'FOCUS':
        return {
          ...baseStyle,
          boxShadow: '0 0 40px rgba(157, 78, 221, 0.15)',
        };
      case 'DENSE':
        return baseStyle;
      default:
        return baseStyle;
    }
  }, [currentLayout, enableMorphing]);

  // Morphing animation variants
  const morphVariants = {
    idle: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
    },
    morphing: {
      opacity: 0.9,
      scale: 0.99,
      filter: 'blur(2px)',
      transition: { duration: 0.15 },
    },
    complete: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    },
  };

  // Handle regeneration state
  useEffect(() => {
    if (isRegenerating) {
      setMorphState('morphing');
    } else if (morphState === 'morphing') {
      setMorphState('complete');
      setTimeout(() => setMorphState('idle'), 300);
    }
  }, [isRegenerating, morphState]);

  return (
    <LayoutGroup id={`adaptive-${regionId}`}>
      <motion.div
        className={cn(
          'adaptive-container relative',
          isEnabled && 'aui-enabled',
          className
        )}
        style={containerStyle}
        variants={morphVariants}
        animate={morphState}
        // IMPORTANT: Don't use layout prop on scroll containers - it blocks scroll
        layout={false}
        data-layout-version={layoutVersion}
        data-theme={currentLayout?.theme || 'DEFAULT'}
        data-region={regionId}
      >
        {/* Morphing Indicator */}
        <AnimatePresence>
          {isRegenerating && enableMorphing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-purple-500/5 animate-pulse" />
              <motion.div
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Debug Overlay */}
        {showDebugOverlay && isEnabled && (
          <div className="absolute top-2 right-2 z-40 bg-black/80 backdrop-blur-sm rounded-lg p-2 text-[10px] font-mono text-white/70 space-y-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                evaluationScore >= 70 ? 'bg-green-500' :
                evaluationScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              <span>Score: {evaluationScore}</span>
            </div>
            <div>Theme: {currentLayout?.theme || 'N/A'}</div>
            <div>Latency: {regenerationLatency.toFixed(0)}ms</div>
            <div>Iterations: {iterationCount}</div>
            {gazeSemantics?.primaryTarget && (
              <div className="text-cyan-400">
                Gaze: {gazeSemantics.primaryTarget.semanticLabel}
              </div>
            )}
            {lastEvaluation?.verdict && (
              <div className={cn(
                lastEvaluation.verdict === 'OPTIMAL' ? 'text-green-400' :
                lastEvaluation.verdict === 'ACCEPTABLE' ? 'text-yellow-400' :
                'text-red-400'
              )}>
                Verdict: {lastEvaluation.verdict}
              </div>
            )}
          </div>
        )}

        {/* Gaze Target Highlight */}
        {gazeSemantics?.primaryTarget && gazeSemantics.gazePattern === 'FIXATED' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute z-30 pointer-events-none"
            style={{
              left: gazeSemantics.primaryTarget.boundingBox.x,
              top: gazeSemantics.primaryTarget.boundingBox.y,
              width: gazeSemantics.primaryTarget.boundingBox.width,
              height: gazeSemantics.primaryTarget.boundingBox.height,
            }}
          >
            <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-lg">
              <div className="absolute -top-6 left-0 bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded">
                {gazeSemantics.primaryTarget.semanticLabel}
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content - No layout animation to preserve scroll */}
        <div className="adaptive-content">
          {children}
        </div>
      </motion.div>
    </LayoutGroup>
  );
};

/**
 * Adaptive Panel - Individual panel with visibility control
 */
interface AdaptivePanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  defaultVisible?: boolean;
}

export const AdaptivePanel: React.FC<AdaptivePanelProps> = ({
  id,
  children,
  className,
  defaultVisible = true,
}) => {
  const { shouldShowComponent, getComponentPriority } = useAdaptiveUI();

  const isVisible = shouldShowComponent(id);
  const priority = getComponentPriority(id);

  return (
    <AnimatePresence mode="wait">
      {(isVisible || defaultVisible) && (
        <motion.div
          key={id}
          layout
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
              delay: priority * 0.05,
            },
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: -10,
            transition: { duration: 0.2 },
          }}
          className={cn('adaptive-panel', className)}
          data-component-id={id}
          data-priority={priority}
          data-biometric-id={id}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Adaptive Region - Grid region controlled by layout
 */
interface AdaptiveRegionProps {
  regionId: string;
  children: React.ReactNode;
  className?: string;
}

export const AdaptiveRegion: React.FC<AdaptiveRegionProps> = ({
  regionId,
  children,
  className,
}) => {
  const { getLayoutForRegion, currentLayout } = useAdaptiveUI();
  const region = getLayoutForRegion(regionId);

  const regionStyle = useMemo((): React.CSSProperties => {
    if (!region) return {};

    return {
      gridArea: regionId,
      position: region.position ? 'absolute' : undefined,
      left: region.position?.x,
      top: region.position?.y,
      width: region.position?.width,
      height: region.position?.height,
    };
  }, [region, regionId]);

  return (
    <motion.div
      layout
      className={cn(
        'adaptive-region',
        region?.collapsed && 'collapsed',
        className
      )}
      style={regionStyle}
      data-region-id={regionId}
      data-collapsed={region?.collapsed}
    >
      {!region?.collapsed && children}
    </motion.div>
  );
};

export default AdaptiveContainer;
