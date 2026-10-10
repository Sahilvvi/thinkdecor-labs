import { describe, it, expect } from "vitest";
import { leadErrorMessage } from "@/lib/leadErrors";

describe("leadErrorMessage", () => {
  const fallback = "Something went wrong.";

  it("explains a rate limit and offers the email route", () => {
    const msg = leadErrorMessage({ message: "rate_limited" }, fallback);
    expect(msg).toMatch(/wait/i);
    expect(msg).toContain("info@thinkdecor.app");
  });
  it("explains a bad email and an over-long message", () => {
    expect(leadErrorMessage({ message: "invalid_email" }, fallback)).toMatch(/email address/i);
    expect(leadErrorMessage({ message: "too_long" }, fallback)).toMatch(/too long/i);
  });
  it("falls back for anything else, including null and strings", () => {
    expect(leadErrorMessage({ message: "network down" }, fallback)).toBe(fallback);
    expect(leadErrorMessage(null, fallback)).toBe(fallback);
    expect(leadErrorMessage(undefined, fallback)).toBe(fallback);
    expect(leadErrorMessage("boom", fallback)).toBe(fallback);
  });
});
