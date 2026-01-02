import React, { ReactNode } from 'react';

/**
 * Ensures a value is safe to render as a React child.
 * Specifically prevents "Objects are not valid as a React child" (Error #31).
 */
export const renderSafe = (value: any): ReactNode => {
  if (value === null || value === undefined) return '';
  
  // Primitive types are safe
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // If it's an object, we must stringify it to avoid crashing React
  try {
    // If it looks like a structured analysis result, pretty print it
    return (
      <span className="whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </span>
    );
  } catch (e) {
    return '[Complex Object]';
  }
};