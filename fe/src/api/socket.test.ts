import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { connectSocket, WS_BASE_URL, type ConnectionStatus } from "./socket";
import { FakeWebSocket } from "../test/fakeWebSocket";

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

function setup(options: { onMessage?: (message: unknown) => void } = {}) {
  const statuses: ConnectionStatus[] = [];
  const onMessage = vi.fn(options.onMessage);
  const onOpen = vi.fn();
  const disconnect = connectSocket<unknown>({
    path: "/ws/test",
    onMessage,
    onOpen,
    onStatus: (status) => statuses.push(status),
  });
  return { statuses, onMessage, onOpen, disconnect };
}

describe("connectSocket", () => {
  it("opens a socket on the base URL with the path and reports connecting", () => {
    const { statuses } = setup();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.last.url).toBe(`${WS_BASE_URL}/ws/test`);
    expect(statuses).toEqual(["connecting"]);
  });

  it("reports open and calls onOpen with the socket", () => {
    const { statuses, onOpen } = setup();

    FakeWebSocket.last.open();

    expect(statuses).toEqual(["connecting", "open"]);
    expect(onOpen).toHaveBeenCalledWith(FakeWebSocket.last);
  });

  it("parses JSON messages and passes them to onMessage", () => {
    const { onMessage } = setup();

    FakeWebSocket.last.receive({ type: "planes", data: [] });

    expect(onMessage).toHaveBeenCalledWith({ type: "planes", data: [] });
  });

  it("logs invalid JSON and does not call onMessage", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { onMessage } = setup();

    FakeWebSocket.last.receive("{ not json");

    expect(onMessage).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("reports closed and reconnects with exponential backoff", () => {
    const { statuses } = setup();

    FakeWebSocket.last.closeFromServer();
    expect(statuses).toEqual(["connecting", "closed"]);
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(500);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.last.closeFromServer();
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("caps the retry delay at 10 seconds", () => {
    setup();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      FakeWebSocket.last.closeFromServer();
      vi.advanceTimersByTime(10_000);
    }

    expect(FakeWebSocket.instances).toHaveLength(9);
    FakeWebSocket.last.closeFromServer();
    vi.advanceTimersByTime(9_999);
    expect(FakeWebSocket.instances).toHaveLength(9);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(10);
  });

  it("resets the retry delay after a successful connection", () => {
    setup();

    FakeWebSocket.last.closeFromServer();
    vi.advanceTimersByTime(500);
    FakeWebSocket.last.open();
    FakeWebSocket.last.closeFromServer();

    vi.advanceTimersByTime(500);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("does not reconnect after close code 1008", () => {
    const { statuses } = setup();

    FakeWebSocket.last.closeFromServer(1008);
    vi.advanceTimersByTime(60_000);

    expect(statuses).toEqual(["connecting", "closed"]);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("closes the socket and stops reconnects on disconnect", () => {
    const { disconnect } = setup();
    const socket = FakeWebSocket.last;

    disconnect();

    expect(socket.closed).toBe(true);
    expect(socket.onclose).toBeNull();
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("does not reconnect when the server closes the socket during disconnect", () => {
    const { disconnect } = setup();
    const socket = FakeWebSocket.last;

    socket.closeFromServer();
    disconnect();
    vi.advanceTimersByTime(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
