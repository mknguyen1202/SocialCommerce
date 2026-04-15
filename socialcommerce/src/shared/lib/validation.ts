/**
 * Lightweight form validation utilities.
 * Each validator returns an error string or null.
 */

export function required(value: string, label = 'This field'): string | null {
  return value.trim() ? null : `${label} is required`;
}

export function minLength(value: string, min: number, label = 'This field'): string | null {
  return value.length >= min ? null : `${label} must be at least ${min} characters`;
}

export function maxLength(value: string, max: number, label = 'This field'): string | null {
  return value.length <= max ? null : `${label} must be at most ${max} characters`;
}

export function isEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Enter a valid email address';
}

export function isUrl(value: string): string | null {
  try {
    new URL(value);
    return null;
  } catch {
    return 'Enter a valid URL';
  }
}

export function isPositiveNumber(value: number, label = 'Value'): string | null {
  return value > 0 ? null : `${label} must be greater than zero`;
}

export function isNonNegative(value: number, label = 'Value'): string | null {
  return value >= 0 ? null : `${label} cannot be negative`;
}

/** Returns the first non-null error from a list of validators. */
export function firstError(...results: (string | null)[]): string | null {
  return results.find((r) => r !== null) ?? null;
}
