import { describe, it, expect, vi } from "vitest";
import {
  OpenAIImageAdapter,
  ReplicateAdapter,
  parsePrediction,
  providerPayload,
} from "@/server/providers/live";
import {
  isProviderDeliveryUrl,
  retrieveOutput,
} from "@/server/providers/media";
import {
  submissionSchema,
  configurationHref,
} from "@/lib/generation/contracts";
import { parseStudioRecipe } from "@/lib/discovery/creation-recipe";
import type { StudioConfiguration } from "@/lib/studio/validation";
const configuration: StudioConfiguration = {
  media: "image",
  execution: "live",
  modelId: "flux-pro",
  prompt: "A glass pavilion",
  preset: "Quiet Monument",
  ratio: "1:1",
  quality: "Standard",
  resolution: "1 MP",
  quantity: 1,
  duration: 0,
  referenceCount: 0,
};
const response = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
describe("live provider contracts (no network)", () => {
  it("maps Flux and Hailuo payloads without unsupported settings", () => {
    expect(providerPayload(configuration, [])).toEqual({
      input: {
        prompt: "A glass pavilion\nCreative direction: Quiet Monument.",
        aspect_ratio: "1:1",
        resolution: "1 MP",
        output_format: "png",
      },
    });
    expect(
      providerPayload(
        { ...configuration, modelId: "hailuo", media: "video", duration: 6 },
        ["signed-reference"],
      ),
    ).toEqual({
      input: {
        prompt: "A glass pavilion\nCreative direction: Quiet Monument.",
        prompt_optimizer: false,
        first_frame_image: "signed-reference",
      },
    });
  });
  it("submits, polls and cancels Replicate using fixed endpoints", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ id: "prediction_1", status: "starting" }),
      )
      .mockResolvedValueOnce(
        response({
          id: "prediction_1",
          status: "succeeded",
          output: "https://replicate.delivery/result.png",
        }),
      )
      .mockResolvedValueOnce(
        response({ id: "prediction_1", status: "canceled" }),
      );
    const adapter = new ReplicateAdapter("fixture-secret", transport);
    expect((await adapter.submit(configuration, [])).status).toBe("queued");
    expect((await adapter.poll("prediction_1")).outputs).toEqual([
      { url: "https://replicate.delivery/result.png" },
    ]);
    expect((await adapter.cancel("prediction_1")).status).toBe("cancelled");
    expect(transport.mock.calls[0]?.[0]).toBe(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions",
    );
    expect(transport.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer fixture-secret",
      "Cancel-After": "10m",
    });
    await expect(adapter.poll("../other-account")).rejects.toThrow(
      "provider_rejected",
    );
    expect(transport).toHaveBeenCalledTimes(3);
  });
  it("maps OpenAI sizes and decodes a PNG fixture", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        data: [
          {
            b64_json: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString(
              "base64",
            ),
          },
        ],
      }),
    );
    const c = {
      ...configuration,
      modelId: "gpt-image",
      preset: "None",
      ratio: "2:3",
      quality: "High",
      resolution: "1K",
    };
    const output = await new OpenAIImageAdapter(
      "fixture-secret",
      transport,
    ).submit(c);
    expect(providerPayload(c, [])).toMatchObject({
      model: "gpt-image-2",
      n: 1,
      size: "1024x1536",
      quality: "high",
      output_format: "png",
    });
    expect(
      await retrieveOutput(output[0]!, "fixture-secret", "image", transport),
    ).toMatchObject({ mime: "image/png", extension: "png" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("sanitizes rejection and ambiguous submission without retrying", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("secret raw provider error", { status: 401 }),
      )
      .mockRejectedValueOnce(new Error("raw timeout"));
    const adapter = new ReplicateAdapter("fixture-secret", transport);
    await expect(adapter.submit(configuration, [])).rejects.toThrow(
      "provider_rejected",
    );
    await expect(adapter.submit(configuration, [])).rejects.toThrow(
      "submission_unknown",
    );
    expect(transport).toHaveBeenCalledTimes(2);
    expect(() => parsePrediction({ id: "job", status: "unknown" })).toThrow(
      "provider_failed",
    );
    expect(() =>
      parsePrediction({ id: "job", status: "succeeded", output: null }),
    ).toThrow("output_unavailable");
  });
  it("rejects unapproved output hosts before any request", async () => {
    for (const url of [
      "http://replicate.delivery/a",
      "https://replicate.delivery.evil.test/a",
      "https://127.0.0.1/a",
      "https://user:pass@replicate.delivery/a",
      "https://replicate.delivery:8443/a",
    ])
      expect(isProviderDeliveryUrl(url)).toBe(false);
    expect(isProviderDeliveryUrl("https://pbxt.replicate.delivery/a")).toBe(
      true,
    );
    const transport = vi.fn<typeof fetch>();
    await expect(
      retrieveOutput(
        { url: "https://evil.test/a" },
        "fixture-secret",
        "image",
        transport,
      ),
    ).rejects.toThrow("output_unavailable");
    expect(transport).not.toHaveBeenCalled();
  });
  it("rejects MIME/signature mismatch and over-limit output", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("not PNG", { headers: { "Content-Type": "image/png" } }),
      )
      .mockResolvedValueOnce(
        new Response("", {
          headers: {
            "Content-Type": "image/png",
            "Content-Length": String(41 * 1024 * 1024),
          },
        }),
      );
    await expect(
      retrieveOutput(
        { url: "https://replicate.delivery/a" },
        "fixture-secret",
        "image",
        transport,
      ),
    ).rejects.toThrow("output_unavailable");
    await expect(
      retrieveOutput(
        { url: "https://replicate.delivery/a" },
        "fixture-secret",
        "image",
        transport,
      ),
    ).rejects.toThrow("output_unavailable");
  });
  it("requires cost consent, supported capabilities and matching references", () => {
    const input = {
      id: "cd890fcb-88d7-4a80-91ce-4fe5b3a5f1d7",
      configuration,
      referencePaths: [],
      confirmedCost: true,
    };
    expect(submissionSchema.safeParse(input).success).toBe(true);
    for (const override of [
      { confirmedCost: false },
      { configuration: { ...configuration, quantity: 4 } },
      { referencePaths: ["unexpected"] },
      { configuration: { ...configuration, resolution: "2K" } },
    ])
      expect(
        submissionSchema.safeParse({ ...input, ...override }).success,
      ).toBe(false);
  });
  it("reuses the full editable configuration without attaching private references", () => {
    const href = configurationHref({ ...configuration, quantity: 1 });
    const url = new URL(href, "https://example.test");
    const recipe = parseStudioRecipe(
      Object.fromEntries(url.searchParams),
    ).recipe;
    expect(recipe).toMatchObject({
      prompt: configuration.prompt,
      model: "Flux 2 Pro",
      resolution: "1 MP",
      quality: "Standard",
      quantity: 1,
    });
    expect(url.searchParams.has("referencePaths")).toBe(false);
  });
});
