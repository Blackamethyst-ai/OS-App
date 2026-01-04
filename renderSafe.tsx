import React, { ReactNode } from 'react';

/**
 * Senior Architect Utility: renderSafe
 * Specifically prevents React Error #31 by ensuring objects are never 
 * directly rendered as children. It intelligently flattens technical
 * manifests into readable strings.
 */
export const renderSafe = (value: any): ReactNode => {
  if (value === null || value === undefined) return '';
  
  // Handle Primitives
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  
  // Handle Objects (The source of Error #31)
  if (typeof value === 'object') {
    try {
      // Logic for flattening the specific object structure causing the kernel panic
      if (value.operational_core || value.technological_stack || value.strategic_vectors) {
        const parts = [];
        if (value.operational_core) parts.push(`[CORE: ${value.operational_core}]`);
        if (value.technological_stack) parts.push(`[STACK: ${value.technological_stack}]`);
        if (value.strategic_vectors) parts.push(`[VECTORS: ${value.strategic_vectors}]`);
        if (value.fidelity_assessment) parts.push(`[FIDELITY: ${value.fidelity_assessment}]`);
        
        return parts.length > 0 ? parts.join(' ') : JSON.stringify(value);
      }

      // Default to formatted JSON string if it's a random object
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return '[Object Data]';
    }
  }
  
  return String(value);
};