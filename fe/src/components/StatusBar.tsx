import type { ConnectionStatus } from "../api/socket";
import { usePlaneContext } from "../context/planeContext";
import { usePlanesContext } from "../context/planesContext";

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  open: "Connected",
  closed: "Disconnected",
};

function StatusIndicator({ label, status }: { label: string; status: ConnectionStatus }) {
  return (
    <span className="status-bar__item" data-status={status}>
      <span className="status-bar__dot" aria-hidden="true" />
      {label}: {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Shows the state of the two backend connections and the selected plane.
 */
export function StatusBar() {
  const planes = usePlanesContext();
  const plane = usePlaneContext();

  return (
    <footer className="status-bar" aria-label="Status bar">
      <div className="status-bar__group">
        <StatusIndicator label="Planes feed" status={planes.status} />
        <span className="status-bar__item">Planes: {planes.planes.length}</span>
        {planes.error !== null && (
          <span className="status-bar__item status-bar__error" role="alert">
            {planes.error}
          </span>
        )}
      </div>

      <div className="status-bar__group">
        {plane.selectedPlaneId === null ? (
          <span className="status-bar__item">Selected: none</span>
        ) : (
          <>
            <span className="status-bar__item">
              Selected: {plane.selectedPlaneId}
              {plane.details !== null &&
                ` (${plane.details.flightNumber}, ${plane.details.airline})`}
            </span>
            <StatusIndicator label="Details feed" status={plane.status} />
            {plane.error !== null && (
              <span className="status-bar__item status-bar__error" role="alert">
                {plane.error}
              </span>
            )}
          </>
        )}
      </div>
    </footer>
  );
}
