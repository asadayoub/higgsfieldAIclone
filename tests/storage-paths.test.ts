import { describe, expect, it } from "vitest";
import { isOwnedPrivatePath, privateObjectPath } from "@/lib/storage/paths";

const owner = "123e4567-e89b-42d3-a456-426614174000";
const otherOwner = "223e4567-e89b-42d3-a456-426614174000";
const object = "323e4567-e89b-42d3-a456-426614174000";

describe("private media paths", () => {
  it("constructs an owner-scoped path with a safe extension", () => {
    expect(privateObjectPath(owner, object, "reference.PNG")).toBe(
      `users/${owner}/${object}.png`,
    );
    expect(privateObjectPath(owner, object, "archive.dangerously-long")).toBe(
      `users/${owner}/${object}.bin`,
    );
  });

  it("allows only the exact owner path", () => {
    const path = privateObjectPath(owner, object, "result.mp4");
    expect(isOwnedPrivatePath(owner, path)).toBe(true);
    expect(isOwnedPrivatePath(otherOwner, path)).toBe(false);
  });

  it("rejects traversal, nested, and backslash paths", () => {
    expect(isOwnedPrivatePath(owner, `users/${owner}/../secret.png`)).toBe(
      false,
    );
    expect(isOwnedPrivatePath(owner, `users/${owner}/nested/file.png`)).toBe(
      false,
    );
    expect(isOwnedPrivatePath(owner, `users\\${owner}\\file.png`)).toBe(false);
  });
});
