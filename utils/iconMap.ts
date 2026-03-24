/**
 * Constrained icon map for dynamic icon lookups.
 *
 * `import * as Icons from 'lucide-react'` defeats tree-shaking and pulls
 * in ALL ~1,550 icons (~595 KB). This map includes only the icons that
 * are referenced dynamically (via iconName strings from the store, LLM
 * responses, or knowledge layers) so the bundler can tree-shake the rest.
 *
 * When a new icon name needs to be supported dynamically, add it here.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  Binary,
  Box,
  Brain,
  BrainCircuit,
  CheckCircle,
  Clapperboard,
  Clock,
  Cloud,
  Coins,
  Compass,
  Cpu,
  Database,
  DraftingCompass,
  Files,
  FolderTree,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Grid3X3,
  Hammer,
  HardDrive,
  Layers,
  Layout,
  ListChecks,
  Loader2,
  Map,
  MonitorPlay,
  Network,
  Search,
  Server,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Telescope,
  Users,
  Video,
  Wand2,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  AlertTriangle,
  Binary,
  Box,
  Brain,
  BrainCircuit,
  CheckCircle,
  Clapperboard,
  Clock,
  Cloud,
  Coins,
  Compass,
  Cpu,
  Database,
  DraftingCompass,
  Files,
  FolderTree,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Grid3X3,
  Hammer,
  HardDrive,
  Layers,
  Layout,
  ListChecks,
  Loader2,
  Map,
  MonitorPlay,
  Network,
  Search,
  Server,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Telescope,
  Users,
  Video,
  Wand2,
  Workflow,
  Wrench,
  Zap,
};

/**
 * Look up an icon by name string, with a fallback.
 * Handles kebab-case names (e.g. 'brain-circuit') by converting to PascalCase.
 */
export function getIcon(name: string, fallback: LucideIcon = Box): LucideIcon {
  // Direct match
  if (ICON_MAP[name]) return ICON_MAP[name];

  // Try PascalCase conversion for kebab-case names (e.g. 'brain-circuit' -> 'BrainCircuit')
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  if (ICON_MAP[pascalName]) return ICON_MAP[pascalName];

  return fallback;
}
