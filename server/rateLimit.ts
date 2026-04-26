/**
 * Simple in-memory rate limiter for login attempts
 * Tracks failed login attempts per IP/username combination
 */

interface RateLimitEntry {
  attempts: number;
  resetTime: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    loginAttempts.set(key, {
      attempts: 1,
      resetTime: now + WINDOW_MS,
    });
    return true;
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    return false;
  }

  entry.attempts++;
  return true;
}

export function resetRateLimit(key: string): void {
  loginAttempts.delete(key);
}

export function getRemainingAttempts(key: string): number {
  const entry = loginAttempts.get(key);
  if (!entry || Date.now() > entry.resetTime) {
    return MAX_ATTEMPTS;
  }
  return Math.max(0, MAX_ATTEMPTS - entry.attempts);
}
