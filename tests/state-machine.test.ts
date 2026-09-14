import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
} from "@/lib/generation/state-machine";

describe("generation state machine", () => {
  it("allows the normal asynchronous path", () => {
    expect(canTransition("draft", "awaiting_confirmation")).toBe(true);
    expect(canTransition("queued", "processing")).toBe(true);
    expect(canTransition("processing", "complete")).toBe(true);
  });

  it("rejects impossible transitions", () => {
    expect(() => assertTransition("complete", "processing")).toThrow(
      /Invalid generation transition/,
    );
    expect(canTransition("cancelled", "queued")).toBe(false);
  });
});
