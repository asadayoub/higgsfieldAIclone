import { describe, expect, it, vi } from "vitest";
import { validateProviderCredential } from "@/server/providers/validation";

describe("provider credential validation", () => {
  it("uses the OpenAI model endpoint without exposing the key in the URL", async () => {
    const fetcher = vi.fn(
      async (
        _input: Parameters<typeof fetch>[0],
        _init?: Parameters<typeof fetch>[1],
      ) => {
        void _input;
        void _init;
        return Response.json({ data: [] });
      },
    );
    const result = await validateProviderCredential(
      "openai",
      "sk-test-secret",
      fetcher,
    );
    expect(result.valid).toBe(true);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/models");
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain("sk-test-secret");
  });

  it("returns a sanitized Replicate account label", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ username: "creative-team", token: "never-return-this" }),
    );
    await expect(
      validateProviderCredential("replicate", "r8_test-secret", fetcher),
    ).resolves.toEqual({ valid: true, accountLabel: "creative-team" });
  });

  it("distinguishes rejected credentials from provider outages", async () => {
    const rejected = vi.fn(async () => new Response(null, { status: 401 }));
    const unavailable = vi.fn(async () => new Response(null, { status: 503 }));
    await expect(
      validateProviderCredential("openai", "bad-secret", rejected),
    ).resolves.toEqual({ valid: false, error: "invalid_credential" });
    await expect(
      validateProviderCredential("openai", "some-secret", unavailable),
    ).resolves.toEqual({ valid: false, error: "provider_unavailable" });
  });
});
