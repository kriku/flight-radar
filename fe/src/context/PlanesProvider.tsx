import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { BasicPlanesMessage, ErrorMessage, PlaneBasic } from "../types";
import { connectSocket, type ConnectionStatus } from "../api/socket";
import { PlanesContext, type PlanesContextValue } from "./planesContext";

/**
 * Holds the one `/ws/planes/basic` connection for the whole app.
 * Mount it once, near the root, and read the data with `usePlanesContext`.
 */
export function PlanesProvider({ children }: { children: ReactNode }) {
  const [planes, setPlanes] = useState<PlaneBasic[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      connectSocket<BasicPlanesMessage | ErrorMessage>({
        path: "/ws/planes/basic",
        onStatus: setStatus,
        onMessage: (message) => {
          if (message.type === "planes") {
            setPlanes(message.data);
            setError(null);
          } else if (message.type === "error") {
            setError(message.message);
          }
        },
      }),
    [],
  );

  const value = useMemo<PlanesContextValue>(
    () => ({ planes, status, error }),
    [planes, status, error],
  );

  return <PlanesContext.Provider value={value}>{children}</PlanesContext.Provider>;
}
