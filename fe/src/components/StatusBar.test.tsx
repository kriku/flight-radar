import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PlaneDetailed } from "../types";
import { PlaneContext, type PlaneContextValue } from "../context/planeContext";
import { PlanesContext, type PlanesContextValue } from "../context/planesContext";
import { StatusBar } from "./StatusBar";

const PLANES: PlanesContextValue = {
  planes: [
    { id: "plane-1", latitude: 45, longitude: -75, altitude: 10_000, color: "#ff0000" },
    { id: "plane-2", latitude: 46, longitude: -76, altitude: 9_000, color: "#00ff00" },
  ],
  status: "open",
  error: null,
};

const NO_SELECTION: PlaneContextValue = {
  selectedPlaneId: null,
  details: null,
  error: null,
  status: "closed",
  selectPlane: () => {},
  clearSelection: () => {},
};

const DETAILS = {
  id: "plane-1",
  flightNumber: "TA100",
  airline: "Test Air",
} as PlaneDetailed;

function renderStatusBar(
  planes: Partial<PlanesContextValue> = {},
  plane: Partial<PlaneContextValue> = {},
) {
  return render(
    <PlanesContext.Provider value={{ ...PLANES, ...planes }}>
      <PlaneContext.Provider value={{ ...NO_SELECTION, ...plane }}>
        <StatusBar />
      </PlaneContext.Provider>
    </PlanesContext.Provider>,
  );
}

describe("StatusBar", () => {
  it("shows the planes feed status and the plane count", () => {
    renderStatusBar();

    expect(screen.getByText("Planes feed: Connected")).toBeInTheDocument();
    expect(screen.getByText("Planes: 2")).toBeInTheDocument();
  });

  it.each([
    ["connecting", "Connecting"],
    ["closed", "Disconnected"],
  ] as const)("shows the %s status of the planes feed", (status, label) => {
    renderStatusBar({ status });

    expect(screen.getByText(`Planes feed: ${label}`)).toBeInTheDocument();
  });

  it("shows the planes feed error", () => {
    renderStatusBar({ error: "Invalid JSON message" });

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid JSON message");
  });

  it("shows no selection and no details feed when no plane is selected", () => {
    renderStatusBar();

    expect(screen.getByText("Selected: none")).toBeInTheDocument();
    expect(screen.queryByText(/Details feed/)).not.toBeInTheDocument();
  });

  it("shows the selected plane id while the details load", () => {
    renderStatusBar({}, { selectedPlaneId: "plane-1", status: "connecting" });

    expect(screen.getByText("Selected: plane-1")).toBeInTheDocument();
    expect(screen.getByText("Details feed: Connecting")).toBeInTheDocument();
  });

  it("shows the flight number and the airline of the selected plane", () => {
    renderStatusBar({}, { selectedPlaneId: "plane-1", status: "open", details: DETAILS });

    expect(screen.getByText("Selected: plane-1 (TA100, Test Air)")).toBeInTheDocument();
    expect(screen.getByText("Details feed: Connected")).toBeInTheDocument();
  });

  it("shows the details feed error", () => {
    renderStatusBar(
      {},
      { selectedPlaneId: "plane-9", status: "closed", error: "Plane plane-9 not found" },
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Plane plane-9 not found");
    expect(screen.getByText("Details feed: Disconnected")).toBeInTheDocument();
  });
});
