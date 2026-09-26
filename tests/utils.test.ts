import { describe, expect, it } from "vitest";
import { isSafeNavigationUrl } from "@/lib/utils";

describe("isSafeNavigationUrl", () => {
  it("permits local and HTTP(S) destinations", () => {
    expect(isSafeNavigationUrl("/documents/agreement/INC-1042")).toBe(true);
    expect(isSafeNavigationUrl("https://example.com/evidence")).toBe(true);
  });

  it("rejects executable and protocol-relative URLs", () => {
    expect(isSafeNavigationUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeNavigationUrl("//attacker.example")).toBe(false);
    expect(isSafeNavigationUrl("not a URL")).toBe(false);
  });
});
