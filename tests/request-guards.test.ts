import { describe, expect, it } from "vitest";
import {
  beginInvestigation,
  consumeRateLimit,
  finishInvestigation,
  isSameOriginRequest,
  parseIncidentId,
} from "@/lib/security/request-guards";

describe("request guards", () => {
  it("accepts bounded incident ids and rejects path-like input", () => {
    expect(parseIncidentId("INC-1042").success).toBe(true);
    expect(parseIncidentId("../INC-1042").success).toBe(false);
    expect(parseIncidentId("x".repeat(65)).success).toBe(false);
  });

  it("limits a caller inside the configured window", () => {
    const options = { limit: 2, windowMs: 60_000 };
    expect(consumeRateLimit("test-rate-limit", options, 1_000).allowed).toBe(true);
    expect(consumeRateLimit("test-rate-limit", options, 1_001).allowed).toBe(true);
    const blocked = consumeRateLimit("test-rate-limit", options, 1_002);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(consumeRateLimit("test-rate-limit", options, 61_001).allowed).toBe(true);
  });

  it("accepts same-origin requests and rejects cross-origin browser posts", () => {
    expect(isSameOriginRequest(new Request("https://warp.example/api", {
      headers: { origin: "https://warp.example", host: "warp.example" },
    }))).toBe(true);
    expect(isSameOriginRequest(new Request("https://warp.example/api", {
      headers: { origin: "https://attacker.example", host: "warp.example" },
    }))).toBe(false);
  });

  it("allows only one active investigation for an incident", () => {
    expect(beginInvestigation("test-incident")).toBe(true);
    expect(beginInvestigation("test-incident")).toBe(false);
    finishInvestigation("test-incident");
    expect(beginInvestigation("test-incident")).toBe(true);
    finishInvestigation("test-incident");
  });
});
