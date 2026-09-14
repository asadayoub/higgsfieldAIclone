import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/server/auth/return-path";
import {
  accountEmailSchema,
  accountPasswordSchema,
  passwordUpdateSchema,
} from "@/server/auth/credentials";

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

describe("account credential validation", () => {
  it("normalizes valid email addresses", () => {
    expect(accountEmailSchema.parse("  Creator@Example.COM ")).toBe(
      "creator@example.com",
    );
  });

  it("requires a strong bounded password", () => {
    expect(accountPasswordSchema.safeParse("short").success).toBe(false);
    expect(accountPasswordSchema.safeParse("lowercase-only-123").success).toBe(
      false,
    );
    expect(accountPasswordSchema.safeParse("StrongPass123").success).toBe(true);
    expect(
      accountPasswordSchema.safeParse(`Strong1${"x".repeat(72)}`).success,
    ).toBe(false);
  });

  it("rejects a mismatched password confirmation", () => {
    expect(
      passwordUpdateSchema.safeParse({
        password: "StrongPass123",
        confirmPassword: "StrongPass124",
      }).success,
    ).toBe(false);
  });
});
