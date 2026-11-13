import { act, fireEvent, render, screen } from "@testing-library/react";
import { MapContainer } from "react-leaflet";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaneProvider } from "../context/PlaneProvider";
import { PlanesProvider } from "../context/PlanesProvider";
import { usePlaneContext } from "../context/planeContext";
import type { PlaneBasic } from "../types";
import { FakeWebSocket } from "../test/fakeWebSocket";
import { PlanesLayer } from "./PlanesLayer";

const PLANES: PlaneBasic[] = [
  { id: "plane-1", latitude: 45, longitude: -75, altitude: 10_000, color: "#ff0000" },
  { id: "plane-2", latitude: 40, longitude: -80, altitude: 9_000, color: "#00ff00" },
];

function SelectedId() {
  return <span data-testid="selected">{usePlaneContext().selectedPlaneId ?? "none"}</span>;
}

function renderLayer() {
  render(
    <PlanesProvider>
      <PlaneProvider>
        <MapContainer center={[45, -75]} zoom={4} style={{ height: 400, width: 400 }}>
          <PlanesLayer />
        </MapContainer>
        <SelectedId />
      </PlaneProvider>
    </PlanesProvider>,
  );
  return FakeWebSocket.instances.find((socket) => socket.url.endsWith("/ws/planes/basic"))!;
}

beforeAll(() => {
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  FakeWebSocket.reset();
});

describe("PlanesLayer", () => {
  it("shows one plane icon for each plane", () => {
    const socket = renderLayer();

    act(() => socket.receive({ type: "planes", data: PLANES }));

    const markers = document.querySelectorAll(".plane-icon");
    expect(markers).toHaveLength(2);
    expect(screen.getByTitle("plane-1").querySelector("path")).toHaveAttribute("fill", "#ff0000");
    expect(screen.getByTitle("plane-2").querySelector("path")).toHaveAttribute("fill", "#00ff00");
  });

  it("removes the icons of planes that are not in the list", () => {
    const socket = renderLayer();

    act(() => socket.receive({ type: "planes", data: PLANES }));
    act(() => socket.receive({ type: "planes", data: [PLANES[0]] }));

    expect(document.querySelectorAll(".plane-icon")).toHaveLength(1);
    expect(screen.queryByTitle("plane-2")).not.toBeInTheDocument();
  });

  it("turns the icon in the direction of the movement", () => {
    const socket = renderLayer();

    act(() => socket.receive({ type: "planes", data: [PLANES[0]] }));
    act(() =>
      socket.receive({ type: "planes", data: [{ ...PLANES[0], longitude: PLANES[0].longitude + 1 }] }),
    );

    const svg = screen.getByTitle("plane-1").querySelector("svg");
    expect(svg?.getAttribute("style")).toMatch(/rotate\((89|90|91)deg\)/);
  });

  it("selects the plane on click and marks the icon as selected", () => {
    const socket = renderLayer();

    act(() => socket.receive({ type: "planes", data: PLANES }));
    fireEvent.click(screen.getByTitle("plane-2"));

    expect(screen.getByTestId("selected")).toHaveTextContent("plane-2");
    expect(screen.getByTitle("plane-2")).toHaveClass("plane-icon--selected");
    expect(screen.getByTitle("plane-1")).not.toHaveClass("plane-icon--selected");
  });
});
