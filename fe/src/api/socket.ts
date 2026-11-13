export const WS_BASE_URL: string = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000";

export type ConnectionStatus = "connecting" | "open" | "closed";

type SocketOptions<TMessage> = {
  path: string;
  onMessage: (message: TMessage) => void;
  onOpen?: (ws: WebSocket) => void;
  onStatus?: (status: ConnectionStatus) => void;
  /** `willRetry` is false when the socket stopped and will not reconnect. */
  onClose?: (event: CloseEvent, willRetry: boolean) => void;
};

const INITIAL_RETRY_MS = 500;
const MAX_RETRY_MS = 10_000;
// The server uses 1008 (policy violation) for an invalid path or an unknown plane.
// A retry gives the same result, so do not reconnect.
const NO_RETRY_CLOSE_CODE = 1008;

/**
 * Opens a WebSocket to the backend and reconnects with exponential backoff.
 * Returns a function that closes the socket and stops all reconnects.
 */
export function connectSocket<TMessage>({
  path,
  onMessage,
  onOpen,
  onStatus,
  onClose,
}: SocketOptions<TMessage>): () => void {
  let ws: WebSocket | null = null;
  let retryMs = INITIAL_RETRY_MS;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const open = () => {
    onStatus?.("connecting");
    const socket = new WebSocket(`${WS_BASE_URL}${path}`);
    ws = socket;

    socket.onopen = () => {
      retryMs = INITIAL_RETRY_MS;
      onStatus?.("open");
      onOpen?.(socket);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      let message: TMessage;
      try {
        message = JSON.parse(event.data) as TMessage;
      } catch {
        console.error(`[ws ${path}] Invalid JSON message`, event.data);
        return;
      }
      onMessage(message);
    };

    socket.onclose = (event) => {
      ws = null;
      onStatus?.("closed");
      const willRetry = !disposed && event.code !== NO_RETRY_CLOSE_CODE;
      onClose?.(event, willRetry);
      if (!willRetry) return;
      retryTimer = setTimeout(open, retryMs);
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    };
  };

  open();

  return () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.close();
      ws = null;
    }
  };
}
