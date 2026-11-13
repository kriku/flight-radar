import L from "leaflet";

const ICON_SIZE = 20;
const SELECTED_ICON_SIZE = 28;

/** Top view of a plane. The nose points up (north) in a 24x24 view box. */
const PLANE_PATH =
  "M12 2c.8 0 1.3.7 1.3 1.5V9l7.7 4.6v2L13.3 13v5l2.2 1.7v1.8L12 20.5l-3.5 1v-1.8l2.2-1.7v-5L3 15.6v-2L10.7 9V3.5C10.7 2.7 11.2 2 12 2z";

const cache = new Map<string, L.DivIcon>();

/**
 * Returns a Leaflet icon that shows a plane in the given color and heading.
 * The function rounds the heading to full degrees and keeps the icons in a cache.
 * Thus a marker gets a new icon only if the color, the heading or the selection changes.
 */
export function planeIcon(color: string, heading: number, selected: boolean): L.DivIcon {
  const degrees = Math.round(heading) % 360;
  const key = `${color}|${degrees}|${selected}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const size = selected ? SELECTED_ICON_SIZE : ICON_SIZE;
  const icon = L.divIcon({
    className: selected ? "plane-icon plane-icon--selected" : "plane-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html:
      `<svg viewBox="0 0 24 24" width="${size}" height="${size}" ` +
      `style="transform: rotate(${degrees}deg)" aria-hidden="true">` +
      `<path d="${PLANE_PATH}" fill="${escapeAttribute(color)}" /></svg>`,
  });
  cache.set(key, icon);
  return icon;
}

function escapeAttribute(value: string): string {
  return value.replace(/[&"<>]/g, (char) => `&#${char.charCodeAt(0)};`);
}
