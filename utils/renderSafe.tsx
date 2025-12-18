import { ReactNode } from 'react';

export const renderSafe = (value: unknown): ReactNode => {
  return typeof value === 'string' || typeof value === 'number' ? value : String(value);
};