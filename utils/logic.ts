
/**
 * Senior Architect Pattern: Result Type
 * Standardizes error handling across the OS.
 */
export type Result<T, E = Error> = 
  | { ok: true; value: T } 
  | { ok: false; error: E };

export const success = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const failure = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Optimized Map Generator
 * Converts array of entities to a Hash Map for O(1) retrieval.
 */
export function createFastLookup<T extends { id: string }>(items: T[]): Map<string, T> {
    return new Map(items.map(item => [item.id, item }));
}

/**
 * Performance-Aware Debounce
 */
export function debounce<F extends (...args: any[]) => any>(func: F, wait: number): (...args: Parameters<F>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
