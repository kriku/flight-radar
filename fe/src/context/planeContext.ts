import { createContext, useContext } from "react";
import type { PlaneDetailed } from "../types";
import type { ConnectionStatus } from "../api/socket";

export type PlaneContextValue = {
  /** The selected plane of the whole app. A null value means no selection. */
  selectedPlaneId: string | null;
  details: PlaneDetailed | null;
  error: string | null;
  status: ConnectionStatus;
  /** Selects a plane. A null value clears the selection. */
  selectPlane: (planeId: string | null) => void;
  clearSelection: () => void;
};

export const PlaneContext = createContext<PlaneContextValue | null>(null);

/**
 * Returns the selected plane, its details, and the selection methods.
 * All callers share the selection and the socket of `PlaneProvider`.
 */
export function usePlaneContext(): PlaneContextValue {
  const value = useContext(PlaneContext);
  if (value === null) {
    throw new Error("usePlaneContext must be used inside PlaneProvider.");
  }
  return value;
}
