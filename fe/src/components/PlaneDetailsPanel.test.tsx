import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaneDetailed } from "../types";
import { PlaneContext, type PlaneContextValue } from "../context/planeContext";
import { PlaneProvider } from "../context/PlaneProvider";
import { usePlaneContext } from "../context/planeContext";
import { FakeWebSocket } from "../test/fakeWebSocket";
import { PlaneDetailsPanel } from "./PlaneDetailsPanel";

const DETAILS: PlaneDetailed = {
  id: "plane-1",
  model: "B737",
  airline: "Test Air",
  flightNumber: "TA100",
  registration: "N12345",
  latitude: 45.12345,
  longitude: -75.5,
  altitude: 10_500,
  speed: 250,
  heading: 90,
  verticalSpeed: -2.5,
  origin: { airport: "AAA", city: "Alpha" },
  destination: { airport: "BBB", city: "Beta" },
  flightDuration: 65,
  estimatedArrival: new Date(2026, 0, 1, 14, 30).getTime(),
  numberOfPassengers: 100,
  maxPassengers: 180,
  status: "cruising",
  color: "#ff0000",
};

const NO_SELECTION: PlaneContextValue = {
  selectedPlaneId: null,
  details: null,
  error: null,
  status: "closed",
  selectPlane: () => {},
  clearSelection: () => {},
};

function renderPanel(plane: Partial<PlaneContextValue> = {}) {
  return render(
    <PlaneContext.Provider value={{ ...NO_SELECTION, ...plane }}>
      <PlaneDetailsPanel />
    </PlaneContext.Provider>,
  );
}

function row(label: string) {
  return screen.getByText(label).nextElementSibling;
}

describe("PlaneDetailsPanel", () => {
  it("shows nothing when no plane is selected", () => {
    renderPanel();

    expect(screen.queryByRole("complementary", { name: "Plane details" })).not.toBeInTheDocument();
  });

  it("shows the plane id and a loading text while the details load", () => {
    renderPanel({ selectedPlaneId: "plane-1", status: "connecting" });

    const panel = screen.getByRole("complementary", { name: "Plane details" });
    expect(within(panel).getByRole("heading", { name: "plane-1" })).toBeInTheDocument();
    expect(within(panel).getByText("Loading details…")).toBeInTheDocument();
  });

  it("shows the details of the selected plane", () => {
    renderPanel({ selectedPlaneId: "plane-1", status: "open", details: DETAILS });

    expect(screen.getByRole("heading", { name: "TA100" })).toBeInTheDocument();
    expect(screen.getByText("Test Air")).toBeInTheDocument();
    expect(screen.getByText("Alpha to Beta")).toBeInTheDocument();
    expect(row("Model")).toHaveTextContent("B737");
    expect(row("Registration")).toHaveTextContent("N12345");
    expect(row("Status")).toHaveTextContent("Cruising");
    expect(row("Altitude")).toHaveTextContent("10,500 m");
    expect(row("Speed")).toHaveTextContent("900 km/h");
    expect(row("Heading")).toHaveTextContent("90°");
    expect(row("Vertical speed")).toHaveTextContent("-2.5 m/s");
    expect(row("Coordinates")).toHaveTextContent("45.123, -75.500");
    expect(row("Time in flight")).toHaveTextContent("1 h 05 min");
    expect(row("Estimated arrival")).toHaveTextContent(/02:30\s?PM/);
    expect(row("Passengers")).toHaveTextContent("100 / 180");
    expect(screen.queryByText("Loading details…")).not.toBeInTheDocument();
  });

  it("shows the error of the details feed", () => {
    renderPanel({ selectedPlaneId: "plane-9", status: "closed", error: "Plane plane-9 not found" });

    expect(screen.getByRole("alert")).toHaveTextContent("Plane plane-9 not found");
    expect(screen.queryByText("Loading details…")).not.toBeInTheDocument();
  });

  it("clears the selection when the close button is clicked", () => {
    const clearSelection = vi.fn();
    renderPanel({ selectedPlaneId: "plane-1", details: DETAILS, clearSelection });

    fireEvent.click(screen.getByRole("button", { name: "Close plane details" }));

    expect(clearSelection).toHaveBeenCalledTimes(1);
  });

  it("clears the selection when the Escape key is pressed", () => {
    const clearSelection = vi.fn();
    renderPanel({ selectedPlaneId: "plane-1", clearSelection });

    fireEvent.keyDown(window, { key: "Escape" });

    expect(clearSelection).toHaveBeenCalledTimes(1);
  });

  it("does not listen for the Escape key when no plane is selected", () => {
    const clearSelection = vi.fn();
    renderPanel({ clearSelection });

    fireEvent.keyDown(window, { key: "Escape" });

    expect(clearSelection).not.toHaveBeenCalled();
  });
});

describe("PlaneDetailsPanel with PlaneProvider", () => {
  beforeAll(() => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    FakeWebSocket.reset();
  });

  it("closes the box, clears the selection, and closes the socket", () => {
    const SelectorWithHook = () => {
      const { selectPlane, selectedPlaneId } = usePlaneContext();
      return (
        <>
          <button onClick={() => selectPlane("plane-1")}>select</button>
          <span data-testid="selected">{selectedPlaneId ?? "none"}</span>
        </>
      );
    };

    render(
      <PlaneProvider>
        <SelectorWithHook />
        <PlaneDetailsPanel />
      </PlaneProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "select" }));
    const socket = FakeWebSocket.last;
    act(() => socket.open());
    act(() => socket.receive({ type: "plane-details", data: DETAILS }));
    expect(screen.getByRole("heading", { name: "TA100" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close plane details" }));

    expect(screen.queryByRole("complementary", { name: "Plane details" })).not.toBeInTheDocument();
    expect(screen.getByTestId("selected")).toHaveTextContent("none");
    expect(socket.closed).toBe(true);
  });
});
