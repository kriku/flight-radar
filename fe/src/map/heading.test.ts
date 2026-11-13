import { describe, expect, it } from "vitest";
import type { PlaneBasic } from "../types";
import { bearing, createHeadingTracker } from "./heading";

function plane(id: string, latitude: number, longitude: number): PlaneBasic {
  return { id, latitude, longitude, altitude: 10_000, color: "#ff0000" };
}

describe("bearing", () => {
  it("returns the compass direction of the movement", () => {
    expect(bearing(0, 0, 1, 0)).toBeCloseTo(0);
    expect(bearing(0, 0, 0, 1)).toBeCloseTo(90);
    expect(bearing(1, 0, 0, 0)).toBeCloseTo(180);
    expect(bearing(0, 1, 0, 0)).toBeCloseTo(270);
  });
});

describe("createHeadingTracker", () => {
  it("returns 0 for a new plane", () => {
    const tracker = createHeadingTracker();

    expect(tracker.update([plane("a", 45, -75)]).get("a")).toBe(0);
  });

  it("calculates the heading from the previous position", () => {
    const tracker = createHeadingTracker();
    tracker.update([plane("a", 0, 0)]);

    expect(tracker.update([plane("a", 0, 1)]).get("a")).toBeCloseTo(90);
  });

  it("keeps the last heading if the plane does not move", () => {
    const tracker = createHeadingTracker();
    tracker.update([plane("a", 0, 0)]);
    tracker.update([plane("a", 0, 1)]);

    expect(tracker.update([plane("a", 0, 1)]).get("a")).toBeCloseTo(90);
  });

  it("forgets planes that are not in the latest list", () => {
    const tracker = createHeadingTracker();
    tracker.update([plane("a", 0, 0)]);
    tracker.update([plane("a", 0, 1)]);
    tracker.update([]);

    expect(tracker.update([plane("a", 0, 2)]).get("a")).toBe(0);
  });
});
