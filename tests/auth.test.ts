import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/server/auth/return-path";

describe("authentication return paths", () => {
  it("keeps internal paths and their query string", () => {
    expect(safeReturnPath("/studio?mode=video", "/")).toBe(
      "/studio?mode=video",
    );
  });

  it("rejects protocol-relative, absolute, and backslash paths", () => {
    expect(safeReturnPath("//attacker.example", "/safe")).toBe("/safe");
    expect(safeReturnPath("https://attacker.example", "/safe")).toBe("/safe");
    expect(safeReturnPath("/\\attacker.example", "/safe")).toBe("/safe");
  });

  it("uses the fallback for missing input", () => {
    expect(safeReturnPath(null, "/account")).toBe("/account");
  });
});
