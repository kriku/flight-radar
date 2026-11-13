import { useEffect, type ReactNode } from "react";
import { usePlaneContext } from "../context/planeContext";
import type { PlaneDetailed } from "../types";
import { formatDuration } from "./formatDuration";

const STATUS_LABELS: Record<PlaneDetailed["status"], string> = {
  departed: "Departed",
  enroute: "En route",
  cruising: "Cruising",
  landing: "Landing",
};

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const signed = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" });

/** Converts meters per second to kilometers per hour. */
const MS_TO_KMH = 3.6;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="plane-details__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="plane-details__section">
      <h3>{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

function DetailsBody({ details }: { details: PlaneDetailed }) {
  return (
    <>
      <p className="plane-details__route">
        <span title={details.origin.city}>{details.origin.airport}</span>
        <span aria-hidden="true">→</span>
        <span title={details.destination.city}>{details.destination.airport}</span>
      </p>
      <p className="plane-details__cities">
        {details.origin.city} to {details.destination.city}
      </p>

      <Section title="Aircraft">
        <Row label="Model">{details.model}</Row>
        <Row label="Registration">{details.registration}</Row>
        <Row label="Status">{STATUS_LABELS[details.status]}</Row>
      </Section>

      <Section title="Position">
        <Row label="Altitude">{number.format(details.altitude)} m</Row>
        <Row label="Speed">{number.format(details.speed * MS_TO_KMH)} km/h</Row>
        <Row label="Heading">{number.format(details.heading)}°</Row>
        <Row label="Vertical speed">{signed.format(details.verticalSpeed)} m/s</Row>
        <Row label="Coordinates">
          {details.latitude.toFixed(3)}, {details.longitude.toFixed(3)}
        </Row>
      </Section>

      <Section title="Flight">
        <Row label="Time in flight">{formatDuration(details.flightDuration)}</Row>
        <Row label="Estimated arrival">{time.format(details.estimatedArrival)}</Row>
        <Row label="Passengers">
          {details.numberOfPassengers} / {details.maxPassengers}
        </Row>
      </Section>
    </>
  );
}

/**
 * Shows the details of the selected plane in a box above the map.
 * The close button and the Escape key clear the selection.
 */
export function PlaneDetailsPanel() {
  const { selectedPlaneId, details, error, clearSelection } = usePlaneContext();
  const isOpen = selectedPlaneId !== null;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, clearSelection]);

  if (!isOpen) return null;

  return (
    <aside
      className="plane-details"
      aria-label="Plane details"
      style={details ? { borderTopColor: details.color } : undefined}
    >
      <header className="plane-details__header">
        <div className="plane-details__title">
          <h2>{details?.flightNumber ?? selectedPlaneId}</h2>
          {details && <p>{details.airline}</p>}
        </div>
        <button
          type="button"
          className="plane-details__close"
          aria-label="Close plane details"
          onClick={clearSelection}
        >
          ×
        </button>
      </header>

      {error !== null && (
        <p className="plane-details__error" role="alert">
          {error}
        </p>
      )}

      {details !== null ? (
        <DetailsBody details={details} />
      ) : (
        error === null && <p className="plane-details__loading">Loading details…</p>
      )}
    </aside>
  );
}
