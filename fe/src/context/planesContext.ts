import { createContext, useContext } from "react";
import type { PlaneBasic } from "../types";
import type { ConnectionStatus } from "../api/socket";

export type PlanesContextValue = {
  planes: PlaneBasic[];
  status: ConnectionStatus;
  error: string | null;
};

export const PlanesContext = createContext<PlanesContextValue | null>(null);

/**
 * Returns the current plane list and the state of the shared connection.
 * All callers read the same socket.
 */
export function usePlanesContext(): PlanesContextValue {
  const value = useContext(PlanesContext);
  if (value === null) {
    throw new Error("usePlanesContext must be used inside PlanesProvider.");
  }
  return value;
}
