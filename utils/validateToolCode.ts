/**
 * TOOL CODE VALIDATOR
 * Security validation for dynamic tool code before execution.
 * Prevents injection of malicious patterns.
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// Maximum allowed code length
const MAX_CODE_LENGTH = 5000;

// Forbidden patterns that indicate potential security risks
const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
    // Code evaluation
    { pattern: /\beval\s*\(/gi, reason: 'eval() is forbidden - arbitrary code execution' },
    { pattern: /\bFunction\s*\(/gi, reason: 'Function() constructor is forbidden' },

    // Dynamic imports
    { pattern: /\bimport\s*\(/gi, reason: 'Dynamic import() is forbidden' },
    { pattern: /\brequire\s*\(/gi, reason: 'require() is forbidden' },

    // Global object access
    { pattern: /\bwindow\b/gi, reason: 'Direct window access is forbidden - use os context' },
    { pattern: /\bdocument\b/gi, reason: 'Direct document access is forbidden' },
    { pattern: /\bglobalThis\b/gi, reason: 'globalThis access is forbidden' },

    // Storage access (should go through os.vault)
    { pattern: /\blocalStorage\b/gi, reason: 'localStorage access is forbidden - use os.vault' },
    { pattern: /\bsessionStorage\b/gi, reason: 'sessionStorage access is forbidden' },
    { pattern: /\bindexedDB\b/gi, reason: 'Direct indexedDB access is forbidden - use os.vault' },

    // Network calls (potential data exfiltration)
    { pattern: /\bfetch\s*\(/gi, reason: 'fetch() is forbidden - network access not allowed' },
    { pattern: /\bXMLHttpRequest\b/gi, reason: 'XMLHttpRequest is forbidden' },
    { pattern: /\bWebSocket\b/gi, reason: 'WebSocket is forbidden' },

    // Process/execution
    { pattern: /\bsetTimeout\b/gi, reason: 'setTimeout is forbidden - use synchronous logic' },
    { pattern: /\bsetInterval\b/gi, reason: 'setInterval is forbidden' },

    // Prototype pollution
    { pattern: /__proto__/gi, reason: '__proto__ access is forbidden' },
    { pattern: /\bprototype\s*\[/gi, reason: 'prototype[] access is forbidden' },
    { pattern: /\.constructor\s*\[/gi, reason: 'constructor[] access is forbidden' },
];

// Allowed patterns (for reference - these are safe)
const ALLOWED_CONTEXT_PROPERTIES = [
    'os.log',
    'os.mode',
    'os.setMode',
    'os.vault',
    'os.kernel',
    'os.propose',
    'os.identity',
    'args',
    'return',
    'console.log',
    'console.warn',
    'JSON.stringify',
    'JSON.parse',
    'Math',
    'Date',
    'Array',
    'Object',
    'String',
    'Number',
    'Boolean',
];

/**
 * Validates tool code for security issues.
 * @param code - The code string to validate
 * @returns ValidationResult with validity and any errors
 */
export function validateToolCode(code: string): ValidationResult {
    const errors: string[] = [];

    // Check 1: Code length
    if (!code || code.trim().length === 0) {
        return { valid: false, errors: ['Code cannot be empty'] };
    }

    if (code.length > MAX_CODE_LENGTH) {
        errors.push(`Code exceeds maximum length of ${MAX_CODE_LENGTH} characters (got ${code.length})`);
    }

    // Check 2: Forbidden patterns
    for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
        if (pattern.test(code)) {
            errors.push(reason);
            // Reset regex lastIndex for global patterns
            pattern.lastIndex = 0;
        }
    }

    // Check 3: Balanced braces (basic syntax check)
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
        errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitizes code by removing comments (which could hide malicious code).
 */
export function sanitizeToolCode(code: string): string {
    // Remove single-line comments
    let sanitized = code.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
    return sanitized.trim();
}

/**
 * Full validation pipeline: sanitize then validate.
 */
export function validateAndSanitize(code: string): {
    valid: boolean;
    errors: string[];
    sanitizedCode: string;
} {
    const sanitizedCode = sanitizeToolCode(code);
    const result = validateToolCode(sanitizedCode);
    return {
        ...result,
        sanitizedCode
    };
}
