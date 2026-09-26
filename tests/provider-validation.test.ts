import { describe, expect, it, vi } from "vitest";
import { validateProviderCredential } from "@/server/providers/validation";

describe("provider credential validation", () => {
  it("uses OpenRouter key validation without exposing the key in the URL", async () => {
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
      "openrouter",
      "sk-test-secret",
      fetcher,
    );
    expect(result).toMatchObject({ valid: true, fundingStatus: "unknown" });
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://openrouter.ai/api/v1/key");
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain("sk-test-secret");
  });

  it("returns a sanitized OpenRouter account label", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        data: { label: "creative-team", token: "never-return-this" },
      }),
    );
    await expect(
      validateProviderCredential("openrouter", "sk-or-test-secret", fetcher),
    ).resolves.toEqual({
      valid: true,
      accountLabel: "creative-team",
      fundingStatus: "unknown",
    });
  });

  it("distinguishes rejected credentials from provider outages", async () => {
    const rejected = vi.fn(async () => new Response(null, { status: 401 }));
    const unavailable = vi.fn(async () => new Response(null, { status: 503 }));
    await expect(
      validateProviderCredential("openrouter", "bad-secret", rejected),
    ).resolves.toEqual({ valid: false, error: "invalid_credential" });
    await expect(
      validateProviderCredential("openrouter", "some-secret", unavailable),
    ).resolves.toEqual({ valid: false, error: "provider_unavailable" });
  });
});
