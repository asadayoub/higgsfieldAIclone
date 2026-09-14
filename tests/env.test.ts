import { describe, expect, it } from "vitest";
import { hasSupabaseConfig, readServerEnv } from "@/config/env";

describe("environment contract", () => {
  it("boots guided mode with no cloud configuration", () => {
    const env = readServerEnv({});
    expect(hasSupabaseConfig(env)).toBe(false);
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("rejects malformed encryption secrets", () => {
    expect(() =>
      readServerEnv({ PROVIDER_KEY_ENCRYPTION_SECRET: "too-short" }),
    ).toThrow();
  });
});
