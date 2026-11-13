import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ConnectionStatus } from "../api/socket";
import {
  createPlaneDetailsConnection,
  EMPTY_PLANE_DETAILS,
  type PlaneDetailsState,
} from "../api/planeDetailsConnection";
import { PlaneContext, type PlaneContextValue } from "./planeContext";

/**
 * Holds the plane selection and the one `/ws/planes/details` socket for the whole app.
 * Mount it once, near the root, and read the data with `usePlaneContext`.
 */
export function PlaneProvider({ children }: { children: ReactNode }) {
  const [selectedPlaneId, setSelectedPlaneId] = useState<string | null>(null);
  const [state, setState] = useState<PlaneDetailsState>(EMPTY_PLANE_DETAILS);
  const [status, setStatus] = useState<ConnectionStatus>("closed");

  const [connection] = useState(() =>
    createPlaneDetailsConnection({ onState: setState, onStatus: setStatus }),
  );

  useEffect(() => {
    connection.select(selectedPlaneId);
  }, [connection, selectedPlaneId]);

  useEffect(() => () => connection.dispose(), [connection]);

  const clearSelection = useCallback(() => setSelectedPlaneId(null), []);

  // Do not show data or errors of a previously selected plane.
  const isCurrent = selectedPlaneId !== null && state.planeId === selectedPlaneId;

  const value = useMemo<PlaneContextValue>(
    () => ({
      selectedPlaneId,
      details: isCurrent ? state.details : null,
      error: isCurrent ? state.error : null,
      status: selectedPlaneId === null ? "closed" : status,
      selectPlane: setSelectedPlaneId,
      clearSelection,
    }),
    [selectedPlaneId, isCurrent, state, status, clearSelection],
  );

  return <PlaneContext.Provider value={value}>{children}</PlaneContext.Provider>;
}
