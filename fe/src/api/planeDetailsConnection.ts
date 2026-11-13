import type {
  ErrorMessage,
  PlaneDetailed,
  PlaneDetailsMessage,
  SubscribeMessage,
} from "../types";
import { connectSocket, type ConnectionStatus } from "./socket";

export type PlaneDetailsState = {
  planeId: string | null;
  details: PlaneDetailed | null;
  error: string | null;
};

export const EMPTY_PLANE_DETAILS: PlaneDetailsState = {
  planeId: null,
  details: null,
  error: null,
};

type ConnectionOptions = {
  onState: (state: PlaneDetailsState) => void;
  onStatus: (status: ConnectionStatus) => void;
};

export type PlaneDetailsConnection = {
  /** Watches one plane. A null value closes the socket. */
  select(planeId: string | null): void;
  /** Closes the socket and stops all reconnects. */
  dispose(): void;
};

/**
 * Keeps one `/ws/planes/details` socket for the selected plane.
 * The socket opens on the first selection. It sends a new `subscribe`
 * message when the selection changes. It closes on `select(null)`.
 */
export function createPlaneDetailsConnection({
  onState,
  onStatus,
}: ConnectionOptions): PlaneDetailsConnection {
  let entry: PlaneDetailsState = EMPTY_PLANE_DETAILS;

  // The selected plane of the whole app. A null value means no selection.
  let selected: string | null = null;

  let socket: WebSocket | null = null;
  let isOpen = false;
  let teardown: (() => void) | null = null;

  const setEntry = (next: PlaneDetailsState) => {
    entry = next;
    onState(next);
  };

  const sendSubscribe = (planeId: string) => {
    if (socket === null || !isOpen) return;
    const message: SubscribeMessage = { type: "subscribe", planeId };
    socket.send(JSON.stringify(message));
  };

  const close = () => {
    teardown?.();
    teardown = null;
    socket = null;
    isOpen = false;
  };

  const connect = () => {
    if (teardown !== null || selected === null) return;

    teardown = connectSocket<PlaneDetailsMessage | ErrorMessage>({
      path: "/ws/planes/details",
      onStatus: (status) => {
        isOpen = status === "open";
        onStatus(status);
      },
      onOpen: (ws) => {
        socket = ws;
        if (selected !== null) sendSubscribe(selected);
      },
      onClose: (_event, willRetry) => {
        isOpen = false;
        if (willRetry) return;
        // Close code 1008 stops the reconnect loop. Drop the dead connection,
        // so the next selection opens a new socket.
        socket = null;
        teardown = null;
      },
      onMessage: (message) => {
        if (message.type === "plane-details") {
          setEntry({ planeId: message.data.id, details: message.data, error: null });
          return;
        }
        if (message.type === "error") {
          const planeId = selected;
          setEntry({
            planeId,
            details: entry.planeId === planeId ? entry.details : null,
            error: message.message,
          });
        }
      },
    });
  };

  const select = (planeId: string | null) => {
    if (planeId === null) {
      selected = null;
      close();
      setEntry(EMPTY_PLANE_DETAILS);
      onStatus("closed");
      return;
    }

    // Keep the socket and the data of the selected plane.
    if (selected === planeId && (isOpen || teardown !== null)) return;

    selected = planeId;
    // Do not show data or errors of a previously selected plane.
    setEntry({ planeId, details: null, error: null });

    if (isOpen) {
      sendSubscribe(planeId);
      return;
    }

    // The socket is connecting: `onOpen` sends the subscribe message.
    connect();
  };

  return {
    select,

    dispose() {
      selected = null;
      close();
      onStatus("closed");
    },
  };
}
