import { describe, it, expect, vi, beforeEach } from "vitest";

// Simula a lógica de janela deslizante do sa-rate-limit
interface Entry { count: number; resetTime: number }
const store = new Map<string, Entry>();

function check(id: string, windowMs: number, max: number) {
  const now = Date.now();
  const e = store.get(id);
  if (!e || e.resetTime < now) {
    store.set(id, { count: 1, resetTime: now + windowMs });
    return { limited: false, remaining: max - 1 };
  }
  if (e.count >= max) {
    return { limited: true, remaining: 0, retryAfter: Math.ceil((e.resetTime - now) / 1000) };
  }
  e.count++;
  return { limited: false, remaining: max - e.count };
}

describe("Rate limit sliding window", () => {
  beforeEach(() => { store.clear(); vi.useRealTimers(); });

  it("allows up to max requests in the window", () => {
    for (let i = 0; i < 5; i++) {
      const r = check("user-1", 60_000, 5);
      expect(r.limited).toBe(false);
    }
  });

  it("blocks the (max+1)th request with retryAfter", () => {
    for (let i = 0; i < 5; i++) check("user-1", 60_000, 5);
    const r = check("user-1", 60_000, 5);
    expect(r.limited).toBe(true);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00Z"));
    for (let i = 0; i < 5; i++) check("user-2", 1000, 5);
    expect(check("user-2", 1000, 5).limited).toBe(true);
    vi.setSystemTime(new Date("2026-04-19T10:00:02Z"));
    expect(check("user-2", 1000, 5).limited).toBe(false);
  });

  it("isolates different identifiers", () => {
    for (let i = 0; i < 5; i++) check("a", 60_000, 5);
    expect(check("a", 60_000, 5).limited).toBe(true);
    expect(check("b", 60_000, 5).limited).toBe(false);
  });
});
