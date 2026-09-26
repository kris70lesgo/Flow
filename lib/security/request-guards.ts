import { z } from "zod";

const incidentIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Incident id contains unsupported characters");

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitState = globalThis as typeof globalThis & {
  __warpRateLimits?: Map<string, RateLimitBucket>;
  __warpInvestigations?: Set<string>;
};

function rateLimits(): Map<string, RateLimitBucket> {
  return (rateLimitState.__warpRateLimits ??= new Map());
}

function activeInvestigations(): Set<string> {
  return (rateLimitState.__warpInvestigations ??= new Set());
}

export function parseIncidentId(value: string) {
  return incidentIdSchema.safeParse(value);
}

/**
 * A small, process-local guard for the public demo. The durable production
 * solution is identity-aware rate limiting at the deployment edge; this still
 * prevents accidental double-clicks and cheap single-instance abuse today.
 */
export function consumeRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const buckets = rateLimits();
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return `investigate:${address.slice(0, 128)}`;
}

/** Reject browser requests initiated from a different origin while allowing CLI checks without Origin. */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");

  try {
    const parsed = new URL(origin);
    return parsed.host === host && parsed.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

export function beginInvestigation(id: string): boolean {
  const active = activeInvestigations();
  if (active.has(id)) return false;
  active.add(id);
  return true;
}

export function finishInvestigation(id: string): void {
  activeInvestigations().delete(id);
}
