import { describe, expect, it, vi } from "vitest";
import { OpenRouterAdapter } from "./live";
import { retrieveOutput } from "./media";
import type { StudioConfiguration } from "@/lib/studio/validation";

function recipe(
  overrides: Partial<StudioConfiguration> = {},
): StudioConfiguration {
  return {
    media: "image",
    execution: "live",
    modelId: "openai/gpt-image-1-mini",
    prompt: "A quiet product portrait",
    preset: "None",
    ratio: "1:1",
    quality: "Standard",
    resolution: "Provider default",
    quantity: 1,
    duration: 0,
    referenceCount: 0,
    ...overrides,
  };
}

const png = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 1, 0, 0,
  0, 1, 0,
]);

describe("OpenRouter transport", () => {
  it("submits one bounded image and returns sanitized accounting", async () => {
    const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        model: "openai/gpt-image-1-mini",
        n: 1,
        aspect_ratio: "1:1",
      });
      return Response.json({
        data: [{ b64_json: png.toString("base64"), media_type: "image/png" }],
        usage: { cost: 0.0123, ignored: "raw provider detail" },
      });
    }) as unknown as typeof fetch;
    const result = await new OpenRouterAdapter("secret", fetcher).submitImage(
      recipe(),
      [],
    );
    expect(result.status).toBe("complete");
    expect(result.outputs?.[0]).toMatchObject({ mime: "image/png" });
    expect(result.usage).toEqual({ cost: 0.0123 });
  });

  it("uses only model-supported fields for alternative system image models", async () => {
    const requests: Record<string, unknown>[] = [];
    const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json({
        data: [{ b64_json: png.toString("base64"), media_type: "image/png" }],
      });
    }) as unknown as typeof fetch;
    const adapter = new OpenRouterAdapter("secret", fetcher);
    await adapter.submitImage(
      recipe({
        modelId: "recraft/recraft-v4.1-flash",
        ratio: "16:9",
      }),
      [],
    );
    await adapter.submitImage(
      recipe({
        modelId: "google/gemini-3.1-flash-lite-image",
        ratio: "4:3",
        resolution: "1K",
        referenceCount: 1,
      }),
      ["https://storage.example.test/reference.png"],
    );
    expect(requests[0]).toEqual({
      model: "recraft/recraft-v4.1-flash",
      prompt: "A quiet product portrait",
      n: 1,
      aspect_ratio: "16:9",
    });
    expect(requests[1]).toMatchObject({
      model: "google/gemini-3.1-flash-lite-image",
      n: 1,
      aspect_ratio: "4:3",
      resolution: "1K",
      input_references: [
        {
          type: "image_url",
          image_url: {
            url: "https://storage.example.test/reference.png",
          },
        },
      ],
    });
    expect(requests[1]).not.toHaveProperty("quality");
    expect(requests[1]).not.toHaveProperty("output_format");
  });

  it("persists the accepted video identity and maps poll completion", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: "video_job_123" }))
      .mockResolvedValueOnce(
        Response.json({
          id: "video_job_123",
          status: "completed",
          usage: { cost: 0.04 },
        }),
      ) as unknown as typeof fetch;
    const adapter = new OpenRouterAdapter("secret", fetcher);
    const submitted = await adapter.submitVideo(
      recipe({
        media: "video",
        modelId: "bytedance/seedance-2.0-mini",
        ratio: "16:9",
        resolution: "480p",
        duration: 4,
      }),
      [],
    );
    expect(submitted).toMatchObject({
      status: "queued",
      externalId: "video_job_123",
    });
    const completed = await adapter.pollVideo("video_job_123");
    expect(completed).toMatchObject({
      status: "complete",
      externalId: "video_job_123",
      usage: { cost: 0.04 },
    });
    expect(completed.outputs?.[0]).toEqual({
      source: "openrouter",
      url: "https://openrouter.ai/api/v1/videos/video_job_123/content?index=0",
    });
  });

  it("classifies definite rejection separately from ambiguous transport", async () => {
    const rejected = vi.fn(
      async () => new Response("no", { status: 400 }),
    ) as unknown as typeof fetch;
    await expect(
      new OpenRouterAdapter("secret", rejected).submitImage(recipe(), []),
    ).rejects.toMatchObject({
      code: "provider_rejected",
    });

    const interrupted = vi.fn(async () => {
      throw new Error("network detail must not escape");
    }) as unknown as typeof fetch;
    await expect(
      new OpenRouterAdapter("secret", interrupted).submitImage(recipe(), []),
    ).rejects.toMatchObject({
      code: "submission_unknown",
    });
  });

  it("maps safe HTTP failure categories without exposing provider bodies", async () => {
    for (const [status, code] of [
      [401, "credential_rejected"],
      [402, "payment_required"],
      [404, "model_unavailable"],
      [429, "rate_limited"],
    ] as const) {
      const fetcher = vi.fn(
        async () => new Response("raw sensitive provider response", { status }),
      ) as unknown as typeof fetch;
      await expect(
        new OpenRouterAdapter("secret", fetcher).submitImage(recipe(), []),
      ).rejects.toMatchObject({ code, message: code });
    }
  });
});

describe("OpenRouter media ingestion", () => {
  it("accepts authenticated MP4 content from the exact content endpoint", async () => {
    const mp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 1, 2, 3]);
    const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer secret",
      );
      return new Response(mp4, {
        headers: { "content-type": "video/mp4" },
      });
    }) as unknown as typeof fetch;
    const output = await retrieveOutput(
      {
        source: "openrouter",
        url: "https://openrouter.ai/api/v1/videos/video_job_123/content?index=0",
      },
      "secret",
      "video",
      fetcher,
    );
    expect(output.extension).toBe("mp4");
  });

  it("rejects untrusted output locations", async () => {
    await expect(
      retrieveOutput(
        { source: "openrouter", url: "https://example.com/private.mp4" },
        "secret",
        "video",
      ),
    ).rejects.toMatchObject({
      code: "output_unavailable",
    });
  });
});
