import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlaneDetailsConnection, type PlaneDetailsState } from "./planeDetailsConnection";
import { FakeWebSocket } from "../test/fakeWebSocket";
import { type ConnectionStatus } from "./socket";

beforeAll(() => {
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  FakeWebSocket.reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup() {
  const states: PlaneDetailsState[] = [];
  const statuses: ConnectionStatus[] = [];
  const connection = createPlaneDetailsConnection({
    onState: (state) => states.push(state),
    onStatus: (status) => statuses.push(status),
  });
  return { connection, states, statuses };
}

const SUBSCRIBE = (planeId: string) => JSON.stringify({ type: "subscribe", planeId });

describe("createPlaneDetailsConnection", () => {
  it("opens no socket before the first selection", () => {
    const { connection } = setup();

    connection.select(null);

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("opens one socket and subscribes on open", () => {
    const { connection } = setup();

    connection.select("plane-1");
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.last.url).toMatch(/\/ws\/planes\/details$/);
    expect(FakeWebSocket.last.sent).toEqual([]);

    FakeWebSocket.last.open();
    expect(FakeWebSocket.last.sent).toEqual([SUBSCRIBE("plane-1")]);
  });

  it("subscribes to the last selection when the socket opens", () => {
    const { connection } = setup();

    connection.select("plane-1");
    connection.select("plane-2");
    FakeWebSocket.last.open();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.last.sent).toEqual([SUBSCRIBE("plane-2")]);
  });

  it("does not send a second subscribe for the same plane", () => {
    const { connection } = setup();

    connection.select("plane-1");
    FakeWebSocket.last.open();
    connection.select("plane-1");

    expect(FakeWebSocket.last.sent).toEqual([SUBSCRIBE("plane-1")]);
  });

  it("keeps one socket and sends a new subscribe when the selection changes", () => {
    const { connection, states } = setup();

    connection.select("plane-1");
    FakeWebSocket.last.open();
    FakeWebSocket.last.receive({ type: "plane-details", data: { id: "plane-1" } });
    connection.select("plane-2");

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.last.sent).toEqual([SUBSCRIBE("plane-1"), SUBSCRIBE("plane-2")]);
    expect(states.at(-1)).toEqual({ planeId: "plane-2", details: null, error: null });
  });

  it("re-subscribes after a reconnect", () => {
    const { connection } = setup();

    connection.select("plane-1");
    FakeWebSocket.last.open();
    FakeWebSocket.last.closeFromServer();
    vi.advanceTimersByTime(500);
    FakeWebSocket.last.open();

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.last.sent).toEqual([SUBSCRIBE("plane-1")]);
  });

  it("closes the socket and clears the data when the selection is cleared", () => {
    const { connection, states, statuses } = setup();

    connection.select("plane-1");
    FakeWebSocket.last.open();
    connection.select(null);

    expect(FakeWebSocket.last.closed).toBe(true);
    expect(states.at(-1)).toEqual({ planeId: null, details: null, error: null });
    expect(statuses.at(-1)).toBe("closed");
  });

  it("reports the error and keeps the details of the same plane", () => {
    const { connection, states } = setup();

    connection.select("plane-1");
    FakeWebSocket.last.open();
    FakeWebSocket.last.receive({ type: "plane-details", data: { id: "plane-1" } });
    FakeWebSocket.last.receive({ type: "error", message: "Unknown plane" });

    expect(states.at(-1)).toEqual({
      planeId: "plane-1",
      details: { id: "plane-1" },
      error: "Unknown plane",
    });
  });

  it("does not reconnect after a fatal close, and opens a new socket on the next selection", () => {
    const { connection } = setup();

    connection.select("plane-1");
    FakeWebSocket.last.open();
    FakeWebSocket.last.closeFromServer(1008);
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);

    connection.select("plane-2");
    expect(FakeWebSocket.instances).toHaveLength(2);
    FakeWebSocket.last.open();
    expect(FakeWebSocket.last.sent).toEqual([SUBSCRIBE("plane-2")]);
  });

  it("retries the same plane after a fatal close", () => {
    const { connection } = setup();

    connection.select("plane-1");
    FakeWebSocket.last.open();
    FakeWebSocket.last.closeFromServer(1008);
    connection.select("plane-1");

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("closes the socket and stops reconnects on dispose", () => {
    const { connection } = setup();

    connection.select("plane-1");
    const socket = FakeWebSocket.last;
    connection.dispose();

    expect(socket.closed).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
