import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { validateHuggingFaceToken } from "./system-credentials";

describe("Hugging Face system credential validation", () => {
  it("validates through whoami without putting the token in the URL", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ name: "project-owner" }),
    );
    const token = `hf_${"a".repeat(24)}`;
    const result = await validateHuggingFaceToken(token, fetcher);
    expect(result).toMatchObject({ valid: true });
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://huggingface.co/api/whoami-v2",
    );
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain(token);
  });

  it("distinguishes rejected tokens from provider unavailability", async () => {
    const token = `hf_${"b".repeat(24)}`;
    await expect(
      validateHuggingFaceToken(
        token,
        vi.fn(async () => new Response(null, { status: 401 })),
      ),
    ).resolves.toEqual({ valid: false, error: "invalid" });
    await expect(
      validateHuggingFaceToken(
        token,
        vi.fn(async () => new Response(null, { status: 503 })),
      ),
    ).resolves.toEqual({ valid: false, error: "unreachable" });
  });
});
