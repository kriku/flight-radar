import { act, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaneBasic } from "../types";
import { FakeWebSocket } from "../test/fakeWebSocket";
import { PlanesProvider } from "./PlanesProvider";
import { usePlanesContext } from "./planesContext";

const PLANE: PlaneBasic = {
  id: "plane-1",
  latitude: 45,
  longitude: -75,
  altitude: 10_000,
  color: "#ff0000",
};

function wrapper({ children }: { children: ReactNode }) {
  return <PlanesProvider>{children}</PlanesProvider>;
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

describe("PlanesProvider", () => {
  it("opens the basic planes socket once and reports connecting", () => {
    const { result } = renderHook(() => usePlanesContext(), { wrapper });

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.last.url).toMatch(/\/ws\/planes\/basic$/);
    expect(result.current).toEqual({ planes: [], status: "connecting", error: null });
  });

  it("gives all consumers the same socket and the same data", () => {
    const first = renderHook(() => usePlanesContext(), { wrapper });
    const second = renderHook(() => usePlanesContext(), { wrapper });

    expect(FakeWebSocket.instances).toHaveLength(2);

    const Shared = () => <span>{usePlanesContext().planes.length}</span>;
    render(
      <PlanesProvider>
        <Shared />
        <Shared />
      </PlanesProvider>,
    );
    expect(FakeWebSocket.instances).toHaveLength(3);

    act(() => FakeWebSocket.last.receive({ type: "planes", data: [PLANE, PLANE] }));

    expect(screen.getAllByText("2")).toHaveLength(2);
    expect(first.result.current.planes).toEqual([]);
    expect(second.result.current.planes).toEqual([]);
  });

  it("returns the plane list from a planes message", () => {
    const { result } = renderHook(() => usePlanesContext(), { wrapper });

    act(() => FakeWebSocket.last.receive({ type: "planes", data: [PLANE] }));

    expect(result.current.planes).toEqual([PLANE]);
    expect(result.current.error).toBeNull();
  });

  it("replaces the plane list on each planes message", () => {
    const { result } = renderHook(() => usePlanesContext(), { wrapper });

    act(() => FakeWebSocket.last.receive({ type: "planes", data: [PLANE] }));
    act(() => FakeWebSocket.last.receive({ type: "planes", data: [] }));

    expect(result.current.planes).toEqual([]);
  });

  it("sets the error from an error message and clears it on the next list", () => {
    const { result } = renderHook(() => usePlanesContext(), { wrapper });

    act(() => FakeWebSocket.last.receive({ type: "error", message: "Bad request" }));
    expect(result.current.error).toBe("Bad request");

    act(() => FakeWebSocket.last.receive({ type: "planes", data: [PLANE] }));
    expect(result.current.error).toBeNull();
  });

  it("closes the socket on unmount", () => {
    const { unmount } = renderHook(() => usePlanesContext(), { wrapper });
    const socket = FakeWebSocket.last;

    unmount();

    expect(socket.closed).toBe(true);
  });

  it("throws when the hook is used outside the provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => usePlanesContext())).toThrow(
      "usePlanesContext must be used inside PlanesProvider.",
    );

    consoleError.mockRestore();
  });
});
