import type { PlaneBasic } from "../types";

type Track = { latitude: number; longitude: number; heading: number };

export type HeadingTracker = {
  /** Returns the heading in degrees (0 = north, clockwise) for each plane id. */
  update: (planes: PlaneBasic[]) => Map<string, number>;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Returns the initial great-circle bearing from point A to point B, in degrees. */
export function bearing(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const phi1 = toRadians(fromLat);
  const phi2 = toRadians(toLat);
  const deltaLambda = toRadians(toLng - fromLng);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Keeps the last position of each plane and calculates the heading from the movement.
 * The basic feed does not send a heading. If a plane does not move, it keeps its last heading.
 * The tracker forgets planes that are not in the latest list.
 */
export function createHeadingTracker(): HeadingTracker {
  let tracks = new Map<string, Track>();

  return {
    update(planes) {
      const next = new Map<string, Track>();
      const headings = new Map<string, number>();

      for (const plane of planes) {
        const previous = tracks.get(plane.id);
        let heading = previous?.heading ?? 0;
        if (
          previous !== undefined &&
          (previous.latitude !== plane.latitude || previous.longitude !== plane.longitude)
        ) {
          heading = bearing(previous.latitude, previous.longitude, plane.latitude, plane.longitude);
        }
        next.set(plane.id, { latitude: plane.latitude, longitude: plane.longitude, heading });
        headings.set(plane.id, heading);
      }

      tracks = next;
      return headings;
    },
  };
}
