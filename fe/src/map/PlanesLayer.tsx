import { useMemo, useState } from "react";
import { Marker } from "react-leaflet";
import { usePlaneContext } from "../context/planeContext";
import { usePlanesContext } from "../context/planesContext";
import { createHeadingTracker } from "./heading";
import { planeIcon } from "./planeIcon";

/**
 * Shows one plane marker for each plane of the basic feed.
 * A click on a marker selects the plane. Put this component inside `MapContainer`.
 */
export function PlanesLayer() {
  const { planes } = usePlanesContext();
  const { selectedPlaneId, selectPlane } = usePlaneContext();
  const [tracker] = useState(createHeadingTracker);
  const headings = useMemo(() => tracker.update(planes), [tracker, planes]);

  return planes.map((plane) => {
    const selected = plane.id === selectedPlaneId;
    return (
      <Marker
        key={plane.id}
        position={[plane.latitude, plane.longitude]}
        icon={planeIcon(plane.color, headings.get(plane.id) ?? 0, selected)}
        title={plane.id}
        alt={plane.id}
        zIndexOffset={selected ? 1000 : 0}
        eventHandlers={{ click: () => selectPlane(plane.id) }}
      />
    );
  });
}
