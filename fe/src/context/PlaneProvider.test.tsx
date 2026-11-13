import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaneDetailed } from "../types";
import { FakeWebSocket } from "../test/fakeWebSocket";
import { PlaneProvider } from "./PlaneProvider";
import { usePlaneContext } from "./planeContext";

function makePlane(id: string, overrides: Partial<PlaneDetailed> = {}): PlaneDetailed {
  return {
    id,
    model: "B737",
    airline: "Test Air",
    flightNumber: "TA100",
    registration: "N12345",
    latitude: 45,
    longitude: -75,
    altitude: 10_000,
    speed: 250,
    heading: 90,
    verticalSpeed: 0,
    origin: { airport: "AAA", city: "Alpha" },
    destination: { airport: "BBB", city: "Beta" },
    flightDuration: 3600,
    estimatedArrival: 1_700_000_000,
    numberOfPassengers: 100,
    maxPassengers: 180,
    status: "cruising",
    color: "#ff0000",
    ...overrides,
  };
}

const SUBSCRIBE = (planeId: string) => JSON.stringify({ type: "subscribe", planeId });

function wrapper({ children }: { children: ReactNode }) {
  return <PlaneProvider>{children}</PlaneProvider>;
}

function renderPlaneContext() {
  return renderHook(() => usePlaneContext(), { wrapper });
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PlaneProvider", () => {
  it("starts with no selection and no socket", () => {
    const { result } = renderPlaneContext();

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(result.current).toMatchObject({
      selectedPlaneId: null,
      details: null,
      error: null,
      status: "closed",
    });
  });

  it("opens the details socket and subscribes when a plane is selected", () => {
    const { result } = renderPlaneContext();

    act(() => result.current.selectPlane("plane-1"));

    expect(result.current.selectedPlaneId).toBe("plane-1");
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.last.url).toMatch(/\/ws\/planes\/details$/);

    act(() => FakeWebSocket.last.open());

    expect(FakeWebSocket.last.sent).toEqual([SUBSCRIBE("plane-1")]);
    expect(result.current.status).toBe("open");
  });

  it("returns details for the selected plane", () => {
    const { result } = renderPlaneContext();
    const plane = makePlane("plane-1");

    act(() => result.current.selectPlane("plane-1"));
    act(() => FakeWebSocket.last.open());
    act(() => FakeWebSocket.last.receive({ type: "plane-details", data: plane }));

    expect(result.current.details).toEqual(plane);
  });

  it("sets the error from an error message and clears it when details arrive", () => {
    const { result } = renderPlaneContext();
    const plane = makePlane("plane-1");

    act(() => result.current.selectPlane("plane-1"));
    act(() => FakeWebSocket.last.receive({ type: "error", message: "Unknown plane" }));
    expect(result.current.error).toBe("Unknown plane");

    act(() => FakeWebSocket.last.receive({ type: "plane-details", data: plane }));
    expect(result.current.error).toBeNull();
    expect(result.current.details).toEqual(plane);
  });

  it("keeps one socket and hides old data when the selection changes", () => {
    const { result } = renderPlaneContext();

    act(() => result.current.selectPlane("plane-1"));
    act(() => FakeWebSocket.last.open());
    act(() => FakeWebSocket.last.receive({ type: "plane-details", data: makePlane("plane-1") }));
    act(() => result.current.selectPlane("plane-2"));

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(result.current.details).toBeNull();
    expect(FakeWebSocket.last.sent).toEqual([SUBSCRIBE("plane-1"), SUBSCRIBE("plane-2")]);
  });

  it("closes the socket when the selection is cleared", () => {
    const { result } = renderPlaneContext();

    act(() => result.current.selectPlane("plane-1"));
    const socket = FakeWebSocket.last;
    act(() => result.current.clearSelection());

    expect(socket.closed).toBe(true);
    expect(result.current).toMatchObject({
      selectedPlaneId: null,
      details: null,
      error: null,
      status: "closed",
    });
  });

  it("shares the selection and the details between all consumers", () => {
    const Selector = () => {
      const { selectPlane } = usePlaneContext();
      return <button onClick={() => selectPlane("plane-1")}>select</button>;
    };
    const Panel = ({ testId }: { testId: string }) => {
      const { selectedPlaneId, details } = usePlaneContext();
      return <span data-testid={testId}>{`${selectedPlaneId}:${details?.flightNumber ?? "-"}`}</span>;
    };

    render(
      <PlaneProvider>
        <Selector />
        <Panel testId="a" />
        <Panel testId="b" />
      </PlaneProvider>,
    );

    act(() => screen.getByRole("button", { name: "select" }).click());
    act(() => FakeWebSocket.last.open());
    act(() => FakeWebSocket.last.receive({ type: "plane-details", data: makePlane("plane-1") }));

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(screen.getByTestId("a")).toHaveTextContent("plane-1:TA100");
    expect(screen.getByTestId("b")).toHaveTextContent("plane-1:TA100");
  });

  it("closes the socket on unmount", () => {
    const { result, unmount } = renderPlaneContext();

    act(() => result.current.selectPlane("plane-1"));
    const socket = FakeWebSocket.last;
    unmount();

    expect(socket.closed).toBe(true);
  });

  it("throws when the hook is used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => usePlaneContext())).toThrow(
      "usePlaneContext must be used inside PlaneProvider.",
    );
  });
});
