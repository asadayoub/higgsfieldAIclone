import { describe, expect, it, vi } from "vitest";
import {
  decryptCredential,
  encryptCredential,
} from "@/lib/security/credentials";
import { redact, safeLog } from "@/lib/security/redact";

const key = "ab".repeat(32);

describe("provider credential protection", () => {
  it("encrypts and decrypts without retaining plaintext", () => {
    const encrypted = encryptCredential("sk-test-123456789", key);
    expect(encrypted.ciphertext).not.toContain("sk-test");
    expect(encrypted.lastFour).toBe("6789");
    expect(decryptCredential(encrypted, key)).toBe("sk-test-123456789");
  });

  it("rejects tampered ciphertext and the wrong encryption key", () => {
    const encrypted = encryptCredential("sk-test-123456789", key);
    expect(() =>
      decryptCredential(
        { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` },
        key,
      ),
    ).toThrow();
    expect(() => decryptCredential(encrypted, "cd".repeat(32))).toThrow();
  });

  it("redacts nested sensitive fields before logging", () => {
    expect(
      redact({
        provider: "openai",
        apiKey: "secret",
        nested: { authorization: "Bearer secret" },
      }),
    ).toEqual({
      provider: "openai",
      apiKey: "[REDACTED]",
      nested: { authorization: "[REDACTED]" },
    });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    safeLog("provider.connected", { token: "secret" });
    expect(info.mock.calls[0]?.[0]).not.toContain("secret");
    info.mockRestore();
  });
});
