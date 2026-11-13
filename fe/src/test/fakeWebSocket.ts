/**
 * Test double for the browser `WebSocket` class.
 * Install it with `vi.stubGlobal("WebSocket", FakeWebSocket)`.
 * The test controls the connection with `open`, `receive` and `closeFromServer`.
 */
export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  static reset(): void {
    FakeWebSocket.instances = [];
  }

  static get last(): FakeWebSocket {
    const socket = FakeWebSocket.instances.at(-1);
    if (!socket) throw new Error("No FakeWebSocket instance exists.");
    return socket;
  }

  readonly url: string;
  readonly sent: string[] = [];
  closed = false;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  /** Simulates the server accepting the connection. */
  open(): void {
    this.onopen?.(new Event("open"));
  }

  /** Simulates an incoming message. Objects are serialized to JSON. */
  receive(message: unknown): void {
    const data = typeof message === "string" ? message : JSON.stringify(message);
    this.onmessage?.(new MessageEvent("message", { data }));
  }

  /** Simulates the server closing the connection. */
  closeFromServer(code = 1000): void {
    this.onclose?.(new CloseEvent("close", { code }));
  }
}
