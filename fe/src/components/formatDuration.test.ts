import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [5, "5 min"],
    [60, "1 h 00 min"],
    [125, "2 h 05 min"],
    [-3, "0 min"],
  ])("formats %d minutes as %s", (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });
});
