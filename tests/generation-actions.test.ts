import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  submit: vi.fn(),
  read: vi.fn(),
  poll: vi.fn(),
  cancel: vi.fn(),
  favorite: vi.fn(),
  publish: vi.fn(),
  revoke: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/session", () => ({ getSessionUser: mocks.session }));
vi.mock("@/server/generation/service", () => ({
  submitRun: mocks.submit,
  getRun: mocks.read,
  refreshRun: mocks.poll,
  cancelRun: mocks.cancel,
  favoriteAsset: mocks.favorite,
  publishAsset: mocks.publish,
  revokePublication: mocks.revoke,
}));
import {
  submitGeneration,
  shareAsset,
  setAssetFavorite,
} from "@/app/results/actions";
import { POST } from "@/app/api/generations/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "actual-session-owner" } });
});
describe("generation action boundaries", () => {
  it("rejects anonymous submissions before reaching persistence or providers", async () => {
    mocks.session.mockResolvedValue(null);
    expect(await submitGeneration({})).toEqual({
      error: "Sign in to access private generations.",
    });
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("derives ownership from the session rather than the supplied object", async () => {
    const input = { ownerId: "forged-owner" };
    mocks.submit.mockResolvedValue({ id: "run-id" });
    await submitGeneration(input);
    expect(mocks.submit).toHaveBeenCalledWith("actual-session-owner", input);
  });
  it("does not return arbitrary service errors", async () => {
    mocks.submit.mockRejectedValue(
      new Error("sensitive fixture-key and provider response"),
    );
    const response = await submitGeneration({});
    expect(JSON.stringify(response)).not.toContain("fixture-key");
  });
  it("requires explicit publication consent and validates mutation values", async () => {
    await shareAsset("asset-id", false);
    expect(mocks.publish).not.toHaveBeenCalled();
    await setAssetFavorite("asset-id", "true" as unknown as boolean);
    expect(mocks.favorite).not.toHaveBeenCalled();
    mocks.publish.mockResolvedValue("public-slug");
    expect(await shareAsset("asset-id", true)).toEqual({ slug: "public-slug" });
    expect(mocks.publish).toHaveBeenCalledWith(
      "actual-session-owner",
      "asset-id",
    );
  });
  it("rejects foreign origins and oversized bodies before a generation action", async () => {
    const request = (origin: string, body: string) =>
      new Request("https://lumaforge.test/api/generations", {
        method: "POST",
        headers: { origin },
        body,
      });
    expect((await POST(request("https://foreign.test", "{}"))).status).toBe(
      403,
    );
    expect(
      (await POST(request("https://lumaforge.test", "x".repeat(12001)))).status,
    ).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
