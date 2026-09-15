import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

function luminance(hex: string) {
  const channels = hex.match(/\w\w/g)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

it("keeps action colors above AAA contrast and link resets below utilities", () => {
  const css = readFileSync(
    new URL("../src/app/globals.css", import.meta.url),
    "utf8",
  );
  const ink = css.match(/--action-ink:\s*#([a-f0-9]{6})/i)![1]!;
  for (const token of ["action", "action-hover"]) {
    const background = css.match(
      new RegExp(`--${token}:\\s*#([a-f0-9]{6})`, "i"),
    )![1]!;
    expect(
      (luminance(background) + 0.05) / (luminance(ink) + 0.05),
    ).toBeGreaterThan(7);
  }
  expect(css).toMatch(/@layer base\s*\{\s*a\s*\{\s*color: inherit/);
});
